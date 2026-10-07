import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { requireRole } from '../middlewares/rbac';

const router = Router();

/*
  GET /api/auth/me
*/
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user && req.user.role === 'COLLABORATOR' && req.user.account
    ? {
        ...req.user,
        account: {
          id: req.user.account.id,
          businessName: req.user.account.businessName,
        },
      }
    : req.user;

  res.status(200).json({ user });
});

/*
  PATCH /api/auth/account/margin
  Actualiza el margen global de la cuenta. Solo ADMIN.
*/
router.patch('/account/margin', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const { defaultMinMarginPercent } = req.body;

  if (
    defaultMinMarginPercent === undefined ||
    typeof defaultMinMarginPercent !== 'number' ||
    defaultMinMarginPercent < 0 ||
    defaultMinMarginPercent > 100
  ) {
    throw new AppError('El margen debe ser un número válido entre 0 y 100.', 400);
  }

  const updatedAccount = await prisma.account.update({
    where: { id: req.user!.accountId },
    data: { defaultMinMarginPercent },
    select: {
      id: true,
      businessName: true,
      defaultMinMarginPercent: true,
    }
  });

  res.status(200).json({
    message: 'Margen global actualizado correctamente',
    account: updatedAccount,
  });
});

export default router;