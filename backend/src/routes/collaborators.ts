import { Router, Response } from 'express';
import { z } from 'zod';
import { isClerkAPIResponseError } from '@clerk/backend/errors';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import { AppError } from '../middlewares/errorHandler';
import { prisma } from '../lib/prisma';
import { getClerkClient } from '../lib/clerk';
import { parseInvitationMetadata, type InvitationMetadata } from '../services/invitedUserProvisioning';
import { dispatchInvitationEmail } from '../services/invitationMailDispatcher';

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
const INVALID_EMAIL = 'Ingresá un correo electrónico válido.';
const PENDING_INVITATION_EXISTS =
  'Ya hay una invitación pendiente para ese correo. Revocala desde la lista para mandar otra.';
const ACCOUNT_EXISTS_IN_OTHER_TENANT =
  'Ese correo ya usa MargenX con otra cuenta. Pedile a la persona que use otro correo.';
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
  url?: string;
}

/**
 * `url` es el enlace para aceptar la invitación: lo ve solo el ADMIN de la cuenta, para
 * copiarlo y mandarlo por otro canal si el mail no llega.
 */
function toInvitationResponse(invitation: ClerkInvitation) {
  return {
    id: invitation.id,
    email: invitation.emailAddress,
    createdAt: new Date(invitation.createdAt).toISOString(),
    url: invitation.url ?? null,
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
  if (error.errors.some((detail) => detail.code.includes('duplicate'))) {
    return new AppError(PENDING_INVITATION_EXISTS, 409);
  }
  if (error.errors.some((detail) => detail.code.includes('identifier_exists'))) {
    return new AppError(ACCOUNT_EXISTS_IN_OTHER_TENANT, 409);
  }
  // Clerk valida el correo más estricto que el formulario (por ejemplo, rechaza dominios reservados).
  if (error.errors.some((detail) => detail.code === 'form_param_format_invalid')) {
    return new AppError(INVALID_EMAIL, 400);
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
  Invita a un colaborador. Clerk crea la invitación sin su mail (notify: false) y MargenX manda
  el suyo por n8n (services/invitationMailDispatcher.ts). Si el mail no sale, la invitación igual
  queda y la respuesta lo indica con emailSent: false, para que el ADMIN copie el enlace.
  Al aceptarla, el primer inicio de sesión crea el User (services/invitedUserProvisioning.ts).
*/
router.post('/invitations', ...adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = invitationBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(INVALID_EMAIL, 400);
  }
  const { email } = parsed.data;
  const accountId = req.user!.accountId;

  // El correo es único en toda la base (User.email @unique): la consulta no se filtra por cuenta a propósito.
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true, accountId: true } });
  if (existingUser) {
    // En otro comercio, la persona no puede sumarse a esta cuenta con ese correo (RC-25).
    throw new AppError(
      existingUser.accountId === accountId ? 'Ese correo ya tiene un usuario en MargenX.' : ACCOUNT_EXISTS_IN_OTHER_TENANT,
      409
    );
  }

  try {
    const pending = await listPendingInvitations(email);
    const existingPending = pending.find(
      (invitation) => invitation.emailAddress.toLowerCase() === email
    );
    if (existingPending) {
      throw new AppError(
        belongsToAccount(existingPending, accountId)
          ? PENDING_INVITATION_EXISTS
          : 'Ya hay una invitación pendiente para ese correo.',
        409
      );
    }

    const redirectUrl = invitationRedirectUrl();
    const invitation = await getClerkClient().invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { accountId, role: 'COLLABORATOR' },
      ...(redirectUrl ? { redirectUrl } : {}),
      notify: false,
    });

    const emailSent = invitation.url
      ? await dispatchInvitationEmail({
          email,
          tradeName: req.user!.account?.businessName ?? 'tu comercio',
          inviterEmail: req.user!.email,
          invitationUrl: invitation.url,
        })
      : false;

    res.status(201).json({ invitation: toInvitationResponse(invitation), emailSent });
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
