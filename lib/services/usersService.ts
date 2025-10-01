import { Role } from "@prisma/client"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import bcrypt from "bcryptjs"

import { prisma } from "@/lib/prisma"

const SALT_ROUNDS = 12
const ALLOWED_ROLES: Role[] = [Role.MANAGER, Role.USER]

export interface BusinessUser {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  createdAt: string
}

export interface CreateUserInput {
  name: string
  email: string
  password: string
  role: Role
  businessId: string
}

export interface UpdateUserInput {
  name?: string
  email?: string
  role?: Role
  password?: string
  active?: boolean
}

const toBusinessUser = (user: {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  createdAt: Date
}): BusinessUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  active: user.active,
  createdAt: user.createdAt.toISOString(),
})

const ensureAllowedRole = (role: Role) => {
  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error("Rol no permitido para la creación de usuarios")
  }
}

export class UsersService {
  static async listUsers(businessId: string): Promise<BusinessUser[]> {
    const users = await prisma.user.findMany({
      where: { businessId },
      orderBy: { createdAt: "asc" },
    })

    return users.map(toBusinessUser)
  }

  static async createUser(input: CreateUserInput): Promise<BusinessUser> {
    ensureAllowedRole(input.role)

    const existing = await prisma.user.findUnique({ where: { email: input.email } })
    if (existing) {
      throw new Error("El correo ya se encuentra registrado")
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS)

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        businessId: input.businessId,
      },
    })

    return toBusinessUser(user)
  }

  static async updateUser(businessId: string, userId: string, input: UpdateUserInput): Promise<BusinessUser> {
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user || user.businessId !== businessId) {
      throw new Error("Usuario no encontrado")
    }

    if (user.role === Role.ADMIN) {
      throw new Error("No es posible modificar la cuenta administradora")
    }

    if (input.role) {
      ensureAllowedRole(input.role)
    }

    const data: Record<string, unknown> = {}

    if (input.name !== undefined) data.name = input.name
    if (input.email !== undefined) data.email = input.email
    if (input.role !== undefined) data.role = input.role
    if (input.active !== undefined) data.active = input.active

    if (input.password) {
      data.passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS)
    }

    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data,
      })
      return toBusinessUser(updated)
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        throw new Error("El correo ya se encuentra registrado")
      }
      throw error
    }
  }
}
