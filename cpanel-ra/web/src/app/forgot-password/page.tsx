'use client'

import { useState, type FormEvent } from 'react'
import { authApi } from '@lib/auth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await authApi.forgotPassword({ email })
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Forgot password
        </h1>

        {submitted ? (
          <p style={{ color: 'var(--color-success)' }}>
            If this email is registered, a password reset link has been sent. Check your inbox.
          </p>
        ) : (
          <>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Enter your email address and we&apos;ll send you a reset link.
            </p>

            {error && (
              <p style={{ color: 'var(--color-error)', marginBottom: '1rem', fontSize: '0.875rem' }}>
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
                  placeholder="resident@example.com"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                style={{ background: 'var(--color-primary)', color: '#fff', fontWeight: 600 }}
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}

        <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
          <a href="/login" style={{ color: 'var(--color-text-muted)' }}>
            ← Back to login
          </a>
        </p>
      </div>
    </main>
  )
}
