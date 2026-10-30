import { describe, expect, it } from 'vitest';
import { hasIdentityConflict, resolveDemoAuthProviderIds, resolveSeedUser } from './seed-identity';

const DEV_IDS = { admin: 'user_3LHZsMObG8rtQEjZnIR9hB83047', collaborator: 'user_3LHa1sLQjQk7uUtluUfEII9pbFR' };

describe('resolveDemoAuthProviderIds', () => {
  it('usa los IDs por defecto (Clerk de desarrollo) si no hay variables', () => {
    expect(resolveDemoAuthProviderIds({}, DEV_IDS)).toEqual(DEV_IDS);
  });

  it('usa los IDs del Clerk de producción cuando vienen las dos variables', () => {
    const env = { SEED_DEMO_ADMIN_AUTH_ID: 'user_prodAdmin123', SEED_DEMO_COLAB_AUTH_ID: 'user_prodColab456' };
    expect(resolveDemoAuthProviderIds(env, DEV_IDS)).toEqual({ admin: 'user_prodAdmin123', collaborator: 'user_prodColab456' });
  });

  it('ignora espacios alrededor del valor', () => {
    const env = { SEED_DEMO_ADMIN_AUTH_ID: ' user_a1 ', SEED_DEMO_COLAB_AUTH_ID: 'user_b2\n' };
    expect(resolveDemoAuthProviderIds(env, DEV_IDS)).toEqual({ admin: 'user_a1', collaborator: 'user_b2' });
  });

  it('rechaza que venga una sola variable, para no mezclar instancias de Clerk', () => {
    expect(() => resolveDemoAuthProviderIds({ SEED_DEMO_ADMIN_AUTH_ID: 'user_a1' }, DEV_IDS)).toThrow(/las dos/);
    expect(() => resolveDemoAuthProviderIds({ SEED_DEMO_COLAB_AUTH_ID: 'user_b2' }, DEV_IDS)).toThrow(/las dos/);
  });

  it('rechaza un valor que no tiene formato de user_id de Clerk', () => {
    const env = { SEED_DEMO_ADMIN_AUTH_ID: 'demo-admin@margenx.tech', SEED_DEMO_COLAB_AUTH_ID: 'user_b2' };
    expect(() => resolveDemoAuthProviderIds(env, DEV_IDS)).toThrow(/SEED_DEMO_ADMIN_AUTH_ID/);
  });

  it('rechaza el mismo ID para administrador y colaborador', () => {
    const env = { SEED_DEMO_ADMIN_AUTH_ID: 'user_a1', SEED_DEMO_COLAB_AUTH_ID: 'user_a1' };
    expect(() => resolveDemoAuthProviderIds(env, DEV_IDS)).toThrow(/distintos/);
  });
});

describe('resolveSeedUser', () => {
  const accountId = '30a00000-0000-4000-8000-000000000001';
  const seedUser = {
    id: '30d00001-0000-4000-8000-000000000001',
    email: 'admin.panaderia@seed.example.test',
    authProviderId: 'user_seedAdmin',
  };

  it('crea con los datos del seed si el usuario no existe', () => {
    expect(resolveSeedUser([], seedUser, accountId)).toEqual({
      email: 'admin.panaderia@seed.example.test',
      authProviderId: 'user_seedAdmin',
    });
  });

  it('conserva email y authProviderId del usuario existente con el mismo ID (cuenta resembrada en producción)', () => {
    const existing = [{ id: seedUser.id, accountId, email: 'admin.panaderia@hotmail.com', authProviderId: 'user_prodAdmin' }];
    expect(resolveSeedUser(existing, seedUser, accountId)).toEqual({
      email: 'admin.panaderia@hotmail.com',
      authProviderId: 'user_prodAdmin',
    });
  });

  it('falla si el mismo ID pertenece a otra cuenta', () => {
    const existing = [{ id: seedUser.id, accountId: 'otra-cuenta', email: seedUser.email, authProviderId: 'user_x' }];
    expect(() => resolveSeedUser(existing, seedUser, accountId)).toThrow(/Conflicto de identidad/);
  });

  it('falla si el email del seed ya lo usa otro usuario', () => {
    const existing = [{ id: 'otro-id', accountId, email: seedUser.email, authProviderId: 'user_x' }];
    expect(() => resolveSeedUser(existing, seedUser, accountId)).toThrow(/Conflicto de identidad/);
  });
});

describe('hasIdentityConflict', () => {
  const accountId = '30a00000-0000-4000-8000-000000000001';
  const id = '30c00001-0000-4000-8000-000000000002';

  it('no hay conflicto si no existe ningún registro', () => {
    expect(hasIdentityConflict([], id, accountId)).toBe(false);
  });

  it('no hay conflicto si el mismo registro fue renombrado: el seed restaura el nombre', () => {
    expect(hasIdentityConflict([{ id, accountId }], id, accountId)).toBe(false);
  });

  it('hay conflicto si otro registro de la cuenta ya usa el nombre', () => {
    expect(hasIdentityConflict([{ id: 'otro-id', accountId }], id, accountId)).toBe(true);
  });

  it('hay conflicto si el ID pertenece a otra cuenta', () => {
    expect(hasIdentityConflict([{ id, accountId: 'otra-cuenta' }], id, accountId)).toBe(true);
  });
});
