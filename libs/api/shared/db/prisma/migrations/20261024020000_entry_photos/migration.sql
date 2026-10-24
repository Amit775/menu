-- AlterTable
ALTER TABLE "entry" ADD COLUMN     "photo_id" TEXT,
ADD COLUMN     "photo_type" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "entry_photo_id_key" ON "entry"("photo_id");

