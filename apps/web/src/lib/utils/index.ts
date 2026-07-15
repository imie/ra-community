/**
 * Utility helpers — className merger, date formatting, etc.
 */
import { type ClassValue, clsx } from 'clsx'

/** Merge class names conditionally (like tailwind-merge but without TW dependency). */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

/** Format an ISO date string to a human-readable date. */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function formatIC(ic: string | null | undefined): string {
  if (!ic) return '—'
  const clean = ic.replace(/[^0-9]/g, '')
  if (clean.length === 12) {
    return `${clean.substring(0, 6)}-${clean.substring(6, 8)}-${clean.substring(8, 12)}`
  }
  return ic
}

export function stripIC(ic: string | null | undefined): string {
  if (!ic) return ''
  return ic.replace(/[^0-9]/g, '')
}

export function formatSex(sex: string | null | undefined): string {
  if (sex === 'M') return 'Lelaki'
  if (sex === 'F') return 'Perempuan'
  if (sex === 'Other') return 'Lain-lain'
  return sex || '—'
}

export function formatRace(race: string | null | undefined): string {
  if (race === 'Malay') return 'Melayu'
  if (race === 'Chinese') return 'Cina'
  if (race === 'Indian') return 'India'
  if (race === 'Other') return 'Lain-lain'
  return race || '—'
}

export function formatMaritalStatus(status: string | null | undefined): string {
  if (status === 'single') return 'Bujang'
  if (status === 'married') return 'Berkahwin'
  if (status === 'divorced') return 'Bercerai'
  if (status === 'widowed') return 'Balu/Duda'
  return status || '—'
}

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Capitalise the first letter of a string. */
export function capitalise(s: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}
