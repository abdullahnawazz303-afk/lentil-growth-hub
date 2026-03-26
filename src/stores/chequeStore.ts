import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { Cheque, ChequeStatus } from '@/types';

interface ChequeState {
  cheques: Cheque[];
  loading: boolean;
  error: string | null;

  fetchCheques: () => Promise<void>;
  addCheque: (c: Omit<Cheque, 'id'>) => Promise<string | null>;
  updateStatus: (id: string, status: ChequeStatus) => Promise<Cheque | null>;
  deleteCheque: (id: string) => Promise<boolean>;
  getPendingCount: () => number;
  getPendingTotal: () => number;
}

export const useChequeStore = create<ChequeState>((set, get) => ({
  cheques: [],
  loading: false,
  error: null,

  // ── Fetch all cheques
  fetchCheques: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('cheques')
      .select('*, vendors(name)')
      .order('expected_clearance_date', { ascending: true });

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    const cheques: Cheque[] = (data || []).map((row: any) => ({
      id: row.id,
      chequeNumber: row.cheque_number,
      vendorId: row.vendor_id,
      vendorName: row.vendors?.name ?? '',
      amount: row.amount,
      issueDate: row.issue_date,
      expectedClearanceDate: row.expected_clearance_date,
      bankName: row.bank_name,
      status: row.status as ChequeStatus,
      bounceDate: row.bounced_at ?? undefined,
      notes: row.notes ?? '',
    }));

    set({ cheques, loading: false });
  },

  // ── Add a new cheque
  addCheque: async (c) => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('cheques')
      .insert({
        cheque_number: c.chequeNumber,
        vendor_id: c.vendorId,
        amount: c.amount,
        issue_date: c.issueDate,
        expected_clearance_date: c.expectedClearanceDate,
        bank_name: c.bankName,
        status: c.status ?? 'Pending',
        notes: c.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      set({ error: error.message, loading: false });
      return null;
    }

    await get().fetchCheques();
    return data.id;
  },

  // ── Update cheque status (Cleared or Bounced)
  updateStatus: async (id, status) => {
    const today = new Date().toISOString().split('T')[0];

    const updateData: any = { status };

    if (status === 'Cleared') {
      updateData.cleared_at = today;
    }

    if (status === 'Bounced') {
      updateData.bounced_at = today;
    }

    const { data, error } = await supabase
      .from('cheques')
      .update(updateData)
      .eq('id', id)
      .select('*, vendors(name)')
      .single();

    if (error) {
      set({ error: error.message });
      return null;
    }

    // If bounced, add entry to vendor ledger
    if (status === 'Bounced') {
      // Get current vendor balance
      const { data: lastEntry } = await supabase
        .from('vendor_ledger')
        .select('running_balance')
        .eq('vendor_id', data.vendor_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const prevBalance = lastEntry?.running_balance ?? 0;

      await supabase.from('vendor_ledger').insert({
        vendor_id: data.vendor_id,
        entry_date: today,
        transaction_type: 'Cheque Bounced',
        description: `Cheque #${data.cheque_number} bounced`,
        debit: 0,
        credit: data.amount,
        running_balance: prevBalance + data.amount,
        reference_type: 'CHEQUE',
        reference_id: id,
      });
    }

    const updated: Cheque = {
      id: data.id,
      chequeNumber: data.cheque_number,
      vendorId: data.vendor_id,
      vendorName: data.vendors?.name ?? '',
      amount: data.amount,
      issueDate: data.issue_date,
      expectedClearanceDate: data.expected_clearance_date,
      bankName: data.bank_name,
      status: data.status as ChequeStatus,
      bounceDate: data.bounced_at ?? undefined,
      notes: data.notes ?? '',
    };

    // Update local state
    set((s) => ({
      cheques: s.cheques.map(c => c.id === id ? updated : c),
    }));

    return updated;
  },

  // ── Computed values
  getPendingCount: () =>
    get().cheques.filter(c => c.status === 'Pending').length,

  getPendingTotal: () =>
    get().cheques
      .filter(c => c.status === 'Pending')
      .reduce((s, c) => s + c.amount, 0),

  // ── Admin: Delete Cheque
  deleteCheque: async (id) => {
    const cheque = get().cheques.find(c => c.id === id);
    if (!cheque || cheque.status === 'Cleared') return false;

    set({ loading: true });
    const { error } = await supabase.from('cheques').delete().eq('id', id);
    if (error) {
      set({ loading: false });
      return false;
    }

    await get().fetchCheques();
    return true;
  },
}));