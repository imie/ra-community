export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
      }}
    >
      <h1 style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--color-primary)' }}>404</h1>
      <p style={{ fontSize: '1.125rem', color: 'var(--color-text-muted)' }}>
        Page not found
      </p>
      <a href="/" style={{ color: 'var(--color-primary)' }}>
        ← Back to home
      </a>
    </main>
  )
}
