-- CreateEnum
CREATE TYPE "EntryVisibility" AS ENUM ('private', 'shared', 'public');

-- CreateTable
CREATE TABLE "entry" (
    "id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "eaten_at" TIMESTAMP(3) NOT NULL,
    "rating" INTEGER,
    "would_order_again" BOOLEAN,
    "price_paid" INTEGER,
    "text" TEXT NOT NULL DEFAULT '',
    "visibility" "EntryVisibility" NOT NULL DEFAULT 'private',
    "share_token" TEXT,
    "hidden_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entry_share_token_key" ON "entry"("share_token");

-- CreateIndex
CREATE INDEX "entry_author_id_eaten_at_idx" ON "entry"("author_id", "eaten_at");

-- CreateIndex
CREATE INDEX "entry_item_id_visibility_idx" ON "entry"("item_id", "visibility");

-- CreateIndex
CREATE INDEX "entry_venue_id_idx" ON "entry"("venue_id");

-- AddForeignKey
ALTER TABLE "entry" ADD CONSTRAINT "entry_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
