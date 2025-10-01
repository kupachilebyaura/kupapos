-- AlterTable
ALTER TABLE "public"."Customer" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "cost" DECIMAL(10,2),
ADD COLUMN     "details" TEXT,
ADD COLUMN     "minStock" INTEGER NOT NULL DEFAULT 0;
