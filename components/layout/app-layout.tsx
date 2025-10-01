"use client"

import { ReactNode } from "react"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { cn } from "@/lib/utils"

interface AppLayoutProps {
  children: ReactNode
  currentPath?: string
  className?: string
  fullWidth?: boolean
}

/**
 * Main App Layout Component
 * Provides consistent layout structure across all authenticated pages
 */
export function AppLayout({ children, currentPath, className, fullWidth = false }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <Header currentPath={currentPath} />

      {/* Desktop Sidebar - Hidden on mobile */}
      <Sidebar
        currentPath={currentPath}
        className="hidden lg:flex fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 z-20"
      />

      {/* Main Content Area */}
      <main
        className={cn(
          "w-full",
          "transition-all duration-300",
          !fullWidth && "lg:ml-64", // Add left margin for sidebar on desktop
          className
        )}
      >
        <div className={cn(
          "min-h-[calc(100vh-4rem)]",
          !fullWidth && "px-4 py-6 lg:px-8 lg:py-8"
        )}>
          {children}
        </div>
      </main>
    </div>
  )
}
