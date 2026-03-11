import { create } from 'zustand';

interface AuthState {
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: localStorage.getItem('ffcms_logged_in') === 'true',
  login: async (email: string, password: string) => {
    // For now, simple local auth. Replace with Supabase later.
    if (email && password) {
      localStorage.setItem('ffcms_logged_in', 'true');
      set({ isLoggedIn: true });
      return true;
    }
    return false;
  },
  logout: () => {
    localStorage.removeItem('ffcms_logged_in');
    set({ isLoggedIn: false });
  },
}));
