-- AlterTable
ALTER TABLE "public"."Business" ADD COLUMN     "paymentMethods" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "public"."Sale" ADD COLUMN     "paymentMethod" TEXT;
