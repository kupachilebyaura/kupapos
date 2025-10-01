import { NextRequest, NextResponse } from "next/server"

import { requireAuth } from "@/lib/services/auth/middleware"
import { ReportsService } from "@/lib/services/analyticsService"

const periodToDays = (period?: string | null) => {
  switch (period) {
    case "7days":
    default:
      return 7
    case "30days":
      return 30
    case "90days":
      return 90
    case "year":
      return 365
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const period = periodToDays(searchParams.get("period"))

    const report = await ReportsService.getReport(session.user.businessId, period)
    return NextResponse.json(report)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener reportes"
    const status = message === "No autorizado" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
