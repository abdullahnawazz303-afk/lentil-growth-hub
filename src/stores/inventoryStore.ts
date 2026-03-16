import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { InventoryBatch, Grade } from '@/types';
import { useVendorStore } from './vendorStore';

export interface BatchLineItem {
  itemName: string;
  grade: Grade;
  purchasePrice: number;
  quantity: number;
}

export interface AddPurchasePayload {
  vendorId: string;
  purchaseDate: string;
  isCredit: boolean;
  paymentTermsDays: number;
  notes: string;
  lines: BatchLineItem[];
}

interface InventoryState {
  batches: InventoryBatch[];
  loading: boolean;
  error: string | null;

  fetchBatches: () => Promise<void>;
  addBatch: (b: Omit<InventoryBatch, 'id' | 'batchRef' | 'remainingQuantity' | 'vendorName'>) => Promise<string | null>;
  addPurchase: (p: AddPurchasePayload) => Promise<boolean>;
  deductFromBatch: (batchId: string, qty: number) => Promise<boolean>;
  getTotalStockValue: () => number;
  getLowStockBatches: () => InventoryBatch[];
  getUniqueItemCount: () => number;
  getBatchById: (batchId: string) => InventoryBatch | undefined;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  batches: [],
  loading: false,
  error: null,

  // ── Fetch all batches — newest first
  // Using created_at DESC so insertion order is respected,
  // even if multiple batches share the same purchase_date
  fetchBatches: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('inventory_batches')
      .select('*, vendors(name)')
      .order('created_at', { ascending: false });

    if (error) { set({ error: error.message, loading: false }); return; }

    const batches: InventoryBatch[] = (data || []).map((row: any) => ({
      id: row.id,
      batchRef: row.batch_ref ?? row.id.slice(0, 8).toUpperCase(),
      itemName: row.item_name,
      grade: row.grade,
      vendorId: row.vendor_id,
      vendorName: row.vendors?.name ?? '',
      purchasePrice: row.purchase_price_per_kg,
      quantity: row.quantity_kg,
      remainingQuantity: row.remaining_qty_kg,
      purchaseDate: row.purchase_date,
      source: row.source ?? 'direct',
      bookingId: row.booking_id ?? null,
      purchaseId: row.purchase_id ?? null,
      processingId: row.processing_id ?? null,
      notes: row.notes ?? '',
      // Display-only — actual values live on vendor_purchases table
      paymentTermsDays: 0,
      isCredit: false,
    }));

    set({ batches, loading: false });
  },

  // ── Add a single batch (used by bookingStore on delivery)
  addBatch: async (b) => {
    const { data, error } = await supabase
      .from('inventory_batches')
      .insert({
        item_name: b.itemName,
        grade: b.grade,
        vendor_id: b.vendorId,
        purchase_price_per_kg: b.purchasePrice,
        quantity_kg: b.quantity,
        remaining_qty_kg: b.quantity,
        purchase_date: b.purchaseDate,
        source: b.source ?? 'direct',
        booking_id: b.bookingId ?? null,
        purchase_id: b.purchaseId ?? null,
        processing_id: b.processingId ?? null,
        notes: b.notes ?? null,
      })
      .select('id, quantity_kg')
      .single();

    if (error) { set({ error: error.message }); return null; }

    await supabase.from('inventory_movements').insert({
      batch_id: data.id,
      movement_type: 'IN',
      quantity_kg: data.quantity_kg,
      reference_type: b.source === 'booking' ? 'BOOKING' : 'DIRECT_PURCHASE',
      notes: 'Initial stock entry',
    });

    await get().fetchBatches();
    return data.id;
  },

  // ── Add a full purchase (multiple lines) — called from Inventory.tsx
  // Flow:
  //   1. Create vendor_purchase via vendorStore
  //      → DB trigger auto-posts credit to vendor_ledger
  //   2. Create one inventory_batch per line
  //   3. Record inventory_movements for each batch
  addPurchase: async (p) => {
    set({ loading: true, error: null });

    const totalAmount = p.lines.reduce((s, l) => s + l.quantity * l.purchasePrice, 0);

    try {
      // Step 1 — vendor_purchase record
      const vendorStore = useVendorStore.getState();
      const purchaseId = await vendorStore.addPurchase({
        vendorId: p.vendorId,
        purchaseDate: p.purchaseDate,
        items: p.lines.map(l => ({
          itemName: l.itemName,
          grade: l.grade,
          quantityKg: l.quantity,
          pricePerKg: l.purchasePrice,
        })),
        totalAmount,
        amountPaid: p.isCredit ? 0 : totalAmount,
        paymentTermsDays: p.paymentTermsDays,
        paymentMethod: p.isCredit ? 'Other' : 'Cash',
        notes: p.notes,
      });

      if (!purchaseId) {
        set({ error: 'Failed to create vendor purchase record', loading: false });
        return false;
      }

      // Step 2 & 3 — one batch + one movement per line
      for (const line of p.lines) {
        const { data: batchData, error: batchError } = await supabase
          .from('inventory_batches')
          .insert({
            item_name: line.itemName,
            grade: line.grade,
            vendor_id: p.vendorId,
            purchase_price_per_kg: line.purchasePrice,
            quantity_kg: line.quantity,
            remaining_qty_kg: line.quantity,
            purchase_date: p.purchaseDate,
            source: 'direct',
            purchase_id: purchaseId,
            notes: p.notes ?? null,
          })
          .select('id')
          .single();

        if (batchError || !batchData) {
          set({ error: batchError?.message ?? 'Batch insert failed', loading: false });
          return false;
        }

        await supabase.from('inventory_movements').insert({
          batch_id: batchData.id,
          movement_type: 'IN',
          quantity_kg: line.quantity,
          reference_type: 'DIRECT_PURCHASE',
          reference_id: purchaseId,
          notes: `Purchase entry — ${line.itemName}`,
        });
      }

      await get().fetchBatches();
      set({ loading: false });
      return true;

    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  // ── Deduct quantity from a batch when a sale is made
  // Fetches fresh data from DB if local state is stale / not loaded
  deductFromBatch: async (batchId, qty) => {
    // Try local state first
    let remaining = get().batches.find(b => b.id === batchId)?.remainingQuantity;

    // If not in local cache, fetch from DB directly
    if (remaining === undefined) {
      const { data } = await supabase
        .from('inventory_batches')
        .select('remaining_qty_kg')
        .eq('id', batchId)
        .single();
      if (!data) return false;
      remaining = data.remaining_qty_kg;
    }

    if (remaining < qty) return false;

    const newRemaining = remaining - qty;
    const { error } = await supabase
      .from('inventory_batches')
      .update({ remaining_qty_kg: newRemaining })
      .eq('id', batchId);

    if (error) return false;

    // Update local state immediately for UI responsiveness
    set((s) => ({
      batches: s.batches.map(b =>
        b.id === batchId ? { ...b, remainingQuantity: newRemaining } : b
      ),
    }));

    return true;
  },

  // ── Computed helpers
  getTotalStockValue: () =>
    get().batches.reduce((sum, b) => sum + b.remainingQuantity * b.purchasePrice, 0),

  getLowStockBatches: () =>
    get().batches.filter(b => b.remainingQuantity > 0 && b.remainingQuantity < 100),

  getUniqueItemCount: () =>
    new Set(get().batches.filter(b => b.remainingQuantity > 0).map(b => b.itemName)).size,

  getBatchById: (batchId) =>
    get().batches.find(b => b.id === batchId),
}));