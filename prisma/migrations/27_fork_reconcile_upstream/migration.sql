-- Fork only. Brings databases that ran the fork's own versions of
-- 25_add_annotation and 26_add_api_key to the upstream shape. Prisma records
-- those two names as applied there, so it never runs upstream's versions.
-- Every statement is a no-op on a database that ran upstream's migrations.

-- Annotations: fork table "website_annotation" -> upstream table "annotation".
CREATE TABLE IF NOT EXISTS "annotation" (
    "annotation_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "user_id" UUID,
    "date" TIMESTAMPTZ(6) NOT NULL,
    "all_day" BOOLEAN NOT NULL DEFAULT true,
    "note" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "annotation_pkey" PRIMARY KEY ("annotation_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "annotation_annotation_id_key" ON "annotation"("annotation_id");

CREATE INDEX IF NOT EXISTS "annotation_website_id_date_idx" ON "annotation"("website_id", "date");

DO $$
BEGIN
  IF to_regclass('website_annotation') IS NOT NULL THEN
    -- The fork picked annotation dates with a day calendar: keep them as all-day notes.
    INSERT INTO "annotation" ("annotation_id", "website_id", "user_id", "date", "all_day", "note", "created_at", "updated_at")
    SELECT "annotation_id", "website_id", "created_by", "date", true, "text", "created_at", "updated_at"
    FROM "website_annotation"
    ON CONFLICT ("annotation_id") DO NOTHING;

    DROP TABLE "website_annotation";
  END IF;
END $$;

-- API keys: the fork's table had read/write scopes, upstream keys are not scoped.
-- Same "umami_" prefix and same hash, so fork keys keep working. Read-only keys
-- are deleted rather than silently granted write access.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'api_key' AND column_name = 'permissions'
  ) THEN
    DELETE FROM "api_key" WHERE NOT ("permissions" @> '["write"]'::jsonb);
    ALTER TABLE "api_key" DROP COLUMN "permissions";
  END IF;
END $$;

ALTER TABLE "api_key" ALTER COLUMN "name" TYPE VARCHAR(255);

DROP INDEX IF EXISTS "api_key_api_key_id_key";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_key_user_id_fkey') THEN
    -- Keys of hard-deleted users would violate the foreign key.
    DELETE FROM "api_key" k WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."user_id" = k."user_id");

    ALTER TABLE "api_key" ADD CONSTRAINT "api_key_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
