import jwt, { type JwtPayload, type Secret } from "jsonwebtoken"

import type { Role } from "@/types/user"

const TOKEN_TTL_SECONDS = 60 * 60 // 1 hour

interface AuthTokenPayload {
  sub: string
  role: Role
  businessId: string
}

const AUTH_SECRET: Secret = (() => {
  const value = process.env.AUTH_SECRET
  if (!value) {
    throw new Error("AUTH_SECRET no está definido. Añádelo al archivo .env")
  }
  return value
})()

const isValidRole = (value: unknown): value is Role =>
  typeof value === "string" && ["ADMIN", "MANAGER", "USER"].includes(value)

export function signAuthToken(payload: AuthTokenPayload): { token: string; expiresAt: string } {
  const token = jwt.sign(payload, AUTH_SECRET, {
    expiresIn: TOKEN_TTL_SECONDS,
  })

  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString()

  return { token, expiresAt }
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, AUTH_SECRET)

    if (typeof decoded !== "object" || decoded === null) {
      return null
    }

    const payload = decoded as JwtPayload
    const { sub, businessId, role } = payload

    if (typeof sub !== "string" || typeof businessId !== "string" || !isValidRole(role)) {
      return null
    }

    return { sub, businessId, role }
  } catch (error) {
    return null
  }
}
