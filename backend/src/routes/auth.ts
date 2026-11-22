import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { requireRole } from '../middlewares/rbac';
import { getAccountFeatures } from '../lib/features';
import collaboratorsRouter from './collaborators';

const router = Router();

/*
  GET /api/auth/me
  Incluye `features`: los módulos prendidos para la cuenta (ADR-010). El colaborador
  también los recibe, porque usa el módulo de ventas aunque no vea costos.
*/
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const authUser = req.user!;
  const features = await getAccountFeatures(authUser.accountId);

  const user = authUser.role === 'COLLABORATOR' && authUser.account
    ? {
        ...authUser,
        account: {
          id: authUser.account.id,
          businessName: authUser.account.businessName,
        },
      }
    : authUser;

  res.status(200).json({ user: { ...user, features } });
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

/*
  Equipo de la cuenta: /invitations y /users (routes/collaborators.ts, ADR-008).
*/
router.use(collaboratorsRouter);

export default router;