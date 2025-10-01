import { Prisma, $Enums } from "@prisma/client"

import { prisma } from "@/lib/prisma"

export interface CashSessionResponse {
  id: string
  businessId: string
  openedById: string
  closedById?: string | null
  openingAmount: number
  closingAmount?: number | null
  expectedAmount?: number | null
  difference?: number | null
  openingNote?: string | null
  closingNote?: string | null
  status: $Enums.CashSessionStatus
  openedAt: Date
  closedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface OpenCashSessionInput {
  businessId: string
  userId: string
  amount: number
  note?: string
}

export interface CloseCashSessionInput {
  sessionId: string
  businessId: string
  userId: string
  actualAmount: number
  note?: string
}

type CashSessionEntity = Prisma.CashSessionGetPayload<{}>

const toResponse = (session: CashSessionEntity) => ({
  id: session.id,
  businessId: session.businessId,
  openedById: session.openedById,
  closedById: session.closedById,
  openingAmount: Number(session.openingAmount),
  closingAmount: session.closingAmount ? Number(session.closingAmount) : null,
  expectedAmount: session.expectedAmount ? Number(session.expectedAmount) : null,
  difference: session.difference ? Number(session.difference) : null,
  openingNote: session.openingNote,
  closingNote: session.closingNote,
  status: session.status,
  openedAt: session.openedAt,
  closedAt: session.closedAt,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
})

export class CashSessionService {
  static async listSessions(businessId: string): Promise<CashSessionResponse[]> {
    const sessions = await prisma.cashSession.findMany({
      where: { businessId },
      orderBy: { openedAt: "desc" },
    })

    return sessions.map(toResponse)
  }

  static async openSession(input: OpenCashSessionInput): Promise<CashSessionResponse> {
  const existing = await prisma.cashSession.findFirst({
      where: {
        businessId: input.businessId,
        status: $Enums.CashSessionStatus.OPEN,
      },
    })

    if (existing) {
      throw new Error("Ya existe una caja abierta. Debes cerrarla antes de abrir una nueva.")
    }

    const session = await prisma.cashSession.create({
      data: {
        businessId: input.businessId,
        openedById: input.userId,
        openingAmount: input.amount,
        openingNote: input.note ?? null,
      },
    })

    return toResponse(session)
  }

  static async closeSession(input: CloseCashSessionInput): Promise<CashSessionResponse> {
    const session = await prisma.cashSession.findUnique({
      where: { id: input.sessionId },
      include: {
        sales: {
          where: {
            status: $Enums.SaleStatus.COMPLETED,
            cashSessionId: input.sessionId,
          },
        },
      },
    })

    if (!session || session.businessId !== input.businessId) {
      throw new Error("Sesión de caja no encontrada")
    }

    if (session.status !== $Enums.CashSessionStatus.OPEN) {
      throw new Error("La sesión ya se encuentra cerrada")
    }

    const expected = session.sales.reduce((sum: number, sale) => sum + Number(sale.total), 0)
    const difference = input.actualAmount - expected

    const updated = await prisma.cashSession.update({
      where: { id: input.sessionId },
      data: {
        closedById: input.userId,
        closingAmount: input.actualAmount,
        expectedAmount: expected,
        difference,
        closingNote: input.note ?? null,
        closedAt: new Date(),
        status: $Enums.CashSessionStatus.CLOSED,
      },
    })

    return toResponse(updated)
  }
}
