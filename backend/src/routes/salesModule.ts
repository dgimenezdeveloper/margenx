import { Router, type NextFunction, type Response } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { requireFeature } from '../lib/features';
import { prisma } from '../lib/prisma';
import {
  closeShift,
  findShift,
  getCurrentShift,
  listShifts,
  openShift,
  parseCloseInput,
  parseOpeningAmount,
  parseShiftListQuery,
} from '../services/cashShiftService';
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
  responde 404 como si no existiera.

  Venta y ticket: ADMIN y COLLABORATOR venden. Al colaborador nunca le llegan costos
  ni márgenes: la respuesta se arma por rol en `serializeSale` (no se usa
  `sanitizeFinancialData` porque quitaría la cantidad de cada renglón del ticket).

  Turnos y cierre de caja: ADMIN y COLLABORATOR abren y cierran. El arqueo no tiene
  costos ni márgenes; el colaborador ve en el historial el turno abierto y los que abrió
  o cerró.
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
cashShiftsRouter.use(noStore);

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

cashShiftsRouter.post('/open', async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req);
  const openingAmount = parseOpeningAmount(req.body);
  return res.status(201).json(await openShift(actor, openingAmount));
});

/** Sin turno abierto responde 200 con `shift: null`: el 404 queda para el módulo apagado. */
cashShiftsRouter.get('/current', async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req);
  return res.status(200).json({ shift: await getCurrentShift(actor) });
});

cashShiftsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req);
  const query = parseShiftListQuery(req.query as Record<string, unknown>);
  return res.status(200).json(await listShifts(actor, query));
});

cashShiftsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req);
  const shift = await findShift(actor, String(req.params.id));
  if (!shift) {
    throw new AppError('El turno no existe.', 404);
  }
  return res.status(200).json(shift);
});

cashShiftsRouter.post('/:id/close', async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req);
  const counted = parseCloseInput(req.body);
  return res.status(200).json(await closeShift(actor, String(req.params.id), counted));
});
