/**
 * Auth & User API calls — mirrors the web app's auth.ts exactly.
 */
import apiClient from './api'
import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  AccessTokenResponse,
  ForgotPasswordRequest,
  PasswordResetRequest,
  UserResponse,
  UserProfileUpdate,
  AnnouncementListResponse,
  AnnouncementResponse,
} from '../types'

// --------------- Auth ---------------

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<TokenResponse>('/auth/login', data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    apiClient.post<UserResponse>('/auth/register', data).then((r) => r.data),

  refresh: (refresh_token: string) =>
    apiClient
      .post<AccessTokenResponse>('/auth/refresh', { refresh_token })
      .then((r) => r.data),

  forgotPassword: (data: ForgotPasswordRequest) =>
    apiClient
      .post<{ message: string }>('/auth/forgot-password', data)
      .then((r) => r.data),

  resetPassword: (data: PasswordResetRequest) =>
    apiClient
      .post<{ message: string }>('/auth/reset-password', data)
      .then((r) => r.data),
}

// --------------- User ---------------

export const userApi = {
  getMe: () => apiClient.get<UserResponse>('/users/me').then((r) => r.data),

  updateMe: (data: UserProfileUpdate) =>
    apiClient.put<UserResponse>('/users/me', data).then((r) => r.data),

  deleteAccount: () => apiClient.delete('/users/me'),
}

// --------------- Announcements ---------------

export const announcementsApi = {
  list: (page = 1, pageSize = 20) =>
    apiClient
      .get<AnnouncementListResponse>('/announcements', {
        params: { page, page_size: pageSize },
      })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient
      .get<AnnouncementResponse>(`/announcements/${id}`)
      .then((r) => r.data),
}
