/**
 * Utility helpers — className merger, date formatting, etc.
 */
import { type ClassValue, clsx } from 'clsx'

/** Merge class names conditionally (like tailwind-merge but without TW dependency). */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

/** Format an ISO date string to a human-readable date. */
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
