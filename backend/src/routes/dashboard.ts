import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import {
  calculateMedianMarginPercent,
  classifyProductHealthBucket,
} from '../services/marginCalculator';

const router = Router();

router.use(authMiddleware);

router.get('/metrics', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [activeIngredientsCount, productRows, recentCostVariations] = await Promise.all([
    prisma.ingredient.count({ where: { accountId } }),
    prisma.product.findMany({
      where: { accountId },
      select: {
        marginPercent: true,
        minMarginPercent: true,
        _count: { select: { ingredients: true } },
      },
    }),
    prisma.priceHistory.groupBy({
      by: ['ingredientId'],
      where: {
        ingredient: { accountId },
        changedAt: { gte: sevenDaysAgo },
      },
    }),
  ]);

  let lossCount = 0;
  let riskCount = 0;
  let targetCount = 0;
  let surplusCount = 0;
  let draftCount = 0;
  const activeMargins: Prisma.Decimal[] = [];

  for (const product of productRows) {
    const ingredientsCount = product._count?.ingredients ?? 0;
    const marginPercent = new Prisma.Decimal(product.marginPercent ?? 0);
    const minMarginPercent = new Prisma.Decimal(product.minMarginPercent ?? 0);
    const bucket = classifyProductHealthBucket(marginPercent, minMarginPercent, ingredientsCount);

    switch (bucket) {
      case 'draft':
        draftCount += 1;
        break;
      case 'loss':
        lossCount += 1;
        activeMargins.push(marginPercent);
        break;
      case 'risk':
        riskCount += 1;
        activeMargins.push(marginPercent);
        break;
      case 'target':
        targetCount += 1;
        activeMargins.push(marginPercent);
        break;
      case 'surplus':
        surplusCount += 1;
        activeMargins.push(marginPercent);
        break;
    }
  }

  const criticalProductsCount = lossCount + riskCount;
  const healthyProductsCount = targetCount + surplusCount;
  const averageMarginPercent = calculateMedianMarginPercent(activeMargins).toNumber();

  const recentCostVariationsCount = new Set(
    recentCostVariations.map((entry) => entry.ingredientId)
  ).size;

  const response = {
    activeIngredientsCount,
    criticalProductsCount,
    healthyProductsCount,
    averageMarginPercent,
    recentCostVariationsCount,
    lossCount,
    riskCount,
    targetCount,
    surplusCount,
    draftCount,
  };

  return res.status(200).json(response);
});

export default router;
