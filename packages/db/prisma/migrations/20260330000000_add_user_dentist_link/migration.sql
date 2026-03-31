-- AlterTable: Add dentistId to User for linking User (DENTIST role) to Dentist (professional)
ALTER TABLE "User" ADD COLUMN "dentistId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_dentistId_key" ON "User"("dentistId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "Dentist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
