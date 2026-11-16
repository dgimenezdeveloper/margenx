import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getClerkClient } from '../lib/clerk';
import { prisma } from '../lib/prisma';

/** Campos del usuario autenticado que el middleware deja en `req.user`. */
export const AUTH_USER_SELECT = {
  id: true,
  accountId: true,
  email: true,
  role: true,
  account: {
    select: {
      id: true,
      businessName: true,
      defaultMinMarginPercent: true,
      slug: true,
    },
  },
} satisfies Prisma.UserSelect;

export type AuthUserRow = Prisma.UserGetPayload<{ select: typeof AUTH_USER_SELECT }>;

/**
 * Metadatos que `POST /api/auth/invitations` guarda en la invitación de Clerk y que Clerk
 * copia a `publicMetadata` del usuario al aceptarla. Solo los escribe el backend con la
 * clave secreta: el navegador no puede modificarlos (ADR-008).
 * El único rol invitable es COLLABORATOR: invitar a otro ADMIN es de la Fase 2 (ADR-007).
 */
const invitationMetadataSchema = z.object({
  accountId: z.string().trim().min(1).max(64),
  role: z.literal('COLLABORATOR'),
});

export type InvitationMetadata = z.infer<typeof invitationMetadataSchema>;

export function parseInvitationMetadata(metadata: unknown): InvitationMetadata | null {
  const parsed = invitationMetadataSchema.safeParse(metadata);
  return parsed.success ? parsed.data : null;
}

/**
 * Usuarios de Clerk sin invitación válida, recordados por un rato. Sin esto, cada pedido de un
 * usuario de Clerk sin fila en `User` (por ejemplo, alguien que se registró solo si la instancia
 * permite el alta pública) consultaría a Clerk y gastaría el cupo de su Backend API (ADR-008).
 * Los fallos de Clerk no se recuerdan: el pedido siguiente vuelve a intentar.
 * Vive en memoria de cada proceso; con varios procesos, cada uno recuerda por su cuenta.
 */
export const REJECTED_CACHE_TTL_MS = 5 * 60 * 1000;
export const REJECTED_CACHE_MAX_ENTRIES = 1000;

const rejectedUntil = new Map<string, number>();

function isRecentlyRejected(authProviderId: string): boolean {
  const until = rejectedUntil.get(authProviderId);
  if (until === undefined) {
    return false;
  }
  if (until > Date.now()) {
    return true;
  }
  rejectedUntil.delete(authProviderId);
  return false;
}

function rememberRejection(authProviderId: string): null {
  rejectedUntil.delete(authProviderId);
  if (rejectedUntil.size >= REJECTED_CACHE_MAX_ENTRIES) {
    // El Map conserva el orden de inserción: la primera clave es la más vieja.
    const oldest = rejectedUntil.keys().next().value;
    if (oldest !== undefined) {
      rejectedUntil.delete(oldest);
    }
  }
  rejectedUntil.set(authProviderId, Date.now() + REJECTED_CACHE_TTL_MS);
  return null;
}

/** Solo para pruebas. */
export function resetRejectedProvisioningCache(): void {
  rejectedUntil.clear();
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * Primer inicio de sesión de un invitado: si el usuario de Clerk trae una invitación válida,
 * crea su `User` con la cuenta y el rol de la invitación. Devuelve `null` (el middleware
 * responde 401) cuando no hay invitación, los metadatos no son válidos, la cuenta no existe
 * o está inactiva, falta el correo o ese correo ya pertenece a otro usuario. Esos rechazos se
 * recuerdan `REJECTED_CACHE_TTL_MS` para no volver a consultar a Clerk en cada pedido.
 */
export async function provisionInvitedUser(authProviderId: string): Promise<AuthUserRow | null> {
  if (isRecentlyRejected(authProviderId)) {
    return null;
  }

  let clerkUser;
  try {
    clerkUser = await getClerkClient().users.getUser(authProviderId);
  } catch {
    return null;
  }

  const invitation = parseInvitationMetadata(clerkUser.publicMetadata);
  const email = clerkUser.primaryEmailAddress?.emailAddress.trim().toLowerCase();
  if (!invitation || !email) {
    return rememberRejection(authProviderId);
  }

  const account = await prisma.account.findUnique({
    where: { id: invitation.accountId },
    select: { isActive: true },
  });
  if (!account?.isActive) {
    return rememberRejection(authProviderId);
  }

  try {
    return await prisma.user.create({
      data: {
        accountId: invitation.accountId,
        email,
        role: invitation.role,
        authProviderId,
      },
      select: AUTH_USER_SELECT,
    });
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }
    // Dos pedidos simultáneos del primer inicio de sesión: el otro ya creó el User.
    // Si no lo encuentra por authProviderId, el correo es de otro usuario y no se da de alta.
    const existing = await prisma.user.findUnique({ where: { authProviderId }, select: AUTH_USER_SELECT });
    return existing ?? rememberRejection(authProviderId);
  }
}
