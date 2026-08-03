'use client'

const features = [
  {
    icon: '🏘️',
    title: 'Resident Directory',
    desc: 'Manage resident profiles, contact details and household information in one place.',
  },
  {
    icon: '📢',
    title: 'Announcements',
    desc: 'Broadcast notices, circulars and emergency alerts to all residents instantly.',
  },
  {
    icon: '🗓️',
    title: 'Facilities Booking',
    desc: 'Reserve community halls, sports courts and amenities with an easy online system.',
  },
  {
    icon: '🔒',
    title: 'Secure & Private',
    desc: 'Role-based access control keeps your community data safe and confidential.',
  },
]

export default function FeatureCards() {
  return (
    <section style={{ padding: '5rem 2rem', background: 'var(--color-surface)' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{
            fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800,
            color: 'var(--color-text)', marginBottom: '0.75rem',
          }}>
            Everything your community needs
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1.0625rem', maxWidth: '480px', margin: '0 auto' }}>
            Built for Malaysian residence associations — simple, fast and reliable.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
        }}>
          {features.map((f) => (
            <div
              key={f.title}
              className="card"
              style={{
                padding: '1.75rem',
                transition: 'transform var(--transition), box-shadow var(--transition)',
                cursor: 'default',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'
                ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-lg)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)'
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '1.0625rem' }}>{f.title}</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
