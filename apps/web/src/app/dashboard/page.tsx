'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { userApi } from '@lib/auth'
import { useAuthStore } from '@hooks/useAuth'
import type { UserResponse } from '@types/index'
import { formatDate } from '@utils/index'

export default function DashboardPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // isAuthenticated is a stable selector — safe to call directly
    if (!isAuthenticated()) {
      router.replace('/login')
      return
    }
    userApi
      .getMe()
      .then((me: UserResponse) => setUser(me))
      .catch(() => {
        logout()
        router.replace('/login')
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount — router/auth are stable

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        Loading…
      </div>
    )
  }

  function handleLogout() {
    logout()
    router.push('/login')
  }

  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>My Profile</h1>
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)',
          }}
        >
          Sign out
        </button>
      </header>

      {user && (
        <div
          style={{
            background: 'var(--color-background)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            padding: '1.5rem',
            display: 'grid',
            gap: '1rem',
          }}
        >
          <ProfileRow label="Full name" value={user.full_name} />
          <ProfileRow label="Email" value={user.email} />
          <ProfileRow label="Role" value={user.role} />
          <ProfileRow label="Phone" value={user.phone_number} />
          <ProfileRow label="IC Number" value={user.ic_number} />
          <ProfileRow label="Date of Birth" value={formatDate(user.date_of_birth)} />
          <ProfileRow label="Sex" value={user.sex} />
          <ProfileRow label="Race" value={user.race} />
          <ProfileRow label="Marital Status" value={user.marital_status} />
          <ProfileRow label="Taman" value={user.taman_name} />
          <ProfileRow label="House No." value={user.house_number} />
          <ProfileRow label="Street" value={user.jalan_aman_serenia} />
          <ProfileRow label="Job Title" value={user.job_title} />
          <ProfileRow label="Employer" value={user.employer_name} />
          <ProfileRow label="Member since" value={formatDate(user.created_at)} />
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        <a href="/profile/edit" style={{ fontSize: '0.875rem', color: 'var(--color-primary)' }}>
          Edit profile →
        </a>
      </div>
    </main>
  )
}

function ProfileRow({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '160px 1fr',
        gap: '0.5rem',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: '0.75rem',
      }}
    >
      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
        {label}
      </span>
      <span style={{ fontSize: '0.875rem' }}>{value ?? '—'}</span>
    </div>
  )
}
