"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react"

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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Package, Plus, Upload, Download, Search } from "lucide-react"
import { useRouter } from "next/navigation"

import { fetchWithAuth, getStoredAuthSession } from "@/lib/client/auth"

interface ProductResponse {
  id: string
  name: string
  category: string
  price: number
  stock: number
  minStock: number
  barcode?: string | null
  cost?: number | null
  details?: string | null
}

interface ImportSummary {
  imported: number
  errors: Array<{ row: number; message: string }>
}

const DEFAULT_CATEGORIES = ["Abarrotes", "Bebidas", "Lácteos", "Panadería", "Snacks", "Aseo"]

const currency = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" })

export default function ProductsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [formValues, setFormValues] = useState({
    name: "",
    category: DEFAULT_CATEGORIES[0],
    price: "0",
    stock: "0",
    minStock: "0",
    barcode: "",
    cost: "",
    details: "",
  })

  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true)
      setErrorMessage(null)
      const data = await fetchWithAuth<{ products: ProductResponse[] }>("/api/products")
      setProducts(data.products)
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible cargar los productos"
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
    loadProducts()
  }, [loadProducts, router])

  const categories = useMemo(() => {
    const dynamic = new Set(DEFAULT_CATEGORIES)
    products.forEach((product) => dynamic.add(product.category))
    return Array.from(dynamic).sort((a, b) => a.localeCompare(b))
  }, [products])

  useEffect(() => {
    if (!categories.includes(formValues.category)) {
      setFormValues((prev) => ({ ...prev, category: categories[0] ?? DEFAULT_CATEGORIES[0] }))
    }
  }, [categories, formValues.category])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.barcode ?? "").toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, searchTerm, selectedCategory])

  const lowStockCount = useMemo(
    () => products.filter((product) => product.stock <= product.minStock).length,
    [products],
  )

  const inventoryValue = useMemo(
    () => products.reduce((acc, product) => acc + product.price * product.stock, 0),
    [products],
  )

  const stats = [
    { title: "Total Productos", value: products.length.toString(), color: "text-primary" },
    { title: "Con Stock", value: products.filter((p) => p.stock > 0).length.toString(), color: "text-accent" },
    { title: "Stock Bajo", value: lowStockCount.toString(), color: "text-destructive" },
    { title: "Valor Inventario", value: currency.format(inventoryValue), color: "text-primary" },
  ]

  const stockBadge = (product: ProductResponse) => {
    if (product.stock === 0) {
      return <Badge variant="destructive">Sin stock</Badge>
    }

    if (product.stock <= product.minStock) {
      return (
        <Badge variant="outline" className="border-destructive text-destructive">
          Stock bajo
        </Badge>
      )
    }

    return <Badge variant="secondary">Disponible</Badge>
  }

  const resetForm = useCallback(() => {
    setFormValues({
      name: "",
      category: categories[0] ?? DEFAULT_CATEGORIES[0],
      price: "0",
      stock: "0",
      minStock: "0",
      barcode: "",
      cost: "",
      details: "",
    })
  }, [categories])

  const handleDownloadTemplate = async () => {
    try {
      setErrorMessage(null)
      const session = getStoredAuthSession()

      if (!session) {
        router.replace("/")
        return
      }

      const response = await fetch("/api/products/template", {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      })

      if (!response.ok) {
        let message = "No fue posible descargar la plantilla"
        try {
          const data = (await response.json()) as { error?: string }
          if (data.error) {
            message = data.error
          }
        } catch (error) {
          message = response.statusText || message
        }

        if (response.status === 401) {
          router.replace("/")
        }

        throw new Error(message)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "plantilla-productos.xlsx"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No fue posible descargar la plantilla"
      setErrorMessage(message)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const formData = new FormData()
    formData.append("file", file)

    try {
      setIsImporting(true)
      setErrorMessage(null)
      const result = await fetchWithAuth<ImportSummary>("/api/products/import", {
        method: "POST",
        body: formData,
      })

      setImportSummary(result)
      await loadProducts()
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible importar"
      setErrorMessage(message)
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      event.target.value = ""
    }
  }

  const handleCreateProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = formValues.name.trim()
    const trimmedBarcode = formValues.barcode.trim()
    const trimmedDetails = formValues.details.trim()
    const price = Number.parseFloat(formValues.price)
    const stock = Number.parseInt(formValues.stock, 10)
    const minStock = Number.parseInt(formValues.minStock, 10)
    const cost = formValues.cost.trim() ? Number.parseFloat(formValues.cost) : undefined

    if (!trimmedName) {
      setErrorMessage("El nombre es obligatorio")
      return
    }

    if (!Number.isFinite(price) || price < 0) {
      setErrorMessage("El precio debe ser un número válido")
      return
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setErrorMessage("El stock debe ser un número entero positivo")
      return
    }

    if (!Number.isInteger(minStock) || minStock < 0) {
      setErrorMessage("El stock mínimo debe ser un número entero positivo")
      return
    }

    if (cost !== undefined && (!Number.isFinite(cost) || cost < 0)) {
      setErrorMessage("El costo debe ser un número válido")
      return
    }

    try {
      setIsSavingProduct(true)
      setErrorMessage(null)
      await fetchWithAuth("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          category: formValues.category,
          price,
          stock,
          minStock,
          barcode: trimmedBarcode || undefined,
          cost,
          details: trimmedDetails || undefined,
        }),
      })

      await loadProducts()
      resetForm()
      setIsAddDialogOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible guardar el producto"
      setErrorMessage(message)
    } finally {
      setIsSavingProduct(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header currentPath="/products" />

      <Sidebar
        currentPath="/products"
        className="hidden lg:flex fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 z-20 shadow-[var(--shadow-soft)]"
      />

      <main className="w-full px-4 py-6 lg:px-8 lg:py-8 lg:ml-64">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Gestión de Productos</h2>
              <p className="text-muted-foreground">Administra tu inventario con información real</p>
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
                Nuevo Producto
              </Button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            </div>
          </div>

          {importSummary && (
            <Card>
              <CardHeader>
                <CardTitle>Resultado de la importación</CardTitle>
                <CardDescription>
                  {importSummary.imported} productos importados correctamente
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
                      <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                    <Package className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Catálogo de Productos</CardTitle>
              <CardDescription>Mantenido con los datos guardados en tu base</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar por nombre, ID o código"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {errorMessage && !isSavingProduct && (
                <p className="text-sm text-destructive mb-4">{errorMessage}</p>
              )}

              {isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando productos...</p>
              ) : filteredProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay productos para mostrar.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Stock mín.</TableHead>
                      <TableHead className="text-right">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono text-sm">{product.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback>{product.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold leading-none">{product.name}</p>
                              {product.barcode && (
                                <p className="text-xs text-muted-foreground">Código: {product.barcode}</p>
                              )}
                              {product.details && (
                                <p className="text-xs text-muted-foreground truncate max-w-xs">{product.details}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell className="text-right">{currency.format(product.price)}</TableCell>
                        <TableCell className="text-right">
                          {product.cost !== null && product.cost !== undefined ? currency.format(product.cost) : "-"}
                        </TableCell>
                        <TableCell className="text-right">{product.stock}</TableCell>
                        <TableCell className="text-right">{product.minStock}</TableCell>
                        <TableCell className="text-right">{stockBadge(product)}</TableCell>
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
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Agregar nuevo producto</DialogTitle>
            <DialogDescription>Completa los campos para registrar un producto en el inventario.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateProduct}>
            <div className="space-y-2">
              <Label htmlFor="productName">Nombre del producto</Label>
              <Input
                id="productName"
                value={formValues.name}
                onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productCategory">Categoría</Label>
                <Select
                  value={formValues.category}
                  onValueChange={(value) => setFormValues((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="productCategory">
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="productBarcode">Código de barras (opcional)</Label>
                <Input
                  id="productBarcode"
                  value={formValues.barcode}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, barcode: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productPrice">Precio</Label>
                <Input
                  id="productPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formValues.price}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, price: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productCost">Costo (opcional)</Label>
                <Input
                  id="productCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formValues.cost}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, cost: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productStock">Stock inicial</Label>
                <Input
                  id="productStock"
                  type="number"
                  min="0"
                  value={formValues.stock}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, stock: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productMinStock">Stock mínimo</Label>
                <Input
                  id="productMinStock"
                  type="number"
                  min="0"
                  value={formValues.minStock}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, minStock: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="productDetails">Detalles extras (opcional)</Label>
              <Textarea
                id="productDetails"
                rows={3}
                value={formValues.details}
                onChange={(event) => setFormValues((prev) => ({ ...prev, details: event.target.value }))}
              />
            </div>
            {errorMessage && <p className="text-sm text-destructive text-center">{errorMessage}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingProduct}>
                {isSavingProduct ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
