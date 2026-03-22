-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "insurance" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "askEmail" BOOLEAN NOT NULL DEFAULT true;
