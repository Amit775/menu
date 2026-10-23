-- CreateEnum
CREATE TYPE "ItemState" AS ENUM ('pending', 'approved', 'rejected', 'merged', 'archived');

-- CreateTable
CREATE TABLE "item" (
    "id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "name_he" TEXT NOT NULL,
    "name_en" TEXT,
    "list_price" INTEGER,
    "state" "ItemState" NOT NULL DEFAULT 'approved',
    "submitted_by_id" UUID,
    "merged_into_id" UUID,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_tag" (
    "item_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "item_tag_pkey" PRIMARY KEY ("item_id","tag_id")
);

-- CreateIndex
CREATE INDEX "item_venue_id_state_idx" ON "item"("venue_id", "state");

-- CreateIndex
CREATE INDEX "item_submitted_by_id_idx" ON "item"("submitted_by_id");

-- CreateIndex
CREATE INDEX "item_tag_tag_id_idx" ON "item_tag"("tag_id");

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "menu_section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_tag" ADD CONSTRAINT "item_tag_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_tag" ADD CONSTRAINT "item_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
