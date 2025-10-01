import { NextRequest, NextResponse } from 'next/server'
import { AuthServiceSecure } from '@/lib/services/auth/authServiceSecure'
import { getAccessToken, getRefreshToken, clearAuthCookies } from '@/lib/utils/cookies'

/**
 * Secure Logout Endpoint
 * ----------------------
 * Blacklists access token and revokes refresh token
 * Clears all auth cookies
 */
export async function POST(request: NextRequest) {
  try {
    const accessToken = getAccessToken(request)
    const refreshToken = getRefreshToken(request)

    if (accessToken) {
      await AuthServiceSecure.logout(accessToken, refreshToken)
    }

    // Create response and clear cookies
    let response = NextResponse.json(
      {
        message: 'Logout exitoso',
      },
      { status: 200 }
    )

    response = clearAuthCookies(response)

    return response
  } catch (error) {
    console.error('Logout error:', error)

    // Even if logout fails, clear cookies
    let response = NextResponse.json(
      {
        message: 'Sesión cerrada',
      },
      { status: 200 }
    )

    response = clearAuthCookies(response)

    return response
  }
}
