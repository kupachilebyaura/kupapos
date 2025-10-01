import jwt, { type JwtPayload, type Secret } from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { redis, RedisKeys } from '@/lib/redis'
import type { Role } from '@/types/user'

/**
 * Token Service with Refresh Tokens and Blacklist
 * -----------------------------------------------
 * - Access tokens: 15 minutes (short-lived)
 * - Refresh tokens: 7 days (stored in Redis)
 * - Blacklist support for logout
 * - Token rotation on refresh
 */

const ACCESS_TOKEN_TTL = 15 * 60 // 15 minutes in seconds
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 // 7 days in seconds

export interface AuthTokenPayload {
  sub: string // User ID
  role: Role
  businessId: string
  jti?: string // JWT ID for blacklisting
}

export interface RefreshTokenPayload {
  sub: string // User ID
  tokenId: string // Unique token ID
  type: 'refresh'
}

const AUTH_SECRET: Secret = (() => {
  const value = process.env.JWT_SECRET || process.env.AUTH_SECRET
  if (!value) {
    throw new Error('JWT_SECRET is not defined. Add it to .env file')
  }
  return value
})()

const isValidRole = (value: unknown): value is Role =>
  typeof value === 'string' && ['ADMIN', 'MANAGER', 'USER'].includes(value)

/**
 * Sign access token (short-lived)
 */
export function signAccessToken(payload: Omit<AuthTokenPayload, 'jti'>): {
  token: string
  expiresAt: number
  jti: string
} {
  const jti = uuidv4()
  const expiresAt = Date.now() + ACCESS_TOKEN_TTL * 1000

  const token = jwt.sign(
    {
      ...payload,
      jti,
    },
    AUTH_SECRET,
    {
      expiresIn: ACCESS_TOKEN_TTL,
    }
  )

  return { token, expiresAt, jti }
}

/**
 * Sign refresh token (long-lived, stored in Redis)
 */
export async function signRefreshToken(userId: string): Promise<{
  token: string
  expiresAt: number
  tokenId: string
}> {
  const tokenId = uuidv4()
  const expiresAt = Date.now() + REFRESH_TOKEN_TTL * 1000

  const payload: RefreshTokenPayload = {
    sub: userId,
    tokenId,
    type: 'refresh',
  }

  const token = jwt.sign(payload, AUTH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  })

  // Store refresh token in Redis with expiration
  await redis.setex(RedisKeys.refreshToken(userId), REFRESH_TOKEN_TTL, tokenId)

  return { token, expiresAt, tokenId }
}

/**
 * Verify access token
 */
export async function verifyAccessToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const decoded = jwt.verify(token, AUTH_SECRET)

    if (typeof decoded !== 'object' || decoded === null) {
      return null
    }

    const payload = decoded as JwtPayload
    const { sub, businessId, role, jti } = payload

    if (typeof sub !== 'string' || typeof businessId !== 'string' || !isValidRole(role)) {
      return null
    }

    // Check if token is blacklisted
    if (jti) {
      const isBlacklisted = await isTokenBlacklisted(jti)
      if (isBlacklisted) {
        return null
      }
    }

    return { sub, businessId, role, jti }
  } catch (error) {
    return null
  }
}

/**
 * Verify refresh token
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const decoded = jwt.verify(token, AUTH_SECRET)

    if (typeof decoded !== 'object' || decoded === null) {
      return null
    }

    const payload = decoded as JwtPayload
    const { sub, tokenId, type } = payload

    if (typeof sub !== 'string' || typeof tokenId !== 'string' || type !== 'refresh') {
      return null
    }

    // Verify token exists in Redis and matches
    const storedTokenId = await redis.get(RedisKeys.refreshToken(sub))
    if (storedTokenId !== tokenId) {
      return null
    }

    return { sub, tokenId, type }
  } catch (error) {
    return null
  }
}

/**
 * Blacklist a token (for logout)
 */
export async function blacklistToken(jti: string, ttl: number = ACCESS_TOKEN_TTL): Promise<void> {
  await redis.setex(RedisKeys.tokenBlacklist(jti), ttl, 'blacklisted')
}

/**
 * Check if token is blacklisted
 */
export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const result = await redis.get(RedisKeys.tokenBlacklist(jti))
  return result !== null
}

/**
 * Revoke refresh token (delete from Redis)
 */
export async function revokeRefreshToken(userId: string): Promise<void> {
  await redis.del(RedisKeys.refreshToken(userId))
}

/**
 * Rotate refresh token (for enhanced security)
 */
export async function rotateRefreshToken(oldToken: string): Promise<{
  token: string
  expiresAt: number
  tokenId: string
} | null> {
  // Verify old token
  const oldPayload = await verifyRefreshToken(oldToken)
  if (!oldPayload) {
    return null
  }

  // Revoke old token
  await revokeRefreshToken(oldPayload.sub)

  // Issue new token
  return await signRefreshToken(oldPayload.sub)
}

// Backward compatibility exports
export const signAuthToken = signAccessToken
export const verifyAuthToken = verifyAccessToken
