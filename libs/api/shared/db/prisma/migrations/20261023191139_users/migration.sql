-- CreateEnum
CREATE TYPE "Language" AS ENUM ('he', 'en');

-- CreateTable
CREATE TABLE "account" (
    "id" UUID NOT NULL,
    "firebase_uid" TEXT NOT NULL,
    "display_name" TEXT NOT NULL DEFAULT '',
    "language" "Language" NOT NULL DEFAULT 'he',
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_firebase_uid_key" ON "account"("firebase_uid");
