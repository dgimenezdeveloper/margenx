// backend/scripts/get-test-token.ts
/** 
  # Por defecto genera el token de 'panaderia-admin':
  npx tsx scripts/get-test-token.ts

  # Generar token para otros usuarios:
  npx tsx scripts/get-test-token.ts panaderia-colab
  npx tsx scripts/get-test-token.ts quimica-admin
  npx tsx scripts/get-test-token.ts quimica-colab
*/
import dotenv from 'dotenv';
dotenv.config();
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

// Mapa de los 4 usuarios del Seed
const USERS: Record<string, string> = {
  'panaderia-admin': 'user_3J3QH50TxpOxRky6qNX7C79lj7x',
  'panaderia-colab': 'user_3J3Qf8N1X4mH5z5B9Ol757UdJmE',
  'quimica-admin':   'user_3J3QxljX607yJ96D5uYViLqZYvD',
  'quimica-colab':   'user_3J3R65zdLKecDm1vFiUZhOvgWq7',
};

async function main() {
  // Toma el usuario por argumento: ej. npx tsx scripts/get-test-token.ts panaderia-admin
  const target = process.argv[2] || 'panaderia-admin';
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

main().catch(console.error);

