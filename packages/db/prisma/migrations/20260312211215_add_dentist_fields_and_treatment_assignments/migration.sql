-- AlterTable
ALTER TABLE "Dentist" ADD COLUMN     "birthdate" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'ARS',
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "welcomeMessage" TEXT;

-- CreateTable
CREATE TABLE "DentistTreatment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dentistId" TEXT NOT NULL,
    "treatmentTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DentistTreatment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DentistTreatment_tenantId_idx" ON "DentistTreatment"("tenantId");

-- CreateIndex
CREATE INDEX "DentistTreatment_dentistId_idx" ON "DentistTreatment"("dentistId");

-- CreateIndex
CREATE UNIQUE INDEX "DentistTreatment_dentistId_treatmentTypeId_key" ON "DentistTreatment"("dentistId", "treatmentTypeId");

-- AddForeignKey
ALTER TABLE "DentistTreatment" ADD CONSTRAINT "DentistTreatment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentistTreatment" ADD CONSTRAINT "DentistTreatment_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "Dentist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentistTreatment" ADD CONSTRAINT "DentistTreatment_treatmentTypeId_fkey" FOREIGN KEY ("treatmentTypeId") REFERENCES "TreatmentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
