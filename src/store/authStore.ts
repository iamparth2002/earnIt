import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authAPI, AuthUser } from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (updates: Partial<AuthUser>) => void;
  updateStats: (stats: Partial<Pick<AuthUser, "balance" | "totalEarned" | "totalSpent">>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });

        try {
          const { data, error } = await authAPI.login(email, password);

          if (error || !data) {
            set({ isLoading: false });
            return { success: false, error: error || "Login failed" };
          }

          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });

          return { success: true };
        } catch {
          set({ isLoading: false });
          return { success: false, error: "Network error. Please try again." };
        }
      },

      signup: async (name: string, email: string, password: string) => {
        set({ isLoading: true });

        try {
          const { data, error } = await authAPI.register(name, email, password);

          if (error || !data) {
            set({ isLoading: false });
            return { success: false, error: error || "Signup failed" };
          }

          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });

          return { success: true };
        } catch {
          set({ isLoading: false });
          return { success: false, error: "Network error. Please try again." };
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch {
          // Continue with local logout even if API fails
        }
        set({
          user: null,
          isAuthenticated: false,
          isInitialized: true,
        });
      },

      checkAuth: async () => {
        // Don't check if already initialized and authenticated
        const state = get();
        if (state.isInitialized && state.isAuthenticated && state.user) {
          return;
        }

        set({ isLoading: true });

        try {
          const { data, error } = await authAPI.me();

          if (error || !data) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
            });
            return;
          }

          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });
        } catch {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      updateProfile: (updates: Partial<AuthUser>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      },

      updateStats: (stats) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: {
              ...currentUser,
              ...stats,
            },
          });
        }
      },
    }),
    {
      name: "earnit-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isInitialized: state.isInitialized,
      }),
    }
  )
);
