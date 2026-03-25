-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'TRIAL_EXPIRED';

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "setupFeeAmount" DOUBLE PRECISION NOT NULL DEFAULT 499,
ADD COLUMN     "setupFeePaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "setupFeePaidAt" TIMESTAMP(3),
ADD COLUMN     "setupFeePaymentId" TEXT,
ADD COLUMN     "setupFeeWaived" BOOLEAN NOT NULL DEFAULT false;
