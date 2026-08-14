-- CreateTable
CREATE TABLE "DailyBodyState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "utcOffsetMinutes" INTEGER NOT NULL DEFAULT 480,
    "sleepHours" REAL,
    "sleepQuality" INTEGER,
    "energyLevel" INTEGER,
    "sorenessLevel" INTEGER,
    "stressLevel" INTEGER,
    "painAreasJson" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "DailyBodyState_userId_idx" ON "DailyBodyState"("userId");

-- CreateIndex
CREATE INDEX "DailyBodyState_localDate_idx" ON "DailyBodyState"("localDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyBodyState_userId_localDate_key" ON "DailyBodyState"("userId", "localDate");
