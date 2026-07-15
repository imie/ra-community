'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@hooks/useAuth'
import apiClient from '@lib/api'

interface Announcement {
  id: string
  title: string
  content: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
}

interface PagedAnnouncements {
  total: number
  page: number
  page_size: number
  announcements: Announcement[]
}

function PriorityBadge({ p }: { p: string }) {
  if (p === 'normal' || p === 'low') return null
  const c = p === 'urgent' ? { bg: '#fee2e2', text: '#dc2626' } : { bg: '#ffedd5', text: '#ea580c' }
  return (
    <span style={{
      background: c.bg, color: c.text, padding: '0.125rem 0.5rem',
      borderRadius: 'var(--radius)', fontSize: '0.75rem', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.05em'
    }}>{p}</span>
  )
}

export default function AnnouncementsPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<PagedAnnouncements | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    if (!isAuthenticated()) { router.replace('/login'); return }
  }, [mounted, isAuthenticated, router])

  useEffect(() => {
    if (!mounted || !user) return
    setLoading(true)
    apiClient.get<PagedAnnouncements>('/announcements', { params: { page, page_size: 10 } })
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mounted, user, page])

  if (!mounted || (!loading && !data)) return null
  const initials = user?.full_name?.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() ?? 'R'
  const totalPages = data ? Math.ceil(data.total / 10) : 1

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface)' }}>
      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(255,255,255,0.9)', borderBottom: '1px solid var(--color-border)',
        padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--color-text-muted)' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>← Dashboard</span>
          </Link>
          <span style={{ color: 'var(--color-border)' }}>│</span>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-primary)' }}>Notice Board</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--color-surface)', borderRadius: 'var(--radius-full)',
            padding: '0.375rem 0.875rem 0.375rem 0.375rem', border: '1px solid var(--color-border)',
          }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'var(--gradient-hero)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>{initials}</div>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user?.full_name?.split(' ')[0]}</span>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div className="animate-fade-up" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.25rem' }}>Notice Board</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>Official announcements and updates from the RA committee.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {loading ? (
            <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <span className="spinner spinner-dark" />
            </div>
          ) : data?.announcements.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No announcements available at this time.
            </div>
          ) : (
            data?.announcements.map((a, i) => (
              <div key={a.id} className="card animate-fade-up" style={{ animationDelay: `${i * 50}ms`, padding: '1.5rem', borderLeft: a.priority === 'urgent' ? '4px solid #dc2626' : a.priority === 'high' ? '4px solid #ea580c' : '4px solid transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text)' }}>{a.title}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <PriorityBadge p={a.priority} />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-subtle)' }}>
                      {new Date(a.created_at).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                {/* Basic markdown parsing (paragraphs) */}
                <div style={{ color: 'var(--color-text)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
                  {a.content.split('\n').map((line, j) => (
                    <p key={j} style={{ marginBottom: line.trim() ? '0.75rem' : '0' }}>{line}</p>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {data && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost" style={{ padding: '0.5rem 1rem' }}>‹ Previous</button>
            <span style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost" style={{ padding: '0.5rem 1rem' }}>Next ›</button>
          </div>
        )}
      </main>
    </div>
  )
}
