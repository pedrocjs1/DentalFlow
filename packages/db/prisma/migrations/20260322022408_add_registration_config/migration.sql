-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "askAddress" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "askAllergies" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "askFullName" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "askHabits" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "askMedicalConditions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "askMedications" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "registrationEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "registrationWelcomeMessage" TEXT;
