/*
  Warnings:

  - The values [in_progress,done,overdue] on the enum `DepartureStatus` will be removed. If these variants are still used in the database, this will fail.
  - The `delivery_mode` column on the `applications` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `reason` on the `completions` table. All the data in the column will be lost.
  - You are about to drop the column `finished_at` on the `departures` table. All the data in the column will be lost.
  - You are about to drop the column `released_reason` on the `reservations` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('pickup', 'delivery');

-- CreateEnum
CREATE TYPE "TagTone" AS ENUM ('success', 'caution', 'progress', 'warning', 'muted', 'source');

-- AlterEnum
BEGIN;
CREATE TYPE "DepartureStatus_new" AS ENUM ('scheduled', 'in_transit', 'arrived', 'completed', 'cancelled');
ALTER TABLE "departures" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "departures" ALTER COLUMN "status" TYPE "DepartureStatus_new" USING ("status"::text::"DepartureStatus_new");
ALTER TYPE "DepartureStatus" RENAME TO "DepartureStatus_old";
ALTER TYPE "DepartureStatus_new" RENAME TO "DepartureStatus";
DROP TYPE "DepartureStatus_old";
ALTER TABLE "departures" ALTER COLUMN "status" SET DEFAULT 'scheduled';
COMMIT;

-- AlterEnum
ALTER TYPE "PipelineStage" ADD VALUE 'cancelled';

-- AlterTable
ALTER TABLE "applications" DROP COLUMN "delivery_mode",
ADD COLUMN     "delivery_mode" "DeliveryMode";

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "working_notes" TEXT;

-- AlterTable
ALTER TABLE "completions" DROP COLUMN "reason",
ADD COLUMN     "completed_by_id" TEXT,
ADD COLUMN     "completion_note" TEXT,
ADD COLUMN     "unqualified_reason" TEXT;

-- AlterTable
ALTER TABLE "departures" DROP COLUMN "finished_at",
ADD COLUMN     "arrived_at" TIMESTAMP(3),
ADD COLUMN     "cancellation_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "delivery_notes" TEXT;

-- AlterTable
ALTER TABLE "reservations" DROP COLUMN "released_reason",
ADD COLUMN     "comment" TEXT,
ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "release_reason" TEXT;

-- AlterTable
ALTER TABLE "subcontractors" ADD COLUMN     "rating" INTEGER;

-- CreateTable
CREATE TABLE "client_contacts" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_requisites" (
    "client_id" TEXT NOT NULL,
    "inn" TEXT,
    "kpp" TEXT,
    "ogrn" TEXT,
    "legal_address" TEXT,
    "bank_name" TEXT,
    "bank_account" TEXT,
    "correspondent_account" TEXT,
    "bik" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_requisites_pkey" PRIMARY KEY ("client_id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tone" "TagTone" NOT NULL DEFAULT 'muted',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_tags" (
    "client_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "assigned_by_id" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_tags_pkey" PRIMARY KEY ("client_id","tag_id")
);

-- CreateIndex
CREATE INDEX "client_contacts_client_id_idx" ON "client_contacts"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_label_key" ON "tags"("label");

-- CreateIndex
CREATE INDEX "client_tags_tag_id_idx" ON "client_tags"("tag_id");

-- CreateIndex
CREATE INDEX "completions_completed_by_id_idx" ON "completions"("completed_by_id");

-- CreateIndex
CREATE INDEX "departures_status_idx" ON "departures"("status");

-- CreateIndex
CREATE INDEX "reservations_created_by_id_idx" ON "reservations"("created_by_id");

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_requisites" ADD CONSTRAINT "client_requisites_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_tags" ADD CONSTRAINT "client_tags_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_tags" ADD CONSTRAINT "client_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_tags" ADD CONSTRAINT "client_tags_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completions" ADD CONSTRAINT "completions_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
