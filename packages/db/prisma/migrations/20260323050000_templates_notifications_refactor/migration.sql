-- Migrate data before dropping columns
-- Copy isDefault -> isSystemTemplate, variables -> variablesJson
ALTER TABLE "WhatsAppTemplate" ADD COLUMN IF NOT EXISTS "isSystemTemplate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WhatsAppTemplate" ADD COLUMN IF NOT EXISTS "variablesJson" JSONB;
ALTER TABLE "WhatsAppTemplate" ADD COLUMN IF NOT EXISTS "displayName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WhatsAppTemplate" ADD COLUMN IF NOT EXISTS "headerType" TEXT;
ALTER TABLE "WhatsAppTemplate" ADD COLUMN IF NOT EXISTS "buttonsJson" JSONB;
ALTER TABLE "WhatsAppTemplate" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "WhatsAppTemplate" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
ALTER TABLE "WhatsAppTemplate" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "WhatsAppTemplate" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
ALTER TABLE "WhatsAppTemplate" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- Migrate existing data
UPDATE "WhatsAppTemplate" SET "isSystemTemplate" = "isDefault" WHERE "isDefault" = true;
UPDATE "WhatsAppTemplate" SET "variablesJson" = "variables" WHERE "variables" IS NOT NULL;
UPDATE "WhatsAppTemplate" SET "displayName" = REPLACE("name", '_', ' ') WHERE "displayName" = '';

-- Drop old columns
ALTER TABLE "WhatsAppTemplate" DROP COLUMN IF EXISTS "isDefault";
ALTER TABLE "WhatsAppTemplate" DROP COLUMN IF EXISTS "isEditable";
ALTER TABLE "WhatsAppTemplate" DROP COLUMN IF EXISTS "pipelineStageId";
ALTER TABLE "WhatsAppTemplate" DROP COLUMN IF EXISTS "variables";

-- Update language default
ALTER TABLE "WhatsAppTemplate" ALTER COLUMN "language" SET DEFAULT 'es_AR';

-- CreateTable
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_tenantId_isRead_idx" ON "Notification"("tenantId", "isRead");
CREATE INDEX IF NOT EXISTS "Notification_tenantId_createdAt_idx" ON "Notification"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "WhatsAppTemplate_tenantId_status_idx" ON "WhatsAppTemplate"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
