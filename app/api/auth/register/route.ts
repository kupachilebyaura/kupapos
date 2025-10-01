import { NextRequest, NextResponse } from "next/server"

import { AuthService } from "@/lib/services/auth/authService"
import type { RegisterRequest } from "@/types/auth"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterRequest
    const authResponse = await AuthService.register(body)
    return NextResponse.json(authResponse, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al registrar usuario"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
