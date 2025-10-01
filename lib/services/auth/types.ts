import type { User } from "@/types/user"

export type { Role } from "@/types/user"

export interface AuthResponse {
  user: User
  token: string
  expiresAt: string
}
