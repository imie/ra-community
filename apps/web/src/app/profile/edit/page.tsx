'use client'

import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { userApi } from '@lib/auth'
import { useAuthStore } from '@hooks/useAuth'
import type { UserProfileUpdate, UserSex, UserRace, MaritalStatus } from '@types/index'
import { formatIC, stripIC, stripPhone } from '@utils/index'

// ── Reusable field components ──────────────────────────────────────────────

const L = ({ children }: { children: React.ReactNode }) => (
  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
    {children}
  </label>
)

const Field = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>{children}</div>
)

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '1.75rem', marginBottom: '1.25rem' }}>
      <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>{icon}</span> {title}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
        {children}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

type FormState = {
  full_name: string
  phone_number: string
  ic_number: string
  passport_number: string
  date_of_birth: string
  place_of_birth: string
  sex: UserSex | ''
  race: UserRace | ''
  marital_status: MaritalStatus | ''
  num_dependents: string
  taman_name: string
  house_number: string
  jalan_aman_serenia: string
  job_title: string
  employer_name: string
  employer_address: string
  employer_phone: string
  resident_type: 'owner' | 'tenant' | ''
}

const EMPTY: FormState = {
  full_name: '', phone_number: '', ic_number: '', passport_number: '', date_of_birth: '',
  place_of_birth: '', sex: '', race: '', marital_status: '',
  num_dependents: '0', taman_name: '', house_number: '', jalan_aman_serenia: '',
  job_title: '', employer_name: '', employer_address: '', employer_phone: '',
  resident_type: '',
}

