import { Role as PrismaRole, type User as PrismaUser } from "@prisma/client"
import bcrypt from "bcryptjs"

import { prisma } from "@/lib/prisma"
import type { LoginRequest, RegisterRequest } from "@/types/auth"
import type { User } from "@/types/user"

import { signAuthToken, verifyAuthToken } from "./token"
import type { AuthResponse } from "./types"

const SALT_ROUNDS = 12

const toUserDTO = (user: PrismaUser): User => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  businessId: user.businessId,
  createdAt: user.createdAt.toISOString(),
})

const invalidCredentialsMessage = "Credenciales inválidas"

export class AuthService {
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
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
    const { token, expiresAt } = signAuthToken({
      sub: user.id,
      role: user.role,
      businessId: user.businessId,
    })

    return { user, token, expiresAt }
  }

  static async register(payload: RegisterRequest): Promise<AuthResponse> {
    const existingUser = await prisma.user.findUnique({ where: { email: payload.email } })

    if (existingUser) {
      throw new Error("El correo electrónico ya está registrado")
    }

    if (!payload.businessName?.trim()) {
      throw new Error("El nombre del negocio es obligatorio")
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
    const { token, expiresAt } = signAuthToken({
      sub: user.id,
      role: user.role,
      businessId: user.businessId,
    })

    return { user, token, expiresAt }
  }

  static async logout(_token?: string): Promise<void> {
    return
  }

  static async getCurrentUser(token?: string): Promise<User | null> {
    return this.verifyToken(token)
  }

  static async verifyToken(token?: string): Promise<User | null> {
    if (!token) {
      return null
    }

    const payload = verifyAuthToken(token)

    if (!payload) {
      return null
    }

    const userRecord = await prisma.user.findUnique({ where: { id: payload.sub } })

    if (!userRecord || !userRecord.active) {
      return null
    }

    return toUserDTO(userRecord)
  }
}
