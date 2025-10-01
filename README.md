# Küpa POS

Modern point-of-sale platform built with Next.js 14 App Router, designed for multi-negocio deployments that manage inventory, ventas, clientes y reportes en tiempo real. The stack couples a typed React frontend with Prisma + PostgreSQL on the backend, secured by JWT-based authentication and role-aware authorization.

## Features
- **Autenticación y multinegocio:** Registro inicial crea negocio + administrador; control de sesión via JWT almacenado en `localStorage`. Middleware valida cada ruta `/api/**`.
- **Dashboard ejecutivo:** Métricas diarias, tendencia de ventas (Recharts), top productos, ventas recientes y alertas de stock con formato monetario según la moneda del negocio.
- **Punto de venta (Sales):** Búsqueda rápida, filtros por categoría, carrito con control de stock, venta rápida, selección de clientes y métodos de pago configurables por negocio.
- **Caja y arqueo:** Apertura/cierre de caja con arqueo de diferencias, historial de sesiones y bloqueo opcional de ventas sin stock disponible.
- **Gestión de productos:** Tabla con filtros, badges de stock, alta manual, importación masiva Excel (`.xlsx`/`.xls`) y descarga de plantilla lista para completar.
- **Clientes:** Registro con RUT validado, selector oficial de regiones/comunas, notas y cumpleaños, importación/exportación y vista detallada de historial y métricas agregadas.
- **Descuentos y propinas:** Descuentos por línea o totales, propina electrónica y anulación de ventas con reintegro automático del inventario.
- **Reportes analíticos:** KPIs, serie temporal de ventas, distribución por categoría, ranking de productos y clientes, selección de períodos (7/30/90 días, año).
- **Configuración integral:** Datos del negocio, impuestos, métodos de pago, notificaciones y **gestión de usuarios secundarios** (solo un admin por negocio; puede crear MANAGER/USER, editarlos e inactivarlos).
- **Responsividad avanzada:** Breakpoints personalizados (`sm`=577px, `md`=769px, `lg`=993px, `xl`=1201px, `2xl`=1600px) y `@custom-media` declarados en `app/globals.css` para móviles, tablets, desktop y monitores 2K/4K.

## Tech Stack
- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript 5
- **UI:** Tailwind CSS 4, shadcn/ui components, Lucide icons, Recharts para gráficas
- **Estado / hooks:** React hooks + utilidades propias (`fetchWithAuth`, `getStoredAuthSession`)
- **Backend:** Next.js Route Handlers (`app/api/**`) + Prisma Client 6 + PostgreSQL
- **Auth:** JSON Web Tokens (`jsonwebtoken`), `bcryptjs` para hashing, middleware `requireAuth`
- **Herramientas:** ESLint (`next/core-web-vitals`), Tailwind PostCSS, date-fns, xlsx para importar/exportar

## Project Structure (parcial)
- `app/` – Páginas App Router (dashboard, sales, products, customers, reports, settings) + rutas API.
- `components/` – Layouts y biblioteca UI reutilizable (`components/ui/**`, `components/layout/**`).
- `lib/` – Prisma client, servicios de dominio (auth, analytics, products, sales, users, etc.) y utilidades.
- `prisma/` – `schema.prisma` + migraciones de base de datos.
- `types/` – Tipos compartidos (`auth`, `user`).
- `styles/` – Hoja global (importa `app/globals.css`).

## Data Model (Prisma)
- **Business** ↔ `1:N` **User**, `Product`, `Sale`, `Customer`; configura moneda, impuestos y notificaciones.
- **User** – Roles `ADMIN | MANAGER | USER`, `active` para suspender acceso.
- **Product** – Stock, `minStock`, `cost`, `category`, `details`; relación con `SaleItem`.
- **Sale** – Total, `paymentMethod`, descuentos y propinas, estado (`COMPLETED`/`VOIDED`), relación opcional a sesión de caja y cliente.
- **SaleItem** – Cantidad, precio histórico y descuento aplicado por producto.
- **Customer** – Datos de contacto, RUT validado, región/comuna, notas y historial de compras.

