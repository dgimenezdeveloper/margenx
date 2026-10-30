// Reglas de identidad de usuarios para seed.ts y seed-demo.ts.
// Funciones puras: se prueban sin base de datos (seed-identity.test.ts).

export interface DemoAuthProviderIds {
  admin: string;
  collaborator: string;
}

const CLERK_USER_ID = /^user_[A-Za-z0-9]+$/;

// Cada instancia de Clerk (desarrollo y producción) asigna sus propios user_id.
// En producción se pasan los dos por variable de entorno; sin variables se
// usan los de desarrollo. Una sola variable es un error: mezclaría instancias.
export function resolveDemoAuthProviderIds(
  env: Record<string, string | undefined>,
  defaults: DemoAuthProviderIds,
): DemoAuthProviderIds {
  const admin = env.SEED_DEMO_ADMIN_AUTH_ID?.trim() || undefined;
  const collaborator = env.SEED_DEMO_COLAB_AUTH_ID?.trim() || undefined;

  if (!admin && !collaborator) return defaults;
  if (!admin || !collaborator) {
    throw new Error("Configurá las dos variables SEED_DEMO_ADMIN_AUTH_ID y SEED_DEMO_COLAB_AUTH_ID, o ninguna.");
  }

  for (const [name, value] of [["SEED_DEMO_ADMIN_AUTH_ID", admin], ["SEED_DEMO_COLAB_AUTH_ID", collaborator]] as const) {
    if (!CLERK_USER_ID.test(value)) {
      throw new Error(name + " no tiene formato de user_id de Clerk (user_...).");
    }
  }
  if (admin === collaborator) {
    throw new Error("SEED_DEMO_ADMIN_AUTH_ID y SEED_DEMO_COLAB_AUTH_ID deben ser distintos.");
  }

  return { admin, collaborator };
}

export interface ExistingUser {
  id: string;
  accountId: string;
  email: string;
  authProviderId: string;
}

export interface SeedUser {
  id: string;
  email: string;
  authProviderId: string;
}

// existing: usuarios encontrados por id o por email del seed.
// Si el usuario ya existe (mismo id y cuenta), conserva su email y su
// authProviderId: en producción pueden diferir del seed y no se pisan.
export function resolveSeedUser(
  existing: ExistingUser[],
  seedUser: SeedUser,
  accountId: string,
): { email: string; authProviderId: string } {
  if (existing.some((row) => row.id !== seedUser.id || row.accountId !== accountId)) {
    throw new Error("Conflicto de identidad del usuario de prueba " + seedUser.email + ".");
  }

  const current = existing.find((row) => row.id === seedUser.id);
  return {
    email: current?.email ?? seedUser.email,
    authProviderId: current?.authProviderId ?? seedUser.authProviderId,
  };
}