export default function EditProfilePage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    if (!isAuthenticated()) { router.replace('/login'); return }

    const fill = (u: typeof user) => {
      if (!u) return
      setForm({
        full_name: u.full_name ?? '',
        phone_number: u.phone_number ? stripPhone(u.phone_number) : '',
        ic_number: u.ic_number ?? '',
        passport_number: u.passport_number ?? '',
        date_of_birth: u.date_of_birth ?? '',
        place_of_birth: u.place_of_birth ?? '',
        sex: (u.sex as UserSex) ?? '',
        race: (u.race as UserRace) ?? '',
        marital_status: (u.marital_status as MaritalStatus) ?? '',
        num_dependents: String(u.num_dependents ?? 0),
        taman_name: u.taman_name ?? '',
        house_number: u.house_number ?? '',
        jalan_aman_serenia: u.jalan_aman_serenia ?? '',
        job_title: u.job_title ?? '',
        employer_name: u.employer_name ?? '',
        employer_address: u.employer_address ?? '',
        employer_phone: u.employer_phone ?? '',
        resident_type: (u.resident_type as 'owner' | 'tenant') ?? '',
      })
      if (u.ic_number) {
        setForm((prev) => ({ ...prev, ic_number: formatIC(u.ic_number) }))
      }
      setLoading(false)
    }

    if (user) { fill(user) }
    else {
      userApi.getMe()
        .then((me) => { setUser(me); fill(me) })
        .catch(() => { logout(); router.replace('/login') })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    let val = e.target.value
    if (e.target.name === 'ic_number') val = formatIC(val)
    setForm((prev) => ({ ...prev, [e.target.name]: val }))
    setSuccess(false)
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const payload: UserProfileUpdate = {
        full_name: form.full_name || undefined,
        phone_number: form.phone_number || undefined,
        ic_number: form.ic_number ? stripIC(form.ic_number) : undefined,
        passport_number: form.passport_number || undefined,
        date_of_birth: form.date_of_birth || undefined,
        place_of_birth: form.place_of_birth || undefined,
        sex: (form.sex as UserSex) || undefined,
        race: (form.race as UserRace) || undefined,
        marital_status: (form.marital_status as MaritalStatus) || undefined,
        num_dependents: form.num_dependents !== '' ? Number(form.num_dependents) : undefined,
        taman_name: form.taman_name || undefined,
        house_number: form.house_number || undefined,
        jalan_aman_serenia: form.jalan_aman_serenia || undefined,
        job_title: form.job_title || undefined,
        employer_name: form.employer_name || undefined,
        employer_address: form.employer_address || undefined,
        employer_phone: form.employer_phone || undefined,
        resident_type: (form.resident_type as 'owner' | 'tenant') || undefined,
      }
      const updated = await userApi.updateMe(payload)
      setUser(updated)
      setSuccess(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Update failed. Please try again.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  // ── Initials for nav avatar ─────────────────────────────────────────────
  const initials = user?.full_name
    ?.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() ?? '?'

  // ── Loading / auth gate ─────────────────────────────────────────────────
  if (!mounted || loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1rem', background: 'var(--color-surface)',
      }}>
        <span className="spinner spinner-dark" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>Loading profile…</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface)' }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '4rem',
      }}>
        <Link href="/dashboard" style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          color: 'var(--color-text-muted)', textDecoration: 'none',
          fontSize: '0.875rem', fontWeight: 600,
          transition: 'color var(--transition)',
        }}>
          ← Back to Dashboard
        </Link>
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
      </nav>

      {/* ── Form ── */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* Page header */}
        <div style={{ marginBottom: '2rem' }} className="animate-fade-up">
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.375rem' }}>
            Edit Profile
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
            Keep your community profile accurate and up to date.
          </p>
        </div>

        {/* Global alerts */}
        {success && (
          <div className="alert alert-success animate-fade-in" style={{ marginBottom: '1.5rem' }}>
            ✓ Profile updated successfully!
          </div>
        )}
        {error && (
          <div className="alert alert-error animate-fade-in" style={{ marginBottom: '1.5rem' }}>
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="animate-fade-up">

          {/* ── Personal Information ── */}
          <SectionCard title="Personal Information" icon="👤">
            <Field>
              <L>Full Name *</L>
              <input name="full_name" value={form.full_name} onChange={handleChange} required placeholder="e.g. Ahmad bin Ibrahim" />
            </Field>
            <Field>
              <L>IC Number (NRIC)</L>
              <input name="ic_number" value={form.ic_number} onChange={handleChange} placeholder="e.g. 900101-14-5678" />
            </Field>
            <Field>
              <L>Passport Number (For Foreigners)</L>
              <input name="passport_number" value={form.passport_number ?? ''} onChange={handleChange} placeholder="e.g. A1234567" />
            </Field>
            <Field>
              <L>Date of Birth</L>
              <input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} />
            </Field>
            <Field>
              <L>Place of Birth</L>
              <input name="place_of_birth" value={form.place_of_birth} onChange={handleChange} placeholder="e.g. Kuala Lumpur" />
            </Field>
            <Field>
              <L>Sex</L>
              <select name="sex" value={form.sex} onChange={handleChange}>
                <option value="">— Select —</option>
                <option value="M">Lelaki</option>
                <option value="F">Perempuan</option>
                <option value="Other">Lain-lain</option>
              </select>
            </Field>
            <Field>
              <L>Race</L>
              <select name="race" value={form.race} onChange={handleChange}>
                <option value="">— Select —</option>
                <option value="Malay">Melayu</option>
                <option value="Chinese">Cina</option>
                <option value="Indian">India</option>
                <option value="Eurasian">Eurasian</option>
                <option value="Kadazan">Kadazan</option>
                <option value="Iban">Iban</option>
                <option value="Other">Lain-lain</option>
              </select>
            </Field>
            <Field>
              <L>Marital Status</L>
              <select name="marital_status" value={form.marital_status} onChange={handleChange}>
                <option value="">— Select —</option>
                <option value="single">Bujang</option>
                <option value="married">Berkahwin</option>
                <option value="divorced">Bercerai</option>
                <option value="widowed">Balu/Duda</option>
              </select>
            </Field>
            <Field>
              <L>No. of Dependents</L>
              <input name="num_dependents" type="number" min="0" max="20" value={form.num_dependents} onChange={handleChange} />
            </Field>
          </SectionCard>

          {/* ── Contact ── */}
          <SectionCard title="Contact Details" icon="📞">
            <Field>
              <L>Email Address</L>
              <input value={user?.email ?? ''} disabled style={{ opacity: 0.55, cursor: 'not-allowed', background: 'var(--color-surface)' }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', marginTop: '0.25rem' }}>Email cannot be changed here.</p>
            </Field>
            <Field>
              <L>Phone Number</L>
              <input name="phone_number" type="tel" value={form.phone_number} onChange={handleChange} placeholder="+60 12-345 6789" />
            </Field>
          </SectionCard>

          {/* ── Address & Occupancy ── */}
          <SectionCard title="Address & Occupancy" icon="🏠">
            <Field>
              <L>Occupancy Status</L>
              <select name="resident_type" value={form.resident_type} onChange={handleChange}>
                <option value="">Select status...</option>
                <option value="owner">Owner</option>
                <option value="tenant">Tenant</option>
              </select>
            </Field>
            <Field>
              <L>Taman Name</L>
              <input name="taman_name" value={form.taman_name} onChange={handleChange} placeholder="e.g. Taman Serenia" />
            </Field>
            <Field>
              <L>House / Unit Number</L>
              <input name="house_number" value={form.house_number} onChange={handleChange} placeholder="e.g. 12A" />
            </Field>
            <Field>
              <L>Street (Jalan)</L>
              <input name="jalan_aman_serenia" value={form.jalan_aman_serenia} onChange={handleChange} placeholder="e.g. Jalan Aman 3" />
            </Field>
          </SectionCard>

          {/* ── Employment ── */}
          <SectionCard title="Employment" icon="💼">
            <Field>
              <L>Job Title</L>
              <input name="job_title" value={form.job_title} onChange={handleChange} placeholder="e.g. Software Engineer" />
            </Field>
            <Field>
              <L>Employer Name</L>
              <input name="employer_name" value={form.employer_name} onChange={handleChange} placeholder="e.g. Acme Corp Sdn Bhd" />
            </Field>
            <Field>
              <L>Employer Address</L>
              <input name="employer_address" value={form.employer_address} onChange={handleChange} placeholder="e.g. No. 1, Jalan Teknologi" />
            </Field>
            <Field>
              <L>Employer Phone</L>
              <input name="employer_phone" type="tel" value={form.employer_phone} onChange={handleChange} placeholder="+60 3-1234 5678" />
            </Field>
          </SectionCard>

          {/* ── Actions ── */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Link href="/dashboard" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '0.8rem 1.5rem',
              borderRadius: 'var(--radius)', fontWeight: 600, fontSize: '0.9375rem',
              color: 'var(--color-text-muted)', border: '1.5px solid var(--color-border)',
              textDecoration: 'none', transition: 'all var(--transition)',
            }}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
              style={{ padding: '0.8rem 2rem', fontSize: '0.9375rem', minWidth: '140px' }}
            >
              {saving ? <><span className="spinner" /> Saving…</> : '💾 Save Changes'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
