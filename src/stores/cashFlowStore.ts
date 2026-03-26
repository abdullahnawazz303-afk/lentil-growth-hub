import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { CashEntry, DayRecord, CashEntryType, CashInCategory, CashOutCategory } from '@/types';

interface CashFlowState {
  days: Record<string, DayRecord>;
  loading: boolean;
  error: string | null;

  fetchDays: () => Promise<void>;
  getOrCreateDay: (date: string) => Promise<DayRecord>;
  addEntry: (date: string, entry: {
    type: CashEntryType;
    category: CashInCategory | CashOutCategory;
    amount: number;
    description: string;
  }) => Promise<boolean>;
  updateEntry: (date: string, entryId: string, updates: { amount?: number; description?: string; category?: CashInCategory | CashOutCategory }) => Promise<boolean>;
  deleteEntry: (date: string, entryId: string) => Promise<boolean>;
  closeDay: (date: string) => Promise<void>;
  getTodayBalance: () => number;
}

export const useCashFlowStore = create<CashFlowState>((set, get) => ({
  days: {},
  loading: false,
  error: null,

  // ── Fetch all cash days with their entries
  fetchDays: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('cash_days')
      .select('*, cash_entries(*)')
      .order('business_date', { ascending: false });

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    const days: Record<string, DayRecord> = {};

    for (const row of data || []) {
      const entries: CashEntry[] = (row.cash_entries || []).map((e: any) => ({
        id: e.id,
        date: row.business_date,
        time: e.entry_time ?? '',
        type: e.entry_type as CashEntryType,
        category: e.category,
        amount: e.amount,
        description: e.description ?? '',
      }));

      days[row.business_date] = {
        date: row.business_date,
        openingBalance: row.opening_balance,
        entries,
        isClosed: row.is_closed,
        closingBalance: row.closing_balance ?? undefined,
      };
    }

    set({ days, loading: false });
  },

  // ── Get existing day or create a new one in Supabase
  getOrCreateDay: async (date) => {
    const existing = get().days[date];
    if (existing) return existing;

    // Calculate opening balance from last closed day
    const allDates = Object.keys(get().days).sort();
    let openingBalance = 0;
    for (let i = allDates.length - 1; i >= 0; i--) {
      const d = get().days[allDates[i]];
      if (allDates[i] < date && d.isClosed && d.closingBalance !== undefined) {
        openingBalance = d.closingBalance;
        break;
      }
    }

    // Insert new cash day in Supabase
    const { data, error } = await supabase
      .from('cash_days')
      .insert({
        business_date: date,
        opening_balance: openingBalance,
        is_closed: false,
      })
      .select()
      .single();

    if (error) {
      // Day might already exist, try to fetch it
      const { data: existing } = await supabase
        .from('cash_days')
        .select('*, cash_entries(*)')
        .eq('business_date', date)
        .single();

      if (existing) {
        const day: DayRecord = {
          date: existing.business_date,
          openingBalance: existing.opening_balance,
          entries: (existing.cash_entries || []).map((e: any) => ({
            id: e.id,
            date: existing.business_date,
            time: e.entry_time ?? '',
            type: e.entry_type as CashEntryType,
            category: e.category,
            amount: e.amount,
            description: e.description ?? '',
          })),
          isClosed: existing.is_closed,
          closingBalance: existing.closing_balance ?? undefined,
        };
        set((s) => ({ days: { ...s.days, [date]: day } }));
        return day;
      }
    }

    const day: DayRecord = {
      date,
      openingBalance,
      entries: [],
      isClosed: false,
    };

    set((s) => ({ days: { ...s.days, [date]: day } }));
    return day;
  },

  // ── Add a cash entry for a given day
  addEntry: async (date, entry) => {
    const day = await get().getOrCreateDay(date);
    if (day.isClosed) return false;

    // Get cash_day id from Supabase
    const { data: dayRow } = await supabase
      .from('cash_days')
      .select('id')
      .eq('business_date', date)
      .single();

    if (!dayRow) return false;

    const { data, error } = await supabase
      .from('cash_entries')
      .insert({
        cash_day_id: dayRow.id,
        entry_type: entry.type,
        category: entry.category,
        amount: entry.amount,
        description: entry.description ?? null,
      })
      .select()
      .single();

    if (error) return false;

    const cashEntry: CashEntry = {
      id: data.id,
      date,
      time: data.entry_time ?? '',
      type: entry.type,
      category: entry.category,
      amount: entry.amount,
      description: entry.description,
    };

    set((s) => ({
      days: {
        ...s.days,
        [date]: {
          ...s.days[date],
          entries: [...(s.days[date]?.entries || []), cashEntry],
        },
      },
    }));

    return true;
  },

  // ── Close a day — triggers closing balance calculation in DB
  closeDay: async (date) => {
    const { data: dayRow } = await supabase
      .from('cash_days')
      .select('id')
      .eq('business_date', date)
      .single();

    if (!dayRow) return;

    const { error } = await supabase
      .from('cash_days')
      .update({ is_closed: true })
      .eq('id', dayRow.id);

    if (error) return;

    // Refresh to get closing balance computed by DB trigger
    await get().fetchDays();
  },

  // ── Get today's current balance from local state
  getTodayBalance: () => {
    const today = new Date().toISOString().split('T')[0];
    const day = get().days[today];

    if (!day) {
      // Return last closed day's closing balance
      const allDates = Object.keys(get().days).sort();
      for (let i = allDates.length - 1; i >= 0; i--) {
        const d = get().days[allDates[i]];
        if (d.isClosed && d.closingBalance !== undefined) return d.closingBalance;
      }
      return 0;
    }

    const totalIn = day.entries
      .filter(e => e.type === 'in')
      .reduce((s, e) => s + e.amount, 0);
    const totalOut = day.entries
      .filter(e => e.type === 'out')
      .reduce((s, e) => s + e.amount, 0);

    return day.openingBalance + totalIn - totalOut;
  },

  updateEntry: async (date, entryId, updates) => {
    const day = get().days[date];
    if (day?.isClosed) return false;

    const { error } = await supabase.from('cash_entries').update(updates).eq('id', entryId);
    if (error) return false;

    set((s) => ({
      days: {
        ...s.days,
        [date]: {
          ...s.days[date],
          entries: s.days[date].entries.map(e => e.id === entryId ? { ...e, ...updates } : e)
        }
      }
    }));
    return true;
  },

  deleteEntry: async (date, entryId) => {
    const day = get().days[date];
    if (day?.isClosed) return false;

    const { error } = await supabase.from('cash_entries').delete().eq('id', entryId);
    if (error) return false;

    set((s) => ({
      days: {
        ...s.days,
        [date]: {
          ...s.days[date],
          entries: s.days[date].entries.filter(e => e.id !== entryId)
        }
      }
    }));
    return true;
  },
}));