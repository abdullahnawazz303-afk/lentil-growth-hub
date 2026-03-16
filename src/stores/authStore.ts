import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'manager' | 'cashier' | 'viewer' | 'customer';

interface AuthState {
  isLoggedIn: boolean;
  userRole: UserRole | null;
  userEmail: string | null;
  userId: string | null;
  customerId: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

// Helper: fetch role and customer_id from public.users table
async function fetchUserProfile(userId: string): Promise<{ role: UserRole; customerId: string | null }> {
  const { data, error } = await supabase
    .from('users')
    .select('role, customer_id')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return { role: 'viewer', customerId: null };
  }

  return {
    role: (data.role as UserRole) ?? 'viewer',
    customerId: data.customer_id ?? null,
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  userRole: null,
  userEmail: null,
  userId: null,
  customerId: null,
  loading: false,

  login: async (email: string, password: string) => {
    set({ loading: true });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      set({ loading: false });
      return false;
    }

    // Read role from public.users table — reliable for all account types
    const { role, customerId } = await fetchUserProfile(data.user.id);

    set({
      isLoggedIn: true,
      userRole: role,
      userEmail: data.user.email ?? null,
      userId: data.user.id,
      customerId,
      loading: false,
    });

    return true;
  },

  logout: async () => {
    sessionStorage.removeItem("admin_notif_panel_closed"); // Reset notification modal state
    await supabase.auth.signOut();
    set({
      isLoggedIn: false,
      userRole: null,
      userEmail: null,
      userId: null,
      customerId: null,
      loading: false,
    });
  },

  restoreSession: async () => {
    set({ loading: true });

    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      set({ loading: false });
      return;
    }

    const user = data.session.user;

    // Read role from public.users table — same as login
    const { role, customerId } = await fetchUserProfile(user.id);

    set({
      isLoggedIn: true,
      userRole: role,
      userEmail: user.email ?? null,
      userId: user.id,
      customerId,
      loading: false,
    });
  },
}));