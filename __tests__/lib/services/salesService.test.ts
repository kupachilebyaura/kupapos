import { SalesService } from '@/lib/services/salesService'
import prisma from '@/lib/prisma'

describe('SalesService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getSales', () => {
    it('should return all sales for a business', async () => {
      // Arrange
      const mockSales = [
        {
          id: 'sale-1',
          total: new Prisma.Decimal(10000),
          createdAt: new Date(),
          paymentMethod: 'Efectivo',
          discount: new Prisma.Decimal(0),
          tip: null,
          status: 'COMPLETED',
          voidReason: null,
          voidedAt: null,
          cashSessionId: 'session-1',
          businessId: 'business-123',
          items: [
            {
              productId: 'prod-1',
              quantity: 2,
              price: new Prisma.Decimal(5000),
              discount: new Prisma.Decimal(0),
              product: {
                id: 'prod-1',
                name: 'Product 1',
              },
            },
          ],
          customer: null,
        },
      ]

      jest.spyOn(prisma.sale, 'findMany').mockResolvedValue(mockSales as any)

      // Act
      const result = await SalesService.getSales('business-123')

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('sale-1')
      expect(result[0].total).toBe(10000)
      expect(result[0].items).toHaveLength(1)
      expect(prisma.sale.findMany).toHaveBeenCalledWith({
        where: { businessId: 'business-123' },
        include: {
          items: {
            include: { product: true },
          },
          customer: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('createSale', () => {
    it('should create a sale with valid stock', async () => {
      // Arrange
      const mockBusiness = {
        id: 'business-123',
        blockZeroStock: false,
      }

      const mockProduct = {
        id: 'prod-1',
        name: 'Product 1',
        price: new Prisma.Decimal(5000),
        stock: 10,
        businessId: 'business-123',
      }

      const createRequest = {
        businessId: 'business-123',
        paymentMethod: 'Efectivo',
        items: [
          {
            productId: 'prod-1',
            quantity: 2,
          },
        ],
      }

      jest.spyOn(prisma.business, 'findUnique').mockResolvedValue(mockBusiness as any)
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any)
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(prisma)
      })

      const mockCreatedSale = {
        id: 'sale-1',
        total: new Prisma.Decimal(10000),
        createdAt: new Date(),
        paymentMethod: 'Efectivo',
        discount: new Prisma.Decimal(0),
        tip: null,
        status: 'COMPLETED',
        voidReason: null,
        voidedAt: null,
        cashSessionId: null,
        businessId: 'business-123',
        items: [
          {
            productId: 'prod-1',
            quantity: 2,
            price: new Prisma.Decimal(5000),
            discount: new Prisma.Decimal(0),
            product: mockProduct,
          },
        ],
        customer: null,
      }

      jest.spyOn(prisma.sale, 'create').mockResolvedValue(mockCreatedSale as any)
      jest.spyOn(prisma.sale, 'findUnique').mockResolvedValue(mockCreatedSale as any)

      // Act
      const result = await SalesService.createSale(createRequest)

      // Assert
      expect(result.id).toBe('sale-1')
      expect(result.total).toBe(10000)
    })

    it('should throw error when product not found', async () => {
      // Arrange
      const mockBusiness = {
        id: 'business-123',
        blockZeroStock: false,
      }

      const createRequest = {
        businessId: 'business-123',
        paymentMethod: 'Efectivo',
        items: [
          {
            productId: 'non-existent-prod',
            quantity: 2,
          },
        ],
      }

      jest.spyOn(prisma.business, 'findUnique').mockResolvedValue(mockBusiness as any)
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(null)

      // Act & Assert
      await expect(SalesService.createSale(createRequest)).rejects.toThrow(
        'Producto con ID non-existent-prod no encontrado'
      )
    })

    it('should throw error when stock is insufficient and blockZeroStock is true', async () => {
      // Arrange
      const mockBusiness = {
        id: 'business-123',
        blockZeroStock: true,
      }

      const mockProduct = {
        id: 'prod-1',
        name: 'Product 1',
        price: new Prisma.Decimal(5000),
        stock: 1,
        businessId: 'business-123',
      }

      const createRequest = {
        businessId: 'business-123',
        paymentMethod: 'Efectivo',
        items: [
          {
            productId: 'prod-1',
            quantity: 5, // More than available
          },
        ],
      }

      jest.spyOn(prisma.business, 'findUnique').mockResolvedValue(mockBusiness as any)
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any)

      // Act & Assert
      await expect(SalesService.createSale(createRequest)).rejects.toThrow(
        'Stock insuficiente para Product 1'
      )
    })
  })

  describe('voidSale', () => {
    it('should void a sale and return stock', async () => {
      // Arrange
      const mockSale = {
        id: 'sale-1',
        businessId: 'business-123',
        status: 'COMPLETED',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            quantity: 2,
          },
        ],
      }

      const voidRequest = {
        saleId: 'sale-1',
        businessId: 'business-123',
        reason: 'Customer request',
        userId: 'user-1',
      }

      jest.spyOn(prisma.sale, 'findUnique').mockResolvedValue(mockSale as any)
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(prisma)
      })
      jest.spyOn(prisma.sale, 'update').mockResolvedValue({
        ...mockSale,
        status: 'VOIDED',
        voidReason: 'Customer request',
        voidedById: 'user-1',
        voidedAt: new Date(),
      } as any)

      // Act
      await SalesService.voidSale(voidRequest)

      // Assert
      expect(prisma.sale.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sale-1' },
          data: expect.objectContaining({
            status: 'VOIDED',
            voidReason: 'Customer request',
            voidedById: 'user-1',
          }),
        })
      )
    })

    it('should throw error when sale not found', async () => {
      // Arrange
      const voidRequest = {
        saleId: 'non-existent-sale',
        businessId: 'business-123',
        userId: 'user-1',
      }

      jest.spyOn(prisma.sale, 'findUnique').mockResolvedValue(null)

      // Act & Assert
      await expect(SalesService.voidSale(voidRequest)).rejects.toThrow('Venta no encontrada')
    })

    it('should throw error when sale is already voided', async () => {
      // Arrange
      const mockVoidedSale = {
        id: 'sale-1',
        businessId: 'business-123',
        status: 'VOIDED',
      }

      const voidRequest = {
        saleId: 'sale-1',
        businessId: 'business-123',
        userId: 'user-1',
      }

      jest.spyOn(prisma.sale, 'findUnique').mockResolvedValue(mockVoidedSale as any)

      // Act & Assert
      await expect(SalesService.voidSale(voidRequest)).rejects.toThrow('La venta ya está anulada')
    })
  })
})

// Import Prisma Decimal for tests
import { Prisma } from '@prisma/client'
