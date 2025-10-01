"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Bell,
  Building2,
  CreditCard,
  Receipt,
  Shield,
  Palette,
  Globe,
  Printer,
  Users,
  UserPlus,
  UserCog,
  Power,
} from "lucide-react"

import { fetchWithAuth, getStoredAuthSession, type StoredAuthSession } from "@/lib/client/auth"

interface BusinessDetails {
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
}

type AllowedUserRole = "MANAGER" | "USER"
type AnyUserRole = AllowedUserRole | "ADMIN"

interface BusinessUser {
  id: string
  name: string
  email: string
  role: AnyUserRole
  active: boolean
  createdAt: string
}

const currencyOptions = [
  { value: "ARS", label: "Peso Argentino (ARS)" },
  { value: "BOB", label: "Boliviano (BOB)" },
  { value: "BRL", label: "Real Brasileño (BRL)" },
  { value: "CLP", label: "Peso Chileno (CLP)" },
  { value: "COP", label: "Peso Colombiano (COP)" },
  { value: "CRC", label: "Colón Costarricense (CRC)" },
  { value: "CUP", label: "Peso Cubano (CUP)" },
  { value: "DOP", label: "Peso Dominicano (DOP)" },
  { value: "USD", label: "Dólar Americano (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GTQ", label: "Quetzal Guatemalteco (GTQ)" },
  { value: "HNL", label: "Lempira Hondureña (HNL)" },
  { value: "MXN", label: "Peso Mexicano (MXN)" },
  { value: "NIO", label: "Córdoba Nicaragüense (NIO)" },
  { value: "PAB", label: "Balboa Panameño (PAB)" },
  { value: "PYG", label: "Guaraní Paraguayo (PYG)" },
  { value: "PEN", label: "Sol Peruano (PEN)" },
  { value: "USD", label: "Dólar Estadounidense (USD) - Ecuador" },
  { value: "USD", label: "Dólar Estadounidense (USD) - El Salvador" },
  { value: "USD", label: "Dólar Estadounidense (USD) - Panamá" },
  { value: "UYU", label: "Peso Uruguayo (UYU)" },
  { value: "VEF", label: "Bolívar Soberano Venezolano (VES)" }
]

const defaultBusiness = {
  name: "",
  address: "",
  phone: "",
  email: "",
  taxId: "",
  currency: "CLP",
  blockZeroStock: false,
}

const defaultTaxSettings = {
  defaultTaxRate: "19",
  includeTaxInPrice: false,
  taxName: "IVA",
}

const defaultNotifications = {
  lowStock: true,
  dailyReports: true,
  newCustomers: false,
  systemUpdates: true,
}

const defaultPaymentSamples = [
  { name: "Efectivo", icon: "💵" },
  { name: "Tarjeta de Débito", icon: "💳" },
  { name: "Tarjeta de Crédito", icon: "💳" },
  { name: "Transferencia", icon: "🏦" },
  { name: "PayPal", icon: "🅿️" },
  { name: "Mercado Pago", icon: "💰" },
]

const userRoleLabels: Record<AnyUserRole, string> = {
  ADMIN: "Administrador",
  MANAGER: "Supervisor",
  USER: "Vendedor",
}

const userRoleOptions: { value: AllowedUserRole; label: string }[] = [
  { value: "MANAGER", label: userRoleLabels.MANAGER },
  { value: "USER", label: userRoleLabels.USER },
]

const defaultNewUser = {
  name: "",
  email: "",
  password: "",
  role: "USER" as AllowedUserRole,
}

