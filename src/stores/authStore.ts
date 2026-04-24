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
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  loginWithGoogle: () => Promise<void>;
  finalizeGoogleLogin: () => Promise<{ ok: boolean; blocked: boolean; message: string }>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

// Helper: fetch role and customer_id from public.users table
async function fetchUserProfile(userId: string): Promise<{ role: UserRole; customerId: string | null }> {
  const { data, error } = await supabase
    .from('users')
    .select('role, customer_id')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return { role: 'viewer', customerId: null };
  }

  return {
    role: (data.role as UserRole) ?? 'viewer',
    customerId: data.customer_id ?? null,
  };
}

// Helper: Attempt to auto-link an auth account to a customer record if disconnected
async function attemptAutoLink(userId: string, email: string | null, currentRole: UserRole, currentCustomerId: string | null): Promise<{ role: UserRole; customerId: string | null }> {
  if (currentCustomerId || !email) {
    return { role: currentRole, customerId: currentCustomerId };
  }

  const { data: customerMatch } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email)
    .eq('is_active', true)
    .maybeSingle();

  if (customerMatch) {
    const newRole = currentRole === 'viewer' ? 'customer' : currentRole;
    await supabase.from('users').upsert({
      id: userId,
      customer_id: customerMatch.id,
      role: newRole,
      account_type: newRole,
    });
    return { role: newRole, customerId: customerMatch.id };
  }

  return { role: currentRole, customerId: currentCustomerId };
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  userRole: null,
  userEmail: null,
  userId: null,
  customerId: null,
  loading: false,

  loginWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  },

  finalizeGoogleLogin: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      return { ok: false, blocked: false, message: 'No session found. Please try again.' };
    }

    const user = data.session.user;
    let { role, customerId } = await fetchUserProfile(user.id);

    // Attempt to auto-link if the user was deleted and re-added
    ({ role, customerId } = await attemptAutoLink(user.id, user.email ?? null, role, customerId));

    // Block anyone who is completely unregistered (viewer)
    if (role === 'viewer') {
      await supabase.auth.signOut();
      return {
        ok: false,
        blocked: true,
        message: 'Your Google account is not registered. Please contact the factory.',
      };
    }

    // Block if customer profile was deleted
    if (role === 'customer' && !customerId) {
      await supabase.auth.signOut();
      return {
        ok: false,
        blocked: true,
        message: 'Your customer profile is no longer active or was deleted.',
      };
    }

    set({
      isLoggedIn: true,
      userRole: role,
      userEmail: user.email ?? null,
      userId: user.id,
      customerId,
      loading: false,
    });

    return { ok: true, blocked: false, message: '' };
  },

  login: async (email: string, password: string) => {
    set({ loading: true });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      set({ loading: false });
      return { ok: false, message: error?.message || "Incorrect email or password." };
    }

    // Read role from public.users table — reliable for all account types
    let { role, customerId } = await fetchUserProfile(data.user.id);

    // Attempt to auto-link if the user was deleted and re-added
    ({ role, customerId } = await attemptAutoLink(data.user.id, data.user.email ?? null, role, customerId));

    if (role === 'customer' && !customerId) {
      await supabase.auth.signOut();
      set({ loading: false });
      return { ok: false, message: "Your customer profile is no longer active or was deleted." };
    }

    set({
      isLoggedIn: true,
      userRole: role,
      userEmail: data.user.email ?? null,
      userId: data.user.id,
      customerId,
      loading: false,
    });

    return { ok: true };
  },

  logout: async () => {
    sessionStorage.removeItem("admin_notif_panel_closed"); // Reset notification modal state
    localStorage.removeItem("qais-cart"); // Clear persisted cart on logout
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
    let { role, customerId } = await fetchUserProfile(user.id);

    // Attempt to auto-link if the user was deleted and re-added
    ({ role, customerId } = await attemptAutoLink(user.id, user.email ?? null, role, customerId));

    // If they are a viewer, they shouldn't be considered "logged in" for the app
    if (role === 'viewer') {
      set({ isLoggedIn: false, userRole: null, loading: false });
      return;
    }

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