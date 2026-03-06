import { create } from 'zustand';
import type { Vendor, LedgerEntry } from '@/types';
import { generateId, getTodayISO } from '@/lib/formatters';

interface VendorState {
  vendors: Vendor[];
  ledgerEntries: Record<string, LedgerEntry[]>;
  addVendor: (v: Omit<Vendor, 'id' | 'createdAt'>) => string;
  addLedgerEntry: (vendorId: string, entry: Omit<LedgerEntry, 'id' | 'balance'>) => void;
  getOutstanding: (vendorId: string) => number;
  getTotalPayables: () => number;
}

export const useVendorStore = create<VendorState>((set, get) => ({
  vendors: [],
  ledgerEntries: {},

  addVendor: (v) => {
    const id = generateId('V');
    set((s) => ({
      vendors: [...s.vendors, { ...v, id, createdAt: getTodayISO() }],
      ledgerEntries: { ...s.ledgerEntries, [id]: [] },
    }));
    return id;
  },

  addLedgerEntry: (vendorId, entry) => {
    set((s) => {
      const existing = s.ledgerEntries[vendorId] || [];
      const lastBalance = existing.length > 0 ? existing[existing.length - 1].balance : 0;
      // credit = vendor gave us goods = we OWE more = balance goes UP
      // debit  = we paid vendor     = we OWE less  = balance goes DOWN
      const newBalance = lastBalance + entry.credit - entry.debit;
      const newEntry: LedgerEntry = {
        ...entry,
        id: generateId('VL'),
        balance: newBalance,
      };
      return {
        ledgerEntries: {
          ...s.ledgerEntries,
          [vendorId]: [...existing, newEntry],
        },
      };
    });
  },

  getOutstanding: (vendorId) => {
    const entries = get().ledgerEntries[vendorId] || [];
    if (entries.length === 0) return 0;
    return entries[entries.length - 1].balance;
  },

  getTotalPayables: () => {
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