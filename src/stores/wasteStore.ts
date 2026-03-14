import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { WasteEntry } from '@/types';

interface WasteState {
  entries: WasteEntry[];
  loading: boolean;
  error: string | null;

  fetchEntries: () => Promise<void>;
  addEntry: (e: Omit<WasteEntry, 'id' | 'processingId' | 'isSold'>) => Promise<string | null>;
  markAsSold: (wasteRecordId: string, pricePerKg: number, soldTo: string, soldDate: string) => Promise<boolean>;
  getTotalWaste: () => number;
  getTotalWasteSaleRevenue: () => number;
  getWasteByVendor: (vendorId: string) => WasteEntry[];
  getWasteByBatch: (batchId: string) => WasteEntry[];
}

export const useWasteStore = create<WasteState>((set, get) => ({
  entries: [],
  loading: false,
  error: null,

  // ── Fetch all processing + waste records joined
  fetchEntries: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
  .from('processing_records')
  .select(`
    *,
    source_batch:inventory_batches!processing_records_source_batch_id_fkey(
      item_name, grade, vendor_id
    ),
    waste_records(
      id,
      waste_quantity_kg,
      is_sold,
      sale_price_per_kg,
      sale_amount,
      sold_to,
      sold_date
    )
  `)
  .order('process_date', { ascending: false });

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    const entries: WasteEntry[] = (data || []).map((row: any) => {
      // Each processing record may have one waste_record
      const wasteRecord = row.waste_records?.[0] ?? null;

      return {
        id: wasteRecord?.id ?? row.id,       // prefer waste_record id for markAsSold
        processingId: row.id,
        date: row.process_date,
        batchId: row.source_batch_id,
        vendorId: row.inventory_batches?.vendor_id ?? '',
        itemName: row.output_item_name ?? row.inventory_batches?.item_name ?? '',
        grade: row.output_grade ?? row.inventory_batches?.grade ?? 'A',
        originalQuantity: row.raw_quantity_kg,
        wasteQuantity: row.waste_quantity_kg,
        cleanedQuantity: row.clean_quantity_kg,
        isSold: wasteRecord?.is_sold ?? false,
        salePricePerKg: wasteRecord?.sale_price_per_kg ?? undefined,
        saleAmount: wasteRecord?.sale_amount ?? undefined,
        soldTo: wasteRecord?.sold_to ?? undefined,
        soldDate: wasteRecord?.sold_date ?? undefined,
        notes: row.notes ?? '',
      };
    });

    set({ entries, loading: false });
  },

  // ── Add a processing + waste entry
  addEntry: async (e) => {
    set({ loading: true, error: null });

    // Step 1 — Validate batch has enough stock
    const { data: batch, error: batchErr } = await supabase
      .from('inventory_batches')
      .select('remaining_qty_kg')
      .eq('id', e.batchId)
      .single();

    if (batchErr || !batch) {
      set({ error: 'Batch not found', loading: false });
      return null;
    }

    if (e.originalQuantity > batch.remaining_qty_kg) {
      set({ error: `Only ${batch.remaining_qty_kg} kg available in this batch`, loading: false });
      return null;
    }

    if (e.wasteQuantity + e.cleanedQuantity > e.originalQuantity) {
      set({ error: 'Waste + Cleaned cannot exceed original quantity', loading: false });
      return null;
    }

    // Step 2 — Insert processing record
    const { data: processRow, error: processErr } = await supabase
      .from('processing_records')
      .insert({
        source_batch_id: e.batchId,
        process_date: e.date,
        raw_quantity_kg: e.originalQuantity,
        clean_quantity_kg: e.cleanedQuantity,
        waste_quantity_kg: e.wasteQuantity,
        output_item_name: e.itemName,
        output_grade: e.grade,
        notes: e.notes ?? null,
      })
      .select('id')
      .single();

    if (processErr || !processRow) {
      set({ error: processErr?.message ?? 'Processing insert failed', loading: false });
      return null;
    }

    // Step 3 — Insert waste record linked to processing
    await supabase.from('waste_records').insert({
      processing_id: processRow.id,
      waste_quantity_kg: e.wasteQuantity,
      is_sold: false,
    });

    // Step 4 — Deduct only waste qty from batch
    // Cleaned material stays in same batch — no new batch needed
    await supabase
      .from('inventory_batches')
      .update({ remaining_qty_kg: batch.remaining_qty_kg - e.wasteQuantity })
      .eq('id', e.batchId);

    // Step 5 — Record movement
    await supabase.from('inventory_movements').insert({
      batch_id: e.batchId,
      movement_type: 'OUT',
      quantity_kg: e.wasteQuantity,
      reference_type: 'PROCESSING',
      reference_id: processRow.id,
      notes: `Waste removed — Clean: ${e.cleanedQuantity} kg, Waste: ${e.wasteQuantity} kg`,
    });

    await get().fetchEntries();
    return processRow.id;
  },

  // ── Mark waste as sold (updates waste_records row)
  markAsSold: async (wasteRecordId, pricePerKg, soldTo, soldDate) => {
    const entry = get().entries.find((e) => e.id === wasteRecordId);
    if (!entry) return false;

    const saleAmount = entry.wasteQuantity * pricePerKg;

    const { error } = await supabase
      .from('waste_records')
      .update({
        is_sold: true,
        sale_price_per_kg: pricePerKg,
        sale_amount: saleAmount,
        sold_to: soldTo,
        sold_date: soldDate,
      })
      .eq('id', wasteRecordId);

    if (error) {
      console.error('markAsSold failed:', error.message);
      return false;
    }

    // Update local state immediately
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === wasteRecordId
          ? { ...e, isSold: true, salePricePerKg: pricePerKg, saleAmount, soldTo, soldDate }
          : e
      ),
    }));

    return true;
  },

  // ── Computed helpers
  getTotalWaste: () =>
    get().entries.reduce((s, e) => s + e.wasteQuantity, 0),

  getTotalWasteSaleRevenue: () =>
    get().entries
      .filter((e) => e.isSold && e.saleAmount)
      .reduce((s, e) => s + (e.saleAmount ?? 0), 0),

  getWasteByVendor: (vendorId) =>
    get().entries.filter((e) => e.vendorId === vendorId),

  getWasteByBatch: (batchId) =>
    get().entries.filter((e) => e.batchId === batchId),
}));