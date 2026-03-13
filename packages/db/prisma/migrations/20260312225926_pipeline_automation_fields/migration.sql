/*
  Warnings:

  - You are about to drop the column `autoMoveAfter` on the `PipelineStage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PatientPipeline" ADD COLUMN     "interestTreatment" TEXT,
ADD COLUMN     "lastAutoMessageSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PipelineStage" DROP COLUMN "autoMoveAfter",
ADD COLUMN     "autoMessageDelayHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "autoMessageEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoMessageTemplate" TEXT,
ADD COLUMN     "autoMoveDelayHours" INTEGER NOT NULL DEFAULT 48,
ADD COLUMN     "autoMoveEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoMoveTargetStageId" TEXT,
ADD COLUMN     "discountEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "discountMessage" TEXT,
ADD COLUMN     "discountPercent" INTEGER NOT NULL DEFAULT 10;

-- CreateIndex
CREATE INDEX "PatientPipeline_movedAt_idx" ON "PatientPipeline"("movedAt");
