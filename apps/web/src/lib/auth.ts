/**
 * Authentication API calls — login, register, refresh, forgot/reset password.
 */
import apiClient from '@lib/api'
import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  AccessTokenResponse,
  ForgotPasswordRequest,
  PasswordResetRequest,
  UserResponse,
} from '@types/index'

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

export const userApi = {
  getMe: () =>
    apiClient.get<UserResponse>('/users/me').then((r) => r.data),

  updateMe: (data: Partial<UserResponse>) =>
    apiClient.put<UserResponse>('/users/me', data).then((r) => r.data),
}
