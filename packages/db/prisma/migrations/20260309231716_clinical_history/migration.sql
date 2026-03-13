-- CreateEnum
CREATE TYPE "ToothSurface" AS ENUM ('OCCLUSAL', 'MESIAL', 'DISTAL', 'VESTIBULAR', 'LINGUAL');

-- CreateEnum
CREATE TYPE "ToothCondition" AS ENUM ('HEALTHY', 'CARIES', 'RESTORATION_AMALGAM', 'RESTORATION_RESIN', 'RESTORATION_IONOMER', 'CROWN', 'ENDODONTICS', 'EXTRACTION', 'IMPLANT', 'PROSTHESIS', 'FRACTURE', 'SEALANT', 'ABSENT');

-- CreateEnum
CREATE TYPE "OdontogramStatus" AS ENUM ('EXISTING', 'PLANNED');

-- CreateEnum
CREATE TYPE "TreatmentItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "MedicalHistory" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bloodType" TEXT,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hasDiabetes" BOOLEAN NOT NULL DEFAULT false,
    "hasHypertension" BOOLEAN NOT NULL DEFAULT false,
    "hasHeartDisease" BOOLEAN NOT NULL DEFAULT false,
    "hasAsthma" BOOLEAN NOT NULL DEFAULT false,
    "hasHIV" BOOLEAN NOT NULL DEFAULT false,
    "hasEpilepsy" BOOLEAN NOT NULL DEFAULT false,
    "otherDiseases" TEXT,
    "hasBruxism" BOOLEAN NOT NULL DEFAULT false,
    "isSmoker" BOOLEAN NOT NULL DEFAULT false,
    "smokingDetails" TEXT,
    "surgicalHistory" TEXT,
    "hospitalizations" TEXT,
    "isPregnant" BOOLEAN NOT NULL DEFAULT false,
    "lastDoctorVisit" TIMESTAMP(3),
    "consentSigned" BOOLEAN NOT NULL DEFAULT false,
    "consentSignedAt" TIMESTAMP(3),
    "consentNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OdontogramFinding" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "toothFdi" INTEGER NOT NULL,
    "surface" "ToothSurface",
    "condition" "ToothCondition" NOT NULL,
    "status" "OdontogramStatus" NOT NULL DEFAULT 'EXISTING',
    "notes" TEXT,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OdontogramFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentPlan" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Plan de Tratamiento',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentPlanItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "toothFdi" INTEGER,
    "procedureName" TEXT NOT NULL,
    "status" "TreatmentItemStatus" NOT NULL DEFAULT 'PENDING',
    "unitCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalVisitNote" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "toothNumbers" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "procedureName" TEXT,
    "materials" TEXT,
    "content" TEXT NOT NULL,
    "nextStep" TEXT,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalVisitNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodontogramEntry" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "findings" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodontogramEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicalHistory_patientId_key" ON "MedicalHistory"("patientId");

-- CreateIndex
CREATE INDEX "MedicalHistory_tenantId_idx" ON "MedicalHistory"("tenantId");

-- CreateIndex
CREATE INDEX "OdontogramFinding_tenantId_idx" ON "OdontogramFinding"("tenantId");

-- CreateIndex
CREATE INDEX "OdontogramFinding_patientId_idx" ON "OdontogramFinding"("patientId");

-- CreateIndex
CREATE INDEX "OdontogramFinding_patientId_toothFdi_idx" ON "OdontogramFinding"("patientId", "toothFdi");

-- CreateIndex
CREATE INDEX "TreatmentPlan_tenantId_idx" ON "TreatmentPlan"("tenantId");

-- CreateIndex
CREATE INDEX "TreatmentPlan_patientId_idx" ON "TreatmentPlan"("patientId");

-- CreateIndex
CREATE INDEX "TreatmentPlanItem_planId_idx" ON "TreatmentPlanItem"("planId");

-- CreateIndex
CREATE INDEX "TreatmentPlanItem_tenantId_idx" ON "TreatmentPlanItem"("tenantId");

-- CreateIndex
CREATE INDEX "ClinicalVisitNote_tenantId_idx" ON "ClinicalVisitNote"("tenantId");

-- CreateIndex
CREATE INDEX "ClinicalVisitNote_patientId_idx" ON "ClinicalVisitNote"("patientId");

-- CreateIndex
CREATE INDEX "ClinicalVisitNote_patientId_visitDate_idx" ON "ClinicalVisitNote"("patientId", "visitDate");

-- CreateIndex
CREATE INDEX "PeriodontogramEntry_tenantId_idx" ON "PeriodontogramEntry"("tenantId");

-- CreateIndex
CREATE INDEX "PeriodontogramEntry_patientId_idx" ON "PeriodontogramEntry"("patientId");

-- CreateIndex
CREATE INDEX "PeriodontogramEntry_patientId_recordedAt_idx" ON "PeriodontogramEntry"("patientId", "recordedAt");

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdontogramFinding" ADD CONSTRAINT "OdontogramFinding_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdontogramFinding" ADD CONSTRAINT "OdontogramFinding_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlanItem" ADD CONSTRAINT "TreatmentPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TreatmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlanItem" ADD CONSTRAINT "TreatmentPlanItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalVisitNote" ADD CONSTRAINT "ClinicalVisitNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalVisitNote" ADD CONSTRAINT "ClinicalVisitNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodontogramEntry" ADD CONSTRAINT "PeriodontogramEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodontogramEntry" ADD CONSTRAINT "PeriodontogramEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
