/**
 * App-wide constants.
 */
import type { AnnouncementPriority, UserRace, UserSex, MaritalStatus, ResidentType } from '../types'

// --------------- API ---------------

/**
 * API base URL.
 * On device/emulator: change to your machine's LAN IP, e.g. http://192.168.1.x:8000/api
 * In production: set to your deployed backend URL.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api'

// --------------- Secure Store Keys ---------------
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'ra_access_token',
  REFRESH_TOKEN: 'ra_refresh_token',
  USER: 'ra_user',
} as const

// --------------- Priority ---------------
export const PRIORITY_LABELS: Record<AnnouncementPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
}

export const PRIORITY_COLORS: Record<AnnouncementPriority, string> = {
  urgent: '#EF4444',
  high: '#F97316',
  normal: '#3B82F6',
  low: '#6B7280',
}

// --------------- Form Options ---------------
export const SEX_OPTIONS: { label: string; value: UserSex }[] = [
  { label: 'Male', value: 'M' },
  { label: 'Female', value: 'F' },
  { label: 'Other', value: 'Other' },
]

export const RACE_OPTIONS: { label: string; value: UserRace }[] = [
  { label: 'Malay', value: 'Malay' },
  { label: 'Chinese', value: 'Chinese' },
  { label: 'Indian', value: 'Indian' },
  { label: 'Eurasian', value: 'Eurasian' },
  { label: 'Kadazan', value: 'Kadazan' },
  { label: 'Iban', value: 'Iban' },
  { label: 'Other', value: 'Other' },
]

export const MARITAL_STATUS_OPTIONS: { label: string; value: MaritalStatus }[] = [
  { label: 'Single', value: 'single' },
  { label: 'Married', value: 'married' },
  { label: 'Divorced', value: 'divorced' },
  { label: 'Widowed', value: 'widowed' },
]

export const RESIDENT_TYPE_OPTIONS: { label: string; value: ResidentType }[] = [
  { label: 'Owner', value: 'owner' },
  { label: 'Tenant', value: 'tenant' },
]
