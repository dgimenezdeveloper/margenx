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
const txProductIngredientCountMock = vi.fn();

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
          count: (...args: unknown[]) => txProductIngredientCountMock(...args),
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
  txProductIngredientCountMock.mockReset();
});

/** Forma de los datos que el router pasa a `product.update({ data })`. */
interface ProductUpdateData {
  name?: Prisma.Decimal | string;
  salePrice: Prisma.Decimal;
  minMarginPercent: Prisma.Decimal;
  cost: Prisma.Decimal;
  marginAmount: Prisma.Decimal;
  marginPercent: Prisma.Decimal;
}

/**
 * Devuelve el `data` de la primera llamada a product.update, fallando el
 * test con un mensaje claro si nunca se llamó. Evita el error 2532 de
 * `noUncheckedIndexedAccess` sin recurrir a `!` en cada aserción.
 */
function firstUpdateData(): ProductUpdateData {
  const call = txProductUpdateMock.mock.calls[0];
  expect(call).toBeDefined();
  return (call as [{ data: ProductUpdateData }])[0].data;
}

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
  it('permite salePrice = 0 (producto borrador) y calcula margen negativo sin lanzar 400 (fix del bug reportado por QA)', async () => {
    // Insumo con currentCost = 1500, cantidad 1 => cost total = 1500
    txIngredientFindManyMock.mockResolvedValue([
      { id: 'ing-1', currentCost: new Prisma.Decimal('1500') },
    ]);
    txProductCreateMock.mockResolvedValue({
      id: 'p-borrador',
      name: 'Producto borrador',
      cost: '1500.00',
      marginAmount: '-1500.00',
      marginPercent: '0.00',
    });

    const payload = {
      name: 'Producto borrador',
      salePrice: '0', // <- antes del fix, esto tiraba 400 "debe ser mayor a cero"
      minMarginPercent: '0',
      ingredients: [{ ingredientId: 'ing-1', quantity: '1' }],
    };

    const res = await request(buildApp()).post('/api/products').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.product.marginAmount).toBe('-1500.00');
    expect(res.body.product.marginPercent).toBe('0.00');

    // Verificamos qué se le pasó realmente a product.create, no solo el mock de retorno
    const createCall = txProductCreateMock.mock.calls[0] as [{ data: any }];
    const createData = createCall[0].data;

    expect(createData.salePrice.toString()).toBe('0');
    expect(createData.cost.toString()).toBe('1500');
    expect(createData.marginAmount.toString()).toBe('-1500');
    expect(createData.marginPercent.toString()).toBe('0');
  });

  it('sigue rechazando salePrice negativo con 400', async () => {
    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto inválido',
        salePrice: '-10',
        minMarginPercent: '0',
        ingredients: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mayor o igual a cero/);
    expect(txProductCreateMock).not.toHaveBeenCalled();
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

describe('PUT /api/products/:id', () => {
  it('recalcula marginAmount/marginPercent cuando solo cambia salePrice y el producto YA tenía receta (fix del bug reportado por QA)', async () => {
    // Producto existente: cost=100, salePrice viejo=150 (margen viejo: 50 / 33.33%)
    txProductFindFirstMock.mockResolvedValue({
      id: 'p1',
      name: 'Prod',
      salePrice: new Prisma.Decimal('150.00'),
      minMarginPercent: new Prisma.Decimal('10'),
      cost: new Prisma.Decimal('100.00'),
      marginAmount: new Prisma.Decimal('50.00'),
      marginPercent: new Prisma.Decimal('33.33'),
    });
    // El producto ya tiene receta cargada (no se envía "ingredients" en este PUT)
    txProductIngredientCountMock.mockResolvedValue(2);
    txProductUpdateMock.mockResolvedValue({ id: 'p1', name: 'Prod', cost: '100.00', marginAmount: '100.00', marginPercent: '50.00' });

    const res = await request(buildApp())
      .put('/api/products/p1')
      .send({ salePrice: '200.00' });

    expect(res.status).toBe(200);
    // No debe correr la rama de "ingredientsProvided" (no se toca la receta)
    expect(txProductIngredientDeleteManyMock).not.toHaveBeenCalled();
    expect(txIngredientFindManyMock).not.toHaveBeenCalled();
    // El margen debe recalcularse contra el cost existente y el salePrice NUEVO
    expect(txProductUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          salePrice: expect.objectContaining({ d: expect.anything() }), // Decimal('200.00')
          cost: expect.objectContaining({ d: expect.anything() }), // Decimal('100.00'), sin cambios
          marginAmount: expect.objectContaining({ d: expect.anything() }),
          marginPercent: expect.objectContaining({ d: expect.anything() }),
        }),
      })
    );

    const data = firstUpdateData();
    expect(data.marginAmount.toString()).toBe('100');
    expect(data.marginPercent.toString()).toBe('50');
  });

  it('mantiene el margen en 0 si solo cambia salePrice en un producto SIN receta (no genera margen ficticio)', async () => {
    txProductFindFirstMock.mockResolvedValue({
      id: 'p2',
      name: 'Medialunas',
      salePrice: new Prisma.Decimal('800.00'),
      minMarginPercent: new Prisma.Decimal('0'),
      cost: new Prisma.Decimal('0.00'),
      marginAmount: new Prisma.Decimal('0.00'),
      marginPercent: new Prisma.Decimal('0.00'),
    });
    // Sin receta cargada
    txProductIngredientCountMock.mockResolvedValue(0);
    txProductUpdateMock.mockResolvedValue({ id: 'p2', name: 'Medialunas', cost: '0.00', marginAmount: '0.00', marginPercent: '0.00' });

    const res = await request(buildApp())
      .put('/api/products/p2')
      .send({ salePrice: '900.00' });

    expect(res.status).toBe(200);
    const data = firstUpdateData();
    expect(data.marginAmount.toString()).toBe('0');
    expect(data.marginPercent.toString()).toBe('0');
  });

  it('recalcula costo y margen cuando se envía una receta nueva', async () => {
    txProductFindFirstMock.mockResolvedValue({
      id: 'p1',
      name: 'Prod',
      salePrice: new Prisma.Decimal('30.00'),
      minMarginPercent: new Prisma.Decimal('10'),
      cost: new Prisma.Decimal('20.00'),
      marginAmount: new Prisma.Decimal('10.00'),
      marginPercent: new Prisma.Decimal('33.33'),
    });
    txIngredientFindManyMock.mockResolvedValue([
      { id: 'ing-1', currentCost: new Prisma.Decimal('5') },
    ]);
    txProductUpdateMock.mockResolvedValue({ id: 'p1', name: 'Prod', cost: '15.00', marginAmount: '15.00', marginPercent: '50.00' });

    const res = await request(buildApp())
      .put('/api/products/p1')
      .send({ ingredients: [{ ingredientId: 'ing-1', quantity: '3' }] });

    expect(res.status).toBe(200);
    expect(txProductIngredientDeleteManyMock).toHaveBeenCalledWith({ where: { productId: 'p1' } });
    const data = firstUpdateData();
    expect(data.cost.toString()).toBe('15');
    expect(data.marginAmount.toString()).toBe('15');
    expect(data.marginPercent.toString()).toBe('50');
  });

  it('pasa a borrador (cost/margin en 0) cuando ingredients llega vacío', async () => {
    txProductFindFirstMock.mockResolvedValue({
      id: 'p1',
      name: 'Prod',
      salePrice: new Prisma.Decimal('30.00'),
      minMarginPercent: new Prisma.Decimal('10'),
      cost: new Prisma.Decimal('20.00'),
      marginAmount: new Prisma.Decimal('10.00'),
      marginPercent: new Prisma.Decimal('33.33'),
    });
    txProductUpdateMock.mockResolvedValue({ id: 'p1', name: 'Prod', cost: '0.00', marginAmount: '0.00', marginPercent: '0.00' });

    const res = await request(buildApp())
      .put('/api/products/p1')
      .send({ ingredients: [] });

    expect(res.status).toBe(200);
    expect(txProductIngredientDeleteManyMock).toHaveBeenCalledWith({ where: { productId: 'p1' } });
    // No debe consultar insumos porque no hay ninguno que validar
    expect(txIngredientFindManyMock).not.toHaveBeenCalled();
    const data = firstUpdateData();
    expect(data.marginAmount.toString()).toBe('0');
    expect(data.marginPercent.toString()).toBe('0');
  });

  it('devuelve 404 si el producto no existe o pertenece a otra cuenta', async () => {
    txProductFindFirstMock.mockResolvedValue(null);

    const res = await request(buildApp())
      .put('/api/products/p-inexistente')
      .send({ salePrice: '100.00' });

    expect(res.status).toBe(404);
  });

  it('devuelve 400 si la receta enviada contiene un insumo inexistente y no persiste cambios', async () => {
    txProductFindFirstMock.mockResolvedValue({
      id: 'p1',
      name: 'Prod',
      salePrice: new Prisma.Decimal('30.00'),
      minMarginPercent: new Prisma.Decimal('10'),
      cost: new Prisma.Decimal('20.00'),
      marginAmount: new Prisma.Decimal('10.00'),
      marginPercent: new Prisma.Decimal('33.33'),
    });
    // Se pidió 1 insumo pero la búsqueda no devuelve ninguno -> mismatch de longitud
    txIngredientFindManyMock.mockResolvedValue([]);

    const res = await request(buildApp())
      .put('/api/products/p1')
      .send({ ingredients: [{ ingredientId: 'ing-inexistente', quantity: '1' }] });

    expect(res.status).toBe(400);
    expect(txProductUpdateMock).not.toHaveBeenCalled();
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