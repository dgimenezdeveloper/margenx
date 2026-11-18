import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const accountFindUniqueMock = vi.fn();
const accountFindManyMock = vi.fn();
const productFindManyMock = vi.fn();
const ingredientFindManyMock = vi.fn();
const priceHistoryFindManyMock = vi.fn();
const supplierIngredientFindManyMock = vi.fn();
const getPurchasingSuggestionsMock = vi.fn();

vi.mock('../lib/prisma', () => ({
  prisma: {
    account: {
      findUnique: (...args: unknown[]) => accountFindUniqueMock(...args),
      findMany: (...args: unknown[]) => accountFindManyMock(...args),
    },
    product: { findMany: (...args: unknown[]) => productFindManyMock(...args) },
    ingredient: { findMany: (...args: unknown[]) => ingredientFindManyMock(...args) },
    priceHistory: { findMany: (...args: unknown[]) => priceHistoryFindManyMock(...args) },
    supplierIngredient: {
      findMany: (...args: unknown[]) => supplierIngredientFindManyMock(...args),
    },
  },
}));

vi.mock('./purchasingService', () => ({
  getPurchasingSuggestions: (...args: unknown[]) => getPurchasingSuggestionsMock(...args),
}));

import {
  buildWeeklyMarginReport,
  formatArgentinaIsoDate,
  getActiveReportAccounts,
  getWeeklyMarginReportBySlug,
} from './reportService';

