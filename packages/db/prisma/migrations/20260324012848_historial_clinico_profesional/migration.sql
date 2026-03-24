-- AlterTable
ALTER TABLE "ClinicalVisitNote" ADD COLUMN     "dentistId" TEXT,
ADD COLUMN     "diagnosis" TEXT,
ADD COLUMN     "signatureDentist" TEXT,
ADD COLUMN     "signaturePatient" TEXT,
ADD COLUMN     "templateUsed" TEXT,
ADD COLUMN     "treatmentPlanId" TEXT,
ADD COLUMN     "treatmentPlanItemId" TEXT;

-- AlterTable
ALTER TABLE "MedicalHistory" ADD COLUMN     "alcoholFrequency" TEXT,
ADD COLUMN     "allergyDetails" JSONB,
ADD COLUMN     "anestheticAllergy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "breastfeeding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "conditionDetails" JSONB,
ADD COLUMN     "familyHistory" JSONB,
ADD COLUMN     "latexAllergy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "medicationDetails" JSONB,
ADD COLUMN     "pregnancyWeeks" INTEGER,
ADD COLUMN     "primaryDoctor" TEXT,
ADD COLUMN     "primaryDoctorPhone" TEXT,
ADD COLUMN     "rhFactor" TEXT,
ADD COLUMN     "smokingAmount" TEXT,
ADD COLUMN     "surgeryHistory" JSONB;

-- AlterTable
ALTER TABLE "OdontogramFinding" ADD COLUMN     "dentistId" TEXT,
ADD COLUMN     "diagnosis" TEXT,
ADD COLUMN     "linkedTreatmentItemId" TEXT,
ADD COLUMN     "versionId" TEXT;

-- AlterTable
ALTER TABLE "PeriodontogramEntry" ADD COLUMN     "furca" TEXT,
ADD COLUMN     "plaque" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suppuration" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "versionId" TEXT;

-- AlterTable
ALTER TABLE "TreatmentPlan" ADD COLUMN     "dentistId" TEXT,
ADD COLUMN     "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TreatmentPlanItem" ADD COLUMN     "completedById" TEXT,
ADD COLUMN     "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "section" TEXT;

-- CreateTable
CREATE TABLE "OdontogramVersion" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "label" TEXT,
    "findings" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OdontogramVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodontogramVersion" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "label" TEXT,
    "entries" JSONB NOT NULL,
    "metrics" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeriodontogramVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientImage" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "imageData" TEXT NOT NULL,
    "toothNumbers" TEXT,
    "evolutionId" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dentistId" TEXT NOT NULL,
    "evolutionId" TEXT,
    "prescriptionNumber" INTEGER NOT NULL,
    "diagnosis" TEXT,
    "medications" JSONB NOT NULL,
    "notes" TEXT,
    "templateUsed" TEXT,
    "signatureData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientConsent" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT,
    "dentistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "patientSignature" TEXT,
    "dentistSignature" TEXT,
    "signedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvolutionTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "procedure" TEXT,
    "materials" TEXT,
    "description" TEXT,
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvolutionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaqueRecord" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "affectedSurfaces" JSONB NOT NULL,
    "totalSurfaces" INTEGER NOT NULL,
    "affectedCount" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "comments" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaqueRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalHistoryAudit" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "fieldChanged" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalHistoryAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OdontogramVersion_patientId_tenantId_idx" ON "OdontogramVersion"("patientId", "tenantId");

-- CreateIndex
CREATE INDEX "PeriodontogramVersion_patientId_tenantId_idx" ON "PeriodontogramVersion"("patientId", "tenantId");

-- CreateIndex
CREATE INDEX "PatientImage_patientId_tenantId_idx" ON "PatientImage"("patientId", "tenantId");

-- CreateIndex
CREATE INDEX "PatientImage_category_idx" ON "PatientImage"("category");

-- CreateIndex
CREATE INDEX "Prescription_patientId_tenantId_idx" ON "Prescription"("patientId", "tenantId");

-- CreateIndex
CREATE INDEX "ConsentTemplate_tenantId_idx" ON "ConsentTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "PatientConsent_patientId_tenantId_idx" ON "PatientConsent"("patientId", "tenantId");

-- CreateIndex
CREATE INDEX "EvolutionTemplate_tenantId_idx" ON "EvolutionTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "PlaqueRecord_patientId_tenantId_idx" ON "PlaqueRecord"("patientId", "tenantId");

-- CreateIndex
CREATE INDEX "MedicalHistoryAudit_patientId_tenantId_idx" ON "MedicalHistoryAudit"("patientId", "tenantId");

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "Dentist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdontogramVersion" ADD CONSTRAINT "OdontogramVersion_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdontogramVersion" ADD CONSTRAINT "OdontogramVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodontogramVersion" ADD CONSTRAINT "PeriodontogramVersion_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodontogramVersion" ADD CONSTRAINT "PeriodontogramVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientImage" ADD CONSTRAINT "PatientImage_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientImage" ADD CONSTRAINT "PatientImage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "Dentist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentTemplate" ADD CONSTRAINT "ConsentTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientConsent" ADD CONSTRAINT "PatientConsent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientConsent" ADD CONSTRAINT "PatientConsent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientConsent" ADD CONSTRAINT "PatientConsent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ConsentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientConsent" ADD CONSTRAINT "PatientConsent_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "Dentist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvolutionTemplate" ADD CONSTRAINT "EvolutionTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaqueRecord" ADD CONSTRAINT "PlaqueRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaqueRecord" ADD CONSTRAINT "PlaqueRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistoryAudit" ADD CONSTRAINT "MedicalHistoryAudit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistoryAudit" ADD CONSTRAINT "MedicalHistoryAudit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
