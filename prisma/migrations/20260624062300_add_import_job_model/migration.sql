-- CreateTable
CREATE TABLE "ImportJob" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sourceFileName" TEXT,
    "fileType" TEXT,
    "fileSizeBytes" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "log" TEXT,
    "pagesCreated" INTEGER NOT NULL DEFAULT 0,
    "imagesImported" INTEGER NOT NULL DEFAULT 0,
    "manifestPageId" INTEGER,
    "triggeredBy" TEXT NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportJob_status_idx" ON "ImportJob"("status");
