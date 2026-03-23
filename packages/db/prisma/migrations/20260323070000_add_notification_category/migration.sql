ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'system';
CREATE INDEX IF NOT EXISTS "Notification_tenantId_category_idx" ON "Notification"("tenantId", "category");

-- Backfill categories for existing notifications
UPDATE "Notification" SET "category" = 'messages' WHERE "type" IN ('new_patient', 'human_needed', 'new_message');
UPDATE "Notification" SET "category" = 'pipeline' WHERE "type" IN ('pipeline_move', 'pipeline_stale');
