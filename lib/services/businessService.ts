import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

export interface BusinessDetails {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  taxId: string | null
  currency: string
  taxName: string
  taxRate: number
  includeTaxInPrice: boolean
  notifyLowStock: boolean
  notifyDailyReports: boolean
  notifyNewCustomers: boolean
  notifySystemUpdates: boolean
  paymentMethods: string[]
  blockZeroStock: boolean
  createdAt: string
}

export interface UpdateBusinessInput {
  name?: string
  address?: string | null
  phone?: string | null
  email?: string | null
  taxId?: string | null
  currency?: string
  taxName?: string
  taxRate?: number
  includeTaxInPrice?: boolean
  notifyLowStock?: boolean
  notifyDailyReports?: boolean
  notifyNewCustomers?: boolean
  notifySystemUpdates?: boolean
  paymentMethods?: string[]
  blockZeroStock?: boolean
}

type BusinessEntity = Prisma.BusinessGetPayload<{}>

const toBusinessDetails = (business: BusinessEntity): BusinessDetails => ({
  id: business.id,
  name: business.name,
  address: business.address,
  phone: business.phone,
  email: business.email,
  taxId: business.taxId,
  currency: business.currency,
  taxName: business.taxName,
  taxRate: Number(business.taxRate),
  includeTaxInPrice: business.includeTaxInPrice,
  notifyLowStock: business.notifyLowStock,
  notifyDailyReports: business.notifyDailyReports,
  notifyNewCustomers: business.notifyNewCustomers,
  notifySystemUpdates: business.notifySystemUpdates,
  paymentMethods: business.paymentMethods ?? [],
  blockZeroStock: business.blockZeroStock,
  createdAt: business.createdAt.toISOString(),
})

export class BusinessService {
  static async getBusiness(businessId: string): Promise<BusinessDetails> {
    const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } })
    return toBusinessDetails(business)
  }

  static async updateBusiness(businessId: string, input: UpdateBusinessInput): Promise<BusinessDetails> {
    const business = await prisma.business.update({
      where: { id: businessId },
      data: {
        ...input,
        taxRate: input.taxRate !== undefined ? input.taxRate : undefined,
        paymentMethods: input.paymentMethods !== undefined ? input.paymentMethods : undefined,
        blockZeroStock: input.blockZeroStock !== undefined ? input.blockZeroStock : undefined,
      },
    })

    return toBusinessDetails(business)
  }
}
