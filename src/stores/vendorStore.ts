import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { Vendor, LedgerEntry, VendorPurchase, VendorPayable } from '@/types';

interface VendorState {
  vendors: Vendor[];
  ledgerEntries: Record<string, LedgerEntry[]>;
  purchases: VendorPurchase[];
  loading: boolean;
  error: string | null;

  fetchVendors: () => Promise<void>;
  fetchLedger: (vendorId: string) => Promise<void>;
  fetchPurchases: () => Promise<void>;
  addVendor: (v: Omit<Vendor, 'id' | 'createdAt'>) => Promise<string | null>;
  editVendor: (vendorId: string, updates: {
    name: string;
    contactPerson: string;
    phone: string;
    city: string;
    address: string;
    notes: string;
    isActive: boolean;
  }) => Promise<boolean>;
  deleteVendor: (vendorId: string) => Promise<{ success: boolean; reason?: string }>;
  addLedgerEntry: (vendorId: string, entry: Omit<LedgerEntry, 'id' | 'balance'>) => Promise<void>;
  addPurchase: (p: {
    vendorId: string;
    purchaseDate: string;
    items: { itemName: string; grade: string; quantityKg: number; pricePerKg: number }[];
    totalAmount: number;
    amountPaid: number;
    paymentTermsDays: number;
    paymentMethod: string;
    notes: string;
  }) => Promise<string | null>;
  recordPayment: (purchaseId: string, vendorId: string, amount: number, method: string, notes: string) => Promise<void>;

  getOutstanding: (vendorId: string) => number;
  getTotalPayables: () => number;
  getPayables: () => VendorPayable[];
  getOverduePayables: () => VendorPayable[];
  getUpcomingPayables: (days: number) => VendorPayable[];
}

