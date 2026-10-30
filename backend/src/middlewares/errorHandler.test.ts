// src/middlewares/errorHandler.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import helmet from 'helmet';
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

  it('maneja errores genéricos como 500 (Catch-all)', () => {
    // 1. Forzamos el entorno a producción para este caso específico
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    // 2. Inicializamos 'res' usando la función auxiliar que ya tienes
    const res = buildRes();
    
    const genericErr = new Error('Database connection lost');
    
    // 3. Ejecutamos el middleware
    errorHandler(genericErr, req, res, next);
    
    // 4. Verificamos
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor.' });
    
    // 5. Restauramos el entorno
    process.env.NODE_ENV = originalEnv;
  });

  it('mapea P2002 de Prisma a 409 para asociación duplicada (Líneas 66-69)', () => {
    const res = buildRes();
    const err = new Prisma.PrismaClientKnownRequestError('Unique violation', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['supplierId', 'ingredientId'] },
    });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Ya existe una asociación de este insumo con el proveedor.',
    });
  });

  it('mapea P2003 de Prisma a 409 (Línea 81)', () => {
    const res = buildRes();
    const err = new Prisma.PrismaClientKnownRequestError('FK violation', {
      code: 'P2003',
      clientVersion: '6.19.3',
    });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'La operación viola una relación existente con otro recurso.',
    });
  });

  it('mapea P2020 de Prisma a 400 (Línea 95)', () => {
    const res = buildRes();
    const err = new Prisma.PrismaClientKnownRequestError('Overflow', {
      code: 'P2020',
      clientVersion: '6.19.3',
    });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Uno de los valores numéricos excede la capacidad máxima admitida.',
    });
  });
  
  it('responde 413 con código estable cuando el cuerpo supera el límite permitido', () => {
    const res = buildRes();
    const err = Object.assign(new Error('request entity too large'), {
      type: 'entity.too.large',
      status: 413,
      statusCode: 413,
      expose: true,
    });

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({
      code: 'PAYLOAD_TOO_LARGE',
      error: 'La lista es demasiado grande. Dividila en varios lotes más pequeños.',
    });
  });

  it('incluye cabeceras de seguridad por defecto de Helmet', async () => {
    const app = express();
    app.use(helmet());
    app.get('/health', (_req, res) => {
      res.json({ ok: true });
    });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-dns-prefetch-control']).toBe('off');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('responde 413 en otra ruta cuando el cuerpo supera el límite global', async () => {
    const app = express();
    app.use(express.json({ limit: '256kb' }));
    app.post('/api/other', (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);

    const response = await request(app)
      .post('/api/other')
      .send({ payload: 'x'.repeat(1_000_000) });

    expect(response.status).toBe(413);
    expect(response.body).toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      error: expect.stringContaining('demasiado grande'),
    });
    expect(response.status).not.toBe(500);
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

  it('mapea P2002 de Prisma a 409 para Supplier con nombre duplicado', () => {
    const res = buildRes();
    const err = new Prisma.PrismaClientKnownRequestError('Unique violation', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['accountId', 'name'], modelName: 'Supplier' },
    });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Ya existe un proveedor con ese nombre.',
    });
  });

  it('mapea P2002 de Prisma a 409 para Product con nombre duplicado', () => {
    const res = buildRes();
    const err = new Prisma.PrismaClientKnownRequestError('Unique violation', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['accountId', 'name'], modelName: 'Product' },
    });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Ya existe un producto con ese nombre.',
    });
  });

  it('mapea P2002 de Prisma a 409 para índices funcionales lower_name_key', () => {
    const res = buildRes();
    const err = new Prisma.PrismaClientKnownRequestError('Unique violation', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['Ingredient_accountId_lower_name_key'], modelName: 'Ingredient' },
    });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Ya existe un insumo con ese nombre.',
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

  it('mapea P2020 de Prisma a 400 cuando hay overflow numérico', () => {
    const res = buildRes();
    const err = new Prisma.PrismaClientKnownRequestError('numeric field overflow', {
      code: 'P2020',
      clientVersion: '6.19.3',
    });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Uno de los valores numéricos excede la capacidad máxima admitida.',
    });
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