'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@lib/auth'
import { useAuthStore } from '@hooks/useAuth'

export default function LoginPage() {
  const router = useRouter()
  const { setTokens } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const tokens = await authApi.login({ email, password })
      setTokens(tokens.access_token, tokens.refresh_token)
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Login failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-surface)',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: 'var(--color-background)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          padding: '2rem',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <h1
          style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}
        >
          Sign in to RA Community
        </h1>

        {error && (
          <p
            style={{
              color: 'var(--color-error)',
              marginBottom: '1rem',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="resident@example.com"
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              fontWeight: 600,
              marginTop: '0.5rem',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Don&apos;t have an account?{' '}
          <a href="/register" style={{ color: 'var(--color-primary)' }}>
            Register
          </a>
        </p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
          <a href="/forgot-password" style={{ color: 'var(--color-text-muted)' }}>
            Forgot password?
          </a>
        </p>
      </div>
    </main>
  )
}
