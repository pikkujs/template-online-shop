-- Core renamed personas to virtual users, so the runtime tables name the
-- virtual user the way @pikku/kysely now reads them.
ALTER TABLE "virtual_user_run" RENAME COLUMN "persona" TO "virtual_user_id";
ALTER TABLE "virtual_user_schedule" RENAME COLUMN "persona" TO "virtual_user_id";
DROP INDEX IF EXISTS "idx_virtual_user_run_persona";
CREATE INDEX "idx_virtual_user_run_virtual_user_id" ON "virtual_user_run" ("virtual_user_id", "created_at");
ALTER TABLE "user" RENAME COLUMN "actor" TO "virtual_user";
