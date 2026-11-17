import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/backend';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { AUTH_USER_SELECT, provisionInvitedUser } from '../services/invitedUserProvisioning';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    accountId: string;
    email: string;
    role: 'ADMIN' | 'COLLABORATOR';
    account?: {
      id: string;
      businessName: string;
      defaultMinMarginPercent: Prisma.Decimal;
      slug: string;
    };
  };
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
      jwtKey: process.env.CLERK_JWT_KEY,
    });

    // Sin fila en User: puede ser el primer inicio de sesión de un invitado (ADR-008).
    // La cuenta y el rol salen de los metadatos que escribió el backend, nunca del cliente.
    const user =
      (await prisma.user.findUnique({
        where: { authProviderId: payload.sub },
        select: AUTH_USER_SELECT,
      })) ?? (await provisionInvitedUser(payload.sub));

    if (!user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'No autorizado' });
  }
}