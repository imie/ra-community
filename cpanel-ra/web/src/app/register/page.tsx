'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@lib/auth'

const steps = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Personal' },
  { id: 3, label: 'Done' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone_number: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
  }

  function handleNext(e: FormEvent) {
    e.preventDefault()
    if (step === 1) {
      if (form.password.length < 8) {
        setError('Password must be at least 8 characters.')
        return
      }
      if (form.password !== form.confirm_password) {
        setError('Passwords do not match.')
        return
      }
    }
    setError(null)
    setStep((s) => s + 1)
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
      setStep(3)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Registration failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Step indicator ──
  const StepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: '2rem' }}>
      {steps.map((s, i) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8125rem', fontWeight: 700,
              background: step >= s.id ? 'var(--color-primary)' : 'var(--color-border)',
              color: step >= s.id ? '#fff' : 'var(--color-text-muted)',
              transition: 'all var(--transition)',
              boxShadow: step === s.id ? '0 0 0 4px var(--color-primary-glow)' : 'none',
            }}>
              {step > s.id ? '✓' : s.id}
            </div>
            <span style={{
              fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.04em',
              color: step >= s.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
              textTransform: 'uppercase',
            }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              width: '5rem', height: '2px',
              background: step > s.id ? 'var(--color-primary)' : 'var(--color-border)',
              marginBottom: '1.375rem',
              transition: 'background var(--transition-slow)',
            }} />
          )}
        </div>
      ))}
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--color-surface)', padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: '460px' }} className="animate-fade-up">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '3.5rem', height: '3.5rem',
            background: 'var(--gradient-hero)',
            borderRadius: 'var(--radius-lg)', fontSize: '1.625rem',
            marginBottom: '1.25rem', boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
          }}>🏡</div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.375rem' }}>Create your account</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>Join the RA Community platform</p>
        </div>

        <StepIndicator />

        {error && (
          <div className="alert alert-error animate-fade-in" style={{ marginBottom: '1.25rem' }}>
            <span>⚠</span> {error}
          </div>
        )}

        <div className="card" style={{ padding: '2rem' }}>

          {/* ── Step 1: Account credentials ── */}
          {step === 1 && (
            <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={labelStyle}>Email address</label>
                <input name="email" type="email" value={form.email} onChange={handleChange}
                  required autoComplete="email" placeholder="resident@example.com" autoFocus />
              </div>

              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input name="password" type={showPassword ? 'text' : 'password'} value={form.password}
                    onChange={handleChange} required minLength={8} autoComplete="new-password"
                    placeholder="Min. 8 characters" style={{ paddingRight: '3rem' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', padding: '0.25rem', color: 'var(--color-text-muted)', fontSize: '1rem', border: 'none' }}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', marginTop: '0.375rem' }}>
                  Use at least 8 characters with a mix of letters and numbers.
                </p>
              </div>

              <div>
                <label style={labelStyle}>Confirm password</label>
                <input name="confirm_password" type="password" value={form.confirm_password}
                  onChange={handleChange} required placeholder="Re-enter your password" autoComplete="new-password" />
              </div>

              <button type="submit" className="btn-primary"
                style={{ width: '100%', padding: '0.8125rem', fontSize: '1rem', marginTop: '0.25rem' }}>
                Continue →
              </button>
            </form>
          )}

          {/* ── Step 2: Personal info ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={labelStyle}>Full name</label>
                <input name="full_name" value={form.full_name} onChange={handleChange}
                  required minLength={2} placeholder="e.g. Ahmad bin Ibrahim" autoFocus />
              </div>

              <div>
                <label style={labelStyle}>
                  Phone number <span style={{ color: 'var(--color-text-subtle)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input name="phone_number" type="tel" value={form.phone_number}
                  onChange={handleChange} placeholder="+60 12-345 6789" />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button type="button" className="btn-ghost" onClick={() => setStep(1)}
                  style={{ flex: '1', padding: '0.8125rem' }}>
                  ← Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary"
                  style={{ flex: '2', padding: '0.8125rem', fontSize: '1rem' }}>
                  {loading ? <><span className="spinner" /> Creating…</> : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 3: Success ── */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }} className="animate-fade-up">
              <div style={{
                width: '4rem', height: '4rem', borderRadius: '50%',
                background: 'var(--color-success-bg)',
                border: '2px solid var(--color-success-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.875rem', margin: '0 auto 1.25rem',
              }}>✓</div>
              <h2 style={{ fontWeight: 800, fontSize: '1.375rem', marginBottom: '0.75rem', color: 'var(--color-text)' }}>
                You&apos;re all set!
              </h2>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.9375rem', lineHeight: 1.6 }}>
                Your account has been created. Sign in to get started with RA Community.
              </p>
              <button
                className="btn-primary"
                onClick={() => router.push('/login?registered=1')}
                style={{ width: '100%', padding: '0.8125rem', fontSize: '1rem' }}
              >
                Go to Sign In →
              </button>
            </div>
          )}
        </div>

        {step < 3 && (
          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Sign in</Link>
          </p>
        )}
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: 'var(--color-text)',
  marginBottom: '0.375rem',
}
