"use client"

import { useEffect, useMemo, useState } from "react"

import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  BarChart3,
  Users,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts"
import { useRouter } from "next/navigation"

import { fetchWithAuth, getStoredAuthSession } from "@/lib/client/auth"

interface SalesTrendPoint {
  date: string
  label: string
  total: number
  products: number
}

type TopProductSummary = {
  id: string
  name: string
  category: string
  quantity: number
  revenue: number
}

type CategoryDistributionItem = {
  category: string
  value: number
}

type TopCustomer = {
  id: string
  name: string
  total: number
  orders: number
}

interface ReportResponse {
  totalSales: number
  orders: number
  averageOrderValue: number
  productsSold: number
  salesTrend: SalesTrendPoint[]
  productPerformance: TopProductSummary[]
  categoryDistribution: CategoryDistributionItem[]
  topCustomers: TopCustomer[]
  currency: string
}

const createFormatter = (currencyCode: string) => {
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: currencyCode })
  } catch (error) {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" })
  }
}
const COLORS = ["#3b82f6", "#10b981", "#f97316", "#ef4444", "#6366f1", "#8b5cf6"]

export default function ReportsPage() {
  const router = useRouter()
  const [selectedPeriod, setSelectedPeriod] = useState("7days")
  const [report, setReport] = useState<ReportResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const session = getStoredAuthSession()
    if (!session) {
      router.replace("/")
    }
  }, [router])

  useEffect(() => {
    const loadReport = async () => {
      try {
        setIsLoading(true)
        setErrorMessage(null)
        const data = await fetchWithAuth<ReportResponse>(`/api/reports?period=${selectedPeriod}`)
        setReport(data)
      } catch (error) {
        const message = error instanceof Error ? error.message : "No fue posible obtener los reportes"
        setErrorMessage(message)
        if (message === "No autorizado" || message === "Sesión expirada") {
          router.replace("/")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadReport()
  }, [router, selectedPeriod])

  const currencyFormatter = useMemo(() => createFormatter(report?.currency ?? "CLP"), [report?.currency])

  const kpiData = useMemo(() => {
    if (!report) {
      return []
    }

    return [
      {
        title: "Ventas Totales",
        value: currencyFormatter.format(report.totalSales),
        icon: DollarSign,
        change: report.totalSales >= 0 ? "+" : "",
        trend: "up" as const,
      },
      {
        title: "Órdenes Completadas",
        value: report.orders.toString(),
        icon: ShoppingCart,
        change: "",
        trend: "up" as const,
      },
      {
        title: "Ticket Promedio",
        value: currencyFormatter.format(report.averageOrderValue || 0),
        icon: BarChart3,
        change: "",
        trend: "up" as const,
      },
      {
        title: "Productos Vendidos",
        value: report.productsSold.toString(),
        icon: Package,
        change: "",
        trend: "up" as const,
      },
    ]
  }, [currencyFormatter, report])

  return (
    <div className="min-h-screen bg-background">
      <Header currentPath="/reports" />

      <Sidebar
        currentPath="/reports"
        className="hidden lg:flex fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 z-20 shadow-[var(--shadow-soft)]"
      />

      <main className="w-full px-4 py-6 lg:px-8 lg:py-8 lg:ml-64">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Reportes y Análisis</h2>
                <p className="text-muted-foreground">Observa el desempeño real de tu negocio</p>
              </div>
              <div className="flex items-center space-x-4">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Últimos 7 días</SelectItem>
                    <SelectItem value="30days">Últimos 30 días</SelectItem>
                    <SelectItem value="90days">Últimos 3 meses</SelectItem>
                    <SelectItem value="year">Este año</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="bg-accent hover:bg-accent/90" disabled={!report}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </div>

            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <Card key={index}>
                      <CardContent className="p-6">Cargando métricas...</CardContent>
                    </Card>
                  ))
                : kpiData.map((kpi) => (
                    <Card key={kpi.title} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                            <p className={`text-2xl font-bold`}>{kpi.value}</p>
                            {kpi.change && (
                              <div className="flex items-center text-xs text-muted-foreground mt-1">
                                {kpi.trend === "up" ? (
                                  <TrendingUp className="mr-1 h-3 w-3 text-accent" />
                                ) : (
                                  <TrendingDown className="mr-1 h-3 w-3 text-destructive" />
                                )}
                                {kpi.change}
                              </div>
                            )}
                          </div>
                          <kpi.icon className={`h-8 w-8 text-primary`} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Tendencia de Ventas
                  </CardTitle>
                  <CardDescription>Ventas e items vendidos por día</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {report && report.salesTrend.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={report.salesTrend.map((item) => ({
                          name: item.label,
                          ventas: item.total,
                          productos: item.products,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-muted-foreground" />
                          <YAxis className="text-muted-foreground" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
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
                      <p className="text-sm text-muted-foreground">Sin datos para el período seleccionado.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribución por Categoría</CardTitle>
                  <CardDescription>Ingresos por categoría de producto</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {report && report.categoryDistribution.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie data={report.categoryDistribution} dataKey="value" nameKey="category" cx="50%" cy="50%" outerRadius={100}>
                            {report.categoryDistribution.map((entry, index) => (
                              <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number, name: string) => [currencyFormatter.format(value), name]}
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground">No hay información disponible.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Clientes Destacados</CardTitle>
                  <CardDescription>Compradores con mayor impacto en el período</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report && report.topCustomers.length ? (
                      report.topCustomers.map((customer) => (
                        <div key={customer.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center space-x-3">
                            <Users className="h-5 w-5 text-primary" />
                            <div>
                              <p className="text-sm font-medium">{customer.name}</p>
                              <p className="text-xs text-muted-foreground">{customer.orders} órdenes</p>
                            </div>
                          </div>
                          <div className="text-right text-sm font-semibold">
                            {currencyFormatter.format(customer.total)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin clientes asociados a ventas en este período.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Productos con Mejor Rendimiento</CardTitle>
                  <CardDescription>Ordenados por unidades vendidas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report && report.productPerformance.length ? (
                      report.productPerformance.slice(0, 5).map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div>
                            <p className="text-sm font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.category}</p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-semibold">{product.quantity} uds</p>
                            <p className="text-muted-foreground">{currencyFormatter.format(product.revenue)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Aún no hay ventas registradas.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
      </main>
    </div>
  )
}
