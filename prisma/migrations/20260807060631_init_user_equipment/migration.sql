-- CreateTable
CREATE TABLE "UserEquipment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "environment" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "UserEquipment_userId_idx" ON "UserEquipment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserEquipment_userId_equipmentId_environment_key" ON "UserEquipment"("userId", "equipmentId", "environment");
