import { create } from 'zustand';
import type { Customer, LedgerEntry } from '@/types';
import { generateId, getTodayISO } from '@/lib/formatters';

interface CustomerState {
  customers: Customer[];
  ledgerEntries: Record<string, LedgerEntry[]>;
  addCustomer: (c: Omit<Customer, 'id' | 'createdAt'>) => string;
  addLedgerEntry: (customerId: string, entry: Omit<LedgerEntry, 'id' | 'balance'>) => void;
  getOutstanding: (customerId: string) => number;
  getTotalReceivables: () => number;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  ledgerEntries: {},

  addCustomer: (c) => {
    const id = generateId('C');
    const openingBalance = (c as any).openingBalance ?? 0;

    const initialEntries: LedgerEntry[] = [];
    if (openingBalance > 0) {
      initialEntries.push({
        id: generateId('CL'),
        date: getTodayISO(),
        type: 'Opening Balance',
        description: 'Opening balance at time of registration',
        debit: openingBalance,
        credit: 0,
        balance: openingBalance,
      });
    }

    set((s) => ({
      customers: [...s.customers, { ...c, id, createdAt: getTodayISO() }],
      ledgerEntries: { ...s.ledgerEntries, [id]: initialEntries },
    }));
    return id;
  },

  addLedgerEntry: (customerId, entry) => {
    set((s) => {
      const existing = s.ledgerEntries[customerId] || [];
      const lastBalance = existing.length > 0 ? existing[existing.length - 1].balance : 0;
      const newBalance = lastBalance + entry.debit - entry.credit;
      const newEntry: LedgerEntry = {
        ...entry,
        id: generateId('CL'),
        balance: newBalance,
      };
      return {
        ledgerEntries: { ...s.ledgerEntries, [customerId]: [...existing, newEntry] },
      };
    });
  },

  getOutstanding: (customerId) => {
    const entries = get().ledgerEntries[customerId] || [];
    if (entries.length === 0) return 0;
    return entries[entries.length - 1].balance;
  },

  getTotalReceivables: () => {
    const { ledgerEntries } = get();
    let total = 0;
    for (const entries of Object.values(ledgerEntries)) {
      if (entries.length > 0) {
        const bal = entries[entries.length - 1].balance;
        if (bal > 0) total += bal;
      }
    }
    return total;
  },
}));