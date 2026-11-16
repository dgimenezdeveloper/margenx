import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';

const getUserMock = vi.fn();
vi.mock('../lib/clerk', () => ({
  getClerkClient: () => ({ users: { getUser: (...args: unknown[]) => getUserMock(...args) } }),
}));

const accountFindUniqueMock = vi.fn();
const userCreateMock = vi.fn();
const userFindUniqueMock = vi.fn();
vi.mock('../lib/prisma', () => ({
  prisma: {
    account: { findUnique: (...args: unknown[]) => accountFindUniqueMock(...args) },
    user: {
      create: (...args: unknown[]) => userCreateMock(...args),
      findUnique: (...args: unknown[]) => userFindUniqueMock(...args),
    },
  },
}));

import {
  AUTH_USER_SELECT,
  REJECTED_CACHE_MAX_ENTRIES,
  REJECTED_CACHE_TTL_MS,
  parseInvitationMetadata,
  provisionInvitedUser,
  resetRejectedProvisioningCache,
} from './invitedUserProvisioning';

const QUIMICA_ID = '30d00001-0000-4000-8000-000000000002';

function clerkUser(publicMetadata: unknown, email: string | null = 'Colab.Quimica@Seed.Example.Test') {
  return {
    id: 'user_repositor_quimica',
    publicMetadata,
    primaryEmailAddress: email === null ? null : { emailAddress: email },
  };
}

const createdUser = {
  id: 'u-repositor',
  accountId: QUIMICA_ID,
  email: 'colab.quimica@seed.example.test',
  role: 'COLLABORATOR',
  account: { id: QUIMICA_ID, businessName: 'Química GyJ', defaultMinMarginPercent: '35.00', slug: 'quimica-gyj' },
};

describe('parseInvitationMetadata', () => {
  it('acepta una invitación de colaborador con accountId', () => {
    expect(parseInvitationMetadata({ accountId: QUIMICA_ID, role: 'COLLABORATOR' })).toEqual({
      accountId: QUIMICA_ID,
      role: 'COLLABORATOR',
    });
  });

  it.each([
    ['sin metadatos', undefined],
    ['metadatos vacíos', {}],
    ['rol ADMIN (invitar administradores está fuera de alcance)', { accountId: QUIMICA_ID, role: 'ADMIN' }],
    ['sin rol', { accountId: QUIMICA_ID }],
    ['accountId vacío', { accountId: '', role: 'COLLABORATOR' }],
    ['accountId no textual', { accountId: 42, role: 'COLLABORATOR' }],
  ])('rechaza %s', (_caso, metadata) => {
    expect(parseInvitationMetadata(metadata)).toBeNull();
  });
});

