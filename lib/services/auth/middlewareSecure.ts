import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from './tokenService'
import { getAccessToken, verifyCSRFToken } from '@/lib/utils/cookies'
import type { Role } from '@/types/user'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    role: Role
    businessId: string
  }
}

/**
 * Middleware de autenticación con cookies HttpOnly
 * ------------------------------------------------
 * Lee el token de la cookie en lugar de Authorization header
 * Verifica CSRF token en operaciones de escritura
 */
export async function withAuth(
  request: NextRequest,
  options: {
    requireAuth?: boolean
    allowedRoles?: Role[]
    requireCSRF?: boolean
  } = {}
): Promise<{ authorized: boolean; user?: { id: string; role: Role; businessId: string }; error?: string }> {
  const { requireAuth = true, allowedRoles, requireCSRF = false } = options

  // Get access token from cookie
  const accessToken = getAccessToken(request)

  if (!accessToken) {
    if (requireAuth) {
      return { authorized: false, error: 'No autenticado' }
    }
    return { authorized: true }
  }

  // Verify access token
  const payload = await verifyAccessToken(accessToken)

  if (!payload) {
    return { authorized: false, error: 'Token inválido o expirado' }
  }

  const user = {
    id: payload.sub,
    role: payload.role,
    businessId: payload.businessId,
  }

  // Check role authorization
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { authorized: false, user, error: 'Permisos insuficientes' }
  }

  // Verify CSRF token for write operations
  if (requireCSRF) {
    const method = request.method.toUpperCase()
    const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

    if (isWriteOperation && !verifyCSRFToken(request)) {
      return { authorized: false, user, error: 'CSRF token inválido' }
    }
  }

  return { authorized: true, user }
}

/**
 * Helper to create authenticated API handler
 */
export function createAuthHandler<T = any>(
  handler: (
    request: NextRequest,
    context: { user: { id: string; role: Role; businessId: string } }
  ) => Promise<NextResponse<T>>,
  options?: {
    allowedRoles?: Role[]
    requireCSRF?: boolean
  }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await withAuth(request, {
      requireAuth: true,
      requireCSRF: options?.requireCSRF ?? true,
      allowedRoles: options?.allowedRoles,
    })

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'No autorizado' },
        { status: authResult.error === 'Permisos insuficientes' ? 403 : 401 }
      )
    }

    if (!authResult.user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 })
    }

    return handler(request, { user: authResult.user })
  }
}

/**
 * Extract user from request (backward compatibility)
 */
export async function getUserFromRequest(
  request: NextRequest
): Promise<{ id: string; role: Role; businessId: string } | null> {
  const accessToken = getAccessToken(request)

  if (!accessToken) {
    return null
  }

  const payload = await verifyAccessToken(accessToken)

  if (!payload) {
    return null
  }

  return {
    id: payload.sub,
    role: payload.role,
    businessId: payload.businessId,
  }
}
