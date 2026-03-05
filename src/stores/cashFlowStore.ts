import { create } from 'zustand';
import type { CashEntry, DayRecord, CashEntryType, CashInCategory, CashOutCategory } from '@/types';
import { generateId, getTodayISO } from '@/lib/formatters';

interface CashFlowState {
  days: Record<string, DayRecord>;
  getOrCreateDay: (date: string) => DayRecord;
  addEntry: (date: string, entry: { type: CashEntryType; category: CashInCategory | CashOutCategory; amount: number; description: string }) => boolean;
  closeDay: (date: string) => void;
  getTodayBalance: () => number;
}

export const useCashFlowStore = create<CashFlowState>((set, get) => ({
  days: {},

  getOrCreateDay: (date) => {
    const existing = get().days[date];
    if (existing) return existing;

    // Find previous day's closing balance
    const allDates = Object.keys(get().days).sort();
    let openingBalance = 0;
    for (let i = allDates.length - 1; i >= 0; i--) {
      const d = get().days[allDates[i]];
      if (allDates[i] < date && d.isClosed && d.closingBalance !== undefined) {
        openingBalance = d.closingBalance;
        break;
      }
    }

    const day: DayRecord = { date, openingBalance, entries: [], isClosed: false };
    set((s) => ({ days: { ...s.days, [date]: day } }));
    return day;
  },

  addEntry: (date, entry) => {
    const day = get().getOrCreateDay(date);
    if (day.isClosed) return false;
    const cashEntry: CashEntry = {
      ...entry,
      id: generateId('CE'),
      date,
      time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }),
    };
    set((s) => ({
      days: {
        ...s.days,
        [date]: { ...s.days[date], entries: [...s.days[date].entries, cashEntry] },
      },
    }));
    return true;
  },

  closeDay: (date) => {
    const day = get().getOrCreateDay(date);
    const totalIn = day.entries.filter(e => e.type === 'in').reduce((s, e) => s + e.amount, 0);
    const totalOut = day.entries.filter(e => e.type === 'out').reduce((s, e) => s + e.amount, 0);
    const closingBalance = day.openingBalance + totalIn - totalOut;
    set((s) => ({
      days: {
        ...s.days,
        [date]: { ...s.days[date], isClosed: true, closingBalance },
      },
    }));
  },

  getTodayBalance: () => {
    const today = getTodayISO();
    const day = get().days[today];
    if (!day) {
      // Find last closing balance
      const allDates = Object.keys(get().days).sort();
      for (let i = allDates.length - 1; i >= 0; i--) {
        const d = get().days[allDates[i]];
        if (d.isClosed && d.closingBalance !== undefined) return d.closingBalance;
      }
      return 0;
    }
    const totalIn = day.entries.filter(e => e.type === 'in').reduce((s, e) => s + e.amount, 0);
    const totalOut = day.entries.filter(e => e.type === 'out').reduce((s, e) => s + e.amount, 0);
    return day.openingBalance + totalIn - totalOut;
  },
}));
