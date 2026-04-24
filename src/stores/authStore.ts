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

// ── Helper: fetch role and customer_id from public.users table
async function fetchUserProfile(userId: string): Promise<{ role: UserRole; customerId: string | null }> {
  const { data, error } = await supabase
    .from('users')
    .select('role, customer_id')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    // No profile found → unregistered user
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

  // ── Google OAuth redirect — do NOT create accounts here.
  // AuthCallback.tsx handles the post-redirect validation gate.
  loginWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  },

  // ── Called by AuthCallback after Google OAuth redirect lands.
  // Enforces: only pre-registered users (in public.users) get through.
  // For Google OAuth, we ALSO check customers.email as a secondary path.
  finalizeGoogleLogin: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      return { ok: false, blocked: false, message: 'No session found. Please try again.' };
    }

    const user = data.session.user;
    const email = user.email ?? null;

    // Step 1: Check if user has a profile in public.users
    let { role, customerId } = await fetchUserProfile(user.id);

    // Step 2: If they have no profile (viewer) but have an email,
    // check if their email matches a pre-registered customer.
    // This handles the case where admin set the email on customers table
    // but the auth account was created externally (e.g. Google for the first time).
    if (role === 'viewer' && email) {
      const { data: customerMatch } = await supabase
        .from('customers')
        .select('id, name')
        .eq('is_active', true)
        .ilike('email', email)
        .maybeSingle();

      if (customerMatch) {
        // Link this Google account to the existing customer record
        const { error: linkErr } = await supabase.rpc('link_google_user_to_customer', {
          p_auth_user_id: user.id,
          p_email:        email,
          p_name:         user.user_metadata?.full_name ?? customerMatch.name ?? 'Customer',
          p_customer_id:  customerMatch.id,
        });

        if (!linkErr) {
          role = 'customer';
          customerId = customerMatch.id;
        }
      }
    }

    // Step 3: Hard gate — if still viewer, sign them out completely
    if (role === 'viewer') {
      await supabase.auth.signOut();
      return {
        ok: false,
        blocked: true,
        message: 'Your Google account is not registered with QAIS Foods. Please contact the factory to get access.',
      };
    }

    // Step 4: Block customers whose profile was deleted
    if (role === 'customer' && !customerId) {
      await supabase.auth.signOut();
      return {
        ok: false,
        blocked: true,
        message: 'Your customer profile is no longer active. Please contact the factory.',
      };
    }

    // Step 5: Success — set store state
    set({
      isLoggedIn: true,
      userRole: role,
      userEmail: email,
      userId: user.id,
      customerId,
      loading: false,
    });

    return { ok: true, blocked: false, message: '' };
  },

  // ── Email/password login — the primary login method for all users.
  login: async (email: string, password: string) => {
    set({ loading: true });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      set({ loading: false });
      return { ok: false, message: error?.message || 'Incorrect email or password.' };
    }

    const { role, customerId } = await fetchUserProfile(data.user.id);

    // Block completely unregistered accounts
    if (role === 'viewer') {
      await supabase.auth.signOut();
      set({ loading: false });
      return {
        ok: false,
        message: 'This account is not registered in the system. Please contact QAIS Foods.',
      };
    }

    // Block customers whose profile was deleted
    if (role === 'customer' && !customerId) {
      await supabase.auth.signOut();
      set({ loading: false });
      return { ok: false, message: 'Your customer profile is no longer active or was deleted.' };
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

  // ── Logout — clears session and local state completely
  logout: async () => {
    sessionStorage.removeItem('admin_notif_panel_closed');
    localStorage.removeItem('qais-cart');
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

  // ── Restore session on app load
  restoreSession: async () => {
    set({ loading: true });

    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      set({ loading: false });
      return;
    }

    const user = data.session.user;
    const { role, customerId } = await fetchUserProfile(user.id);

    // If viewer (unregistered), kill the session entirely so they can't bypass the login gate
    if (role === 'viewer') {
      await supabase.auth.signOut();
      set({ isLoggedIn: false, userRole: null, loading: false });
      return;
    }

    // If customer but profile is gone, kill session
    if (role === 'customer' && !customerId) {
      await supabase.auth.signOut();
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