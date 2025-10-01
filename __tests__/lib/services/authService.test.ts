import bcrypt from 'bcryptjs'
import { AuthService } from '@/lib/services/auth/authService'
import { signAuthToken } from '@/lib/services/auth/token'
import prisma from '@/lib/prisma'

// Mock dependencies
jest.mock('bcryptjs')
jest.mock('@/lib/services/auth/token')

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>
const mockedSignAuthToken = signAuthToken as jest.MockedFunction<typeof signAuthToken>

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('login', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'ADMIN' as const,
      businessId: 'business-123',
      passwordHash: 'hashed-password',
      active: true,
      createdAt: new Date('2025-01-01'),
    }

    it('should successfully login with valid credentials', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'Password123!',
      }

      mockedBcrypt.compare.mockResolvedValue(true as never)
      mockedSignAuthToken.mockReturnValue({
        token: 'mock-jwt-token',
        expiresAt: Date.now() + 3600000,
      })

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any)

      // Act
      const result = await AuthService.login(credentials)

      // Assert
      expect(result).toHaveProperty('user')
      expect(result).toHaveProperty('token')
      expect(result).toHaveProperty('expiresAt')
      expect(result.user.email).toBe('test@example.com')
      expect(result.token).toBe('mock-jwt-token')
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: credentials.email },
      })
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        credentials.password,
        mockUser.passwordHash
      )
    })

    it('should throw error for non-existent user', async () => {
      // Arrange
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

      // Act & Assert
      await expect(
        AuthService.login({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow('Credenciales inválidas')
    })

    it('should throw error for inactive user', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, active: false }
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(inactiveUser as any)

      // Act & Assert
      await expect(
        AuthService.login({
          email: 'test@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow('Credenciales inválidas')
    })

    it('should throw error for invalid password', async () => {
      // Arrange
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any)
      mockedBcrypt.compare.mockResolvedValue(false as never)

      // Act & Assert
      await expect(
        AuthService.login({
          email: 'test@example.com',
          password: 'WrongPassword',
        })
      ).rejects.toThrow('Credenciales inválidas')
    })
  })

  describe('register', () => {
    it('should successfully register a new user and business', async () => {
      // Arrange
      const registerPayload = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'Password123!',
        businessName: 'New Business',
      }

      const mockBusiness = {
        id: 'business-456',
        name: 'New Business',
        createdAt: new Date(),
      }

      const mockUser = {
        id: 'user-456',
        email: registerPayload.email,
        name: registerPayload.name,
        role: 'ADMIN' as const,
        businessId: mockBusiness.id,
        passwordHash: 'hashed-password',
        active: true,
        createdAt: new Date(),
      }

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)
      jest.spyOn(prisma.business, 'create').mockResolvedValue(mockBusiness as any)
      jest.spyOn(prisma.user, 'create').mockResolvedValue(mockUser as any)
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never)
      mockedSignAuthToken.mockReturnValue({
        token: 'mock-jwt-token',
        expiresAt: Date.now() + 3600000,
      })

      // Act
      const result = await AuthService.register(registerPayload)

      // Assert
      expect(result).toHaveProperty('user')
      expect(result).toHaveProperty('token')
      expect(result.user.email).toBe(registerPayload.email)
      expect(prisma.business.create).toHaveBeenCalledWith({
        data: { name: registerPayload.businessName },
      })
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(registerPayload.password, 12)
    })

    it('should throw error if email already exists', async () => {
      // Arrange
      const existingUser = {
        id: 'user-123',
        email: 'existing@example.com',
      }

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(existingUser as any)

      // Act & Assert
      await expect(
        AuthService.register({
          email: 'existing@example.com',
          name: 'Test User',
          password: 'Password123!',
          businessName: 'Test Business',
        })
      ).rejects.toThrow('El correo electrónico ya está registrado')
    })

    it('should throw error if business name is empty', async () => {
      // Arrange
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

      // Act & Assert
      await expect(
        AuthService.register({
          email: 'newuser@example.com',
          name: 'New User',
          password: 'Password123!',
          businessName: '   ', // Empty business name
        })
      ).rejects.toThrow('El nombre del negocio es obligatorio')
    })
  })

  describe('verifyToken', () => {
    it('should return null for missing token', async () => {
      // Act
      const result = await AuthService.verifyToken()

      // Assert
      expect(result).toBeNull()
    })

    it('should return null for invalid token', async () => {
      // Arrange
      const { verifyAuthToken } = require('@/lib/services/auth/token')
      verifyAuthToken.mockReturnValue(null)

      // Act
      const result = await AuthService.verifyToken('invalid-token')

      // Assert
      expect(result).toBeNull()
    })

    it('should return user for valid token', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN' as const,
        businessId: 'business-123',
        active: true,
        createdAt: new Date(),
      }

      const { verifyAuthToken } = require('@/lib/services/auth/token')
      verifyAuthToken.mockReturnValue({
        sub: 'user-123',
        role: 'ADMIN',
        businessId: 'business-123',
      })

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any)

      // Act
      const result = await AuthService.verifyToken('valid-token')

      // Assert
      expect(result).not.toBeNull()
      expect(result?.email).toBe('test@example.com')
    })
  })
})
