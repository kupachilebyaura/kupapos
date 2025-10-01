import { Prisma, $Enums } from "@prisma/client"

import { prisma } from "@/lib/prisma"

export interface Customer {
  id: string
  name: string
  email?: string
}

export interface SaleItem {
  productId: string
  name: string
  quantity: number
  price: number
  discount: number
}

export interface SaleResponse {
  id: string
  total: number
  items: SaleItem[]
  customer?: Customer
  createdAt: Date
  paymentMethod?: string | null
  discount: number
  tip?: number | null
  status: $Enums.SaleStatus
  voidReason?: string | null
  voidedAt?: Date | null
  cashSessionId?: string | null
}

export interface CreateSaleRequest {
  items: Array<{
    productId: string
    quantity: number
    discount?: number
  }>
  customerId?: string
  businessId: string
  paymentMethod: string
  discount?: number
  tip?: number
  cashSessionId?: string
  voidReason?: string
}

export interface VoidSaleRequest {
  saleId: string
  businessId: string
  reason?: string
  userId: string
}

type SaleWithRelations = Prisma.SaleGetPayload<{
  include: {
    items: {
      include: { product: true }
    }
    customer: true
  }
}>

const mapSale = (sale: SaleWithRelations): SaleResponse => ({
  id: sale.id,
  total: Number(sale.total),
  createdAt: sale.createdAt,
  paymentMethod: sale.paymentMethod,
  discount: Number(sale.discount),
  tip: sale.tip ? Number(sale.tip) : null,
  status: sale.status,
  voidReason: sale.voidReason,
  voidedAt: sale.voidedAt ?? null,
  cashSessionId: sale.cashSessionId ?? null,
  customer: sale.customer
    ? {
        id: sale.customer.id,
        name: sale.customer.name,
        email: sale.customer.email ?? undefined,
      }
    : undefined,
  items: sale.items.map((item) => ({
    productId: item.productId,
    name: item.product.name,
    quantity: item.quantity,
    price: Number(item.price),
    discount: Number(item.discount),
  })),
})

export class SalesService {
  static async getSales(businessId?: string): Promise<SaleResponse[]> {
    const sales = await prisma.sale.findMany({
      where: businessId ? { businessId } : undefined,
      include: {
        items: {
          include: { product: true },
        },
        customer: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return sales.map(mapSale)
  }

  static async getSaleById(id: string): Promise<SaleResponse | undefined> {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
        customer: true,
      },
    })

    return sale ? mapSale(sale) : undefined
  }

  static async createSale(data: CreateSaleRequest): Promise<SaleResponse> {
    if (data.items.length === 0) {
      throw new Error("La venta debe contener al menos un producto")
    }

    if (!data.paymentMethod) {
      throw new Error("El método de pago es obligatorio")
    }

    const business = await prisma.business.findUnique({
      where: { id: data.businessId },
      select: { blockZeroStock: true },
    })

    if (!business) {
      throw new Error("Negocio no encontrado")
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: data.items.map((item) => item.productId) },
      },
    })

    if (products.length !== data.items.length) {
      throw new Error("Algunos productos no existen")
    }

    const itemsWithPricing: SaleItem[] = data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)

      if (!product) {
        throw new Error("Producto no encontrado")
      }

      if (product.businessId !== data.businessId) {
        throw new Error(`El producto ${product.name} no pertenece al negocio actual`)
      }

      if (product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para el producto ${product.name}`)
      }

      if (business.blockZeroStock && product.stock - item.quantity < 0) {
        throw new Error(`No es posible vender el producto ${product.name}: stock insuficiente`)
      }

      const unitPrice = Number(product.price)
      const itemDiscount = Number(item.discount ?? 0)

      if (itemDiscount < 0) {
        throw new Error(`El descuento del producto ${product.name} no puede ser negativo`)
      }

      if (itemDiscount > unitPrice * item.quantity) {
        throw new Error(`El descuento del producto ${product.name} excede el total de la línea`)
      }

      return {
        productId: product.id,
        quantity: item.quantity,
        price: unitPrice,
        name: product.name,
        discount: itemDiscount,
      }
    })

    const saleDiscount = Number(data.discount ?? 0)
    const tipValue = data.tip !== undefined ? Number(data.tip) : undefined

    const itemsTotal = itemsWithPricing.reduce(
      (sum, item) => sum + (item.price * item.quantity - item.discount),
      0,
    )

    const total = itemsTotal - saleDiscount + (tipValue ?? 0)

    if (total < 0) {
      throw new Error("El total de la venta no puede ser negativo")
    }

    const sale = await prisma.$transaction(async (tx) => {
      if (data.cashSessionId) {
        const session = await tx.cashSession.findUnique({
          where: { id: data.cashSessionId },
        })

        if (
          !session ||
          session.businessId !== data.businessId ||
          session.status !== $Enums.CashSessionStatus.OPEN
        ) {
          throw new Error("La caja seleccionada no está disponible")
        }
      }

      const createdSale = await tx.sale.create({
        data: {
          businessId: data.businessId,
          customerId: data.customerId ?? null,
          total,
          paymentMethod: data.paymentMethod,
          discount: saleDiscount,
          tip: tipValue,
          cashSessionId: data.cashSessionId ?? null,
          items: {
            create: itemsWithPricing.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              discount: item.discount,
            })),
          },
        },
        include: {
          items: {
            include: { product: true },
          },
          customer: true,
        },
      })

      await Promise.all(
        itemsWithPricing.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { decrement: item.quantity },
            },
          }),
        ),
      )

      return createdSale
    })

    return mapSale(sale)
  }

  static async voidSale(request: VoidSaleRequest): Promise<SaleResponse> {
    const sale = await prisma.sale.findUnique({
      where: { id: request.saleId },
      include: {
        items: true,
      },
    })

    if (!sale || sale.businessId !== request.businessId) {
      throw new Error("Venta no encontrada")
    }

    if (sale.status === $Enums.SaleStatus.VOIDED) {
      throw new Error("La venta ya fue anulada")
    }

    const updated = await prisma.$transaction(async (tx) => {
      await Promise.all(
        sale.items.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
            },
          }),
        ),
      )

      const voided = await tx.sale.update({
        where: { id: request.saleId },
        data: {
          status: $Enums.SaleStatus.VOIDED,
          voidReason: request.reason ?? null,
          voidedAt: new Date(),
          voidedById: request.userId,
        },
        include: {
          items: {
            include: { product: true },
          },
          customer: true,
          cashSession: true,
        },
      })

      return voided
    })

    return mapSale(updated)
  }
}
