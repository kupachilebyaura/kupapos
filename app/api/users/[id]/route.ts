import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireAuth } from "@/lib/services/auth/middleware"
import { UsersService } from "@/lib/services/usersService"

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["MANAGER", "USER"]).optional(),
  password: z.string().min(6).optional(),
  active: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth(request)
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const body = await request.json()
    const payload = updateUserSchema.parse(body)

    const user = await UsersService.updateUser(session.user.businessId, params.id, payload)
    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Error al actualizar usuario"
    const status = message === "No autorizado" ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
