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
const priceHistoryGroupByMock = vi.fn();

vi.mock('../lib/prisma', () => ({
  prisma: {
    ingredient: { count: (...args: unknown[]) => ingredientCountMock(...args) },
    product: {
      findMany: (...args: unknown[]) => productFindManyMock(...args),
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
  priceHistoryGroupByMock.mockReset();
});

describe('GET /api/dashboard/metrics', () => {
  it('devuelve métricas consolidadas, buckets del histograma y mediana para la cuenta del administrador', async () => {
    ingredientCountMock.mockResolvedValue(10);
    productFindManyMock.mockResolvedValue([
      {
        marginPercent: new Prisma.Decimal('15.00'),
        minMarginPercent: new Prisma.Decimal('20.00'),
        _count: { ingredients: 1 },
      },
      {
        marginPercent: new Prisma.Decimal('25.00'),
        minMarginPercent: new Prisma.Decimal('20.00'),
        _count: { ingredients: 1 },
      },
      {
        marginPercent: new Prisma.Decimal('18.00'),
        minMarginPercent: new Prisma.Decimal('20.00'),
        _count: { ingredients: 1 },
      },
      {
        marginPercent: new Prisma.Decimal('30.00'),
        minMarginPercent: new Prisma.Decimal('20.00'),
        _count: { ingredients: 1 },
      },
    ]);
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
      averageMarginPercent: 21.5,
      recentCostVariationsCount: 2,
      lossCount: 0,
      riskCount: 2,
      targetCount: 2,
      surplusCount: 0,
      draftCount: 0,
    });
    expect(productFindManyMock).toHaveBeenCalledWith({
      where: { accountId: 'account-1' },
      select: {
        marginPercent: true,
        minMarginPercent: true,
        _count: { select: { ingredients: true } },
      },
    });
    expect(priceHistoryGroupByMock).toHaveBeenCalledWith({
      by: ['ingredientId'],
      where: {
        ingredient: { accountId: 'account-1' },
        changedAt: { gte: expect.any(Date) },
      },
    });
  });

  it('excluye productos sin receta de críticos, saludables y mediana pero los contabiliza en draftCount', async () => {
    ingredientCountMock.mockResolvedValue(10);
    productFindManyMock.mockResolvedValue([
      { marginPercent: new Prisma.Decimal('-5.00'), minMarginPercent: new Prisma.Decimal('20.00'), _count: { ingredients: 1 } },
      { marginPercent: new Prisma.Decimal('15.00'), minMarginPercent: new Prisma.Decimal('20.00'), _count: { ingredients: 1 } },
      { marginPercent: new Prisma.Decimal('35.00'), minMarginPercent: new Prisma.Decimal('20.00'), _count: { ingredients: 1 } },
      { marginPercent: new Prisma.Decimal('72.00'), minMarginPercent: new Prisma.Decimal('20.00'), _count: { ingredients: 1 } },
      { marginPercent: new Prisma.Decimal('0.00'), minMarginPercent: new Prisma.Decimal('20.00'), _count: { ingredients: 0 } },
    ]);
    priceHistoryGroupByMock.mockResolvedValue([{ ingredientId: 'ing-1' }, { ingredientId: 'ing-2' }, { ingredientId: 'ing-1' }]);

    const res = await request(buildApp()).get('/api/dashboard/metrics');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      activeIngredientsCount: 10,
      criticalProductsCount: 2,
      healthyProductsCount: 2,
      averageMarginPercent: 25,
      recentCostVariationsCount: 2,
      lossCount: 1,
      riskCount: 1,
      targetCount: 1,
      surplusCount: 1,
      draftCount: 1,
    });
  });

  it('Gherkin "Buckets completos": con 339 productos (15 borradores), la suma de los cinco buckets es 339', async () => {
    ingredientCountMock.mockResolvedValue(218);
    const lossRows = Array.from({ length: 40 }, () => ({
      marginPercent: new Prisma.Decimal('-12.50'),
      minMarginPercent: new Prisma.Decimal('30.00'),
      _count: { ingredients: 3 },
    }));
    const riskRows = Array.from({ length: 64 }, () => ({
      marginPercent: new Prisma.Decimal('22.00'),
      minMarginPercent: new Prisma.Decimal('30.00'),
      _count: { ingredients: 4 },
    }));
    const targetRows = Array.from({ length: 130 }, () => ({
      marginPercent: new Prisma.Decimal('45.00'),
      minMarginPercent: new Prisma.Decimal('30.00'),
      _count: { ingredients: 4 },
    }));
    const surplusRows = Array.from({ length: 90 }, () => ({
      marginPercent: new Prisma.Decimal('68.00'),
      minMarginPercent: new Prisma.Decimal('30.00'),
      _count: { ingredients: 5 },
    }));
    const draftRows = Array.from({ length: 15 }, () => ({
      marginPercent: new Prisma.Decimal('0.00'),
      minMarginPercent: new Prisma.Decimal('30.00'),
      _count: { ingredients: 0 },
    }));

    productFindManyMock.mockResolvedValue([...lossRows, ...riskRows, ...targetRows, ...surplusRows, ...draftRows]);
    priceHistoryGroupByMock.mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/dashboard/metrics');

    expect(res.status).toBe(200);
    const { lossCount, riskCount, targetCount, surplusCount, draftCount } = res.body;
    expect(lossCount).toBe(40);
    expect(riskCount).toBe(64);
    expect(targetCount).toBe(130);
    expect(surplusCount).toBe(90);
    expect(draftCount).toBe(15);
    expect(lossCount + riskCount + targetCount + surplusCount + draftCount).toBe(339);
    expect(res.body.criticalProductsCount).toBe(104);
    expect(res.body.healthyProductsCount).toBe(220);
    expect(res.body.averageMarginPercent).toBe(45);
  });

  it('Gherkin "Umbral propio": un producto con margen 35% y mínimo 40% cae en riskCount aunque el umbral de cuenta sea 30%', async () => {
    ingredientCountMock.mockResolvedValue(5);
    productFindManyMock.mockResolvedValue([
      {
        marginPercent: new Prisma.Decimal('35.00'),
        minMarginPercent: new Prisma.Decimal('40.00'),
        _count: { ingredients: 2 },
      },
      {
        marginPercent: new Prisma.Decimal('35.00'),
        minMarginPercent: new Prisma.Decimal('30.00'),
        _count: { ingredients: 2 },
      },
    ]);
    priceHistoryGroupByMock.mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/dashboard/metrics');

    expect(res.status).toBe(200);
    expect(res.body.riskCount).toBe(1);
    expect(res.body.targetCount).toBe(1);
    expect(res.body.criticalProductsCount).toBe(1);
    expect(res.body.healthyProductsCount).toBe(1);
  });

  it('Gherkin "Precio extremo": un producto con precio $13 y costo $3.854 (-29546.15%) no domina el margen promedio', async () => {
    ingredientCountMock.mockResolvedValue(8);
    productFindManyMock.mockResolvedValue([
      { marginPercent: new Prisma.Decimal('-29546.15'), minMarginPercent: new Prisma.Decimal('30.00'), _count: { ingredients: 2 } },
      { marginPercent: new Prisma.Decimal('35.00'), minMarginPercent: new Prisma.Decimal('30.00'), _count: { ingredients: 2 } },
      { marginPercent: new Prisma.Decimal('42.00'), minMarginPercent: new Prisma.Decimal('30.00'), _count: { ingredients: 3 } },
      { marginPercent: new Prisma.Decimal('50.00'), minMarginPercent: new Prisma.Decimal('30.00'), _count: { ingredients: 2 } },
      { marginPercent: new Prisma.Decimal('65.00'), minMarginPercent: new Prisma.Decimal('30.00'), _count: { ingredients: 4 } },
    ]);
    priceHistoryGroupByMock.mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/dashboard/metrics');

    expect(res.status).toBe(200);
    expect(res.body.lossCount).toBe(1);
    expect(res.body.targetCount).toBe(3);
    expect(res.body.surplusCount).toBe(1);
    expect(res.body.averageMarginPercent).toBe(42);
  });

  it('maneja catálogo vacío o compuesto únicamente por borradores sin error ni NaN', async () => {
    ingredientCountMock.mockResolvedValue(0);
    productFindManyMock.mockResolvedValue([
      { marginPercent: new Prisma.Decimal('0.00'), minMarginPercent: new Prisma.Decimal('30.00'), _count: { ingredients: 0 } },
      { marginPercent: new Prisma.Decimal('0.00'), minMarginPercent: new Prisma.Decimal('30.00'), _count: { ingredients: 0 } },
    ]);
    priceHistoryGroupByMock.mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/dashboard/metrics');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      activeIngredientsCount: 0,
      criticalProductsCount: 0,
      healthyProductsCount: 0,
      averageMarginPercent: 0,
      recentCostVariationsCount: 0,
      lossCount: 0,
      riskCount: 0,
      targetCount: 0,
      surplusCount: 0,
      draftCount: 2,
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
