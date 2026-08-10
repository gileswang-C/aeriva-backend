-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserEquipment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "environment" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserEquipment" ("createdAt", "environment", "equipmentId", "id", "updatedAt", "userId") SELECT "createdAt", "environment", "equipmentId", "id", "updatedAt", "userId" FROM "UserEquipment";
DROP TABLE "UserEquipment";
ALTER TABLE "new_UserEquipment" RENAME TO "UserEquipment";
CREATE INDEX "UserEquipment_userId_idx" ON "UserEquipment"("userId");
CREATE INDEX "UserEquipment_equipmentId_idx" ON "UserEquipment"("equipmentId");
CREATE UNIQUE INDEX "UserEquipment_userId_equipmentId_environment_key" ON "UserEquipment"("userId", "equipmentId", "environment");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
