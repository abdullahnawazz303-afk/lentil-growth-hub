import { create } from 'zustand';
import type { Sale } from '@/types';
import { generateId } from '@/lib/formatters';

interface SalesState {
  sales: Sale[];
  addSale: (s: Omit<Sale, 'id' | 'outstanding' | 'paymentStatus'>) => string;
}

export const useSalesStore = create<SalesState>((set) => ({
  sales: [],

  addSale: (s) => {
    const id = generateId('SL');
    const outstanding = s.totalAmount - s.amountPaid;
    const paymentStatus = outstanding <= 0 ? 'Paid' : s.amountPaid > 0 ? 'Partially Paid' : 'Unpaid';
    const sale: Sale = { ...s, id, outstanding, paymentStatus };
    set((st) => ({ sales: [sale, ...st.sales] }));
    return id;
  },
}));
