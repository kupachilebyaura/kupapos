import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireAuth } from "@/lib/services/auth/middleware"
import { CashSessionService } from "@/lib/services/cashSessionService"

const closeSchema = z.object({
  actualAmount: z.coerce.number().nonnegative("El monto contado debe ser positivo"),
  note: z.string().max(280).optional(),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth(request)
    const body = await request.json()
    const payload = closeSchema.parse(body)

    const closed = await CashSessionService.closeSession({
      sessionId: params.id,
      businessId: session.user.businessId,
      userId: session.user.id,
      actualAmount: payload.actualAmount,
      note: payload.note,
    })

    return NextResponse.json({ session: closed })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Error al cerrar la caja"
    const status = message === "No autorizado" ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
