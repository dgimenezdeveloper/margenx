// src/routes/ingredients.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

import type { AuthenticatedRequest } from '../middlewares/auth';
import type { Response, NextFunction } from 'express';

vi.mock('../middlewares/auth', () => ({
  authMiddleware: (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    req.user = { id: 'user-1', accountId: 'account-1', email: 'a@a.com', role: 'ADMIN' };
    next();
  },
}));

const findManyMock = vi.fn();
const countMock = vi.fn();
const findFirstMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const productIngredientFindManyMock = vi.fn();

vi.mock('../lib/prisma', () => ({
  prisma: {
    ingredient: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      count: (...args: unknown[]) => countMock(...args),
      findFirst: (...args: unknown[]) => findFirstMock(...args),
      create: (...args: unknown[]) => createMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      delete: (...args: unknown[]) => deleteMock(...args),
    },
    productIngredient: {
      findMany: (...args: unknown[]) => productIngredientFindManyMock(...args),
    },
  },
}));

import ingredientsRouter from './ingredients';
import { errorHandler } from '../middlewares/errorHandler';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ingredients', ingredientsRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  findManyMock.mockReset();
  countMock.mockReset();
  findFirstMock.mockReset();
  createMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
  productIngredientFindManyMock.mockReset();
});

describe('GET /api/ingredients - paginación', () => {
  it('devuelve data y meta correctos con page/limit/sortBy/order válidos', async () => {
    findManyMock.mockResolvedValue(new Array(10).fill({ id: '1', name: 'Harina' }));
    countMock.mockResolvedValue(25);

    const res = await request(buildApp()).get(
      '/api/ingredients?page=1&limit=10&sortBy=currentCost&order=desc'
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(10);
    expect(res.body.meta).toEqual({ total: 25, page: 1, limit: 10, totalPages: 3 });
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: 'account-1' },
        orderBy: { currentCost: 'desc' },
        skip: 0,
        take: 10,
      })
    );
  });

  it('page inexistente (999) devuelve array vacío sin error 500', async () => {
    findManyMock.mockResolvedValue([]);
    countMock.mockResolvedValue(25);

    const res = await request(buildApp()).get('/api/ingredients?page=999&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toEqual({ total: 25, page: 999, limit: 10, totalPages: 3 });
  });

  it('usa los defaults cuando no se envían query params', async () => {
    findManyMock.mockResolvedValue([]);
    countMock.mockResolvedValue(0);

    const res = await request(buildApp()).get('/api/ingredients');

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ total: 0, page: 1, limit: 20, totalPages: 0 });
  });
});

describe('GET /api/ingredients/:id', () => {
  it('devuelve 200 con el insumo si pertenece a la cuenta', async () => {
    const ingredient = { id: 'ing-1', accountId: 'account-1', name: 'Harina' };
    findFirstMock.mockResolvedValue(ingredient);

    const res = await request(buildApp()).get('/api/ingredients/ing-1');

    expect(res.status).toBe(200);
    expect(res.body.ingredient).toEqual(ingredient);
    expect(findFirstMock).toHaveBeenCalledWith({ where: { id: 'ing-1', accountId: 'account-1' } });
  });

  it('devuelve 404 si el insumo no existe o es de otra cuenta', async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await request(buildApp()).get('/api/ingredients/ing-ajeno');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Insumo no encontrado.' });
  });
});

describe('POST /api/ingredients', () => {
  it('crea el insumo con datos válidos, asignando accountId desde el token', async () => {
    const created = {
      id: 'ing-1',
      accountId: 'account-1',
      name: 'Harina',
      unit: 'kg',
      currentCost: '100.00',
    };
    createMock.mockResolvedValue(created);

    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina', unit: 'kg', currentCost: '100.00' });

    expect(res.status).toBe(201);
    expect(res.body.ingredient).toEqual(created);
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'Harina', unit: 'kg', accountId: 'account-1' }),
    });
  });

  it('devuelve 400 si falta el name', async () => {
    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ unit: 'kg', currentCost: '10' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('devuelve 400 si unit no es uno de los valores permitidos', async () => {
    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina', unit: 'toneladas', currentCost: '10' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unit/);
  });

  it('devuelve 400 si currentCost es menor o igual a cero', async () => {
    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina', unit: 'kg', currentCost: '0' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mayor a cero/);
  });

  it('devuelve 400 si currentCost no tiene formato decimal válido', async () => {
    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina', unit: 'kg', currentCost: 'no-es-un-numero' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/decimal válido/);
  });

  it('ignora cualquier accountId enviado en el body y usa el del token', async () => {
    createMock.mockResolvedValue({ id: 'ing-1' });

    await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina', unit: 'kg', currentCost: '10', accountId: 'account-ajena' });

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ accountId: 'account-1' }),
    });
  });
});

describe('PUT /api/ingredients/:id', () => {
  it('devuelve 400 si el Content-Type no es application/json', async () => {
    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .set('Content-Type', 'text/plain')
      .send('esto no es json');

    expect(res.status).toBe(400);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it('devuelve 404 si el insumo no pertenece a la cuenta (antes de validar el payload)', async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await request(buildApp())
      .put('/api/ingredients/ing-ajeno')
      .send({ name: 'Harina', unit: 'kg', currentCost: '10' });

    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('devuelve 400 si el payload es inválido, sin llegar a actualizar', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1' });

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: '', unit: 'kg', currentCost: '10' });

    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('actualiza el insumo cuando pertenece a la cuenta y el payload es válido', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1' });
    const updated = { id: 'ing-1', name: 'Harina 000', unit: 'kg', currentCost: '120.00' };
    updateMock.mockResolvedValue(updated);

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '120.00' });

    expect(res.status).toBe(200);
    expect(res.body.ingredient).toEqual(updated);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'ing-1' },
      data: expect.objectContaining({ name: 'Harina 000' }),
    });
  });
});

describe('DELETE /api/ingredients/:id', () => {
  it('devuelve 404 si el insumo no pertenece a la cuenta', async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await request(buildApp()).delete('/api/ingredients/ing-ajeno');

    expect(res.status).toBe(404);
    expect(productIngredientFindManyMock).not.toHaveBeenCalled();
  });

  it('devuelve 409 con los productos afectados si el insumo está en uso', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1' });
    productIngredientFindManyMock.mockResolvedValue([
      { product: { id: 'p1', name: 'Pan' } },
      { product: { id: 'p2', name: 'Facturas' } },
    ]);

    const res = await request(buildApp()).delete('/api/ingredients/ing-1');

    expect(res.status).toBe(409);
    expect(res.body.productsAffected).toEqual([
      { id: 'p1', name: 'Pan' },
      { id: 'p2', name: 'Facturas' },
    ]);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('elimina el insumo si no está en uso en ninguna receta', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1' });
    productIngredientFindManyMock.mockResolvedValue([]);
    deleteMock.mockResolvedValue({ id: 'ing-1' });

    const res = await request(buildApp()).delete('/api/ingredients/ing-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Insumo eliminado correctamente.' });
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: 'ing-1' } });
  });
});