import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { OnlineOrder, OnlineOrderStatus, OnlineOrderItem } from '@/types';

interface OnlineOrderState {
  orders: OnlineOrder[];
  loading: boolean;
  error: string | null;

  fetchOrders: () => Promise<void>;
  fetchMyOrders: (customerId: string) => Promise<void>;
  addOrder: (customerId: string, items: OnlineOrderItem[], notes?: string, deliveryDate?: string) => Promise<string | null>;
  updateStatus: (orderId: string, status: OnlineOrderStatus, adminNotes?: string) => Promise<boolean>;
  deleteOrder: (orderId: string) => Promise<boolean>;
  cancelOrder: (orderId: string, customerId: string) => Promise<{ success: boolean; reason?: string }>;
}

export const useOnlineOrderStore = create<OnlineOrderState>((set, get) => ({
  orders: [],
  loading: false,
  error: null,

  // ── Admin: fetch ALL orders
  fetchOrders: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('online_orders')
      .select(`*, customers(name, phone, city), online_order_items(*)`)
      .order('order_date', { ascending: false });

    if (error) { set({ error: error.message, loading: false }); return; }

    const orders: OnlineOrder[] = (data || []).map((row: any) => ({
      id: row.id,
      date: row.order_date?.split('T')[0] ?? row.order_date,
      customerEmail: '',
      customerName: row.customers?.name ?? '',
      customerPhone: row.customers?.phone ?? '',
      customerCity: row.customers?.city ?? '',
      customerId: row.customer_id,
      orderRef: row.order_ref ?? '',
      status: row.status as OnlineOrderStatus,
      adminNotes: row.notes ?? '',
      requestedDeliveryDate: row.requested_delivery_date ?? '',
      cancelReason: row.cancel_reason ?? '',
      cancelledAt: row.cancelled_at ?? '',
      items: (row.online_order_items || []).map((i: any) => ({
        itemName: i.item_name,
        packing: i.packing,
        grade: i.grade,
        quantity: i.quantity_kg,
        notes: i.notes ?? '',
      })),
    }));

    set({ orders, loading: false });
  },

  // ── Customer: fetch only THEIR orders
  fetchMyOrders: async (customerId) => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('online_orders')
      .select('*, online_order_items(*)')
      .eq('customer_id', customerId)
      .order('order_date', { ascending: false });

    if (error) { set({ error: error.message, loading: false }); return; }

    const orders: OnlineOrder[] = (data || []).map((row: any) => ({
      id: row.id,
      date: row.order_date?.split('T')[0] ?? row.order_date,
      customerEmail: '',
      customerName: '',
      customerPhone: '',
      customerCity: '',
      customerId: row.customer_id,
      orderRef: row.order_ref ?? '',
      status: row.status as OnlineOrderStatus,
      adminNotes: row.notes ?? '',
      requestedDeliveryDate: row.requested_delivery_date ?? '',
      cancelReason: row.cancel_reason ?? '',
      cancelledAt: row.cancelled_at ?? '',
      items: (row.online_order_items || []).map((i: any) => ({
        itemName: i.item_name,
        packing: i.packing,
        grade: i.grade,
        quantity: i.quantity_kg,
        notes: i.notes ?? '',
      })),
    }));

    set({ orders, loading: false });
  },

  // ── Customer: place a new order
  addOrder: async (customerId, items, notes, deliveryDate) => {
    const { data: orderRow, error: orderErr } = await supabase
      .from('online_orders')
      .insert({
        customer_id: customerId,
        requested_delivery_date: deliveryDate ?? null,
        status: 'Pending',
        total_amount: 0,
        notes: notes ?? null,
      })
      .select('id, order_ref')
      .single();

    if (orderErr || !orderRow) {
      console.error('Order insert failed:', orderErr?.message);
      return null;
    }

    const { error: itemsErr } = await supabase
      .from('online_order_items')
      .insert(items.map((i) => ({
        order_id: orderRow.id,
        item_name: i.itemName,
        packing: i.packing || null,
        grade: i.grade,
        quantity_kg: i.quantity,
        notes: i.notes ?? null,
      })));

    if (itemsErr) {
      await supabase.from('online_orders').delete().eq('id', orderRow.id);
      console.error('Order items insert failed:', itemsErr.message);
      return null;
    }

    await get().fetchMyOrders(customerId);
    return orderRow.id;
  },

  // ── Customer: cancel their OWN order — only if Pending
  // Requires this RLS policy in Supabase:
  //   CREATE POLICY "customer_cancels_own_orders" ON online_orders
  //   FOR UPDATE TO authenticated
  //   USING (customer_id = auth_customer_id())
  //   WITH CHECK (customer_id = auth_customer_id());
  cancelOrder: async (orderId, customerId) => {
    const order = get().orders.find((o) => o.id === orderId);

    if (!order) return { success: false, reason: 'Order not found.' };

    if (order.customerId !== customerId)
      return { success: false, reason: 'You can only cancel your own orders.' };

    if (order.status !== 'Pending') {
      return {
        success: false,
        reason: order.status === 'Confirmed'
          ? 'This order has already been confirmed by the factory and cannot be cancelled.'
          : `This order is already ${order.status.toLowerCase()} and cannot be cancelled.`,
      };
    }

    // Use .select() to detect if 0 rows were updated (RLS blocking silently)
    const { data, error } = await supabase
      .from('online_orders')
      .update({
        status: 'Cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: 'Cancelled by customer',
      })
      .eq('id', orderId)
      .eq('customer_id', customerId)
      .select('id');

    if (error) {
      return { success: false, reason: error.message };
    }

    // If data is empty array, RLS blocked the update silently
    if (!data || data.length === 0) {
      return {
        success: false,
        reason: 'Permission denied. Please run this SQL in Supabase:\n\nCREATE POLICY "customer_cancels_own_orders" ON online_orders FOR UPDATE TO authenticated USING (customer_id = auth_customer_id()) WITH CHECK (customer_id = auth_customer_id());',
      };
    }

    // Update local state immediately
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'Cancelled' as OnlineOrderStatus,
              cancelReason: 'Cancelled by customer',
              cancelledAt: new Date().toISOString(),
            }
          : o
      ),
    }));

    // Refresh to sync with DB
    await get().fetchMyOrders(customerId);
    return { success: true };
  },

  // ── Admin: update order status
  updateStatus: async (orderId, status, adminNotes) => {
    const updateData: any = { status };
    if (adminNotes !== undefined) updateData.notes = adminNotes;
    if (status === 'Confirmed') updateData.confirmed_at = new Date().toISOString();
    if (status === 'Delivered') updateData.delivered_at = new Date().toISOString();
    if (status === 'Cancelled') updateData.cancelled_at = new Date().toISOString();

    const { error } = await supabase
      .from('online_orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) { console.error('Status update failed:', error.message); return false; }

    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === orderId
          ? { ...o, status, adminNotes: adminNotes ?? o.adminNotes }
          : o
      ),
    }));

    return true;
  },

  // ── Admin: delete order
  deleteOrder: async (orderId) => {
    const { error } = await supabase.from('online_orders').delete().eq('id', orderId);
    if (error) {
      console.error('Delete order failed:', error.message);
      return false;
    }
    set((s) => ({ orders: s.orders.filter((o) => o.id !== orderId) }));
    return true;
  },
}));