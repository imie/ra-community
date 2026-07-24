/**
 * Hook for reading and updating the current user's profile.
 */
import { useState } from 'react'
import { userApi } from '../lib/auth'
import { useAuthStore } from '../store/authStore'
import type { UserProfileUpdate } from '../types'

export function useProfile() {
  const { user, setUser } = useAuthStore()
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const update = async (data: UserProfileUpdate) => {
    setUpdating(true)
    setError(null)
    setSuccess(false)
    try {
      const updated = await userApi.updateMe(data)
      setUser(updated)
      setSuccess(true)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to update profile'
      setError(message)
    } finally {
      setUpdating(false)
    }
  }

  return { user, updating, error, success, update }
}