## API Overview
Todas las rutas bajo `/api/**` requieren JWT válido (`Authorization: Bearer <token>`).
- **Auth:** `/api/auth/login`, `/api/auth/logout`, `/api/auth/register`, `/api/auth/me`.
- **Products:** CRUD básico + importación (`POST /api/products/import`) y plantilla (`GET /api/products/template`).
- **Customers:** CRUD, import (`/api/customers/import`) y plantilla (`/api/customers/template`).
- **Sales:** `POST /api/sales` registra venta, descuenta stock; `POST /api/sales/:id/void` genera nota interna y repone inventario.
- **Caja:** `GET /api/cash-sessions`, `POST /api/cash-sessions` (apertura) y `POST /api/cash-sessions/:id/close` (cierre con arqueo).
- **Reports:** `/api/reports?period=7days|30days|90days|year` devuelve métricas agregadas.
- **Settings:** `/api/settings` lee/actualiza configuración del negocio.
- **Users:** `/api/users` (listar/crear) y `/api/users/[id]` (PATCH actualizar rol, email, nombre, contraseña o `active`). Protección extra para impedir múltiples admins.

## Import Templates
### Productos (`plantilla-productos.xlsx`)
Columnas esperadas: `Nombre`, `Categoría`, `Precio`, `Stock`, `Stock Mínimo`, `Código de Barras`, `Costo`, `Detalles extras`.
- Números se parsean como `Number`; vacíos se ignoran.
- Filas sin nombre se omiten; errores se reportan con número de fila (`errors[]`).

### Clientes
Columnas: `Nombre`, `RUT`, `Correo`, `Teléfono`, `Dirección`, `Región`, `Comuna`, `Fecha de Nacimiento`, `Notas`.
- Fechas se convierten al formato estándar ISO; el RUT se normaliza y se valida dígito verificador.
- Se muestra resumen con filas importadas y errores encontrados (región/comuna inválidas, RUT duplicado, etc.).

## Setup & Installation
1. **Requisitos**
   - Node.js 18+
   - PostgreSQL 13+
2. **Clonar e instalar**
   ```bash
   git clone <repo>
   cd kupa-pos
   npm install
   ```
3. **Configurar entorno** (`.env.local`)
   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/kupa_pos"
   AUTH_SECRET="cambia-esto-por-un-secreto-seguro"
   ```
4. **Migrar base**
   ```bash
   npx prisma migrate dev
   ```
   (usa `npx prisma migrate deploy` en producción).
5. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```
6. **Crear administrador inicial**
   - `POST /api/auth/register` con `name`, `email`, `password`, `businessName` (opcional `role`).
   - Guardar `token` de la respuesta en el cliente (la UI lo hace automáticamente tras login/register).

## Scripts
- `npm run dev` – Next.js dev server con recarga.
- `npm run build` – Build de producción (se valida en este branch).
- `npm run start` – Sirve la app compilada.
- `npm run lint` – Ejecuta ESLint (`next/core-web-vitals`).
- `npx prisma studio` – GUI para datos.

## Development Notes
- **Autenticación:** `lib/client/auth.ts` maneja `localStorage`. Al expirar el token, se limpia sesión y se redirige.
- **Servicios:** Lógica de negocio aislada en `lib/services/**`, facilitando testing y reutilización desde API routes.
- **Fetch seguro:** `fetchWithAuth` añade JWT y maneja mensajes de error; para descargas binarias se usa `fetch` directo con el token (ej. plantilla de productos).
- **Responsividad:** Breakpoints personalizados en `tailwind.config.ts` y `@custom-media` en `app/globals.css` simplifican rules específicas por dispositivo.
- **Lint/Type Check:** `next lint`, `npx tsc --noEmit`, y `npm run build` ya se ejecutaron sin errores después de la refactorización.
- **Dependencias con advisories:**
  - `next@14.2.33` es el mínimo seguro actual (corrige varios CVE de DoS/SSRF/Cache Poisoning). Mantenerse atento a nuevos boletines oficiales.
  - `xlsx@0.18.5` (SheetJS) continúa con dos CVE abiertos (Prototype Pollution y ReDoS) sin parche estable. Sugerencias: aceptar únicamente archivos de confianza, validar tamaño/columnas antes de procesarlos, monitorear https://github.com/SheetJS/sheetjs/issues/3347 y planificar migración a alternativas (`exceljs`, `csv-parse`, etc.) cuando sea viable.
- **Control de caja:** El flujo de apertura/cierre vive en `/api/cash-sessions`; las ventas adjuntan automáticamente la sesión abierta para calcular arqueos y permitir anulación con reintegro de stock.

## Próximos Pasos Recomendados
- Añadir pruebas automáticas (unitarias/integ.) para servicios Prisma y flujos críticos (`salesService`, `authService`).
- Implementar revocación de sesión (lista negra o rotación de tokens) y recuperación de contraseña.
- Definir políticas de backup para archivos importados y logs de auditoría.

La base está lista para operar o iterar nuevas funcionalidades respetando la arquitectura modular actual.
