import { create } from 'zustand';
import type { AdvanceBooking, BookingStatus, BookingPayment } from '@/types';
import { generateId, getTodayISO } from '@/lib/formatters';

interface BookingState {
  bookings: AdvanceBooking[];
  addBooking: (b: Omit<AdvanceBooking, 'id' | 'totalValue' | 'remainingBalance' | 'payments'> & { advancePaid: number }) => string;
  addPayment: (bookingId: string, amount: number, notes: string) => void;
  updateStatus: (bookingId: string, status: BookingStatus) => void;
  getPendingDeliveryCount: () => number;
  getUpcomingDeliveries: (limit: number) => AdvanceBooking[];
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: [],

  addBooking: (b) => {
    const id = generateId('BK');
    const totalValue = b.items.reduce((s, i) => s + i.subtotal, 0);
    const payments: BookingPayment[] = [];
    if (b.advancePaid > 0) {
      payments.push({ id: generateId('BP'), date: getTodayISO(), amount: b.advancePaid, notes: 'Initial advance' });
    }
    const remainingBalance = totalValue - b.advancePaid;
    const booking: AdvanceBooking = {
      ...b,
      id,
      totalValue,
      remainingBalance,
      payments,
    };
    set((s) => ({ bookings: [booking, ...s.bookings] }));
    return id;
  },

  addPayment: (bookingId, amount, notes) => {
    set((s) => ({
      bookings: s.bookings.map(b => {
        if (b.id !== bookingId) return b;

        const appliedAmount = Math.min(Math.max(amount, 0), b.remainingBalance);
        if (appliedAmount === 0) return b;

        const payment: BookingPayment = { id: generateId('BP'), date: getTodayISO(), amount: appliedAmount, notes };
        const newRemaining = b.remainingBalance - appliedAmount;
        const nextStatus = (b.status === 'Delivered' || b.status === 'Completed')
          ? b.status
          : (newRemaining <= 0 ? 'Fully Paid' : 'Partially Paid');

        return {
          ...b,
          advancePaid: b.advancePaid + appliedAmount,
          remainingBalance: newRemaining,
          payments: [...b.payments, payment],
          status: nextStatus,
        };
      }),
    }));
  },

  updateStatus: (bookingId, status) => {
    set((s) => ({
      bookings: s.bookings.map(b => b.id === bookingId ? { ...b, status } : b),
    }));
  },

  getPendingDeliveryCount: () => {
    return get().bookings.filter(b => b.status === 'Booked' || b.status === 'Partially Paid' || b.status === 'Fully Paid').length;
  },

  getUpcomingDeliveries: (limit) => {
    return get().bookings
      .filter(b => b.status === 'Booked' || b.status === 'Partially Paid' || b.status === 'Fully Paid')
      .sort((a, b) => a.expectedDeliveryDate.localeCompare(b.expectedDeliveryDate))
      .slice(0, limit);
  },
}));
