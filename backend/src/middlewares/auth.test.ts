// src/middlewares/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response, NextFunction } from 'express';

const verifyTokenMock = vi.fn();
vi.mock('@clerk/backend', () => ({
  verifyToken: (...args: unknown[]) => verifyTokenMock(...args),
}));

const findUniqueMock = vi.fn();
vi.mock('../lib/prisma', () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => findUniqueMock(...args) } },
}));

const provisionInvitedUserMock = vi.fn();
vi.mock('../services/invitedUserProvisioning', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/invitedUserProvisioning')>();
  return {
    AUTH_USER_SELECT: actual.AUTH_USER_SELECT,
    provisionInvitedUser: (...args: unknown[]) => provisionInvitedUserMock(...args),
  };
});

import { authMiddleware, AuthenticatedRequest } from './auth';

function buildReqRes(authHeader?: string) {
  const req = { headers: { authorization: authHeader } } as unknown as AuthenticatedRequest;
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const res = { status } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next, status, json };
}

describe('authMiddleware', () => {
  beforeEach(() => {
    verifyTokenMock.mockReset();
    findUniqueMock.mockReset();
    provisionInvitedUserMock.mockReset();
    provisionInvitedUserMock.mockResolvedValue(null);
  });

  it('devuelve 401 si no hay header Authorization', async () => {
    const { req, res, next, status, json } = buildReqRes(undefined);
    await authMiddleware(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'No autorizado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('devuelve 401 si el header no tiene formato "Bearer <token>"', async () => {
    const { req, res, next, status } = buildReqRes('Token abc123');
    await authMiddleware(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('devuelve 401 si verifyToken lanza (token inválido/expirado)', async () => {
    verifyTokenMock.mockRejectedValue(new Error('invalid token'));
    const { req, res, next, status } = buildReqRes('Bearer bad-token');
    await authMiddleware(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('devuelve 401 si el token es válido, no existe el usuario y no trae una invitación válida', async () => {
    verifyTokenMock.mockResolvedValue({ sub: 'clerk-user-1' });
    findUniqueMock.mockResolvedValue(null);
    const { req, res, next, status, json } = buildReqRes('Bearer good-token');
    await authMiddleware(req, res, next);
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { authProviderId: 'clerk-user-1' },
      select: {
        id: true,
        accountId: true,
        email: true,
        role: true,
        account: {
          select: {
            id: true,
            businessName: true,
            defaultMinMarginPercent: true,
            slug: true,
          },
        },
      },
    });
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'No autorizado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('setea req.user y llama next() si el token y el usuario son válidos', async () => {
    verifyTokenMock.mockResolvedValue({ sub: 'clerk-user-1' });
    const user = {
      id: 'u1',
      accountId: 'a1',
      email: 'x@x.com',
      role: 'ADMIN',
      account: {
        id: 'a1',
        businessName: 'Panadería Central',
        defaultMinMarginPercent: { toString: () => '15.5' },
      },
    };
    findUniqueMock.mockResolvedValue(user);
    const { req, res, next } = buildReqRes('Bearer good-token');
    await authMiddleware(req, res, next);
    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('primer inicio de sesión de un invitado: crea el User y llama next()', async () => {
    verifyTokenMock.mockResolvedValue({ sub: 'user_repositor_quimica' });
    findUniqueMock.mockResolvedValue(null);
    const invited = {
      id: 'u-repositor',
      accountId: 'acc-quimica',
      email: 'colab.quimica@seed.example.test',
      role: 'COLLABORATOR',
      account: { id: 'acc-quimica', businessName: 'Química GyJ', defaultMinMarginPercent: '35.00', slug: 'quimica-gyj' },
    };
    provisionInvitedUserMock.mockResolvedValue(invited);
    const { req, res, next, status } = buildReqRes('Bearer good-token');

    await authMiddleware(req, res, next);

    expect(provisionInvitedUserMock).toHaveBeenCalledWith('user_repositor_quimica');
    expect(req.user).toEqual(invited);
    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });

  it('no busca invitación si el usuario ya existe', async () => {
    verifyTokenMock.mockResolvedValue({ sub: 'clerk-user-1' });
    findUniqueMock.mockResolvedValue({ id: 'u1', accountId: 'a1', email: 'x@x.com', role: 'ADMIN' });
    const { req, res, next } = buildReqRes('Bearer good-token');

    await authMiddleware(req, res, next);

    expect(provisionInvitedUserMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('devuelve 401 si el alta del invitado falla', async () => {
    verifyTokenMock.mockResolvedValue({ sub: 'user_x' });
    findUniqueMock.mockResolvedValue(null);
    provisionInvitedUserMock.mockRejectedValue(new Error('base caída'));
    const { req, res, next, status } = buildReqRes('Bearer good-token');

    await authMiddleware(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
