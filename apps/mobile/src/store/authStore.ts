/**
 * Zustand auth store with expo-secure-store persistence.
 *
 * Stores: user, access_token, refresh_token
 * Actions: login, logout, setUser
 */
import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { authApi, userApi } from '../lib/auth'
import { STORAGE_KEYS } from '../constants'
import type { UserResponse, LoginRequest } from '../types'

interface AuthState {
  user: UserResponse | null
  access_token: string | null
  refresh_token: string | null
  isLoading: boolean
  isInitialized: boolean

  // Actions
  initialize: () => Promise<void>
  login: (data: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  deleteAccount: () => Promise<void>
  setUser: (user: UserResponse) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  access_token: null,
  refresh_token: null,
  isLoading: false,
  isInitialized: false,

  /**
   * Called once on app startup — restores persisted session from SecureStore.
   */
  initialize: async () => {
    try {
      const [access_token, refresh_token, userJson] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
        SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
        SecureStore.getItemAsync(STORAGE_KEYS.USER),
      ])

      if (access_token && userJson) {
        const user = JSON.parse(userJson) as UserResponse
        set({ user, access_token, refresh_token, isInitialized: true })

        // Refresh user data in background
        userApi.getMe().then((freshUser) => {
          set({ user: freshUser })
          SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(freshUser))
        }).catch(() => {
          // Token expired or invalid — the 401 interceptor in api.ts handles cleanup
        })
      } else {
        set({ isInitialized: true })
      }
    } catch {
      set({ isInitialized: true })
    }
  },

  login: async (data: LoginRequest) => {
    set({ isLoading: true })
    try {
      const tokens = await authApi.login(data)
      const user = await userApi.getMe()

      await Promise.all([
        SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token),
        SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token),
        SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(user)),
      ])

      set({
        user,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        isLoading: false,
      })
    } catch (e) {
      set({ isLoading: false })
      throw e
    }
  },

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.USER),
    ])
    set({ user: null, access_token: null, refresh_token: null })
  },

  deleteAccount: async () => {
    await userApi.deleteAccount()
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.USER),
    ])
    set({ user: null, access_token: null, refresh_token: null })
  },

  setUser: (user: UserResponse) => {
    set({ user })
    SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(user)).catch(() => {})
  },
}))
