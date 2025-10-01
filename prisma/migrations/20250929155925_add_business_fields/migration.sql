-- AlterTable
ALTER TABLE "public"."Business" ADD COLUMN     "address" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'CLP',
ADD COLUMN     "email" TEXT,
ADD COLUMN     "includeTaxInPrice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyDailyReports" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyLowStock" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyNewCustomers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifySystemUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "taxId" TEXT,
ADD COLUMN     "taxName" TEXT NOT NULL DEFAULT 'IVA',
ADD COLUMN     "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 16.00;
