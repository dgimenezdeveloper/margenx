// src/middlewares/errorHandler.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { errorHandler, AppError } from './errorHandler';

import type { Request, Response } from 'express';

function buildRes(): Response {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  // Cast doble justificado: es un test double parcial, no un objeto
  // Response real. "as unknown as X" es intencional (no un escape de any).
  return { status, json } as unknown as Response;
}

describe('errorHandler', () => {
  const req = {} as unknown as Request;
  const next = vi.fn();

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NODE_ENV;
  });

  it('responde 400 ante JSON malformado', () => {
    const res = buildRes();
    const err = Object.assign(new SyntaxError('Unexpected token'), { body: '{' });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'El cuerpo de la solicitud contiene JSON inválido.',
    });
  });

  it('respeta status y mensaje de un AppError', () => {
    const res = buildRes();
    errorHandler(new AppError('Insumo no encontrado.', 404), req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insumo no encontrado.' });
  });

  it('mapea P2025 de Prisma a 404', () => {
    const res = buildRes();
    const err = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: '6.19.3',
    });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Recurso no encontrado.' });
  });

  it('mapea P2002 de Prisma a 409', () => {
    const res = buildRes();
    const err = new Prisma.PrismaClientKnownRequestError('Unique violation', {
      code: 'P2002',
      clientVersion: '6.19.3',
    });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Ya existe un registro con esos datos únicos.',
    });
  });

  it('mapea P2003 de Prisma a 409', () => {
    const res = buildRes();
    const err = new Prisma.PrismaClientKnownRequestError('FK violation', {
      code: 'P2003',
      clientVersion: '6.19.3',
    });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('oculta el detalle del error en producción', () => {
    process.env.NODE_ENV = 'production';
    const res = buildRes();
    errorHandler(new Error('detalle interno sensible'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor.' });
  });

  it('expone el mensaje del error en desarrollo', () => {
    process.env.NODE_ENV = 'development';
    const res = buildRes();
    errorHandler(new Error('detalle interno sensible'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'detalle interno sensible' });
  });
});