export const useVendorStore = create<VendorState>((set, get) => ({
  vendors: [],
  ledgerEntries: {},
  purchases: [],
  loading: false,
  error: null,

  // ── Fetch vendors + ALL ledgers in one go
  fetchVendors: async () => {
    set({ loading: true, error: null });

    const [{ data: vendorData, error: vendorError }, { data: ledgerData }] = await Promise.all([
      supabase.from('vendors').select('*').order('name'),
      supabase.from('vendor_ledger').select('*').order('created_at', { ascending: true }),
    ]);

    if (vendorError) { set({ error: vendorError.message, loading: false }); return; }

    const vendors: Vendor[] = (vendorData || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      contactPerson: row.contact_person ?? '',
      phone: row.phone ?? '',
      city: row.city ?? '',
      address: row.address ?? '',
      openingBalance: row.opening_balance ?? 0,
      notes: row.notes ?? '',
      isActive: row.is_active,
      createdAt: row.created_at,
    }));

    const ledgerEntries: Record<string, LedgerEntry[]> = {};
    for (const row of (ledgerData || [])) {
      if (!ledgerEntries[row.vendor_id]) ledgerEntries[row.vendor_id] = [];
      ledgerEntries[row.vendor_id].push({
        id: row.id,
        date: row.entry_date,
        type: row.transaction_type,
        description: row.description ?? '',
        debit: row.debit ?? 0,
        credit: row.credit ?? 0,
        balance: row.running_balance ?? 0,
      });
    }

    set({ vendors, ledgerEntries, loading: false });
  },

  // ── Fetch single vendor ledger
  fetchLedger: async (vendorId) => {
    const { data, error } = await supabase
      .from('vendor_ledger')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: true });

    if (error) { set({ error: error.message }); return; }

    const entries: LedgerEntry[] = (data || []).map((row: any) => ({
      id: row.id,
      date: row.entry_date,
      type: row.transaction_type,
      description: row.description ?? '',
      debit: row.debit ?? 0,
      credit: row.credit ?? 0,
      balance: row.running_balance ?? 0,
    }));

    set((s) => ({ ledgerEntries: { ...s.ledgerEntries, [vendorId]: entries } }));
  },

  // ── Fetch all purchases
  fetchPurchases: async () => {
    const { data, error } = await supabase
      .from('vendor_purchases')
      .select('*, vendors(name), vendor_purchase_items(*)')
      .order('purchase_date', { ascending: false });

    if (error) { set({ error: error.message }); return; }

    const purchases: VendorPurchase[] = (data || []).map((row: any) => {
      const dueDate = row.payment_terms_days > 0
        ? new Date(new Date(row.purchase_date).getTime() + row.payment_terms_days * 86400000)
            .toISOString().split('T')[0]
        : row.purchase_date;
      return {
        id: row.id,
        purchaseRef: row.purchase_ref ?? row.id.slice(0, 8).toUpperCase(),
        vendorId: row.vendor_id,
        vendorName: row.vendors?.name ?? '',
        purchaseDate: row.purchase_date,
        totalAmount: row.total_amount,
        amountPaid: row.amount_paid ?? 0,
        outstanding: row.total_amount - (row.amount_paid ?? 0),
        paymentTermsDays: row.payment_terms_days ?? 0,
        dueDate,
        paymentMethod: row.payment_method ?? 'Cash',
        paymentStatus: row.payment_status,
        items: (row.vendor_purchase_items || []).map((i: any) => ({
          id: i.id,
          itemName: i.item_name,
          grade: i.grade,
          quantityKg: i.quantity_kg,
          pricePerKg: i.price_per_kg,
          subtotal: i.subtotal,
        })),
        notes: row.notes ?? '',
        createdAt: row.created_at,
      };
    });

    set({ purchases });
  },

  // ── Add vendor
  addVendor: async (v) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        name: v.name,
        contact_person: v.contactPerson ?? null,
        phone: v.phone ?? null,
        city: v.city ?? null,
        address: v.address ?? null,
        opening_balance: v.openingBalance ?? 0,
        notes: v.notes ?? null,
        is_active: v.isActive ?? true,
      })
      .select().single();

    if (error) { set({ error: error.message, loading: false }); return null; }

    if (v.openingBalance && v.openingBalance > 0) {
      await supabase.from('vendor_ledger').insert({
        vendor_id: data.id,
        entry_date: new Date().toISOString().split('T')[0],
        transaction_type: 'Opening Balance',
        description: 'Opening balance at registration',
        debit: 0,
        credit: v.openingBalance,
        running_balance: v.openingBalance,
      });
    }

    await get().fetchVendors();
    return data.id;
  },

  // ── Edit vendor profile — no financial impact
  editVendor: async (vendorId, updates) => {
    const { error } = await supabase
      .from('vendors')
      .update({
        name: updates.name,
        contact_person: updates.contactPerson || null,
        phone: updates.phone || null,
        city: updates.city || null,
        address: updates.address || null,
        notes: updates.notes || null,
        is_active: updates.isActive,
      })
      .eq('id', vendorId);

    if (error) { set({ error: error.message }); return false; }

    // Update local state immediately
    set((s) => ({
      vendors: s.vendors.map((v) =>
        v.id === vendorId
          ? {
              ...v,
              name: updates.name,
              contactPerson: updates.contactPerson,
              phone: updates.phone,
              city: updates.city,
              address: updates.address,
              notes: updates.notes,
              isActive: updates.isActive,
            }
          : v
      ),
    }));

    return true;
  },

  // ── Delete vendor — blocked if any purchases, ledger entries, or inventory batches exist
  deleteVendor: async (vendorId) => {
    // Check vendor_purchases
    const { count: purchaseCount } = await supabase
      .from('vendor_purchases')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', vendorId);

    if (purchaseCount && purchaseCount > 0) {
      return {
        success: false,
        reason: `This vendor has ${purchaseCount} purchase record${purchaseCount > 1 ? 's' : ''}. Cannot delete a vendor with purchase history.`,
      };
    }

    // Check inventory_batches
    const { count: batchCount } = await supabase
      .from('inventory_batches')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', vendorId);

    if (batchCount && batchCount > 0) {
      return {
        success: false,
        reason: `This vendor has ${batchCount} inventory batch${batchCount > 1 ? 'es' : ''}. Cannot delete a vendor with inventory history.`,
      };
    }

    // Check vendor_ledger (beyond opening balance)
    const { count: ledgerCount } = await supabase
      .from('vendor_ledger')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)
      .neq('transaction_type', 'Opening Balance');

    if (ledgerCount && ledgerCount > 0) {
      return {
        success: false,
        reason: `This vendor has ledger transaction history. Cannot delete.`,
      };
    }

    // Safe to delete
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', vendorId);

    if (error) return { success: false, reason: error.message };

    set((s) => ({
      vendors: s.vendors.filter((v) => v.id !== vendorId),
      ledgerEntries: Object.fromEntries(
        Object.entries(s.ledgerEntries).filter(([id]) => id !== vendorId)
      ),
    }));

    return { success: true };
  },

  // ── Add ledger entry — always fetch last balance from DB, never local state
  addLedgerEntry: async (vendorId, entry) => {
    const { data: lastRow } = await supabase
      .from('vendor_ledger')
      .select('running_balance')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastBalance = lastRow?.running_balance ?? 0;
    const newBalance = lastBalance + entry.credit - entry.debit;

    const { error } = await supabase.from('vendor_ledger').insert({
      vendor_id: vendorId,
      entry_date: entry.date,
      transaction_type: entry.type,
      description: entry.description ?? null,
      debit: entry.debit ?? 0,
      credit: entry.credit ?? 0,
      running_balance: newBalance,
    });

    if (error) { set({ error: error.message }); return; }
    await get().fetchLedger(vendorId);
  },

  // ── Add purchase
  addPurchase: async (p) => {
    const outstanding = p.totalAmount - p.amountPaid;
    const paymentStatus = outstanding <= 0 ? 'Paid' : p.amountPaid > 0 ? 'Partially Paid' : 'Unpaid';

    const { data, error } = await supabase
      .from('vendor_purchases')
      .insert({
        vendor_id: p.vendorId,
        purchase_date: p.purchaseDate,
        total_amount: p.totalAmount,
        amount_paid: p.amountPaid,
        payment_terms_days: p.paymentTermsDays,
        payment_method: p.paymentMethod,
        payment_status: paymentStatus,
        notes: p.notes ?? null,
      })
      .select().single();

    if (error) { set({ error: error.message }); return null; }

    await supabase.from('vendor_purchase_items').insert(
      p.items.map(i => ({
        purchase_id: data.id,
        item_name: i.itemName,
        grade: i.grade,
        quantity_kg: i.quantityKg,
        price_per_kg: i.pricePerKg,
        subtotal: i.quantityKg * i.pricePerKg,
      }))
    );

    await get().addLedgerEntry(p.vendorId, {
      date: p.purchaseDate,
      type: 'Purchase',
      description: `Purchase: ${p.items.map(i => i.itemName).join(', ')}`,
      debit: 0,
      credit: p.totalAmount,
    });

    if (p.amountPaid > 0) {
      await get().addLedgerEntry(p.vendorId, {
        date: p.purchaseDate,
        type: 'Payment Made',
        description: `Upfront payment at purchase`,
        debit: p.amountPaid,
        credit: 0,
      });
    }

    await get().fetchPurchases();
    return data.id;
  },

  // ── Record payment against a purchase
  recordPayment: async (purchaseId, vendorId, amount, method, notes) => {
    const purchase = get().purchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    const newPaid = purchase.amountPaid + amount;
    const newOutstanding = purchase.totalAmount - newPaid;
    const paymentStatus = newOutstanding <= 0 ? 'Paid' : 'Partially Paid';

    await supabase
      .from('vendor_purchases')
      .update({ amount_paid: newPaid, payment_status: paymentStatus })
      .eq('id', purchaseId);

    await supabase.from('vendor_payments').insert({
      vendor_id: vendorId,
      purchase_id: purchaseId,
      amount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: method,
      notes: notes ?? null,
    });

    await get().addLedgerEntry(vendorId, {
      date: new Date().toISOString().split('T')[0],
      type: 'Payment Made',
      description: notes || `Payment for purchase`,
      debit: amount,
      credit: 0,
    });

    await get().fetchPurchases();
  },

  // ── Computed
  getOutstanding: (vendorId) => {
    const entries = get().ledgerEntries[vendorId] || [];
    if (entries.length === 0) return 0;
    return entries[entries.length - 1].balance;
  },

  getTotalPayables: () => {
    let total = 0;
    for (const entries of Object.values(get().ledgerEntries)) {
      if (entries.length > 0) {
        const bal = entries[entries.length - 1].balance;
        if (bal > 0) total += bal;
      }
    }
    return total;
  },

  getPayables: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().purchases
      .filter(p => p.outstanding > 0)
      .map(p => ({
        id: p.id,
        vendorId: p.vendorId,
        purchaseRef: p.purchaseRef,
        purchaseDate: p.purchaseDate,
        dueDate: p.dueDate ?? p.purchaseDate,
        paymentTermsDays: p.paymentTermsDays,
        totalAmount: p.totalAmount,
        paidAmount: p.amountPaid,
        remainingAmount: p.outstanding,
        status: (() => {
          if (p.outstanding <= 0) return 'Paid' as const;
          if ((p.dueDate ?? '') < today) return 'Overdue' as const;
          if (p.amountPaid > 0) return 'Partially Paid' as const;
          return 'Pending' as const;
        })(),
        description: p.items.map((i: any) => i.itemName).join(', ') || 'Stock Purchase',
      }));
  },

  getOverduePayables: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().getPayables().filter(p => (p.dueDate ?? '') < today);
  },

  getUpcomingPayables: (days) => {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
    return get().getPayables().filter(p =>
      (p.dueDate ?? '') >= today && (p.dueDate ?? '') <= future
    );
  },
}));