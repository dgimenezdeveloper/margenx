import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { requireRole } from '../middlewares/rbac';
import {
  getPurchasingSuggestions,
  previewPurchasingOrder,
  getPurchasingMarginImpact,
  getIngredientMarginImpact,
} from '../services/purchasingService';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(['ADMIN']));

export const orderPreviewSchema = z.object({
  items: z
    .array(
      z.object({
        supplierIngredientId: z
          .string({ error: 'El campo "supplierIngredientId" debe ser un texto.' })
          .trim()
          .min(1, 'El campo "supplierIngredientId" es obligatorio.'),
        packages: z
          .number({ error: 'El campo "packages" debe ser un número entero.' })
          .int('El campo "packages" debe ser un número entero.')
          .positive('El campo "packages" debe ser mayor a cero.')
          .max(100000, 'El campo "packages" no puede superar los 100.000 bultos.'),
      }),
      { error: 'El campo "items" debe ser un array.' }
    )
    .min(1, 'El pedido debe incluir al menos un ítem.')
    .max(500, 'El pedido no puede superar los 500 ítems.'),
});

router.get('/suggestions', async (req: AuthenticatedRequest, res: Response) => {
  const suggestions = await getPurchasingSuggestions(req.user!.accountId);
  return res.status(200).json(suggestions);
});

router.post('/order-preview', async (req: AuthenticatedRequest, res: Response) => {
  const parsed = orderPreviewSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new AppError(issue?.message ?? 'Payload inválido.', 400);
  }

  const preview = await previewPurchasingOrder(req.user!.accountId, parsed.data.items);
  return res.status(200).json(preview);
});

router.get('/margin-impact', async (req: AuthenticatedRequest, res: Response) => {
  const result = await getPurchasingMarginImpact(req.user!.accountId);
  return res.status(200).json(result);
});

router.get('/margin-impact/:ingredientId', async (req: AuthenticatedRequest, res: Response) => {
  const ingredientIdParam = req.params.ingredientId;
  const ingredientId = typeof ingredientIdParam === 'string' ? ingredientIdParam.trim() : '';
  if (!ingredientId) {
    throw new AppError('El parámetro "ingredientId" es obligatorio.', 400);
  }
  const rawSupplierIngredientId = req.query.supplierIngredientId;
  const supplierIngredientId =
    typeof rawSupplierIngredientId === 'string' ? rawSupplierIngredientId.trim() : '';

  if (!supplierIngredientId) {
    throw new AppError('El parámetro "supplierIngredientId" es obligatorio.', 400);
  }

  const result = await getIngredientMarginImpact(
    req.user!.accountId,
    ingredientId,
    supplierIngredientId
  );
  return res.status(200).json(result);
});

export default router;
