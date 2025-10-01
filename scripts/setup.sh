#!/bin/bash

# ============================================
# KÜPA POS - Setup Script
# ============================================

set -e  # Exit on error

echo "🚀 Iniciando setup de KÜPA POS..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado${NC}"
    echo "Por favor instala Docker desde: https://docs.docker.com/get-docker/"
    exit 1
fi

echo -e "${GREEN}✅ Docker instalado${NC}"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose no está instalado${NC}"
    echo "Por favor instala Docker Compose desde: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✅ Docker Compose instalado${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    echo "Por favor instala Node.js 20+ desde: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${YELLOW}⚠️  Node.js versión $NODE_VERSION detectada. Se recomienda Node.js 20+${NC}"
else
    echo -e "${GREEN}✅ Node.js $(node -v) instalado${NC}"
fi

echo ""
echo "📦 Instalando dependencias de npm..."
npm install

echo ""
echo "📝 Configurando variables de entorno..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Archivo .env creado desde .env.example${NC}"
        echo -e "${YELLOW}⚠️  Recuerda configurar las variables en .env${NC}"
    else
        echo -e "${RED}❌ No se encontró .env.example${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  .env ya existe, no se sobrescribe${NC}"
fi

echo ""
echo "🐳 Iniciando servicios Docker..."
docker-compose up -d

echo ""
echo "⏳ Esperando a que PostgreSQL esté listo..."
sleep 5

MAX_RETRIES=30
RETRY_COUNT=0

while ! docker-compose exec -T postgres pg_isready -U kupauser -d kupapos &> /dev/null; do
    RETRY_COUNT=$((RETRY_COUNT+1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo -e "${RED}❌ PostgreSQL no está listo después de 30 intentos${NC}"
        echo "Ejecuta: docker-compose logs postgres"
        exit 1
    fi
    echo "Esperando PostgreSQL... (intento $RETRY_COUNT/$MAX_RETRIES)"
    sleep 1
done

echo -e "${GREEN}✅ PostgreSQL está listo${NC}"

echo ""
echo "🔄 Ejecutando migraciones de Prisma..."
npx prisma migrate dev --name init

echo ""
echo "🎨 Generando Prisma Client..."
npx prisma generate

echo ""
echo -e "${GREEN}✅ Setup completado exitosamente!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 KÜPA POS está listo para usar"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Servicios disponibles:"
echo "   • Aplicación:     http://localhost:3000"
echo "   • Prisma Studio:  http://localhost:5555"
echo "   • PostgreSQL:     localhost:5432"
echo "   • Redis:          localhost:6379"
echo ""
echo "📋 Comandos útiles:"
echo "   • Ver logs:       npm run docker:logs"
echo "   • Detener:        npm run docker:down"
echo "   • Tests:          npm test"
echo "   • Prisma Studio:  npm run prisma:studio"
echo ""
echo "📚 Documentación:"
echo "   • Ver DEVELOPMENT.md para guía completa"
echo "   • Ver DOCKER_SETUP.md para comandos Docker"
echo ""
