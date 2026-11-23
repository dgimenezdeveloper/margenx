import { Router, type NextFunction, type Response } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { requireFeature } from '../lib/features';
import { prisma } from '../lib/prisma';
import {
  createSale,
  findSale,
  listSales,
  parseSaleInput,
  parseSaleListQuery,
  parseVoidReason,
  serializeSale,
  voidSale,
  type SaleActor,
} from '../services/salesService';

/*
  Módulo de ventas (ADR-010): puntos de montaje de /api/sales y /api/cash-shifts.
  Toda ruta exige sesión y el módulo prendido para la cuenta: si está apagado,
  responde 404 como si no existiera. Las rutas de turnos y cierre de caja se suman
  a `cashShiftsRouter`.

  Venta y ticket: ADMIN y COLLABORATOR venden. Al colaborador nunca le llegan costos
  ni márgenes: la respuesta se arma por rol en `serializeSale` (no se usa
  `sanitizeFinancialData` porque quitaría la cantidad de cada renglón del ticket).
*/
export const salesRouter = Router();
salesRouter.use(authMiddleware, requireFeature('sales'));

export const cashShiftsRouter = Router();
cashShiftsRouter.use(authMiddleware, requireFeature('sales'));

function actorOf(req: AuthenticatedRequest): SaleActor {
  if (!req.user) throw new AppError('No autorizado', 401);
  return { id: req.user.id, accountId: req.user.accountId, role: req.user.role };
}

/** Las respuestas con ventas no se guardan en cachés compartidas. */
function noStore(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
}
salesRouter.use(noStore);

salesRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req);
  const input = parseSaleInput(req.body);
  const sale = await createSale(actor, input);
  const account = await prisma.account.findUnique({
    where: { id: actor.accountId },
    select: { businessName: true },
  });
  return res.status(201).json(serializeSale(sale, actor.role, account?.businessName ?? ''));
});

salesRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req);
  const query = parseSaleListQuery(req.query as Record<string, unknown>);
  return res.status(200).json(await listSales(actor, query));
});

salesRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req);
  const sale = await findSale(actor, String(req.params.id));
  if (!sale) {
    throw new AppError('La venta no existe.', 404);
  }
  return res.status(200).json(serializeSale(sale, actor.role, sale.account.businessName));
});

salesRouter.post('/:id/void', async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req);
  const reason = parseVoidReason(req.body);
  const sale = await voidSale(actor, String(req.params.id), reason);
  return res.status(200).json(serializeSale(sale, actor.role, sale.account.businessName));
});
