import Link from 'next/link'
import FeatureCards from './FeatureCards'

export default function HomePage() {
  return (
    <>
      {/* ── Navigation Bar ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '4rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🏡</span>
          <span style={{ fontWeight: 700, fontSize: '1.0625rem', letterSpacing: '-0.02em', color: 'var(--color-text)' }}>
            RA Community
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/login" style={{
            padding: '0.4375rem 1.125rem', borderRadius: 'var(--radius)',
            fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-primary)',
            border: '1.5px solid var(--color-primary-light)',
          }}>
            Sign In
          </Link>
          <Link href="/register" style={{
            padding: '0.4375rem 1.125rem', borderRadius: 'var(--radius)',
            fontWeight: 600, fontSize: '0.875rem', color: '#fff',
            background: 'var(--color-primary)',
            boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
          }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section style={{
        background: 'var(--gradient-hero)',
        padding: '5rem 2rem 6rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-5rem', right: '-5rem',
          width: '28rem', height: '28rem', borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-8rem', left: '-6rem',
          width: '32rem', height: '32rem', borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', maxWidth: '720px', margin: '0 auto' }} className="animate-fade-up">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(255,255,255,0.12)', borderRadius: 'var(--radius-full)',
            padding: '0.375rem 1rem', fontSize: '0.8125rem', fontWeight: 600,
            color: 'rgba(255,255,255,0.85)', marginBottom: '1.75rem',
            border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
          }}>
            <span>✦</span> Serving Your Community
          </div>
          <h1 style={{
            fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', fontWeight: 800,
            color: '#ffffff', marginBottom: '1.25rem',
            letterSpacing: '-0.03em', lineHeight: 1.15,
          }}>
            Your Residence Association,<br />
            <span style={{ color: '#93c5fd' }}>Simplified.</span>
          </h1>
          <p style={{
            fontSize: '1.125rem', color: 'rgba(255,255,255,0.75)',
            maxWidth: '520px', margin: '0 auto 2.5rem', lineHeight: 1.7,
          }}>
            A modern platform for managing residents, facilities and community
            communications — all in one secure place.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" style={{
              padding: '0.875rem 2rem', borderRadius: 'var(--radius)',
              background: '#fff', color: 'var(--color-primary)',
              fontWeight: 700, fontSize: '1rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            }}>
              Create Account →
            </Link>
            <Link href="/login" style={{
              padding: '0.875rem 2rem', borderRadius: 'var(--radius)',
              background: 'rgba(255,255,255,0.12)', color: '#fff',
              fontWeight: 600, fontSize: '1rem',
              border: '1.5px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)',
            }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features Grid (Client Component for hover effects) ── */}
      <FeatureCards />

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid var(--color-border)',
        padding: '2rem', textAlign: 'center',
        color: 'var(--color-text-subtle)', fontSize: '0.875rem',
        background: 'var(--color-background)',
      }}>
        © {new Date().getFullYear()} RA Community Management · Built with ❤️ for Malaysian residents
      </footer>
    </>
  )
}
