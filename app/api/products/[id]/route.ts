import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireAuth } from "@/lib/services/auth/middleware"
import { ProductsService, type UpdateProductRequest } from "@/lib/services/productsService"

const optionalString = z.string().max(500).optional().or(z.literal(""))

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.coerce.number().nonnegative().optional(),
  stock: z.coerce.number().int().nonnegative().optional(),
  category: z.string().min(1).optional(),
  barcode: z.string().max(64).optional().or(z.literal("")),
  cost: z.coerce.number().nonnegative().optional(),
  minStock: z.coerce.number().int().nonnegative().optional(),
  details: optionalString,
})

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth(request)
    const body = await request.json()
    const parsed = updateProductSchema.parse(body)

    const payload: UpdateProductRequest = {}

    if (parsed.name !== undefined) payload.name = parsed.name
    if (parsed.price !== undefined) payload.price = parsed.price
    if (parsed.stock !== undefined) payload.stock = parsed.stock
    if (parsed.category !== undefined) payload.category = parsed.category
    if (parsed.minStock !== undefined) payload.minStock = parsed.minStock
    if (parsed.cost !== undefined) payload.cost = parsed.cost
    if (parsed.barcode !== undefined) payload.barcode = parsed.barcode.trim() ? parsed.barcode.trim() : null
    if (parsed.details !== undefined) payload.details = parsed.details.trim() ? parsed.details.trim() : null

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No hay cambios para aplicar" }, { status: 400 })
    }

    const product = await ProductsService.updateProduct(params.id, payload, session.user.businessId)
    return NextResponse.json({ product })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Error al actualizar producto"
    const status = message === "No autorizado" ? 401 : message === "Producto no encontrado" ? 404 : 500

    return NextResponse.json({ error: message }, { status })
  }
}
