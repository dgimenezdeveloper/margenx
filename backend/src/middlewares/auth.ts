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
  };
}

/**
 * Middleware encargado de autenticar las peticiones.
 *
 * Flujo:
 * 1. Obtiene el header Authorization.
 * 2. Comprueba que tenga el formato Bearer <token>.
 * 3. Valida el JWT utilizando Clerk.
 * 4. Obtiene el usuario asociado al token desde Prisma.
 * 5. Guarda los datos del usuario en req.user.
 * 6. Continúa con la ejecución de la ruta.
 *
 * Si alguno de estos pasos falla, responde con 401 Unauthorized.
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  // Obtiene el header Authorization enviado por el cliente.
  const authHeader = req.headers.authorization;

  // Verifica que exista y tenga el formato esperado:
  // Authorization: Bearer <token>
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }

   // Extrae únicamente el JWT eliminando el prefijo "Bearer ".
  const token = authHeader.slice(7);

  try {
    // Verifica la firma y validez del JWT utilizando las credenciales configuradas para Clerk.
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
      jwtKey: process.env.CLERK_JWT_KEY,
    });

    //  Busca en nuestra base de datos el usuario cuyo authProviderId coincide con el "sub" del JWT. (El claim "sub" identifica al usuario en Clerk.)
    const user = await prisma.user.findUnique({
      where: { authProviderId: payload.sub },
      select: { id: true, accountId: true, email: true, role: true },
    });

    // El token puede ser válido e Clerk pero el usuario puede no existir en nuestra base de datos (por ejemplo, si fue eliminado). En ese caso, respondemos con 401 Unauthorized.
    if (!user) {
      return res.status(401).json({ error: 'No autorizado' });
}
    req.user = user;
    next();
  } catch (err) {
    // Si ocurre algún error durante la verificación del token o la búsqueda del usuario, respondemos con 401 Unauthorized.
    return res.status(401).json({ error: 'No autorizado' });
  }
}