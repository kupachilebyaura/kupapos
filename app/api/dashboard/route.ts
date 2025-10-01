import { NextRequest, NextResponse } from "next/server"

import { requireAuth } from "@/lib/services/auth/middleware"
import { DashboardService } from "@/lib/services/analyticsService"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    const data = await DashboardService.getDashboard(session.user.businessId)
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener el dashboard"
    const status = message === "No autorizado" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
