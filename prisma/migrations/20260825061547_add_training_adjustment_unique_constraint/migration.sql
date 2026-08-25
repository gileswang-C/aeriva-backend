/*
  Warnings:

  - A unique constraint covering the columns `[sessionId,exerciseId]` on the table `TrainingAdjustment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TrainingAdjustment_sessionId_exerciseId_key" ON "TrainingAdjustment"("sessionId", "exerciseId");
