import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { useInventoryStore } from './inventoryStore';
import type { Sale, PaymentStatus } from '@/types';

interface SalesState {
  sales: Sale[];
  loading: boolean;
  error: string | null;

  fetchSales: () => Promise<void>;
  addSale: (s: Omit<Sale, 'id' | 'outstanding' | 'paymentStatus'>) => Promise<string | null>;
  addPayment: (saleId: string, amount: number) => Promise<Sale | null>;
}

// ── Helper: get or create today's cash day and return its id
// Returns null if the day is closed (entries cannot be added)
const getOpenCashDayId = async (): Promise<string | null> => {
  const today = new Date().toISOString().split('T')[0];

  // Try to fetch existing day
  const { data: existing } = await supabase
    .from('cash_days')
    .select('id, is_closed')
    .eq('business_date', today)
    .maybeSingle();

  if (existing) {
    return existing.is_closed ? null : existing.id;
  }

  // No day exists yet — create it
  // Opening balance = last closed day's closing balance
  const { data: lastClosed } = await supabase
    .from('cash_days')
    .select('closing_balance')
    .eq('is_closed', true)
    .order('business_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const openingBalance = lastClosed?.closing_balance ?? 0;

  const { data: newDay, error } = await supabase
    .from('cash_days')
    .insert({ business_date: today, opening_balance: openingBalance, is_closed: false })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create cash day:', error.message);
    return null;
  }

  return newDay.id;
};

// ── Helper: get previous running balance for a customer ledger
const getLastCustomerBalance = async (customerId: string): Promise<number> => {
  const { data } = await supabase
    .from('customer_ledger')
    .select('running_balance')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.running_balance ?? 0;
};

