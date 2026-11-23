import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { requireFeature } from '../lib/features';

/*
  Módulo de ventas (ADR-010): puntos de montaje de /api/sales y /api/cash-shifts.
  Toda ruta exige sesión y el módulo prendido para la cuenta: si está apagado,
  responde 404 como si no existiera. Las rutas de venta y ticket se suman a
  `salesRouter`, y las de turnos y cierre de caja a `cashShiftsRouter`.
*/
export const salesRouter = Router();
salesRouter.use(authMiddleware, requireFeature('sales'));

export const cashShiftsRouter = Router();
cashShiftsRouter.use(authMiddleware, requireFeature('sales'));
