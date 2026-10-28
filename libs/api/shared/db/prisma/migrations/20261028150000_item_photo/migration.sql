-- AlterTable
ALTER TABLE "item" ADD COLUMN     "photo" JSONB;

-- CreateIndex
CREATE INDEX "item_photo_idx" ON "item" USING GIN ("photo" jsonb_path_ops);
