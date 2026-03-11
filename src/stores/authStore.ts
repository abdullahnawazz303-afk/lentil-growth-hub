import { create } from 'zustand';

type UserRole = 'admin' | 'customer';

interface AuthState {
  isLoggedIn: boolean;
  userRole: UserRole | null;
  userEmail: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: localStorage.getItem('qf_logged_in') === 'true',
  userRole: (localStorage.getItem('qf_user_role') as UserRole) || null,
  userEmail: localStorage.getItem('qf_user_email') || null,
  login: async (email: string, password: string) => {
    if (email && password) {
      const role: UserRole = email.toLowerCase().includes('customer') ? 'customer' : 'admin';
      localStorage.setItem('qf_logged_in', 'true');
      localStorage.setItem('qf_user_role', role);
      localStorage.setItem('qf_user_email', email);
      set({ isLoggedIn: true, userRole: role, userEmail: email });
      return true;
    }
    return false;
  },
  logout: () => {
    localStorage.removeItem('qf_logged_in');
    localStorage.removeItem('qf_user_role');
    localStorage.removeItem('qf_user_email');
    set({ isLoggedIn: false, userRole: null, userEmail: null });
  },
}));
