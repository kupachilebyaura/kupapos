import { subDays, startOfDay } from "date-fns"

import { prisma } from "@/lib/prisma"

export interface DashboardStatsItem {
  title: string
  value: string
  change: string
  trend: "up" | "down"
  color: string
  icon: string
}

export interface SalesTrendPoint {
  date: string
  label: string
  total: number
  products: number
}

export interface TopProductSummary {
  id: string
  name: string
  quantity: number
  revenue: number
  category: string
}

export interface RecentSaleSummary {
  id: string
  customerName: string
  total: number
  createdAt: string
  itemsCount: number
}

export interface LowStockProduct {
  id: string
  name: string
  category: string
  stock: number
  threshold: number
  fulfillment: number
}

export interface DashboardData {
  stats: DashboardStatsItem[]
  salesTrend: SalesTrendPoint[]
  topProducts: TopProductSummary[]
  recentSales: RecentSaleSummary[]
  lowStock: LowStockProduct[]
  currency: string
}

export interface ReportData {
  totalSales: number
  orders: number
  averageOrderValue: number
  productsSold: number
  salesTrend: SalesTrendPoint[]
  productPerformance: TopProductSummary[]
  categoryDistribution: Array<{ category: string; value: number }>
  topCustomers: Array<{ id: string; name: string; total: number; orders: number }>
  currency: string
}

const SALES_TREND_DAYS = 7
const LOW_STOCK_THRESHOLD = 5

const createCurrencyFormatter = (currency: string, maximumFractionDigits = 0) => {
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency,
      maximumFractionDigits,
    })
  } catch (error) {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits,
    })
  }
}

