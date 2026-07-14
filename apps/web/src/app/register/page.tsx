'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@lib/auth'

export default function RegisterPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone_number: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await authApi.register({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        phone_number: form.phone_number || undefined,
      })
      router.push('/login?registered=1')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Registration failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%' }
  const fieldStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  }
  const labelStyle: React.CSSProperties = { fontSize: '0.875rem', fontWeight: 500 }

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
          maxWidth: '420px',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          Create an account
        </h1>

        {error && (
          <p style={{ color: 'var(--color-error)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={fieldStyle}>
            <span style={labelStyle}>Full name</span>
            <input
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              required
              minLength={2}
              placeholder="John Doe"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Email</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              placeholder="resident@example.com"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Password</span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Phone number (optional)</span>
            <input
              name="phone_number"
              type="tel"
              value={form.phone_number}
              onChange={handleChange}
              placeholder="+60123456789"
              style={inputStyle}
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
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: 'var(--color-primary)' }}>
            Sign in
          </a>
        </p>
      </div>
    </main>
  )
}