describe('provisionInvitedUser', () => {
  beforeEach(() => {
    getUserMock.mockReset();
    accountFindUniqueMock.mockReset();
    userCreateMock.mockReset();
    userFindUniqueMock.mockReset();
    resetRejectedProvisioningCache();
  });

  it('crea el User con la cuenta y el rol de la invitación, nunca desde el cliente', async () => {
    getUserMock.mockResolvedValue(clerkUser({ accountId: QUIMICA_ID, role: 'COLLABORATOR' }));
    accountFindUniqueMock.mockResolvedValue({ isActive: true });
    userCreateMock.mockResolvedValue(createdUser);

    const user = await provisionInvitedUser('user_repositor_quimica');

    expect(user).toEqual(createdUser);
    expect(getUserMock).toHaveBeenCalledWith('user_repositor_quimica');
    expect(accountFindUniqueMock).toHaveBeenCalledWith({ where: { id: QUIMICA_ID }, select: { isActive: true } });
    expect(userCreateMock).toHaveBeenCalledWith({
      data: {
        accountId: QUIMICA_ID,
        email: 'colab.quimica@seed.example.test',
        role: 'COLLABORATOR',
        authProviderId: 'user_repositor_quimica',
      },
      select: AUTH_USER_SELECT,
    });
  });

  it('no crea nada si los metadatos fueron manipulados (rol ADMIN)', async () => {
    getUserMock.mockResolvedValue(clerkUser({ accountId: QUIMICA_ID, role: 'ADMIN' }));

    expect(await provisionInvitedUser('user_x')).toBeNull();
    expect(accountFindUniqueMock).not.toHaveBeenCalled();
    expect(userCreateMock).not.toHaveBeenCalled();
  });

  it('no crea nada si el usuario de Clerk no tiene invitación', async () => {
    getUserMock.mockResolvedValue(clerkUser({}));

    expect(await provisionInvitedUser('user_x')).toBeNull();
    expect(userCreateMock).not.toHaveBeenCalled();
  });

  it('no crea nada si no hay correo principal', async () => {
    getUserMock.mockResolvedValue(clerkUser({ accountId: QUIMICA_ID, role: 'COLLABORATOR' }, null));

    expect(await provisionInvitedUser('user_x')).toBeNull();
    expect(userCreateMock).not.toHaveBeenCalled();
  });

  it('no crea nada si la cuenta de la invitación no existe', async () => {
    getUserMock.mockResolvedValue(clerkUser({ accountId: QUIMICA_ID, role: 'COLLABORATOR' }));
    accountFindUniqueMock.mockResolvedValue(null);

    expect(await provisionInvitedUser('user_x')).toBeNull();
    expect(userCreateMock).not.toHaveBeenCalled();
  });

  it('no crea nada si la cuenta está inactiva', async () => {
    getUserMock.mockResolvedValue(clerkUser({ accountId: QUIMICA_ID, role: 'COLLABORATOR' }));
    accountFindUniqueMock.mockResolvedValue({ isActive: false });

    expect(await provisionInvitedUser('user_x')).toBeNull();
    expect(userCreateMock).not.toHaveBeenCalled();
  });

  it('devuelve null si Clerk no responde', async () => {
    getUserMock.mockRejectedValue(new Error('Clerk no disponible'));

    expect(await provisionInvitedUser('user_x')).toBeNull();
  });

  it('con dos pedidos simultáneos del primer inicio de sesión, devuelve el User que creó el otro', async () => {
    getUserMock.mockResolvedValue(clerkUser({ accountId: QUIMICA_ID, role: 'COLLABORATOR' }));
    accountFindUniqueMock.mockResolvedValue({ isActive: true });
    userCreateMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' })
    );
    userFindUniqueMock.mockResolvedValue(createdUser);

    expect(await provisionInvitedUser('user_repositor_quimica')).toEqual(createdUser);
    expect(userFindUniqueMock).toHaveBeenCalledWith({
      where: { authProviderId: 'user_repositor_quimica' },
      select: AUTH_USER_SELECT,
    });
  });

  it('devuelve null si el correo ya pertenece a otro usuario', async () => {
    getUserMock.mockResolvedValue(clerkUser({ accountId: QUIMICA_ID, role: 'COLLABORATOR' }));
    accountFindUniqueMock.mockResolvedValue({ isActive: true });
    userCreateMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' })
    );
    userFindUniqueMock.mockResolvedValue(null);

    expect(await provisionInvitedUser('user_x')).toBeNull();
  });

  it('propaga los errores de base que no son de unicidad', async () => {
    getUserMock.mockResolvedValue(clerkUser({ accountId: QUIMICA_ID, role: 'COLLABORATOR' }));
    accountFindUniqueMock.mockResolvedValue({ isActive: true });
    userCreateMock.mockRejectedValue(new Error('conexión perdida'));

    await expect(provisionInvitedUser('user_x')).rejects.toThrow('conexión perdida');
  });

  describe('usuarios de Clerk sin invitación válida (ADR-008)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('no vuelve a consultar a Clerk por el mismo usuario hasta que vence el recuerdo', async () => {
      vi.useFakeTimers();
      getUserMock.mockResolvedValue(clerkUser({}));

      expect(await provisionInvitedUser('user_registro_publico')).toBeNull();
      expect(await provisionInvitedUser('user_registro_publico')).toBeNull();
      expect(getUserMock).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(REJECTED_CACHE_TTL_MS + 1);
      expect(await provisionInvitedUser('user_registro_publico')).toBeNull();
      expect(getUserMock).toHaveBeenCalledTimes(2);
    });

    it.each([
      ['metadatos manipulados', () => getUserMock.mockResolvedValue(clerkUser({ accountId: QUIMICA_ID, role: 'ADMIN' }))],
      [
        'cuenta inactiva',
        () => {
          getUserMock.mockResolvedValue(clerkUser({ accountId: QUIMICA_ID, role: 'COLLABORATOR' }));
          accountFindUniqueMock.mockResolvedValue({ isActive: false });
        },
      ],
    ])('también recuerda el rechazo por %s', async (_caso, prepare) => {
      prepare();

      await provisionInvitedUser('user_x');
      await provisionInvitedUser('user_x');
      expect(getUserMock).toHaveBeenCalledTimes(1);
    });

    it('no recuerda los fallos de Clerk: el pedido siguiente vuelve a intentar', async () => {
      getUserMock.mockRejectedValueOnce(new Error('Clerk no disponible'));
      getUserMock.mockResolvedValueOnce(clerkUser({ accountId: QUIMICA_ID, role: 'COLLABORATOR' }));
      accountFindUniqueMock.mockResolvedValue({ isActive: true });
      userCreateMock.mockResolvedValue(createdUser);

      expect(await provisionInvitedUser('user_repositor_quimica')).toBeNull();
      expect(await provisionInvitedUser('user_repositor_quimica')).toEqual(createdUser);
    });

    it('recordar a un usuario no afecta a otro con invitación válida', async () => {
      getUserMock.mockResolvedValueOnce(clerkUser({}));
      await provisionInvitedUser('user_registro_publico');

      getUserMock.mockResolvedValueOnce(clerkUser({ accountId: QUIMICA_ID, role: 'COLLABORATOR' }));
      accountFindUniqueMock.mockResolvedValue({ isActive: true });
      userCreateMock.mockResolvedValue(createdUser);
      expect(await provisionInvitedUser('user_repositor_quimica')).toEqual(createdUser);
    });

    it('tiene un tope de entradas: al llenarse descarta la más vieja', async () => {
      getUserMock.mockResolvedValue(clerkUser({}));
      for (let i = 0; i <= REJECTED_CACHE_MAX_ENTRIES; i += 1) {
        await provisionInvitedUser(`user_${i}`);
      }
      expect(getUserMock).toHaveBeenCalledTimes(REJECTED_CACHE_MAX_ENTRIES + 1);

      await provisionInvitedUser(`user_${REJECTED_CACHE_MAX_ENTRIES}`);
      expect(getUserMock).toHaveBeenCalledTimes(REJECTED_CACHE_MAX_ENTRIES + 1);
      await provisionInvitedUser('user_0');
      expect(getUserMock).toHaveBeenCalledTimes(REJECTED_CACHE_MAX_ENTRIES + 2);
    });
  });
});
