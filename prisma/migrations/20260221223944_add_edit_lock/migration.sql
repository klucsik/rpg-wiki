-- CreateTable
CREATE TABLE "edit_locks" (
    "id" SERIAL NOT NULL,
    "page_id" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "edit_locks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "edit_locks" ADD CONSTRAINT "edit_locks_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
