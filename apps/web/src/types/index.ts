/**
 * TypeScript types mirroring the backend Pydantic schemas.
 */

// --------------- Auth ---------------

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  full_name: string
  phone_number?: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  expires_in: number
}

export interface AccessTokenResponse {
  access_token: string
  token_type: 'bearer'
  expires_in: number
}

export interface ForgotPasswordRequest {
  email: string
}

export interface PasswordResetRequest {
  token: string
  new_password: string
}

// --------------- User ---------------

export type UserRole = 'admin' | 'resident' | 'guest'
export type UserSex = 'M' | 'F' | 'Other'
export type UserRace =
  | 'Malay'
  | 'Chinese'
  | 'Indian'
  | 'Eurasian'
  | 'Kadazan'
  | 'Iban'
  | 'Other'
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed'

export interface UserResponse {
  id: string
  email: string
  full_name: string
  phone_number: string | null
  role: UserRole
  ic_number: string | null
  date_of_birth: string | null   // ISO date string (YYYY-MM-DD)
  place_of_birth: string | null
  sex: UserSex | null
  race: UserRace | null
  marital_status: MaritalStatus | null
  taman_name: string | null
  house_number: string | null
  jalan_aman_serenia: string | null
  job_title: string | null
  employer_name: string | null
  is_active: boolean
  is_verified: boolean
  created_at: string  // ISO datetime
  updated_at: string  // ISO datetime
}

export interface UserProfileUpdate {
  full_name?: string
  phone_number?: string
  ic_number?: string
  date_of_birth?: string  // ISO date string
  place_of_birth?: string
  sex?: UserSex
  race?: UserRace
  marital_status?: MaritalStatus
  taman_name?: string
  house_number?: string
  jalan_aman_serenia?: string
  job_title?: string
  employer_name?: string
}
