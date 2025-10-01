-- Create enums
CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'VOIDED');

-- Business configuration
ALTER TABLE "Business" ADD COLUMN "blockZeroStock" BOOLEAN NOT NULL DEFAULT false;

-- Cash session table
CREATE TABLE "CashSession" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "openedById" TEXT NOT NULL,
  "closedById" TEXT,
  "openingAmount" DECIMAL(12,2) NOT NULL,
  "closingAmount" DECIMAL(12,2),
  "expectedAmount" DECIMAL(12,2),
  "difference" DECIMAL(12,2),
  "openingNote" TEXT,
  "closingNote" TEXT,
  "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CashSession_businessId_idx" ON "CashSession"("businessId");

-- Sales adjustments
ALTER TABLE "Sale"
  ADD COLUMN "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "tip" DECIMAL(10,2),
  ADD COLUMN "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN "voidReason" TEXT,
  ADD COLUMN "voidedAt" TIMESTAMP(3),
  ADD COLUMN "voidedById" TEXT,
  ADD COLUMN "cashSessionId" TEXT;

ALTER TABLE "SaleItem" ADD COLUMN "discount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Customers metadata
ALTER TABLE "Customer"
  ADD COLUMN "rut" TEXT,
  ADD COLUMN "region" TEXT,
  ADD COLUMN "commune" TEXT;

CREATE UNIQUE INDEX "Customer_rut_key" ON "Customer"("rut");

-- Foreign keys
ALTER TABLE "CashSession"
  ADD CONSTRAINT "CashSession_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CashSession_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CashSession_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Sale_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Ensure existing rows have proper defaults
UPDATE "Sale" SET "status" = 'COMPLETED' WHERE "status" IS NULL;
UPDATE "Sale" SET "discount" = 0 WHERE "discount" IS NULL;
UPDATE "SaleItem" SET "discount" = 0 WHERE "discount" IS NULL;
