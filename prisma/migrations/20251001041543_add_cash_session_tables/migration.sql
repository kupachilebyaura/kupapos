-- DropForeignKey
ALTER TABLE "public"."CashSession" DROP CONSTRAINT "CashSession_businessId_fkey";

-- DropIndex
DROP INDEX "public"."CashSession_businessId_idx";

-- AlterTable
ALTER TABLE "public"."CashSession" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "public"."CashSession" ADD CONSTRAINT "CashSession_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
