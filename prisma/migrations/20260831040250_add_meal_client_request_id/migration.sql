/*
  Warnings:

  - A unique constraint covering the columns `[clientRequestId]` on the table `MealLog` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "MealLog" ADD COLUMN "clientRequestId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MealLog_clientRequestId_key" ON "MealLog"("clientRequestId");
