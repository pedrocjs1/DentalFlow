-- AlterTable: Make tenantId optional on WhatsAppTemplate (system templates are global)
ALTER TABLE "WhatsAppTemplate" ALTER COLUMN "tenantId" DROP NOT NULL;

-- Add new columns to WhatsAppTemplate
ALTER TABLE "WhatsAppTemplate" ADD COLUMN "description" TEXT;
ALTER TABLE "WhatsAppTemplate" ADD COLUMN "metaStatus" TEXT;
ALTER TABLE "WhatsAppTemplate" ADD COLUMN "qualityScore" TEXT;
ALTER TABLE "WhatsAppTemplate" ADD COLUMN "lastCheckedAt" TIMESTAMP(3);
ALTER TABLE "WhatsAppTemplate" ADD COLUMN "suggestedTrigger" TEXT;

-- Migrate triggerType data to suggestedTrigger
UPDATE "WhatsAppTemplate" SET "suggestedTrigger" = "triggerType" WHERE "triggerType" IS NOT NULL;

-- Drop old triggerType column
ALTER TABLE "WhatsAppTemplate" DROP COLUMN "triggerType";

-- Update isSystemTemplate default to true
ALTER TABLE "WhatsAppTemplate" ALTER COLUMN "isSystemTemplate" SET DEFAULT true;

-- Make system templates global (remove tenantId)
UPDATE "WhatsAppTemplate" SET "tenantId" = NULL WHERE "isSystemTemplate" = true;

-- Update indexes
DROP INDEX IF EXISTS "WhatsAppTemplate_tenantId_status_idx";
DROP INDEX IF EXISTS "WhatsAppTemplate_tenantId_triggerType_idx";
CREATE INDEX "WhatsAppTemplate_status_idx" ON "WhatsAppTemplate"("status");
CREATE INDEX "WhatsAppTemplate_isSystemTemplate_status_idx" ON "WhatsAppTemplate"("isSystemTemplate", "status");

-- Add disabledTemplateIds to Tenant
ALTER TABLE "Tenant" ADD COLUMN "disabledTemplateIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable: TemplateEvent
CREATE TABLE "TemplateEvent" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "details" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemplateEvent_templateId_createdAt_idx" ON "TemplateEvent"("templateId", "createdAt");

-- AddForeignKey
ALTER TABLE "TemplateEvent" ADD CONSTRAINT "TemplateEvent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WhatsAppTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
