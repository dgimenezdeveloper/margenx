// src/routes/products.test.ts
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

const productFindManyMock = vi.fn();
const productCountMock = vi.fn();
const productFindFirstMock = vi.fn();
const productDeleteManyMock = vi.fn();

const txIngredientFindManyMock = vi.fn();
const txProductCreateMock = vi.fn();
const txProductFindFirstMock = vi.fn();
const txProductUpdateMock = vi.fn();
const txProductIngredientDeleteManyMock = vi.fn();

vi.mock('../lib/prisma', () => ({
  prisma: {
    product: {
      findMany: (...args: unknown[]) => productFindManyMock(...args),
      count: (...args: unknown[]) => productCountMock(...args),
      findFirst: (...args: unknown[]) => productFindFirstMock(...args),
      deleteMany: (...args: unknown[]) => productDeleteManyMock(...args),
    },
    $transaction: async (fn: any) => {
      const tx = {
        ingredient: {
          findMany: (...args: unknown[]) => txIngredientFindManyMock(...args),
        },
        product: {
          create: (...args: unknown[]) => txProductCreateMock(...args),
          findFirst: (...args: unknown[]) => txProductFindFirstMock(...args),
          update: (...args: unknown[]) => txProductUpdateMock(...args),
        },
        productIngredient: {
          deleteMany: (...args: unknown[]) => txProductIngredientDeleteManyMock(...args),
        },
      };
      return fn(tx);
    },
  },
}));

import productsRouter from './products';
import { errorHandler } from '../middlewares/errorHandler';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  productFindManyMock.mockReset();
  productCountMock.mockReset();
  productFindFirstMock.mockReset();
  productDeleteManyMock.mockReset();
  txIngredientFindManyMock.mockReset();
  txProductCreateMock.mockReset();
  txProductFindFirstMock.mockReset();
  txProductUpdateMock.mockReset();
  txProductIngredientDeleteManyMock.mockReset();
});

describe('GET /api/products - paginación', () => {
  it('devuelve data y meta correctos con page/limit/sortBy/order válidos', async () => {
    productFindManyMock.mockResolvedValue(new Array(2).fill({ id: 'p1', name: 'Prod' }));
    productCountMock.mockResolvedValue(5);

    const res = await request(buildApp()).get('/api/products?page=1&limit=2&sortBy=name&order=desc');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toEqual({ total: 5, page: 1, limit: 2, totalPages: 3 });
    expect(productFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: 'account-1' },
        orderBy: { name: 'desc' },
        skip: 0,
        take: 2,
      })
    );
  });
});

describe('POST /api/products', () => {
  it('crea un producto calculando costo y márgenes cuando hay receta', async () => {
    txIngredientFindManyMock.mockResolvedValue([
      { id: 'ing-1', currentCost: new Prisma.Decimal('10') },
    ]);
    txProductCreateMock.mockResolvedValue({ id: 'p1', name: 'Prod', cost: '20.00' });

    const payload = {
      name: 'Prod',
      salePrice: '30.00',
      minMarginPercent: '10',
      ingredients: [{ ingredientId: 'ing-1', quantity: '2' }],
    };

    const res = await request(buildApp()).post('/api/products').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.product).toEqual({ id: 'p1', name: 'Prod', cost: '20.00' });
    expect(txIngredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { accountId: 'account-1', id: { in: ['ing-1'] } } })
    );
  });
});

describe('GET /api/products/:id', () => {
  it('devuelve 200 con el producto si pertenece a la cuenta', async () => {
    const product = { id: 'p1', accountId: 'account-1', name: 'Prod' };
    productFindFirstMock.mockResolvedValue(product);

    const res = await request(buildApp()).get('/api/products/p1');

    expect(res.status).toBe(200);
    expect(res.body.product).toEqual(product);
    expect(productFindFirstMock).toHaveBeenCalledWith({ where: { id: 'p1', accountId: 'account-1' }, include: { ingredients: { include: { ingredient: true } } } });
  });
});

describe('DELETE /api/products/:id', () => {
  it('elimina el producto si pertenece a la cuenta', async () => {
    productDeleteManyMock.mockResolvedValue({ count: 1 });

    const res = await request(buildApp()).delete('/api/products/p1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(productDeleteManyMock).toHaveBeenCalledWith({ where: { id: 'p1', accountId: 'account-1' } });
  });
});
