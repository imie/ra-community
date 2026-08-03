'use client'

import { create } from 'zustand'
import apiClient from '@lib/api'

interface CommunitySettingsState {
  communityName: string
  logoUrl: string | null
  sslMode: string
  loaded: boolean
  fetchCommunitySettings: () => Promise<void>
}

export const useCommunityStore = create<CommunitySettingsState>((set) => ({
  communityName: 'RA Community',
  logoUrl: null,
  sslMode: 'disabled',
  loaded: false,

  fetchCommunitySettings: async () => {
    try {
      const { data } = await apiClient.get('/community/settings')
      if (data && data.community_name) {
        set({
          communityName: data.community_name,
          logoUrl: data.logo_url ?? null,
          sslMode: data.ssl_mode ?? 'disabled',
          loaded: true,
        })
      }
    } catch {
      set({ loaded: true })
    }
  },
}))
