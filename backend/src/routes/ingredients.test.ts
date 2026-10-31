// src/routes/ingredients.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

const findManyMock = vi.fn();
const countMock = vi.fn();
const findFirstMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const productIngredientFindManyMock = vi.fn();
const productFindUniqueMock = vi.fn();
const productUpdateMock = vi.fn();
const priceHistoryCreateMock = vi.fn();
const accountFindUniqueMock = vi.fn();

const transactionMock = vi.fn(async (callback: (tx: unknown) => unknown) => {
  return callback({
    ingredient: { update: updateMock },
    productIngredient: { findMany: productIngredientFindManyMock },
    product: { findUnique: productFindUniqueMock, update: productUpdateMock },
    priceHistory: { create: priceHistoryCreateMock },
  });
});

vi.mock('../lib/prisma', () => ({
  prisma: {
    $transaction: (callback: (tx: unknown) => unknown) => transactionMock(callback),
    account: {
      findUnique: (...args: unknown[]) => accountFindUniqueMock(...args),
    },
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
    priceHistory: {
      create: (...args: unknown[]) => priceHistoryCreateMock(...args),
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
  priceHistoryCreateMock.mockReset();
  accountFindUniqueMock.mockReset();
  transactionMock.mockClear();
  authMiddlewareMock.mockClear();

  // Mock predeterminado para resolver los datos de la cuenta en despachos dinámicos
  accountFindUniqueMock.mockResolvedValue({
    id: 'account-1',
    businessName: 'Panadería Central',
    slug: 'panaderia-central',
    users: [{ email: 'admin.panaderia@seed.example.test' }],
  });
});

afterEach(() => {
  delete process.env.N8N_MARGIN_ALERT_WEBHOOK_URL;
  delete process.env.INTERNAL_WEBHOOK_SECRET;
  vi.unstubAllGlobals();
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
  it('devuelve 200 con el insumo incluyendo proveedores asociados si pertenece a la cuenta', async () => {
    const ingredient = {
      id: 'ing-1',
      accountId: 'account-1',
      name: 'Harina',
      suppliers: [
        {
          id: 'si-1',
          packageSize: '50.000',
          packagePrice: '35000.00',
          isDefault: true,
          supplier: { id: 's-1', name: 'Molino Cañuelas' },
        },
      ],
    };
    findFirstMock.mockResolvedValue(ingredient);

    const res = await request(buildApp()).get('/api/ingredients/ing-1');

    expect(res.status).toBe(200);
    expect(res.body.ingredient).toEqual(ingredient);
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: 'ing-1', accountId: 'account-1' },
      include: {
        suppliers: {
          include: {
            supplier: true,
          },
        },
      },
    });
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

  it('devuelve 400 si currentCost es negativo, aunque el formato sea decimal', async () => {
    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina', unit: 'kg', currentCost: '-10.5' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mayor a cero/);
  });

  it('devuelve 400 si currentCost usa notación científica o escala inválida', async () => {
    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina', unit: 'kg', currentCost: '1e-3' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/decimal válido/);

    const res2 = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina', unit: 'kg', currentCost: '742.985' });

    expect(res2.status).toBe(400);
    expect(res2.body.error).toMatch(/decimal válido/);
  });

  it('devuelve 409 si el nombre del insumo ya existe con distinto casing en la misma cuenta', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1', name: 'Harina 000', accountId: 'account-1' });

    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'harina 000', unit: 'kg', currentCost: '10.00' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Ya existe un insumo con ese nombre.');
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { accountId: 'account-1', name: { equals: 'harina 000', mode: 'insensitive' } },
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('crea con 201 un insumo cuyo nombre solo existe en otra cuenta (la búsqueda se limita a la cuenta del token)', async () => {
    // findFirst filtra por accountId del token: el "Harina 000" de otra cuenta no aparece.
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: 'ing-b', name: 'Harina 000', unit: 'kg', currentCost: '10.00', accountId: 'account-1' });

    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '10.00' });

    expect(res.status).toBe(201);
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { accountId: 'account-1', name: { equals: 'Harina 000', mode: 'insensitive' } },
    });
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ accountId: 'account-1', name: 'Harina 000' }),
    });
  });

  it('devuelve 409 si el índice único case-insensitive rechaza un alta concurrente', async () => {
    findFirstMock.mockResolvedValue(null);
    createMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: 'Ingredient_accountId_lower_name_key' },
      })
    );

    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '10.00' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Ya existe un insumo con ese nombre.');
  });

  it('devuelve 400 si currentCost excede el máximo permitido por la base', async () => {
    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina', unit: 'kg', currentCost: 999999999999999 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no puede superar \$99\.999\.999,99/);
    expect(createMock).not.toHaveBeenCalled();
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
    findFirstMock.mockResolvedValue({ id: 'ing-1', name: 'Harina 000', unit: 'kg' });
    const updated = { id: 'ing-1', name: 'Harina 000', unit: 'kg', currentCost: '120.00' };
    updateMock.mockResolvedValue(updated);
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

  it('devuelve 409 si se intenta renombrar un insumo a uno ya existente con distinto casing', async () => {
    findFirstMock
      .mockResolvedValueOnce({ id: 'ing-1', name: 'Levadura', unit: 'kg', currentCost: new Prisma.Decimal('10.00') })
      .mockResolvedValueOnce({ id: 'ing-2', name: 'Harina', unit: 'kg', currentCost: new Prisma.Decimal('12.00') });
    updateMock.mockResolvedValue({ id: 'ing-1', name: 'HARINA', unit: 'kg', currentCost: '10.00' });

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'HARINA', unit: 'kg', currentCost: '10.00' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Ya existe un insumo con ese nombre.');
  });

  it('registra un PriceHistory cuando el costo cambia', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1', name: 'Manteca', unit: 'kg', currentCost: new Prisma.Decimal('8000.00') });
    updateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Manteca',
      unit: 'kg',
      currentCost: new Prisma.Decimal('9500.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([]);
    priceHistoryCreateMock.mockResolvedValue({ id: 'ph-1' });

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Manteca', unit: 'kg', currentCost: '9500.00' });

    expect(res.status).toBe(200);
    expect(priceHistoryCreateMock).toHaveBeenCalledTimes(1);
    expect(priceHistoryCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ingredientId: 'ing-1',
        oldCost: new Prisma.Decimal('8000.00'),
        newCost: new Prisma.Decimal('9500.00'),
      }),
    });
  });

  it('no abre transacción ni crea PriceHistory cuando no hubo cambio real en costo, nombre ni unidad', async () => {
    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('120.00'),
    });

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '120.00' });

    expect(res.status).toBe(200);
    expect(res.body.ingredient).toEqual({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: '120',
    });
    expect(transactionMock).not.toHaveBeenCalled();
    expect(priceHistoryCreateMock).not.toHaveBeenCalled();
    expect(productIngredientFindManyMock).not.toHaveBeenCalled();
  });

  it('solo dispara el evento cuando el producto cruza el umbral mínimo desde un margen aceptable', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    process.env.N8N_MARGIN_ALERT_WEBHOOK_URL = 'https://n8n.example.test/webhook/margins';
    process.env.INTERNAL_WEBHOOK_SECRET = 'test-secret';

    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('8000.00'),
    });
    updateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('9500.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([{ productId: 'prod-1' }]);
    productFindUniqueMock.mockResolvedValue({
      id: 'prod-1',
      name: 'Pan flauta',
      accountId: 'account-1',
      salePrice: new Prisma.Decimal('100.00'),
      minMarginPercent: new Prisma.Decimal('30.00'),
      cost: new Prisma.Decimal('50.00'),
      marginPercent: new Prisma.Decimal('20.00'),
      ingredients: [{ quantity: new Prisma.Decimal('1'), ingredient: { currentCost: new Prisma.Decimal('9500.00') } }],
    });
    productUpdateMock.mockResolvedValue({});

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '9500.00' });

    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('dispara el evento margin.alert.triggered cuando un producto cruza el margen mínimo en la actualización', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
    vi.stubGlobal('fetch', fetchMock);
    process.env.N8N_MARGIN_ALERT_WEBHOOK_URL = 'https://n8n.example.test/webhook/margins';
    process.env.INTERNAL_WEBHOOK_SECRET = 'test-secret';

    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('8000.00'),
    });
    updateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('9500.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([{ productId: 'prod-1' }]);
    productFindUniqueMock.mockResolvedValue({
      id: 'prod-1',
      name: 'Pan flauta',
      accountId: 'account-1',
      salePrice: new Prisma.Decimal('100.00'),
      minMarginPercent: new Prisma.Decimal('30.00'),
      cost: new Prisma.Decimal('50.00'),
      marginPercent: new Prisma.Decimal('50.00'),
      ingredients: [{ quantity: new Prisma.Decimal('1'), ingredient: { currentCost: new Prisma.Decimal('9500.00') } }],
    });
    productUpdateMock.mockResolvedValue({});

    accountFindUniqueMock.mockResolvedValue({
      id: 'account-1',
      businessName: 'Panadería Central',
      slug: 'panaderia-central',
      users: [{ email: 'admin.panaderia@seed.example.test' }],
    });

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '9500.00' });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://n8n.example.test/webhook/margins',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'User-Agent': 'MargenX-Backend-Dispatcher/1.0',
          'x-margenx-webhook-secret': 'test-secret',
        }),
      })
    );
    const requestInit = fetchMock.mock.calls[0]?.[1] as { body?: string } | undefined;
    expect(requestInit?.body).toBeDefined();
    const body = JSON.parse(requestInit!.body!);
    expect(body).toMatchObject({
      accountId: 'account-1',
      accountSlug: 'panaderia-central',
      tradeName: 'Panadería Central',
      ownerEmail: 'admin.panaderia@seed.example.test',
      ingredient: {
        id: 'ing-1',
        name: 'Harina 000',
      },
      affectedProductsCount: 1,
      criticalProducts: [
        expect.objectContaining({
          productId: 'prod-1',
          productName: 'Pan flauta',
          previousCost: '50.00',
          newCost: '9500.00',
          currentMarginPercent: expect.any(String),
          minMarginPercent: '30.00',
        }),
      ],
    });
  });

  it('devuelve affectedProductsCount total y solo los productos críticos en la respuesta', async () => {
    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('8000.00'),
    });
    updateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('9500.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([{ productId: 'prod-1' }, { productId: 'prod-2' }]);
    productFindUniqueMock
      .mockResolvedValueOnce({
        id: 'prod-1',
        name: 'Pan flauta',
        accountId: 'account-1',
        salePrice: new Prisma.Decimal('100.00'),
        minMarginPercent: new Prisma.Decimal('30.00'),
        cost: new Prisma.Decimal('50.00'),
        marginPercent: new Prisma.Decimal('50.00'),
        ingredients: [{ quantity: new Prisma.Decimal('1'), ingredient: { currentCost: new Prisma.Decimal('9500.00') } }],
      })
      .mockResolvedValueOnce({
        id: 'prod-2',
        name: 'Facturas',
        accountId: 'account-1',
        salePrice: new Prisma.Decimal('25000.00'),
        minMarginPercent: new Prisma.Decimal('30.00'),
        cost: new Prisma.Decimal('50.00'),
        marginPercent: new Prisma.Decimal('35.00'),
        ingredients: [{ quantity: new Prisma.Decimal('1'), ingredient: { currentCost: new Prisma.Decimal('5000.00') } }],
      });
    productUpdateMock.mockResolvedValue({});

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '9500.00' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      affectedProductsCount: 2,
      affectedProducts: [
        expect.objectContaining({
          productId: 'prod-1',
          productName: 'Pan flauta',
        }),
        expect.objectContaining({
          productId: 'prod-2',
          productName: 'Facturas',
        }),
      ],
      criticalProducts: [
        expect.objectContaining({
          productId: 'prod-1',
          productName: 'Pan flauta',
        }),
      ],
    });
    expect(res.body.affectedProducts).toHaveLength(2);
    expect(res.body.criticalProducts).toHaveLength(1);
  });

  it('devuelve affectedProductsCount coherente con los productos realmente procesados aunque uno haya sido borrado', async () => {
    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('8000.00'),
    });
    updateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('9500.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([{ productId: 'prod-1' }, { productId: 'prod-2' }]);
    productFindUniqueMock
      .mockResolvedValueOnce({
        id: 'prod-1',
        name: 'Pan flauta',
        accountId: 'account-1',
        salePrice: new Prisma.Decimal('100.00'),
        minMarginPercent: new Prisma.Decimal('30.00'),
        cost: new Prisma.Decimal('50.00'),
        marginPercent: new Prisma.Decimal('50.00'),
        ingredients: [{ quantity: new Prisma.Decimal('1'), ingredient: { currentCost: new Prisma.Decimal('9500.00') } }],
      })
      .mockResolvedValueOnce(null);
    productUpdateMock.mockResolvedValue({});

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '9500.00' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      affectedProductsCount: 1,
      affectedProducts: [
        expect.objectContaining({
          productId: 'prod-1',
          productName: 'Pan flauta',
        }),
      ],
      criticalProducts: [
        expect.objectContaining({
          productId: 'prod-1',
          productName: 'Pan flauta',
        }),
      ],
    });
    expect(res.body.affectedProducts).toHaveLength(1);
    expect(res.body.criticalProducts).toHaveLength(1);
  });

  it('devuelve 403 si el usuario es COLLABORATOR al intentar actualizar un insumo', async () => {
    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .set('x-role', 'COLLABORATOR')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '9500.00' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('devuelve affectedProductsCount: 0 y criticalProducts: [] cuando no hubo cambio real', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('120.00'),
    });

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '120.00' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ingredient: {
        id: 'ing-1',
        name: 'Harina 000',
        unit: 'kg',
        currentCost: '120',
      },
      affectedProductsCount: 0,
      criticalProducts: [],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no despacha la alerta si falta configurar INTERNAL_WEBHOOK_SECRET (Fail-Closed)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    process.env.N8N_MARGIN_ALERT_WEBHOOK_URL = 'https://n8n.example.test/webhook/margins';
    delete process.env.INTERNAL_WEBHOOK_SECRET;

    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('8000.00'),
    });
    updateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('9500.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([{ productId: 'prod-1' }]);
    productFindUniqueMock.mockResolvedValue({
      id: 'prod-1',
      name: 'Pan flauta',
      accountId: 'account-1',
      salePrice: new Prisma.Decimal('100.00'),
      minMarginPercent: new Prisma.Decimal('30.00'),
      cost: new Prisma.Decimal('50.00'),
      marginPercent: new Prisma.Decimal('50.00'),
      ingredients: [{ quantity: new Prisma.Decimal('1'), ingredient: { currentCost: new Prisma.Decimal('9500.00') } }],
    });
    productUpdateMock.mockResolvedValue({});

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '9500.00' });

    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('INTERNAL_WEBHOOK_SECRET'));
    consoleErrorSpy.mockRestore();
  });

  it('registra un error en consola si el webhook de n8n responde 401 Unauthorized', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });
    vi.stubGlobal('fetch', fetchMock);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    process.env.N8N_MARGIN_ALERT_WEBHOOK_URL = 'https://n8n.example.test/webhook/margins';
    process.env.INTERNAL_WEBHOOK_SECRET = 'test-secret';

    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('8000.00'),
    });
    updateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('9500.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([{ productId: 'prod-1' }]);
    productFindUniqueMock.mockResolvedValue({
      id: 'prod-1',
      name: 'Pan flauta',
      accountId: 'account-1',
      salePrice: new Prisma.Decimal('100.00'),
      minMarginPercent: new Prisma.Decimal('30.00'),
      cost: new Prisma.Decimal('50.00'),
      marginPercent: new Prisma.Decimal('50.00'),
      ingredients: [{ quantity: new Prisma.Decimal('1'), ingredient: { currentCost: new Prisma.Decimal('9500.00') } }],
    });
    productUpdateMock.mockResolvedValue({});

    accountFindUniqueMock.mockResolvedValue({
      id: 'account-1',
      businessName: 'Panadería Central',
      slug: 'panaderia-central',
      users: [{ email: 'admin.panaderia@seed.example.test' }],
    });

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '9500.00' });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('HTTP 401 (Unauthorized)'));
    consoleErrorSpy.mockRestore();
  });

  it('propaga el error y no responde 200 si falla la actualización del segundo producto afectado', async () => {
    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('120.00'),
    });
    updateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('150.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([{ productId: 'prod-1' }, { productId: 'prod-2' }]);
    productFindUniqueMock.mockResolvedValue({
      id: 'prod-1',
      name: 'Producto',
      salePrice: new Prisma.Decimal('200.00'),
      minMarginPercent: new Prisma.Decimal('20.00'),
      marginPercent: new Prisma.Decimal('40.00'),
      cost: new Prisma.Decimal('120.00'),
      ingredients: [{ quantity: new Prisma.Decimal('1'), ingredient: { currentCost: new Prisma.Decimal('150.00') } }],
    });
    productUpdateMock
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Fallo simulado al actualizar el segundo producto'));

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '150.00' });

    expect(res.status).toBe(500);
    expect(transactionMock).toHaveBeenCalledTimes(1);
  });

  it('recalcula cost/marginAmount/marginPercent de cada producto afectado por el nuevo costo del insumo', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1', name: 'Harina', unit: 'kg' });
    updateMock.mockResolvedValue({ id: 'ing-1', name: 'Harina', unit: 'kg', currentCost: '150.00' });

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
    expect(productUpdateMock).toHaveBeenCalledTimes(2);
    expect(productUpdateMock).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: {
        cost: expect.objectContaining({ d: expect.anything() }),
        marginAmount: expect.anything(),
        marginPercent: expect.anything(),
      },
    });

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
    findFirstMock.mockResolvedValue({ id: 'ing-1', name: 'Harina', unit: 'kg' });
    updateMock.mockResolvedValue({ id: 'ing-1' });

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