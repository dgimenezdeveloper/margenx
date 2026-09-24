// src/routes/ingredients.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Prisma } from '@prisma/client';

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
const productFindUniqueMock = vi.fn();
const productUpdateMock = vi.fn();

// $transaction real de Prisma recibe un callback (tx) => {...} y lo ejecuta
// pasándole un cliente con los mismos modelos. Acá reutilizamos los mocks
// de arriba como si fueran ese `tx`, para no duplicar mocks por separado.
const transactionMock = vi.fn(async (callback: (tx: unknown) => unknown) => {
  return callback({
    ingredient: { update: updateMock },
    productIngredient: { findMany: productIngredientFindManyMock },
    product: { findUnique: productFindUniqueMock, update: productUpdateMock },
  });
});

vi.mock('../lib/prisma', () => ({
  prisma: {
    $transaction: (callback: (tx: unknown) => unknown) => transactionMock(callback),
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
    product: {
      findUnique: (...args: unknown[]) => productFindUniqueMock(...args),
      update: (...args: unknown[]) => productUpdateMock(...args),
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
  productFindUniqueMock.mockReset();
  productUpdateMock.mockReset();
  transactionMock.mockClear();
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

  it('actualiza el insumo cuando pertenece a la cuenta y el payload es válido (sin productos afectados)', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1' });
    const updated = { id: 'ing-1', name: 'Harina 000', unit: 'kg', currentCost: '120.00' };
    updateMock.mockResolvedValue(updated);
    // El insumo no está en la receta de ningún producto → no hay cascada que recalcular.
    productIngredientFindManyMock.mockResolvedValue([]);

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '120.00' });

    expect(res.status).toBe(200);
    expect(res.body.ingredient).toEqual(updated);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'ing-1' },
      data: expect.objectContaining({ name: 'Harina 000' }),
    });
    expect(productFindUniqueMock).not.toHaveBeenCalled();
    expect(productUpdateMock).not.toHaveBeenCalled();
  });

  it('recalcula cost/marginAmount/marginPercent de cada producto afectado por el nuevo costo del insumo', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1' });
    updateMock.mockResolvedValue({ id: 'ing-1', name: 'Harina', unit: 'kg', currentCost: '150.00' });

    // El insumo aparece en la receta de dos productos distintos.
    productIngredientFindManyMock.mockResolvedValue([
      { productId: 'prod-1' },
      { productId: 'prod-2' },
    ]);

    productFindUniqueMock.mockImplementation(({ where }: { where: { id: string } }) => {
      const base = {
        salePrice: new Prisma.Decimal('200.00'),
        ingredients: [
          { quantity: new Prisma.Decimal('2'), ingredient: { currentCost: new Prisma.Decimal('150.00') } },
        ],
      };
      return Promise.resolve(where.id === 'prod-1' ? { id: 'prod-1', ...base } : { id: 'prod-2', ...base });
    });
    productUpdateMock.mockResolvedValue({});

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina', unit: 'kg', currentCost: '150.00' });

    expect(res.status).toBe(200);
    // cost = 2 * 150 = 300.00 ; margin = 200 - 300 = -100.00 ; marginPercent = (200-300)/200*100 = -50.00
    expect(productUpdateMock).toHaveBeenCalledTimes(2);
    expect(productUpdateMock).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: {
        cost: expect.objectContaining({ d: expect.anything() }), // Prisma.Decimal
        marginAmount: expect.anything(),
        marginPercent: expect.anything(),
      },
    });
    // Verifica los valores calculados en la primera llamada a productUpdateMock
        const firstCall = productUpdateMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    const firstCallArgs = firstCall![0] as {
      data: { cost: Prisma.Decimal; marginAmount: Prisma.Decimal; marginPercent: Prisma.Decimal };
    };
    expect(firstCallArgs.data.cost.toString()).toBe('300');
    expect(firstCallArgs.data.marginAmount.toString()).toBe('-100');
    expect(firstCallArgs.data.marginPercent.toString()).toBe('-50');
  });

  it('no duplica el recálculo si un producto tiene el insumo repetido en la lista de afectados', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1' });
    updateMock.mockResolvedValue({ id: 'ing-1' });

    // Caso defensivo: mismo productId dos veces (no debería pasar con la FK real,
    // pero el código dedupea con un Set — este test documenta ese comportamiento).
    productIngredientFindManyMock.mockResolvedValue([
      { productId: 'prod-1' },
      { productId: 'prod-1' },
    ]);

    productFindUniqueMock.mockResolvedValue({
      id: 'prod-1',
      salePrice: new Prisma.Decimal('100.00'),
      ingredients: [],
    });
    productUpdateMock.mockResolvedValue({});

    await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina', unit: 'kg', currentCost: '10' });

    expect(productUpdateMock).toHaveBeenCalledTimes(1);
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