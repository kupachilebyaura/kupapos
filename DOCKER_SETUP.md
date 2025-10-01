# 🐳 KÜPA POS - Setup con Docker

## Inicio Rápido (5 minutos)

### 1. Crear archivo de configuración

```bash
cp .env.example .env
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Levantar servicios

```bash
npm run docker:dev
```

Esto iniciará automáticamente:
- ✅ PostgreSQL en `localhost:5432`
- ✅ Redis en `localhost:6379`
- ✅ Next.js App en `localhost:3000`
- ✅ Prisma Studio en `localhost:5555`

### 4. Ejecutar migraciones

```bash
npm run prisma:migrate
```

### 5. ¡Listo! 🎉

- **Aplicación**: http://localhost:3000
- **Prisma Studio**: http://localhost:5555

---

## Comandos Útiles

```bash
# Ver logs en tiempo real
npm run docker:logs

# Detener todos los servicios
npm run docker:down

# Reconstruir contenedores
npm run docker:rebuild

# Ver estado de servicios
docker-compose ps

# Acceder a shell del contenedor
docker-compose exec app sh

# Ejecutar tests dentro del contenedor
docker-compose exec app npm test

# Ver logs de un servicio específico
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f app
```

---

## Arquitectura

```
┌─────────────────────────────────────┐
│         KÜPA POS Stack              │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────┐   Port: 3000     │
│  │  Next.js App │◄──────────────┐  │
│  └──────┬───────┘               │  │
│         │                       │  │
│         │  ┌────────────┐       │  │
│         ├─►│ PostgreSQL │       │  │
│         │  │   :5432    │       │  │
│         │  └────────────┘       │  │
│         │                       │  │
│         │  ┌────────────┐       │  │
│         ├─►│   Redis    │       │  │
│         │  │   :6379    │       │  │
│         │  └────────────┘       │  │
│         │                       │  │
│  ┌──────▼───────┐   Port: 5555  │  │
│  │Prisma Studio │◄──────────────┘  │
│  └──────────────┘                  │
│                                     │
└─────────────────────────────────────┘
```

---

## Volúmenes Persistentes

Los datos se guardan en volúmenes de Docker:

- `postgres_data`: Base de datos PostgreSQL
- `redis_data`: Cache y sesiones Redis

```bash
# Ver volúmenes
docker volume ls | grep kupa

# Eliminar todos los datos (⚠️ CUIDADO)
docker-compose down -v
```

---

## Health Check

La aplicación incluye un endpoint de salud:

```bash
curl http://localhost:3000/api/health
```

Respuesta esperada:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "services": {
    "database": "connected",
    "api": "running"
  }
}
```

---

## Troubleshooting

### Puerto 3000 ya está en uso

```bash
# Opción 1: Matar proceso
lsof -i :3000
kill -9 <PID>

# Opción 2: Usar otro puerto
PORT=3001 npm run docker:dev
```

### Base de datos no conecta

```bash
# Ver logs de Postgres
docker-compose logs postgres

# Reiniciar servicio
docker-compose restart postgres

# Verificar estado
docker-compose ps
```

### Reinstalar dependencias

```bash
# Detener servicios
npm run docker:down

# Eliminar node_modules
rm -rf node_modules

# Reinstalar
npm install

# Levantar de nuevo
npm run docker:dev
```

### Limpiar todo y empezar de cero

```bash
# ⚠️ Esto eliminará TODOS los datos
docker-compose down -v
docker system prune -af
npm install
npm run docker:dev
npm run prisma:migrate
```

---

## Producción

### Build para producción

```bash
# Build de imagen
docker build -t kupa-pos:latest -f Dockerfile .

# Ejecutar
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="production-secret" \
  kupa-pos:latest
```

### Docker Compose para producción

Crear `docker-compose.prod.yml`:

```yaml
version: '3.9'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    restart: always
```

Ejecutar:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## Siguientes Pasos

1. ✅ **Fase 0.1 completada**: Docker + Testing
2. ⏭️ **Siguiente**: Fase 0.2 - Seguridad (JWT cookies, encriptación, backups)

Ver [DEVELOPMENT.md](./DEVELOPMENT.md) para guía completa de desarrollo.
