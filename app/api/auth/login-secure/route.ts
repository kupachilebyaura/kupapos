import { NextRequest, NextResponse } from 'next/server'
import { AuthServiceSecure } from '@/lib/services/auth/authServiceSecure'
import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setCSRFTokenCookie,
} from '@/lib/utils/cookies'
import type { LoginRequest } from '@/types/auth'

/**
 * Secure Login Endpoint
 * ---------------------
 * Sets HttpOnly cookies instead of returning tokens in response
 * Implements CSRF protection
 */
export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json()

    // Validate input
    if (!body.email || !body.password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
    }

    // Authenticate user
    const authResult = await AuthServiceSecure.login(body)

    // Create response with user data only (no tokens in body)
    let response = NextResponse.json(
      {
        user: authResult.user,
        message: 'Login exitoso',
      },
      { status: 200 }
    )

    // Set secure HttpOnly cookies
    response = setAccessTokenCookie(response, authResult.token)
    response = setRefreshTokenCookie(response, authResult.refreshToken)
    response = setCSRFTokenCookie(response, authResult.csrfToken)

    return response
  } catch (error) {
    console.error('Login error:', error)

    if (error instanceof Error) {
      if (error.message === 'Credenciales inválidas') {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
