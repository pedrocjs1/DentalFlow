-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "postCheckSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PatientPipeline" ADD COLUMN     "lastManualMoveAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "cancelsAt" TIMESTAMP(3),
ADD COLUMN     "failedPaymentAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mpLastPaymentId" TEXT;
