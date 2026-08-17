-- CreateTable
CREATE TABLE "TrainingPerformanceFeedback" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "difficultyLevel" INTEGER,
    "fatigueLevel" INTEGER,
    "painLevel" INTEGER,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainingPerformanceFeedback_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TrainingPerformanceFeedback_sessionId_key" ON "TrainingPerformanceFeedback"("sessionId");

-- CreateIndex
CREATE INDEX "TrainingPerformanceFeedback_userId_idx" ON "TrainingPerformanceFeedback"("userId");

-- CreateIndex
CREATE INDEX "TrainingPerformanceFeedback_sessionId_idx" ON "TrainingPerformanceFeedback"("sessionId");
