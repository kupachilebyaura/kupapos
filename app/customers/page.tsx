"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Plus, Search, Download, Upload, Mail, Phone, MapPin, Calendar, MapPinned } from "lucide-react"
import { useRouter } from "next/navigation"

import { fetchWithAuth, getStoredAuthSession } from "@/lib/client/auth"
import { chileRegions } from "@/lib/data/cl-geo"
import { formatRut, validateRut, cleanRut } from "@/lib/utils/rut"

interface CustomerSummary {
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

interface ImportSummary {
  imported: number
  errors: Array<{ row: number; message: string }>
}

const currency = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" })

export default function CustomersPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [formValues, setFormValues] = useState({
    name: "",
    rut: "",
    email: "",
    phone: "",
    address: "",
    region: "",
    commune: "",
    birthDate: "",
    notes: "",
  })
  const [rutError, setRutError] = useState<string | null>(null)

  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true)
      setErrorMessage(null)
      const data = await fetchWithAuth<{ customers: CustomerSummary[] }>("/api/customers")
      setCustomers(data.customers)
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible obtener los clientes"
      setErrorMessage(message)
      if (message === "No autorizado" || message === "Sesión expirada") {
        router.replace("/")
      }
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    const session = getStoredAuthSession()
    if (!session) {
      router.replace("/")
      return
    }
    loadCustomers()
  }, [loadCustomers, router])

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers
    const lower = searchTerm.toLowerCase()
    return customers.filter((customer) =>
      [
        customer.name,
        customer.rut ?? "",
        customer.email ?? "",
        customer.phone ?? "",
        customer.region ?? "",
        customer.commune ?? "",
        customer.id,
      ].some((value) =>
        value?.toLowerCase().includes(lower),
      ),
    )
  }, [customers, searchTerm])

  const totalSales = useMemo(
    () => customers.reduce((sum, customer) => sum + customer.totalPurchases, 0),
    [customers],
  )

  const activeCustomers = useMemo(
    () => customers.filter((customer) => customer.lastPurchase && daysBetween(customer.lastPurchase) <= 90).length,
    [customers],
  )

  const stats = [
    { title: "Total Clientes", value: customers.length.toString(), icon: Users },
    { title: "Clientes Activos (90 días)", value: activeCustomers.toString(), icon: Users },
    { title: "Ventas Acumuladas", value: currency.format(totalSales), icon: Users },
    {
      title: "Ticket Promedio",
      value: customers.length ? currency.format(totalSales / customers.length) : currency.format(0),
      icon: Users,
    },
  ]

  const communesForRegion = useMemo(() => {
    const region = chileRegions.find((item) => item.name === formValues.region)
    return region ? region.communes : []
  }, [formValues.region])

  const resetForm = () => {
    setFormValues({
      name: "",
      rut: "",
      email: "",
      phone: "",
      address: "",
      region: "",
      commune: "",
      birthDate: "",
      notes: "",
    })
    setRutError(null)
  }

  const handleCreateCustomer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setErrorMessage(null)
    setRutError(null)

    try {
      const rutValue = formValues.rut.trim()
      if (rutValue && !validateRut(rutValue)) {
        setRutError("El RUT ingresado no es válido")
        setIsSaving(false)
        return
      }
      const normalizedRut = rutValue ? formatRut(cleanRut(rutValue)) : undefined

      const response = await fetchWithAuth<{ customer: CustomerSummary }>("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formValues.name,
          rut: normalizedRut,
          email: formValues.email.trim() || undefined,
          phone: formValues.phone.trim() || undefined,
          address: formValues.address.trim() || undefined,
          region: formValues.region || undefined,
          commune: formValues.commune || undefined,
          birthDate: formValues.birthDate ? new Date(formValues.birthDate).toISOString() : undefined,
          notes: formValues.notes.trim() || undefined,
        }),
      })

      setCustomers((prev) => [response.customer, ...prev])
      setIsAddDialogOpen(false)
      resetForm()
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible crear el cliente"
      setErrorMessage(message)
      if (message === "No autorizado" || message === "Sesión expirada") {
        router.replace("/")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleViewCustomer = (customer: CustomerSummary) => {
    setSelectedCustomer(customer)
    setIsViewDialogOpen(true)
  }

  const handleDownloadTemplate = () => {
    window.open("/api/customers/template", "_blank")
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    try {
      setIsImporting(true)
      setImportSummary(null)
      const response = await fetchWithAuth<ImportSummary>("/api/customers/import", {
        method: "POST",
        body: formData,
      })

      setImportSummary(response)
      await loadCustomers()
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible importar los clientes"
      setImportSummary({ imported: 0, errors: [{ row: 0, message }] })
      if (message === "No autorizado" || message === "Sesión expirada") {
        router.replace("/")
      }
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header currentPath="/customers" />

      <Sidebar
        currentPath="/customers"
        className="hidden lg:flex fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 z-20 shadow-[var(--shadow-soft)]"
      />

      <main className="w-full px-4 py-6 lg:px-8 lg:py-8 lg:ml-64">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Gestión de Clientes</h2>
                <p className="text-muted-foreground">Basado en los datos almacenados en tu cuenta</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar plantilla
                </Button>
                <Button variant="outline" onClick={handleImportClick} disabled={isImporting}>
                  <Upload className="mr-2 h-4 w-4" />
                  {isImporting ? "Importando..." : "Importar Excel"}
                </Button>
                <Button className="bg-accent hover:bg-accent/90" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Cliente
                </Button>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
              </div>
            </div>

            {importSummary && (
              <Card>
                <CardHeader>
                  <CardTitle>Resultado de la importación</CardTitle>
                  <CardDescription>
                    {importSummary.imported} clientes importados correctamente
                  </CardDescription>
                </CardHeader>
                {importSummary.errors.length > 0 && (
                  <CardContent className="space-y-2">
                    {importSummary.errors.slice(0, 5).map((error) => (
                      <p key={`${error.row}-${error.message}`} className="text-sm text-destructive">
                        Fila {error.row}: {error.message}
                      </p>
                    ))}
                    {importSummary.errors.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        {importSummary.errors.length - 5} errores adicionales no mostrados.
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <Card key={stat.title}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                        <p className="text-2xl font-bold">{stat.value}</p>
                      </div>
                      <stat.icon className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Clientes</CardTitle>
                <CardDescription>Información consolidada de tus clientes registrados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Buscar por nombre, correo o teléfono"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                {errorMessage && !isSaving && <p className="text-sm text-destructive mb-4">{errorMessage}</p>}

                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Cargando clientes...</p>
                ) : filteredCustomers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay clientes registrados.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>RUT</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Región / Comuna</TableHead>
                        <TableHead className="text-right">Total Compras</TableHead>
                        <TableHead className="text-right">Última Compra</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id} className="cursor-pointer" onClick={() => handleViewCustomer(customer)}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback>{customer.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold leading-none">{customer.name}</p>
                                <p className="text-xs text-muted-foreground">ID: {customer.id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{customer.rut ?? "-"}</TableCell>
                          <TableCell>{customer.email ?? "-"}</TableCell>
                          <TableCell>{customer.phone ?? "-"}</TableCell>
                          <TableCell>
                            {customer.region ? (
                              <span>
                                {customer.region}
                                {customer.commune ? ` / ${customer.commune}` : ""}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right">{currency.format(customer.totalPurchases)}</TableCell>
                          <TableCell className="text-right">
                            {customer.lastPurchase
                              ? new Date(customer.lastPurchase).toLocaleDateString("es-ES")
                              : "Sin compras"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
        </div>
      </main>

      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          if (!open) {
            resetForm()
            setErrorMessage(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Agregar Cliente</DialogTitle>
            <DialogDescription>Registra un nuevo cliente para tu negocio.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateCustomer}>
            <div className="space-y-2">
              <Label htmlFor="customerName">Nombre completo</Label>
              <Input
                id="customerName"
                value={formValues.name}
                onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerRut">RUT</Label>
              <Input
                id="customerRut"
                placeholder="12.345.678-9"
                value={formValues.rut}
                onChange={(event) => {
                  const value = event.target.value.replace(/[^0-9kK.\-]/g, "")
                  setFormValues((prev) => ({ ...prev, rut: value }))
                  setRutError(null)
                }}
                onBlur={(event) => {
                  const value = cleanRut(event.target.value)
                  if (!value) return
                  if (!validateRut(value)) {
                    setRutError("El RUT ingresado no es válido")
                    return
                  }
                  setFormValues((prev) => ({ ...prev, rut: formatRut(value) }))
                }}
              />
              {rutError ? <p className="text-xs text-destructive">{rutError}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Correo electrónico</Label>
              <Input
                id="customerEmail"
                type="email"
                value={formValues.email}
                onChange={(event) => setFormValues((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Teléfono</Label>
              <Input
                id="customerPhone"
                value={formValues.phone}
                onChange={(event) => setFormValues((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerAddress">Dirección</Label>
              <Textarea
                id="customerAddress"
                rows={2}
                value={formValues.address}
                onChange={(event) => setFormValues((prev) => ({ ...prev, address: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerRegion">Región</Label>
                <Select
                  value={formValues.region}
                  onValueChange={(value) =>
                    setFormValues((prev) => ({ ...prev, region: value, commune: "" }))
                  }
                >
                  <SelectTrigger id="customerRegion">
                    <SelectValue placeholder="Selecciona una región" />
                  </SelectTrigger>
                  <SelectContent>
                    {chileRegions.map((region) => (
                      <SelectItem key={region.name} value={region.name}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerCommune">Comuna</Label>
                <Select
                  value={formValues.commune}
                  onValueChange={(value) => setFormValues((prev) => ({ ...prev, commune: value }))}
                  disabled={!formValues.region}
                >
                  <SelectTrigger id="customerCommune">
                    <SelectValue placeholder="Selecciona una comuna" />
                  </SelectTrigger>
                  <SelectContent>
                    {communesForRegion.map((commune) => (
                      <SelectItem key={commune} value={commune}>
                        {commune}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerBirth">Fecha de nacimiento</Label>
              <Input
                id="customerBirth"
                type="date"
                value={formValues.birthDate}
                onChange={(event) => setFormValues((prev) => ({ ...prev, birthDate: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerNotes">Detalles extras</Label>
              <Textarea
                id="customerNotes"
                rows={3}
                value={formValues.notes}
                onChange={(event) => setFormValues((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
            {errorMessage && <p className="text-sm text-destructive text-center">{errorMessage}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          {selectedCustomer && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedCustomer.name}</DialogTitle>
                <DialogDescription>Resumen del cliente y su actividad de compra.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{selectedCustomer.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-muted-foreground">Registrado el</p>
                    <p className="font-medium">
                      {new Date(selectedCustomer.createdAt).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {selectedCustomer.rut && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPinned className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedCustomer.rut}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedCustomer.email ?? "Sin correo registrado"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedCustomer.phone ?? "Sin teléfono registrado"}</span>
                  </div>
                  {selectedCustomer.address && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <span>{selectedCustomer.address}</span>
                    </div>
                  )}
                  {selectedCustomer.region && (
                    <p className="text-sm text-muted-foreground">
                      Región: {selectedCustomer.region}
                      {selectedCustomer.commune ? ` · ${selectedCustomer.commune}` : ""}
                    </p>
                  )}
                  {selectedCustomer.birthDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Fecha de nacimiento: {new Date(selectedCustomer.birthDate).toLocaleDateString("es-ES")}
                      </span>
                    </div>
                  )}
                </div>

                {selectedCustomer.notes && (
                  <div className="space-y-2 text-sm">
                    <p className="text-xs text-muted-foreground uppercase">Detalles extras</p>
                    <p>{selectedCustomer.notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground">Total Compras</p>
                    <p className="text-lg font-semibold">
                      {currency.format(selectedCustomer.totalPurchases)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground">Órdenes</p>
                    <p className="text-lg font-semibold">{selectedCustomer.purchaseCount}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Última compra:
                      {selectedCustomer.lastPurchase
                        ? ` ${new Date(selectedCustomer.lastPurchase).toLocaleDateString("es-ES")}`
                        : " sin compras registradas"}
                    </span>
                  </div>
                  <Badge variant={selectedCustomer.lastPurchase && daysBetween(selectedCustomer.lastPurchase) <= 90 ? "default" : "secondary"}>
                    {selectedCustomer.lastPurchase && daysBetween(selectedCustomer.lastPurchase) <= 90
                      ? "Activo"
                      : "Inactivo"}
                  </Badge>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function daysBetween(from: string | null) {
  if (!from) return Number.POSITIVE_INFINITY
  const now = new Date()
  const past = new Date(from)
  return Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60 * 24))
}
