import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Prisma } from '@prisma/client';

const accountFindUniqueMock = vi.fn();
const supplierIngredientFindManyMock = vi.fn();
const supplierIngredientUpdateMock = vi.fn();
const ingredientFindUniqueMock = vi.fn();
const ingredientUpdateMock = vi.fn();
const transactionMock = vi.fn(async (callback: (tx: any) => Promise<void>, _options?: unknown) => callback({
  supplierIngredient: { update: supplierIngredientUpdateMock },
  ingredient: {
    findUnique: ingredientFindUniqueMock,
    update: ingredientUpdateMock,
  },
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    account: {
      findUnique: (...args: unknown[]) => accountFindUniqueMock(...args),
    },
    supplierIngredient: {
      findMany: (...args: unknown[]) => supplierIngredientFindManyMock(...args),
    },
    $transaction: (callback: (tx: any) => Promise<void>, options?: unknown) => transactionMock(callback, options),
  },
}));

vi.mock('../services/marginCalculator', () => ({
  calculateUnitCost: (price: Prisma.Decimal, packageSize: Prisma.Decimal) => {
    return price.div(packageSize).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  },
  applyIngredientCostChange: vi.fn().mockResolvedValue({
    affectedProductsCount: 0,
    affectedProducts: [],
    criticalProducts: [],
  }),
}));

import * as marginCalculator from '../services/marginCalculator';
import webhooksRouter from './webhooks';
import { errorHandler } from '../middlewares/errorHandler';

function buildApp() {
  const app = express();
  app.use('/api/webhooks', express.json({ limit: '5mb' }));
  app.use(express.json({ limit: '256kb' }));
  app.use('/api/webhooks', webhooksRouter);
  app.use(errorHandler);
  return app;
}

