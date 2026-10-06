import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Prisma } from '@prisma/client';

import type { AuthenticatedRequest } from '../middlewares/auth';
import type { Response, NextFunction } from 'express';

const authMiddlewareMock = vi.fn((req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const role = (req.headers['x-role'] as string | undefined) === 'COLLABORATOR' ? 'COLLABORATOR' : 'ADMIN';
  req.user = { id: 'user-1', accountId: 'account-1', email: 'a@a.com', role };
  next();
});

vi.mock('../middlewares/auth', () => ({
  authMiddleware: (...args: Parameters<typeof authMiddlewareMock>) => authMiddlewareMock(...args),
}));

const ingredientCountMock = vi.fn();
const productFindManyMock = vi.fn();
const productAggregateMock = vi.fn();
const priceHistoryGroupByMock = vi.fn();

vi.mock('../lib/prisma', () => ({
  prisma: {
    ingredient: { count: (...args: unknown[]) => ingredientCountMock(...args) },
    product: {
      findMany: (...args: unknown[]) => productFindManyMock(...args),
      aggregate: (...args: unknown[]) => productAggregateMock(...args),
    },
    priceHistory: { groupBy: (...args: unknown[]) => priceHistoryGroupByMock(...args) },
  },
}));

import dashboardRouter from './dashboard';
import { errorHandler } from '../middlewares/errorHandler';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/dashboard', dashboardRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  ingredientCountMock.mockReset();
  productFindManyMock.mockReset();
  productAggregateMock.mockReset();
  priceHistoryGroupByMock.mockReset();
});

describe('GET /api/dashboard/metrics', () => {
  it('devuelve métricas consolidadas para la cuenta del administrador', async () => {
    ingredientCountMock.mockResolvedValue(10);
    productFindManyMock.mockResolvedValue([
      { marginPercent: new Prisma.Decimal('15.00'), minMarginPercent: new Prisma.Decimal('20.00') },
      { marginPercent: new Prisma.Decimal('25.00'), minMarginPercent: new Prisma.Decimal('20.00') },
      { marginPercent: new Prisma.Decimal('18.00'), minMarginPercent: new Prisma.Decimal('20.00') },
      { marginPercent: new Prisma.Decimal('30.00'), minMarginPercent: new Prisma.Decimal('20.00') },
    ]);
    productAggregateMock.mockResolvedValue({ _avg: { marginPercent: new Prisma.Decimal('22.50') } });
    priceHistoryGroupByMock.mockResolvedValue([
      { ingredientId: 'ing-1' },
      { ingredientId: 'ing-2' },
      { ingredientId: 'ing-1' },
    ]);

    const res = await request(buildApp()).get('/api/dashboard/metrics');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      activeIngredientsCount: 10,
      criticalProductsCount: 2,
      healthyProductsCount: 2,
      averageMarginPercent: 22.5,
      recentCostVariationsCount: 2,
    });
    expect(productAggregateMock).toHaveBeenCalledWith({
      where: { accountId: 'account-1' },
      _avg: { marginPercent: true },
    });
    expect(priceHistoryGroupByMock).toHaveBeenCalledWith({
      by: ['ingredientId'],
      where: {
        ingredient: { accountId: 'account-1' },
        changedAt: { gte: expect.any(Date) },
      },
    });
  });

  it('devuelve 403 si el usuario no es ADMIN', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/dashboard', dashboardRouter);
    app.use(errorHandler);

    const res = await request(app)
      .get('/api/dashboard/metrics')
      .set('x-role', 'COLLABORATOR');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');
  });
});
