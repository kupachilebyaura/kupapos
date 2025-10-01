import { NextRequest, NextResponse } from "next/server"

import { AuthService } from "@/lib/services/auth/authService"
import type { LoginRequest } from "@/types/auth"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginRequest
    const authResponse = await AuthService.login(body)
    return NextResponse.json(authResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al iniciar sesión"
    const status = message === "Credenciales inválidas" ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
