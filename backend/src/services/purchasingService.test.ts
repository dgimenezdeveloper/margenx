import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { applyBatchIngredientCostChanges } from './marginCalculator';
const ingredientFindManyMock = vi.fn();
const ingredientFindFirstMock = vi.fn();
const supplierIngredientFindManyMock = vi.fn();

vi.mock('../lib/prisma', () => ({
  prisma: {
    ingredient: {
      findMany: (...args: unknown[]) => ingredientFindManyMock(...args),
      findFirst: (...args: unknown[]) => ingredientFindFirstMock(...args),
    },
    supplierIngredient: {
      findMany: (...args: unknown[]) => supplierIngredientFindManyMock(...args),
    },
  },
}));

import {
  getPurchasingSuggestions,
  previewPurchasingOrder,
  getPurchasingMarginImpact,
  getIngredientMarginImpact,
} from './purchasingService';
import { AppError } from '../middlewares/errorHandler';

const D = (v: string | number) => new Prisma.Decimal(v);

function makePresentation(overrides: {
  id: string;
  supplierId: string;
  supplierName: string;
  ingredientId?: string;
  ingredientName?: string;
  unit?: string;
  packageSize: string;
  packagePrice: string;
  pendingPackagePrice?: string | null;
  isDefault?: boolean;
  isQuarantined?: boolean;
  quarantineReason?: string | null;
  isActive?: boolean;
  supplierCode?: string | null;
}) {
  return {
    id: overrides.id,
    supplierId: overrides.supplierId,
    ingredientId: overrides.ingredientId ?? 'ing-harina',
    supplierCode: overrides.supplierCode ?? null,
    rawDescription: null,
    packageSize: D(overrides.packageSize),
    packageUnit: overrides.unit ?? 'kg',
    packagePrice: D(overrides.packagePrice),
    pendingPackagePrice: overrides.pendingPackagePrice ? D(overrides.pendingPackagePrice) : null,
    isDefault: overrides.isDefault ?? false,
    isQuarantined: overrides.isQuarantined ?? false,
    quarantinedAt: overrides.isQuarantined ? new Date('2026-11-15T10:00:00.000Z') : null,
    quarantineReason: overrides.quarantineReason ?? null,
    supplier: {
      id: overrides.supplierId,
      accountId: 'account-1',
      name: overrides.supplierName,
      contactPhone: null,
      email: null,
      address: null,
      isActive: overrides.isActive ?? true,
    },
    ingredient: {
      id: overrides.ingredientId ?? 'ing-harina',
      name: overrides.ingredientName ?? 'Harina 000',
      unit: overrides.unit ?? 'kg',
      currentCost: D('900.00'),
    },
  };
}

beforeEach(() => {
  ingredientFindManyMock.mockReset();
  ingredientFindFirstMock.mockReset();
  supplierIngredientFindManyMock.mockReset();
});

