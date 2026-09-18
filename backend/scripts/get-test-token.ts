import dotenv from 'dotenv';
dotenv.config();
import { createClerkClient } from '@clerk/backend';

/**
 * Script de desarrollo: genera un JWT de corta duración (~60s) para uno de
 * los 4 usuarios cargados por el seed, sin necesidad de loguearse manualmente
 * en el frontend. Uso exclusivo para pruebas locales (Postman, curl, etc.).
 *
 * Requisitos previos:
 *  - CLERK_SECRET_KEY configurada en .env, apuntando a la misma instancia
 *    de Clerk donde existen los userId listados abajo.
 *  - Haber corrido el seed (backend/prisma/seed.ts) al menos una vez, para
 *    que estos authProviderId existan como User en la base local.
 *
 * Uso:
 *   npx tsx scripts/get-test-token.ts                 // panaderia-admin (default)
 *   npx tsx scripts/get-test-token.ts panaderia-colab
 *   npx tsx scripts/get-test-token.ts quimica-admin
 *   npx tsx scripts/get-test-token.ts quimica-colab
 */

function getClerkSecretKey(): string {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      'Falta CLERK_SECRET_KEY en el .env. Este script no puede generar tokens sin ella.'
    );
  }
  return secretKey;
}

const clerkClient = createClerkClient({ secretKey: getClerkSecretKey() });

// Mapa de los 4 usuarios del seed (ver backend/prisma/seed.ts).
const USERS: Record<string, string> = {
  'panaderia-admin': 'user_3J3QH50TxpOxRky6qNX7C79lj7x',
  'panaderia-colab': 'user_3J3Qf8N1X4mH5z5B9Ol757UdJmE',
  'quimica-admin': 'user_3J3QxljX607yJ96D5uYViLqZYvD',
  'quimica-colab': 'user_3J3R65zdLKecDm1vFiUZhOvgWq7',
};

async function main(): Promise<void> {
  const target = process.argv[2] ?? 'panaderia-admin';
  const userId = USERS[target];

  if (!userId) {
    console.error(`❌ Usuario inválido. Opciones disponibles: ${Object.keys(USERS).join(', ')}`);
    process.exit(1);
  }

  const session = await clerkClient.sessions.createSession({ userId });
  const { jwt } = await clerkClient.sessions.getToken(session.id);

  console.log(`\n🔑 Token generado para [${target}] (Válido ~60s):`);
  console.log(`${jwt}\n`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Error inesperado al generar el token.');
  process.exit(1);
});