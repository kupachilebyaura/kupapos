import { serialize, parse, type CookieSerializeOptions } from 'cookie'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Cookie Configuration
 * Secure, HttpOnly cookies with CSRF protection
 */

const isProduction = process.env.NODE_ENV === 'production'

export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'kupa_access_token',
  REFRESH_TOKEN: 'kupa_refresh_token',
  CSRF_TOKEN: 'kupa_csrf_token',
} as const

const DEFAULT_COOKIE_OPTIONS: CookieSerializeOptions = {
  httpOnly: true,
  secure: isProduction, // HTTPS only in production
  sameSite: 'strict', // CSRF protection
  path: '/',
  maxAge: 0, // Will be set per cookie
}

/**
 * Set HttpOnly cookie in response
 */
export function setSecureCookie(
  response: NextResponse,
  name: string,
  value: string,
  options?: Partial<CookieSerializeOptions>
): NextResponse {
  const cookieOptions: CookieSerializeOptions = {
    ...DEFAULT_COOKIE_OPTIONS,
    ...options,
  }

  const serialized = serialize(name, value, cookieOptions)
  response.headers.append('Set-Cookie', serialized)

  return response
}

/**
 * Set access token cookie (15 minutes)
 */
export function setAccessTokenCookie(response: NextResponse, token: string): NextResponse {
  return setSecureCookie(response, COOKIE_NAMES.ACCESS_TOKEN, token, {
    maxAge: 15 * 60, // 15 minutes
  })
}

/**
 * Set refresh token cookie (7 days)
 */
export function setRefreshTokenCookie(response: NextResponse, token: string): NextResponse {
  return setSecureCookie(response, COOKIE_NAMES.REFRESH_TOKEN, token, {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
}

/**
 * Set CSRF token cookie (not HttpOnly, needs to be readable by JS)
 */
export function setCSRFTokenCookie(response: NextResponse, token: string): NextResponse {
  return setSecureCookie(response, COOKIE_NAMES.CSRF_TOKEN, token, {
    httpOnly: false, // Client needs to read this
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
}

/**
 * Clear all auth cookies
 */
export function clearAuthCookies(response: NextResponse): NextResponse {
  const expiredOptions: CookieSerializeOptions = {
    ...DEFAULT_COOKIE_OPTIONS,
    maxAge: 0,
    expires: new Date(0),
  }

  response.headers.append('Set-Cookie', serialize(COOKIE_NAMES.ACCESS_TOKEN, '', expiredOptions))
  response.headers.append('Set-Cookie', serialize(COOKIE_NAMES.REFRESH_TOKEN, '', expiredOptions))
  response.headers.append(
    'Set-Cookie',
    serialize(COOKIE_NAMES.CSRF_TOKEN, '', { ...expiredOptions, httpOnly: false })
  )

  return response
}

/**
 * Get cookie from request
 */
export function getCookie(request: NextRequest, name: string): string | undefined {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return undefined

  const cookies = parse(cookieHeader)
  return cookies[name]
}

/**
 * Get access token from request
 */
export function getAccessToken(request: NextRequest): string | undefined {
  return getCookie(request, COOKIE_NAMES.ACCESS_TOKEN)
}

/**
 * Get refresh token from request
 */
export function getRefreshToken(request: NextRequest): string | undefined {
  return getCookie(request, COOKIE_NAMES.REFRESH_TOKEN)
}

/**
 * Get CSRF token from request headers
 */
export function getCSRFToken(request: NextRequest): string | undefined {
  return request.headers.get('x-csrf-token') || undefined
}

/**
 * Verify CSRF token matches cookie
 */
export function verifyCSRFToken(request: NextRequest): boolean {
  const cookieToken = getCookie(request, COOKIE_NAMES.CSRF_TOKEN)
  const headerToken = getCSRFToken(request)

  if (!cookieToken || !headerToken) {
    return false
  }

  return cookieToken === headerToken
}
