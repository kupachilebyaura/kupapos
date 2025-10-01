import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireAuth } from "@/lib/services/auth/middleware"
import { BusinessService } from "@/lib/services/businessService"

const updateBusinessSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  taxId: z.string().nullable().optional(),
  currency: z.string().length(3).optional(),
  taxName: z.string().min(1).optional(),
  taxRate: z.number().nonnegative().optional(),
  includeTaxInPrice: z.boolean().optional(),
  notifyLowStock: z.boolean().optional(),
  notifyDailyReports: z.boolean().optional(),
  notifyNewCustomers: z.boolean().optional(),
  notifySystemUpdates: z.boolean().optional(),
  paymentMethods: z.array(z.string().min(1)).optional(),
  blockZeroStock: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    const business = await BusinessService.getBusiness(session.user.businessId)
    return NextResponse.json({ business })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener configuración"
    const status = message === "No autorizado" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    const body = await request.json()
    const payload = updateBusinessSchema.parse(body)

    const business = await BusinessService.updateBusiness(session.user.businessId, payload)
    return NextResponse.json({ business })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Error al actualizar configuración"
    const status = message === "No autorizado" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
