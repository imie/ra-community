'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserResponse } from '@types/index'

interface AuthState {
  user: UserResponse | null
  access_token: string | null
  refresh_token: string | null
  setTokens: (access: string, refresh: string) => void
  setUser: (user: UserResponse) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      access_token: null,
      refresh_token: null,

      setTokens: (access, refresh) =>
        set({ access_token: access, refresh_token: refresh }),

      setUser: (user) => set({ user }),

      logout: () =>
        set({ user: null, access_token: null, refresh_token: null }),

      isAuthenticated: () => !!get().access_token,
    }),
    {
      name: 'ra-auth',
      partialize: (state) => ({
        access_token: state.access_token,
        refresh_token: state.refresh_token,
        user: state.user,
      }),
    }
  )
)
