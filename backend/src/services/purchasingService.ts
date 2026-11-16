import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { calculateUnitCost } from './marginCalculator';

const ZERO = new Prisma.Decimal(0);
const HUNDRED = new Prisma.Decimal(100);

export interface PurchasingPresentationSummary {
  supplierIngredientId: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string | null;
  rawDescription: string | null;
  packageSize: string;
  packageUnit: string;
  packagePrice: string;
  unitCost: string;
}

export interface IngredientPurchasingSuggestion {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  currentCost: string;
  defaultPresentation: PurchasingPresentationSummary;
  cheapestPresentation: PurchasingPresentationSummary;
  savingsPerUnit: string;
  savingsPercent: string;
  packageSavings: string;
}

export interface SupplierSuggestionItem {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  supplierIngredientId: string;
  supplierCode: string | null;
  rawDescription: string | null;
  packageSize: string;
  packageUnit: string;
  packagePrice: string;
  unitCost: string;
  defaultUnitCost: string;
  defaultSupplierName: string;
  savingsPerUnit: string;
  savingsPercent: string;
  packageSavings: string;
}

export interface SupplierSuggestionGroup {
  supplierId: string;
  supplierName: string;
  contactPhone: string | null;
  email: string | null;
  address: string | null;
  itemsCount: number;
  totalPackageSavings: string;
  items: SupplierSuggestionItem[];
}

export interface AlreadyBestPriceItem {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  unitCost: string;
  defaultPresentation: PurchasingPresentationSummary;
}

export interface SingleSupplierItem {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  presentation: PurchasingPresentationSummary;
}

export interface QuarantinedExcludedItem {
  supplierIngredientId: string;
  supplierId: string;
  ingredientId: string;
  ingredientName: string;
  unit: string;
  supplierName: string;
  packageSize: string;
  packageUnit: string;
  packagePrice: string;
  pendingPackagePrice: string | null;
  quarantineReason: string | null;
  quarantinedAt: string | null;
  isDefault: boolean;
}

export interface PurchasingSuggestionsResponse {
  summary: {
    withSavingsCount: number;
    alreadyBestPriceCount: number;
    singleSupplierCount: number;
    withoutEligibleSupplierCount: number;
    withoutActiveDefaultCount: number;
    quarantinedExcludedCount: number;
  };
  byIngredient: IngredientPurchasingSuggestion[];
  bySupplier: SupplierSuggestionGroup[];
  alreadyBestPrice: AlreadyBestPriceItem[];
  singleSupplier: SingleSupplierItem[];
  quarantinedExcluded: QuarantinedExcludedItem[];
}

export interface OrderPreviewItemInput {
  supplierIngredientId: string;
  packages: number;
}

export interface OrderPreviewLine {
  supplierIngredientId: string;
  ingredientId: string;
  ingredientName: string;
  unit: string;
  supplierCode: string | null;
  rawDescription: string | null;
  packageSize: string;
  packageUnit: string;
  packagePrice: string;
  unitCost: string;
  packages: number;
  totalQuantity: string;
  subtotal: string;
  defaultUnitCost: string | null;
  savings: string;
}

export interface OrderPreviewSupplierGroup {
  supplierId: string;
  supplierName: string;
  contactPhone: string | null;
  email: string | null;
  address: string | null;
  subtotal: string;
  savings: string;
  items: OrderPreviewLine[];
}

export interface OrderPreviewResponse {
  groups: OrderPreviewSupplierGroup[];
  total: string;
  totalSavings: string;
  totalPackages: number;
  itemsCount: number;
}

