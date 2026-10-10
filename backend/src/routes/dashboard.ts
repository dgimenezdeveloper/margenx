import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';

const router = Router();

router.use(authMiddleware);

router.get('/metrics', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [activeIngredientsCount, productRows, productAverageMargin, recentCostVariations] = await Promise.all([
    prisma.ingredient.count({ where: { accountId } }),
    prisma.product.findMany({
      where: {
        accountId,
        ingredients: { some: {} },
      },
      select: {
        marginPercent: true,
        minMarginPercent: true,
        _count: { select: { ingredients: true } },
      },
    }),
    prisma.product.aggregate({
      where: {
        accountId,
        ingredients: { some: {} },
        cost: { gt: 0 },
      },
      _avg: {
        marginPercent: true,
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

  const activeProducts = productRows.filter((product) => (product._count?.ingredients ?? 0) > 0);
  const criticalProductsCount = activeProducts.filter((product) => Number(product.marginPercent) < Number(product.minMarginPercent)).length;
  const healthyProductsCount = activeProducts.filter((product) => Number(product.marginPercent) >= Number(product.minMarginPercent)).length;
  const averageMarginPercent = Number(productAverageMargin._avg.marginPercent ?? 0);

  const recentCostVariationsCount = new Set(
    recentCostVariations.map((entry) => entry.ingredientId)
  ).size;

  const response = {
    activeIngredientsCount,
    criticalProductsCount,
    healthyProductsCount,
    averageMarginPercent,
    recentCostVariationsCount,
  };

  return res.status(200).json(response);
});

export default router;
