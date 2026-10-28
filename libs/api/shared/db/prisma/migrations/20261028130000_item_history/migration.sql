-- CreateEnum
CREATE TYPE "ItemRevisionKind" AS ENUM ('created', 'submitted', 'updated', 'approved', 'rejected', 'merged', 'archived');

-- CreateTable
CREATE TABLE "item_revision" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "kind" "ItemRevisionKind" NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changed_by_id" UUID,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seq" SERIAL NOT NULL,

    CONSTRAINT "item_revision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "item_revision_item_id_changed_at_idx" ON "item_revision"("item_id", "changed_at");

-- AddForeignKey
ALTER TABLE "item_revision" ADD CONSTRAINT "item_revision_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_revision" ADD CONSTRAINT "item_revision_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing items start their history with their current fields; the old values are unknown. A
-- submission that was approved gets its approval dated at the item's last update, the closest
-- known time, so the public "added" date is not the private submission date.
INSERT INTO "item_revision" ("id", "item_id", "kind", "snapshot", "changed_by_id", "changed_at")
SELECT gen_random_uuid(), "id",
  (CASE WHEN "submitted_by_id" IS NULL AND "state" IN ('approved', 'archived') THEN 'created'
    ELSE 'submitted' END)::"ItemRevisionKind",
  jsonb_build_object(
    'name', "name",
    'description', "description",
    'listPrice', CASE WHEN "list_price_value" IS NULL THEN NULL
      ELSE jsonb_build_object('value', "list_price_value", 'currency', "list_price_currency") END,
    'sectionId', "section_id",
    'tagIds', COALESCE(to_jsonb("tag_ids"), '[]'::jsonb)),
  "submitted_by_id",
  "created_at"
FROM "item";

INSERT INTO "item_revision" ("id", "item_id", "kind", "snapshot", "changed_at")
SELECT gen_random_uuid(), r."item_id", 'approved', r."snapshot", i."updated_at"
FROM "item_revision" r JOIN "item" i ON i."id" = r."item_id"
WHERE r."kind" = 'submitted' AND i."state" IN ('approved', 'archived');

INSERT INTO "item_revision" ("id", "item_id", "kind", "snapshot", "changed_at")
SELECT gen_random_uuid(), r."item_id", i."state"::text::"ItemRevisionKind", r."snapshot", i."updated_at"
FROM "item_revision" r JOIN "item" i ON i."id" = r."item_id"
WHERE r."kind" IN ('created', 'submitted') AND i."state" IN ('archived', 'rejected', 'merged');
