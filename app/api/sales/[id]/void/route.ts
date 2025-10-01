import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireAuth } from "@/lib/services/auth/middleware"
import { SalesService } from "@/lib/services/salesService"

const voidSchema = z.object({
  reason: z.string().max(280).optional(),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth(request)
    const body = await request.json().catch(() => ({}))
    const payload = voidSchema.parse(body)

    const sale = await SalesService.voidSale({
      saleId: params.id,
      businessId: session.user.businessId,
      userId: session.user.id,
      reason: payload.reason,
    })

    return NextResponse.json({ sale })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Error al anular la venta"
    const status = message === "No autorizado" ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
