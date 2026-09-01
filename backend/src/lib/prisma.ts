import { PrismaClient } from '@prisma/client';

/*
  En desarrollo, Prisma puede crear múltiples instancias
  si el servidor se reinicia mediante hot reload.

  Guardamos una única instancia en el objeto global para
  evitar abrir múltiples conexiones innecesarias a la base de datos.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/*
  Reutiliza la instancia existente de Prisma si ya fue creada.
  Si no existe, crea una nueva instancia.
*/
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

/*
  En desarrollo guardamos la instancia en globalThis para
  poder reutilizarla durante los reinicios del servidor.
 
  En producción no es necesario hacer esto.
 */
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}