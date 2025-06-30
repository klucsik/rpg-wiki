/*
  Warnings:

  - You are about to drop the `Page` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[path,version]` on the table `page_versions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "page_versions" DROP CONSTRAINT "page_versions_page_id_fkey";

-- AlterTable - Add columns with defaults first
ALTER TABLE "page_versions" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "page_versions" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update existing rows to have proper timestamps
UPDATE "page_versions" SET "created_at" = "edited_at", "updated_at" = "edited_at";

-- DropTable
DROP TABLE "Page";

-- CreateIndex
CREATE INDEX "page_versions_page_id_version_idx" ON "page_versions"("page_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "page_versions_path_version_key" ON "page_versions"("path", "version");
