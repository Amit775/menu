-- CreateEnum
CREATE TYPE "VenueStatus" AS ENUM ('active', 'hidden');

-- CreateEnum
CREATE TYPE "TagKind" AS ENUM ('dish', 'diet', 'flavour');

-- CreateTable
CREATE TABLE "ownership" (
    "account_id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "granted_by_id" UUID,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ownership_pkey" PRIMARY KEY ("account_id","venue_id")
);

-- CreateTable
CREATE TABLE "venue" (
    "id" UUID NOT NULL,
    "name_he" TEXT NOT NULL,
    "name_en" TEXT,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "phone" TEXT,
    "reservation_url" TEXT,
    "status" "VenueStatus" NOT NULL DEFAULT 'active',
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_section" (
    "id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "name_he" TEXT NOT NULL,
    "name_en" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "menu_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name_he" TEXT NOT NULL,
    "name_en" TEXT,
    "kind" "TagKind" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ownership_venue_id_idx" ON "ownership"("venue_id");

-- CreateIndex
CREATE INDEX "venue_lat_lng_idx" ON "venue"("lat", "lng");

-- CreateIndex
CREATE INDEX "menu_section_venue_id_position_idx" ON "menu_section"("venue_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "tag_slug_key" ON "tag"("slug");

-- AddForeignKey
ALTER TABLE "ownership" ADD CONSTRAINT "ownership_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ownership" ADD CONSTRAINT "ownership_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_section" ADD CONSTRAINT "menu_section_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
