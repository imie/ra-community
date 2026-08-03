'use client'

import { useState, useEffect, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@hooks/useAuth'
import { useCommunityStore } from '@hooks/useCommunitySettings'
import apiClient from '@lib/api'

interface CommunitySettings {
  id: string
  community_name: string
  logo_url?: string | null
  ssl_mode: 'disabled' | 'custom' | 'cloudflare' | 'letsencrypt'
  ssl_provider?: string | null
  domain_name?: string | null
  admin_email?: string | null
  enforce_https: boolean
  ssl_status: 'disabled' | 'active' | 'pending' | 'error'
  ssl_error_message?: string | null
  cert_expires_at?: string | null
  auto_renew: boolean
  last_renewed_at?: string | null
}

export default function CommunitySettingsPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Settings State
  const [communityName, setCommunityName] = useState('RA Community — Taman Aman Serenia')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [sslMode, setSslMode] = useState<'disabled' | 'custom' | 'cloudflare' | 'letsencrypt'>('disabled')
  const [domainName, setDomainName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [enforceHttps, setEnforceHttps] = useState(false)
  const [autoRenew, setAutoRenew] = useState(true)
  const [sslStatus, setSslStatus] = useState<string>('disabled')
  const [lastRenewedAt, setLastRenewedAt] = useState<string | null>(null)

  // Custom SSL Modal State
  const [showCustomSslModal, setShowCustomSslModal] = useState(false)
  const [showCloudflareModal, setShowCloudflareModal] = useState(false)
  const [fullchainPem, setFullchainPem] = useState('')
  const [privkeyPem, setPrivkeyPem] = useState('')
  const [sslProvider, setSslProvider] = useState<string | null>(null)
  const [certExpiresAt, setCertExpiresAt] = useState<string | null>(null)

  // Let's Encrypt Modal State
  const [showLetsEncryptModal, setShowLetsEncryptModal] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    if (!isAuthenticated()) { router.replace('/login'); return }
    if (user && user.role !== 'admin') { router.replace('/dashboard'); return }
  }, [mounted, user, isAuthenticated, router])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get<CommunitySettings>('/community/settings')
      setCommunityName(data.community_name)
      setLogoUrl(data.logo_url ?? null)
      setSslMode(data.ssl_mode)
      setDomainName(data.domain_name ?? '')
      setAdminEmail(data.admin_email ?? '')
      setEnforceHttps(data.enforce_https)
      setAutoRenew(data.auto_renew)
      setSslStatus(data.ssl_status)
      setSslProvider(data.ssl_provider ?? null)
      setCertExpiresAt(data.cert_expires_at ?? null)
      setLastRenewedAt(data.last_renewed_at ?? null)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!mounted || !user) return
    fetchSettings()
  }, [mounted, user])

  const handleSaveGeneral = async () => {
    setSaving(true)
    setSuccessMessage(null)
    setErrorMessage(null)
    try {
      await apiClient.put('/community/settings', {
        community_name: communityName,
        enforce_https: enforceHttps,
        auto_renew: autoRenew,
        ssl_mode: sslMode,
      })
      useCommunityStore.getState().fetchCommunitySettings()
      setSuccessMessage('✓ General community settings updated successfully.')
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail ?? 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    setSaving(true)
    try {
      const { data } = await apiClient.post('/community/settings/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setLogoUrl(data.logo_url)
      useCommunityStore.getState().fetchCommunitySettings()
      setSuccessMessage('✓ Community logo updated successfully.')
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch {
      setErrorMessage('Failed to upload logo image.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCustomSsl = async () => {
    if (!fullchainPem.trim() || !privkeyPem.trim()) {
      setErrorMessage('Please provide both Fullchain Certificate and Private Key PEM content.')
      return
    }
    setSaving(true)
    setErrorMessage(null)
    try {
      const { data } = await apiClient.post('/community/settings/ssl/custom', {
        fullchain_pem: fullchainPem,
        privkey_pem: privkeyPem,
      })
      setShowCustomSslModal(false)
      setSslMode('custom')
      setSslStatus('active')
      setSslProvider('custom')
      setCertExpiresAt(data.cert_expires_at ?? null)
      setSuccessMessage(`✓ Custom SSL certificate uploaded. Nginx: ${data.nginx_status === 'nginx_reloaded' ? 'reloaded ✓' : 'reload pending ⚠'}`)
      fetchSettings()
      setTimeout(() => setSuccessMessage(null), 6000)
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail ?? 'Failed to upload custom SSL certificate.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCloudflareSSL = async () => {
    if (!fullchainPem.trim() || !privkeyPem.trim()) {
      setErrorMessage('Please provide both the Cloudflare Origin Certificate and Private Key.')
      return
    }
    setSaving(true)
    setErrorMessage(null)
    try {
      const { data } = await apiClient.post('/community/settings/ssl/cloudflare', {
        fullchain_pem: fullchainPem,
        privkey_pem: privkeyPem,
      })
      setShowCloudflareModal(false)
      setSslMode('cloudflare')
      setSslStatus('active')
      setSslProvider('cloudflare')
      setCertExpiresAt(data.cert_expires_at ?? null)
      setSuccessMessage(`✓ Cloudflare Origin Certificate activated. Nginx: ${data.nginx_status === 'nginx_reloaded' ? 'reloaded ✓' : 'reload pending ⚠'}`)
      fetchSettings()
      setTimeout(() => setSuccessMessage(null), 6000)
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail ?? 'Failed to upload Cloudflare SSL certificate.')
    } finally {
      setSaving(false)
    }
  }

  const handleRegisterLetsEncrypt = async () => {
    if (!domainName.trim() || !adminEmail.trim()) {
      setErrorMessage('Please enter a valid Domain Name and Admin Email.')
      return
    }
    setSaving(true)
    setErrorMessage(null)
    try {
      const { data } = await apiClient.post('/community/settings/ssl/letsencrypt', {
        domain_name: domainName,
        admin_email: adminEmail,
      })
      setShowLetsEncryptModal(false)
      setSslMode('letsencrypt')
      setSslStatus(data.status)
      setSuccessMessage(`✓ Let's Encrypt ACME registration initiated for domain '${domainName}'.`)
      fetchSettings()
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail ?? "Failed to issue Let's Encrypt SSL certificate.")
    } finally {
      setSaving(false)
    }
  }

  if (!mounted || (loading && !user)) return null
  const initials = user?.full_name?.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() ?? 'A'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface)' }}>
      {/* ── Sub Nav ── */}
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
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--color-surface)', borderRadius: 'var(--radius-full)',
            padding: '0.375rem 0.875rem 0.375rem 0.375rem', border: '1px solid var(--color-border)',
          }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'var(--gradient-hero)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>{initials}</div>
            <span className="nav-user-label" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Admin</span>
          </div>
        </div>
      </nav>

      {/* Admin Tab Navigation */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--color-border)', padding: '0 1rem' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', gap: '1rem', overflowX: 'auto' }}>
          <Link href="/admin" style={{ padding: '0.875rem 0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', borderBottom: '2px solid transparent' }}>
            👥 User Management
          </Link>
          <Link href="/admin/announcements" style={{ padding: '0.875rem 0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', borderBottom: '2px solid transparent' }}>
            📢 Announcements
          </Link>
          <Link href="/admin/settings" style={{ padding: '0.875rem 0.75rem', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none', borderBottom: '2px solid var(--color-primary)' }}>
            ⚙️ Community & SSL Settings
          </Link>
        </div>
      </div>

      <main className="main-content" style={{ maxWidth: '1000px' }}>
        <div className="animate-fade-up" style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.25rem' }}>Community & Security Settings</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>Configure community name, logo, HTTPS, and Let's Encrypt SSL certificates.</p>
        </div>

        {/* Success / Error Messages */}
        {successMessage && <div className="alert alert-success animate-fade-in" style={{ marginBottom: '1.25rem' }}>{successMessage}</div>}
        {errorMessage && <div className="alert alert-error animate-fade-in" style={{ marginBottom: '1.25rem' }}>⚠ {errorMessage}</div>}

        {/* ── Card 1: Branding Settings ── */}
        <div className="card animate-fade-up" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            🏡 Community Branding
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
                Community Name
              </label>
              <input
                value={communityName}
                onChange={(e) => setCommunityName(e.target.value)}
                placeholder="e.g. Taman Aman Serenia"
                style={{ fontSize: '0.9375rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
                Community Logo
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{
                  width: '4rem', height: '4rem', borderRadius: 'var(--radius)',
                  border: '1px solid var(--color-border)', background: 'var(--color-surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem',
                  overflow: 'hidden'
                }}>
                  {logoUrl ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏘️'}
                </div>
                <label className="btn-ghost" style={{ cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                  📷 Upload Logo Image
                  <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} disabled={saving} />
                </label>
              </div>
            </div>
          </div>

          <button onClick={handleSaveGeneral} disabled={saving} className="btn-primary" style={{ padding: '0.625rem 1.25rem' }}>
            {saving ? 'Saving…' : 'Save General Settings'}
          </button>
        </div>

        {/* ── Card 2: SSL & HTTPS Settings ── */}
        <div className="card animate-fade-up" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>
              🔒 SSL & HTTPS Security
            </h2>
            <span style={{
              fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)',
              background: sslStatus === 'active' ? '#dcfce7' : sslStatus === 'pending' ? '#fef3c7' : '#f1f5f9',
              color: sslStatus === 'active' ? '#15803d' : sslStatus === 'pending' ? '#b45309' : '#64748b',
              textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              ● Status: {sslStatus}
            </span>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Select SSL Mode
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              <div
                onClick={() => setSslMode('disabled')}
                style={{
                  padding: '1rem', borderRadius: 'var(--radius)', border: `2px solid ${sslMode === 'disabled' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: sslMode === 'disabled' ? 'var(--color-primary-light)' : '#fff', cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>🌐 HTTP / Disabled</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Local development mode (HTTP on port 80/3000)</div>
              </div>

              <div
                onClick={() => { setSslMode('cloudflare'); setShowCloudflareModal(true); setFullchainPem(''); setPrivkeyPem('') }}
                style={{
                  padding: '1rem', borderRadius: 'var(--radius)', border: `2px solid ${sslMode === 'cloudflare' ? '#f6821f' : 'var(--color-border)'}`,
                  background: sslMode === 'cloudflare' ? '#fff7ed' : '#fff', cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>☁️ Cloudflare Origin Cert</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Upload Cloudflare Origin Certificate (Full strict mode)</div>
              </div>

              <div
                onClick={() => { setSslMode('custom'); setShowCustomSslModal(true); setFullchainPem(''); setPrivkeyPem('') }}
                style={{
                  padding: '1rem', borderRadius: 'var(--radius)', border: `2px solid ${sslMode === 'custom' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: sslMode === 'custom' ? 'var(--color-primary-light)' : '#fff', cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>🔑 Custom SSL Certificate</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Upload any CA cert: DigiCert, Sectigo, ZeroSSL, etc.</div>
              </div>

              <div
                onClick={() => { setSslMode('letsencrypt'); setShowLetsEncryptModal(true) }}
                style={{
                  padding: '1rem', borderRadius: 'var(--radius)', border: `2px solid ${sslMode === 'letsencrypt' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: sslMode === 'letsencrypt' ? 'var(--color-primary-light)' : '#fff', cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>🛡️ Let's Encrypt (Automated)</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Free 90-day cert, auto-renewed via ACME HTTP-01</div>
              </div>
            </div>
          </div>

          {/* HTTPS & Auto Renew Toggles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', background: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={enforceHttps} onChange={(e) => setEnforceHttps(e.target.checked)} style={{ width: '1.25rem', height: '1.25rem' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Enforce HTTPS Redirection</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Automatically redirect all HTTP requests to HTTPS (Port 443)</div>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} style={{ width: '1.25rem', height: '1.25rem' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Auto-Renew Let's Encrypt SSL</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Automatically renew certificate before 90-day expiry</div>
              </div>
            </label>
          </div>

          {/* Cert expiry + provider info */}
          {certExpiresAt && (
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🗓️ Certificate expires: <strong>{new Date(certExpiresAt).toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
              {sslProvider && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 600 }}>via {sslProvider}</span>}
            </div>
          )}

          {lastRenewedAt && (
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              🕒 Last Certificate Issue / Renewal: <strong>{new Date(lastRenewedAt).toLocaleString()}</strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={() => { setShowCloudflareModal(true); setFullchainPem(''); setPrivkeyPem('') }} className="btn-ghost" style={{ fontSize: '0.875rem' }}>
              ☁️ Upload Cloudflare Origin Cert
            </button>
            <button onClick={() => { setShowCustomSslModal(true); setFullchainPem(''); setPrivkeyPem('') }} className="btn-ghost" style={{ fontSize: '0.875rem' }}>
              📤 Upload Custom SSL (.crt/.key)
            </button>
            <button onClick={() => setShowLetsEncryptModal(true)} className="btn-ghost" style={{ fontSize: '0.875rem' }}>
              🔄 Register / Issue Let's Encrypt SSL
            </button>
          </div>
        </div>
      </main>

      {/* ── Modal 1: Upload Custom SSL ── */}
      {showCustomSslModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
          <div className="card animate-fade-up" style={{ maxWidth: '650px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>🔑 Upload Custom SSL Certificate</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Paste your PEM-formatted Fullchain Certificate and Private Key.
              Works with any CA: DigiCert, Sectigo, ZeroSSL, etc.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
                Fullchain Certificate (.pem / .crt)
              </label>
              <textarea
                rows={5}
                value={fullchainPem}
                onChange={(e) => setFullchainPem(e.target.value)}
                placeholder={'-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----'}
                style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
                Private Key (.key / .pem)
              </label>
              <textarea
                rows={5}
                value={privkeyPem}
                onChange={(e) => setPrivkeyPem(e.target.value)}
                placeholder={'-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'}
                style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCustomSslModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleSaveCustomSsl} disabled={saving} className="btn-primary">
                {saving ? 'Uploading…' : 'Activate Custom SSL'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 1b: Upload Cloudflare Origin Certificate ── */}
      {showCloudflareModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
          <div className="card animate-fade-up" style={{ maxWidth: '680px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>☁️ Cloudflare Origin Certificate</h3>

            {/* Step-by-step Cloudflare instructions */}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.25rem', fontSize: '0.8125rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#b45309' }}>📋 How to get your Cloudflare Origin Certificate:</div>
              <ol style={{ paddingLeft: '1.25rem', lineHeight: 1.7, color: '#92400e' }}>
                <li>Go to <strong>Cloudflare Dashboard</strong> → your domain → <strong>SSL/TLS → Origin Server</strong></li>
                <li>Click <strong>"Create Certificate"</strong></li>
                <li>Choose key type (RSA 2048 recommended) and validity period (up to 15 years)</li>
                <li>Copy <strong>"Origin Certificate"</strong> → paste below as Fullchain PEM</li>
                <li>Copy <strong>"Private Key"</strong> → paste below as Private Key PEM</li>
                <li>Set Cloudflare SSL/TLS encryption mode to <strong>"Full (strict)"</strong></li>
              </ol>
              <div style={{ marginTop: '0.5rem', color: '#78350f', fontSize: '0.75rem' }}>
                ⚠️ Cloudflare Origin Certs only work when traffic passes through Cloudflare's proxy (orange cloud ☁ enabled).
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
                Cloudflare Origin Certificate (fullchain.pem)
              </label>
              <textarea
                rows={6}
                value={fullchainPem}
                onChange={(e) => setFullchainPem(e.target.value)}
                placeholder={'-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----'}
                style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
                Cloudflare Private Key (privkey.pem)
              </label>
              <textarea
                rows={6}
                value={privkeyPem}
                onChange={(e) => setPrivkeyPem(e.target.value)}
                placeholder={'-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'}
                style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCloudflareModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleSaveCloudflareSSL} disabled={saving} className="btn-primary" style={{ background: '#f6821f', borderColor: '#f6821f' }}>
                {saving ? 'Activating…' : '☁️ Activate Cloudflare SSL'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: Let's Encrypt Registration ── */}
      {showLetsEncryptModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
          <div className="card animate-fade-up" style={{ maxWidth: '550px', width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>🛡️ Let's Encrypt Automated SSL</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Enter your registered domain name and admin email to issue a free, 90-day SSL certificate via ACME HTTP-01 protocol.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
                Domain Name
              </label>
              <input
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                placeholder="e.g. aman-serenia.my or community.example.com"
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
                Admin Email (ACME Notifications)
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@racommunity.org"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowLetsEncryptModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleRegisterLetsEncrypt} disabled={saving} className="btn-primary">
                {saving ? 'Registering…' : "Issue Let's Encrypt SSL"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
