import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface RateItem {
  id: string;
  item_name: string;
  grade: string;
  price_per_kg: number;
  updated_at: string;
}

interface RateCardState {
  rates: RateItem[];
  loading: boolean;
  error: string | null;

  fetchRates: () => Promise<void>;
  updateRate: (itemName: string, grade: string, price: number) => Promise<{success: boolean, error?: string}>;
}

export const useRateCardStore = create<RateCardState>((set, get) => ({
  rates: [],
  loading: false,
  error: null,

  fetchRates: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('rate_card')
      .select('*')
      .order('item_name', { ascending: true })
      .order('grade', { ascending: true });

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }
    set({ rates: data || [], loading: false });
  },

  updateRate: async (itemName: string, grade: string, price: number) => {
    const { error } = await supabase
      .from('rate_card')
      .upsert(
        { item_name: itemName, grade, price_per_kg: price, updated_at: new Date().toISOString() },
        { onConflict: 'item_name,grade' }
      );

    if (error) {
      console.error("Rate card upsert error:", error);
      set({ error: error.message });
      return { success: false, error: error.message };
    }

    await get().fetchRates();
    return { success: true };
  },
}));