export const useSalesStore = create<SalesState>((set, get) => ({
  sales: [],
  loading: false,
  error: null,

  // ── Fetch all sales with their items
  fetchSales: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        customers(name),
        sale_items(
          *,
          inventory_batches(item_name, grade)
        )
      `)
      .order('sale_date', { ascending: false });

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    const sales: Sale[] = (data || []).map((row: any) => ({
      id: row.id,
      saleRef: row.sale_ref ?? '',
      date: row.sale_date,
      customerId: row.customer_id,
      customerName: row.customers?.name ?? '',
      items: (row.sale_items || []).map((i: any) => ({
        batchId: i.batch_id,
        itemName: i.inventory_batches?.item_name ?? '',
        grade: i.inventory_batches?.grade ?? '',
        quantity: i.quantity_kg,
        salePrice: i.sale_price_per_kg,
        subtotal: i.subtotal,
      })),
      totalAmount: row.total_amount,
      amountPaid: row.amount_paid,
      outstanding: row.outstanding,
      paymentStatus: row.payment_status as PaymentStatus,
      notes: row.notes ?? '',
    }));

    set({ sales, loading: false });
  },

  // ── Add a new sale
  // Flow:
  //   1. Insert sale row  → DB trigger posts debit to customer_ledger automatically
  //   2. Insert sale_items → DB trigger deducts inventory automatically
  //   3. If amountPaid > 0, manually post a credit to customer_ledger
  //   4. If amountPaid > 0, add cash-in entry to today's cash day
  addSale: async (s) => {
    set({ loading: true, error: null });

    const outstanding = s.totalAmount - s.amountPaid;
    const paymentStatus: PaymentStatus =
      outstanding <= 0 ? 'Paid'
      : s.amountPaid > 0 ? 'Partially Paid'
      : 'Unpaid';

    // ── Step 1: Insert sale record
    // DB trigger `trg_post_sale_to_ledger` fires here and posts debit entry
    const { data: saleRow, error: saleErr } = await supabase
      .from('sales')
      .insert({
        customer_id: s.customerId,
        sale_date: s.date,
        total_amount: s.totalAmount,
        amount_paid: s.amountPaid,
        payment_status: paymentStatus,
        notes: s.notes ?? null,
      })
      .select('id, sale_ref')
      .single();

    if (saleErr || !saleRow) {
      console.error('Sale insert failed:', saleErr?.message);
      set({ error: saleErr?.message ?? 'Sale insert failed', loading: false });
      return null;
    }

    // ── Step 2: Insert sale items
    const { error: itemsErr } = await supabase
      .from('sale_items')
      .insert(
        s.items.map((item) => ({
          sale_id: saleRow.id,
          batch_id: item.batchId,
          quantity_kg: item.quantity,
          sale_price_per_kg: item.salePrice,
        }))
      );

    if (itemsErr) {
      // Items failed — the sale record exists but is empty.
      // Delete the orphaned sale to keep DB clean.
      await supabase.from('sales').delete().eq('id', saleRow.id);
      console.error('Sale items insert failed (sale rolled back):', itemsErr.message);
      set({ error: itemsErr.message, loading: false });
      return null;
    }

    // ── Step 2b: Deduct inventory for each item & record OUT movement
    // The DB trigger trg_deduct_inventory_on_sale may or may not exist in Supabase.
    // We do this explicitly in JS to guarantee stock is always updated.
    const inventoryStore = useInventoryStore.getState();
    for (const item of s.items) {
      if (!item.batchId) continue;
      // Deduct from batch (updates remaining_qty_kg in DB + local state)
      const deducted = await inventoryStore.deductFromBatch(item.batchId, item.quantity);
      if (!deducted) {
        console.warn(`Could not deduct inventory for batch ${item.batchId}. Stock may be insufficient.`);
      }
      // Log an OUT movement in inventory_movements for audit trail
      await supabase.from('inventory_movements').insert({
        batch_id: item.batchId,
        movement_type: 'OUT',
        quantity_kg: item.quantity,
        reference_type: 'SALE',
        reference_id: saleRow.id,
        notes: `Sale ${saleRow.sale_ref} — ${item.itemName}`,
      });
    }

    // ── Step 3: If customer paid upfront, post credit to their ledger
    // (The DB trigger only posts the debit/sale. The payment credit must be manual.)
    if (s.amountPaid > 0) {
      const prevBalance = await getLastCustomerBalance(s.customerId);

      await supabase.from('customer_ledger').insert({
        customer_id: s.customerId,
        entry_date: s.date,
        transaction_type: 'Payment Received',
        description: `Payment received with sale ${saleRow.sale_ref}`,
        debit: 0,
        credit: s.amountPaid,
        running_balance: prevBalance - s.amountPaid,
        reference_type: 'SALE',
        reference_id: saleRow.id,
      });
    }

    // ── Step 4: Record cash-in if payment was made today
    if (s.amountPaid > 0) {
      const cashDayId = await getOpenCashDayId();
      if (cashDayId) {
        await supabase.from('cash_entries').insert({
          cash_day_id: cashDayId,
          entry_type: 'in',
          category: 'Sale Revenue',
          amount: s.amountPaid,
          description: `Sale ${saleRow.sale_ref} — ${s.notes || 'Cash payment'}`,
        });
      }
      // If cashDayId is null, the day is closed — cash entry skipped intentionally
    }

    await get().fetchSales();
    return saleRow.id;
  },

  // ── Record a payment against an existing sale
  addPayment: async (saleId, amount) => {
    const sale = get().sales.find((s) => s.id === saleId);
    if (!sale) return null;

    if (amount <= 0) return null;
    if (amount > sale.outstanding) {
      console.warn('Payment exceeds outstanding amount');
    }

    const newPaid       = sale.amountPaid + amount;
    const newOutstanding = sale.totalAmount - newPaid;
    const paymentStatus: PaymentStatus =
      newOutstanding <= 0 ? 'Paid' : 'Partially Paid';

    // ── Update sale record
    const { error: updateErr } = await supabase
      .from('sales')
      .update({ amount_paid: newPaid, payment_status: paymentStatus })
      .eq('id', saleId);

    if (updateErr) {
      set({ error: updateErr.message });
      return null;
    }

    // ── Post credit to customer ledger
    const prevBalance = await getLastCustomerBalance(sale.customerId);

    await supabase.from('customer_ledger').insert({
      customer_id: sale.customerId,
      entry_date: new Date().toISOString().split('T')[0],
      transaction_type: 'Payment Received',
      description: `Payment received — Sale ${saleId}`,
      debit: 0,
      credit: amount,
      running_balance: prevBalance - amount,
      reference_type: 'SALE',
      reference_id: saleId,
    });

    // ── Add to cash flow
    const cashDayId = await getOpenCashDayId();
    if (cashDayId) {
      await supabase.from('cash_entries').insert({
        cash_day_id: cashDayId,
        entry_type: 'in',
        category: 'Customer Payment',
        amount: amount,
        description: `Payment from customer — Sale ${saleId}`,
      });
    }

    // ── Update local state immediately (no full re-fetch needed)
    const updated: Sale = {
      ...sale,
      amountPaid: newPaid,
      outstanding: newOutstanding,
      paymentStatus,
    };

    set((st) => ({
      sales: st.sales.map((s) => (s.id === saleId ? updated : s)),
    }));

    return updated;
  },
}));