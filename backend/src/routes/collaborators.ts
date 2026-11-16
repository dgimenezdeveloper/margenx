import { Router, Response } from 'express';
import { z } from 'zod';
import { isClerkAPIResponseError } from '@clerk/backend/errors';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import { AppError } from '../middlewares/errorHandler';
import { prisma } from '../lib/prisma';
import { getClerkClient } from '../lib/clerk';
import { parseInvitationMetadata, type InvitationMetadata } from '../services/invitedUserProvisioning';

/*
  Equipo de la cuenta: invitar colaboradores por mail, revocar invitaciones y dar de baja
  colaboradores (ADR-008). Todo es solo ADMIN y la cuenta sale siempre de req.user.
  Contrato en docs/api.md §3.
*/
const router = Router();
const adminOnly = [authMiddleware, requireRole(['ADMIN'])];

/** Tope de página de la Backend API de Clerk. */
const CLERK_PAGE_SIZE = 500;

const CLERK_UNAVAILABLE = 'No pudimos comunicarnos con el servicio de cuentas. Probá de nuevo en unos minutos.';
const INVITATION_NOT_FOUND = 'La invitación no existe o ya no está pendiente.';

const invitationBodySchema = z
  .object({
    email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  })
  .strict();

interface ClerkInvitation {
  id: string;
  emailAddress: string;
  publicMetadata: Record<string, unknown> | null;
  createdAt: number;
}

function toInvitationResponse(invitation: ClerkInvitation) {
  return {
    id: invitation.id,
    email: invitation.emailAddress,
    createdAt: new Date(invitation.createdAt).toISOString(),
  };
}

function belongsToAccount(invitation: ClerkInvitation, accountId: string): boolean {
  const metadata: InvitationMetadata | null = parseInvitationMetadata(invitation.publicMetadata);
  return metadata?.accountId === accountId;
}

function isClerkNotFound(error: unknown): boolean {
  return isClerkAPIResponseError(error) && error.status === 404;
}

/** Traduce un error de Clerk a uno de dominio; los demás errores siguen al errorHandler (500). */
function toAppError(error: unknown): unknown {
  if (!isClerkAPIResponseError(error)) {
    return error;
  }
  const alreadyExists = error.errors.some(
    (detail) => detail.code.includes('duplicate') || detail.code.includes('identifier_exists')
  );
  if (alreadyExists) {
    return new AppError('Ese correo ya tiene una cuenta o una invitación pendiente.', 409);
  }
  return new AppError(CLERK_UNAVAILABLE, 502);
}

/** Recorre todas las páginas de invitaciones pendientes (opcionalmente filtradas por correo o id). */
async function listPendingInvitations(query?: string): Promise<ClerkInvitation[]> {
  const invitations: ClerkInvitation[] = [];
  for (let offset = 0; ; offset += CLERK_PAGE_SIZE) {
    const page = await getClerkClient().invitations.getInvitationList({
      status: 'pending',
      ...(query ? { query } : {}),
      limit: CLERK_PAGE_SIZE,
      offset,
    });
    invitations.push(...page.data);
    if (page.data.length < CLERK_PAGE_SIZE || invitations.length >= page.totalCount) {
      return invitations;
    }
  }
}

/** `<APP_BASE_URL>/login`, o nada si la variable falta o no es http(s): Clerk usa entonces su portal. */
function invitationRedirectUrl(): string | undefined {
  const base = process.env.APP_BASE_URL?.trim().replace(/\/+$/, '');
  return base && /^https?:\/\//.test(base) ? `${base}/login` : undefined;
}

/*
  POST /api/auth/invitations
  Invita a un colaborador. Clerk manda el mail; al aceptarlo, el primer inicio de sesión
  crea el User en la cuenta del ADMIN (services/invitedUserProvisioning.ts).
*/
router.post('/invitations', ...adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = invitationBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Ingresá un correo electrónico válido.', 400);
  }
  const { email } = parsed.data;
  const accountId = req.user!.accountId;

  // El correo es único en toda la base (User.email @unique): la consulta no se filtra por cuenta a propósito.
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) {
    throw new AppError('Ese correo ya tiene un usuario en MargenX.', 409);
  }

  try {
    const pending = await listPendingInvitations(email);
    if (pending.some((invitation) => invitation.emailAddress.toLowerCase() === email)) {
      throw new AppError('Ya hay una invitación pendiente para ese correo.', 409);
    }

    const redirectUrl = invitationRedirectUrl();
    const invitation = await getClerkClient().invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { accountId, role: 'COLLABORATOR' },
      ...(redirectUrl ? { redirectUrl } : {}),
      notify: true,
    });

    res.status(201).json({ invitation: toInvitationResponse(invitation) });
  } catch (error) {
    throw toAppError(error);
  }
});

/*
  GET /api/auth/invitations
  Invitaciones pendientes de la cuenta del ADMIN.
*/
router.get('/invitations', ...adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  try {
    const invitations = (await listPendingInvitations())
      .filter((invitation) => belongsToAccount(invitation, accountId))
      .map(toInvitationResponse);
    res.status(200).json({ invitations });
  } catch (error) {
    throw toAppError(error);
  }
});

/*
  DELETE /api/auth/invitations/:id
  Revoca una invitación pendiente de la propia cuenta (404 si es de otra cuenta o ya no está pendiente).
*/
router.delete('/invitations/:id', ...adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  const invitationId = String(req.params.id);
  const accountId = req.user!.accountId;
  try {
    const invitation = (await listPendingInvitations(invitationId)).find(
      (candidate) => candidate.id === invitationId && belongsToAccount(candidate, accountId)
    );
    if (!invitation) {
      throw new AppError(INVITATION_NOT_FOUND, 404);
    }
    await getClerkClient().invitations.revokeInvitation(invitation.id);
    res.status(200).json({ message: 'Invitación revocada correctamente.' });
  } catch (error) {
    if (isClerkNotFound(error)) {
      throw new AppError(INVITATION_NOT_FOUND, 404);
    }
    throw toAppError(error);
  }
});

/*
  GET /api/auth/users
  Usuarios activos de la cuenta del ADMIN (primero los administradores).
*/
router.get('/users', ...adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  const users = await prisma.user.findMany({
    where: { accountId: req.user!.accountId },
    select: { id: true, email: true, role: true, createdAt: true },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });
  res.status(200).json({ users });
});

/*
  DELETE /api/auth/users/:id
  Baja de un colaborador. Borra también su usuario de Clerk: si quedara, sus publicMetadata
  lo volverían a dar de alta en el siguiente inicio de sesión.
*/
router.delete('/users/:id', ...adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  const userId = String(req.params.id);
  const accountId = req.user!.accountId;

  if (userId === req.user!.id) {
    throw new AppError('No podés darte de baja a vos mismo.', 422);
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, accountId },
    select: { id: true, role: true, authProviderId: true },
  });
  if (!target) {
    throw new AppError('El usuario no existe.', 404);
  }
  if (target.role !== 'COLLABORATOR') {
    throw new AppError('Solo se pueden dar de baja colaboradores.', 422);
  }

  try {
    await getClerkClient().users.deleteUser(target.authProviderId);
  } catch (error) {
    // Si ya no existe en Clerk, se completa la baja en la base (reintento de una baja a medias).
    if (!isClerkNotFound(error)) {
      throw toAppError(error);
    }
  }

  await prisma.user.deleteMany({ where: { id: target.id, accountId } });
  res.status(200).json({ message: 'Colaborador dado de baja correctamente.' });
});

export default router;
