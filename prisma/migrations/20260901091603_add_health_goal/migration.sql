-- CreateTable
CREATE TABLE "HealthGoal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "goalType" TEXT NOT NULL,
    "startWeightKg" REAL,
    "targetWeightKg" REAL,
    "startDate" DATETIME NOT NULL,
    "targetDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "HealthGoal_userId_idx" ON "HealthGoal"("userId");

-- CreateIndex
CREATE INDEX "HealthGoal_userId_status_idx" ON "HealthGoal"("userId", "status");
