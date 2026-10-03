import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';

const router = Router();

/*
  GET /api/auth/me
*/
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({ user: req.user });
});

/*
  PATCH /api/auth/account/margin
  Actualiza el margen global de la cuenta. Solo ADMIN.
*/
router.patch('/account/margin', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Validación RBAC
    if (req.user?.role !== 'ADMIN') {
      throw new AppError('Acceso denegado. Se requiere rol ADMIN.', 403);
    }

    const { defaultMinMarginPercent } = req.body;

    // 2. Sanitización
    if (
      defaultMinMarginPercent === undefined ||
      typeof defaultMinMarginPercent !== 'number' ||
      defaultMinMarginPercent < 0 ||
      defaultMinMarginPercent > 100
    ) {
      throw new AppError('El margen debe ser un número válido entre 0 y 100.', 400);
    }

    // 3. Actualización segura en Prisma (Aislamiento Multi-tenant)
    const updatedAccount = await prisma.account.update({
      where: { id: req.user.accountId },
      data: { defaultMinMarginPercent },
      select: {
        id: true,
        businessName: true,
        defaultMinMarginPercent: true,
      }
    });

    res.status(200).json({
      message: 'Margen global actualizado correctamente',
      account: updatedAccount
    });
  } catch (error) {
    next(error);
  }
});

export default router;