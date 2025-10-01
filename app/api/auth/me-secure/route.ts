import { NextRequest, NextResponse } from 'next/server'
import { AuthServiceSecure } from '@/lib/services/auth/authServiceSecure'
import { getAccessToken } from '@/lib/utils/cookies'

/**
 * Get Current User Endpoint (Secure)
 * ----------------------------------
 * Reads access token from HttpOnly cookie
 */
export async function GET(request: NextRequest) {
  try {
    const accessToken = getAccessToken(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const user = await AuthServiceSecure.getCurrentUser(accessToken)

    if (!user) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }

    return NextResponse.json({ user }, { status: 200 })
  } catch (error) {
    console.error('Get current user error:', error)
    return NextResponse.json({ error: 'Error al obtener usuario' }, { status: 500 })
  }
}
