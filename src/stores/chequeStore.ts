import { create } from 'zustand';
import type { Cheque, ChequeStatus } from '@/types';
import { generateId, getTodayISO } from '@/lib/formatters';

interface ChequeState {
  cheques: Cheque[];
  addCheque: (c: Omit<Cheque, 'id'>) => string;
  updateStatus: (id: string, status: ChequeStatus) => Cheque | null;
  getPendingCount: () => number;
  getPendingTotal: () => number;
}

export const useChequeStore = create<ChequeState>((set, get) => ({
  cheques: [],

  addCheque: (c) => {
    const id = generateId('CHQ');
    set((s) => ({ cheques: [{ ...c, id }, ...s.cheques] }));
    return id;
  },

  updateStatus: (id, status) => {
    let found: Cheque | null = null;
    set((s) => ({
      cheques: s.cheques.map(c => {
        if (c.id === id) {
          found = { ...c, status, bounceDate: status === 'Bounced' ? getTodayISO() : c.bounceDate };
          return found;
        }
        return c;
      }),
    }));
    return found;
  },

  getPendingCount: () => get().cheques.filter(c => c.status === 'Pending').length,
  getPendingTotal: () => get().cheques.filter(c => c.status === 'Pending').reduce((s, c) => s + c.amount, 0),
}));
