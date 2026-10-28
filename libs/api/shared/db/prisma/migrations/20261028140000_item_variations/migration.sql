-- AlterTable
ALTER TABLE "entry" ADD COLUMN     "variation_id" UUID;

-- AlterTable
ALTER TABLE "item" ADD COLUMN     "variations" JSONB NOT NULL DEFAULT '[]';
