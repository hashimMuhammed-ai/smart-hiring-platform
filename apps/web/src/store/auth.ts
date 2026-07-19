'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token: string, user: AuthUser): void => {
        set({ token, user });
      },
      logout: (): void => {
        set({ token: null, user: null });
      },
    }),
    {
      name: 'smart-hiring-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
