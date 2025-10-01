import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireAuth } from "@/lib/services/auth/middleware"
import { CustomersService } from "@/lib/services/customersService"

const createCustomerSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  rut: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  region: z.string().optional().or(z.literal("")),
  commune: z.string().optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    const customers = await CustomersService.listCustomers(session.user.businessId)
    return NextResponse.json({ customers })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener clientes"
    const status = message === "No autorizado" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    const body = await request.json()
    const payload = createCustomerSchema.parse(body)

    const customer = await CustomersService.createCustomer(session.user.businessId, {
      name: payload.name,
      rut: payload.rut?.trim() || undefined,
      email: payload.email?.trim() || undefined,
      phone: payload.phone?.trim() || undefined,
      address: payload.address?.trim() || undefined,
      region: payload.region?.trim() || undefined,
      commune: payload.commune?.trim() || undefined,
      birthDate: payload.birthDate ? new Date(payload.birthDate) : undefined,
      notes: payload.notes?.trim() || undefined,
    })
    return NextResponse.json({ customer }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Error al crear cliente"
    const status = message === "No autorizado" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
