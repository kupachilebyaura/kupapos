# KÜPA POS - Guía de Desarrollo

## 🚀 Inicio Rápido

### Requisitos Previos

- Node.js 20+
- Docker y Docker Compose
- PostgreSQL 16+ (si no usas Docker)
- npm o pnpm

### Configuración con Docker (Recomendado)

1. **Clonar el repositorio**
```bash
cd /ruta/a/kupa-pos
```

2. **Crear archivo de variables de entorno**
```bash
cp .env.example .env
```

Editar `.env` con tus configuraciones:
```env
DATABASE_URL="postgresql://kupauser:kupapass@postgres:5432/kupapos?schema=public"
REDIS_URL="redis://:kupapass@redis:6379"
JWT_SECRET="tu-secret-key-super-seguro-cambiar-en-produccion"
JWT_EXPIRES_IN="3600"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

3. **Levantar servicios con Docker**
```bash
npm run docker:dev
```

Esto iniciará:
- PostgreSQL en `localhost:5432`
- Redis en `localhost:6379`
- Next.js App en `localhost:3000`
- Prisma Studio en `localhost:5555`

4. **Ejecutar migraciones**
```bash
npm run prisma:migrate
```

5. **Abrir la aplicación**
- App: http://localhost:3000
- Prisma Studio: http://localhost:5555

### Configuración Sin Docker

1. **Instalar dependencias**
```bash
npm install
```

2. **Configurar PostgreSQL localmente**
```bash
# Crear base de datos
createdb kupapos
```

3. **Configurar variables de entorno**
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/kupapos?schema=public"
JWT_SECRET="tu-secret-key"
JWT_EXPIRES_IN="3600"
```

4. **Ejecutar migraciones**
```bash
npm run prisma:migrate
npm run prisma:generate
```

5. **Iniciar servidor de desarrollo**
```bash
npm run dev
```

---

## 🧪 Testing

### Ejecutar Tests

```bash
# Modo watch (desarrollo)
npm test

# Ejecutar una vez
npm run test:ci

# Con cobertura
npm run test:coverage
```

### Estructura de Tests

```
__tests__/
├── lib/
│   ├── services/
│   │   ├── authService.test.ts
│   │   ├── salesService.test.ts
│   │   └── cashSessionService.test.ts
│   └── utils/
│       └── rut.test.ts
└── app/
    └── api/
        └── sales/
            └── route.test.ts
```

### Escribir Tests

```typescript
// __tests__/lib/services/myService.test.ts
import { MyService } from '@/lib/services/myService'
import prisma from '@/lib/prisma'

describe('MyService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should do something', async () => {
    // Arrange
    jest.spyOn(prisma.model, 'findMany').mockResolvedValue([...])

    // Act
    const result = await MyService.doSomething()

    // Assert
    expect(result).toBeDefined()
    expect(prisma.model.findMany).toHaveBeenCalled()
  })
})
```

### Cobertura de Tests

Meta actual: **60%** (configurado en `jest.config.js`)

```bash
npm run test:coverage

# Ver reporte HTML
open coverage/lcov-report/index.html
```

---

## 🐳 Docker

### Comandos Útiles

```bash
# Iniciar servicios
npm run docker:dev

# Ver logs en tiempo real
npm run docker:logs

# Detener servicios
npm run docker:down

# Reconstruir imágenes
npm run docker:rebuild

# Ejecutar comando en contenedor
docker-compose exec app npm run prisma:studio

# Acceder a shell del contenedor
docker-compose exec app sh

# Ver estado de servicios
docker-compose ps
```

### Arquitectura de Contenedores

```
┌─────────────────┐
│   Next.js App   │  :3000
│  (Development)  │
└────────┬────────┘
         │
    ┌────┴────┬──────────┐
    ▼         ▼          ▼
┌────────┐ ┌──────┐ ┌───────────┐
│Postgres│ │Redis │ │  Prisma   │
│  :5432 │ │:6379 │ │Studio:5555│
└────────┘ └──────┘ └───────────┘
```

### Volúmenes

- `postgres_data`: Datos persistentes de PostgreSQL
- `redis_data`: Datos persistentes de Redis
- `.:/app`: Código fuente (bind mount para hot-reload)

---

## 🗃️ Base de Datos

### Prisma CLI

```bash
# Generar Prisma Client
npm run prisma:generate

# Crear migración
npm run prisma:migrate

# Abrir Prisma Studio
npm run prisma:studio

# Resetear base de datos (⚠️ elimina datos)
npx prisma migrate reset

# Ver estado de migraciones
npx prisma migrate status

# Aplicar migraciones en producción
npx prisma migrate deploy
```

### Modificar Schema

1. Editar `prisma/schema.prisma`
2. Crear migración:
```bash
npx prisma migrate dev --name descripcion_del_cambio
```
3. Revisar SQL generado en `prisma/migrations/`
4. Aplicar en otros ambientes con `prisma migrate deploy`

---

## 🔧 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia servidor de desarrollo |
| `npm run build` | Construye para producción |
| `npm run start` | Inicia servidor de producción |
| `npm run lint` | Ejecuta ESLint |
| `npm test` | Tests en modo watch |
| `npm run test:ci` | Tests para CI/CD |
| `npm run test:coverage` | Tests con cobertura |
| `npm run docker:dev` | Inicia Docker Compose |
| `npm run docker:down` | Detiene Docker Compose |
| `npm run docker:logs` | Ver logs de Docker |
| `npm run docker:rebuild` | Reconstruir contenedores |
| `npm run prisma:studio` | Abrir Prisma Studio |
| `npm run prisma:migrate` | Ejecutar migraciones |
| `npm run prisma:generate` | Generar Prisma Client |

