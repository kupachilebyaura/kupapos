import { Role as PrismaRole, type User as PrismaUser } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

import { prisma } from '@/lib/prisma'
import type { LoginRequest, RegisterRequest } from '@/types/auth'
import type { User } from '@/types/user'

import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  blacklistToken,
  revokeRefreshToken,
  rotateRefreshToken,
} from './tokenService'
import type { AuthResponse } from './types'

const SALT_ROUNDS = 12

const toUserDTO = (user: PrismaUser): User => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  businessId: user.businessId,
  createdAt: user.createdAt.toISOString(),
})

const invalidCredentialsMessage = 'Credenciales inválidas'

export interface SecureAuthResponse extends AuthResponse {
  refreshToken: string
  csrfToken: string
  accessTokenExpiresAt: number
  refreshTokenExpiresAt: number
}

export class AuthServiceSecure {
  /**
   * Login with HttpOnly cookies and CSRF token
   */
  static async login(credentials: LoginRequest): Promise<SecureAuthResponse> {
    const userRecord = await prisma.user.findUnique({
      where: { email: credentials.email },
    })

    if (!userRecord || !userRecord.active) {
      throw new Error(invalidCredentialsMessage)
    }

    const isPasswordValid = await bcrypt.compare(credentials.password, userRecord.passwordHash)

    if (!isPasswordValid) {
      throw new Error(invalidCredentialsMessage)
    }

    const user = toUserDTO(userRecord)

    // Generate access token (15 min)
    const { token: accessToken, expiresAt: accessTokenExpiresAt } = signAccessToken({
      sub: user.id,
      role: user.role,
      businessId: user.businessId,
    })

    // Generate refresh token (7 days, stored in Redis)
    const { token: refreshToken, expiresAt: refreshTokenExpiresAt } = await signRefreshToken(
      user.id
    )

    // Generate CSRF token
    const csrfToken = uuidv4()

    return {
      user,
      token: accessToken,
      expiresAt: new Date(accessTokenExpiresAt).toISOString(),
      refreshToken,
      csrfToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    }
  }

  /**
   * Register new user with secure tokens
   */
  static async register(payload: RegisterRequest): Promise<SecureAuthResponse> {
    const existingUser = await prisma.user.findUnique({ where: { email: payload.email } })

    if (existingUser) {
      throw new Error('El correo electrónico ya está registrado')
    }

    if (!payload.businessName?.trim()) {
      throw new Error('El nombre del negocio es obligatorio')
    }

    const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS)

    const business = await prisma.business.create({
      data: {
        name: payload.businessName,
      },
    })

    const userRecord = await prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name,
        role: (payload.role ?? PrismaRole.ADMIN) as PrismaRole,
        passwordHash,
        businessId: business.id,
      },
    })

    const user = toUserDTO(userRecord)

    // Generate tokens
    const { token: accessToken, expiresAt: accessTokenExpiresAt } = signAccessToken({
      sub: user.id,
      role: user.role,
      businessId: user.businessId,
    })

    const { token: refreshToken, expiresAt: refreshTokenExpiresAt } = await signRefreshToken(
      user.id
    )

    const csrfToken = uuidv4()

    return {
      user,
      token: accessToken,
      expiresAt: new Date(accessTokenExpiresAt).toISOString(),
      refreshToken,
      csrfToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    }
  }

  /**
   * Logout - blacklist access token and revoke refresh token
   */
  static async logout(accessToken: string, refreshToken?: string): Promise<void> {
    // Verify and blacklist access token
    const accessPayload = await verifyAccessToken(accessToken)
    if (accessPayload?.jti) {
      await blacklistToken(accessPayload.jti)
    }

    // Revoke refresh token if provided
    if (refreshToken) {
      const refreshPayload = await verifyRefreshToken(refreshToken)
      if (refreshPayload) {
        await revokeRefreshToken(refreshPayload.sub)
      }
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string
    accessTokenExpiresAt: number
    newRefreshToken: string
    refreshTokenExpiresAt: number
  } | null> {
    // Verify refresh token
    const refreshPayload = await verifyRefreshToken(refreshToken)
    if (!refreshPayload) {
      return null
    }

    // Get user
    const userRecord = await prisma.user.findUnique({
      where: { id: refreshPayload.sub },
    })

    if (!userRecord || !userRecord.active) {
      return null
    }

    // Generate new access token
    const { token: accessToken, expiresAt: accessTokenExpiresAt } = signAccessToken({
      sub: userRecord.id,
      role: userRecord.role,
      businessId: userRecord.businessId,
    })

    // Rotate refresh token (optional but recommended)
    const newRefreshTokenData = await rotateRefreshToken(refreshToken)
    if (!newRefreshTokenData) {
      return null
    }

    return {
      accessToken,
      accessTokenExpiresAt,
      newRefreshToken: newRefreshTokenData.token,
      refreshTokenExpiresAt: newRefreshTokenData.expiresAt,
    }
  }

  /**
   * Get current user from access token
   */
  static async getCurrentUser(accessToken?: string): Promise<User | null> {
    if (!accessToken) {
      return null
    }

    const payload = await verifyAccessToken(accessToken)
    if (!payload) {
      return null
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: payload.sub },
    })

    if (!userRecord || !userRecord.active) {
      return null
    }

    return toUserDTO(userRecord)
  }

  /**
   * Verify token (backward compatibility)
   */
  static async verifyToken(accessToken?: string): Promise<User | null> {
    return this.getCurrentUser(accessToken)
  }
}
