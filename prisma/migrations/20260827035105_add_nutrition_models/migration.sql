-- CreateTable
CREATE TABLE "MealLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "utcOffsetMinutes" INTEGER NOT NULL DEFAULT 480,
    "mealType" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MealItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mealLogId" INTEGER NOT NULL,
    "foodName" TEXT NOT NULL,
    "caloriesKcal" REAL NOT NULL,
    "proteinG" REAL,
    "carbsG" REAL,
    "fatG" REAL,
    "quantity" REAL,
    "unit" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MealItem_mealLogId_fkey" FOREIGN KEY ("mealLogId") REFERENCES "MealLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MealLog_userId_idx" ON "MealLog"("userId");

-- CreateIndex
CREATE INDEX "MealLog_localDate_idx" ON "MealLog"("localDate");

-- CreateIndex
CREATE INDEX "MealLog_userId_localDate_idx" ON "MealLog"("userId", "localDate");

-- CreateIndex
CREATE INDEX "MealItem_mealLogId_idx" ON "MealItem"("mealLogId");
