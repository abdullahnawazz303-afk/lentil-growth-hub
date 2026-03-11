import { create } from 'zustand';
import type { OnlineOrder, OnlineOrderStatus } from '@/types';
import { generateId, getTodayISO } from '@/lib/formatters';

interface OnlineOrderState {
  orders: OnlineOrder[];
  addOrder: (o: Omit<OnlineOrder, 'id' | 'date' | 'status' | 'adminNotes'>) => string;
  updateStatus: (orderId: string, status: OnlineOrderStatus, adminNotes?: string) => void;
  getOrdersByEmail: (email: string) => OnlineOrder[];
}

export const useOnlineOrderStore = create<OnlineOrderState>((set, get) => ({
  orders: [],

  addOrder: (o) => {
    const id = generateId('OO');
    const order: OnlineOrder = {
      ...o,
      id,
      date: getTodayISO(),
      status: 'Pending',
      adminNotes: '',
    };
    set((s) => ({ orders: [order, ...s.orders] }));
    return id;
  },

  updateStatus: (orderId, status, adminNotes) => {
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === orderId ? { ...o, status, adminNotes: adminNotes ?? o.adminNotes } : o
      ),
    }));
  },

  getOrdersByEmail: (email) => {
    return get().orders.filter((o) => o.customerEmail.toLowerCase() === email.toLowerCase());
  },
}));
