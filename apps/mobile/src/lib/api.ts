/**
 * Axios API client for the RA Community backend.
 *
 * - Reads auth token from expo-secure-store via the Zustand auth store.
 * - Attaches Authorization: Bearer <token> header on every request.
 * - On 401: clears persisted auth and redirects to /login via expo-router.
 */
import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { router } from 'expo-router'
import { API_BASE_URL, STORAGE_KEYS } from '../constants'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// Attach Authorization header
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally — clear auth and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN)
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN)
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER)
      router.replace('/(auth)/login')
    }
    return Promise.reject(error)
  }
)

export default apiClient