describe('purchasingService.getPurchasingSuggestions', () => {
  it('Gherkin "Ahorro por insumo": Harina $900/kg (Molino Cañuelas) vs $880/kg (Distribuidora del Centro) -> ahorro $20/kg (2,22 %)', async () => {
    ingredientFindManyMock.mockResolvedValue([
      {
        id: 'ing-harina',
        name: 'Harina 000',
        unit: 'kg',
        currentCost: D('900.00'),
        suppliers: [
          makePresentation({
            id: 'si-molino',
            supplierId: 'sup-molino',
            supplierName: 'Molino Cañuelas',
            packageSize: '50.000',
            packagePrice: '45000.00',
            isDefault: true,
            supplierCode: 'MC-990',
          }),
          makePresentation({
            id: 'si-centro',
            supplierId: 'sup-centro',
            supplierName: 'Distribuidora del Centro',
            packageSize: '25.000',
            packagePrice: '22000.00',
            isDefault: false,
            supplierCode: '5521',
          }),
        ],
      },
    ]);

    const result = await getPurchasingSuggestions('account-1');

    expect(ingredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: 'account-1' },
        select: expect.objectContaining({
          suppliers: expect.objectContaining({
            where: { supplier: { accountId: 'account-1' } },
          }),
        }),
      })
    );
    expect(result.summary).toEqual({
      withSavingsCount: 1,
      alreadyBestPriceCount: 0,
      singleSupplierCount: 0,
      withoutEligibleSupplierCount: 0,
      withoutActiveDefaultCount: 0,
      quarantinedExcludedCount: 0,
    });
    expect(result.byIngredient).toEqual([
      expect.objectContaining({
        ingredientId: 'ing-harina',
        ingredientName: 'Harina 000',
        unit: 'kg',
        currentCost: '900.00',
        savingsPerUnit: '20.00',
        savingsPercent: '2.22',
        packageSavings: '500.00',
        defaultPresentation: expect.objectContaining({
          supplierId: 'sup-molino',
          unitCost: '900.00',
        }),
        cheapestPresentation: expect.objectContaining({
          supplierIngredientId: 'si-centro',
          supplierId: 'sup-centro',
          supplierCode: '5521',
          unitCost: '880.00',
        }),
      }),
    ]);
    expect(result.bySupplier).toHaveLength(1);
    expect(result.bySupplier[0]).toMatchObject({
      supplierId: 'sup-centro',
      supplierName: 'Distribuidora del Centro',
      itemsCount: 1,
      totalPackageSavings: '500.00',
    });
  });

  it('Gherkin "Cuarentena y proveedores inactivos": excluye presentaciones en cuarentena o de proveedores inactivos y las informa aparte', async () => {
    ingredientFindManyMock.mockResolvedValue([
      {
        id: 'ing-harina',
        name: 'Harina 000',
        unit: 'kg',
        currentCost: D('900.00'),
        suppliers: [
          makePresentation({
            id: 'si-molino',
            supplierId: 'sup-molino',
            supplierName: 'Molino Cañuelas',
            packageSize: '50.000',
            packagePrice: '45000.00',
            isDefault: true,
          }),
          makePresentation({
            id: 'si-quar',
            supplierId: 'sup-quar',
            supplierName: 'Proveedor Cuarentena',
            packageSize: '25.000',
            packagePrice: '10000.00',
            pendingPackagePrice: '5000.00',
            isQuarantined: true,
            quarantineReason: 'VARIACION_MAYOR_50_POR_CIENTO',
          }),
          makePresentation({
            id: 'si-inact',
            supplierId: 'sup-inact',
            supplierName: 'Proveedor Inactivo',
            packageSize: '25.000',
            packagePrice: '12500.00',
            isActive: false,
          }),
        ],
      },
    ]);

    const result = await getPurchasingSuggestions('account-1');

    expect(result.byIngredient).toEqual([]);
    expect(result.bySupplier).toEqual([]);
    expect(result.summary).toEqual({
      withSavingsCount: 0,
      alreadyBestPriceCount: 0,
      singleSupplierCount: 1,
      withoutEligibleSupplierCount: 0,
      withoutActiveDefaultCount: 0,
      quarantinedExcludedCount: 1,
    });
    expect(result.quarantinedExcluded).toEqual([
      expect.objectContaining({
        supplierIngredientId: 'si-quar',
        supplierName: 'Proveedor Cuarentena',
        ingredientName: 'Harina 000',
        packagePrice: '10000.00',
        pendingPackagePrice: '5000.00',
        quarantineReason: 'VARIACION_MAYOR_50_POR_CIENTO',
      }),
    ]);
  });

  it('empate de precios con la predeterminada: clasifica como alreadyBestPrice sin sugerir cambio', async () => {
    ingredientFindManyMock.mockResolvedValue([
      {
        id: 'ing-azucar',
        name: 'Azúcar común',
        unit: 'kg',
        currentCost: D('1140.00'),
        suppliers: [
          makePresentation({
            id: 'si-alt',
            supplierId: 'sup-alt',
            supplierName: 'Alternativo',
            ingredientId: 'ing-azucar',
            ingredientName: 'Azúcar común',
            packageSize: '10.000',
            packagePrice: '11400.00',
            isDefault: false,
          }),
          makePresentation({
            id: 'si-def',
            supplierId: 'sup-def',
            supplierName: 'Predeterminado',
            ingredientId: 'ing-azucar',
            ingredientName: 'Azúcar común',
            packageSize: '25.000',
            packagePrice: '28500.00',
            isDefault: true,
          }),
        ],
      },
    ]);

    const result = await getPurchasingSuggestions('account-1');

    expect(result.byIngredient).toEqual([]);
    expect(result.summary.alreadyBestPriceCount).toBe(1);
    expect(result.alreadyBestPrice).toHaveLength(1);
    expect(result.alreadyBestPrice[0]).toMatchObject({
      ingredientId: 'ing-azucar',
      unitCost: '1140.00',
    });
  });

  it('empate entre dos no predeterminadas más baratas: desempata por menor precio del bulto y nombre', async () => {
    ingredientFindManyMock.mockResolvedValue([
      {
        id: 'ing-harina',
        name: 'Harina 000',
        unit: 'kg',
        currentCost: D('900.00'),
        suppliers: [
          makePresentation({
            id: 'si-def',
            supplierId: 'sup-def',
            supplierName: 'Molino Cañuelas',
            packageSize: '50.000',
            packagePrice: '45000.00',
            isDefault: true,
          }),
          makePresentation({
            id: 'si-grande',
            supplierId: 'sup-grande',
            supplierName: 'Alpha Mayorista',
            packageSize: '50.000',
            packagePrice: '44000.00',
          }),
          makePresentation({
            id: 'si-chico',
            supplierId: 'sup-chico',
            supplierName: 'Beta Distribuidora',
            packageSize: '25.000',
            packagePrice: '22000.00',
          }),
        ],
      },
    ]);

    const result = await getPurchasingSuggestions('account-1');

    expect(result.byIngredient[0]?.cheapestPresentation.supplierId).toBe('sup-chico');
  });

  it('empate en unitCost y packagePrice entre dos no predeterminadas: desempata alfabéticamente por proveedor', async () => {
    ingredientFindManyMock.mockResolvedValue([
      {
        id: 'ing-harina',
        name: 'Harina 000',
        unit: 'kg',
        currentCost: D('900.00'),
        suppliers: [
          makePresentation({
            id: 'si-def',
            supplierId: 'sup-def',
            supplierName: 'Molino Cañuelas',
            packageSize: '50.000',
            packagePrice: '45000.00',
            isDefault: true,
          }),
          makePresentation({
            id: 'si-zeta',
            supplierId: 'sup-zeta',
            supplierName: 'Zeta Distribuidora',
            packageSize: '25.000',
            packagePrice: '22000.00',
          }),
          makePresentation({
            id: 'si-alfa',
            supplierId: 'sup-alfa',
            supplierName: 'Alfa Mayorista',
            packageSize: '25.000',
            packagePrice: '22000.00',
          }),
        ],
      },
    ]);

    const result = await getPurchasingSuggestions('account-1');

    expect(result.byIngredient[0]?.cheapestPresentation.supplierId).toBe('sup-alfa');
  });

  it('redondeo ROUND_HALF_UP con decimales periódicos (10000 / 3 = 3333.33)', async () => {
    ingredientFindManyMock.mockResolvedValue([
      {
        id: 'ing-ricota',
        name: 'Ricota',
        unit: 'kg',
        currentCost: D('4000.00'),
        suppliers: [
          makePresentation({
            id: 'si-def',
            supplierId: 'sup-def',
            supplierName: 'Don Roque',
            ingredientId: 'ing-ricota',
            ingredientName: 'Ricota',
            packageSize: '5.000',
            packagePrice: '20000.00',
            isDefault: true,
          }),
          makePresentation({
            id: 'si-barato',
            supplierId: 'sup-barato',
            supplierName: 'Lácteos Sur',
            ingredientId: 'ing-ricota',
            ingredientName: 'Ricota',
            packageSize: '3.000',
            packagePrice: '10000.00',
          }),
        ],
      },
    ]);

    const result = await getPurchasingSuggestions('account-1');

    expect(result.byIngredient[0]).toMatchObject({
      savingsPerUnit: '666.67',
      savingsPercent: '16.67',
      packageSavings: '2000.00',
      cheapestPresentation: expect.objectContaining({ unitCost: '3333.33' }),
    });
  });

  it('clasifica insumos sin proveedores elegibles e insumos con >=2 elegibles sin default activo', async () => {
    ingredientFindManyMock.mockResolvedValue([
      {
        id: 'ing-sin-prov',
        name: 'Sal fina',
        unit: 'kg',
        currentCost: D('470.00'),
        suppliers: [],
      },
      {
        id: 'ing-sin-default',
        name: 'Levadura',
        unit: 'kg',
        currentCost: D('6000.00'),
        suppliers: [
          makePresentation({
            id: 'si-inactivo-def',
            supplierId: 'sup-inact',
            supplierName: 'Inactivo',
            ingredientId: 'ing-sin-default',
            ingredientName: 'Levadura',
            packageSize: '10.000',
            packagePrice: '60000.00',
            isDefault: true,
            isActive: false,
          }),
          makePresentation({
            id: 'si-a',
            supplierId: 'sup-a',
            supplierName: 'Prov A',
            ingredientId: 'ing-sin-default',
            ingredientName: 'Levadura',
            packageSize: '10.000',
            packagePrice: '55000.00',
          }),
          makePresentation({
            id: 'si-b',
            supplierId: 'sup-b',
            supplierName: 'Prov B',
            ingredientId: 'ing-sin-default',
            ingredientName: 'Levadura',
            packageSize: '10.000',
            packagePrice: '58000.00',
          }),
        ],
      },
    ]);

    const result = await getPurchasingSuggestions('account-1');

    expect(result.summary.withoutEligibleSupplierCount).toBe(1);
    expect(result.summary.withoutActiveDefaultCount).toBe(1);
    expect(result.byIngredient).toEqual([]);
  });
});

