-- CreateTable
CREATE TABLE "NutritionDailyTarget" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "dailyCaloriesKcal" REAL NOT NULL,
    "proteinG" REAL,
    "carbsG" REAL,
    "fatG" REAL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "NutritionDailyTarget_userId_key" ON "NutritionDailyTarget"("userId");

-- CreateIndex
CREATE INDEX "NutritionDailyTarget_userId_idx" ON "NutritionDailyTarget"("userId");
