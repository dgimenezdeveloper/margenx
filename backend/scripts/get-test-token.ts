import dotenv from 'dotenv';
dotenv.config();

import { createClerkClient } from '@clerk/backend';

console.log('Key cargada:', process.env.CLERK_SECRET_KEY ? 'sí' : 'NO — revisar .env');

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

async function main() {
  const userId = 'user_xxxxx'; // tu User ID de Clerk

  const session = await clerkClient.sessions.createSession({ userId });
  const { jwt } = await clerkClient.sessions.getToken(session.id);

  console.log('Token generado (válido ~60s):');
  console.log(jwt);
}

main().catch(console.error);