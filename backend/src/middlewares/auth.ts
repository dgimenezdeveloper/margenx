import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/backend';
import { prisma } from '../lib/prisma';

/**
 * Representa los datos del usuario autenticado
 * que estarán disponibles en req.user.
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    accountId: string;
    email: string;
    role: 'ADMIN' | 'COLLABORATOR';
    account?: {
      id: string;
      businessName: string;
    };
  };
}

/**
 * Middleware encargado de autenticar las peticiones.
 */
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

    const user = await prisma.user.findUnique({
      where: { authProviderId: payload.sub },
      select: {
        id: true,
        accountId: true,
        email: true,
        role: true,
        account: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'No autorizado' });
  }
}