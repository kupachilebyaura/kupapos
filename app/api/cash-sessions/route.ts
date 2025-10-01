import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireAuth } from "@/lib/services/auth/middleware"
import { CashSessionService } from "@/lib/services/cashSessionService"

const openSchema = z.object({
  amount: z.coerce.number().nonnegative("El monto inicial debe ser positivo"),
  note: z.string().max(280).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    const sessions = await CashSessionService.listSessions(session.user.businessId)
    return NextResponse.json({ sessions })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener sesiones de caja"
    const status = message === "No autorizado" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    const body = await request.json()
    const payload = openSchema.parse(body)

    const opened = await CashSessionService.openSession({
      businessId: session.user.businessId,
      userId: session.user.id,
      amount: payload.amount,
      note: payload.note,
    })

    return NextResponse.json({ session: opened }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Error al abrir caja"
    const status = message === "No autorizado" ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
