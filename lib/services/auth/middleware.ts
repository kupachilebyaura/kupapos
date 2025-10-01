import { NextRequest } from "next/server"

import type { AuthSession } from "@/types/auth"

import { AuthService } from "./authService"

export async function requireAuth(request: NextRequest): Promise<AuthSession> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "")

  if (!token) {
    throw new Error("No autorizado")
  }

  const user = await AuthService.verifyToken(token)

  if (!user) {
    throw new Error("No autorizado")
  }

  return {
    user,
    token,
  }
}
