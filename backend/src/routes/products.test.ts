// src/routes/products.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Prisma } from '@prisma/client';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AuthenticatedRequest } from '../middlewares/auth';
import type { Response, NextFunction } from 'express';

let currentUserRole: 'ADMIN' | 'COLLABORATOR' = 'ADMIN';

vi.mock('../middlewares/auth', () => ({
  authMiddleware: (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    req.user = { id: 'user-1', accountId: 'account-1', email: 'a@a.com', role: currentUserRole };
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

function setAuthRole(role: 'ADMIN' | 'COLLABORATOR') {
  currentUserRole = role;
}

beforeEach(() => {
  setAuthRole('ADMIN');
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

describe('schema Prisma y migración', () => {
  it('documenta la estrategia case-insensitive y la ejecuta en la migración con lower(name)', () => {
    const schema = readFileSync(join(__dirname, '../../prisma/schema.prisma'), 'utf8');
    const migrationDir = join(__dirname, '../../prisma/migrations');
    const latestMigration = readdirSync(migrationDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .at(-1);

    expect(latestMigration).toBeDefined();

    const migrationSql = readFileSync(join(migrationDir, latestMigration!, 'migration.sql'), 'utf8');

    expect(schema).toContain('La unicidad case-insensitive por cuenta se garantiza con el índice funcional UNIQUE');
    expect(schema).toContain('CREATE UNIQUE INDEX "Product_accountId_lower_name_key" ON "Product"("accountId", lower("name"));');
    expect(schema).toContain('CREATE UNIQUE INDEX "Supplier_accountId_lower_name_key" ON "Supplier"("accountId", lower("name"));');
    expect(schema).toContain('CREATE UNIQUE INDEX "Ingredient_accountId_lower_name_key" ON "Ingredient"("accountId", lower("name"));');
    expect(migrationSql).toContain('lower("name")');
    expect(migrationSql).toContain('CREATE UNIQUE INDEX "Product_accountId_lower_name_key"');
    expect(migrationSql).toContain('CREATE UNIQUE INDEX "Supplier_accountId_lower_name_key"');
    expect(migrationSql).toContain('CREATE UNIQUE INDEX "Ingredient_accountId_lower_name_key"');
  });
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
  it('permite salePrice = 0 en un producto borrador sin receta', async () => {
    txIngredientFindManyMock.mockResolvedValue([]);
    txProductCreateMock.mockResolvedValue({
      id: 'p-borrador',
      name: 'Producto borrador',
      cost: '0.00',
      marginAmount: '0.00',
      marginPercent: '0.00',
    });

    const payload = {
      name: 'Producto borrador',
      salePrice: '0',
      minMarginPercent: '0',
      ingredients: [],
    };

    const res = await request(buildApp()).post('/api/products').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.product.marginAmount).toBe('0.00');
    expect(res.body.product.marginPercent).toBe('0.00');

    const createCall = txProductCreateMock.mock.calls[0] as [{ data: any }];
    const createData = createCall[0].data;

    expect(createData.salePrice.toString()).toBe('0');
    expect(createData.cost.toString()).toBe('0');
    expect(createData.marginAmount.toString()).toBe('0');
    expect(createData.marginPercent.toString()).toBe('0');
  });

  it('rechaza salePrice = 0 cuando el producto tiene receta', async () => {
    txIngredientFindManyMock.mockResolvedValue([
      { id: 'ing-1', currentCost: new Prisma.Decimal('1500') },
    ]);

    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto con receta y precio cero',
        salePrice: '0',
        minMarginPercent: '0',
        ingredients: [{ ingredientId: 'ing-1', quantity: '1' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/precio de venta debe ser mayor a cero/i);
    expect(txProductCreateMock).not.toHaveBeenCalled();
  });

  it('PUT rechaza salePrice = 0 cuando el producto conserva la receta', async () => {
    txProductFindFirstMock.mockResolvedValue({
      id: 'p1',
      name: 'Prod',
      salePrice: new Prisma.Decimal('30.00'),
      minMarginPercent: new Prisma.Decimal('10'),
      cost: new Prisma.Decimal('20.00'),
      marginAmount: new Prisma.Decimal('10.00'),
      marginPercent: new Prisma.Decimal('33.33'),
    });
    txProductIngredientCountMock.mockResolvedValue(1);

    const res = await request(buildApp())
      .put('/api/products/p1')
      .send({ salePrice: '0' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/precio de venta debe ser mayor a cero/i);
    expect(txProductUpdateMock).not.toHaveBeenCalled();
  });

  it('PUT rechaza una receta nueva cuando salePrice = 0', async () => {
    txProductFindFirstMock.mockResolvedValue({
      id: 'p2',
      name: 'Borrador',
      salePrice: new Prisma.Decimal('0'),
      minMarginPercent: new Prisma.Decimal('10'),
      cost: new Prisma.Decimal('0'),
      marginAmount: new Prisma.Decimal('0'),
      marginPercent: new Prisma.Decimal('0'),
    });
    txIngredientFindManyMock.mockResolvedValue([
      { id: 'ing-1', currentCost: new Prisma.Decimal('12.50') },
    ]);

    const res = await request(buildApp())
      .put('/api/products/p2')
      .send({
        salePrice: '0',
        ingredients: [{ ingredientId: 'ing-1', quantity: '1' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/precio de venta debe ser mayor a cero/i);
    expect(txProductUpdateMock).not.toHaveBeenCalled();
  });

  it('rechaza un insumo repetido en la receta en POST', async () => {
    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto con insumo duplicado',
        salePrice: '150',
        minMarginPercent: '20',
        ingredients: [
          { ingredientId: 'ing-1', quantity: '1' },
          { ingredientId: 'ing-1', quantity: '2' },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No se puede repetir el mismo insumo/i);
    expect(txProductCreateMock).not.toHaveBeenCalled();
  });

  it('rechaza un insumo repetido en la receta en PUT', async () => {
    txProductFindFirstMock.mockResolvedValue({
      id: 'p1',
      name: 'Prod',
      salePrice: new Prisma.Decimal('30.00'),
      minMarginPercent: new Prisma.Decimal('10'),
      cost: new Prisma.Decimal('0'),
      marginAmount: new Prisma.Decimal('0'),
      marginPercent: new Prisma.Decimal('0'),
    });

    const res = await request(buildApp())
      .put('/api/products/p1')
      .send({
        ingredients: [
          { ingredientId: 'ing-1', quantity: '1' },
          { ingredientId: 'ing-1', quantity: '2' },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No se puede repetir el mismo insumo/i);
    expect(txProductUpdateMock).not.toHaveBeenCalled();
  });

  it('rechaza salePrice con escala decimal inválida en POST', async () => {
    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto con precio inválido',
        salePrice: '123.456',
        minMarginPercent: '10',
        ingredients: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valor decimal válido/i);
    expect(txProductCreateMock).not.toHaveBeenCalled();
  });

  it('rechaza quantity con escala decimal inválida en POST', async () => {
    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto con cantidad inválida',
        salePrice: '100',
        minMarginPercent: '10',
        ingredients: [{ ingredientId: 'ing-1', quantity: '1.2345' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valor decimal válido/i);
    expect(txProductCreateMock).not.toHaveBeenCalled();
  });

  it('acepta quantity con 3 decimales válidos y crea el producto', async () => {
    txIngredientFindManyMock.mockResolvedValue([
      { id: 'ing-1', currentCost: new Prisma.Decimal('10.00') },
    ]);
    txProductCreateMock.mockResolvedValue({
      id: 'p-quantity-3',
      name: 'Producto con cantidad válida',
      cost: '12.34',
      marginAmount: '87.66',
      marginPercent: '87.66',
    });

    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto con cantidad válida',
        salePrice: '100',
        minMarginPercent: '10',
        ingredients: [{ ingredientId: 'ing-1', quantity: '1.234' }],
      });

    expect(res.status).toBe(201);
    expect(txProductCreateMock).toHaveBeenCalled();

    const call = txProductCreateMock.mock.calls[0];
    expect(call).toBeDefined();

    const createData = (call as [{ data: { ingredients: { create: Array<{ quantity: Prisma.Decimal }> } } }])[0].data;
    expect(createData.ingredients.create).toHaveLength(1);

    const quantity = createData.ingredients.create[0]?.quantity;
    expect(quantity).toBeDefined();
    expect(quantity!.toString()).toBe('1.234');
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

  it('rechaza salePrice mayor al límite de PostgreSQL con 400', async () => {
    txIngredientFindManyMock.mockResolvedValue([]);

    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto fuera de rango',
        salePrice: '100000000',
        minMarginPercent: '30',
        ingredients: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El campo "salePrice" no puede superar $99.999.999,99.');
    expect(txProductCreateMock).not.toHaveBeenCalled();
  });

  it('acepta el límite superior exacto de salePrice', async () => {
    txIngredientFindManyMock.mockResolvedValue([]);
    txProductCreateMock.mockResolvedValue({
      id: 'p-limit',
      name: 'Producto límite',
      cost: '0.00',
      marginAmount: '0.00',
      marginPercent: '0.00',
    });

    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto límite',
        salePrice: '99999999.99',
        minMarginPercent: '30',
        ingredients: [],
      });

    expect(res.status).toBe(201);
    const createData = txProductCreateMock.mock.calls[0]?.[0]?.data as { salePrice: Prisma.Decimal } | undefined;
    expect(createData).toBeDefined();
    expect(createData!.salePrice.toString()).toBe('99999999.99');
  });

  it('clampa el costo derivado de la receta si excede el máximo permitido por la base', async () => {
    txIngredientFindManyMock.mockResolvedValue([
      { id: 'ing-1', currentCost: new Prisma.Decimal('30000000') },
      { id: 'ing-2', currentCost: new Prisma.Decimal('30000000') },
    ]);
    txProductCreateMock.mockResolvedValue({
      id: 'p-clamp',
      name: 'Producto clamped',
      cost: '99999999.99',
      marginAmount: '0.00',
      marginPercent: '0.00',
    });

    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto clamped',
        salePrice: '99999999.99',
        minMarginPercent: '30',
        ingredients: [
          { ingredientId: 'ing-1', quantity: '2' },
          { ingredientId: 'ing-2', quantity: '2' },
        ],
      });

    expect(res.status).toBe(201);
    const createData = txProductCreateMock.mock.calls[0]?.[0]?.data as {
      cost: Prisma.Decimal;
      marginAmount: Prisma.Decimal;
      marginPercent: Prisma.Decimal;
    };
    expect(createData.cost.toString()).toBe('99999999.99');
    expect(createData.marginAmount.toString()).toBe('0');
    expect(createData.marginPercent.toString()).toBe('0');
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

  it('oculta quantity cost y margin para COLLABORATOR en la respuesta real del endpoint', async () => {
    setAuthRole('COLLABORATOR');
    const product = {
      id: 'p1',
      accountId: 'account-1',
      name: 'Prod',
      cost: '120.00',
      marginAmount: '30.00',
      marginPercent: '25.00',
      ingredients: [
        {
          ingredientId: 'ing-1',
          quantity: '2.5',
          ingredient: {
            id: 'ing-1',
            name: 'Harina',
            currentCost: '10.00',
          },
        },
      ],
    };
    productFindFirstMock.mockResolvedValue(product);

    const res = await request(buildApp()).get('/api/products/p1');

    expect(res.status).toBe(200);
    expect(res.body.product).not.toHaveProperty('cost');
    expect(res.body.product).not.toHaveProperty('marginAmount');
    expect(res.body.product).not.toHaveProperty('marginPercent');
    expect(res.body.product.ingredients[0]).not.toHaveProperty('quantity');
  });

  it('mantiene quantity cost y margin visibles para ADMIN en la respuesta real del endpoint', async () => {
    setAuthRole('ADMIN');
    const product = {
      id: 'p1',
      accountId: 'account-1',
      name: 'Prod',
      cost: '120.00',
      marginAmount: '30.00',
      marginPercent: '25.00',
      ingredients: [
        {
          ingredientId: 'ing-1',
          quantity: '2.5',
          ingredient: {
            id: 'ing-1',
            name: 'Harina',
            currentCost: '10.00',
          },
        },
      ],
    };
    productFindFirstMock.mockResolvedValue(product);

    const res = await request(buildApp()).get('/api/products/p1');

    expect(res.status).toBe(200);
    expect(res.body.product.cost).toBe('120.00');
    expect(res.body.product.marginAmount).toBe('30.00');
    expect(res.body.product.marginPercent).toBe('25.00');
    expect(res.body.product.ingredients[0].quantity).toBe('2.5');
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

/* Nombres de producto: se guardan tal como los escribe el usuario (#236) y la
 * unicidad por cuenta es case-insensitive. Desde que se quitó el toLowerCase()
 * al guardar, la restricción @@unique([accountId, name]) de Postgres distingue
 * mayúsculas, así que la única barrera contra "Pan de Campo" / "PAN DE CAMPO"
 * es la validación con mode: 'insensitive' de la ruta. */
describe('Nombres de producto: formato original y unicidad case-insensitive', () => {
  const existingProduct = {
    id: 'p1',
    name: 'Pan de Campo',
    salePrice: new Prisma.Decimal('30.00'),
    minMarginPercent: new Prisma.Decimal('10'),
    cost: new Prisma.Decimal('0'),
    marginAmount: new Prisma.Decimal('0'),
    marginPercent: new Prisma.Decimal('0'),
  };

  beforeEach(() => {
    // Prisma siempre devuelve un array; los POST de este bloque van sin receta.
    txIngredientFindManyMock.mockResolvedValue([]);
  });

  it('POST guarda el nombre con las mayúsculas y minúsculas que escribió el usuario', async () => {
    txProductFindFirstMock.mockResolvedValue(null);
    txProductCreateMock.mockResolvedValue({ id: 'p1', name: 'Pan de Campo' });

    const res = await request(buildApp())
      .post('/api/products')
      .send({ name: 'Pan de Campo', salePrice: '30.00', minMarginPercent: '10', ingredients: [] });

    expect(res.status).toBe(201);
    expect(txProductCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Pan de Campo' }) })
    );
  });

  it('POST busca duplicados sin distinguir mayúsculas y dentro de la misma cuenta', async () => {
    txProductFindFirstMock.mockResolvedValue(null);
    txProductCreateMock.mockResolvedValue({ id: 'p2', name: 'PAN DE CAMPO' });

    await request(buildApp())
      .post('/api/products')
      .send({ name: 'PAN DE CAMPO', salePrice: '30.00', minMarginPercent: '10', ingredients: [] });

    expect(txProductFindFirstMock).toHaveBeenCalledWith({
      where: { accountId: 'account-1', name: { equals: 'PAN DE CAMPO', mode: 'insensitive' } },
    });
  });

  it('POST rechaza con 409 un nombre que solo difiere en mayúsculas de uno existente', async () => {
    txProductFindFirstMock.mockResolvedValue(existingProduct);

    const res = await request(buildApp())
      .post('/api/products')
      .send({ name: 'PAN DE CAMPO', salePrice: '30.00', minMarginPercent: '10', ingredients: [] });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Ya existe un producto con ese nombre.');
    expect(txProductCreateMock).not.toHaveBeenCalled();
  });

  it('PUT rechaza con 409 renombrar a un nombre de otro producto con distinto casing', async () => {
    txProductFindFirstMock
      .mockResolvedValueOnce({ ...existingProduct, id: 'p2', name: 'Medialuna' })
      .mockResolvedValueOnce(existingProduct);
    txProductIngredientCountMock.mockResolvedValue(0);

    const res = await request(buildApp())
      .put('/api/products/p2')
      .send({ name: 'pan de campo' });

    expect(res.status).toBe(409);
    expect(txProductFindFirstMock).toHaveBeenLastCalledWith({
      where: { accountId: 'account-1', name: { equals: 'pan de campo', mode: 'insensitive' } },
    });
    expect(txProductUpdateMock).not.toHaveBeenCalled();
  });

  it('PUT permite corregir solo el casing del propio nombre y lo guarda tal cual', async () => {
    txProductFindFirstMock.mockResolvedValueOnce({ ...existingProduct, name: 'pan de campo' });
    txProductIngredientCountMock.mockResolvedValue(0);
    txProductUpdateMock.mockResolvedValue({ id: 'p1', name: 'Pan de Campo' });

    const res = await request(buildApp())
      .put('/api/products/p1')
      .send({ name: 'Pan de Campo' });

    expect(res.status).toBe(200);
    // Solo la búsqueda del producto existente: no hay chequeo de duplicado contra sí mismo
    expect(txProductFindFirstMock).toHaveBeenCalledTimes(1);
    expect(firstUpdateData().name).toBe('Pan de Campo');
  });
});
