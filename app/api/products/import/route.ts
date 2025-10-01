import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { z } from "zod"

import { requireAuth } from "@/lib/services/auth/middleware"
import { ProductsService } from "@/lib/services/productsService"

const rowSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  category: z.string().min(1, "La categoría es obligatoria"),
  price: z.number().nonnegative(),
  stock: z.number().int().nonnegative(),
  minStock: z.number().int().nonnegative(),
  barcode: z.string().max(64).optional(),
  cost: z.number().nonnegative().optional(),
  details: z.string().max(500).optional(),
})

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
      const rawName = String(row["Nombre"] ?? "").trim()

      if (!rawName) {
        continue
      }

      const parsed = rowSchema.safeParse({
        name: rawName,
        category: String(row["Categoría"] ?? "").trim(),
        price: Number(row["Precio"] ?? 0),
        stock: Number(row["Stock"] ?? 0),
        minStock: Number(row["Stock Mínimo"] ?? 0),
        barcode: String(row["Código de Barras"] ?? "").trim() || undefined,
        cost: row["Costo"] !== undefined && row["Costo"] !== "" ? Number(row["Costo"]) : undefined,
        details: String(row["Detalles extras"] ?? "").trim() || undefined,
      })

      if (!parsed.success) {
        results.errors.push({
          row: index + 2,
          message: parsed.error.issues.map((issue) => issue.message).join(", "),
        })
        continue
      }

      try {
        await ProductsService.createProduct({
          ...parsed.data,
          businessId: session.user.businessId,
        })
        results.imported += 1
      } catch (error) {
        const message = error instanceof Error ? error.message : "No fue posible crear el producto"
        results.errors.push({ row: index + 2, message })
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al importar productos"
    const status = message === "No autorizado" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
