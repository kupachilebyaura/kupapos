import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireAuth } from "@/lib/services/auth/middleware"
import { ProductsService } from "@/lib/services/productsService"

const createProductSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  price: z.coerce.number().nonnegative("El precio debe ser positivo"),
  stock: z.coerce.number().int().nonnegative("El stock debe ser igual o mayor a 0"),
  category: z.string().min(1, "La categoría es obligatoria"),
  barcode: z.string().min(1).max(64).optional().or(z.literal("")),
  cost: z.coerce.number().nonnegative().optional(),
  minStock: z.coerce.number().int().nonnegative("El stock mínimo debe ser igual o mayor a 0"),
  details: z.string().max(500).optional().or(z.literal("")),
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    const products = await ProductsService.getProducts(session.user.businessId)
    return NextResponse.json({ products })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener productos"
    const status = message === "No autorizado" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    const body = await request.json()
    const data = createProductSchema.parse(body)

    const product = await ProductsService.createProduct({
      name: data.name,
      price: data.price,
      stock: data.stock,
      category: data.category,
      barcode: data.barcode?.trim() ? data.barcode.trim() : undefined,
      cost: data.cost,
      minStock: data.minStock,
      details: data.details?.trim() ? data.details.trim() : undefined,
      businessId: session.user.businessId,
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Error al crear producto"
    const status = message === "No autorizado" ? 401 : 500

    return NextResponse.json({ error: message }, { status })
  }
}
