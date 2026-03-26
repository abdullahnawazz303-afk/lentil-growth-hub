import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { AdvanceBooking, BookingStatus, BookingPayment } from '@/types';

interface BookingState {
  bookings: AdvanceBooking[];
  loading: boolean;
  error: string | null;

  fetchBookings: () => Promise<void>;
  addBooking: (b: Omit<AdvanceBooking, 'id' | 'bookingRef' | 'totalValue' | 'remainingBalance' | 'payments'> & { advancePaid: number }) => Promise<string | null>;
  addPayment: (bookingId: string, amount: number, notes: string) => Promise<void>;
  updateStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  markDelivered: (bookingId: string) => Promise<void>;
  deleteBooking: (bookingId: string) => Promise<boolean>;
  getPendingDeliveryCount: () => number;
  getUpcomingDeliveries: (limit: number) => AdvanceBooking[];
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: [],
  loading: false,
  error: null,

  // ── Fetch all bookings with items and payments
  fetchBookings: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('advance_bookings')
      .select('*, vendors(name), booking_items(*), booking_payments(*)')
      .order('expected_delivery_date', { ascending: true });

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    const bookings: AdvanceBooking[] = (data || []).map((row: any) => ({
      id: row.id,
      bookingRef: row.booking_ref ?? '',        // ← FIXED: was missing
      bookingDate: row.booking_date,
      vendorId: row.vendor_id,
      vendorName: row.vendors?.name ?? '',
      expectedDeliveryDate: row.expected_delivery_date,
      totalValue: row.total_value,
      advancePaid: row.advance_paid,
      remainingBalance: row.remaining_balance,
      status: row.status as BookingStatus,
      notes: row.notes ?? '',
      items: (row.booking_items || []).map((i: any) => ({
        itemName: i.item_name,
        grade: i.grade,
        quantity: i.quantity_kg,
        agreedPrice: i.agreed_price_per_kg,
        subtotal: i.subtotal,
      })),
      payments: (row.booking_payments || []).map((p: any) => ({
        id: p.id,
        date: p.paid_at,
        amount: p.amount,
        notes: p.notes ?? '',
      })),
    }));

    set({ bookings, loading: false });
  },

  // ── Add a new booking
  addBooking: async (b) => {
    set({ loading: true, error: null });

    const totalValue = b.items.reduce((s, i) => s + i.subtotal, 0);

    // Insert booking
    const { data, error } = await supabase
      .from('advance_bookings')
      .insert({
        vendor_id: b.vendorId,
        booking_date: b.bookingDate,
        expected_delivery_date: b.expectedDeliveryDate,
        total_value: totalValue,
        advance_paid: b.advancePaid ?? 0,
        status: b.status ?? 'Booked',
        notes: b.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      set({ error: error.message, loading: false });
      return null;
    }

    // Insert booking items
    if (b.items.length > 0) {
      await supabase.from('booking_items').insert(
        b.items.map(i => ({
          booking_id: data.id,
          item_name: i.itemName,
          grade: i.grade,
          quantity_kg: i.quantity,
          agreed_price_per_kg: i.agreedPrice,
        }))
      );
    }

    // Insert initial advance payment if any
    if (b.advancePaid > 0) {
      await supabase.from('booking_payments').insert({
        booking_id: data.id,
        amount: b.advancePaid,
        paid_at: b.bookingDate,
        notes: 'Initial advance payment',
      });
    }

    await get().fetchBookings();
    set({ loading: false });
    return data.id;
  },

  // ── Add a payment to an existing booking
  addPayment: async (bookingId, amount, notes) => {
    const booking = get().bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const appliedAmount = Math.min(Math.max(amount, 0), booking.remainingBalance);
    if (appliedAmount === 0) return;

    // Insert payment record
    await supabase.from('booking_payments').insert({
      booking_id: bookingId,
      amount: appliedAmount,
      paid_at: new Date().toISOString().split('T')[0],
      notes: notes ?? null,
    });

    // Update booking advance_paid and status
    const newAdvancePaid = booking.advancePaid + appliedAmount;
    const newRemaining = booking.totalValue - newAdvancePaid;
    const newStatus: BookingStatus =
      booking.status === 'Delivered' || booking.status === 'Completed'
        ? booking.status
        : newRemaining <= 0
        ? 'Fully Paid'
        : 'Partially Paid';

    await supabase
      .from('advance_bookings')
      .update({
        advance_paid: newAdvancePaid,
        status: newStatus,
      })
      .eq('id', bookingId);

    await get().fetchBookings();
  },

  // ── Update booking status
  updateStatus: async (bookingId, status) => {
    const { error } = await supabase
      .from('advance_bookings')
      .update({ status })
      .eq('id', bookingId);

    if (error) {
      set({ error: error.message });
      return;
    }

    set((s) => ({
      bookings: s.bookings.map(b =>
        b.id === bookingId ? { ...b, status } : b
      ),
    }));
  },

  // ── Mark booking as delivered and add items to inventory
  markDelivered: async (bookingId) => {
    const booking = get().bookings.find(b => b.id === bookingId);
    if (!booking) return;

    // Add each booking item to inventory as a new batch
    for (const item of booking.items) {
      const { data: batch } = await supabase
        .from('inventory_batches')
        .insert({
          item_name: item.itemName,
          grade: item.grade,
          vendor_id: booking.vendorId,
          purchase_price_per_kg: item.agreedPrice,
          quantity_kg: item.quantity,
          remaining_qty_kg: item.quantity,
          purchase_date: new Date().toISOString().split('T')[0],
          source: 'booking',
          booking_id: bookingId,
          notes: `From booking ${booking.bookingRef || bookingId}`,
        })
        .select()
        .single();

      if (batch) {
        // Record inventory movement
        await supabase.from('inventory_movements').insert({
          batch_id: batch.id,
          movement_type: 'IN',
          quantity_kg: item.quantity,
          reference_type: 'BOOKING',
          reference_id: bookingId,
        });
      }
    }

    // Update booking status to Delivered
    await supabase
      .from('advance_bookings')
      .update({
        status: 'Delivered',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    await get().fetchBookings();
  },

  // ── Computed: count of bookings pending delivery
  getPendingDeliveryCount: () => {
    return get().bookings.filter(b =>
      b.status === 'Booked' ||
      b.status === 'Partially Paid' ||
      b.status === 'Fully Paid'
    ).length;
  },

  // ── Computed: next N upcoming deliveries sorted by date
  getUpcomingDeliveries: (limit) => {
    return get().bookings
      .filter(b =>
        b.status === 'Booked' ||
        b.status === 'Partially Paid' ||
        b.status === 'Fully Paid'
      )
      .sort((a, b) => a.expectedDeliveryDate.localeCompare(b.expectedDeliveryDate))
      .slice(0, limit);
  },

  // ── Admin: Delete Booking
  deleteBooking: async (bookingId) => {
    set({ loading: true });
    // Cascades delete items and payments
    const { error } = await supabase.from('advance_bookings').delete().eq('id', bookingId);
    if (error) {
      set({ loading: false, error: error.message });
      return false;
    }
    await get().fetchBookings();
    return true;
  },
}));