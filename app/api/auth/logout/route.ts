import { NextRequest, NextResponse } from "next/server"

import { AuthService } from "@/lib/services/auth/authService"

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? undefined
    await AuthService.logout(token)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al cerrar sesión"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
