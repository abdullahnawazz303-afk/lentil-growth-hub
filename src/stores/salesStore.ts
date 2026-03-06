import { create } from 'zustand';
import type { Sale } from '@/types';
import { generateId } from '@/lib/formatters';

interface SalesState {
  sales: Sale[];
  addSale: (s: Omit<Sale, 'id' | 'outstanding' | 'paymentStatus'>) => string;
  addPayment: (saleId: string, amount: number) => Sale | null;
}

export const useSalesStore = create<SalesState>((set, get) => ({
  sales: [],

  addSale: (s) => {
    const id = generateId('SL');
    const outstanding = s.totalAmount - s.amountPaid;
    const paymentStatus = outstanding <= 0 ? 'Paid' : s.amountPaid > 0 ? 'Partially Paid' : 'Unpaid';
    const sale: Sale = { ...s, id, outstanding, paymentStatus };
    set((st) => ({ sales: [sale, ...st.sales] }));
    return id;
  },

  addPayment: (saleId, amount) => {
    let updated: Sale | null = null;
    set((st) => ({
      sales: st.sales.map((s) => {
        if (s.id !== saleId) return s;
        const newPaid = s.amountPaid + amount;
        const newOutstanding = s.totalAmount - newPaid;
        const paymentStatus = newOutstanding <= 0 ? 'Paid' : 'Partially Paid';
        updated = { ...s, amountPaid: newPaid, outstanding: newOutstanding, paymentStatus };
        return updated;
      }),
    }));
    return updated;
  },
}));