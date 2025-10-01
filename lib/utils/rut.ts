export const cleanRut = (rut: string) => rut.replace(/[^0-9kK]/g, "").toUpperCase()

export const formatRut = (rut: string) => {
  const clean = cleanRut(rut)
  if (clean.length <= 1) return clean
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  const reversed = body.split("").reverse()
  const grouped: string[] = []
  for (let i = 0; i < reversed.length; i += 1) {
    grouped.push(reversed[i])
    if ((i + 1) % 3 === 0 && i + 1 !== reversed.length) {
      grouped.push(".")
    }
  }
  return `${grouped.reverse().join("")}-${dv}`
}

export const validateRut = (rut: string) => {
  const clean = cleanRut(rut)
  if (clean.length < 2) return false
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  let sum = 0
  let multiplier = 2
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }
  const remainder = 11 - (sum % 11)
  const computedDv = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder)
  return computedDv === dv.toUpperCase()
}

export const normalizeRut = (rut: string) => {
  const clean = cleanRut(rut)
  if (!validateRut(clean)) {
    throw new Error("RUT inválido")
  }
  return formatRut(clean)
}
