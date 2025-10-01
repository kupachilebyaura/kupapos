import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

const HEADERS = [
  "Nombre Completo",
  "RUT",
  "Correo Electrónico",
  "Teléfono",
  "Dirección",
  "Región",
  "Comuna",
  "Fecha de Nacimiento (DD-MM-YYYY)",
  "Detalles extras",
]

export async function GET() {
  const worksheet = XLSX.utils.aoa_to_sheet([
    HEADERS,
    [
      "Cliente Ejemplo",
      "cliente@ejemplo.com",
      "12.345.678-9",
      "+56 9 1234 5678",
      "Av. Siempre Viva 123",
      "Metropolitana de Santiago",
      "Santiago",
      "1985-05-20",
      "Observaciones opcionales",
    ],
  ])

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes")

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-clientes.xlsx"',
    },
  })
}
