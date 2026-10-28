-- CreateEnum
CREATE TYPE "ContributorApplicationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'contributor';

-- CreateTable
CREATE TABLE "contributor_application" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "status" "ContributorApplicationStatus" NOT NULL DEFAULT 'pending',
    "decided_by_id" UUID,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contributor_application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contributor_application_account_id_created_at_idx" ON "contributor_application"("account_id", "created_at");

-- CreateIndex
CREATE INDEX "contributor_application_status_created_at_idx" ON "contributor_application"("status", "created_at");

-- AddForeignKey
ALTER TABLE "contributor_application" ADD CONSTRAINT "contributor_application_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributor_application" ADD CONSTRAINT "contributor_application_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
