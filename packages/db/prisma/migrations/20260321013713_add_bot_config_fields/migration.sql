-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "askBirthdate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "askInsurance" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "botLanguage" TEXT NOT NULL DEFAULT 'es',
ADD COLUMN     "botTone" TEXT NOT NULL DEFAULT 'friendly',
ADD COLUMN     "campaignBirthday" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "campaignPeriodicReminder" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "campaignReactivation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "leadRecontactHours" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "maxDiscountPercent" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "offerDiscounts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "proactiveFollowUp" BOOLEAN NOT NULL DEFAULT true;
