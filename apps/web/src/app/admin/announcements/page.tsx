'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@hooks/useAuth'
import apiClient from '@lib/api'

// ── Types ──────────────────────────────────────────────────────────────────

interface Announcement {
  id: string
  title: string
  content: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  is_published: boolean
  created_at: string
  updated_at: string
}

interface PagedAnnouncements {
  total: number
  page: number
  page_size: number
  announcements: Announcement[]
}

// ── Badges ─────────────────────────────────────────────────────────────────

function PriorityBadge({ p }: { p: string }) {
  const c = p === 'urgent' ? { bg: '#fee2e2', text: '#dc2626' }
    : p === 'high' ? { bg: '#ffedd5', text: '#ea580c' }
    : p === 'normal' ? { bg: '#e0f2fe', text: '#0284c7' }
    : { bg: '#f1f5f9', text: '#64748b' }
  return (
    <span style={{
      background: c.bg, color: c.text, padding: '0.125rem 0.5rem',
      borderRadius: 'var(--radius)', fontSize: '0.75rem', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.05em'
    }}>{p}</span>
  )
}

function StatusBadge({ pub }: { pub: boolean }) {
  return pub
    ? <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.8125rem' }}>● Published</span>
    : <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.8125rem' }}>○ Draft</span>
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AdminAnnouncementsPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<PagedAnnouncements | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  // Editor Modal State
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', content: '', priority: 'normal', is_published: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Delete Confirm State
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    if (!isAuthenticated()) { router.replace('/login'); return }
    if (user && user.role !== 'admin') { router.replace('/dashboard'); return }
  }, [mounted, user, isAuthenticated, router])

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await apiClient.get<PagedAnnouncements>('/admin/announcements', { params: { page, page_size: 20 } })
      setData(res)
    } catch {
      router.replace('/dashboard')
    } finally {
      setLoading(false)
    }
  }, [page, router])

  useEffect(() => {
    if (!mounted || !user) return
    fetchAnnouncements()
  }, [mounted, user, fetchAnnouncements])

  // ── Actions ──────────────────────────────────────────────────────────────

  function openCreate() {
    setEditId(null)
    setForm({ title: '', content: '', priority: 'normal', is_published: false })
    setError(null)
    setIsEditing(true)
  }

  function openEdit(a: Announcement) {
    setEditId(a.id)
    setForm({ title: a.title, content: a.content, priority: a.priority, is_published: a.is_published })
    setError(null)
    setIsEditing(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editId) {
        await apiClient.patch(`/admin/announcements/${editId}`, form)
      } else {
        await apiClient.post('/admin/announcements', form)
      }
      setIsEditing(false)
      fetchAnnouncements()
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to save announcement')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingId) return
    setDeleteLoading(true)
    try {
      await apiClient.delete(`/admin/announcements/${deletingId}`)
      setDeletingId(null)
      fetchAnnouncements()
    } catch { /* ignore */ }
    setDeleteLoading(false)
  }

  async function togglePublish(a: Announcement) {
    try {
      await apiClient.patch(`/admin/announcements/${a.id}`, { is_published: !a.is_published })
      fetchAnnouncements()
    } catch { /* ignore */ }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (!mounted || (!loading && !data && user?.role !== 'admin')) return null
  const initials = user?.full_name?.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() ?? 'A'
  const totalPages = data ? Math.ceil(data.total / 20) : 1

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface)' }}>
      {/* ── Editor Modal ── */}
      {isEditing && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          backdropFilter: 'blur(4px)'
        }}>
          <form onSubmit={handleSave} className="card animate-fade-up" style={{ width: '100%', maxWidth: '600px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>
              {editId ? 'Edit Announcement' : 'New Announcement'}
            </h2>
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.375rem' }}>Title *</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Scheduled Water Cut" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.375rem' }}>Content * (Markdown supported)</label>
                <textarea required rows={6} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Detailed message for residents..." style={{ width: '100%', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.375rem' }}>Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={{ width: '100%' }}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', marginTop: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9375rem' }}>
                    <input type="checkbox" checked={form.is_published} onChange={e => setForm({ ...form, is_published: e.target.checked })} style={{ width: '1.25rem', height: '1.25rem' }} />
                    Publish Immediately
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setIsEditing(false)} className="btn-ghost" style={{ padding: '0.625rem 1.25rem' }}>Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '0.625rem 1.5rem' }}>
                {saving ? 'Saving...' : '💾 Save Announcement'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {deletingId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div className="card animate-fade-up" style={{ maxWidth: '400px', width: '100%', padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Delete Announcement?</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={() => setDeletingId(null)} className="btn-ghost" style={{ padding: '0.625rem 1.25rem' }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleteLoading} style={{
                padding: '0.625rem 1.25rem', borderRadius: 'var(--radius)', fontWeight: 600, background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer',
              }}>{deleteLoading ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(255,255,255,0.9)', borderBottom: '1px solid var(--color-border)',
        padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--color-text-muted)' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>← Admin Panel</span>
          </Link>
          <span style={{ color: 'var(--color-border)' }}>│</span>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-primary)' }}>Announcements</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--color-surface)', borderRadius: 'var(--radius-full)',
            padding: '0.375rem 0.875rem 0.375rem 0.375rem', border: '1px solid var(--color-border)',
          }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'var(--gradient-hero)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>{initials}</div>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Admin</span>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.25rem' }}>Announcements</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>Broadcast news and alerts to residents.</p>
          </div>
          <button onClick={openCreate} className="btn-primary" style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem', gap: '0.5rem' }}>
            <span>➕</span> New Announcement
          </button>
        </div>

        <div className="card animate-fade-up" style={{ overflow: 'hidden', padding: 0 }}>
          {loading ? (
            <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
              <span className="spinner spinner-dark" style={{ width: '1.5rem', height: '1.5rem' }} />
              <span style={{ color: 'var(--color-text-muted)' }}>Loading...</span>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface)', borderBottom: '2px solid var(--color-border)' }}>
                  {['Title', 'Priority', 'Status', 'Date', 'Actions'].map((h) => (
                    <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.announcements.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No announcements created yet.</td></tr>
                )}
                {data?.announcements.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: i < data.announcements.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <p style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.25rem' }}>{a.title}</p>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.content}</p>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}><PriorityBadge p={a.priority} /></td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <button onClick={() => togglePublish(a)} title={a.is_published ? "Click to unpublish" : "Click to publish"} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <StatusBadge pub={a.is_published} />
                      </button>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                      {new Date(a.created_at).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => openEdit(a)} style={{ padding: '0.3125rem 0.625rem', borderRadius: 'var(--radius)', fontSize: '0.875rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>✏️</button>
                        <button onClick={() => setDeletingId(a.id)} style={{ padding: '0.3125rem 0.625rem', borderRadius: 'var(--radius)', fontSize: '0.875rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {data && totalPages > 1 && (
            <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Page {page} of {totalPages}</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>‹</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>›</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
