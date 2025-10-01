import type { Role, User } from "./user"

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  businessName: string
  role?: Role
}

export interface AuthSession {
  user: User
  token: string
}

export interface AuthError {
  message: string
  status?: number
}
