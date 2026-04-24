import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { Customer, LedgerEntry } from '@/types';

const PROVISION_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/provision-customer`;

async function provisionCustomerPortal(params: {
  email: string; name: string; customer_id: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return { ok: false, error: 'Not authenticated' };
    const res = await fetch(PROVISION_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

interface CustomerState {
  customers: Customer[];
  ledgerEntries: Record<string, LedgerEntry[]>;
  loading: boolean;
  error: string | null;
  fetchCustomers: () => Promise<void>;
  fetchLedger: (customerId: string) => Promise<void>;
  addCustomer: (c: Omit<Customer, 'id' | 'createdAt'>) => Promise<{ id: string | null; portalCreated: boolean }>;
  editCustomer: (customerId: string, updates: {
    name: string; email: string; contactPerson: string; phone: string;
    city: string; address: string; creditLimit: number; notes: string; isActive: boolean;
  }) => Promise<boolean>;
  editCustomerSelf: (customerId: string, updates: { phone: string; city: string; address: string }) => Promise<boolean>;
  deleteCustomer: (customerId: string) => Promise<{ success: boolean; reason?: string }>;
  addLedgerEntry: (customerId: string, entry: Omit<LedgerEntry, 'id' | 'balance'>) => Promise<void>;
  getOutstanding: (customerId: string) => number;
  getTotalReceivables: () => number;
  reprovisionPortal: (customerId: string) => Promise<{ ok: boolean; error?: string }>;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  ledgerEntries: {},
  loading: false,
  error: null,

  fetchCustomers: async () => {
    set({ loading: true, error: null });
    const [{ data: customerData, error: customerError }, { data: ledgerData }] = await Promise.all([
      supabase.from('customers').select('*').order('name', { ascending: true }),
      supabase.from('customer_ledger').select('*').order('created_at', { ascending: true }),
    ]);
    if (customerError) { set({ error: customerError.message, loading: false }); return; }
    const customers: Customer[] = (customerData || []).map((row: any) => ({
      id: row.id, name: row.name, email: row.email ?? '', contactPerson: row.contact_person ?? '',
      phone: row.phone ?? '', city: row.city ?? '', address: row.address ?? '',
      openingBalance: row.opening_balance ?? 0, creditLimit: row.credit_limit ?? 0,
      notes: row.notes ?? '', isActive: row.is_active, createdAt: row.created_at,
    }));
    const ledgerEntries: Record<string, LedgerEntry[]> = {};
    for (const row of (ledgerData || [])) {
      if (!ledgerEntries[row.customer_id]) ledgerEntries[row.customer_id] = [];
      ledgerEntries[row.customer_id].push({
        id: row.id, date: row.entry_date, type: row.transaction_type,
        description: row.description ?? '', debit: row.debit ?? 0,
        credit: row.credit ?? 0, balance: row.running_balance ?? 0,
      });
    }
    set({ customers, ledgerEntries, loading: false });
  },

  fetchLedger: async (customerId) => {
    const { data, error } = await supabase.from('customer_ledger').select('*')
      .eq('customer_id', customerId).order('created_at', { ascending: true });
    if (error) { set({ error: error.message }); return; }
    const entries: LedgerEntry[] = (data || []).map((row: any) => ({
      id: row.id, date: row.entry_date, type: row.transaction_type,
      description: row.description ?? '', debit: row.debit ?? 0,
      credit: row.credit ?? 0, balance: row.running_balance ?? 0,
    }));
    set((s) => ({ ledgerEntries: { ...s.ledgerEntries, [customerId]: entries } }));
  },

  addCustomer: async (c) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.from('customers').insert({
      name: c.name, email: c.email || null, contact_person: c.contactPerson ?? null,
      phone: c.phone ?? null, city: c.city ?? null, address: c.address ?? null,
      opening_balance: c.openingBalance ?? 0, credit_limit: c.creditLimit ?? 0,
      notes: c.notes ?? null, is_active: c.isActive ?? true,
    }).select().single();
    if (error) { set({ error: error.message, loading: false }); return { id: null, portalCreated: false }; }
    if (c.openingBalance && c.openingBalance > 0) {
      await supabase.from('customer_ledger').insert({
        customer_id: data.id, entry_date: new Date().toISOString().split('T')[0],
        transaction_type: 'Opening Balance', description: 'Opening balance at time of registration',
        debit: c.openingBalance, credit: 0, running_balance: c.openingBalance,
      });
    }
    await get().fetchCustomers();
    set({ loading: false });
    let portalCreated = false;
    if (c.email && c.email.trim()) {
      const result = await provisionCustomerPortal({ email: c.email.trim().toLowerCase(), name: c.name, customer_id: data.id });
      portalCreated = result.ok;
    }
    return { id: data.id, portalCreated };
  },

  reprovisionPortal: async (customerId) => {
    const customer = get().customers.find((c) => c.id === customerId);
    if (!customer?.email) return { ok: false, error: 'No email on file. Edit the customer to add an email first.' };
    return provisionCustomerPortal({ email: customer.email.trim().toLowerCase(), name: customer.name, customer_id: customerId });
  },

  editCustomer: async (customerId, updates) => {
    const { error } = await supabase.from('customers').update({
      name: updates.name, email: updates.email || null, contact_person: updates.contactPerson || null,
      phone: updates.phone || null, city: updates.city || null, address: updates.address || null,
      credit_limit: updates.creditLimit ?? 0, notes: updates.notes || null, is_active: updates.isActive,
    }).eq('id', customerId);
    if (error) { set({ error: error.message }); return false; }
    set((s) => ({
      customers: s.customers.map((c) => c.id === customerId
        ? { ...c, name: updates.name, email: updates.email, contactPerson: updates.contactPerson,
            phone: updates.phone, city: updates.city, address: updates.address,
            creditLimit: updates.creditLimit, notes: updates.notes, isActive: updates.isActive } : c),
    }));
    return true;
  },

  editCustomerSelf: async (customerId, updates) => {
    const { error } = await supabase.from('customers').update({
      phone: updates.phone || null, city: updates.city || null, address: updates.address || null,
    }).eq('id', customerId);
    if (error) { set({ error: error.message }); return false; }
    set((s) => ({
      customers: s.customers.map((c) => c.id === customerId
        ? { ...c, phone: updates.phone, city: updates.city, address: updates.address } : c),
    }));
    return true;
  },

  deleteCustomer: async (customerId) => {
    const { count: salesCount } = await supabase.from('sales')
      .select('id', { count: 'exact', head: true }).eq('customer_id', customerId);
    if (salesCount && salesCount > 0)
      return { success: false, reason: `This customer has ${salesCount} sale record(s). Cannot delete with transaction history.` };
    const { count: ledgerCount } = await supabase.from('customer_ledger')
      .select('id', { count: 'exact', head: true }).eq('customer_id', customerId).neq('transaction_type', 'Opening Balance');
    if (ledgerCount && ledgerCount > 0)
      return { success: false, reason: 'This customer has ledger transaction history. Cannot delete.' };
    const { count: ordersCount } = await supabase.from('online_orders')
      .select('id', { count: 'exact', head: true }).eq('customer_id', customerId);
    if (ordersCount && ordersCount > 0)
      return { success: false, reason: `This customer has ${ordersCount} online order(s). Cannot delete.` };
    await supabase.from('users').delete().eq('customer_id', customerId);
    await supabase.from('customer_requests').delete().eq('customer_id', customerId);
    const { error } = await supabase.from('customers').delete().eq('id', customerId);
    if (error) return { success: false, reason: error.message };
    set((s) => ({
      customers: s.customers.filter((c) => c.id !== customerId),
      ledgerEntries: Object.fromEntries(Object.entries(s.ledgerEntries).filter(([id]) => id !== customerId)),
    }));
    return { success: true };
  },

  addLedgerEntry: async (customerId, entry) => {
    const { data: lastRow } = await supabase.from('customer_ledger').select('running_balance')
      .eq('customer_id', customerId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    const lastBalance = lastRow?.running_balance ?? 0;
    const newBalance  = lastBalance + entry.debit - entry.credit;
    const { error } = await supabase.from('customer_ledger').insert({
      customer_id: customerId, entry_date: entry.date, transaction_type: entry.type,
      description: entry.description ?? null, debit: entry.debit ?? 0,
      credit: entry.credit ?? 0, running_balance: newBalance,
    });
    if (error) { set({ error: error.message }); return; }
    await get().fetchLedger(customerId);
  },

  getOutstanding: (customerId) => {
    const entries = get().ledgerEntries[customerId] || [];
    if (entries.length === 0) return 0;
    return Math.max(0, entries[entries.length - 1].balance);
  },

  getTotalReceivables: () => {
    let total = 0;
    for (const entries of Object.values(get().ledgerEntries)) {
      if (entries.length > 0) { const bal = entries[entries.length - 1].balance; if (bal > 0) total += bal; }
    }
    return total;
  },
}));