const percent = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`

const buildLabel = (date: Date) =>
  date.toLocaleDateString("es-ES", {
    weekday: "short",
  })

export class DashboardService {
  static async getDashboard(businessId: string): Promise<DashboardData> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { currency: true },
    })

    const currencyCode = business?.currency ?? "CLP"
    const currencyFormatter = createCurrencyFormatter(currencyCode)

    const today = startOfDay(new Date())
    const yesterday = subDays(today, 1)
    const trendStart = subDays(today, SALES_TREND_DAYS - 1)

    const [salesToday, salesYesterday, salesForTrend, customersCount, productsForStock] = await Promise.all([
      prisma.sale.findMany({
        where: {
          businessId,
          createdAt: { gte: today },
        },
        include: {
          items: true,
        },
      }),
      prisma.sale.findMany({
        where: {
          businessId,
          createdAt: {
            gte: yesterday,
            lt: today,
          },
        },
      }),
      prisma.sale.findMany({
        where: {
          businessId,
          createdAt: { gte: trendStart },
        },
        include: {
          customer: true,
          items: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.customer.count({ where: { businessId } }),
      prisma.product.findMany({
        where: { businessId },
        orderBy: { stock: "asc" },
        take: 20,
      }),
    ])

    const totalSalesToday = salesToday.reduce((sum, sale) => sum + Number(sale.total), 0)
    const totalSalesYesterday = salesYesterday.reduce((sum, sale) => sum + Number(sale.total), 0)
    const productsSoldToday = salesToday.reduce(
      (sum, sale) => sum + sale.items.reduce((acc, item) => acc + item.quantity, 0),
      0,
    )

    const changeSales =
      totalSalesYesterday > 0
        ? ((totalSalesToday - totalSalesYesterday) / totalSalesYesterday) * 100
        : totalSalesToday > 0
          ? 100
          : 0

    const lowStockProducts = productsForStock
      .filter((product) => {
        const threshold = product.minStock ?? 0
        if (threshold > 0) {
          return product.stock <= threshold
        }
        return product.stock <= LOW_STOCK_THRESHOLD
      })
      .slice(0, 5)

    const stats: DashboardStatsItem[] = [
      {
        title: "Ventas Hoy",
        value: currencyFormatter.format(totalSalesToday),
        change: percent(changeSales),
        trend: changeSales >= 0 ? "up" : "down",
        color: "text-accent",
        icon: "DollarSign",
      },
      {
        title: "Productos Vendidos",
        value: productsSoldToday.toString(),
        change: "",
        trend: "up",
        color: "text-primary",
        icon: "Package",
      },
      {
        title: "Clientes Registrados",
        value: customersCount.toString(),
        change: "",
        trend: "up",
        color: "text-chart-2",
        icon: "Users",
      },
      {
        title: "Stock Bajo",
        value: lowStockProducts.length.toString(),
        change: "",
        trend: "down",
        color: "text-destructive",
        icon: "AlertTriangle",
      },
    ]

    const salesTrendMap = new Map<string, SalesTrendPoint>()
    for (let i = SALES_TREND_DAYS - 1; i >= 0; i -= 1) {
      const date = subDays(today, i)
      const key = date.toISOString().split("T")[0]
      salesTrendMap.set(key, {
        date: key,
        label: buildLabel(date),
        total: 0,
        products: 0,
      })
    }

    const productAccumulator = new Map<string, TopProductSummary>()

    salesForTrend.forEach((sale) => {
      const key = sale.createdAt.toISOString().split("T")[0]
      const entry = salesTrendMap.get(key)
      if (entry) {
        entry.total += Number(sale.total)
        entry.products += sale.items.reduce((sum, item) => sum + item.quantity, 0)
      }

      sale.items.forEach((item) => {
        const current = productAccumulator.get(item.productId)
        const revenue = Number(item.price) * item.quantity
        if (current) {
          current.quantity += item.quantity
          current.revenue += revenue
        } else if (item.product) {
          productAccumulator.set(item.productId, {
            id: item.productId,
            name: item.product.name,
            category: item.product.category,
            quantity: item.quantity,
            revenue,
          })
        }
      })
    })

    const topProducts = Array.from(productAccumulator.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    const recentSales = salesForTrend
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((sale) => ({
        id: sale.id,
        customerName: sale.customerId ? sale.customer?.name ?? "Cliente" : "Venta mostrador",
        total: Number(sale.total),
        createdAt: sale.createdAt.toISOString(),
        itemsCount: sale.items.reduce((sum, item) => sum + item.quantity, 0),
      }))

    const lowStock = lowStockProducts.map((product) => {
      const threshold = product.minStock > 0 ? product.minStock : LOW_STOCK_THRESHOLD
      return {
        id: product.id,
        name: product.name,
        category: product.category,
        stock: product.stock,
        threshold,
        fulfillment: threshold > 0 ? Math.min(100, Math.round((product.stock / threshold) * 100)) : 100,
      }
    })

    return {
      stats,
      salesTrend: Array.from(salesTrendMap.values()),
      topProducts,
      recentSales,
      lowStock,
      currency: currencyCode,
    }
  }
}

export class ReportsService {
  static async getReport(businessId: string, periodDays: number): Promise<ReportData> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { currency: true },
    })

    const currencyCode = business?.currency ?? "CLP"

    const startDate = subDays(startOfDay(new Date()), periodDays - 1)

    const sales = await prisma.sale.findMany({
      where: {
        businessId,
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        items: {
          include: { product: true },
        },
        customer: true,
      },
      orderBy: { createdAt: "asc" },
    })

    const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total), 0)
    const orders = sales.length
    const productsSold = sales.reduce(
      (sum, sale) => sum + sale.items.reduce((acc, item) => acc + item.quantity, 0),
      0,
    )
    const averageOrderValue = orders > 0 ? totalSales / orders : 0

    const salesTrendMap = new Map<string, SalesTrendPoint>()
    sales.forEach((sale) => {
      const key = sale.createdAt.toISOString().split("T")[0]
      const existing = salesTrendMap.get(key)
      if (existing) {
        existing.total += Number(sale.total)
        existing.products += sale.items.reduce((sum, item) => sum + item.quantity, 0)
      } else {
        salesTrendMap.set(key, {
          date: key,
          label: buildLabel(sale.createdAt),
          total: Number(sale.total),
          products: sale.items.reduce((sum, item) => sum + item.quantity, 0),
        })
      }
    })

    const productAccumulator = new Map<string, TopProductSummary>()
    const categoryAccumulator = new Map<string, number>()
    const customerAccumulator = new Map<string, { id: string; name: string; total: number; orders: number }>()

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const revenue = Number(item.price) * item.quantity
        const current = productAccumulator.get(item.productId)
        if (current) {
          current.quantity += item.quantity
          current.revenue += revenue
        } else if (item.product) {
          productAccumulator.set(item.productId, {
            id: item.productId,
            name: item.product.name,
            category: item.product.category,
            quantity: item.quantity,
            revenue,
          })
        }

        if (item.product) {
          categoryAccumulator.set(
            item.product.category,
            (categoryAccumulator.get(item.product.category) ?? 0) + revenue,
          )
        }
      })

      if (sale.customer) {
        const current = customerAccumulator.get(sale.customer.id)
        if (current) {
          current.total += Number(sale.total)
          current.orders += 1
        } else {
          customerAccumulator.set(sale.customer.id, {
            id: sale.customer.id,
            name: sale.customer.name,
            total: Number(sale.total),
            orders: 1,
          })
        }
      }
    })

    return {
      totalSales,
      orders,
      averageOrderValue,
      productsSold,
      salesTrend: Array.from(salesTrendMap.values()).sort((a, b) => (a.date < b.date ? -1 : 1)),
      productPerformance: Array.from(productAccumulator.values()).sort((a, b) => b.quantity - a.quantity),
      categoryDistribution: Array.from(categoryAccumulator.entries()).map(([category, value]) => ({
        category,
        value,
      })),
      topCustomers: Array.from(customerAccumulator.values()).sort((a, b) => b.total - a.total).slice(0, 5),
      currency: currencyCode,
    }
  }
}
