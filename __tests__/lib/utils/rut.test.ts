import { validateRut, formatRut, cleanRut, normalizeRut } from '@/lib/utils/rut'

describe('RUT Utils', () => {
  describe('validateRut', () => {
    it('should validate correct RUTs', () => {
      expect(validateRut('11.111.111-1')).toBe(true)
      expect(validateRut('22.222.222-2')).toBe(true)
      expect(validateRut('12.345.678-5')).toBe(true)
      expect(validateRut('76.123.456-K')).toBe(true)
      expect(validateRut('76.123.456-k')).toBe(true) // lowercase k
    })

    it('should reject invalid RUTs', () => {
      expect(validateRut('11.111.111-2')).toBe(false) // Wrong check digit
      expect(validateRut('12.345.678-0')).toBe(false) // Wrong check digit
      expect(validateRut('invalid')).toBe(false)
      expect(validateRut('')).toBe(false)
      expect(validateRut('123')).toBe(false) // Too short
    })

    it('should validate RUTs without formatting', () => {
      expect(validateRut('111111111')).toBe(true)
      expect(validateRut('222222222')).toBe(true)
      expect(validateRut('123456785')).toBe(true)
    })
  })

  describe('formatRut', () => {
    it('should format RUTs correctly', () => {
      expect(formatRut('111111111')).toBe('11.111.111-1')
      expect(formatRut('11111111-1')).toBe('11.111.111-1')
      expect(formatRut('11.111.111-1')).toBe('11.111.111-1')
      expect(formatRut('76123456K')).toBe('76.123.456-K')
    })

    it('should handle invalid input gracefully', () => {
      expect(formatRut('')).toBe('')
      expect(formatRut('123')).toBe('123')
      expect(formatRut('abc')).toBe('abc')
    })

    it('should preserve uppercase K', () => {
      expect(formatRut('76123456K')).toBe('76.123.456-K')
      expect(formatRut('76123456k')).toBe('76.123.456-K')
    })
  })

  describe('cleanRut', () => {
    it('should remove all formatting characters', () => {
      expect(cleanRut('11.111.111-1')).toBe('111111111')
      expect(cleanRut('76.123.456-K')).toBe('76123456K')
      expect(cleanRut('12.345.678-5')).toBe('123456785')
    })

    it('should handle already clean RUTs', () => {
      expect(cleanRut('111111111')).toBe('111111111')
      expect(cleanRut('76123456K')).toBe('76123456K')
    })

    it('should convert k to uppercase', () => {
      expect(cleanRut('76123456k')).toBe('76123456K')
      expect(cleanRut('76.123.456-k')).toBe('76123456K')
    })
  })

  describe('normalizeRut', () => {
    it('should normalize and validate RUTs', () => {
      const result1 = normalizeRut('11.111.111-1')
      expect(result1.isValid).toBe(true)
      expect(result1.clean).toBe('111111111')
      expect(result1.formatted).toBe('11.111.111-1')

      const result2 = normalizeRut('76123456K')
      expect(result2.isValid).toBe(true)
      expect(result2.clean).toBe('76123456K')
      expect(result2.formatted).toBe('76.123.456-K')
    })

    it('should handle invalid RUTs', () => {
      const result = normalizeRut('11.111.111-2')
      expect(result.isValid).toBe(false)
      expect(result.clean).toBe('111111112')
      expect(result.formatted).toBe('11.111.111-2')
    })

    it('should handle empty input', () => {
      const result = normalizeRut('')
      expect(result.isValid).toBe(false)
      expect(result.clean).toBe('')
      expect(result.formatted).toBe('')
    })
  })

  describe('Edge cases', () => {
    it('should handle minimum valid RUT', () => {
      expect(validateRut('1000000-6')).toBe(true)
      expect(formatRut('10000006')).toBe('1.000.000-6')
    })

    it('should handle maximum valid RUT', () => {
      expect(validateRut('99.999.999-9')).toBe(true)
    })

    it('should handle RUTs with K check digit', () => {
      expect(validateRut('11111111-K')).toBe(true)
      expect(formatRut('11111111K')).toBe('11.111.111-K')
    })
  })
})
