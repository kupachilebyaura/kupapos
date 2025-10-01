import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"

import { prisma } from "@/lib/prisma"
import { normalizeRut } from "@/lib/utils/rut"

export interface CustomerSummary {
  id: string
  name: string
  rut: string | null
  email: string | null
  phone: string | null
  address: string | null
  region: string | null
  commune: string | null
  birthDate: string | null
  notes: string | null
  totalPurchases: number
  purchaseCount: number
  lastPurchase: string | null
  createdAt: string
}

export interface CreateCustomerInput {
  name: string
  rut?: string
  email?: string
  phone?: string
  address?: string
  region?: string
  commune?: string
  birthDate?: Date | string
  notes?: string
}

const toCustomerSummary = (customer: {
  id: string
  name: string
  rut: string | null
  email: string | null
  phone: string | null
  address: string | null
  region: string | null
  commune: string | null
  birthDate: Date | null
  notes: string | null
  createdAt: Date
  sales: Array<{ total: any; createdAt: Date }>
}): CustomerSummary => {
  const totalPurchases = customer.sales.reduce((sum, sale) => sum + Number(sale.total ?? 0), 0)
  const lastPurchase = customer.sales.length
    ? customer.sales
        .map((sale) => sale.createdAt)
        .sort((a, b) => b.getTime() - a.getTime())[0]
        .toISOString()
    : null

  return {
    id: customer.id,
    name: customer.name,
    rut: customer.rut,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    region: customer.region,
    commune: customer.commune,
    birthDate: customer.birthDate ? customer.birthDate.toISOString() : null,
    notes: customer.notes,
    totalPurchases,
    purchaseCount: customer.sales.length,
    lastPurchase,
    createdAt: customer.createdAt.toISOString(),
  }
}

export class CustomersService {
  static async listCustomers(businessId: string): Promise<CustomerSummary[]> {
    const customers = await prisma.customer.findMany({
      where: { businessId },
      include: {
        sales: {
          select: {
            total: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return customers.map(toCustomerSummary)
  }

  static async createCustomer(businessId: string, input: CreateCustomerInput): Promise<CustomerSummary> {
    try {
      const birthDateValue = input.birthDate ? new Date(input.birthDate) : null
      const validBirthDate = birthDateValue && !Number.isNaN(birthDateValue.getTime()) ? birthDateValue : null

      const normalizedRut = input.rut ? normalizeRut(input.rut) : undefined

      const customer = await prisma.customer.create({
        data: {
          name: input.name,
          rut: normalizedRut,
          email: input.email,
          phone: input.phone,
          address: input.address,
          region: input.region,
          commune: input.commune,
          birthDate: validBirthDate,
          notes: input.notes,
          businessId,
        },
        include: {
          sales: {
            select: {
              total: true,
              createdAt: true,
            },
          },
        },
      })

      return toCustomerSummary(customer)
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        const target = Array.isArray(error.meta?.target) ? (error.meta?.target as string[]) : []
        if (target.includes("email")) {
          throw new Error("El correo ya está asociado a otro cliente")
        }
        if (target.includes("rut")) {
          throw new Error("El RUT ya está asociado a otro cliente")
        }
      }
      throw error
    }
  }
}
