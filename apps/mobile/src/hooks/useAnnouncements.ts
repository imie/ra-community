/**
 * Hook for fetching paginated announcements with pull-to-refresh and load more.
 */
import { useState, useCallback, useEffect } from 'react'
import { announcementsApi } from '../lib/auth'
import type { AnnouncementResponse } from '../types'

const PAGE_SIZE = 20

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementResponse[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasMore = announcements.length < total

  const fetchPage = useCallback(async (pageNum: number, replace = false) => {
    try {
      const data = await announcementsApi.list(pageNum, PAGE_SIZE)
      setTotal(data.total)
      setAnnouncements((prev) =>
        replace ? data.announcements : [...prev, ...data.announcements]
      )
      setPage(pageNum)
      setError(null)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load announcements'
      setError(message)
    }
  }, [])

  // Initial load
  useEffect(() => {
    setLoading(true)
    fetchPage(1, true).finally(() => setLoading(false))
  }, [fetchPage])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await fetchPage(1, true)
    setRefreshing(false)
  }, [fetchPage])

  const loadMore = useCallback(async () => {
    if (loading || refreshing || !hasMore) return
    setLoading(true)
    await fetchPage(page + 1, false)
    setLoading(false)
  }, [loading, refreshing, hasMore, page, fetchPage])

  return {
    announcements,
    loading,
    refreshing,
    error,
    hasMore,
    refresh,
    loadMore,
  }
}
