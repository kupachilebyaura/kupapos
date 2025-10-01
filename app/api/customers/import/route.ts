import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { z } from "zod"

import { requireAuth } from "@/lib/services/auth/middleware"
import { CustomersService } from "@/lib/services/customersService"
import { normalizeRut } from "@/lib/utils/rut"
import { chileRegions } from "@/lib/data/cl-geo"

const rowSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  rut: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  region: z.string().optional(),
  commune: z.string().optional(),
  birthDate: z.union([z.string(), z.number()]).optional(),
  notes: z.string().optional(),
})

const parseSpreadsheetDate = (raw?: string | number | null) => {
  if (raw === null || raw === undefined || raw === "") {
    return null
  }

  if (typeof raw === "number") {
    const parsed = XLSX.SSF.parse_date_code(raw)
    if (!parsed) {
      throw new Error("Fecha inválida")
    }
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
  }

  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }

  const normalized = trimmed.replaceAll("/", "-")
  const match = normalized.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!match) {
    throw new Error("La fecha debe tener el formato DD-MM-YYYY")
  }

  const [, day, month, year] = match
  const isoString = `${year}-${month}-${day}`
  const date = new Date(isoString)

  if (Number.isNaN(date.getTime())) {
    throw new Error("Fecha inválida")
  }

  return date
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Debes adjuntar un archivo" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]

    if (!sheetName) {
      return NextResponse.json({ error: "El archivo no contiene hojas" }, { status: 400 })
    }

    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" })

    const results: { imported: number; errors: Array<{ row: number; message: string }> } = {
      imported: 0,
      errors: [],
    }

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]
      const rawName = String(row["Nombre Completo"] ?? "").trim()

      if (!rawName) {
        continue
      }

      const parsed = rowSchema.safeParse({
        name: rawName,
        rut: String(row["RUT"] ?? "").trim() || undefined,
        email: String(row["Correo Electrónico"] ?? "").trim() || undefined,
        phone: String(row["Teléfono"] ?? "").trim() || undefined,
        address: String(row["Dirección"] ?? "").trim() || undefined,
        region: String(row["Región"] ?? "").trim() || undefined,
        commune: String(row["Comuna"] ?? "").trim() || undefined,
        birthDate: row["Fecha de Nacimiento (DD-MM-YYYY)"] ?? row["Fecha de Nacimiento"] ?? undefined,
        notes: String(row["Detalles extras"] ?? "").trim() || undefined,
      })

      if (!parsed.success) {
        results.errors.push({
          row: index + 2,
          message: parsed.error.issues.map((issue) => issue.message).join(", "),
        })
        continue
      }

      try {
        const birthDate = parseSpreadsheetDate(parsed.data.birthDate ?? null)
        const normalizedRut = parsed.data.rut ? normalizeRut(parsed.data.rut) : undefined

        let regionName = parsed.data.region || undefined
        let communeName = parsed.data.commune || undefined

        if (communeName && !regionName) {
          throw new Error("La comuna requiere una región asociada")
        }

        if (regionName) {
          const region = chileRegions.find((item) => item.name.toLowerCase() === regionName!.toLowerCase())
          if (!region) {
            throw new Error(`Región no reconocida: ${regionName}`)
          }
          regionName = region.name
          if (communeName) {
            const communeMatch = region.communes.find(
              (commune) => commune.toLowerCase() === communeName!.toLowerCase(),
            )
            if (!communeMatch) {
              throw new Error(`La comuna ${communeName} no pertenece a ${region.name}`)
            }
            communeName = communeMatch
          }
        }

        const { name, email, phone, address, notes } = parsed.data

        await CustomersService.createCustomer(session.user.businessId, {
          name,
          email,
          phone,
          address,
          notes,
          rut: normalizedRut,
          birthDate: birthDate ?? undefined,
          region: regionName ?? undefined,
          commune: communeName ?? undefined,
        })
        results.imported += 1
      } catch (error) {
        const message = error instanceof Error ? error.message : "No fue posible crear el cliente"
        results.errors.push({ row: index + 2, message })
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al importar clientes"
    const status = message === "No autorizado" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
