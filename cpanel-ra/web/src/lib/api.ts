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

/**
 * Read the access token from Zustand's persisted localStorage entry.
 *
 * Zustand `persist` stores the whole auth state under the key "ra-auth":
 *   { "state": { "access_token": "...", ... }, "version": 0 }
 *
 * The old code used localStorage.getItem('access_token') which always
 * returned null, so every authenticated request was sent without a
 * Bearer token → 401 → redirect back to /login.
 */
function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('ra-auth')
    if (!raw) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (JSON.parse(raw) as any)?.state?.access_token ?? null
  } catch {
    return null
  }
}

/** Remove the entire persisted auth state on logout / 401. */
function clearStoredAuth(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('ra-auth')
}

// Attach Authorization header using the correct Zustand persist key
apiClient.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Globally handle 401 — clear persisted auth and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      clearStoredAuth()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
