'use client'

import { useState, useEffect, type FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@lib/auth'
import { useAuthStore } from '@hooks/useAuth'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setTokens } = useAuthStore()

  const registered = searchParams.get('registered') === '1'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(
    registered ? 'Account created! Please sign in.' : null
  )
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  // On mount: check for an existing session and redirect if already logged in
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ra-auth')
      const token = raw ? (JSON.parse(raw) as { state?: { access_token?: string } })?.state?.access_token : null
      if (token) {
        router.replace('/dashboard')
        return
      }
    } catch { /* ignore */ }
    setCheckingSession(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (email || password) setSuccess(null)
  }, [email, password])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const tokens = await authApi.login({ email, password })
      setTokens(tokens.access_token, tokens.refresh_token)
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Login failed. Please check your credentials.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Show a spinner while we check for an existing session
  if (checkingSession) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1rem', background: 'var(--color-surface)',
      }}>
        <span className="spinner spinner-dark" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>Checking session…</p>
      </div>
    )
  }


  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--color-surface)',
    }}>
      {/* Left panel — branding */}
      <div style={{
        display: 'none',
        flex: '1',
        background: 'var(--gradient-hero)',
        padding: '3rem',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
        className="login-panel"
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
            <span style={{ fontSize: '2rem' }}>🏡</span>
            <span style={{ fontWeight: 700, fontSize: '1.25rem', color: '#fff' }}>RA Community</span>
          </div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: '1rem' }}>
            Welcome back to your community
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.0625rem', lineHeight: 1.7 }}>
            Sign in to access your profile, community announcements and facility bookings.
          </p>
        </div>
        {/* Decorative blobs */}
        <div style={{
          position: 'absolute', bottom: '-4rem', right: '-4rem',
          width: '22rem', height: '22rem', borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }} />
        <div style={{
          position: 'absolute', top: '30%', left: '-6rem',
          width: '18rem', height: '18rem', borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', position: 'relative', zIndex: 1 }}>
          © {new Date().getFullYear()} RA Community Management
        </p>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }} className="animate-fade-up">
          {/* Mobile logo */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '3.5rem', height: '3.5rem',
              background: 'var(--gradient-hero)',
              borderRadius: 'var(--radius-lg)',
              fontSize: '1.625rem',
              marginBottom: '1.25rem',
              boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
            }}>
              🏡
            </div>
            <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.375rem' }}>
              Sign in
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
              Welcome back to RA Community
            </p>
          </div>

          {/* Alerts */}
          {success && (
            <div className="alert alert-success animate-fade-in" style={{ marginBottom: '1.25rem' }}>
              <span>✓</span> {success}
            </div>
          )}
          {error && (
            <div className="alert alert-error animate-fade-in" style={{ marginBottom: '1.25rem' }}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* Form card */}
          <div className="card" style={{ padding: '2rem' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.375rem' }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="resident@example.com"
                  autoFocus
                />
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.375rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
                    Password
                  </label>
                  <Link href="/forgot-password" style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    style={{ paddingRight: '3rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', padding: '0.25rem', color: 'var(--color-text-muted)',
                      fontSize: '1rem', border: 'none',
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', padding: '0.8125rem', fontSize: '1rem', marginTop: '0.25rem' }}
              >
                {loading ? (
                  <><span className="spinner" /> Signing in…</>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
              Create one free
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .login-panel { display: flex !important; }
        }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
