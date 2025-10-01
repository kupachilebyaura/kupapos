"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, Users, Package, BarChart3, Shield } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { getStoredAuthSession, saveAuthSession } from "@/lib/client/auth"
import type { AuthResponse } from "@/lib/services/auth/types"

export default function AuthPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const session = getStoredAuthSession()
    if (session) {
      router.replace("/dashboard")
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsLoggingIn(true)

    const formData = new FormData(e.currentTarget as HTMLFormElement)
    const payload = {
      email: formData.get("email")?.toString() ?? "",
      password: formData.get("password")?.toString() ?? "",
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? "No fue posible iniciar sesión")
      }

      const session = (await response.json()) as AuthResponse
      saveAuthSession(session)
      router.replace("/dashboard")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al iniciar sesión"
      setErrorMessage(message)
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsRegistering(true)

    const formData = new FormData(e.currentTarget as HTMLFormElement)
    const firstName = formData.get("firstName")?.toString().trim() ?? ""
    const lastName = formData.get("lastName")?.toString().trim() ?? ""
    const businessName = formData.get("businessName")?.toString().trim() ?? ""
    const email = formData.get("registerEmail")?.toString().trim() ?? ""
    const password = formData.get("registerPassword")?.toString() ?? ""

    const payload = {
      name: [firstName, lastName].filter(Boolean).join(" "),
      businessName,
      email,
      password,
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? "No fue posible crear la cuenta")
      }

      const session = (await response.json()) as AuthResponse
      saveAuthSession(session)
      router.replace("/dashboard")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear la cuenta"
      setErrorMessage(message)
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden lg:block space-y-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 relative">
                <Image src="/kupa-logo.png" alt="Küpa POS" width={64} height={64} className="object-contain" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Küpa POS</h1>
            </div>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Sistema completo de punto de ventas diseñado para impulsar tu negocio
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground">Gestión de Clientes</h3>
              <p className="text-sm text-muted-foreground">Administra tu base de clientes de manera eficiente</p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground">Control de Inventario</h3>
              <p className="text-sm text-muted-foreground">Mantén tu stock siempre actualizado y optimizado</p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground">Reportes Avanzados</h3>
              <p className="text-sm text-muted-foreground">Analiza el rendimiento de tu negocio en tiempo real</p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground">Seguridad Total</h3>
              <p className="text-sm text-muted-foreground">Protección avanzada para tus datos y transacciones</p>
            </div>
          </div>
        </div>

        {/* Right side - Auth Form */}
        <div className="w-full max-w-md mx-auto">
          <Card className="border-0 shadow-2xl">
            <CardHeader className="space-y-1 text-center">
              <div className="lg:hidden flex items-center justify-center space-x-2 mb-4">
                <div className="w-10 h-10 relative">
                  <Image src="/kupa-logo.png" alt="Küpa POS" width={40} height={40} className="object-contain" />
                </div>
                <h1 className="text-2xl font-bold">Küpa POS</h1>
              </div>
              <CardTitle className="text-2xl font-bold">Bienvenido</CardTitle>
              <CardDescription>Ingresa a tu sistema de punto de ventas</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="register">Registrarse</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <Input id="email" name="email" type="email" placeholder="admin@kupa.com" required className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Contraseña</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          required
                          className="h-11 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                    {errorMessage && (
                      <p className="text-sm text-destructive text-center">{errorMessage}</p>
                    )}
                    <Button type="submit" className="w-full h-11" disabled={isLoggingIn}>
                      {isLoggingIn ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          <span>Iniciando sesión...</span>
                        </div>
                      ) : (
                        "Iniciar Sesión"
                      )}
                    </Button>
                  </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                  <form className="space-y-4" onSubmit={handleRegister}>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Nombre</Label>
                        <Input id="firstName" name="firstName" placeholder="Jose" required className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Apellido</Label>
                        <Input id="lastName" name="lastName" placeholder="Pérez" required className="h-11" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Nombre del Negocio</Label>
                      <Input id="businessName" name="businessName" placeholder="Mi Tienda" required className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registerEmail">Correo Electrónico</Label>
                      <Input
                        id="registerEmail"
                        name="registerEmail"
                        type="email"
                        placeholder="correo@ejemplo.com"
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registerPassword">Contraseña</Label>
                      <Input
                        id="registerPassword"
                        name="registerPassword"
                        type="password"
                        placeholder="••••••••"
                        required
                        className="h-11"
                      />
                    </div>
                    {errorMessage && (
                      <p className="text-sm text-destructive text-center">{errorMessage}</p>
                    )}
                    <Button type="submit" className="w-full h-11" disabled={isRegistering}>
                      {isRegistering ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          <span>Creando cuenta...</span>
                        </div>
                      ) : (
                        "Crear Cuenta"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
