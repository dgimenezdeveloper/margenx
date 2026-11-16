import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth';
import { AppError, errorHandler } from '../middlewares/errorHandler';

const authState = vi.hoisted(() => ({
  authenticated: true,
  role: 'ADMIN' as 'ADMIN' | 'COLLABORATOR',
  accountId: 'account-1',
}));

vi.mock('../middlewares/auth', () => ({
  authMiddleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!authState.authenticated) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }
    req.user = {
      id: 'user-1',
      accountId: authState.accountId,
      email: 'admin@panaderia.example',
      role: authState.role,
    };
    next();
  },
}));

const getPurchasingSuggestionsMock = vi.fn();
const previewPurchasingOrderMock = vi.fn();

vi.mock('../services/purchasingService', () => ({
  getPurchasingSuggestions: (...args: unknown[]) => getPurchasingSuggestionsMock(...args),
  previewPurchasingOrder: (...args: unknown[]) => previewPurchasingOrderMock(...args),
}));

import purchasingRouter from './purchasing';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/purchasing', purchasingRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  authState.authenticated = true;
  authState.role = 'ADMIN';
  authState.accountId = 'account-1';
  getPurchasingSuggestionsMock.mockReset();
  previewPurchasingOrderMock.mockReset();
});

describe('GET /api/purchasing/suggestions', () => {
  it('devuelve 401 si no está autenticado', async () => {
    authState.authenticated = false;

    const res = await request(buildApp()).get('/api/purchasing/suggestions');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No autorizado');
    expect(getPurchasingSuggestionsMock).not.toHaveBeenCalled();
  });

  it('Gherkin "Seguridad": devuelve 403 si el usuario es COLLABORATOR', async () => {
    authState.role = 'COLLABORATOR';

    const res = await request(buildApp()).get('/api/purchasing/suggestions');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');
    expect(getPurchasingSuggestionsMock).not.toHaveBeenCalled();
  });

  it('devuelve 200 con las sugerencias calculadas para el accountId del token', async () => {
    const mockPayload = {
      summary: {
        withSavingsCount: 1,
        alreadyBestPriceCount: 0,
        singleSupplierCount: 0,
        withoutEligibleSupplierCount: 0,
        withoutActiveDefaultCount: 0,
        quarantinedExcludedCount: 0,
      },
      byIngredient: [],
      bySupplier: [],
      alreadyBestPrice: [],
      singleSupplier: [],
      quarantinedExcluded: [],
    };
    getPurchasingSuggestionsMock.mockResolvedValue(mockPayload);

    const res = await request(buildApp()).get('/api/purchasing/suggestions');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockPayload);
    expect(getPurchasingSuggestionsMock).toHaveBeenCalledWith('account-1');
  });
});

describe('POST /api/purchasing/order-preview', () => {
  it('devuelve 401 si no está autenticado', async () => {
    authState.authenticated = false;

    const res = await request(buildApp())
      .post('/api/purchasing/order-preview')
      .send({ items: [{ supplierIngredientId: 'si-1', packages: 2 }] });

    expect(res.status).toBe(401);
  });

  it('Gherkin "Seguridad": devuelve 403 si el usuario es COLLABORATOR', async () => {
    authState.role = 'COLLABORATOR';

    const res = await request(buildApp())
      .post('/api/purchasing/order-preview')
      .send({ items: [{ supplierIngredientId: 'si-1', packages: 2 }] });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');
    expect(previewPurchasingOrderMock).not.toHaveBeenCalled();
  });

  it('Gherkin "Seguridad": devuelve 404 si se solicita una presentación ajena o inexistente', async () => {
    previewPurchasingOrderMock.mockRejectedValue(
      new AppError('Una o más presentaciones solicitadas no existen.', 404)
    );

    const res = await request(buildApp())
      .post('/api/purchasing/order-preview')
      .send({ items: [{ supplierIngredientId: 'si-otra-cuenta', packages: 1 }] });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Una o más presentaciones solicitadas no existen.');
    expect(previewPurchasingOrderMock).toHaveBeenCalledWith('account-1', [
      { supplierIngredientId: 'si-otra-cuenta', packages: 1 },
    ]);
  });

  it('devuelve 200 con el preview agrupado cuando el payload es válido', async () => {
    const preview = {
      groups: [],
      total: '94254.70',
      totalSavings: '1000.00',
      totalPackages: 3,
      itemsCount: 2,
    };
    previewPurchasingOrderMock.mockResolvedValue(preview);

    const res = await request(buildApp())
      .post('/api/purchasing/order-preview')
      .send({
        items: [
          { supplierIngredientId: '  si-1  ', packages: 2 },
          { supplierIngredientId: 'si-2', packages: 1 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(preview);
    expect(previewPurchasingOrderMock).toHaveBeenCalledWith('account-1', [
      { supplierIngredientId: 'si-1', packages: 2 },
      { supplierIngredientId: 'si-2', packages: 1 },
    ]);
  });

  it.each([
    ['sin body', undefined],
    ['items vacío', { items: [] }],
    ['packages en cero', { items: [{ supplierIngredientId: 'si-1', packages: 0 }] }],
    ['packages negativo', { items: [{ supplierIngredientId: 'si-1', packages: -1 }] }],
    ['packages decimal', { items: [{ supplierIngredientId: 'si-1', packages: 1.5 }] }],
    ['packages string', { items: [{ supplierIngredientId: 'si-1', packages: '2' }] }],
    ['supplierIngredientId vacío', { items: [{ supplierIngredientId: '   ', packages: 1 }] }],
  ])('devuelve 400 ante payload inválido (%s)', async (_caso, payload) => {
    const req = request(buildApp()).post('/api/purchasing/order-preview');
    const res = payload === undefined ? await req : await req.send(payload);

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
    expect(previewPurchasingOrderMock).not.toHaveBeenCalled();
  });

  it('rechaza con 400 cuando items supera el tope de 500 elementos', async () => {
    const items = Array.from({ length: 501 }, (_, i) => ({
      supplierIngredientId: `si-${i + 1}`,
      packages: 1,
    }));

    const res = await request(buildApp())
      .post('/api/purchasing/order-preview')
      .send({ items });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/500/);
    expect(previewPurchasingOrderMock).not.toHaveBeenCalled();
  });

  it('rechaza con 400 cuando packages supera el tope de 100.000 bultos', async () => {
    const res = await request(buildApp())
      .post('/api/purchasing/order-preview')
      .send({ items: [{ supplierIngredientId: 'si-1', packages: 100001 }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/100\.000/);
    expect(previewPurchasingOrderMock).not.toHaveBeenCalled();
  });

  it('devuelve 422 cuando el servicio rechaza una presentación en cuarentena o de proveedor inactivo', async () => {
    previewPurchasingOrderMock.mockRejectedValue(
      new AppError(
        'La presentación de "Harina 000" está en cuarentena y debe resolverse antes de pedirla.',
        422
      )
    );

    const res = await request(buildApp())
      .post('/api/purchasing/order-preview')
      .send({ items: [{ supplierIngredientId: 'si-quar', packages: 1 }] });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/cuarentena/i);
  });
});