export default function SettingsPage() {
  const [businessInfo, setBusinessInfo] = useState(defaultBusiness)
  const [taxSettings, setTaxSettings] = useState(defaultTaxSettings)
  const [notifications, setNotifications] = useState(defaultNotifications)
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [newMethod, setNewMethod] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<StoredAuthSession | null>(() => getStoredAuthSession())
  const [users, setUsers] = useState<BusinessUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [userMessage, setUserMessage] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState(defaultNewUser)
  const [editUser, setEditUser] = useState<{
    id: string
    name: string
    email: string
    role: AllowedUserRole
    password: string
  }>({
    id: "",
    name: "",
    email: "",
    role: "USER",
    password: "",
  })
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)
  const [blockZeroStock, setBlockZeroStockState] = useState(false)
  const isAdmin = session?.user.role === "ADMIN"

  useEffect(() => {
    setSession(getStoredAuthSession())
  }, [])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }

    const loadSettings = async () => {
      try {
        setLoading(true)
        const response = await fetchWithAuth<{ business: BusinessDetails }>("/api/settings")
        const business = response.business
        setBusinessInfo({
          name: business.name ?? "",
          address: business.address ?? "",
          phone: business.phone ?? "",
          email: business.email ?? "",
          taxId: business.taxId ?? "",
          currency: business.currency ?? "CLP",
          blockZeroStock: business.blockZeroStock,
        })
        setTaxSettings({
          defaultTaxRate: (business.taxRate ?? 0).toString(),
          includeTaxInPrice: business.includeTaxInPrice,
          taxName: business.taxName ?? "IVA",
        })
        setNotifications({
          lowStock: business.notifyLowStock,
          dailyReports: business.notifyDailyReports,
          newCustomers: business.notifyNewCustomers,
          systemUpdates: business.notifySystemUpdates,
        })
        setPaymentMethods(business.paymentMethods ?? [])
        setBlockZeroStockState(business.blockZeroStock)
      } catch (err) {
        setError(err instanceof Error ? err.message : "No fue posible cargar la configuración")
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [session])

  const loadUsers = useCallback(async () => {
    if (!session || session.user.role !== "ADMIN") {
      setUsers([])
      setUsersLoading(false)
      setUsersError(null)
      return
    }

    try {
      setUsersLoading(true)
      setUsersError(null)
      const response = await fetchWithAuth<{ users: BusinessUser[] }>("/api/users")
      setUsers(response.users)
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "No fue posible cargar los usuarios")
    } finally {
      setUsersLoading(false)
    }
  }, [session])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const mergedPaymentMethods = useMemo(() => {
    const existing = new Map(defaultPaymentSamples.map((sample) => [sample.name, sample.icon]))
    paymentMethods.forEach((method) => {
      if (!existing.has(method)) {
        existing.set(method, "💳")
      }
    })
    return Array.from(existing.entries()).map(([name, icon]) => ({ name, icon }))
  }, [paymentMethods])

  const orderedUsers = useMemo(() => {
    if (users.length === 0) return []

    return [...users].sort((a, b) => {
      if (a.role === b.role) {
        if (a.active !== b.active) {
          return a.active ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      }
      if (a.role === "ADMIN") return -1
      if (b.role === "ADMIN") return 1
      return a.name.localeCompare(b.name)
    })
  }, [users])

  const formatDate = useCallback((value: string) => {
    return new Date(value).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }, [])

  const handleMethodToggle = (name: string, enabled: boolean) => {
    setPaymentMethods((prev) => {
      if (enabled) {
        return prev.includes(name) ? prev : [...prev, name]
      }
      return prev.filter((method) => method !== name)
    })
  }

  const handleAddMethod = () => {
    const value = newMethod.trim()
    if (!value) return
    if (!paymentMethods.includes(value)) {
      setPaymentMethods((prev) => [...prev, value])
    }
    setNewMethod("")
  }

  const handleCreateDialogChange = (open: boolean) => {
    setCreateDialogOpen(open)
    if (!open) {
      setNewUser(defaultNewUser)
    } else {
      setUserMessage(null)
      setUsersError(null)
    }
  }

  const handleEditDialogChange = (open: boolean) => {
    setEditDialogOpen(open)
    if (!open) {
      setEditUser({ id: "", name: "", email: "", role: "USER", password: "" })
    } else {
      setUserMessage(null)
      setUsersError(null)
    }
  }

  const openEditDialogFor = (user: BusinessUser) => {
    if (user.role === "ADMIN") return
    setEditUser({
      id: user.id,
      name: user.name,
      email: user.email,
      role: (user.role as AllowedUserRole) ?? "USER",
      password: "",
    })
    handleEditDialogChange(true)
  }

  const handleCreateUser = async () => {
    if (!isAdmin) {
      setUsersError("Solo un administrador puede gestionar usuarios")
      return
    }

    setUserMessage(null)

    const name = newUser.name.trim()
    const email = newUser.email.trim()
    const password = newUser.password.trim()

    if (!name || !email || !password) {
      setUsersError("Completa nombre, correo y contraseña para crear un usuario")
      return
    }

    try {
      setCreateSubmitting(true)
      setUsersError(null)
      const response = await fetchWithAuth<{ user: BusinessUser }>("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role: newUser.role,
        }),
      })
      setUsers((prev) => [...prev, response.user])
      setUserMessage("Usuario creado correctamente")
      handleCreateDialogChange(false)
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "No fue posible crear el usuario")
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!isAdmin) {
      setUsersError("Solo un administrador puede gestionar usuarios")
      return
    }

    setUserMessage(null)

    const original = users.find((user) => user.id === editUser.id)
    if (!original) {
      setUsersError("No fue posible localizar el usuario a actualizar")
      return
    }

    const payload: Record<string, unknown> = {}
    const trimmedName = editUser.name.trim()
    const trimmedEmail = editUser.email.trim()
    const trimmedPassword = editUser.password.trim()

    if (trimmedName && trimmedName !== original.name) payload.name = trimmedName
    if (trimmedEmail && trimmedEmail !== original.email) payload.email = trimmedEmail
    if (editUser.role !== original.role) payload.role = editUser.role
    if (trimmedPassword) payload.password = trimmedPassword

    if (Object.keys(payload).length === 0) {
      handleEditDialogChange(false)
      return
    }

    try {
      setEditSubmitting(true)
      setUsersError(null)
      const response = await fetchWithAuth<{ user: BusinessUser }>(`/api/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      setUsers((prev) => prev.map((user) => (user.id === response.user.id ? response.user : user)))
      setUserMessage("Usuario actualizado correctamente")
      handleEditDialogChange(false)
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "No fue posible actualizar el usuario")
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleToggleUserActive = async (user: BusinessUser) => {
    if (!isAdmin || user.role === "ADMIN") {
      setUsersError("No es posible modificar el estado de esta cuenta")
      return
    }

    setUserMessage(null)

    try {
      setBusyUserId(user.id)
      setUsersError(null)
      const response = await fetchWithAuth<{ user: BusinessUser }>(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      })
      setUsers((prev) => prev.map((item) => (item.id === response.user.id ? response.user : item)))
      setUserMessage(response.user.active ? "Usuario activado" : "Usuario inactivado")
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "No fue posible actualizar el estado del usuario")
    } finally {
      setBusyUserId(null)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setMessage(null)
      await fetchWithAuth("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: businessInfo.name,
          address: businessInfo.address || null,
          phone: businessInfo.phone || null,
          email: businessInfo.email || null,
          taxId: businessInfo.taxId || null,
          currency: businessInfo.currency,
          taxName: taxSettings.taxName,
          taxRate: Number(taxSettings.defaultTaxRate) || 0,
          includeTaxInPrice: taxSettings.includeTaxInPrice,
          notifyLowStock: notifications.lowStock,
          notifyDailyReports: notifications.dailyReports,
          notifyNewCustomers: notifications.newCustomers,
          notifySystemUpdates: notifications.systemUpdates,
          paymentMethods,
          blockZeroStock,
        }),
      })
      setMessage("Cambios guardados correctamente")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar los cambios")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header currentPath="/settings" />

      <Sidebar
        currentPath="/settings"
        className="hidden lg:flex fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 xl:w-72 z-20 shadow-[var(--shadow-soft)]"
      />

      <main className="flex-1 w-full px-4 py-6 md:px-6 lg:px-8 xl:px-12 lg:py-8 space-y-8 lg:ml-64 xl:ml-72">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
                <p className="text-muted-foreground mt-1">Administra la configuración de tu sistema POS</p>
              </div>
              <Button className="bg-primary hover:bg-primary/90" onClick={handleSave} disabled={isSaving || loading}>
                {isSaving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>

            {loading && <p className="text-sm text-muted-foreground">Cargando configuración...</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}

            <Tabs defaultValue="business" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                <TabsTrigger value="business" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Negocio</span>
                </TabsTrigger>
                <TabsTrigger value="taxes" className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  <span className="hidden sm:inline">Impuestos</span>
                </TabsTrigger>
                <TabsTrigger value="payments" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Pagos</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">Notificaciones</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Seguridad</span>
                </TabsTrigger>
                <TabsTrigger value="appearance" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  <span className="hidden sm:inline">Apariencia</span>
                </TabsTrigger>
                <TabsTrigger value="localization" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">Localización</span>
                </TabsTrigger>
                <TabsTrigger value="printing" className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  <span className="hidden sm:inline">Impresión</span>
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="users" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Usuarios</span>
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="business" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Información del Negocio
                    </CardTitle>
                    <CardDescription>Configura los datos básicos de tu empresa</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="businessName">Nombre del Negocio</Label>
                        <Input
                          id="businessName"
                          value={businessInfo.name}
                          onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taxId">RFC / Tax ID</Label>
                        <Input
                          id="taxId"
                          value={businessInfo.taxId}
                          onChange={(e) => setBusinessInfo({ ...businessInfo, taxId: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Dirección</Label>
                      <Textarea
                        id="address"
                        value={businessInfo.address}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                        rows={3}
                        disabled={loading}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                          id="phone"
                          value={businessInfo.phone}
                          onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={businessInfo.email}
                          onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Moneda</Label>
                        <Select
                          value={businessInfo.currency}
                          onValueChange={(value) => setBusinessInfo({ ...businessInfo, currency: value })}
                          disabled={loading}
                        >
                          <SelectTrigger id="currency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currencyOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                      <div className="space-y-1">
                        <Label>Bloquear venta sin stock</Label>
                        <p className="text-sm text-muted-foreground">
                          Impide finalizar ventas cuando no queda inventario disponible.
                        </p>
                      </div>
                      <Switch checked={blockZeroStock} onCheckedChange={setBlockZeroStockState} disabled={loading} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="taxes" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      Configuración de Impuestos
                    </CardTitle>
                    <CardDescription>Configura las tasas de impuestos y su aplicación</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="taxName">Nombre del Impuesto</Label>
                        <Input
                          id="taxName"
                          value={taxSettings.taxName}
                          onChange={(e) => setTaxSettings({ ...taxSettings, taxName: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taxRate">Tasa de Impuesto (%)</Label>
                        <Input
                          id="taxRate"
                          type="number"
                          value={taxSettings.defaultTaxRate}
                          onChange={(e) => setTaxSettings({ ...taxSettings, defaultTaxRate: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Incluir impuesto en el precio</Label>
                        <p className="text-sm text-muted-foreground">Los precios mostrados incluyen impuestos</p>
                      </div>
                      <Switch
                        checked={taxSettings.includeTaxInPrice}
                        onCheckedChange={(checked) => setTaxSettings({ ...taxSettings, includeTaxInPrice: checked })}
                        disabled={loading}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Métodos de Pago
                    </CardTitle>
                    <CardDescription>Activa o desactiva los métodos disponibles para tus ventas</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {mergedPaymentMethods.map((method) => {
                        const enabled = paymentMethods.includes(method.name)
                        return (
                          <Card key={method.name} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{method.icon}</span>
                                <div>
                                  <p className="font-medium">{method.name}</p>
                                  <Badge variant={enabled ? "default" : "secondary"}>
                                    {enabled ? "Activo" : "Inactivo"}
                                  </Badge>
                                </div>
                              </div>
                              <Switch
                                checked={enabled}
                                onCheckedChange={(checked) => handleMethodToggle(method.name, checked)}
                                disabled={loading}
                              />
                            </div>
                          </Card>
                        )
                      })}
                    </div>

                    <Separator />

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        placeholder="Agregar método personalizado"
                        value={newMethod}
                        onChange={(event) => setNewMethod(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            handleAddMethod()
                          }
                        }}
                        disabled={loading}
                      />
                      <Button type="button" onClick={handleAddMethod} disabled={!newMethod.trim() || loading}>
                        Añadir nuevo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notificaciones
                    </CardTitle>
                    <CardDescription>Configura qué notificaciones deseas recibir</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <NotificationToggle
                      label="Stock Bajo"
                      description="Recibir alertas cuando los productos tengan stock bajo"
                      checked={notifications.lowStock}
                      onChange={(checked) => setNotifications((prev) => ({ ...prev, lowStock: checked }))}
                      disabled={loading}
                    />
                    <NotificationToggle
                      label="Reportes diarios"
                      description="Recibir resumen diario de ventas por email"
                      checked={notifications.dailyReports}
                      onChange={(checked) => setNotifications((prev) => ({ ...prev, dailyReports: checked }))}
                      disabled={loading}
                    />
                    <NotificationToggle
                      label="Nuevos clientes"
                      description="Notificar cuando se registren nuevos clientes"
                      checked={notifications.newCustomers}
                      onChange={(checked) => setNotifications((prev) => ({ ...prev, newCustomers: checked }))}
                      disabled={loading}
                    />
                    <NotificationToggle
                      label="Actualizaciones del sistema"
                      description="Recibir novedades sobre mantenimiento y versiones"
                      checked={notifications.systemUpdates}
                      onChange={(checked) => setNotifications((prev) => ({ ...prev, systemUpdates: checked }))}
                      disabled={loading}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {isAdmin && (
                <TabsContent value="users" className="space-y-6">
                  <Card>
                    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Gestión de Usuarios
                        </CardTitle>
                        <CardDescription>
                          Crea cuentas para supervisores o vendedores y administra su acceso sin afectar al administrador principal.
                        </CardDescription>
                      </div>
                      <Button
                        type="button"
                        className="flex items-center gap-2 sm:w-auto"
                        onClick={() => handleCreateDialogChange(true)}
                      >
                        <UserPlus className="h-4 w-4" />
                        Nuevo usuario
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-xs text-muted-foreground">
                        Cada negocio mantiene una única cuenta administradora. Las cuentas secundarias pueden activarse o inactivarse cuando lo necesites.
                      </p>

                      {userMessage && (
                        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
                          {userMessage}
                        </div>
                      )}

                      {usersError && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                          {usersError}
                        </div>
                      )}

                      {usersLoading ? (
                        <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
                      ) : orderedUsers.length > 0 ? (
                        <>
                          <div className="hidden sm:block">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Usuario</TableHead>
                                  <TableHead>Rol</TableHead>
                                  <TableHead>Estado</TableHead>
                                  <TableHead>Alta</TableHead>
                                  <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {orderedUsers.map((user) => (
                                  <TableRow key={user.id} className={user.active ? "" : "opacity-80"}>
                                    <TableCell>
                                      <div className="flex flex-col">
                                        <span className="font-medium text-foreground">{user.name}</span>
                                        <span className="text-xs text-muted-foreground">{user.email}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="bg-muted/40">
                                        {userRoleLabels[user.role]}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="outline"
                                        className={user.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-destructive/30 bg-destructive/10 text-destructive"}
                                      >
                                        {user.active ? "Activo" : "Inactivo"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                                    <TableCell>
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          disabled={user.role === "ADMIN" || busyUserId === user.id}
                                          onClick={() => openEditDialogFor(user)}
                                        >
                                          <UserCog className="mr-2 h-4 w-4" />
                                          Editar
                                        </Button>
                                        <Button
                                          type="button"
                                          variant={user.active ? "outline" : "secondary"}
                                          size="sm"
                                          disabled={user.role === "ADMIN" || busyUserId === user.id}
                                          onClick={() => handleToggleUserActive(user)}
                                        >
                                          <Power className="mr-2 h-4 w-4" />
                                          {user.active ? "Inactivar" : "Activar"}
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          <div className="space-y-3 sm:hidden">
                            {orderedUsers.map((user) => (
                              <div key={user.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-foreground">{user.name}</p>
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                  </div>
                                  <Badge variant="outline" className="bg-muted/40">
                                    {userRoleLabels[user.role]}
                                  </Badge>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <Badge
                                    variant="outline"
                                    className={user.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-destructive/30 bg-destructive/10 text-destructive"}
                                  >
                                    {user.active ? "Activo" : "Inactivo"}
                                  </Badge>
                                  <span>Alta: {formatDate(user.createdAt)}</span>
                                </div>
                                <div className="mt-3 flex flex-col gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={user.role === "ADMIN" || busyUserId === user.id}
                                    onClick={() => openEditDialogFor(user)}
                                  >
                                    <UserCog className="mr-2 h-4 w-4" />
                                    Editar datos
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={user.active ? "outline" : "secondary"}
                                    size="sm"
                                    disabled={user.role === "ADMIN" || busyUserId === user.id}
                                    onClick={() => handleToggleUserActive(user)}
                                  >
                                    <Power className="mr-2 h-4 w-4" />
                                    {user.active ? "Inactivar cuenta" : "Activar cuenta"}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Todavía no hay usuarios secundarios registrados. Utiliza el botón
                          <span className="font-medium"> Nuevo usuario </span>
                          para asignar accesos.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Dialog open={createDialogOpen} onOpenChange={handleCreateDialogChange}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Nuevo usuario</DialogTitle>
                        <DialogDescription>Crea cuentas adicionales para este negocio. El rol Administrador no está disponible.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-user-name">Nombre completo</Label>
                          <Input
                            id="new-user-name"
                            placeholder="Ej. María González"
                            value={newUser.name}
                            onChange={(event) => setNewUser((prev) => ({ ...prev, name: event.target.value }))}
                            disabled={createSubmitting}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-user-email">Correo electrónico</Label>
                          <Input
                            id="new-user-email"
                            type="email"
                            placeholder="correo@negocio.com"
                            value={newUser.email}
                            onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
                            disabled={createSubmitting}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-user-password">Contraseña temporal</Label>
                          <Input
                            id="new-user-password"
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            value={newUser.password}
                            onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
                            disabled={createSubmitting}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-user-role">Rol</Label>
                          <Select
                            value={newUser.role}
                            onValueChange={(value) => setNewUser((prev) => ({ ...prev, role: value as AllowedUserRole }))}
                            disabled={createSubmitting}
                          >
                            <SelectTrigger id="new-user-role">
                              <SelectValue placeholder="Selecciona un rol" />
                            </SelectTrigger>
                            <SelectContent>
                              {userRoleOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <DialogClose asChild>
                          <Button type="button" variant="outline" disabled={createSubmitting}>
                            Cancelar
                          </Button>
                        </DialogClose>
                        <Button type="button" onClick={handleCreateUser} disabled={createSubmitting}>
                          {createSubmitting ? "Creando..." : "Crear usuario"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={editDialogOpen} onOpenChange={handleEditDialogChange}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Editar usuario</DialogTitle>
                        <DialogDescription>Actualiza los datos de las cuentas secundarias. La contraseña es opcional.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-user-name">Nombre completo</Label>
                          <Input
                            id="edit-user-name"
                            value={editUser.name}
                            onChange={(event) => setEditUser((prev) => ({ ...prev, name: event.target.value }))}
                            disabled={editSubmitting}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-user-email">Correo electrónico</Label>
                          <Input
                            id="edit-user-email"
                            type="email"
                            value={editUser.email}
                            onChange={(event) => setEditUser((prev) => ({ ...prev, email: event.target.value }))}
                            disabled={editSubmitting}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-user-role">Rol</Label>
                          <Select
                            value={editUser.role}
                            onValueChange={(value) => setEditUser((prev) => ({ ...prev, role: value as AllowedUserRole }))}
                            disabled={editSubmitting}
                          >
                            <SelectTrigger id="edit-user-role">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {userRoleOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-user-password">Nueva contraseña (opcional)</Label>
                          <Input
                            id="edit-user-password"
                            type="password"
                            placeholder="Dejar en blanco para conservar la actual"
                            value={editUser.password}
                            onChange={(event) => setEditUser((prev) => ({ ...prev, password: event.target.value }))}
                            disabled={editSubmitting}
                          />
                        </div>
                      </div>
                      <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <DialogClose asChild>
                          <Button type="button" variant="outline" disabled={editSubmitting}>
                            Cancelar
                          </Button>
                        </DialogClose>
                        <Button type="button" onClick={handleUpdateUser} disabled={editSubmitting}>
                          {editSubmitting ? "Guardando..." : "Guardar cambios"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </TabsContent>
              )}

              <TabsContent value="security" className="space-y-6">
                <PlaceholderCard
                  icon={<Shield className="h-5 w-5" />}
                  title="Seguridad"
                  description="Configura autenticación de dos factores, políticas de contraseña y revisa sesiones activas."
                />
              </TabsContent>

              <TabsContent value="appearance" className="space-y-6">
                <PlaceholderCard
                  icon={<Palette className="h-5 w-5" />}
                  title="Apariencia"
                  description="Personaliza la apariencia de tu sistema. Próximamente podrás definir temas personalizados."
                />
              </TabsContent>

              <TabsContent value="localization" className="space-y-6">
                <PlaceholderCard
                  icon={<Globe className="h-5 w-5" />}
                  title="Localización"
                  description="Define idioma, zona horaria y formatos regionales para tu negocio."
                />
              </TabsContent>

              <TabsContent value="printing" className="space-y-6">
                <PlaceholderCard
                  icon={<Printer className="h-5 w-5" />}
                  title="Impresión"
                  description="Gestiona impresoras y plantillas de impresión. Esta función estará disponible próximamente."
                />
              </TabsContent>
            </Tabs>
        </div>
      </main>
    </div>
  )
}

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="space-y-0.5">
        <Label>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}

function PlaceholderCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            {icon}
          </div>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}