describe('purchasingService.previewPurchasingOrder', () => {
  it('Gherkin "Pedido sugerido": agrupa en dos proveedores con subtotales, total y ahorro con Decimal', async () => {
    const harinaCentro = makePresentation({
      id: 'si-harina-centro',
      supplierId: 'sup-centro',
      supplierName: 'Distribuidora del Centro',
      ingredientId: 'ing-harina',
      ingredientName: 'Harina 000',
      packageSize: '25.000',
      packagePrice: '22000.00',
      supplierCode: '5521',
    });
    const mantecaMarjuanc = makePresentation({
      id: 'si-manteca-marjuanc',
      supplierId: 'sup-marjuanc',
      supplierName: 'Distribuidora MarJuanC Alimentos',
      ingredientId: 'ing-manteca',
      ingredientName: 'Manteca en bloque',
      packageSize: '5.000',
      packagePrice: '50254.70',
      isDefault: true,
      supplierCode: 'CRE101',
    });

    supplierIngredientFindManyMock
      .mockResolvedValueOnce([harinaCentro, mantecaMarjuanc])
      .mockResolvedValueOnce([
        {
          id: 'si-harina-default',
          ingredientId: 'ing-harina',
          packageSize: D('50.000'),
          packagePrice: D('45000.00'),
        },
        {
          id: 'si-manteca-marjuanc',
          ingredientId: 'ing-manteca',
          packageSize: D('5.000'),
          packagePrice: D('50254.70'),
        },
      ]);

    const result = await previewPurchasingOrder('account-1', [
      { supplierIngredientId: 'si-harina-centro', packages: 2 },
      { supplierIngredientId: 'si-manteca-marjuanc', packages: 1 },
    ]);

    expect(result.itemsCount).toBe(2);
    expect(result.totalPackages).toBe(3);
    expect(result.total).toBe('94254.70');
    expect(result.totalSavings).toBe('1000.00');
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0]).toMatchObject({
      supplierId: 'sup-centro',
      supplierName: 'Distribuidora del Centro',
      subtotal: '44000.00',
      savings: '1000.00',
    });
    expect(result.groups[1]).toMatchObject({
      supplierId: 'sup-marjuanc',
      supplierName: 'Distribuidora MarJuanC Alimentos',
      subtotal: '50254.70',
      savings: '0.00',
    });
    expect(supplierIngredientFindManyMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          id: { in: ['si-harina-centro', 'si-manteca-marjuanc'] },
          supplier: { accountId: 'account-1' },
          ingredient: { accountId: 'account-1' },
        },
      })
    );
    expect(supplierIngredientFindManyMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          ingredientId: { in: ['ing-harina', 'ing-manteca'] },
          isDefault: true,
          isQuarantined: false,
          supplier: { accountId: 'account-1', isActive: true },
        },
      })
    );
  });

  it('rechaza con 404 si alguna presentación no existe o pertenece a otra cuenta y filtra por accountId', async () => {
    supplierIngredientFindManyMock.mockImplementationOnce(
      async ({
        where,
      }: {
        where?: {
          id?: { in?: string[] };
          supplier?: { accountId?: string };
          ingredient?: { accountId?: string };
        };
      }) => {
        const foreignRow = makePresentation({
          id: 'si-ajeno',
          supplierId: 'sup-ajeno',
          supplierName: 'Proveedor Cuenta B',
          packageSize: '25.000',
          packagePrice: '20000.00',
        });
        const matchesId = !where?.id?.in || where.id.in.includes(foreignRow.id);
        const matchesSupplierAccount =
          !where?.supplier?.accountId || where.supplier.accountId === 'account-2';
        const matchesIngredientAccount =
          !where?.ingredient?.accountId || where.ingredient.accountId === 'account-2';

        return matchesId && matchesSupplierAccount && matchesIngredientAccount ? [foreignRow] : [];
      }
    );

    await expect(
      previewPurchasingOrder('account-1', [{ supplierIngredientId: 'si-ajeno', packages: 1 }])
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(supplierIngredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where:
          {
            id: { in: ['si-ajeno'] },
            supplier: { accountId: 'account-1' },
            ingredient: { accountId: 'account-1' },
          },
      })
    );
  });

  it('rechaza con 400 si se repite el mismo supplierIngredientId', async () => {
    await expect(
      previewPurchasingOrder('account-1', [
        { supplierIngredientId: 'si-1', packages: 1 },
        { supplierIngredientId: 'si-1', packages: 2 },
      ])
    ).rejects.toBeInstanceOf(AppError);
    expect(supplierIngredientFindManyMock).not.toHaveBeenCalled();
  });

  it('rechaza con 422 si el proveedor está inactivo o la presentación está en cuarentena', async () => {
    supplierIngredientFindManyMock.mockResolvedValueOnce([
      makePresentation({
        id: 'si-inact',
        supplierId: 'sup-inact',
        supplierName: 'Inactivo',
        packageSize: '10.000',
        packagePrice: '1000.00',
        isActive: false,
      }),
    ]);

    await expect(
      previewPurchasingOrder('account-1', [{ supplierIngredientId: 'si-inact', packages: 1 }])
    ).rejects.toMatchObject({ statusCode: 422 });

    supplierIngredientFindManyMock.mockResolvedValueOnce([
      makePresentation({
        id: 'si-quar',
        supplierId: 'sup-quar',
        supplierName: 'Cuarentena',
        packageSize: '10.000',
        packagePrice: '1000.00',
        isQuarantined: true,
      }),
    ]);

    await expect(
      previewPurchasingOrder('account-1', [{ supplierIngredientId: 'si-quar', packages: 1 }])
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('si no hay presentación predeterminada activa para un insumo, calcula ahorro 0.00 sin fallar', async () => {
    supplierIngredientFindManyMock
      .mockResolvedValueOnce([
        makePresentation({
          id: 'si-1',
          supplierId: 'sup-1',
          supplierName: 'Prov 1',
          packageSize: '10.000',
          packagePrice: '10000.00',
          isDefault: false,
        }),
      ])
      .mockResolvedValueOnce([]);

    const result = await previewPurchasingOrder('account-1', [
      { supplierIngredientId: 'si-1', packages: 2 },
    ]);

    expect(result.total).toBe('20000.00');
    expect(result.totalSavings).toBe('0.00');
    expect(result.groups[0]?.items[0]?.defaultUnitCost).toBeNull();
  });

  it('si la presentación predeterminada está en cuarentena, informa defaultUnitCost: null y savings: "0.00"', async () => {
    const harinaAlternativa = makePresentation({
      id: 'si-harina-centro',
      supplierId: 'sup-centro',
      supplierName: 'Distribuidora del Centro',
      ingredientId: 'ing-harina',
      ingredientName: 'Harina 000',
      packageSize: '25.000',
      packagePrice: '22000.00',
    });
    const defaultEnCuarentena = {
      id: 'si-harina-def',
      ingredientId: 'ing-harina',
      packageSize: D('50.000'),
      packagePrice: D('45000.00'),
      isDefault: true,
      isQuarantined: true,
      supplier: { accountId: 'account-1', isActive: true },
    };

    supplierIngredientFindManyMock
      .mockResolvedValueOnce([harinaAlternativa])
      .mockImplementationOnce(
        async ({
          where,
        }: {
          where?: {
            isQuarantined?: boolean;
            supplier?: { accountId?: string; isActive?: boolean };
          };
        }) => {
          const matchesQuarantine =
            where?.isQuarantined === undefined ||
            where.isQuarantined === defaultEnCuarentena.isQuarantined;
          const matchesActive =
            where?.supplier?.isActive === undefined ||
            where.supplier.isActive === defaultEnCuarentena.supplier.isActive;
          return matchesQuarantine && matchesActive ? [defaultEnCuarentena] : [];
        }
      );

    const result = await previewPurchasingOrder('account-1', [
      { supplierIngredientId: 'si-harina-centro', packages: 2 },
    ]);

    expect(supplierIngredientFindManyMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          ingredientId: { in: ['ing-harina'] },
          isDefault: true,
          isQuarantined: false,
          supplier: { accountId: 'account-1', isActive: true },
        },
      })
    );
    expect(result.total).toBe('44000.00');
    expect(result.totalSavings).toBe('0.00');
    expect(result.groups[0]?.savings).toBe('0.00');
    expect(result.groups[0]?.items[0]).toMatchObject({
      defaultUnitCost: null,
      savings: '0.00',
    });
  });

  it('si la presentación predeterminada pertenece a un proveedor inactivo, informa defaultUnitCost: null y savings: "0.00"', async () => {
    const harinaAlternativa = makePresentation({
      id: 'si-harina-centro',
      supplierId: 'sup-centro',
      supplierName: 'Distribuidora del Centro',
      ingredientId: 'ing-harina',
      ingredientName: 'Harina 000',
      packageSize: '25.000',
      packagePrice: '22000.00',
    });
    const defaultProveedorInactivo = {
      id: 'si-harina-def',
      ingredientId: 'ing-harina',
      packageSize: D('50.000'),
      packagePrice: D('45000.00'),
      isDefault: true,
      isQuarantined: false,
      supplier: { accountId: 'account-1', isActive: false },
    };

    supplierIngredientFindManyMock
      .mockResolvedValueOnce([harinaAlternativa])
      .mockImplementationOnce(
        async ({
          where,
        }: {
          where?: {
            isQuarantined?: boolean;
            supplier?: { accountId?: string; isActive?: boolean };
          };
        }) => {
          const matchesQuarantine =
            where?.isQuarantined === undefined ||
            where.isQuarantined === defaultProveedorInactivo.isQuarantined;
          const matchesActive =
            where?.supplier?.isActive === undefined ||
            where.supplier.isActive === defaultProveedorInactivo.supplier.isActive;
          return matchesQuarantine && matchesActive ? [defaultProveedorInactivo] : [];
        }
      );

    const result = await previewPurchasingOrder('account-1', [
      { supplierIngredientId: 'si-harina-centro', packages: 2 },
    ]);

    expect(supplierIngredientFindManyMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          ingredientId: { in: ['ing-harina'] },
          isDefault: true,
          isQuarantined: false,
          supplier: { accountId: 'account-1', isActive: true },
        },
      })
    );
    expect(result.total).toBe('44000.00');
    expect(result.totalSavings).toBe('0.00');
    expect(result.groups[0]?.savings).toBe('0.00');
    expect(result.groups[0]?.items[0]).toMatchObject({
      defaultUnitCost: null,
      savings: '0.00',
    });
  });

  it('agrupa múltiples ítems del mismo proveedor sumando subtotal, ahorro y bultos en un único grupo', async () => {
    const harinaCentro = makePresentation({
      id: 'si-harina-centro',
      supplierId: 'sup-centro',
      supplierName: 'Distribuidora del Centro',
      ingredientId: 'ing-harina',
      ingredientName: 'Harina 000',
      packageSize: '25.000',
      packagePrice: '22000.00',
      supplierCode: '5521',
    });
    const azucarCentro = makePresentation({
      id: 'si-azucar-centro',
      supplierId: 'sup-centro',
      supplierName: 'Distribuidora del Centro',
      ingredientId: 'ing-azucar',
      ingredientName: 'Azúcar común',
      packageSize: '10.000',
      packagePrice: '11000.00',
      supplierCode: 'AZ-10',
    });

    supplierIngredientFindManyMock
      .mockResolvedValueOnce([harinaCentro, azucarCentro])
      .mockResolvedValueOnce([
        {
          id: 'si-harina-def',
          ingredientId: 'ing-harina',
          packageSize: D('50.000'),
          packagePrice: D('45000.00'),
        },
        {
          id: 'si-azucar-def',
          ingredientId: 'ing-azucar',
          packageSize: D('10.000'),
          packagePrice: D('11400.00'),
        },
      ]);

    const result = await previewPurchasingOrder('account-1', [
      { supplierIngredientId: 'si-harina-centro', packages: 2 },
      { supplierIngredientId: 'si-azucar-centro', packages: 3 },
    ]);

    expect(result.itemsCount).toBe(2);
    expect(result.totalPackages).toBe(5);
    expect(result.total).toBe('77000.00');
    expect(result.totalSavings).toBe('2200.00');
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      supplierId: 'sup-centro',
      subtotal: '77000.00',
      savings: '2200.00',
    });
    expect(result.groups[0]?.items.map((item) => item.ingredientName)).toEqual([
      'Azúcar común',
      'Harina 000',
    ]);
  });

  it('informa ahorro negativo (sobrecosto) cuando se elige una presentación más cara que la predeterminada', async () => {
    const harinaCara = makePresentation({
      id: 'si-harina-cara',
      supplierId: 'sup-makro',
      supplierName: 'Mayorista Makro',
      ingredientId: 'ing-harina',
      ingredientName: 'Harina 000',
      packageSize: '10.000',
      packagePrice: '9500.00',
    });

    supplierIngredientFindManyMock
      .mockResolvedValueOnce([harinaCara])
      .mockResolvedValueOnce([
        {
          id: 'si-harina-def',
          ingredientId: 'ing-harina',
          packageSize: D('50.000'),
          packagePrice: D('45000.00'),
        },
      ]);

    const result = await previewPurchasingOrder('account-1', [
      { supplierIngredientId: 'si-harina-cara', packages: 2 },
    ]);

    expect(result.total).toBe('19000.00');
    expect(result.totalSavings).toBe('-1000.00');
    expect(result.groups[0]).toMatchObject({
      subtotal: '19000.00',
      savings: '-1000.00',
    });
    expect(result.groups[0]?.items[0]?.savings).toBe('-1000.00');
  });
});

