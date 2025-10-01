/**
 * Secure Client-Side Auth Utilities
 * ----------------------------------
 * Replaces localStorage-based auth with cookie-based auth
 * Automatically handles token refresh
 * CSRF token management
 */

import type { User } from '@/types/user'

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || ''

/**
 * Get CSRF token from cookie
 */
function getCSRFToken(): string | null {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'kupa_csrf_token') {
      return decodeURIComponent(value)
    }
  }
  return null
}

/**
 * Fetch with automatic token refresh and CSRF protection
 */
async function fetchWithAuth<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const csrfToken = getCSRFToken()

  const headers = new Headers(options.headers || {})

  // Add CSRF token to write operations
  const method = (options.method || 'GET').toUpperCase()
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && csrfToken) {
    headers.set('X-CSRF-Token', csrfToken)
  }

  // Include credentials (cookies)
  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Important: send cookies
  }

  // First attempt
  let response = await fetch(`${API_BASE}${url}`, fetchOptions)

  // If 401 (unauthorized), try to refresh token
  if (response.status === 401 && url !== '/api/auth/refresh') {
    const refreshResponse = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })

    if (refreshResponse.ok) {
      // Retry original request with new token
      response = await fetch(`${API_BASE}${url}`, fetchOptions)
    } else {
      // Refresh failed, redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
      throw new Error('Sesión expirada')
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

/**
 * Login (sets cookies automatically)
 */
export async function login(email: string, password: string): Promise<{ user: User }> {
  const response = await fetch(`${API_BASE}/api/auth/login-secure`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error al iniciar sesión' }))
    throw new Error(error.error || 'Credenciales inválidas')
  }

  return response.json()
}

/**
 * Logout (clears cookies)
 */
export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout-secure`, {
    method: 'POST',
    credentials: 'include',
  })

  // Redirect to login
  if (typeof window !== 'undefined') {
    window.location.href = '/'
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/me-secure`, {
      credentials: 'include',
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null
}

/**
 * Fetch with auth and automatic refresh
 */
export { fetchWithAuth }

/**
 * Legacy compatibility
 * (Remove after migration)
 */
export function getStoredAuthSession(): { token: string } | null {
  console.warn('getStoredAuthSession is deprecated. Use getCurrentUser() instead.')
  // Can't access HttpOnly cookies from JS
  return null
}

export function removeStoredAuthSession(): void {
  // Logout handles cookie clearing
  logout()
}
