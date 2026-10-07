-- CreateIndex
CREATE INDEX "PriceHistory_ingredientId_changedAt_idx" ON "PriceHistory"("ingredientId", "changedAt");