---

## 🏗️ Estructura del Proyecto

```
kupa-pos/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── auth/            # Autenticación
│   │   ├── sales/           # Ventas
│   │   ├── products/        # Productos
│   │   ├── customers/       # Clientes
│   │   ├── cash-sessions/   # Sesiones de caja
│   │   └── health/          # Health check
│   ├── dashboard/           # Páginas del dashboard
│   ├── sales/               # POS
│   └── layout.tsx           # Layout principal
├── components/              # Componentes React
│   ├── ui/                  # Componentes UI (shadcn)
│   └── layout/              # Layout components
├── lib/                     # Lógica de negocio
│   ├── services/            # Servicios de negocio
│   │   ├── auth/
│   │   ├── salesService.ts
│   │   ├── productsService.ts
│   │   └── cashSessionService.ts
│   ├── utils/               # Utilidades
│   │   └── rut.ts
│   ├── data/                # Datos estáticos
│   │   └── cl-geo.ts
│   ├── client/              # Cliente-side utilities
│   └── prisma.ts            # Prisma client singleton
├── prisma/
│   ├── schema.prisma        # Schema de base de datos
│   └── migrations/          # Migraciones SQL
├── __tests__/               # Tests
│   ├── lib/
│   └── app/
├── public/                  # Assets estáticos
├── types/                   # TypeScript types
├── Dockerfile               # Producción
├── Dockerfile.dev           # Desarrollo
├── docker-compose.yml       # Orquestación Docker
├── jest.config.js           # Configuración Jest
├── jest.setup.js            # Setup global de tests
└── tsconfig.json            # TypeScript config
```

---

## 🔐 Seguridad

### Variables de Entorno

**⚠️ NUNCA** commitear `.env` al repositorio.

Usar `.env.local` para desarrollo local y variables secretas.

### JWT

Actualmente en `localStorage` (⚠️ vulnerabilidad conocida).

**TODO Fase 0.2**: Migrar a HttpOnly cookies + CSRF protection.

### Encriptación

**TODO Fase 0.2**: Implementar encriptación de datos sensibles:
- Costos de productos
- Emails de clientes
- Datos financieros

---

## 📊 Métricas de Calidad

### Cobertura de Tests

- **Meta actual**: 60%
- **Meta pre-certificación**: 80%

### Performance

- **Tiempo de respuesta API**: < 200ms (p95)
- **Tiempo de build**: < 2 minutos
- **Tiempo de tests**: < 30 segundos

---

## 🐛 Debugging

### Logs de Docker

```bash
# Ver logs de app
docker-compose logs -f app

# Ver logs de base de datos
docker-compose logs -f postgres

# Ver todos los logs
docker-compose logs -f
```

### Debugging con VS Code

Crear `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

---

## 🚀 Deployment

### Build de Producción

```bash
# Build local
npm run build
npm run start

# Build con Docker
docker build -t kupa-pos:latest -f Dockerfile .
docker run -p 3000:3000 kupa-pos:latest
```

### Variables de Entorno en Producción

```env
NODE_ENV=production
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
JWT_SECRET="production-secret-super-strong"
JWT_EXPIRES_IN="900"  # 15 minutos
NEXT_PUBLIC_APP_URL="https://tudominio.com"
```

---

## 📝 Convenciones

### Git Commits

```
feat: Agregar validación de RUT
fix: Corregir cálculo de IVA en ventas
test: Agregar tests para authService
docs: Actualizar guía de desarrollo
refactor: Simplificar lógica de cash sessions
perf: Optimizar query de productos
chore: Actualizar dependencias
```

### Branches

- `main`: Código de producción
- `develop`: Desarrollo activo
- `feature/nombre-feature`: Nueva funcionalidad
- `fix/descripcion-bug`: Corrección de bugs
- `test/area-testing`: Tests

---

## 🆘 Troubleshooting

### Error: "Cannot connect to database"

```bash
# Verificar que Postgres está corriendo
docker-compose ps

# Reiniciar servicios
docker-compose restart postgres

# Ver logs
docker-compose logs postgres
```

### Error: "Prisma Client out of sync"

```bash
npm run prisma:generate
```

### Error: "Port 3000 already in use"

```bash
# Encontrar proceso
lsof -i :3000

# Matar proceso
kill -9 <PID>

# O cambiar puerto
PORT=3001 npm run dev
```

### Tests fallan con "Cannot find module"

```bash
# Limpiar cache de Jest
npm test -- --clearCache

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Recursos

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Jest Docs](https://jestjs.io/docs/getting-started)
- [Docker Docs](https://docs.docker.com/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

---

## 🤝 Contribuir

1. Crear branch desde `develop`
2. Escribir tests para nueva funcionalidad
3. Asegurar que todos los tests pasen (`npm run test:ci`)
4. Verificar cobertura (`npm run test:coverage`)
5. Crear Pull Request hacia `develop`
6. Esperar code review

---

## 📞 Soporte

Para preguntas o problemas, contactar al equipo de desarrollo.
