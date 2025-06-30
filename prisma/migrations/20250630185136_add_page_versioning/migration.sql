-- CreateTable
CREATE TABLE "page_versions" (
    "id" SERIAL NOT NULL,
    "page_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "edit_groups" TEXT[],
    "view_groups" TEXT[],
    "edited_by" TEXT NOT NULL,
    "edited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "change_summary" TEXT,

    CONSTRAINT "page_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "page_versions_page_id_version_key" ON "page_versions"("page_id", "version");

-- AddForeignKey
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
