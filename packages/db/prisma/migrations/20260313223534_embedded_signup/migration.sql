/*
  Warnings:

  - You are about to drop the column `whatsappBusinessId` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `whatsappNumberId` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the `WhatsAppNumber` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "WhatsAppStatus" AS ENUM ('DISCONNECTED', 'CONNECTED', 'ERROR');

-- DropForeignKey
ALTER TABLE "Tenant" DROP CONSTRAINT "Tenant_whatsappNumberId_fkey";

-- DropIndex
DROP INDEX "Tenant_whatsappNumberId_key";

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "whatsappBusinessId",
DROP COLUMN "whatsappNumberId",
ADD COLUMN     "wabaId" TEXT,
ADD COLUMN     "whatsappConnectedAt" TIMESTAMP(3),
ADD COLUMN     "whatsappDisplayNumber" TEXT,
ADD COLUMN     "whatsappStatus" "WhatsAppStatus" NOT NULL DEFAULT 'DISCONNECTED';

-- DropTable
DROP TABLE "WhatsAppNumber";
