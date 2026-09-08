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

  it('devuelve 401 si el token es válido pero no existe el usuario en la base', async () => {
    verifyTokenMock.mockResolvedValue({ sub: 'clerk-user-1' });
    findUniqueMock.mockResolvedValue(null);
    const { req, res, next, status, json } = buildReqRes('Bearer good-token');
    await authMiddleware(req, res, next);
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { authProviderId: 'clerk-user-1' },
      select: { id: true, accountId: true, email: true, role: true },
    });
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'No autorizado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('setea req.user y llama next() si el token y el usuario son válidos', async () => {
    verifyTokenMock.mockResolvedValue({ sub: 'clerk-user-1' });
    const user = { id: 'u1', accountId: 'a1', email: 'x@x.com', role: 'ADMIN' };
    findUniqueMock.mockResolvedValue(user);
    const { req, res, next } = buildReqRes('Bearer good-token');
    await authMiddleware(req, res, next);
    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalledTimes(1);
  });
});