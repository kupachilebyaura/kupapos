"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Users, Package, BarChart3, Settings, Home, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  currentPath?: string
  className?: string
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Punto de Venta", href: "/sales", icon: ShoppingCart },
  { name: "Productos", href: "/products", icon: Package },
  { name: "Clientes", href: "/customers", icon: Users },
  { name: "Reportes", href: "/reports", icon: BarChart3 },
  { name: "Configuración", href: "/settings", icon: Settings },
]

export function Sidebar({ currentPath, className }: SidebarProps) {
  return (
    <div className={cn("flex flex-col h-full bg-sidebar border-r overflow-y-auto", className)}>
      <div className="flex items-center h-16 px-6 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold text-sidebar-foreground">Küpa POS</h1>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = currentPath === item.href
          return (
            <Button
              key={item.name}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
                isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
              onClick={() => (window.location.href = item.href)}
            >
              <item.icon className="mr-3 h-4 w-4" />
              {item.name}
            </Button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-sidebar-foreground/60 text-center">Küpa POS v1.0.0</div>
      </div>
    </div>
  )
}

export function MobileSidebar({ currentPath }: { currentPath?: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setIsOpen(true)}>
        <Menu className="h-5 w-5" />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden">
            <div className="flex items-center justify-between h-16 px-6 bg-sidebar border-b border-sidebar-border">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-sidebar-primary-foreground" />
                </div>
                <h1 className="text-lg font-bold text-sidebar-foreground">Küpa POS</h1>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-sidebar-foreground">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Sidebar currentPath={currentPath} className="h-full" />
          </div>
        </>
      )}
    </>
  )
}
