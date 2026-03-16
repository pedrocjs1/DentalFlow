-- CreateEnum
CREATE TYPE "UsageType" AS ENUM ('WHATSAPP_MESSAGE', 'AI_INTERACTION', 'AI_TOKENS', 'CAMPAIGN_SEND', 'EMAIL_SEND');

-- AlterTable Tenant: add whatsappNumberId
ALTER TABLE "Tenant" ADD COLUMN "whatsappNumberId" TEXT;

-- CreateTable AdminUser
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable WhatsAppNumber
CREATE TABLE "WhatsAppNumber" (
    "id" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "businessId" TEXT,
    "accessToken" TEXT NOT NULL,
    "displayNumber" TEXT NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable UsageRecord
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "UsageType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "period" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex AdminUser email unique
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex WhatsAppNumber phoneNumberId unique
CREATE UNIQUE INDEX "WhatsAppNumber_phoneNumberId_key" ON "WhatsAppNumber"("phoneNumberId");

-- CreateIndex Tenant whatsappNumberId unique
CREATE UNIQUE INDEX "Tenant_whatsappNumberId_key" ON "Tenant"("whatsappNumberId");

-- CreateIndex UsageRecord indexes
CREATE INDEX "UsageRecord_tenantId_idx" ON "UsageRecord"("tenantId");
CREATE INDEX "UsageRecord_tenantId_type_period_idx" ON "UsageRecord"("tenantId", "type", "period");
CREATE INDEX "UsageRecord_period_idx" ON "UsageRecord"("period");

-- AddForeignKey Tenant -> WhatsAppNumber
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_whatsappNumberId_fkey"
    FOREIGN KEY ("whatsappNumberId") REFERENCES "WhatsAppNumber"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey UsageRecord -> Tenant
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
