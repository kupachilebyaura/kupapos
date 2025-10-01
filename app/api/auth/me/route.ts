import { NextRequest, NextResponse } from "next/server"

import { requireAuth } from "@/lib/services/auth/middleware"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request)

    if (!session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    return NextResponse.json({ user: session.user })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener la sesión"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
