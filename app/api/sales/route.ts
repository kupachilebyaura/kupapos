import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireAuth } from "@/lib/services/auth/middleware"
import { SalesService } from "@/lib/services/salesService"

const createSaleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "El producto es obligatorio"),
        quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
        discount: z.coerce.number().min(0).optional(),
      }),
    )
    .min(1, "La venta requiere al menos un producto"),
  customerId: z.string().min(1).optional(),
  paymentMethod: z.string().min(1, "El método de pago es obligatorio"),
  discount: z.coerce.number().min(0).optional(),
  tip: z.coerce.number().min(0).optional(),
  cashSessionId: z.string().min(1).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    const sales = await SalesService.getSales(session.user.businessId)
    return NextResponse.json({ sales })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener ventas"
    const status = message === "No autorizado" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    const body = await request.json()
    const data = createSaleSchema.parse(body)

    const sale = await SalesService.createSale({
      items: data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        discount: item.discount,
      })),
      customerId: data.customerId,
      paymentMethod: data.paymentMethod,
      businessId: session.user.businessId,
      discount: data.discount,
      tip: data.tip,
      cashSessionId: data.cashSessionId,
    })

    return NextResponse.json({ sale }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Error al crear la venta"
    const status =
      message === "No autorizado"
        ? 401
        : message.includes("Producto") || message.includes("Stock")
          ? 400
          : 500

    return NextResponse.json({ error: message }, { status })
  }
}
