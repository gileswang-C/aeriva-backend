-- CreateTable
CREATE TABLE "BodyMetricRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "weightKg" REAL NOT NULL,
    "measuredAt" DATETIME NOT NULL,
    "note" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "BodyMetricRecord_userId_idx" ON "BodyMetricRecord"("userId");

-- CreateIndex
CREATE INDEX "BodyMetricRecord_userId_measuredAt_idx" ON "BodyMetricRecord"("userId", "measuredAt");
