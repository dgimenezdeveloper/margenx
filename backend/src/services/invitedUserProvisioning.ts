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

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * Primer inicio de sesión de un invitado: si el usuario de Clerk trae una invitación válida,
 * crea su `User` con la cuenta y el rol de la invitación. Devuelve `null` (el middleware
 * responde 401) cuando no hay invitación, los metadatos no son válidos, la cuenta no existe
 * o está inactiva, falta el correo o ese correo ya pertenece a otro usuario.
 */
export async function provisionInvitedUser(authProviderId: string): Promise<AuthUserRow | null> {
  let clerkUser;
  try {
    clerkUser = await getClerkClient().users.getUser(authProviderId);
  } catch {
    return null;
  }

  const invitation = parseInvitationMetadata(clerkUser.publicMetadata);
  const email = clerkUser.primaryEmailAddress?.emailAddress.trim().toLowerCase();
  if (!invitation || !email) {
    return null;
  }

  const account = await prisma.account.findUnique({
    where: { id: invitation.accountId },
    select: { isActive: true },
  });
  if (!account?.isActive) {
    return null;
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
    return prisma.user.findUnique({ where: { authProviderId }, select: AUTH_USER_SELECT });
  }
}
