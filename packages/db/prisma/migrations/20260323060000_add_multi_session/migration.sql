ALTER TABLE "TreatmentType" ADD COLUMN IF NOT EXISTS "isMultiSession" BOOLEAN NOT NULL DEFAULT false;

-- Set ortodoncia as multi-session
UPDATE "TreatmentType" SET "isMultiSession" = true WHERE LOWER(name) LIKE '%ortodoncia%' OR LOWER(name) LIKE '%implante%';
