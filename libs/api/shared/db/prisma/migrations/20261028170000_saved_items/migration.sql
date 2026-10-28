-- CreateTable
CREATE TABLE "saved_item" (
    "account_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_item_pkey" PRIMARY KEY ("account_id","item_id")
);

-- CreateIndex
CREATE INDEX "saved_item_account_id_saved_at_idx" ON "saved_item"("account_id", "saved_at");

-- AddForeignKey
ALTER TABLE "saved_item" ADD CONSTRAINT "saved_item_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
