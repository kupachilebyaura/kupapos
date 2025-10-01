"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Header } from "@/components/layout/header"
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Plus, Search, Minus, Trash2, CreditCard, DollarSign } from "lucide-react"
import { useRouter } from "next/navigation"

import { fetchWithAuth, getStoredAuthSession } from "@/lib/client/auth"

const WALK_IN_CUSTOMER_VALUE = "__walk_in_customer__"
const LOW_STOCK_THRESHOLD = 3

type Product = {
  id: string
  name: string
  category: string
  price: number
  stock: number
  cost?: number
}

type SaleResponse = {
  id: string
  total: number
  paymentMethod?: string | null
}

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  stock: number
}

interface CustomerOption {
  id: string
  name: string
}

export default function SalesPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [customerId, setCustomerId] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [isProcessingSale, setIsProcessingSale] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadProducts = useCallback(async () => {
    try {
      setIsLoadingProducts(true)
      setErrorMessage(null)
      const data = await fetchWithAuth<{ products: Product[] }>("/api/products")
      setProducts(data.products)

      // Update cart items with latest stock information
      setCart((currentCart) =>
        currentCart.map((cartItem) => {
          const updatedProduct = data.products.find((p) => p.id === cartItem.id)
          if (updatedProduct) {
            return {
              ...cartItem,
              stock: updatedProduct.stock,
              quantity: Math.min(cartItem.quantity, updatedProduct.stock),
            }
          }
          return cartItem
        }).filter((item) => item.stock > 0) // Remove items that are now out of stock
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible obtener los productos"
      setErrorMessage(message)
      if (message === "No autorizado" || message === "Sesión expirada") {
        router.replace("/")
      }
    } finally {
      setIsLoadingProducts(false)
    }
  }, [router])

  const loadAuxiliaryData = useCallback(async () => {
    try {
      const [customersResponse, settingsResponse] = await Promise.all([
        fetchWithAuth<{ customers: Array<{ id: string; name: string }> }>("/api/customers"),
        fetchWithAuth<{ business: { paymentMethods: string[] } }>("/api/settings"),
      ])

      setCustomers(
        customersResponse.customers.map((customer) => ({ id: customer.id, name: customer.name })),
      )
      setPaymentMethods(settingsResponse.business.paymentMethods ?? [])
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No fue posible obtener la información auxiliar"
      setErrorMessage(message)
      if (message === "No autorizado" || message === "Sesión expirada") {
        router.replace("/")
      }
    }
  }, [router])

  useEffect(() => {
    const session = getStoredAuthSession()
    if (!session) {
      router.replace("/")
      return
    }
    loadProducts()
    loadAuxiliaryData()
  }, [loadProducts, loadAuxiliaryData, router])

  useEffect(() => {
    if (!paymentMethods.length) {
      setPaymentMethod("")
      return
    }

    if (!paymentMethod || !paymentMethods.includes(paymentMethod)) {
      setPaymentMethod(paymentMethods[0])
    }
  }, [paymentMethods, paymentMethod])

  const categories = useMemo(() => {
    const unique = new Set(
      products
        .map((product) => product.category)
        .filter((category) => category && category.trim().length > 0)
    )
    return Array.from(unique).sort((a, b) => a.localeCompare(b))
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
      return matchesSearch && matchesCategory && product.stock > 0
    })
  }, [products, searchTerm, selectedCategory])

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) {
          return current
        }
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item,
        )
      }

      return [...current, { id: product.id, name: product.name, price: product.price, quantity: 1, stock: product.stock }]
    })
  }

  const incrementQuantity = (id: string) => {
    const item = cart.find((cartItem) => cartItem.id === id)
    if (!item) {
      return
    }
    updateQuantity(id, item.quantity + 1)
  }

  const decrementQuantity = (id: string) => {
    const item = cart.find((cartItem) => cartItem.id === id)
    if (!item) {
      return
    }
    updateQuantity(id, item.quantity - 1)
  }

  const updateQuantity = (id: string, newQuantity: number) => {
    setCart((current) => {
      if (newQuantity <= 0) {
        return current.filter((item) => item.id !== id)
      }

      const product = products.find((p) => p.id === id)
      const maxStock = product?.stock ?? 0
      return current.map((item) =>
        item.id === id ? { ...item, quantity: Math.min(newQuantity, maxStock), stock: maxStock } : item,
      )
    })
  }

  const handleQuickSale = (product: Product) => {
    addToCart(product)
    setIsCheckoutOpen(true)
  }

  const removeFromCart = (id: string) => {
    setCart((current) => current.filter((item) => item.id !== id))
  }

  const calculateTotal = (items: CartItem[]) => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  const calculateTotalQuantity = (items: CartItem[]) => {
    return items.reduce((sum, item) => sum + item.quantity, 0)
  }

  const total = calculateTotal(cart)
  const totalQuantity = calculateTotalQuantity(cart)

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setErrorMessage("Agrega productos al carrito antes de generar la venta")
      return
    }

    if (!paymentMethod) {
      setErrorMessage("Selecciona un método de pago")
      return
    }

    // Validate stock availability before submitting
    const stockIssues: string[] = []
    for (const item of cart) {
      const currentProduct = products.find((p) => p.id === item.id)
      if (!currentProduct) {
        stockIssues.push(`${item.name}: producto no encontrado`)
      } else if (currentProduct.stock < item.quantity) {
        stockIssues.push(`${item.name}: solo hay ${currentProduct.stock} disponibles (solicitaste ${item.quantity})`)
      } else if (currentProduct.stock === 0) {
        stockIssues.push(`${item.name}: sin stock disponible`)
      }
    }

    if (stockIssues.length > 0) {
      setErrorMessage(`Problemas de stock: ${stockIssues.join("; ")}`)
      await loadProducts() // Refresh to get latest stock
      return
    }

    setIsProcessingSale(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const payload = {
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
        customerId: customerId || undefined,
        paymentMethod,
      }

      const sale = await fetchWithAuth<{ sale: SaleResponse }>("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      setSuccessMessage(`Venta ${sale.sale.id} registrada correctamente`)
      setCart([])
      setCustomerId("")
      setPaymentMethod(paymentMethods[0] ?? "")
      setIsCheckoutOpen(false)
      await loadProducts()
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible completar la venta"
      setErrorMessage(message)
      if (message === "No autorizado" || message === "Sesión expirada") {
        router.replace("/")
      }
    } finally {
      setIsProcessingSale(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header currentPath="/sales" />

      <MobileSidebar currentPath="/sales" />

      <Sidebar
        currentPath="/sales"
        className="hidden lg:flex fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 z-20 shadow-[var(--shadow-soft)]"
      />

      <main className="w-full px-4 py-6 lg:px-8 lg:py-8 lg:ml-64 overflow-x-hidden">
        <div className="flex flex-col xl:flex-row gap-6">
          <section className="flex-1 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Punto de Venta</h2>
                <p className="text-muted-foreground">Selecciona productos para agregar a la venta</p>
              </div>
              <Button variant="outline" className="flex items-center gap-2" onClick={loadProducts} disabled={isLoadingProducts}>
                <Plus className="h-4 w-4" />
                Actualizar inventario
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      Todas las categorías
                    </SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {isLoadingProducts
                ? Array.from({ length: 6 }).map((_, index) => (
                    <Card key={index} className="border-dashed" aria-label="Cargando producto">
                      <CardContent className="h-32 animate-pulse" />
                    </Card>
                  ))
                : filteredProducts.map((product) => {
                    const isLowStock = product.stock <= LOW_STOCK_THRESHOLD

                    return (
                      <Card key={product.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{product.name}</CardTitle>
                            <Badge variant={isLowStock ? "destructive" : "secondary"}>
                              Stock: {product.stock}
                            </Badge>
                          </div>
                          <CardDescription>{product.category}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-2xl font-semibold">${product.price.toLocaleString("es-CL")}</p>
                            {product.cost ? (
                              <p className="text-xs text-muted-foreground">Costo: ${product.cost.toLocaleString("es-CL")}</p>
                            ) : null}
                          </div>
                          <div className="flex items-center justify-between">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-2"
                              onClick={() => addToCart(product)}
                              disabled={product.stock === 0}
                              aria-label={`Agregar ${product.name} al carrito`}
                            >
                              <Plus className="h-4 w-4" />
                              Agregar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex items-center gap-2"
                              onClick={() => handleQuickSale(product)}
                              disabled={product.stock === 0 || isProcessingSale}
                              aria-label={`Venta rápida de ${product.name}`}
                            >
                              <CreditCard className="h-4 w-4" />
                              Venta rápida
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
            </div>
          </section>

          <aside className="w-full xl:w-96 bg-card border border-border/80 rounded-lg xl:rounded-none xl:border-l xl:border-t-0 xl:ml-0 xl:sticky xl:top-[calc(4rem+1.5rem)] xl:h-[calc(100vh-4rem-3rem)] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Carrito</h3>
                  <p className="text-sm text-muted-foreground">
                    {cart.length} {cart.length === 1 ? "producto" : "productos"}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCart([])} disabled={cart.length === 0}>
                  Vaciar
                </Button>
              </div>

              <div className="space-y-4">
                {cart.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
                    El carrito está vacío. Agrega productos para iniciar una venta.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border/80 p-4 space-y-3">
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <h4 className="font-semibold">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            ${item.price.toLocaleString("es-CL")} · Stock disponible: {item.stock}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.id)}
                          aria-label={`Eliminar ${item.name} del carrito`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => decrementQuantity(item.id)}
                            aria-label={`Reducir cantidad de ${item.name}`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-10 text-center font-medium" aria-label={`Cantidad: ${item.quantity}`}>
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => incrementQuantity(item.id)}
                            aria-label={`Aumentar cantidad de ${item.name}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Subtotal</p>
                          <p className="font-semibold">
                            ${(item.price * item.quantity).toLocaleString("es-CL")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Productos</span>
                  <span>{totalQuantity}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>${total.toLocaleString("es-CL")}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="customer">Cliente</Label>
                <Select
                  value={customerId || WALK_IN_CUSTOMER_VALUE}
                  onValueChange={(value) =>
                    setCustomerId(value === WALK_IN_CUSTOMER_VALUE ? "" : value)
                  }
                >
                  <SelectTrigger id="customer">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={WALK_IN_CUSTOMER_VALUE}>
                      Cliente mostrador
                    </SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="payment">Método de pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="payment">
                    <SelectValue placeholder="Selecciona un método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full flex items-center gap-2"
                size="lg"
                onClick={() => setIsCheckoutOpen(true)}
                disabled={cart.length === 0 || isProcessingSale}
              >
                <DollarSign className="h-4 w-4" />
                Continuar con el pago
              </Button>

              {successMessage ? <p className="text-sm text-green-600">{successMessage}</p> : null}
              {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
            </div>
          </aside>
        </div>
      </main>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Venta</DialogTitle>
            <DialogDescription>Revisa los detalles antes de completar la transacción.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.name} x{item.quantity}
                </span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total a pagar</span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                ${total.toLocaleString("es-CL")}
              </span>
            </div>
            {paymentMethod && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Método de pago</span>
                <span>{paymentMethod}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCheckout} disabled={isProcessingSale || !paymentMethod}>
              {isProcessingSale ? "Procesando..." : "Confirmar Venta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