describe('purchasingService.getPurchasingMarginImpact & getIngredientMarginImpact', () => {
  it('calcula dos productos con margen actual y proyectado exacto', async () => {
    ingredientFindManyMock.mockResolvedValue([{
      id: 'ing-harina', name: 'Harina 000', unit: 'kg', currentCost: D('900.00'),
      suppliers: [
        { id: 'si-molino', packageSize: D('50.000'), packagePrice: D('45000.00'), isDefault: true, isQuarantined: false, supplier: { id: 'sup-molino', name: 'Molino Cañuelas', isActive: true } },
        { id: 'si-centro', packageSize: D('25.000'), packagePrice: D('22000.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-centro', name: 'Distribuidora del Centro', isActive: true } },
      ],
      products: [
        { product: { id: 'prod-medialunas', name: 'Medialunas x 12', salePrice: D('6000.00'), minMarginPercent: D('35.00'), ingredients: [
          { ingredientId: 'ing-harina', quantity: D('2.000'), ingredient: { id: 'ing-harina', currentCost: D('900.00') } },
          { ingredientId: 'ing-manteca', quantity: D('0.250'), ingredient: { id: 'ing-manteca', currentCost: D('8600.00') } },
        ] } },
        { product: { id: 'prod-pan', name: 'Pan flauta', salePrice: D('4000.00'), minMarginPercent: D('50.00'), ingredients: [
          { ingredientId: 'ing-harina', quantity: D('1.000'), ingredient: { id: 'ing-harina', currentCost: D('900.00') } },
          { ingredientId: 'ing-sal', quantity: D('0.010'), ingredient: { id: 'ing-sal', currentCost: D('110000.00') } },
        ] } },
      ],
    }]);

    const res = await getPurchasingMarginImpact('account-1');
    expect(res.summary).toEqual({ ingredientsWithAlternative: 1, productsAffected: 2, productsLeavingRiskOrLoss: 0 });
    const item = res.byIngredient[0]!;
    expect(item.currentCost).toBe('900.00');
    expect(item.unitCostDifference).toBe('20.00');
    expect(item.alternativePresentation.unitCost).toBe('880.00');

    const medialunas = item.products.find((p) => p.productId === 'prod-medialunas')!;
    expect(medialunas.currentRecipeCost).toBe('3950.00');
    expect(medialunas.projectedRecipeCost).toBe('3910.00');
    expect(medialunas.currentMarginPercent).toBe('34.17');
    expect(medialunas.projectedMarginPercent).toBe('34.83');
    expect(medialunas.currentBucket).toBe('risk');

    const pan = item.products.find((p) => p.productId === 'prod-pan')!;
    expect(pan.currentRecipeCost).toBe('2000.00');
    expect(pan.projectedRecipeCost).toBe('1980.00');
  });

  it('usa el costo manual vigente y proyecta una sola alternativa', async () => {
    ingredientFindManyMock.mockResolvedValue([{
      id: 'ing-harina', name: 'Harina 000', unit: 'kg', currentCost: D('950.00'),
      suppliers: [
        { id: 'si-molino', packageSize: D('50.000'), packagePrice: D('45000.00'), isDefault: true, isQuarantined: false, supplier: { id: 'sup-molino', name: 'Molino Cañuelas', isActive: true } },
        { id: 'si-centro', packageSize: D('25.000'), packagePrice: D('22000.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-centro', name: 'Distribuidora del Centro', isActive: true } },
      ],
      products: [{ product: { id: 'prod-pan', name: 'Pan flauta', salePrice: D('4000.00'), minMarginPercent: D('50.00'), ingredients: [
        { ingredientId: 'ing-harina', quantity: D('1.000'), ingredient: { id: 'ing-harina', currentCost: D('950.00') } },
      ] } }],
    }]);

    const res = await getPurchasingMarginImpact('account-1');
    const item = res.byIngredient[0]!;
    expect(item.unitCostDifference).toBe('70.00');
    expect(item.products[0]!.currentRecipeCost).toBe('950.00');
    expect(item.products[0]!.projectedRecipeCost).toBe('880.00');
  });

  it('proyecta productos compartidos de forma aislada y cuenta una sola vez en summary', async () => {
    const makeIngredient = (id: string, name: string, currentCost: string, def: string, alt: string, defPrice: string, altPrice: string) => ({
      id, name, unit: 'kg', currentCost: D(currentCost),
      suppliers: [
        { id: def, packageSize: D(id === 'ing-manteca' ? '5.000' : '10.000'), packagePrice: D(defPrice), isDefault: true, isQuarantined: false, supplier: { id: 'sup-1', name: 'Prov 1', isActive: true } },
        { id: alt, packageSize: D(id === 'ing-manteca' ? '5.000' : '10.000'), packagePrice: D(altPrice), isDefault: false, isQuarantined: false, supplier: { id: 'sup-2', name: 'Prov 2', isActive: true } },
      ],
      products: [{ product: { id: 'prod-torta', name: 'Torta Especial', salePrice: D('10000.00'), minMarginPercent: D('40.00'), ingredients: [
        { ingredientId: 'ing-harina', quantity: D('1.000'), ingredient: { id: 'ing-harina', currentCost: D('1000.00') } },
        { ingredientId: 'ing-manteca', quantity: D('0.500'), ingredient: { id: 'ing-manteca', currentCost: D('8000.00') } },
      ] } }],
    });

    ingredientFindManyMock.mockResolvedValue([
      makeIngredient('ing-harina', 'Harina', '1000.00', 'si-h-def', 'si-h-alt', '10000.00', '8000.00'),
      makeIngredient('ing-manteca', 'Manteca', '8000.00', 'si-m-def', 'si-m-alt', '40000.00', '30000.00'),
    ]);

    const res = await getPurchasingMarginImpact('account-1');
    expect(res.summary.productsAffected).toBe(1);
    expect(res.byIngredient.find((i) => i.ingredientId === 'ing-harina')!.products[0]!.projectedRecipeCost).toBe('4800.00');
    expect(res.byIngredient.find((i) => i.ingredientId === 'ing-manteca')!.products[0]!.projectedRecipeCost).toBe('4000.00');
  });

  it('Gherkin "Producto que sale de En riesgo": detecta risk->target y loss->surplus y cuenta productos distintos', async () => {
    const sharedProduct = {
      id: 'prod-rescatado',
      name: 'Medialunas especiales',
      salePrice: D('10000.00'),
      minMarginPercent: D('35.00'),
      ingredients: [
        { ingredientId: 'ing-harina', quantity: D('2.000'), ingredient: { id: 'ing-harina', currentCost: D('1000.00') } },
        { ingredientId: 'ing-manteca', quantity: D('0.500'), ingredient: { id: 'ing-manteca', currentCost: D('9400.00') } },
      ],
    };
    const lossProduct = {
      id: 'prod-perdida',
      name: 'Tarta de cacao',
      salePrice: D('1000.00'),
      minMarginPercent: D('30.00'),
      ingredients: [
        { ingredientId: 'ing-cacao', quantity: D('1.000'), ingredient: { id: 'ing-cacao', currentCost: D('1100.00') } },
      ],
    };

    ingredientFindManyMock.mockResolvedValue([
      {
        id: 'ing-harina',
        name: 'Harina 000',
        unit: 'kg',
        currentCost: D('1000.00'),
        suppliers: [
          { id: 'si-h-def', packageSize: D('10.000'), packagePrice: D('10000.00'), isDefault: true, isQuarantined: false, supplier: { id: 'sup-1', name: 'Molino A', isActive: true } },
          { id: 'si-h-alt', packageSize: D('10.000'), packagePrice: D('8500.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-2', name: 'Molino B', isActive: true } },
        ],
        products: [{ product: sharedProduct }],
      },
      {
        id: 'ing-manteca',
        name: 'Manteca',
        unit: 'kg',
        currentCost: D('9400.00'),
        suppliers: [
          { id: 'si-m-def', packageSize: D('5.000'), packagePrice: D('47000.00'), isDefault: true, isQuarantined: false, supplier: { id: 'sup-1', name: 'Lácteos A', isActive: true } },
          { id: 'si-m-alt', packageSize: D('5.000'), packagePrice: D('43000.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-3', name: 'Lácteos B', isActive: true } },
        ],
        products: [{ product: sharedProduct }],
      },
      {
        id: 'ing-cacao',
        name: 'Cacao',
        unit: 'kg',
        currentCost: D('1100.00'),
        suppliers: [
          { id: 'si-c-alt', packageSize: D('1.000'), packagePrice: D('350.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-4', name: 'Cacao Sur', isActive: true } },
        ],
        products: [{ product: lossProduct }],
      },
    ]);

    const res = await getPurchasingMarginImpact('account-1');

    expect(res.summary).toEqual({
      ingredientsWithAlternative: 3,
      productsAffected: 2,
      productsLeavingRiskOrLoss: 2,
    });

    const harina = res.byIngredient.find((i) => i.ingredientId === 'ing-harina')!;
    expect(harina.productsLeavingRiskOrLossCount).toBe(1);
    expect(harina.products[0]).toMatchObject({
      productId: 'prod-rescatado',
      currentMarginPercent: '33.00',
      projectedMarginPercent: '36.00',
      currentBucket: 'risk',
      projectedBucket: 'target',
    });

    const cacao = res.byIngredient.find((i) => i.ingredientId === 'ing-cacao')!;
    expect(cacao.defaultPresentation).toBeNull();
    expect(cacao.products[0]).toMatchObject({
      productId: 'prod-perdida',
      currentMarginPercent: '-10.00',
      projectedMarginPercent: '65.00',
      currentBucket: 'loss',
      projectedBucket: 'surplus',
    });
  });

  it('ordena byIngredient (salen de riesgo/pérdida -> mayor suba de margen -> diferencia -> nombre) y desempata alternativas', async () => {
    ingredientFindManyMock.mockResolvedValue([
      {
        id: 'ing-b', name: 'Bicarbonato', unit: 'kg', currentCost: D('1000.00'),
        suppliers: [
          { id: 'si-b-alt', packageSize: D('10.000'), packagePrice: D('9000.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-1', name: 'Prov 1', isActive: true } },
        ],
        products: [{ product: { id: 'p-b', name: 'Prod B', salePrice: D('2000.00'), minMarginPercent: D('20.00'), ingredients: [
          { ingredientId: 'ing-b', quantity: D('1.000'), ingredient: { id: 'ing-b', currentCost: D('1000.00') } },
        ] } }], // +5.00% margen, diff 100.00, no sale de risk/loss
      },
      {
        id: 'ing-c', name: 'Canela', unit: 'kg', currentCost: D('1000.00'),
        suppliers: [
          { id: 'si-c-grande', packageSize: D('10.000'), packagePrice: D('8000.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-alfa', name: 'Alfa', isActive: true } },
          { id: 'si-c-chico-z', packageSize: D('5.000'), packagePrice: D('4000.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-z', name: 'Zeta', isActive: true } },
          { id: 'si-c-chico-a', packageSize: D('5.000'), packagePrice: D('4000.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-a', name: 'Beta', isActive: true } },
        ],
        products: [{ product: { id: 'p-c', name: 'Prod C', salePrice: D('4000.00'), minMarginPercent: D('20.00'), ingredients: [
          { ingredientId: 'ing-c', quantity: D('1.000'), ingredient: { id: 'ing-c', currentCost: D('1000.00') } },
        ] } }], // +5.00% margen, diff 200.00 (> Bicarbonato)
      },
      {
        id: 'ing-a', name: 'Anís', unit: 'kg', currentCost: D('1000.00'),
        suppliers: [
          { id: 'si-a-alt', packageSize: D('10.000'), packagePrice: D('9600.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-1', name: 'Prov 1', isActive: true } },
        ],
        products: [{ product: { id: 'p-a', name: 'Prod A', salePrice: D('2000.00'), minMarginPercent: D('51.00'), ingredients: [
          { ingredientId: 'ing-a', quantity: D('1.000'), ingredient: { id: 'ing-a', currentCost: D('1000.00') } },
        ] } }], // 50% -> 52% (+2.00% pero sale de risk -> target)
      },
    ]);

    const res = await getPurchasingMarginImpact('account-1');
    expect(res.byIngredient.map((i) => i.ingredientId)).toEqual(['ing-a', 'ing-c', 'ing-b']);
    expect(res.byIngredient[1]!.alternativePresentation.supplierIngredientId).toBe('si-c-chico-a');
  });

  it('excluye cuarentena y proveedores inactivos incluso cuando no hay alternativas válidas', async () => {
    ingredientFindManyMock.mockResolvedValue([{
      id: 'ing-1', name: 'Harina', unit: 'kg', currentCost: D('1000.00'),
      suppliers: [
        { id: 'si-quar', packageSize: D('1.000'), packagePrice: D('500.00'), isDefault: false, isQuarantined: true, supplier: { id: 'sup-1', name: 'Prov 1', isActive: true } },
        { id: 'si-inact', packageSize: D('1.000'), packagePrice: D('500.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-2', name: 'Prov 2', isActive: false } },
      ],
      products: [],
    }]);

    const res = await getPurchasingMarginImpact('account-1');
    expect(res.byIngredient).toHaveLength(0);
  });

  it('excluye borradores reales cuando el insumo sí tiene una alternativa válida más barata', async () => {
    ingredientFindManyMock.mockResolvedValue([{
      id: 'ing-1', name: 'Harina', unit: 'kg', currentCost: D('1000.00'),
      suppliers: [
        { id: 'si-alt', packageSize: D('1.000'), packagePrice: D('800.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-1', name: 'Prov 1', isActive: true } },
      ],
      products: [
        { product: { id: 'prod-draft', name: 'Borrador', salePrice: D('0.00'), minMarginPercent: D('30.00'), ingredients: [] } },
        { product: { id: 'prod-real', name: 'Pan', salePrice: D('2000.00'), minMarginPercent: D('30.00'), ingredients: [
          { ingredientId: 'ing-1', quantity: D('1.000'), ingredient: { id: 'ing-1', currentCost: D('1000.00') } },
        ] } },
      ],
    }]);

    const res = await getPurchasingMarginImpact('account-1');
    expect(res.summary.productsAffected).toBe(1);
    expect(res.byIngredient[0]!.products.map((p) => p.productId)).toEqual(['prod-real']);
  });

  it('mantiene paridad exacta de redondeo por renglón contra el recálculo real en cascada', async () => {
    // 10.04 * 0.125 = 1.255 -> redondea a 1.26 por renglón (2 renglones = 2.52, no 2.51).
    const altUnitCost = D('10.04');
    ingredientFindManyMock.mockResolvedValue([{
      id: 'ing-1', name: 'Esencia', unit: 'l', currentCost: D('20.00'),
      suppliers: [
        { id: 'si-alt', packageSize: D('1.000'), packagePrice: D('10.04'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-1', name: 'Prov 1', isActive: true } },
      ],
      products: [{ product: { id: 'prod-1', name: 'Budín', salePrice: D('10.00'), minMarginPercent: D('30.00'), ingredients: [
        { ingredientId: 'ing-1', quantity: D('0.125'), ingredient: { id: 'ing-1', currentCost: D('20.00') } },
        { ingredientId: 'ing-2', quantity: D('0.125'), ingredient: { id: 'ing-2', currentCost: D('10.04') } },
      ] } }],
    }]);

    const impactRes = await getPurchasingMarginImpact('account-1');
    const projected = impactRes.byIngredient[0]!.products[0]!;

    const mockTx = {
      priceHistory: { create: vi.fn().mockResolvedValue({}) },
      productIngredient: { findMany: vi.fn().mockResolvedValue([{ productId: 'prod-1' }]) },
      product: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'prod-1', name: 'Budín', salePrice: D('10.00'), minMarginPercent: D('30.00'), cost: D('3.76'), marginPercent: D('62.40'),
          ingredients: [
            { ingredientId: 'ing-1', quantity: D('0.125'), ingredient: { id: 'ing-1', currentCost: D('20.00') } },
            { ingredientId: 'ing-2', quantity: D('0.125'), ingredient: { id: 'ing-2', currentCost: D('10.04') } },
          ],
        }]),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    const batchRes = await applyBatchIngredientCostChanges(mockTx, [
      { ingredientId: 'ing-1', previousCost: D('20.00'), newCost: altUnitCost },
    ]);

    expect(projected.projectedRecipeCost).toBe('2.52');
    expect(projected.projectedRecipeCost).toBe(batchRes.affectedProducts[0]!.newCost.toFixed(2));
    expect(projected.projectedMarginPercent).toBe(batchRes.affectedProducts[0]!.currentMarginPercent.toFixed(2));
  });

  it('getIngredientMarginImpact: devuelve 404 para insumo/presentación inexistente y 422 para cuarentena, proveedor inactivo o predeterminada', async () => {
    ingredientFindFirstMock.mockResolvedValueOnce(null);
    await expect(getIngredientMarginImpact('account-1', 'ing-x', 'si-x')).rejects.toMatchObject({ statusCode: 404 });

    ingredientFindFirstMock.mockResolvedValueOnce({ id: 'ing-1', name: 'Harina', unit: 'kg', currentCost: D('1000.00'), suppliers: [], products: [] });
    await expect(getIngredientMarginImpact('account-1', 'ing-1', 'si-x')).rejects.toMatchObject({ statusCode: 404 });

    ingredientFindFirstMock.mockResolvedValueOnce({ id: 'ing-1', name: 'Harina', unit: 'kg', currentCost: D('1000.00'), suppliers: [{ id: 'si-def', packageSize: D('1.000'), packagePrice: D('1000.00'), isDefault: true, isQuarantined: false, supplier: { id: 'sup-1', name: 'Prov', isActive: true } }], products: [] });
    await expect(getIngredientMarginImpact('account-1', 'ing-1', 'si-def')).rejects.toMatchObject({ statusCode: 422 });

    ingredientFindFirstMock.mockResolvedValueOnce({ id: 'ing-1', name: 'Harina', unit: 'kg', currentCost: D('1000.00'), suppliers: [{ id: 'si-quar', packageSize: D('1.000'), packagePrice: D('800.00'), isDefault: false, isQuarantined: true, supplier: { id: 'sup-1', name: 'Prov', isActive: true } }], products: [] });
    await expect(getIngredientMarginImpact('account-1', 'ing-1', 'si-quar')).rejects.toMatchObject({ statusCode: 422 });

    ingredientFindFirstMock.mockResolvedValueOnce({ id: 'ing-1', name: 'Harina', unit: 'kg', currentCost: D('1000.00'), suppliers: [{ id: 'si-inact', packageSize: D('1.000'), packagePrice: D('800.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-2', name: 'Prov Inactivo', isActive: false } }], products: [] });
    await expect(getIngredientMarginImpact('account-1', 'ing-1', 'si-inact')).rejects.toMatchObject({ statusCode: 422 });
  });

  it('getIngredientMarginImpact: calcula el impacto puntual, excluye borradores y ordena por suba de margen', async () => {
    ingredientFindFirstMock.mockResolvedValue({
      id: 'ing-harina',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: D('950.00'),
      suppliers: [
        { id: 'si-def', packageSize: D('50.000'), packagePrice: D('45000.00'), isDefault: true, isQuarantined: false, supplier: { id: 'sup-1', name: 'Molino Cañuelas', isActive: true } },
        { id: 'si-alt', packageSize: D('25.000'), packagePrice: D('22000.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-2', name: 'Distribuidora del Centro', isActive: true } },
      ],
      products: [
        { product: { id: 'prod-draft', name: 'Borrador', salePrice: D('0.00'), minMarginPercent: D('30.00'), ingredients: [] } },
        { product: { id: 'prod-pan', name: 'Pan flauta', salePrice: D('4000.00'), minMarginPercent: D('50.00'), ingredients: [
          { ingredientId: 'ing-harina', quantity: D('1.000'), ingredient: { id: 'ing-harina', currentCost: D('950.00') } },
        ] } },
        { product: { id: 'prod-medialunas', name: 'Medialunas', salePrice: D('2000.00'), minMarginPercent: D('55.00'), ingredients: [
          { ingredientId: 'ing-harina', quantity: D('1.000'), ingredient: { id: 'ing-harina', currentCost: D('950.00') } },
        ] } },
      ],
    });

    const res = await getIngredientMarginImpact('account-1', 'ing-harina', 'si-alt');

    expect(res).toMatchObject({
      ingredientId: 'ing-harina',
      currentCost: '950.00',
      unitCostDifference: '70.00',
      defaultPresentation: { supplierIngredientId: 'si-def', supplierName: 'Molino Cañuelas', unitCost: '900.00' },
      alternativePresentation: { supplierIngredientId: 'si-alt', supplierName: 'Distribuidora del Centro', unitCost: '880.00' },
      productsAffectedCount: 2,
      productsLeavingRiskOrLossCount: 1,
    });
    expect(res.products.map((p) => p.productId)).toEqual(['prod-medialunas', 'prod-pan']);
    expect(res.products[0]).toMatchObject({
      currentRecipeCost: '950.00',
      projectedRecipeCost: '880.00',
      currentMarginPercent: '52.50',
      projectedMarginPercent: '56.00',
      currentBucket: 'risk',
      projectedBucket: 'target',
    });
  });

  it('getIngredientMarginImpact: si la predeterminada está en cuarentena devuelve defaultPresentation null y admite alternativa más cara', async () => {
    ingredientFindFirstMock.mockResolvedValue({
      id: 'ing-harina',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: D('800.00'),
      suppliers: [
        { id: 'si-def-quar', packageSize: D('10.000'), packagePrice: D('8000.00'), isDefault: true, isQuarantined: true, supplier: { id: 'sup-1', name: 'Molino', isActive: true } },
        { id: 'si-cara', packageSize: D('10.000'), packagePrice: D('9000.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-2', name: 'Alternativo', isActive: true } },
      ],
      products: [
        { product: { id: 'prod-pan', name: 'Pan', salePrice: D('2000.00'), minMarginPercent: D('30.00'), ingredients: [
          { ingredientId: 'ing-harina', quantity: D('1.000'), ingredient: { id: 'ing-harina', currentCost: D('800.00') } },
        ] } },
      ],
    });

    const res = await getIngredientMarginImpact('account-1', 'ing-harina', 'si-cara');

    expect(res.defaultPresentation).toBeNull();
    expect(res.unitCostDifference).toBe('-100.00');
    expect(res.productsLeavingRiskOrLossCount).toBe(0);
    expect(res.products[0]).toMatchObject({
      currentMarginPercent: '60.00',
      projectedMarginPercent: '55.00',
      currentBucket: 'target',
      projectedBucket: 'target',
    });
  });
});

