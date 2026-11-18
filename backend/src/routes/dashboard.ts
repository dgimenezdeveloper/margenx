import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import { calculateCatalogHealthSummary } from '../services/marginCalculator';

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

  const summary = calculateCatalogHealthSummary(
    productRows.map((product) => ({
      marginPercent: product.marginPercent,
      minMarginPercent: product.minMarginPercent,
      ingredientsCount: product._count?.ingredients ?? 0,
    }))
  );

  const recentCostVariationsCount = new Set(
    recentCostVariations.map((entry) => entry.ingredientId)
  ).size;

  const response = {
    activeIngredientsCount,
    criticalProductsCount: summary.criticalProductsCount,
    healthyProductsCount: summary.healthyProductsCount,
    averageMarginPercent: summary.averageMarginPercent,
    recentCostVariationsCount,
    lossCount: summary.lossCount,
    riskCount: summary.riskCount,
    targetCount: summary.targetCount,
    surplusCount: summary.surplusCount,
    draftCount: summary.draftCount,
  };

  return res.status(200).json(response);
});

export default router;
