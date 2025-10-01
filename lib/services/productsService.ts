import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"

import { prisma } from "@/lib/prisma"

export interface ProductResponse {
  id: string
  name: string
  price: number
  stock: number
  category: string
  barcode?: string | null
  cost?: number | null
  minStock: number
  details?: string | null
}

export interface CreateProductRequest {
  name: string
  price: number
  stock: number
  category: string
  barcode?: string
  cost?: number
  minStock: number
  details?: string
  businessId: string
}

export interface UpdateProductRequest {
  name?: string
  price?: number
  stock?: number
  category?: string
  barcode?: string | null
  cost?: number | null
  minStock?: number
  details?: string | null
}

const toProductResponse = (product: {
  id: string
  name: string
  price: any
  stock: number
  category: string
  barcode: string | null
  cost: any | null
  minStock: number
  details: string | null
}): ProductResponse => ({
  id: product.id,
  name: product.name,
  price: Number(product.price),
  stock: product.stock,
  category: product.category,
  barcode: product.barcode,
  cost: product.cost !== null ? Number(product.cost) : null,
  minStock: product.minStock,
  details: product.details,
})

const normalizePrefix = (name: string | null | undefined) => {
  const letter = name?.trim().charAt(0) ?? "P"
  const normalized = letter.normalize("NFD").replace(/[^a-zA-Z]/g, "").toUpperCase()
  return normalized || "P"
}

const parseSequential = (id: string, prefix: string) => {
  const suffix = id.slice(prefix.length)
  const parsed = Number.parseInt(suffix, 10)
  return Number.isNaN(parsed) ? -1 : parsed
}

const PRODUCT_SEQUENCE_LENGTH = 5

export class ProductsService {
  static async getProducts(businessId?: string): Promise<ProductResponse[]> {
    const products = await prisma.product.findMany({
      where: businessId ? { businessId } : undefined,
      orderBy: { name: "asc" },
    })

    return products.map(toProductResponse)
  }

  static async createProduct(data: CreateProductRequest): Promise<ProductResponse> {
    return prisma.$transaction(async (tx) => {
      const business = await tx.business.findUnique({ where: { id: data.businessId }, select: { name: true } })

      if (!business) {
        throw new Error("Negocio no encontrado")
      }

      const prefix = normalizePrefix(business.name)
      const lastProduct = await tx.product.findFirst({
        where: {
          businessId: data.businessId,
          id: { startsWith: prefix },
        },
        orderBy: { id: "desc" },
        select: { id: true },
      })

      const nextNumber = lastProduct ? parseSequential(lastProduct.id, prefix) + 1 : 0
      const newId = `${prefix}${Math.max(nextNumber, 0).toString().padStart(PRODUCT_SEQUENCE_LENGTH, "0")}`

      const product = await tx.product.create({
        data: {
          id: newId,
          name: data.name,
          price: data.price,
          stock: data.stock,
          category: data.category,
          barcode: data.barcode,
          cost: data.cost ?? null,
          minStock: data.minStock,
          details: data.details,
          businessId: data.businessId,
        },
      })

      return toProductResponse(product)
    })
  }

  static async updateProduct(id: string, data: UpdateProductRequest, businessId?: string): Promise<ProductResponse> {
    try {
      if (businessId) {
        const product = await prisma.product.findUnique({ where: { id } })

        if (!product || product.businessId !== businessId) {
          throw new Error("Producto no encontrado")
        }
      }

      const product = await prisma.product.update({
        where: { id },
        data,
      })

      return toProductResponse(product)
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2025") {
        throw new Error("Producto no encontrado")
      }

      throw error
    }
  }
}