const D = (value: string | number) => new Prisma.Decimal(value);
const BASE_ACCOUNT = {
  id: '30a00000-0000-4000-8000-000000000001',
  businessName: 'Panadería Central',
  slug: 'panaderia-central',
  isActive: true,
  defaultMinMarginPercent: D('30.00'),
};
const EMPTY_SUGGESTIONS = {
  summary: {
    withSavingsCount: 0,
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
const FROM = new Date('2026-11-10T03:00:00.000Z');
const TO = new Date('2026-11-17T03:00:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
  accountFindUniqueMock.mockResolvedValue(BASE_ACCOUNT);
  productFindManyMock.mockResolvedValue([]);
  ingredientFindManyMock.mockResolvedValue([]);
  priceHistoryFindManyMock.mockResolvedValue([]);
  supplierIngredientFindManyMock.mockResolvedValue([]);
  getPurchasingSuggestionsMock.mockResolvedValue(EMPTY_SUGGESTIONS);
});

describe('getActiveReportAccounts', () => {
  it('lista cuentas activas y el correo del primer ADMIN o null', async () => {
    accountFindManyMock.mockResolvedValue([
      {
        id: BASE_ACCOUNT.id,
        slug: BASE_ACCOUNT.slug,
        businessName: BASE_ACCOUNT.businessName,
        users: [{ email: 'admin.panaderia@seed.example.test' }],
      },
      {
        id: '30a00000-0000-4000-8000-000000000002',
        slug: 'quimica-gyj',
        businessName: 'Química GyJ',
        users: [],
      },
    ]);

    await expect(getActiveReportAccounts()).resolves.toEqual([
      {
        id: BASE_ACCOUNT.id,
        slug: BASE_ACCOUNT.slug,
        businessName: BASE_ACCOUNT.businessName,
        ownerEmail: 'admin.panaderia@seed.example.test',
      },
      {
        id: '30a00000-0000-4000-8000-000000000002',
        slug: 'quimica-gyj',
        businessName: 'Química GyJ',
        ownerEmail: null,
      },
    ]);
    expect(accountFindManyMock).toHaveBeenCalledWith({
      where: { isActive: true },
      select: {
        id: true,
        slug: true,
        businessName: true,
        users: {
          where: { role: 'ADMIN' },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { email: true },
        },
      },
      orderBy: { businessName: 'asc' },
    });
  });
});

describe('buildWeeklyMarginReport', () => {
  it('devuelve 404 para cuentas inexistentes o inactivas y 400 para un rango inválido', async () => {
    accountFindUniqueMock.mockResolvedValueOnce(null);
    await expect(buildWeeklyMarginReport('missing-id', { from: FROM, to: TO }))
      .rejects.toMatchObject({ statusCode: 404 });

    accountFindUniqueMock.mockResolvedValueOnce({ ...BASE_ACCOUNT, isActive: false });
    await expect(buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: FROM, to: TO }))
      .rejects.toMatchObject({ statusCode: 404 });

    await expect(buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: TO, to: FROM }))
      .rejects.toMatchObject({ statusCode: 400 });
    await expect(
      buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: new Date(Number.NaN), to: TO })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('devuelve el contrato vacío y establece el período y las secciones del reporte', async () => {
    const report = await buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: FROM, to: TO });

    expect(report.account).toEqual({
      id: BASE_ACCOUNT.id,
      businessName: BASE_ACCOUNT.businessName,
      slug: BASE_ACCOUNT.slug,
      defaultMinMarginPercent: '30.00',
    });
    expect(report.period).toEqual({
      from: FROM.toISOString(),
      to: TO.toISOString(),
      timezone: 'America/Argentina/Buenos_Aires',
      fromFormatted: '10/11/2026',
      toFormatted: '17/11/2026',
    });
    expect(report.generatedAt).toBe(TO.toISOString());
    expect(report.catalogHealth).toEqual({
      totalProducts: 0,
      activeIngredientsCount: 0,
      criticalProductsCount: 0,
      healthyProductsCount: 0,
      averageMarginPercent: 0,
      lossCount: 0,
      riskCount: 0,
      targetCount: 0,
      surplusCount: 0,
      draftCount: 0,
    });
    expect(report.belowMinimumProducts).toEqual({ totalCount: 0, items: [] });
    expect(report.weeklyCostChanges).toEqual({ totalCount: 0, items: [] });
    expect(report.quarantine).toEqual({ totalCount: 0, items: [] });
    expect(report.purchasingSavings).toEqual({ totalCount: 0, items: [] });
    expect(report.staleCosts).toEqual({ totalCount: 0, thresholdDays: 30, items: [] });
  });

  it('comparte los buckets y la mediana del dashboard y limita los productos bajo el mínimo a 20', async () => {
    const product = (id: string, margin: string, ingredientsCount: number) => ({
      id,
      name: `Producto ${id}`,
      salePrice: D('900.00'),
      cost: D('1200.00'),
      marginPercent: D(margin),
      minMarginPercent: D('30.00'),
      _count: { ingredients: ingredientsCount },
    });

    productFindManyMock.mockResolvedValue([
      ...Array.from({ length: 40 }, (_, i) => product(`loss-${i}`, String(-40 + i * 0.5), 3)),
      ...Array.from({ length: 64 }, (_, i) => product(`risk-${i}`, '22.00', 4)),
      ...Array.from({ length: 130 }, (_, i) => product(`target-${i}`, '45.00', 4)),
      ...Array.from({ length: 90 }, (_, i) => product(`surplus-${i}`, '68.00', 5)),
      ...Array.from({ length: 15 }, (_, i) => product(`draft-${i}`, '0.00', 0)),
    ]);

    const report = await buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: FROM, to: TO });

    expect(report.catalogHealth).toMatchObject({
      totalProducts: 339,
      lossCount: 40,
      riskCount: 64,
      targetCount: 130,
      surplusCount: 90,
      draftCount: 15,
      criticalProductsCount: 104,
      healthyProductsCount: 220,
      averageMarginPercent: 45,
    });
    expect(report.belowMinimumProducts.totalCount).toBe(104);
    expect(report.belowMinimumProducts.items).toHaveLength(20);
    expect(report.belowMinimumProducts.items[0]).toEqual({
      productId: 'loss-0',
      name: 'Producto loss-0',
      salePrice: '900.00',
      cost: '1200.00',
      marginPercent: '-40.00',
      minMarginPercent: '30.00',
      suggestedSalePrice: '1714.29',
      status: 'loss',
    });
  });

  it('aplica precio sugerido alternativo para mínimo de margen igual o superior a 100%', async () => {
    productFindManyMock.mockResolvedValue([
      {
        id: 'p-100',
        name: 'Producto objetivo extremo',
        salePrice: D('600.00'),
        cost: D('500.00'),
        marginPercent: D('16.67'),
        minMarginPercent: D('100.00'),
        _count: { ingredients: 1 },
      },
    ]);

    const report = await buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: FROM, to: TO });
    expect(report.belowMinimumProducts.items[0]?.suggestedSalePrice).toBe('1000.00');
  });

  it('ordena cambios de costo por variación absoluta y expone hasta diez', async () => {
    priceHistoryFindManyMock.mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => ({
        id: `ph-${i + 1}`,
        ingredientId: `ing-${i + 1}`,
        oldCost: D('1000.00'),
        newCost: D(i === 5 ? '400.00' : String(1000 + (i + 1) * 50)),
        changedAt: new Date(`2026-11-12T12:${String(i).padStart(2, '0')}:00.000Z`),
        ingredient: {
          id: `ing-${i + 1}`,
          name: `Insumo ${i + 1}`,
          unit: 'kg',
          _count: { products: i + 1 },
        },
      }))
    );

    const report = await buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: FROM, to: TO });

    expect(report.weeklyCostChanges.totalCount).toBe(12);
    expect(report.weeklyCostChanges.items).toHaveLength(10);
    expect(report.weeklyCostChanges.items[0]).toMatchObject({
      ingredientId: 'ing-12',
      variationPercent: '60.00',
      affectedProductsCount: 12,
    });
    expect(report.weeklyCostChanges.items[1]).toMatchObject({
      ingredientId: 'ing-6',
      variationPercent: '-60.00',
      affectedProductsCount: 6,
    });
  });

  it('calcula los costos unitarios y variación de cuarentena y limita a los cinco más antiguos', async () => {
    supplierIngredientFindManyMock.mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => ({
        id: `q-${i + 1}`,
        supplierId: `sup-${i + 1}`,
        ingredientId: `ing-${i + 1}`,
        packageSize: D('25.000'),
        packageUnit: 'kg',
        packagePrice: D('10000.00'),
        pendingPackagePrice: D(String(16000 + i * 1000)),
        quarantinedAt: new Date(`2026-11-${String(10 + i).padStart(2, '0')}T10:00:00.000Z`),
        quarantineReason: 'VARIACION_MAYOR_50_POR_CIENTO',
        isDefault: true,
        ingredient: { id: `ing-${i + 1}`, name: `Insumo ${i + 1}`, unit: 'kg' },
        supplier: { id: `sup-${i + 1}`, name: `Proveedor ${i + 1}` },
      }))
    );

    const report = await buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: FROM, to: TO });

    expect(report.quarantine.totalCount).toBe(7);
    expect(report.quarantine.items).toHaveLength(5);
    expect(report.quarantine.items[0]).toMatchObject({
      supplierIngredientId: 'q-1',
      ingredientName: 'Insumo 1',
      supplierName: 'Proveedor 1',
      currentUnitCost: '400.00',
      proposedUnitCost: '640.00',
      variationPercent: '60.00',
    });
  });

  it('ordena las oportunidades de ahorro de compras por ahorro de paquete', async () => {
    const suggestions = Array.from({ length: 7 }, (_, i) => ({
      ingredientId: `ing-${i + 1}`,
      ingredientName: `Insumo ${i + 1}`,
      unit: 'kg',
      currentCost: '1000.00',
      defaultPresentation: {
        supplierIngredientId: `si-def-${i + 1}`,
        supplierId: 'sup-def',
        supplierName: 'Proveedor Actual',
        supplierCode: null,
        rawDescription: null,
        packageSize: '25',
        packageUnit: 'kg',
        packagePrice: '25000.00',
        unitCost: '1000.00',
      },
      cheapestPresentation: {
        supplierIngredientId: `si-best-${i + 1}`,
        supplierId: 'sup-best',
        supplierName: 'Proveedor Más Barato',
        supplierCode: null,
        rawDescription: null,
        packageSize: '25',
        packageUnit: 'kg',
        packagePrice: '20000.00',
        unitCost: '800.00',
      },
      savingsPerUnit: '200.00',
      savingsPercent: '20.00',
      packageSavings: `${(i + 1) * 500}.00`,
    }));
    getPurchasingSuggestionsMock.mockResolvedValue({
      ...EMPTY_SUGGESTIONS,
      byIngredient: suggestions,
    });

    const report = await buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: FROM, to: TO });

    expect(report.purchasingSavings.totalCount).toBe(7);
    expect(report.purchasingSavings.items).toHaveLength(5);
    expect(report.purchasingSavings.items[0]).toMatchObject({
      ingredientId: 'ing-7',
      packageSavings: '3500.00',
      bestSupplierName: 'Proveedor Más Barato',
    });
  });

  it('detecta costos con más de 30 días usando PriceHistory y updatedAt de respaldo', async () => {
    ingredientFindManyMock.mockResolvedValue([
      {
        id: 'ing-old-history',
        name: 'Levadura',
        unit: 'kg',
        currentCost: D('6000.00'),
        updatedAt: new Date('2026-11-16T00:00:00.000Z'),
        priceHistory: [{ changedAt: new Date('2026-10-01T03:00:00.000Z') }],
      },
      {
        id: 'ing-old-no-history',
        name: 'Sal fina',
        unit: 'kg',
        currentCost: D('472.26'),
        updatedAt: new Date('2026-10-10T03:00:00.000Z'),
        priceHistory: [],
      },
      {
        id: 'ing-fresh',
        name: 'Harina 000',
        unit: 'kg',
        currentCost: D('736.25'),
        updatedAt: new Date('2026-11-01T03:00:00.000Z'),
        priceHistory: [{ changedAt: new Date('2026-11-10T03:00:00.000Z') }],
      },
    ]);

    const report = await buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: FROM, to: TO });

    expect(report.catalogHealth.activeIngredientsCount).toBe(3);
    expect(report.staleCosts.totalCount).toBe(2);
    expect(report.staleCosts.items).toEqual([
      {
        ingredientId: 'ing-old-history',
        name: 'Levadura',
        unit: 'kg',
        currentCost: '6000.00',
        lastUpdatedAt: '2026-10-01T03:00:00.000Z',
        daysWithoutUpdate: 47,
      },
      {
        ingredientId: 'ing-old-no-history',
        name: 'Sal fina',
        unit: 'kg',
        currentCost: '472.26',
        lastUpdatedAt: '2026-10-10T03:00:00.000Z',
        daysWithoutUpdate: 38,
      },
    ]);
    expect(ingredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: BASE_ACCOUNT.id },
        select: expect.objectContaining({
          priceHistory: {
            where: { changedAt: { lte: TO } },
            orderBy: { changedAt: 'desc' },
            take: 1,
            select: { changedAt: true },
          },
        }),
      })
    );
  });

  it('resuelve cuentas activas por slug y rechaza las inexistentes o inactivas', async () => {
    accountFindUniqueMock.mockResolvedValueOnce(null);
    await expect(getWeeklyMarginReportBySlug('no-existe'))
      .rejects.toMatchObject({ statusCode: 404 });

    accountFindUniqueMock.mockResolvedValueOnce({ id: BASE_ACCOUNT.id, isActive: false });
    await expect(getWeeklyMarginReportBySlug(BASE_ACCOUNT.slug))
      .rejects.toMatchObject({ statusCode: 404 });

    accountFindUniqueMock
      .mockResolvedValueOnce({ id: BASE_ACCOUNT.id, isActive: true })
      .mockResolvedValueOnce(BASE_ACCOUNT);
    const report = await getWeeklyMarginReportBySlug(BASE_ACCOUNT.slug, { from: FROM, to: TO });
    expect(report.account.slug).toBe(BASE_ACCOUNT.slug);
  });
});

describe('formatArgentinaIsoDate', () => {
  it('formatea la fecha AAAA-MM-DD según el huso horario de Argentina', () => {
    expect(formatArgentinaIsoDate(new Date('2026-11-18T01:00:00.000Z'))).toBe('2026-11-17');
  });
});

describe('buildWeeklyMarginReport - aislamiento por cuenta (#390)', () => {
  it('cada consulta del reporte se acota a la cuenta pedida', async () => {
    await buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: FROM, to: TO });

    // Productos: costos, márgenes, buckets y mediana
    expect(productFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { accountId: BASE_ACCOUNT.id } })
    );
    // Insumos: costos sin actualizar
    expect(ingredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { accountId: BASE_ACCOUNT.id } })
    );
    // Cambios de costo de la semana
    expect(priceHistoryFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ingredient: { accountId: BASE_ACCOUNT.id } }),
      })
    );
    // Precios retenidos en cuarentena
    expect(supplierIngredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ingredient: { accountId: BASE_ACCOUNT.id },
          isQuarantined: true,
        }),
      })
    );
    // Oportunidades de ahorro
    expect(getPurchasingSuggestionsMock).toHaveBeenCalledWith(BASE_ACCOUNT.id);
  });
});
