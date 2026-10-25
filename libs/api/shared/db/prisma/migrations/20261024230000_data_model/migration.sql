-- Data model review (docs/plans/2026-10-24-data-model.md). Copies every row into the new shapes
-- before dropping the old columns, so it is safe on a database that holds real data.

CREATE TYPE "Role" AS ENUM ('user', 'admin');
CREATE TYPE "Currency" AS ENUM ('ILS');

-- account: role replaces is_admin
ALTER TABLE "account"
  ADD COLUMN "role" "Role" NOT NULL DEFAULT 'user',
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "account" SET "role" = 'admin' WHERE "is_admin";
ALTER TABLE "account" DROP COLUMN "is_admin";

-- venue: Text name and address, sections embedded in array order
ALTER TABLE "venue"
  ADD COLUMN "name" JSONB,
  ADD COLUMN "address_text" JSONB,
  ADD COLUMN "sections" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "venue" v SET
  "name" = jsonb_build_object('he', v."name_he", 'en', v."name_en"),
  "address_text" = jsonb_build_object('he', v."address", 'en', NULL),
  "sections" = COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object('id', s."id", 'name', jsonb_build_object('he', s."name_he", 'en', s."name_en"))
      ORDER BY s."position"
    )
    FROM "menu_section" s WHERE s."venue_id" = v."id"
  ), '[]');
ALTER TABLE "venue" DROP COLUMN "name_he", DROP COLUMN "name_en", DROP COLUMN "address";
ALTER TABLE "venue" RENAME COLUMN "address_text" TO "address";
ALTER TABLE "venue" ALTER COLUMN "name" SET NOT NULL, ALTER COLUMN "address" SET NOT NULL;
UPDATE "venue" SET "created_by_id" = NULL
  WHERE "created_by_id" IS NOT NULL AND "created_by_id" NOT IN (SELECT "id" FROM "account");

-- tag: Text name
ALTER TABLE "tag"
  ADD COLUMN "name" JSONB,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "tag" SET "name" = jsonb_build_object('he', "name_he", 'en', "name_en");
ALTER TABLE "tag" DROP COLUMN "name_he", DROP COLUMN "name_en";
ALTER TABLE "tag" ALTER COLUMN "name" SET NOT NULL;

-- item: Text name, description, Price in shekels, ordered tag ids
ALTER TABLE "item" DROP CONSTRAINT "item_section_id_fkey";
ALTER TABLE "item"
  ADD COLUMN "name" JSONB,
  ADD COLUMN "description" JSONB,
  ADD COLUMN "list_price_value" DECIMAL(10,2),
  ADD COLUMN "list_price_currency" "Currency",
  ADD COLUMN "tag_ids" UUID[] DEFAULT ARRAY[]::UUID[],
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "item" i SET
  "name" = jsonb_build_object('he', i."name_he", 'en', i."name_en"),
  "list_price_value" = i."list_price" / 100.0,
  "list_price_currency" = CASE WHEN i."list_price" IS NULL THEN NULL ELSE 'ILS'::"Currency" END,
  "tag_ids" = ARRAY(SELECT t."tag_id" FROM "item_tag" t WHERE t."item_id" = i."id" ORDER BY t."position");
ALTER TABLE "item" DROP COLUMN "name_he", DROP COLUMN "name_en", DROP COLUMN "list_price";
ALTER TABLE "item" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "item" ADD CONSTRAINT "item_list_price_whole"
  CHECK (("list_price_value" IS NULL) = ("list_price_currency" IS NULL));
UPDATE "item" SET "submitted_by_id" = NULL
  WHERE "submitted_by_id" IS NOT NULL AND "submitted_by_id" NOT IN (SELECT "id" FROM "account");
UPDATE "item" SET "merged_into_id" = NULL
  WHERE "merged_into_id" IS NOT NULL AND "merged_into_id" NOT IN (SELECT "id" FROM "item");
DROP TABLE "item_tag";
DROP TABLE "menu_section";

-- entry: Price in shekels, photo as one value, venue read through the item
DROP INDEX "entry_photo_id_key";
DROP INDEX "entry_venue_id_idx";
ALTER TABLE "entry"
  ADD COLUMN "price_paid_value" DECIMAL(10,2),
  ADD COLUMN "price_paid_currency" "Currency",
  ADD COLUMN "photo" JSONB;
UPDATE "entry" SET
  "price_paid_value" = "price_paid" / 100.0,
  "price_paid_currency" = CASE WHEN "price_paid" IS NULL THEN NULL ELSE 'ILS'::"Currency" END,
  "photo" = CASE WHEN "photo_id" IS NULL OR "photo_type" IS NULL THEN NULL
    ELSE jsonb_build_object('id', "photo_id", 'contentType', "photo_type") END;
ALTER TABLE "entry" DROP COLUMN "price_paid", DROP COLUMN "photo_id", DROP COLUMN "photo_type", DROP COLUMN "venue_id";
ALTER TABLE "entry" ALTER COLUMN "rating" SET DATA TYPE SMALLINT;
ALTER TABLE "entry" ADD CONSTRAINT "entry_price_paid_whole"
  CHECK (("price_paid_value" IS NULL) = ("price_paid_currency" IS NULL));
-- The API always kept ratings in 1-5; anything else is unreadable, so it is cleared rather than failing the migration.
UPDATE "entry" SET "rating" = NULL WHERE "rating" NOT BETWEEN 1 AND 5;
ALTER TABLE "entry" ADD CONSTRAINT "entry_rating_range" CHECK ("rating" BETWEEN 1 AND 5);

UPDATE "ownership" SET "granted_by_id" = NULL
  WHERE "granted_by_id" IS NOT NULL AND "granted_by_id" NOT IN (SELECT "id" FROM "account");

CREATE INDEX "entry_photo_idx" ON "entry" USING GIN ("photo" jsonb_path_ops);
CREATE INDEX "item_tag_ids_idx" ON "item" USING GIN ("tag_ids");

ALTER TABLE "ownership" ADD CONSTRAINT "ownership_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "venue" ADD CONSTRAINT "venue_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "item" ADD CONSTRAINT "item_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "item" ADD CONSTRAINT "item_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
