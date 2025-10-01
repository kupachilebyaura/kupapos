"use client"

import { useEffect, useMemo, useState, type ComponentType } from "react"

import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  Plus,
  AlertTriangle,
  Calendar,
  Clock,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useRouter } from "next/navigation"

import { fetchWithAuth, getStoredAuthSession } from "@/lib/client/auth"

interface DashboardStatsItem {
  title: string
  value: string
  change: string
  trend: "up" | "down"
  color: string
  icon: string
}

interface SalesTrendPoint {
  date: string
  label: string
  total: number
  products: number
}

interface TopProductSummary {
  id: string
  name: string
  category: string
  quantity: number
  revenue: number
}

interface RecentSaleSummary {
  id: string
  customerName: string
  total: number
  createdAt: string
  itemsCount: number
}

interface LowStockProduct {
  id: string
  name: string
  category: string
  stock: number
  threshold: number
  fulfillment: number
}

interface DashboardResponse {
  stats: DashboardStatsItem[]
  salesTrend: SalesTrendPoint[]
  topProducts: TopProductSummary[]
  recentSales: RecentSaleSummary[]
  lowStock: LowStockProduct[]
  currency: string
}

const createFormatter = (currencyCode: string) => {
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: currencyCode })
  } catch (error) {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" })
  }
}

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  DollarSign,
  Package,
  Users,
  AlertTriangle,
}

export default function Dashboard() {
  const router = useRouter()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const session = getStoredAuthSession()
    if (!session) {
      router.replace("/")
    }
  }, [router])

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        setErrorMessage(null)
        const response = await fetchWithAuth<DashboardResponse>("/api/dashboard")
        setData(response)
      } catch (error) {
        const message = error instanceof Error ? error.message : "No fue posible cargar el dashboard"
        setErrorMessage(message)
        if (message === "No autorizado" || message === "Sesión expirada") {
          router.replace("/")
        }
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [router])

  const currencyFormatter = useMemo(() => createFormatter(data?.currency ?? "CLP"), [data?.currency])

  const chartData = useMemo(() => {
    return data?.salesTrend.map((point) => ({
      name: point.label,
      ventas: point.total,
      productos: point.products,
    }))
  }, [data])

  return (
    <div className="min-h-screen bg-background">
      <Header currentPath="/dashboard" />

      <Sidebar
        currentPath="/dashboard"
        className="hidden lg:flex fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 z-20 shadow-[var(--shadow-soft)]"
      />

      <main className="flex-1 w-full px-4 py-6 lg:px-8 lg:py-8 space-y-8 lg:ml-64">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Resumen de tu negocio hoy, {" "}
              {new Date().toLocaleDateString("es-ES", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex gap-2">
              <Button variant="outline" className="flex items-center gap-2 bg-transparent" onClick={() => router.refresh()}>
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Hoy</span>
              </Button>
              <Button className="bg-accent hover:bg-accent/90 flex items-center gap-2" onClick={() => router.push("/sales") }>
                <Plus className="h-4 w-4" />
                Nueva Venta
              </Button>
            </div>
          </div>

          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {(data?.stats ?? []).map((stat) => {
              const Icon = iconMap[stat.icon] ?? Users
              const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown
              return (
                <Card key={stat.title} className="hover:shadow-md transition-all duration-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    {stat.change && (
                      <div className="flex items-center text-xs mt-2">
                        <TrendIcon className={`mr-1 h-3 w-3 ${stat.trend === "up" ? "text-accent" : "text-destructive"}`} />
                        <span className={stat.trend === "up" ? "text-accent" : "text-destructive"}>{stat.change}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
            {isLoading && <Card className="md:col-span-4"><CardContent className="p-6">Cargando métricas...</CardContent></Card>}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Ventas recientes</CardTitle>
                <CardDescription>Tendencia de ventas y productos vendidos (últimos 7 días)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {chartData && chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-muted-foreground" />
                        <YAxis className="text-muted-foreground" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number, key) =>
                            key === "ventas" ? currencyFormatter.format(value) : `${value} productos`
                          }
                        />
                        <Line type="monotone" dataKey="ventas" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                        <Line type="monotone" dataKey="productos" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: "hsl(var(--accent))" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay datos suficientes para mostrar la tendencia.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Productos Más Vendidos</CardTitle>
                <CardDescription>Top productos últimos días</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.topProducts.length ? (
                    data.topProducts.map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.quantity} unidades • {product.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{currencyFormatter.format(product.revenue)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay ventas registradas para calcular el top.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Ventas Recientes
                </CardTitle>
                <CardDescription>Últimas transacciones registradas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.recentSales.length ? (
                    data.recentSales.map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {sale.customerName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{sale.customerName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{new Date(sale.createdAt).toLocaleString("es-ES")}</span>
                              <span>•</span>
                              <span>{sale.itemsCount} productos</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{currencyFormatter.format(sale.total)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Todavía no hay ventas registradas.</p>
                  )}
                </div>
                <Button variant="outline" className="w-full mt-4 bg-transparent" onClick={() => router.push("/sales") }>
                  <Eye className="mr-2 h-4 w-4" />
                  Revisar ventas
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Alertas de Stock
                </CardTitle>
                <CardDescription>Productos que requieren atención</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.lowStock.length ? (
                    data.lowStock.map((product) => (
                      <div key={product.id} className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-destructive">{product.stock} unidades</p>
                            <p className="text-xs text-muted-foreground">Mín: {product.threshold}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Cumplimiento</span>
                            <span>{product.fulfillment}%</span>
                          </div>
                          <Progress value={product.fulfillment} className="h-2" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Tu inventario está dentro de los niveles esperados.</p>
                  )}
                </div>
                <Button variant="outline" className="w-full mt-4 bg-transparent" onClick={() => router.push("/products") }>
                  <Package className="mr-2 h-4 w-4" />
                  Gestionar Inventario
                </Button>
              </CardContent>
            </Card>
          </div>
      </main>
      </div>
  )
}
