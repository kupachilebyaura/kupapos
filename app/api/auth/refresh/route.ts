import { NextRequest, NextResponse } from 'next/server'
import { AuthServiceSecure } from '@/lib/services/auth/authServiceSecure'
import {
  getRefreshToken,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearAuthCookies,
} from '@/lib/utils/cookies'

/**
 * Refresh Token Endpoint
 * ----------------------
 * Exchanges refresh token for new access token
 * Rotates refresh token for enhanced security
 */
export async function POST(request: NextRequest) {
  try {
    const refreshToken = getRefreshToken(request)

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token no proporcionado' }, { status: 401 })
    }

    // Refresh access token and rotate refresh token
    const result = await AuthServiceSecure.refreshAccessToken(refreshToken)

    if (!result) {
      // Invalid or expired refresh token - clear cookies
      let response = NextResponse.json({ error: 'Sesión expirada' }, { status: 401 })
      response = clearAuthCookies(response)
      return response
    }

    // Set new tokens in cookies
    let response = NextResponse.json(
      {
        message: 'Token refrescado exitosamente',
      },
      { status: 200 }
    )

    response = setAccessTokenCookie(response, result.accessToken)
    response = setRefreshTokenCookie(response, result.newRefreshToken)

    return response
  } catch (error) {
    console.error('Refresh token error:', error)

    let response = NextResponse.json({ error: 'Error al refrescar token' }, { status: 500 })
    response = clearAuthCookies(response)

    return response
  }
}