describe('POST /api/webhooks/supplier-prices', () => {
  beforeEach(() => {
    process.env.INTERNAL_WEBHOOK_SECRET = 'test-secret';
    accountFindUniqueMock.mockReset();
    supplierIngredientFindManyMock.mockReset();
    supplierIngredientUpdateMock.mockReset();
    ingredientFindUniqueMock.mockReset();
    ingredientUpdateMock.mockReset();
    vi.mocked(marginCalculator.applyIngredientCostChange).mockReset();
    vi.mocked(marginCalculator.applyIngredientCostChange).mockResolvedValue({
      affectedProductsCount: 0,
      affectedProducts: [],
      criticalProducts: [],
    });
    transactionMock.mockClear();
  });

  it('acepta una lista de 1,2 MB dentro del límite del webhook y no responde 500', async () => {
    accountFindUniqueMock.mockResolvedValue({
      id: 'acc-123',
      slug: 'panaderia-central',
      businessName: 'Panadería Central',
      isActive: true,
      users: [{ email: 'admin@panaderia.example' }],
    });
    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-1',
        supplierId: 'supplier-1',
        ingredientId: 'ing-1',
        supplierCode: 'MC-OK',
        packageSize: new Prisma.Decimal('50'),
        packagePrice: new Prisma.Decimal('1000'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-1', accountId: 'acc-123', currentCost: new Prisma.Decimal('20') },
        supplier: { id: 'supplier-1', isActive: true },
      },
    ]);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'MC-OK', description: 'x'.repeat(1_200_000), price: 1100 }],
      });

    expect(res.status).toBe(200);
    expect(res.status).not.toBe(500);
    expect(res.body).toMatchObject({
      received: 1,
      account: {
        tradeName: 'Panadería Central',
        ownerEmail: 'admin@panaderia.example',
      },
    });
  });

  it('devuelve 413 cuando la lista supera el límite de tamaño del webhook', async () => {
    const hugeDescription = 'x'.repeat(6 * 1024 * 1024);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'MC-TOO-LARGE', description: hugeDescription, price: 1234 }],
      });

    expect(res.status).toBe(413);
    expect(res.body).toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      error: expect.stringContaining('demasiado grande'),
    });
    expect(res.body.error).toContain('Divid');
  });

  it('deduplica el payload y devuelve ownerEmail en la respuesta', async () => {
    accountFindUniqueMock.mockResolvedValue({
      id: 'acc-123',
      slug: 'panaderia-central',
      businessName: 'Panadería Central',
      isActive: true,
      users: [{ email: 'admin@panaderia.example' }],
    });
    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-1',
        supplierId: 'supplier-1',
        ingredientId: 'ing-1',
        supplierCode: 'MC-990',
        packageSize: new Prisma.Decimal('50'),
        packagePrice: new Prisma.Decimal('1000'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-1', accountId: 'acc-123', currentCost: new Prisma.Decimal('20') },
        supplier: { id: 'supplier-1', isActive: true },
      },
    ]);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [
          { code: 'MC-990', price: 1100 },
          { code: 'MC-990', price: 1200 },
          { code: 'NO-EXISTE', price: 999 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.duplicates).toBe(1);
    expect(res.body.received).toBe(3);
    expect(res.body.updated).toBe(1);
    expect(res.body.account).toEqual({
      tradeName: 'Panadería Central',
      ownerEmail: 'admin@panaderia.example',
    });
    expect(res.body.discardedCodes).toContainEqual({ code: 'NO-EXISTE', reason: 'NOT_FOUND' });
    expect(res.body.received).toBe(
      res.body.updated + res.body.unchanged + res.body.quarantined + res.body.duplicates + res.body.discarded
    );
  });

  it('marca como AMBIGUOUS cuando un código existe en más de un proveedor activo', async () => {
    accountFindUniqueMock.mockResolvedValue({
      id: 'acc-123',
      slug: 'panaderia-central',
      businessName: 'Panadería Central',
      isActive: true,
      users: [{ email: 'admin@panaderia.example' }],
    });
    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-a',
        supplierId: 'supplier-1',
        ingredientId: 'ing-1',
        supplierCode: 'MC-AMB',
        packageSize: new Prisma.Decimal('50'),
        packagePrice: new Prisma.Decimal('1000'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-1', accountId: 'acc-123', currentCost: new Prisma.Decimal('20') },
        supplier: { id: 'supplier-1', isActive: true },
      },
      {
        id: 'si-b',
        supplierId: 'supplier-2',
        ingredientId: 'ing-2',
        supplierCode: 'MC-AMB',
        packageSize: new Prisma.Decimal('50'),
        packagePrice: new Prisma.Decimal('1200'),
        isDefault: false,
        isQuarantined: false,
        ingredient: { id: 'ing-2', accountId: 'acc-123', currentCost: new Prisma.Decimal('24') },
        supplier: { id: 'supplier-2', isActive: true },
      },
    ]);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'MC-AMB', price: 2100 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.discarded).toBe(1);
    expect(res.body.discardedCodes).toContainEqual({ code: 'MC-AMB', reason: 'AMBIGUOUS' });
    expect(supplierIngredientUpdateMock).not.toHaveBeenCalled();
  });

  it('no ejecuta la cascada cuando el precio no cambió', async () => {
    accountFindUniqueMock.mockResolvedValue({
      id: 'acc-123',
      slug: 'panaderia-central',
      businessName: 'Panadería Central',
      isActive: true,
      users: [{ email: 'admin@panaderia.example' }],
    });
    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-unchanged',
        supplierId: 'supplier-1',
        ingredientId: 'ing-unchanged',
        supplierCode: 'MC-UNCHANGED',
        packageSize: new Prisma.Decimal('50'),
        packagePrice: new Prisma.Decimal('1000'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-unchanged', accountId: 'acc-123', currentCost: new Prisma.Decimal('20') },
        supplier: { id: 'supplier-1', isActive: true },
      },
    ]);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'MC-UNCHANGED', price: 1000 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.unchanged).toBe(1);
    expect(res.body.updated).toBe(0);
    expect(marginCalculator.applyIngredientCostChange).not.toHaveBeenCalled();
  });

  it('eventos en cuarentena se contabilizan por la presentación previa y retienen el precio propuesto sin pisar el vigente', async () => {
    accountFindUniqueMock.mockResolvedValue({
      id: 'acc-123',
      slug: 'panaderia-central',
      businessName: 'Panadería Central',
      isActive: true,
      users: [{ email: 'admin@panaderia.example' }],
    });
    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-q1',
        supplierId: 'supplier-1',
        ingredientId: 'ing-q1',
        supplierCode: 'MC-Q1',
        packageSize: new Prisma.Decimal('10'),
        packagePrice: new Prisma.Decimal('100'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-q1', accountId: 'acc-123', currentCost: new Prisma.Decimal('10') },
        supplier: { id: 'supplier-1', isActive: true },
      },
    ]);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'MC-Q1', price: 1000 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.quarantined).toBe(1);
    expect(res.body.updated).toBe(0);
    expect(supplierIngredientUpdateMock).toHaveBeenCalledWith({
      where: { id: 'si-q1' },
      data: expect.objectContaining({
        pendingPackagePrice: new Prisma.Decimal('1000'),
        isQuarantined: true,
        quarantineReason: expect.any(String),
        quarantinedAt: expect.any(Date),
        packagePrice: new Prisma.Decimal('100'),
      }),
    });
  });

  it('rechaza la solicitud si falta el secreto interno', async () => {
    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'SKU-1', price: 123.45 }],
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
    expect(accountFindUniqueMock).not.toHaveBeenCalled();
  });

  it('rechaza la solicitud si el secreto interno es incorrecto y no ejecuta procesamiento', async () => {
    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'secreto-incorrecto')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'SKU-1', price: 123.45 }],
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
    expect(accountFindUniqueMock).not.toHaveBeenCalled();
  });

  it('devuelve 404 cuando no existe una cuenta activa para el slug indicado', async () => {
    accountFindUniqueMock.mockResolvedValue(null);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'slug-inexistente',
        items: [{ code: 'SKU-1', price: 123.45 }],
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No existe una cuenta activa para el slug indicado.');
  });

  it('rechaza un payload mayor a 5000 items con 400 Bad Request', async () => {
    const items = Array.from({ length: 5001 }, (_, index) => ({
      code: `SKU-${index + 1}`,
      description: `Producto ${index + 1}`,
      price: 15.5 + index,
    }));

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('5000');
    expect(accountFindUniqueMock).not.toHaveBeenCalled();
  });

  it('descarta silenciosamente los artículos no mapeados y actualiza solo los coincidentes', async () => {
    const account = { id: 'acc-123', slug: 'panaderia-central', isActive: true };
    accountFindUniqueMock.mockResolvedValue(account);
    ingredientFindUniqueMock.mockResolvedValue({ currentCost: new Prisma.Decimal('35') });
    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-1',
        supplierId: 'supplier-1',
        ingredientId: 'ing-1',
        supplierCode: 'MC-990',
        packageSize: new Prisma.Decimal('50'),
        packagePrice: new Prisma.Decimal('70000'),
        isDefault: true,
        ingredient: { id: 'ing-1', accountId: 'acc-123', currentCost: new Prisma.Decimal('35') },
      },
    ]);

    const items = [
      { code: 'MC-990', description: 'Harina 50kg', price: 1750 },
      { code: 'ART-001', description: 'Producto ajeno 1', price: 99 },
      { code: 'ART-002', description: 'Producto ajeno 2', price: 150 },
    ];

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items,
      });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(3);
    expect(res.body.updated).toBe(0);
    expect(res.body.discarded).toBe(2);
    expect(res.body.duplicates).toBe(0);
    expect(res.body.unchanged).toBe(0);
    expect(res.body.quarantined).toBe(1);
    expect(res.body.criticalProductsAlerts).toEqual([]);
    expect(res.body.discardedCodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ART-001', reason: 'NOT_FOUND' }),
        expect.objectContaining({ code: 'ART-002', reason: 'NOT_FOUND' }),
      ])
    );
    expect(supplierIngredientFindManyMock).toHaveBeenCalledWith({
      where: {
        supplierCode: { in: ['MC-990', 'ART-001', 'ART-002'] },
        ingredient: { accountId: 'acc-123' },
      },
      include: {
        ingredient: true,
        supplier: true,
      },
    });
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(supplierIngredientUpdateMock).toHaveBeenCalledWith({
      where: { id: 'si-1' },
      data: expect.objectContaining({
        packagePrice: new Prisma.Decimal('70000'),
        pendingPackagePrice: new Prisma.Decimal('1750'),
        isQuarantined: true,
        quarantineReason: expect.any(String),
        quarantinedAt: expect.any(Date),
      }),
    });
    expect(ingredientFindUniqueMock).not.toHaveBeenCalled();
    expect(ingredientUpdateMock).not.toHaveBeenCalled();
    expect(marginCalculator.applyIngredientCostChange).not.toHaveBeenCalled();
  });

  it('retiene en cuarentena un cambio anómalo que supera el 50% de variación', async () => {
    const account = { id: 'acc-123', slug: 'panaderia-central', isActive: true };
    accountFindUniqueMock.mockResolvedValue(account);
    ingredientFindUniqueMock.mockResolvedValue({ currentCost: new Prisma.Decimal('100') });
    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-quarantine',
        supplierId: 'supplier-1',
        ingredientId: 'ing-2',
        supplierCode: 'MC-CUARENTINA',
        packageSize: new Prisma.Decimal('50'),
        packagePrice: new Prisma.Decimal('10000'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-2', accountId: 'acc-123', currentCost: new Prisma.Decimal('100') },
      },
    ]);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'MC-CUARENTINA', description: 'Manteca', price: 50000 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(0);
    expect(res.body.quarantined).toBe(1);
    expect(res.body.discarded).toBe(0);
    expect(supplierIngredientUpdateMock).toHaveBeenCalledWith({
      where: { id: 'si-quarantine' },
      data: expect.objectContaining({
        packagePrice: new Prisma.Decimal('10000'),
        pendingPackagePrice: new Prisma.Decimal('50000'),
        isQuarantined: true,
        quarantineReason: expect.any(String),
        quarantinedAt: expect.any(Date),
      }),
    });
    expect(ingredientUpdateMock).not.toHaveBeenCalled();
    expect(marginCalculator.applyIngredientCostChange).not.toHaveBeenCalled();
  });

  it('retiene en cuarentena una caída anómala cuando la variación supera el 50% en valor absoluto', async () => {
    const account = { id: 'acc-123', slug: 'panaderia-central', isActive: true };
    accountFindUniqueMock.mockResolvedValue(account);
    ingredientFindUniqueMock.mockResolvedValue({ currentCost: new Prisma.Decimal('10000') });
    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-drop',
        supplierId: 'supplier-1',
        ingredientId: 'ing-drop',
        supplierCode: 'MC-DROP',
        packageSize: new Prisma.Decimal('50'),
        packagePrice: new Prisma.Decimal('10000'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-drop', accountId: 'acc-123', currentCost: new Prisma.Decimal('10000') },
      },
    ]);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'MC-DROP', description: 'Manteca', price: 3000 }],
      });

    expect(res.status).toBe(200);
    expect(supplierIngredientUpdateMock).toHaveBeenCalledWith({
      where: { id: 'si-drop' },
      data: expect.objectContaining({
        packagePrice: new Prisma.Decimal('10000'),
        pendingPackagePrice: new Prisma.Decimal('3000'),
        isQuarantined: true,
        quarantineReason: expect.any(String),
        quarantinedAt: expect.any(Date),
      }),
    });
    expect(ingredientUpdateMock).not.toHaveBeenCalled();
    expect(marginCalculator.applyIngredientCostChange).not.toHaveBeenCalled();
  });

  it('cuarentena el precio si el costo unitario calculado es inválido y no rompe el lote', async () => {
    const account = { id: 'acc-123', slug: 'panaderia-central', isActive: true };
    accountFindUniqueMock.mockResolvedValue(account);
    ingredientFindUniqueMock.mockResolvedValue({ currentCost: new Prisma.Decimal('10000') });
    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-zero-unit',
        supplierId: 'supplier-1',
        ingredientId: 'ing-zero',
        supplierCode: 'MC-ZERO',
        packageSize: new Prisma.Decimal('10'),
        packagePrice: new Prisma.Decimal('1000'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-zero', accountId: 'acc-123', currentCost: new Prisma.Decimal('10000') },
      },
    ]);

    const calcSpy = vi.spyOn(marginCalculator, 'calculateUnitCost').mockImplementation(() => {
      throw new Error('El costo unitario calculado debe ser mayor a cero.');
    });

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'MC-ZERO', description: 'Manteca', price: 1 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.quarantined).toBe(1);
    expect(supplierIngredientUpdateMock).toHaveBeenCalledWith({
      where: { id: 'si-zero-unit' },
      data: expect.objectContaining({
        packagePrice: new Prisma.Decimal('1000'),
        pendingPackagePrice: new Prisma.Decimal('1'),
        isQuarantined: true,
        quarantineReason: 'COSTO_UNITARIO_INSUFICIENTE',
        quarantinedAt: expect.any(Date),
      }),
    });
    expect(ingredientUpdateMock).not.toHaveBeenCalled();
    calcSpy.mockRestore();
  });

  it('limpia la cuarentena cuando llega el mismo precio vigente y había un pendiente', async () => {
    const account = { id: 'acc-123', slug: 'panaderia-central', isActive: true };
    accountFindUniqueMock.mockResolvedValue(account);
    ingredientFindUniqueMock.mockResolvedValue({ currentCost: new Prisma.Decimal('100') });
    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-same',
        supplierId: 'supplier-1',
        ingredientId: 'ing-same',
        supplierCode: 'MC-SAME',
        packageSize: new Prisma.Decimal('50'),
        packagePrice: new Prisma.Decimal('1000'),
        pendingPackagePrice: new Prisma.Decimal('1000'),
        isDefault: true,
        isQuarantined: true,
        quarantineReason: 'VARIACION_MAYOR_50_POR_CIENTO',
        quarantinedAt: new Date('2026-10-20T12:00:00.000Z'),
        ingredient: { id: 'ing-same', accountId: 'acc-123', currentCost: new Prisma.Decimal('100') },
      },
    ]);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'MC-SAME', description: 'Manteca', price: 1000 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.unchanged).toBe(1);
    expect(supplierIngredientUpdateMock).toHaveBeenCalledWith({
      where: { id: 'si-same' },
      data: expect.objectContaining({
        pendingPackagePrice: null,
        isQuarantined: false,
        quarantinedAt: null,
        quarantineReason: null,
      }),
    });
  });
});
