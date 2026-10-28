-- CreateEnum
CREATE TYPE "ItemReportKind" AS ENUM ('gone', 'price');

-- AlterEnum
ALTER TYPE "ItemRevisionKind" ADD VALUE 'confirmed';

-- CreateTable
CREATE TABLE "item_report" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "kind" "ItemReportKind" NOT NULL,
    "price_value" DECIMAL(10,2),
    "price_currency" "Currency",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "item_report_reporter_id_idx" ON "item_report"("reporter_id");

-- CreateIndex
CREATE UNIQUE INDEX "item_report_item_id_reporter_id_key" ON "item_report"("item_id", "reporter_id");

-- AddForeignKey
ALTER TABLE "item_report" ADD CONSTRAINT "item_report_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_report" ADD CONSTRAINT "item_report_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
