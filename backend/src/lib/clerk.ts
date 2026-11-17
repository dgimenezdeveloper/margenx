import { createClerkClient, type ClerkClient } from '@clerk/backend';

let client: ClerkClient | null = null;

/**
 * Cliente de la Backend API de Clerk (invitaciones y usuarios, ADR-008).
 * Se crea recién en el primer uso: `index.ts` carga el `.env` después de importar las rutas,
 * y crearlo al importar el módulo lo dejaría sin `CLERK_SECRET_KEY` en local.
 */
export function getClerkClient(): ClerkClient {
  client ??= createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  return client;
}
