import type { AuthResponse } from "@/lib/services/auth/types"

const STORAGE_KEY = "kupa-auth-session"

const isBrowser = () => typeof window !== "undefined"

export type StoredAuthSession = AuthResponse

export function saveAuthSession(session: StoredAuthSession) {
  if (!isBrowser()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function getStoredAuthSession(): StoredAuthSession | null {
  if (!isBrowser()) return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredAuthSession
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function clearAuthSession() {
  if (!isBrowser()) return
  localStorage.removeItem(STORAGE_KEY)
}

export async function fetchWithAuth<TResponse>(input: RequestInfo, init: RequestInit = {}): Promise<TResponse> {
  if (!isBrowser()) {
    throw new Error("Operación no disponible en el servidor")
  }

  const session = getStoredAuthSession()

  if (!session) {
    throw new Error("No autorizado")
  }

  const headers = new Headers(init.headers ?? {})
  headers.set("Authorization", `Bearer ${session.token}`)

  const response = await fetch(input, {
    ...init,
    headers,
  })

  if (response.status === 401) {
    clearAuthSession()
    throw new Error("Sesión expirada")
  }

  if (!response.ok) {
    let message = "Error desconocido"
    try {
      const data = (await response.json()) as { error?: string | { message?: string }[] }
      if (typeof data.error === "string") {
        message = data.error
      } else if (Array.isArray(data.error) && data.error[0]?.message) {
        message = data.error[0].message as string
      }
    } catch (error) {
      message = response.statusText || message
    }

    throw new Error(message)
  }

  return response.json() as Promise<TResponse>
}
