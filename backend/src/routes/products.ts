import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } from '../utils/pagination';

const router = Router();
router.use(authMiddleware);

const SORTABLE_FIELDS = ['name', 'salePrice', 'cost', 'marginPercent', 'updatedAt'] as const;
type SortableField = (typeof SORTABLE_FIELDS)[number];

interface ProductPaginationParams {
  page: number;
  limit: number;
  sortBy: SortableField;
  order: 'asc' | 'desc';
}

function parseProductPaginationParams(query: Record<string, unknown>): ProductPaginationParams {
  const rawPage = Number(query.page);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;

  const rawLimit = Number(query.limit);
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;

  const rawSortBy = typeof query.sortBy === 'string' ? query.sortBy : '';
  const sortBy = (SORTABLE_FIELDS as readonly string[]).includes(rawSortBy)
    ? (rawSortBy as SortableField)
    : 'name';

  const rawOrder = typeof query.order === 'string' ? query.order.toLowerCase() : '';
  const order = rawOrder === 'desc' ? 'desc' : 'asc';

  return { page, limit, sortBy, order };
}

interface ProductBody {
  name?: unknown;
  salePrice?: unknown;
  minMarginPercent?: unknown;
  ingredients?: unknown;
}

interface ProductIngredientBody {
  ingredientId?: unknown;
  quantity?: unknown;
}

function decimal(value: unknown, field: string, allowZero = false): Prisma.Decimal {
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new AppError(`El campo "${field}" debe ser numérico.`, 400);
  }
  const text = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(text)) {
    throw new AppError(`El campo "${field}" debe ser numérico.`, 400);
  }
  const result = new Prisma.Decimal(text);
  if (allowZero ? result.lessThan(0) : result.lessThanOrEqualTo(0)) {
    throw new AppError(`El campo "${field}" debe ser ${allowZero ? 'mayor o igual a' : 'mayor a'} cero.`, 400);
  }
  return result;
}

function parseBody(body: ProductBody) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) throw new AppError('El campo "name" es obligatorio.', 400);
  const salePrice = decimal(body.salePrice, 'salePrice');
  const minMarginPercent = decimal(body.minMarginPercent, 'minMarginPercent', true);
  if (!Array.isArray(body.ingredients)) throw new AppError('El campo "ingredients" debe ser un array.', 400);

  const ingredients = body.ingredients.map((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) throw new AppError('Cada ingrediente debe ser un objeto.', 400);
    const item = entry as ProductIngredientBody;
    if (typeof item.ingredientId !== 'string' || !item.ingredientId) throw new AppError('Cada ingrediente requiere ingredientId.', 400);
    return { ingredientId: item.ingredientId, quantity: decimal(item.quantity, 'quantity') };
  });
  return { name, salePrice, minMarginPercent, ingredients };
}

/* ------------------------------------------------------------------ */
/* GET /api/products                                                  */
/* Lista los productos paginados y ordenados por cuenta.               */
/* Query params: page, limit, sortBy, order                            */
/* ------------------------------------------------------------------ */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const { page, limit, sortBy, order } = parseProductPaginationParams(
    req.query as Record<string, unknown>
  );

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where: { accountId },
      include: { ingredients: { select: { ingredientId: true, quantity: true } } },
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
    prisma.product.count({ where: { accountId } }),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return res.status(200).json({
    data,
    products: data, // Mantenemos el alias para compatibilidad retroactiva
    meta: { total, page, limit, totalPages },
  });
});

/* ------------------------------------------------------------------ */
/* POST /api/products                                                 */
/* Crea un producto calculando costos/márgenes o en modo borrador.   */
/* ------------------------------------------------------------------ */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const input = parseBody(req.body as ProductBody);
  const accountId = req.user!.accountId;
  const ingredientIds = input.ingredients.map((item) => item.ingredientId);
  const ingredientRows = await prisma.ingredient.findMany({
    where: { accountId, id: { in: ingredientIds } },
    select: { id: true, currentCost: true },
  });
  if (ingredientRows.length !== ingredientIds.length) throw new AppError('Una receta contiene un insumo inexistente.', 400);

  const hasIngredients = input.ingredients.length > 0;
  const cost = hasIngredients
    ? input.ingredients.reduce((total, item) => {
        const ingredient = ingredientRows.find((row) => row.id === item.ingredientId);
        return total.add((ingredient?.currentCost ?? new Prisma.Decimal(0)).mul(item.quantity));
      }, new Prisma.Decimal(0))
    : new Prisma.Decimal(0);

  const marginAmount = hasIngredients ? input.salePrice.sub(cost) : new Prisma.Decimal(0);
  const marginPercent = (!hasIngredients || input.salePrice.isZero())
    ? new Prisma.Decimal(0)
    : marginAmount.div(input.salePrice).mul(100);

  const product = await prisma.product.create({
    data: {
      accountId,
      name: input.name,
      salePrice: input.salePrice,
      minMarginPercent: input.minMarginPercent,
      cost,
      marginAmount,
      marginPercent,
      ingredients: { create: input.ingredients },
    },
    include: { ingredients: { select: { ingredientId: true, quantity: true } } },
  });
  return res.status(201).json({ product });
});

export default router;