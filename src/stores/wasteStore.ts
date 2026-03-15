import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { WasteEntry } from '@/types';

interface WasteState {
  entries: WasteEntry[];
  loading: boolean;
  error: string | null;

  fetchEntries: () => Promise<void>;
  addEntry: (e: Omit<WasteEntry, 'id' | 'processingId' | 'isSold'>) => Promise<string | null>;
  editEntry: (processingId: string, updates: {
    wasteQuantity: number;
    cleanedQuantity: number;
    notes: string;
    date: string;
  }) => Promise<boolean>;
  deleteEntry: (entryId: string) => Promise<{ success: boolean; reason?: string }>;
  markAsSold: (wasteRecordId: string, pricePerKg: number, soldTo: string, soldDate: string) => Promise<boolean>;
  getTotalWaste: () => number;
  getTotalWasteSaleRevenue: () => number;
  getWasteByVendor: (vendorId: string) => WasteEntry[];
  getWasteByBatch: (batchId: string) => WasteEntry[];
}

// ── Helper: get open cash day id
const getOpenCashDayId = async (): Promise<string | null> => {
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase
    .from('cash_days')
    .select('id, is_closed')
    .eq('business_date', today)
    .maybeSingle();

  if (existing) return existing.is_closed ? null : existing.id;

  const { data: lastClosed } = await supabase
    .from('cash_days')
    .select('closing_balance')
    .eq('is_closed', true)
    .order('business_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: newDay, error } = await supabase
    .from('cash_days')
    .insert({ business_date: today, opening_balance: lastClosed?.closing_balance ?? 0, is_closed: false })
    .select('id')
    .single();

  return error ? null : newDay.id;
};

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
          id, waste_quantity_kg, is_sold,
          sale_price_per_kg, sale_amount, sold_to, sold_date
        )
      `)
      .order('process_date', { ascending: false });

    if (error) { set({ error: error.message, loading: false }); return; }

    const entries: WasteEntry[] = (data || []).map((row: any) => {
      const wasteRecord = row.waste_records?.[0] ?? null;
      return {
        id: wasteRecord?.id ?? row.id,
        processingId: row.id,
        date: row.process_date,
        batchId: row.source_batch_id,
        vendorId: row.source_batch?.vendor_id ?? '',
        itemName: row.output_item_name ?? row.source_batch?.item_name ?? '',
        grade: row.output_grade ?? row.source_batch?.grade ?? 'A',
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

  // ── Add entry — blocks if this batch already has a processing record
  addEntry: async (e) => {
    set({ loading: true, error: null });

    // ── Check: one batch = one process only
    const { count: existingCount } = await supabase
      .from('processing_records')
      .select('id', { count: 'exact', head: true })
      .eq('source_batch_id', e.batchId);

    if (existingCount && existingCount > 0) {
      set({
        error: 'This batch has already been processed. Edit the existing record instead.',
        loading: false,
      });
      return null;
    }

    // ── Validate batch stock
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

    // ── Insert processing record
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

    // ── Insert waste record
    await supabase.from('waste_records').insert({
      processing_id: processRow.id,
      waste_quantity_kg: e.wasteQuantity,
      is_sold: false,
    });

    // ── Deduct only waste qty from batch (cleaned stays in batch)
    await supabase
      .from('inventory_batches')
      .update({ remaining_qty_kg: batch.remaining_qty_kg - e.wasteQuantity })
      .eq('id', e.batchId);

    // ── Record movement
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

  // ── Edit entry — restores old waste, applies new waste to batch
  editEntry: async (processingId, updates) => {
    const entry = get().entries.find(e => e.processingId === processingId);
    if (!entry) return false;

    // ── Cannot edit if waste has been sold
    if (entry.isSold) {
      set({ error: 'Cannot edit a waste record that has already been sold.' });
      return false;
    }

    // ── Get current batch remaining
    const { data: batch } = await supabase
      .from('inventory_batches')
      .select('remaining_qty_kg')
      .eq('id', entry.batchId)
      .single();

    if (!batch) return false;

    // ── Calculate new available: restore old waste first, then check new waste fits
    const restoredQty     = batch.remaining_qty_kg + entry.wasteQuantity;
    const newWaste        = updates.wasteQuantity;
    const newCleaned      = updates.cleanedQuantity;

    if (newWaste + newCleaned > entry.originalQuantity) {
      set({ error: 'Waste + Cleaned cannot exceed original quantity' });
      return false;
    }

    if (newWaste > restoredQty) {
      set({ error: `Only ${restoredQty} kg available after restoring old waste` });
      return false;
    }

    // ── Update processing record
    const { error: updateErr } = await supabase
      .from('processing_records')
      .update({
        process_date: updates.date,
        waste_quantity_kg: newWaste,
        clean_quantity_kg: newCleaned,
        notes: updates.notes ?? null,
      })
      .eq('id', processingId);

    if (updateErr) { set({ error: updateErr.message }); return false; }

    // ── Update waste_records quantity
    await supabase
      .from('waste_records')
      .update({ waste_quantity_kg: newWaste })
      .eq('processing_id', processingId);

    // ── Update batch: restore old waste, deduct new waste
    const netChange = entry.wasteQuantity - newWaste; // positive = restoring more than new
    await supabase
      .from('inventory_batches')
      .update({ remaining_qty_kg: batch.remaining_qty_kg + netChange })
      .eq('id', entry.batchId);

    // ── Record adjustment movement
    if (netChange !== 0) {
      await supabase.from('inventory_movements').insert({
        batch_id: entry.batchId,
        movement_type: 'ADJUSTMENT',
        quantity_kg: Math.abs(netChange),
        reference_type: 'PROCESSING',
        reference_id: processingId,
        notes: `Waste entry edited — adjustment of ${netChange > 0 ? '+' : ''}${netChange} kg`,
      });
    }

    await get().fetchEntries();
    return true;
  },

  // ── Delete entry — blocked if waste is sold
  deleteEntry: async (entryId) => {
    const entry = get().entries.find(e => e.id === entryId);
    if (!entry) return { success: false, reason: 'Record not found.' };

    // ── Block if sold
    if (entry.isSold) {
      return {
        success: false,
        reason: 'This waste has already been sold and a sale record exists. Cannot delete.',
      };
    }

    // ── Restore waste qty back to batch
    const { data: batch } = await supabase
      .from('inventory_batches')
      .select('remaining_qty_kg')
      .eq('id', entry.batchId)
      .single();

    if (batch) {
      await supabase
        .from('inventory_batches')
        .update({ remaining_qty_kg: batch.remaining_qty_kg + entry.wasteQuantity })
        .eq('id', entry.batchId);

      // Record restore movement
      await supabase.from('inventory_movements').insert({
        batch_id: entry.batchId,
        movement_type: 'IN',
        quantity_kg: entry.wasteQuantity,
        reference_type: 'PROCESSING',
        reference_id: entry.processingId,
        notes: 'Waste record deleted — stock restored',
      });
    }

    // ── Delete waste_record first (FK constraint), then processing_record
    await supabase.from('waste_records').delete().eq('processing_id', entry.processingId);
    const { error } = await supabase
      .from('processing_records')
      .delete()
      .eq('id', entry.processingId);

    if (error) return { success: false, reason: error.message };

    set(s => ({ entries: s.entries.filter(e => e.id !== entryId) }));
    return { success: true };
  },

  // ── Mark waste as sold — pure profit, records cash-in entry
  markAsSold: async (wasteRecordId, pricePerKg, soldTo, soldDate) => {
    const entry = get().entries.find(e => e.id === wasteRecordId);
    if (!entry) return false;

    const saleAmount = entry.wasteQuantity * pricePerKg;

    const { error } = await supabase
      .from('waste_records')
      .update({
        is_sold: true,
        sale_price_per_kg: pricePerKg,
        sale_amount: saleAmount,
        sold_to: soldTo || null,
        sold_date: soldDate,
      })
      .eq('id', wasteRecordId);

    if (error) { console.error('markAsSold failed:', error.message); return false; }

    // ── Record cash-in entry (waste sale = pure profit)
    const cashDayId = await getOpenCashDayId();
    if (cashDayId) {
      await supabase.from('cash_entries').insert({
        cash_day_id: cashDayId,
        entry_type: 'in',
        category: 'Other Income',
        amount: saleAmount,
        description: `Waste sold${soldTo ? ` to ${soldTo}` : ''} — ${entry.itemName} ${entry.grade} ${entry.wasteQuantity} kg`,
      });
    }

    set(s => ({
      entries: s.entries.map(e =>
        e.id === wasteRecordId
          ? { ...e, isSold: true, salePricePerKg: pricePerKg, saleAmount, soldTo, soldDate }
          : e
      ),
    }));

    return true;
  },

  // ── Computed
  getTotalWaste: () =>
    get().entries.reduce((s, e) => s + e.wasteQuantity, 0),

  getTotalWasteSaleRevenue: () =>
    get().entries
      .filter(e => e.isSold && e.saleAmount)
      .reduce((s, e) => s + (e.saleAmount ?? 0), 0),

  getWasteByVendor: (vendorId) =>
    get().entries.filter(e => e.vendorId === vendorId),

  getWasteByBatch: (batchId) =>
    get().entries.filter(e => e.batchId === batchId),
}));