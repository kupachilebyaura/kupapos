import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireAuth } from "@/lib/services/auth/middleware"
import { UsersService } from "@/lib/services/usersService"

const createUserSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  role: z.enum(["MANAGER", "USER"]),
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const users = await UsersService.listUsers(session.user.businessId)
    return NextResponse.json({ users })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener usuarios"
    const status = message === "No autorizado" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const body = await request.json()
    const payload = createUserSchema.parse(body)

    const user = await UsersService.createUser({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: payload.role,
      businessId: session.user.businessId,
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Error al crear usuario"
    const status = message === "No autorizado" ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
