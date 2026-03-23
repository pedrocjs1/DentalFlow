-- AlterTable
ALTER TABLE "PipelineStage" ADD COLUMN     "autoMessageMaxRetries" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "discountTemplate" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ALTER COLUMN "messageDebounceSeconds" SET DEFAULT 12;

-- AlterTable
ALTER TABLE "TreatmentType" ADD COLUMN     "followUpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "followUpMessage" TEXT,
ADD COLUMN     "followUpMonths" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "postProcedureCheck" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "postProcedureDays" INTEGER NOT NULL DEFAULT 7;

-- CreateTable
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'es',
    "headerText" TEXT,
    "bodyText" TEXT NOT NULL,
    "footerText" TEXT,
    "variables" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "metaTemplateId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pipelineStageId" TEXT,
    "triggerType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_tenantId_idx" ON "WhatsAppTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_tenantId_triggerType_idx" ON "WhatsAppTemplate"("tenantId", "triggerType");

-- AddForeignKey
ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
