import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RA Community Management',
  description: 'Residence Association Community Management System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
