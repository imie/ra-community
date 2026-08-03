'use client'

import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@hooks/useAuth'
import { useCommunityStore } from '@hooks/useCommunitySettings'
import apiClient from '@lib/api'
import type { UserResponse, ResidentType } from '../../types/index'
import { formatIC, stripIC, formatPhone, stripPhone } from '@utils/index'

// ── Types ──────────────────────────────────────────────────────────────────

interface AdminUser extends Omit<UserResponse, 'role' | 'resident_type'> {
  role: string
  resident_type: string | null | undefined
  is_active: boolean
  is_verified: boolean
  created_at: string
}

interface PagedUsers {
  total: number
  page: number
  page_size: number
  users: AdminUser[]
}

interface ImportResult {
  created: number
  skipped: number
  errors: string[]
}

// ── Status badge ───────────────────────────────────────────────────────────

function Badge({ active, role }: { active: boolean; role: string }) {
  const color = role === 'admin'
    ? { bg: 'rgba(124,58,237,0.1)', text: '#7c3aed', border: 'rgba(124,58,237,0.25)' }
    : active
    ? { bg: 'rgba(16,185,129,0.1)', text: '#059669', border: 'rgba(16,185,129,0.25)' }
    : { bg: 'rgba(239,68,68,0.1)', text: '#dc2626', border: 'rgba(239,68,68,0.25)' }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.1875rem 0.625rem', borderRadius: 'var(--radius-full)',
      fontSize: '0.75rem', fontWeight: 700,
      background: color.bg, color: color.text, border: `1px solid ${color.border}`,
    }}>
      {role === 'admin' ? '⚙ Admin' : active ? '● Active' : '○ Inactive'}
    </span>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export default function AdminPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<PagedUsers | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')

  // Import/Export state
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit user state
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState<Partial<AdminUser>>({})
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    if (!isAuthenticated()) { router.replace('/login'); return }
    if (user && user.role !== 'admin') { router.replace('/dashboard'); return }
    // If user not yet in store, wait — dashboard would have loaded it
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, user])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, page_size: PAGE_SIZE }
      if (search) params.search = search
      if (roleFilter) params.role = roleFilter
      if (activeFilter !== '') params.is_active = activeFilter
      const { data: res } = await apiClient.get<PagedUsers>('/admin/users', { params })
      setData(res)
    } catch {
      // 403 → not admin
      router.replace('/dashboard')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, roleFilter, activeFilter])

  const communityName = useCommunityStore((s) => s.communityName)
  const logoUrl = useCommunityStore((s) => s.logoUrl)
  const fetchCommunitySettings = useCommunityStore((s) => s.fetchCommunitySettings)

  useEffect(() => {
    if (!mounted || !user) return
    fetchCommunitySettings()
    fetchUsers()
  }, [mounted, user, fetchUsers, fetchCommunitySettings])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleToggleActive(u: AdminUser) {
    try {
      await apiClient.patch(`/admin/users/${u.id}`, { is_active: !u.is_active })
      setSuccessMessage(`Updated status for "${u.full_name}"`)
      fetchUsers()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch { /* ignore */ }
  }

  function startEdit(u: AdminUser) {
    setEditingUser(u)
    setEditError(null)
    setEditForm({
      full_name: u.full_name,
      email: u.email,
      phone_number: u.phone_number,
      ic_number: formatIC(u.ic_number),
      passport_number: u.passport_number,
      role: u.role,
      is_active: u.is_active,
      resident_type: u.resident_type,
      committee_title: u.committee_title,
    })
  }

  async function saveEdit() {
    if (!editingUser) return
    setSaving(true)
    setEditError(null)
    try {
      const payload = {
        full_name: editForm.full_name,
        email: editForm.email,
        phone_number: editForm.phone_number,
        ic_number: stripIC(editForm.ic_number),
        passport_number: editForm.passport_number,
        role: editForm.role,
        is_active: editForm.is_active,
        resident_type: editForm.resident_type || null,
        committee_title: editForm.committee_title || null,
      }
      await apiClient.patch(`/admin/users/${editingUser.id}`, payload)
      const name = editForm.full_name || editingUser.full_name
      setEditingUser(null)
      setSuccessMessage(`✓ Changes saved for "${name}" successfully.`)
      fetchUsers()
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Failed to save changes'
      setEditError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingId) return
    setDeleteLoading(true)
    try {
      await apiClient.delete(`/admin/users/${deletingId}`)
      setDeletingId(null)
      fetchUsers()
    } catch { /* ignore */ }
    setDeleteLoading(false)
  }

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    setImportError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data: res } = await apiClient.post<ImportResult>('/admin/users/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImportResult(res)
      fetchUsers()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Import failed'
      setImportError(msg)
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function downloadTemplate() {
    try {
      const { data: blob } = await apiClient.get('/admin/users/template', { responseType: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ra_users_import_template.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to download template')
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const { data: blob } = await apiClient.get('/admin/users/export', { responseType: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ra_users_export.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to export users')
    } finally {
      setExporting(false)
    }
  }

  // ── Initials ──────────────────────────────────────────────────────────────

  const initials = user?.full_name?.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() ?? 'A'
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1

  if (!mounted || (!loading && !data && user?.role !== 'admin')) return null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface)' }}>

      {/* ── Delete confirm modal ── */}
      {deletingId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.45)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div className="card animate-fade-up" style={{ maxWidth: '400px', width: '100%', padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Delete User?</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
              This action is permanent and cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={() => setDeletingId(null)} className="btn-ghost" style={{ padding: '0.625rem 1.25rem' }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleteLoading} style={{
                padding: '0.625rem 1.25rem', borderRadius: 'var(--radius)', fontWeight: 600,
                background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer',
              }}>
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editingUser && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.45)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div className="card animate-fade-up" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              Edit User: {editingUser.full_name}
            </h3>

            {editError && (
              <div className="alert alert-error animate-fade-in" style={{ marginBottom: '1.25rem' }}>
                ⚠ {editError}
              </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Full Name</label>
                <input value={editForm.full_name ?? ''} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Email</label>
                <input value={editForm.email ?? ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Phone Number</label>
                <input value={editForm.phone_number ? stripPhone(editForm.phone_number) : ''} onChange={e => setEditForm({ ...editForm, phone_number: e.target.value })} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>IC Number</label>
                <input value={editForm.ic_number ?? ''} onChange={e => setEditForm({ ...editForm, ic_number: formatIC(e.target.value) })} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Passport Number</label>
                <input value={editForm.passport_number ?? ''} onChange={e => setEditForm({ ...editForm, passport_number: e.target.value })} />
              </div>
            </div>

            <h4 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', color: 'var(--color-text)' }}>Role & Status</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>System Role</label>
                <select value={editForm.role ?? ''} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                  <option value="resident">Resident</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Account Active</label>
                <select value={String(editForm.is_active ?? true)} onChange={e => setEditForm({ ...editForm, is_active: e.target.value === 'true' })}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Occupancy Status</label>
                <select value={editForm.resident_type ?? ''} onChange={e => setEditForm({ ...editForm, resident_type: (e.target.value as ResidentType) || undefined })}>
                  <option value="">None</option>
                  <option value="owner">Owner</option>
                  <option value="tenant">Tenant</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>AJK Title</label>
                <select value={editForm.committee_title ?? ''} onChange={e => setEditForm({ ...editForm, committee_title: e.target.value })}>
                  <option value="">None</option>
                  <option value="Pengerusi">Pengerusi</option>
                  <option value="Timbalan Pengerusi 1">Timbalan Pengerusi 1</option>
                  <option value="Timbalan Pengerusi 2">Timbalan Pengerusi 2</option>
                  <option value="Timbalan Pengerusi 3">Timbalan Pengerusi 3</option>
                  <option value="Bendahari">Bendahari</option>
                  <option value="Timbalan Bendahari">Timbalan Bendahari</option>
                  <option value="Setiausaha">Setiausaha</option>
                  <option value="Timbalan Setiausaha">Timbalan Setiausaha</option>
                  <option value="AJK">AJK</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button onClick={() => setEditingUser(null)} className="btn-ghost" style={{ padding: '0.625rem 1.25rem' }}>
                Cancel
              </button>
              <button onClick={saveEdit} disabled={saving} style={{
                padding: '0.625rem 1.25rem', borderRadius: 'var(--radius)', fontWeight: 600,
                background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer',
              }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="app-nav">
        <div className="nav-brand">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--color-text)' }}>
            {logoUrl ? (
              <img src={logoUrl} alt={communityName} style={{ width: '1.5rem', height: '1.5rem', borderRadius: '4px', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '1.25rem' }}>🏡</span>
            )}
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{communityName}</span>
          </Link>
          <span className="nav-divider">│</span>
          <span className="nav-subtitle">Admin Panel</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/dashboard" style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 600, textDecoration: 'none' }}>
            Dashboard
          </Link>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--color-surface)', borderRadius: 'var(--radius-full)',
            padding: '0.375rem 0.875rem 0.375rem 0.375rem',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '50%',
              background: 'var(--gradient-hero)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700,
            }}>{initials}</div>
            <span className="nav-user-label" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Admin</span>
          </div>
        </div>
      </nav>

      {/* Admin Tab Navigation */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--color-border)', padding: '0 1rem' }}>
        <div style={{ maxWidth: '1920px', margin: '0 auto', display: 'flex', gap: '1rem', overflowX: 'auto' }}>
          <Link href="/admin" style={{ padding: '0.875rem 0.75rem', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none', borderBottom: '2px solid var(--color-primary)' }}>
            👥 User Management
          </Link>
          <Link href="/admin/announcements" style={{ padding: '0.875rem 0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', borderBottom: '2px solid transparent' }}>
            📢 Announcements
          </Link>
          <Link href="/admin/settings" style={{ padding: '0.875rem 0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', borderBottom: '2px solid transparent' }}>
            ⚙️ Community & SSL Settings
          </Link>
        </div>
      </div>

      <main className="main-content">

        {/* Header row */}
        <div className="action-bar animate-fade-up">
          <div>
            <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.25rem' }}>User Management</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
              {data ? `${data.total} total residents` : 'Loading…'}
            </p>
          </div>
          <div className="action-buttons">
            <Link href="/admin/announcements" className="btn-ghost" style={{ textDecoration: 'none' }}>
              📢 Announcements
            </Link>
            <button onClick={downloadTemplate} className="btn-ghost">
              ⬇ Template
            </button>
            <button onClick={handleExport} disabled={exporting} className="btn-ghost">
              {exporting ? '⏳ Exporting...' : '📥 Export'}
            </button>
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              borderRadius: 'var(--radius)',
              background: importing ? 'var(--color-surface)' : 'var(--color-primary)',
              color: importing ? 'var(--color-text-muted)' : '#fff',
              fontWeight: 600, cursor: importing ? 'not-allowed' : 'pointer',
              border: '1.5px solid transparent',
            }}>
              {importing ? <><span className="spinner" /> Importing…</> : '📤 Import'}
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: 'none' }} disabled={importing} />
            </label>
          </div>
        </div>

        {/* Success alert banner */}
        {successMessage && (
          <div className="alert alert-success animate-fade-in" style={{ marginBottom: '1.25rem' }}>
            {successMessage}
          </div>
        )}

        {/* Import result banner */}
        {importResult && (
          <div className="alert alert-success animate-fade-in" style={{ marginBottom: '1.25rem' }}>
            ✓ Import complete — <strong>{importResult.created} created</strong>, {importResult.skipped} skipped.
            {importResult.errors.length > 0 && (
              <details style={{ marginTop: '0.5rem', fontSize: '0.8125rem' }}>
                <summary style={{ cursor: 'pointer' }}>{importResult.errors.length} warnings</summary>
                <ul style={{ marginTop: '0.25rem', paddingLeft: '1.25rem' }}>
                  {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}
        {importError && (
          <div className="alert alert-error animate-fade-in" style={{ marginBottom: '1.25rem' }}>
            ⚠ {importError}
          </div>
        )}

        {/* Filters */}
        <div className="card filter-bar animate-fade-up">
          <input
            className="filter-input"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="🔍  Search name, email, IC, phone…"
          />
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
            <select className="filter-select" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}>
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="resident">Resident</option>
            </select>
            <select className="filter-select" value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }}>
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          {(searchInput || roleFilter || activeFilter) && (
            <button onClick={() => { setSearchInput(''); setRoleFilter(''); setActiveFilter(''); setPage(1) }}
              className="btn-ghost" style={{ padding: '0.5rem 0.875rem', fontSize: '0.8125rem', width: '100%' }}>
              ✕ Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="card animate-fade-up" style={{ overflow: 'hidden', padding: 0 }}>
          {loading ? (
            <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
              <span className="spinner spinner-dark" style={{ width: '1.5rem', height: '1.5rem' }} />
              <span style={{ color: 'var(--color-text-muted)' }}>Loading users…</span>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface)', borderBottom: '2px solid var(--color-border)' }}>
                    {['Name', 'Email', 'ID Number', 'Phone', 'Address', 'Occupancy', 'Role / Status', 'Member Since', 'Actions'].map((h) => (
                      <th key={h} style={{
                        padding: '0.875rem 1rem', textAlign: 'left',
                        fontSize: '0.75rem', fontWeight: 700,
                        color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.users.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        No users found.
                      </td>
                    </tr>
                  )}
                  {data?.users.map((u, idx) => (
                    <tr key={u.id} style={{
                      borderBottom: idx < (data.users.length - 1) ? '1px solid var(--color-border)' : 'none',
                      background: editingUser?.id === u.id ? 'rgba(37,99,235,0.03)' : 'transparent',
                      transition: 'background var(--transition)',
                    }}>
                      {/* Name */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          <div style={{
                            width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0,
                            background: 'var(--gradient-hero)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', fontWeight: 700,
                          }}>
                            {u.full_name?.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, color: 'var(--color-text)' }}>{u.full_name}</p>
                          </div>
                        </div>
                      </td>
                      {/* Email */}
                      <td style={{ padding: '0.875rem 1rem', color: 'var(--color-text-muted)' }}>
                        {u.email}
                      </td>
                      {/* ID Number */}
                      <td style={{ padding: '0.875rem 1rem', color: 'var(--color-text-muted)' }}>
                        {u.ic_number ? formatIC(u.ic_number) : u.passport_number ? u.passport_number : '—'}
                      </td>
                      {/* Phone */}
                      <td style={{ padding: '0.875rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {formatPhone(u.phone_number)}
                      </td>
                      {/* Address */}
                      <td style={{ padding: '0.875rem 1rem', color: 'var(--color-text-muted)' }}>
                        {[u.house_number, u.jalan_aman_serenia].filter(Boolean).join(', ') || '—'}
                      </td>
                      {/* Occupancy */}
                      <td style={{ padding: '0.875rem 1rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                        {u.resident_type || '—'}
                      </td>
                      {/* Role / Status */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', alignItems: 'flex-start' }}>
                          <Badge active={u.is_active} role={u.role} />
                        </div>
                      </td>
                      {/* Date */}
                      <td style={{ padding: '0.875rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                        {new Date(u.created_at).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                          <button onClick={() => startEdit(u)} title="Edit user"
                            style={{ padding: '0.3125rem 0.625rem', borderRadius: 'var(--radius)', fontSize: '0.875rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                            ✏️
                          </button>
                          <button onClick={() => handleToggleActive(u)} title={u.is_active ? 'Deactivate' : 'Activate'}
                            style={{ padding: '0.3125rem 0.625rem', borderRadius: 'var(--radius)', fontSize: '0.875rem', background: u.is_active ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${u.is_active ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`, cursor: 'pointer' }}>
                            {u.is_active ? '🚫' : '✅'}
                          </button>
                          <button onClick={() => setDeletingId(u.id)} title="Delete user"
                            style={{ padding: '0.3125rem 0.625rem', borderRadius: 'var(--radius)', fontSize: '0.875rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && totalPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.875rem 1.25rem', borderTop: '1px solid var(--color-border)',
              flexWrap: 'wrap', gap: '0.5rem',
            }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                Page {page} of {totalPages} · {data.total} users
              </span>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="btn-ghost" style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}>
                  ‹ Prev
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      style={{
                        padding: '0.375rem 0.625rem', borderRadius: 'var(--radius)',
                        fontSize: '0.875rem', fontWeight: p === page ? 700 : 400,
                        background: p === page ? 'var(--color-primary)' : 'transparent',
                        color: p === page ? '#fff' : 'var(--color-text-muted)',
                        border: p === page ? 'none' : '1px solid var(--color-border)',
                        cursor: 'pointer',
                      }}>
                      {p}
                    </button>
                  )
                })}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="btn-ghost" style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}>
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Import guide */}
        <div className="card animate-fade-up" style={{ padding: '1.25rem 1.5rem', marginTop: '1.25rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.75rem' }}>📋 Excel Import Guide</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            Download the template above, fill in your data, then upload the <code>.xlsx</code> or <code>.csv</code> file.
          </p>
          <ul style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', paddingLeft: '1.25rem', lineHeight: 1.7 }}>
            <li><strong>email</strong>, <strong>full_name</strong> are required. All other columns are optional.</li>
            <li>If <strong>password</strong> is blank, it defaults to <code>ChangeMe123!</code> — remind users to reset it.</li>
            <li><strong>date_of_birth</strong> format: <code>YYYY-MM-DD</code> (e.g. <code>1990-01-15</code>).</li>
            <li><strong>sex</strong>: <code>M</code> / <code>F</code> / <code>Other</code></li>
            <li><strong>role</strong>: <code>resident</code> (default) / <code>admin</code> / <code>guest</code></li>
            <li><strong>is_active</strong>: <code>true</code> / <code>false</code> (defaults to <code>true</code>)</li>
            <li>Rows with duplicate emails are skipped automatically.</li>
          </ul>
        </div>

      </main>
    </div>
  )
}
