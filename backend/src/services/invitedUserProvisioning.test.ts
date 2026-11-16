import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  parseInvitationMetadata,
  provisionInvitedUser,
} from './invitedUserProvisioning';

const QUIMICA_ID = '30d00001-0000-4000-8000-000000000002';

function clerkUser(publicMetadata: unknown, email: string | null = 'Repositor.Quimica@Gmail.com') {
  return {
    id: 'user_repositor_quimica',
    publicMetadata,
    primaryEmailAddress: email === null ? null : { emailAddress: email },
  };
}

const createdUser = {
  id: 'u-repositor',
  accountId: QUIMICA_ID,
  email: 'repositor.quimica@gmail.com',
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
        email: 'repositor.quimica@gmail.com',
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
});