function toPresentationSummary(
  row: {
    id: string;
    supplierId: string;
    supplierCode: string | null;
    rawDescription: string | null;
    packageSize: Prisma.Decimal;
    packageUnit: string;
    packagePrice: Prisma.Decimal;
    supplier: { name: string };
  },
  unitCost: Prisma.Decimal
): PurchasingPresentationSummary {
  return {
    supplierIngredientId: row.id,
    supplierId: row.supplierId,
    supplierName: row.supplier.name,
    supplierCode: row.supplierCode ?? null,
    rawDescription: row.rawDescription ?? null,
    packageSize: new Prisma.Decimal(String(row.packageSize)).toString(),
    packageUnit: row.packageUnit,
    packagePrice: new Prisma.Decimal(String(row.packagePrice)).toFixed(2),
    unitCost: unitCost.toFixed(2),
  };
}

export async function getPurchasingSuggestions(
  accountId: string
): Promise<PurchasingSuggestionsResponse> {
  const ingredients = await prisma.ingredient.findMany({
    where: { accountId },
    select: {
      id: true,
      name: true,
      unit: true,
      currentCost: true,
      suppliers: {
        where: { supplier: { accountId } },
        select: {
          id: true,
          supplierId: true,
          ingredientId: true,
          supplierCode: true,
          rawDescription: true,
          packageSize: true,
          packageUnit: true,
          packagePrice: true,
          pendingPackagePrice: true,
          isDefault: true,
          isQuarantined: true,
          quarantinedAt: true,
          quarantineReason: true,
          supplier: {
            select: {
              id: true,
              accountId: true,
              name: true,
              contactPhone: true,
              email: true,
              address: true,
              isActive: true,
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const byIngredient: IngredientPurchasingSuggestion[] = [];
  const alreadyBestPrice: AlreadyBestPriceItem[] = [];
  const singleSupplier: SingleSupplierItem[] = [];
  const quarantinedExcluded: QuarantinedExcludedItem[] = [];
  const supplierGroupsMap = new Map<
    string,
    {
      supplierId: string;
      supplierName: string;
      contactPhone: string | null;
      email: string | null;
      address: string | null;
      totalPackageSavings: Prisma.Decimal;
      items: SupplierSuggestionItem[];
    }
  >();

  let withoutEligibleSupplierCount = 0;
  let withoutActiveDefaultCount = 0;

  for (const ingredient of ingredients) {
    const activeRows = ingredient.suppliers.filter((row) => row.supplier.isActive);

    for (const row of activeRows) {
      if (row.isQuarantined) {
        quarantinedExcluded.push({
          supplierIngredientId: row.id,
          supplierId: row.supplierId,
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          unit: ingredient.unit,
          supplierName: row.supplier.name,
          packageSize: new Prisma.Decimal(String(row.packageSize)).toString(),
          packageUnit: row.packageUnit,
          packagePrice: new Prisma.Decimal(String(row.packagePrice)).toFixed(2),
          pendingPackagePrice:
            row.pendingPackagePrice !== null && row.pendingPackagePrice !== undefined
              ? new Prisma.Decimal(String(row.pendingPackagePrice)).toFixed(2)
              : null,
          quarantineReason: row.quarantineReason ?? null,
          quarantinedAt: row.quarantinedAt ? row.quarantinedAt.toISOString() : null,
          isDefault: row.isDefault,
        });
      }
    }

    const eligible = activeRows
      .filter((row) => !row.isQuarantined)
      .map((row) => ({
        row,
        unitCost: calculateUnitCost(
          new Prisma.Decimal(String(row.packagePrice)),
          new Prisma.Decimal(String(row.packageSize))
        ),
      }));

    if (eligible.length === 0) {
      withoutEligibleSupplierCount += 1;
      continue;
    }

    if (eligible.length === 1) {
      const only = eligible[0];
      if (only) {
        singleSupplier.push({
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          unit: ingredient.unit,
          presentation: toPresentationSummary(only.row, only.unitCost),
        });
      }
      continue;
    }

    const activeDefault = eligible.find((entry) => entry.row.isDefault);
    if (!activeDefault) {
      withoutActiveDefaultCount += 1;
      continue;
    }

    const sorted = [...eligible].sort((a, b) => {
      const costCmp = a.unitCost.comparedTo(b.unitCost);
      if (costCmp !== 0) return costCmp;
      if (a.row.isDefault !== b.row.isDefault) return a.row.isDefault ? -1 : 1;
      const pkgCmp = new Prisma.Decimal(String(a.row.packagePrice)).comparedTo(
        new Prisma.Decimal(String(b.row.packagePrice))
      );
      if (pkgCmp !== 0) return pkgCmp;
      const nameCmp = a.row.supplier.name.localeCompare(b.row.supplier.name, 'es', {
        sensitivity: 'base',
      });
      if (nameCmp !== 0) return nameCmp;
      return a.row.id.localeCompare(b.row.id);
    });

    const cheapest = sorted[0];
    if (!cheapest) continue;

    if (cheapest.unitCost.gte(activeDefault.unitCost)) {
      alreadyBestPrice.push({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        unit: ingredient.unit,
        unitCost: activeDefault.unitCost.toFixed(2),
        defaultPresentation: toPresentationSummary(activeDefault.row, activeDefault.unitCost),
      });
      continue;
    }

    const savingsPerUnit = activeDefault.unitCost
      .sub(cheapest.unitCost)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const savingsPercent = savingsPerUnit
      .div(activeDefault.unitCost)
      .mul(HUNDRED)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    const cheapestPackageSize = new Prisma.Decimal(String(cheapest.row.packageSize));
    const cheapestPackagePrice = new Prisma.Decimal(String(cheapest.row.packagePrice));
    const rawPackageSavings = activeDefault.unitCost
      .mul(cheapestPackageSize)
      .sub(cheapestPackagePrice)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const packageSavings = rawPackageSavings.lt(ZERO) ? ZERO : rawPackageSavings;

    const defaultSummary = toPresentationSummary(activeDefault.row, activeDefault.unitCost);
    const cheapestSummary = toPresentationSummary(cheapest.row, cheapest.unitCost);

    byIngredient.push({
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      unit: ingredient.unit,
      currentCost: new Prisma.Decimal(String(ingredient.currentCost)).toFixed(2),
      defaultPresentation: defaultSummary,
      cheapestPresentation: cheapestSummary,
      savingsPerUnit: savingsPerUnit.toFixed(2),
      savingsPercent: savingsPercent.toFixed(2),
      packageSavings: packageSavings.toFixed(2),
    });

    const existingGroup = supplierGroupsMap.get(cheapest.row.supplierId) ?? {
      supplierId: cheapest.row.supplierId,
      supplierName: cheapest.row.supplier.name,
      contactPhone: cheapest.row.supplier.contactPhone ?? null,
      email: cheapest.row.supplier.email ?? null,
      address: cheapest.row.supplier.address ?? null,
      totalPackageSavings: ZERO,
      items: [],
    };

    existingGroup.totalPackageSavings = existingGroup.totalPackageSavings.add(packageSavings);
    existingGroup.items.push({
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      unit: ingredient.unit,
      supplierIngredientId: cheapest.row.id,
      supplierCode: cheapest.row.supplierCode ?? null,
      rawDescription: cheapest.row.rawDescription ?? null,
      packageSize: cheapestPackageSize.toString(),
      packageUnit: cheapest.row.packageUnit,
      packagePrice: cheapestPackagePrice.toFixed(2),
      unitCost: cheapest.unitCost.toFixed(2),
      defaultUnitCost: activeDefault.unitCost.toFixed(2),
      defaultSupplierName: activeDefault.row.supplier.name,
      savingsPerUnit: savingsPerUnit.toFixed(2),
      savingsPercent: savingsPercent.toFixed(2),
      packageSavings: packageSavings.toFixed(2),
    });

    supplierGroupsMap.set(cheapest.row.supplierId, existingGroup);
  }

  const bySupplier: SupplierSuggestionGroup[] = [...supplierGroupsMap.values()]
    .sort((a, b) => a.supplierName.localeCompare(b.supplierName, 'es', { sensitivity: 'base' }))
    .map((group) => ({
      supplierId: group.supplierId,
      supplierName: group.supplierName,
      contactPhone: group.contactPhone,
      email: group.email,
      address: group.address,
      itemsCount: group.items.length,
      totalPackageSavings: group.totalPackageSavings.toFixed(2),
      items: [...group.items].sort((a, b) =>
        a.ingredientName.localeCompare(b.ingredientName, 'es', { sensitivity: 'base' })
      ),
    }));

  quarantinedExcluded.sort((a, b) => {
    const ingCmp = a.ingredientName.localeCompare(b.ingredientName, 'es', { sensitivity: 'base' });
    if (ingCmp !== 0) return ingCmp;
    return a.supplierName.localeCompare(b.supplierName, 'es', { sensitivity: 'base' });
  });

  return {
    summary: {
      withSavingsCount: byIngredient.length,
      alreadyBestPriceCount: alreadyBestPrice.length,
      singleSupplierCount: singleSupplier.length,
      withoutEligibleSupplierCount,
      withoutActiveDefaultCount,
      quarantinedExcludedCount: quarantinedExcluded.length,
    },
    byIngredient,
    bySupplier,
    alreadyBestPrice,
    singleSupplier,
    quarantinedExcluded,
  };
}

export async function previewPurchasingOrder(
  accountId: string,
  items: OrderPreviewItemInput[]
): Promise<OrderPreviewResponse> {
  if (items.length === 0) {
    throw new AppError('El pedido debe incluir al menos un ítem.', 400);
  }

  const seenIds = new Set<string>();
  for (const item of items) {
    if (seenIds.has(item.supplierIngredientId)) {
      throw new AppError('No se puede repetir la misma presentación en el pedido.', 400);
    }
    seenIds.add(item.supplierIngredientId);
  }

  const requestedIds = items.map((item) => item.supplierIngredientId);

  const presentations = await prisma.supplierIngredient.findMany({
    where: {
      id: { in: requestedIds },
      supplier: { accountId },
      ingredient: { accountId },
    },
    select: {
      id: true,
      supplierId: true,
      ingredientId: true,
      supplierCode: true,
      rawDescription: true,
      packageSize: true,
      packageUnit: true,
      packagePrice: true,
      isDefault: true,
      isQuarantined: true,
      supplier: {
        select: {
          id: true,
          name: true,
          contactPhone: true,
          email: true,
          address: true,
          isActive: true,
        },
      },
      ingredient: {
        select: {
          id: true,
          name: true,
          unit: true,
          currentCost: true,
        },
      },
    },
  });

  if (presentations.length !== requestedIds.length) {
    throw new AppError('Una o más presentaciones solicitadas no existen.', 404);
  }

  for (const presentation of presentations) {
    if (!presentation.supplier.isActive) {
      throw new AppError(
        `El proveedor "${presentation.supplier.name}" está inactivo y no admite pedidos.`,
        422
      );
    }
    if (presentation.isQuarantined) {
      throw new AppError(
        `La presentación de "${presentation.ingredient.name}" está en cuarentena y debe resolverse antes de pedirla.`,
        422
      );
    }
  }

  const presentationById = new Map(presentations.map((p) => [p.id, p]));
  const ingredientIds = [...new Set(presentations.map((p) => p.ingredientId))];

  const defaultPresentations = await prisma.supplierIngredient.findMany({
    where: {
      ingredientId: { in: ingredientIds },
      isDefault: true,
      isQuarantined: false,
      supplier: { accountId, isActive: true },
    },
    select: {
      id: true,
      ingredientId: true,
      packageSize: true,
      packagePrice: true,
    },
  });

  const defaultByIngredient = new Map(defaultPresentations.map((d) => [d.ingredientId, d]));

  const groupsMap = new Map<
    string,
    {
      supplierId: string;
      supplierName: string;
      contactPhone: string | null;
      email: string | null;
      address: string | null;
      subtotal: Prisma.Decimal;
      savings: Prisma.Decimal;
      items: OrderPreviewLine[];
    }
  >();

  let total = ZERO;
  let totalSavings = ZERO;
  let totalPackages = 0;

  for (const requestItem of items) {
    const presentation = presentationById.get(requestItem.supplierIngredientId);
    if (!presentation) {
      throw new AppError('Una o más presentaciones solicitadas no existen.', 404);
    }

    const packageSize = new Prisma.Decimal(String(presentation.packageSize));
    const packagePrice = new Prisma.Decimal(String(presentation.packagePrice));
    const unitCost = calculateUnitCost(packagePrice, packageSize);
    const packagesDecimal = new Prisma.Decimal(requestItem.packages);

    const lineSubtotal = packagePrice
      .mul(packagesDecimal)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const totalQuantity = packageSize
      .mul(packagesDecimal)
      .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);

    const defaultRow = defaultByIngredient.get(presentation.ingredientId);
    let defaultUnitCost: Prisma.Decimal | null = null;
    let lineSavings = ZERO;

    if (defaultRow) {
      defaultUnitCost = calculateUnitCost(
        new Prisma.Decimal(String(defaultRow.packagePrice)),
        new Prisma.Decimal(String(defaultRow.packageSize))
      );

      if (presentation.id !== defaultRow.id && !unitCost.equals(defaultUnitCost)) {
        const baselineCost = defaultUnitCost
          .mul(packageSize)
          .mul(packagesDecimal)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        lineSavings = baselineCost
          .sub(lineSubtotal)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      }
    }

    const group = groupsMap.get(presentation.supplierId) ?? {
      supplierId: presentation.supplierId,
      supplierName: presentation.supplier.name,
      contactPhone: presentation.supplier.contactPhone ?? null,
      email: presentation.supplier.email ?? null,
      address: presentation.supplier.address ?? null,
      subtotal: ZERO,
      savings: ZERO,
      items: [],
    };

    group.subtotal = group.subtotal.add(lineSubtotal);
    group.savings = group.savings.add(lineSavings);
    group.items.push({
      supplierIngredientId: presentation.id,
      ingredientId: presentation.ingredientId,
      ingredientName: presentation.ingredient.name,
      unit: presentation.ingredient.unit,
      supplierCode: presentation.supplierCode ?? null,
      rawDescription: presentation.rawDescription ?? null,
      packageSize: packageSize.toString(),
      packageUnit: presentation.packageUnit,
      packagePrice: packagePrice.toFixed(2),
      unitCost: unitCost.toFixed(2),
      packages: requestItem.packages,
      totalQuantity: totalQuantity.toString(),
      subtotal: lineSubtotal.toFixed(2),
      defaultUnitCost: defaultUnitCost ? defaultUnitCost.toFixed(2) : null,
      savings: lineSavings.toFixed(2),
    });

    groupsMap.set(presentation.supplierId, group);
    total = total.add(lineSubtotal);
    totalSavings = totalSavings.add(lineSavings);
    totalPackages += requestItem.packages;
  }

  const groups: OrderPreviewSupplierGroup[] = [...groupsMap.values()]
    .sort((a, b) => a.supplierName.localeCompare(b.supplierName, 'es', { sensitivity: 'base' }))
    .map((group) => ({
      supplierId: group.supplierId,
      supplierName: group.supplierName,
      contactPhone: group.contactPhone,
      email: group.email,
      address: group.address,
      subtotal: group.subtotal.toFixed(2),
      savings: group.savings.toFixed(2),
      items: [...group.items].sort((a, b) =>
        a.ingredientName.localeCompare(b.ingredientName, 'es', { sensitivity: 'base' })
      ),
    }));

  return {
    groups,
    total: total.toFixed(2),
    totalSavings: totalSavings.toFixed(2),
    totalPackages,
    itemsCount: items.length,
  };
}
