import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const ingredientFindManyMock = vi.fn();
const supplierIngredientFindManyMock = vi.fn();

vi.mock('../lib/prisma', () => ({
  prisma: {
    ingredient: {
      findMany: (...args: unknown[]) => ingredientFindManyMock(...args),
    },
    supplierIngredient: {
      findMany: (...args: unknown[]) => supplierIngredientFindManyMock(...args),
    },
  },
}));

import { getPurchasingSuggestions, previewPurchasingOrder } from './purchasingService';
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
        where: {
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
