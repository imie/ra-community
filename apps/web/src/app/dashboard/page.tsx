'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { userApi } from '@lib/auth'
import { useAuthStore } from '@hooks/useAuth'
import type { UserResponse } from '@types/index'
import { formatDate } from '@utils/index'
import apiClient from '@lib/api'

export default function DashboardPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [loading, setLoading] = useState(true)
  // `mounted` ensures this runs only on the client after React hydration,
  // by which point Zustand has already synchronously read localStorage.
  const [mounted, setMounted] = useState(false)
  const [announcements, setAnnouncements] = useState<any[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!isAuthenticated()) {
      router.replace('/login')
      return
    }
    userApi.getMe()
      .then((me: UserResponse) => {
        setUser(me)
        return apiClient.get('/announcements', { params: { page: 1, page_size: 3 } })
      })
      .then((res: any) => setAnnouncements(res?.data?.announcements || []))
      .catch(() => { logout(); router.replace('/login') })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  function handleLogout() {
    logout()
    router.push('/login')
  }

  if (!mounted || loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1rem', background: 'var(--color-surface)',
      }}>
        <span className="spinner spinner-dark" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>Loading your profile…</p>
      </div>
    )
  }

  const initials = user?.full_name
    ?.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() ?? '?'

  const profileFields: { label: string; value: string | null | undefined; icon: string }[] = [
    { icon: '📧', label: 'Email', value: user?.email },
    { icon: '📞', label: 'Phone', value: user?.phone_number },
    { icon: '🪪', label: 'IC Number', value: user?.ic_number },
    { icon: '🎂', label: 'Date of Birth', value: formatDate(user?.date_of_birth) },
    { icon: '⚧', label: 'Sex', value: user?.sex },
    { icon: '🌏', label: 'Race', value: user?.race },
    { icon: '💍', label: 'Marital Status', value: user?.marital_status },
    { icon: '🏘️', label: 'Taman', value: user?.taman_name },
    { icon: '🏠', label: 'House No.', value: user?.house_number },
    { icon: '🛣️', label: 'Street', value: user?.jalan_aman_serenia },
    { icon: '💼', label: 'Job Title', value: user?.job_title },
    { icon: '🏢', label: 'Employer', value: user?.employer_name },
    { icon: '📅', label: 'Member Since', value: formatDate(user?.created_at) },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface)' }}>
      {/* ── Top nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '4rem',
      }}>
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: '0.625rem',
          textDecoration: 'none', color: 'var(--color-text)',
        }}>
          <span style={{ fontSize: '1.375rem' }}>🏡</span>
          <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em' }}>RA Community</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user?.role === 'admin' && (
            <Link href="/admin" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.4375rem 0.875rem', borderRadius: 'var(--radius)',
              fontSize: '0.8125rem', fontWeight: 600,
              color: '#7c3aed', background: 'rgba(124,58,237,0.08)',
              border: '1px solid rgba(124,58,237,0.2)', textDecoration: 'none',
            }}>
              ⚙ Admin Panel
            </Link>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
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
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
              {user?.full_name?.split(' ')[0] ?? 'Resident'}
            </span>
          </div>
          <button onClick={handleLogout} className="btn-ghost"
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            Sign out
          </button>
        </div>
      </nav>

      {/* ── Main content ── */}
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {/* Profile hero card */}
        <div className="card animate-fade-up" style={{
          padding: '2rem', marginBottom: '1.5rem',
          background: 'var(--gradient-hero)', border: 'none',
          display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
        }}>
          <div style={{
            width: '5rem', height: '5rem', borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '3px solid rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.75rem', fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-full)',
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)',
                textTransform: 'capitalize',
              }}>
                ✦ {user?.role ?? 'Resident'}
              </div>
              {user?.resident_type && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-full)',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)',
                  textTransform: 'capitalize',
                }}>
                  {user.resident_type}
                </div>
              )}
              {user?.committee_title && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  background: 'rgba(56, 189, 248, 0.2)', borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.75rem', fontWeight: 700, color: '#bae6fd',
                }}>
                  ⭐ {user.committee_title}
                </div>
              )}
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
              {user?.full_name ?? '—'}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem' }}>{user?.email}</p>
          </div>
          <Link href="/profile/edit" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1.25rem',
            background: 'rgba(255,255,255,0.15)',
            border: '1.5px solid rgba(255,255,255,0.3)',
            borderRadius: 'var(--radius)',
            color: '#fff', fontWeight: 600, fontSize: '0.875rem',
            backdropFilter: 'blur(8px)', textDecoration: 'none',
            transition: 'all var(--transition)',
          }}>
            ✏️ Edit Profile
          </Link>
        </div>

        {/* Latest Announcements */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-text)' }}>Latest Announcements</h2>
            <Link href="/announcements" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}>
              View All →
            </Link>
          </div>
          {announcements.length === 0 ? (
            <div className="card animate-fade-up" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No recent announcements.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
              {announcements.map((a, i) => (
                <div key={a.id} className="card animate-fade-up" style={{ animationDelay: `${i * 50}ms`, padding: '1.25rem', borderLeft: a.priority === 'urgent' ? '4px solid #dc2626' : a.priority === 'high' ? '4px solid #ea580c' : '4px solid transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.title}</h3>
                  </div>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '0.75rem' }}>
                    {a.content}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
                      {new Date(a.created_at).toLocaleDateString('en-MY', { day: '2-digit', month: 'short' })}
                    </span>
                    {a.priority === 'urgent' && <span style={{ background: '#fee2e2', color: '#dc2626', padding: '0.125rem 0.375rem', borderRadius: 'var(--radius)', fontSize: '0.7rem', fontWeight: 700 }}>URGENT</span>}
                    {a.priority === 'high' && <span style={{ background: '#ffedd5', color: '#ea580c', padding: '0.125rem 0.375rem', borderRadius: 'var(--radius)', fontSize: '0.7rem', fontWeight: 700 }}>HIGH</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile details */}
        <div className="card animate-fade-up" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: '1.5rem', color: 'var(--color-text)' }}>
            Profile Information
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          }}>
            {profileFields.map((field, i) => (
              <div key={field.label} style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                padding: '0.875rem 0.5rem',
                borderBottom: i < profileFields.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}>
                <span style={{ fontSize: '1.0625rem', marginTop: '0.125rem', flexShrink: 0 }}>{field.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.1875rem' }}>
                    {field.label}
                  </p>
                  <p style={{
                    fontSize: '0.9375rem',
                    color: field.value ? 'var(--color-text)' : 'var(--color-text-subtle)',
                    fontStyle: field.value ? 'normal' : 'italic',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {field.value ?? 'Not provided'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