describe('margin-impact: aislamiento por cuenta y margen en $ ([RV476-I1], [RV476-I2])', () => {
  type ConsultaImpacto = {
    where: unknown;
    select: { suppliers: { where: { supplier: unknown } }; products: { where: { product: unknown } } };
  };

  const harinaConAlternativa = {
    id: 'ing-harina', name: 'Harina 000', unit: 'kg', currentCost: D('900.00'),
    suppliers: [
      { id: 'si-molino', packageSize: D('50.000'), packagePrice: D('45000.00'), isDefault: true, isQuarantined: false, supplier: { id: 'sup-molino', name: 'Molino Cañuelas', isActive: true } },
      { id: 'si-centro', packageSize: D('25.000'), packagePrice: D('22000.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-centro', name: 'Distribuidora del Centro', isActive: true } },
    ],
    products: [
      { product: { id: 'prod-medialunas', name: 'Medialunas x 12', salePrice: D('6000.00'), minMarginPercent: D('35.00'), ingredients: [
        { ingredientId: 'ing-harina', quantity: D('2.000'), ingredient: { id: 'ing-harina', currentCost: D('900.00') } },
        { ingredientId: 'ing-manteca', quantity: D('0.250'), ingredient: { id: 'ing-manteca', currentCost: D('8600.00') } },
      ] } },
    ],
  };

  it('el resumen solo consulta insumos, presentaciones y productos de la cuenta del token', async () => {
    ingredientFindManyMock.mockResolvedValue([]);

    await getPurchasingMarginImpact('account-quimica');

    const consulta = ingredientFindManyMock.mock.calls.at(-1)?.[0] as ConsultaImpacto;
    expect(consulta.where).toEqual({ accountId: 'account-quimica' });
    expect(consulta.select.suppliers.where.supplier).toMatchObject({ accountId: 'account-quimica' });
    expect(consulta.select.products.where.product).toMatchObject({ accountId: 'account-quimica' });
  });

  it('el detalle busca el insumo, la presentación y los productos solo en la cuenta del token: el de otra cuenta da 404', async () => {
    ingredientFindFirstMock.mockResolvedValue(null);

    await expect(getIngredientMarginImpact('account-quimica', 'ing-harina', 'si-centro')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Insumo no encontrado.',
    });

    const consulta = ingredientFindFirstMock.mock.calls.at(-1)?.[0] as ConsultaImpacto;
    expect(consulta.where).toEqual({ id: 'ing-harina', accountId: 'account-quimica' });
    expect(consulta.select.suppliers.where.supplier).toMatchObject({ accountId: 'account-quimica' });
    expect(consulta.select.products.where.product).toMatchObject({ accountId: 'account-quimica' });
  });

  it('informa el margen en $ por unidad vendida, actual y con la alternativa, en el resumen y en el detalle', async () => {
    ingredientFindManyMock.mockResolvedValue([harinaConAlternativa]);
    ingredientFindFirstMock.mockResolvedValue(harinaConAlternativa);

    const resumen = await getPurchasingMarginImpact('account-1');
    const detalle = await getIngredientMarginImpact('account-1', 'ing-harina', 'si-centro');

    // 6000 − 3950 = 2050 hoy; 6000 − 3910 = 2090 con la harina a $880/kg.
    for (const medialunas of [resumen.byIngredient[0]!.products[0]!, detalle.products[0]!]) {
      expect(medialunas).toMatchObject({ currentMarginAmount: '2050.00', projectedMarginAmount: '2090.00' });
    }
  });
});
