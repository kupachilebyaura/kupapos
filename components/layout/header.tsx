"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Bell, LogOut, Sun, Moon, KeyRound, User } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"

import { clearAuthSession, getStoredAuthSession, type StoredAuthSession, fetchWithAuth } from "@/lib/client/auth"
import { MobileSidebar } from "./sidebar"

interface HeaderProps {
  currentPath?: string
}

export function Header({ currentPath }: HeaderProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [session, setSession] = useState<StoredAuthSession | null>(null)
  const [businessName, setBusinessName] = useState<string>("")
  const [today, setToday] = useState<string>("")

  useEffect(() => {
    setSession(getStoredAuthSession())
  }, [])

  useEffect(() => {
    const formatDate = () => {
      setToday(
        new Date().toLocaleDateString("es-CL", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      )
    }

    formatDate()
    const interval = setInterval(formatDate, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const loadBusiness = async () => {
      try {
        const response = await fetchWithAuth<{ business: { name: string } }>("/api/settings")
        setBusinessName(response.business.name)
      } catch (error) {
        // Si la sesión expiró durante la carga del header ignoramos el error y permitimos que el flujo normal la renueve.
      }
    }

    if (session) {
      loadBusiness()
    }
  }, [session])

  const initials = useMemo(() => session?.user?.name?.slice(0, 2).toUpperCase() ?? "US", [session?.user?.name])
  const roleLabel = useMemo(() => {
    const map: Record<string, string> = {
      ADMIN: "Administrador",
      MANAGER: "Supervisor",
      USER: "Vendedor",
    }
    return map[session?.user.role ?? ""] ?? "Usuario"
  }, [session?.user.role])

  const handleToggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleLogout = () => {
    clearAuthSession()
    setSession(null)
    router.replace("/")
  }

  return (
    <header className="border-b bg-card/60 backdrop-blur-sm sticky top-0 z-30 w-full">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6 gap-4 max-w-full">
        <div className="flex flex-1 items-center gap-3">
          <MobileSidebar currentPath={currentPath} />

          <div className="hidden lg:flex items-center gap-3">
            <div className="w-10 h-10 relative">
              <Image src="/kupa-logo.png" alt="Küpa POS" width={40} height={40} className="object-contain" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Küpa POS</h1>
          </div>

          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input placeholder="Buscar productos, clientes..." className="pl-10 bg-muted/50 border-0 focus-visible:ring-1" />
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-end mr-4 text-right">
          <p className="text-sm font-semibold text-foreground">{businessName || "Negocio"}</p>
          <p className="text-xs text-muted-foreground capitalize">{today}</p>
        </div>

        <div className="hidden md:flex flex-col items-end mr-4 text-right">
          <p className="text-sm font-medium text-foreground">{session?.user.name ?? "Usuario"}</p>
          <p className="text-xs text-muted-foreground">{roleLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center">
              3
            </span>
          </Button>

          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              {/* Replace Avatar with User icon */}
              <User className="h-9 w-9 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{session?.user.name ?? "Usuario"}</p>
                  <p className="text-xs leading-none text-muted-foreground">{session?.user.email ?? "correo@kupa.com"}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  handleToggleTheme()
                }}
              >
                {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                <span>{theme === "dark" ? "Tema claro" : "Tema oscuro"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  router.push("/settings?tab=security")
                }}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                <span>Cambiar contraseña</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onSelect={(event) => {
                  event.preventDefault()
                  handleLogout()
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Salir</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
