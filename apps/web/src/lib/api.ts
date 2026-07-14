/**
 * API client for the RA Community backend.
 *
 * Uses a relative "/api" base URL so that Next.js rewrite rules
 * (next.config.js) proxy the request to the backend. This works in
 * every environment — Docker, local dev, and production — without
 * needing NEXT_PUBLIC_API_URL to be baked in at image build time.
 *
 * next.config.js rewrite: /api/:path* → BACKEND_URL/api/:path*
 */
import axios from 'axios'

const API_BASE_URL =
  typeof window !== 'undefined'
    ? '/api'  // browser: use Next.js rewrite proxy
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api' // SSR: direct

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
})

// Attach Authorization header from localStorage when available
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Globally handle 401 — clear tokens and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
