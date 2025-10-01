import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

const HEADERS = [
  "Nombre",
  "Categoría",
  "Precio",
  "Stock",
  "Stock Mínimo",
  "Código de Barras",
  "Costo",
  "Detalles extras",
]

export async function GET() {
  const worksheet = XLSX.utils.aoa_to_sheet([
    HEADERS,
    [
      "Ejemplo Producto",
      "Bebidas",
      1500,
      10,
      2,
      "1234567890123",
      900,
      "Observaciones opcionales",
    ],
  ])

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Productos")

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-productos.xlsx"',
    },
  })
}
