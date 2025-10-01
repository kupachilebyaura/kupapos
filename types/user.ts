export type Role = "ADMIN" | "MANAGER" | "USER"

export interface User {
  id: string
  email: string
  name: string
  role: Role
  businessId: string
  createdAt: string
}
