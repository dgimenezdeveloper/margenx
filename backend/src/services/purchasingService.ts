import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import {
  calculateRecipeTotal,
  calculateMarginAmount,
  calculateMarginPercent,
  classifyProductHealthBucket,
  HealthBucket,
  calculateUnitCost,
} from './marginCalculator';

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

export interface MarginImpactProduct {
  productId: string;
  productName: string;
  salePrice: string;
  minMarginPercent: string;
  currentRecipeCost: string;
  projectedRecipeCost: string;
  currentMarginAmount: string;
  projectedMarginAmount: string;
  currentMarginPercent: string;
  projectedMarginPercent: string;
  currentBucket: HealthBucket;
  projectedBucket: HealthBucket;
}

export interface MarginImpactDefaultPresentation {
  supplierIngredientId: string;
  supplierName: string;
  unitCost: string;
}

export interface MarginImpactAlternativePresentation {
  supplierIngredientId: string;
  supplierName: string;
  unitCost: string;
}

export interface IngredientMarginImpact {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  currentCost: string;
  defaultPresentation: MarginImpactDefaultPresentation | null;
  alternativePresentation: MarginImpactAlternativePresentation;
  unitCostDifference: string;
  productsAffectedCount: number;
  productsLeavingRiskOrLossCount: number;
  products: MarginImpactProduct[];
}

export interface MarginImpactSummary {
  ingredientsWithAlternative: number;
  productsAffected: number;
  productsLeavingRiskOrLoss: number;
}

export interface PurchasingMarginImpactResponse {
  summary: MarginImpactSummary;
  byIngredient: IngredientMarginImpact[];
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

export async function getPurchasingMarginImpact(accountId: string): Promise<PurchasingMarginImpactResponse> {
  const ingredients = await prisma.ingredient.findMany({
    where: { accountId },
    select: {
      id: true, name: true, unit: true, currentCost: true,
      suppliers: {
        where: { supplier: { accountId, isActive: true }, isQuarantined: false },
        select: { id: true, packageSize: true, packagePrice: true, isDefault: true, isQuarantined: true, supplier: { select: { id: true, name: true, isActive: true } } },
      },
      products: {
        where: { product: { accountId, ingredients: { some: {} } } },
        select: { product: { select: {
          id: true, name: true, salePrice: true, minMarginPercent: true,
          ingredients: { select: { ingredientId: true, quantity: true, ingredient: { select: { id: true, currentCost: true } } } },
        } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  const byIngredient: IngredientMarginImpact[] = [];
  const affectedProductIds = new Set<string>();
  const leavingRiskOrLossProductIds = new Set<string>();

  for (const ingredient of ingredients) {
    const currentCost = new Prisma.Decimal(String(ingredient.currentCost));
    const defaultRow = ingredient.suppliers.find((row) => row.isDefault);
    let defaultPresentation: MarginImpactDefaultPresentation | null = null;
    if (defaultRow) {
      const unitCost = calculateUnitCost(new Prisma.Decimal(String(defaultRow.packagePrice)), new Prisma.Decimal(String(defaultRow.packageSize)));
      defaultPresentation = { supplierIngredientId: defaultRow.id, supplierName: defaultRow.supplier.name, unitCost: unitCost.toFixed(2) };
    }

    const candidates = ingredient.suppliers
      .filter((row) => !row.isDefault && !row.isQuarantined && row.supplier.isActive !== false)
      .map((row) => ({
        row,
        unitCost: calculateUnitCost(new Prisma.Decimal(String(row.packagePrice)), new Prisma.Decimal(String(row.packageSize))),
      })).filter((entry) => entry.unitCost.lt(currentCost));
    if (candidates.length === 0) continue;

    candidates.sort((a, b) => {
      const costCmp = a.unitCost.comparedTo(b.unitCost); if (costCmp !== 0) return costCmp;
      const pkgCmp = new Prisma.Decimal(String(a.row.packagePrice)).comparedTo(new Prisma.Decimal(String(b.row.packagePrice))); if (pkgCmp !== 0) return pkgCmp;
      const nameCmp = a.row.supplier.name.localeCompare(b.row.supplier.name, 'es', { sensitivity: 'base' }); if (nameCmp !== 0) return nameCmp;
      return a.row.id.localeCompare(b.row.id);
    });

    const bestAlternative = candidates[0]!;
    const unitCostDifference = currentCost.sub(bestAlternative.unitCost).toFixed(2);
    const seenProductIds = new Set<string>();
    const productsImpact: MarginImpactProduct[] = [];
    let productsLeavingRiskOrLossCount = 0;

    for (const rel of ingredient.products) {
      const product = rel.product;
      if (!product || seenProductIds.has(product.id) || product.ingredients.length === 0) continue;
      seenProductIds.add(product.id);
      const salePrice = new Prisma.Decimal(String(product.salePrice));
      const minMarginPercent = new Prisma.Decimal(String(product.minMarginPercent));
      const currentRecipeCost = calculateRecipeTotal(product.ingredients.map((pi) => ({ quantity: new Prisma.Decimal(String(pi.quantity)), unitCost: new Prisma.Decimal(String(pi.ingredient.currentCost)) })));
      const projectedRecipeCost = calculateRecipeTotal(product.ingredients.map((pi) => ({ quantity: new Prisma.Decimal(String(pi.quantity)), unitCost: pi.ingredientId === ingredient.id ? bestAlternative.unitCost : new Prisma.Decimal(String(pi.ingredient.currentCost)) })));
      const currentMarginAmount = calculateMarginAmount(salePrice, currentRecipeCost);
      const projectedMarginAmount = calculateMarginAmount(salePrice, projectedRecipeCost);
      const currentMarginPercent = calculateMarginPercent(salePrice, currentRecipeCost);
      const projectedMarginPercent = calculateMarginPercent(salePrice, projectedRecipeCost);
      const currentBucket = classifyProductHealthBucket(currentMarginPercent, minMarginPercent, product.ingredients.length);
      const projectedBucket = classifyProductHealthBucket(projectedMarginPercent, minMarginPercent, product.ingredients.length);

      if ((currentBucket === 'risk' || currentBucket === 'loss') && (projectedBucket === 'target' || projectedBucket === 'surplus')) {
        productsLeavingRiskOrLossCount += 1;
        leavingRiskOrLossProductIds.add(product.id);
      }
      affectedProductIds.add(product.id);
      productsImpact.push({
        productId: product.id,
        productName: product.name,
        salePrice: salePrice.toFixed(2),
        minMarginPercent: minMarginPercent.toFixed(2),
        currentRecipeCost: currentRecipeCost.toFixed(2),
        projectedRecipeCost: projectedRecipeCost.toFixed(2),
        currentMarginAmount: currentMarginAmount.toFixed(2),
        projectedMarginAmount: projectedMarginAmount.toFixed(2),
        currentMarginPercent: currentMarginPercent.toFixed(2),
        projectedMarginPercent: projectedMarginPercent.toFixed(2),
        currentBucket,
        projectedBucket,
      });
    }

    productsImpact.sort((a, b) => {
      const diffA = new Prisma.Decimal(a.projectedMarginPercent).sub(new Prisma.Decimal(a.currentMarginPercent));
      const diffB = new Prisma.Decimal(b.projectedMarginPercent).sub(new Prisma.Decimal(b.currentMarginPercent));
      const diffCmp = diffB.comparedTo(diffA); if (diffCmp !== 0) return diffCmp;
      return a.productName.localeCompare(b.productName, 'es', { sensitivity: 'base' });
    });

    byIngredient.push({
      ingredientId: ingredient.id, ingredientName: ingredient.name, unit: ingredient.unit, currentCost: currentCost.toFixed(2),
      defaultPresentation,
      alternativePresentation: { supplierIngredientId: bestAlternative.row.id, supplierName: bestAlternative.row.supplier.name, unitCost: bestAlternative.unitCost.toFixed(2) },
      unitCostDifference, productsAffectedCount: productsImpact.length,
      productsLeavingRiskOrLossCount, products: productsImpact,
    });
  }

  byIngredient.sort((a, b) => {
    if (b.productsLeavingRiskOrLossCount !== a.productsLeavingRiskOrLossCount) return b.productsLeavingRiskOrLossCount - a.productsLeavingRiskOrLossCount;
    const maxIncA = a.products.reduce((max, p) => { const diff = new Prisma.Decimal(p.projectedMarginPercent).sub(new Prisma.Decimal(p.currentMarginPercent)); return diff.gt(max) ? diff : max; }, new Prisma.Decimal(0));
    const maxIncB = b.products.reduce((max, p) => { const diff = new Prisma.Decimal(p.projectedMarginPercent).sub(new Prisma.Decimal(p.currentMarginPercent)); return diff.gt(max) ? diff : max; }, new Prisma.Decimal(0));
    const incCmp = maxIncB.comparedTo(maxIncA); if (incCmp !== 0) return incCmp;
    const diffCmp = new Prisma.Decimal(b.unitCostDifference).comparedTo(new Prisma.Decimal(a.unitCostDifference)); if (diffCmp !== 0) return diffCmp;
    return a.ingredientName.localeCompare(b.ingredientName, 'es', { sensitivity: 'base' });
  });

  return { summary: { ingredientsWithAlternative: byIngredient.length, productsAffected: affectedProductIds.size, productsLeavingRiskOrLoss: leavingRiskOrLossProductIds.size }, byIngredient };
}

export async function getIngredientMarginImpact(
  accountId: string,
  ingredientId: string,
  supplierIngredientId: string
): Promise<IngredientMarginImpact> {
  const ingredient = await prisma.ingredient.findFirst({
    where: { id: ingredientId, accountId },
    select: {
      id: true,
      name: true,
      unit: true,
      currentCost: true,
      suppliers: {
        where: { supplier: { accountId } },
        select: {
          id: true,
          packageSize: true,
          packagePrice: true,
          isDefault: true,
          isQuarantined: true,
          supplier: { select: { id: true, name: true, isActive: true } },
        },
      },
      products: {
        where: { product: { accountId, ingredients: { some: {} } } },
        select: {
          product: {
            select: {
              id: true,
              name: true,
              salePrice: true,
              minMarginPercent: true,
              ingredients: {
                select: {
                  ingredientId: true,
                  quantity: true,
                  ingredient: { select: { id: true, currentCost: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!ingredient) throw new AppError('Insumo no encontrado.', 404);

  const targetPresentation = ingredient.suppliers.find((row) => row.id === supplierIngredientId);
  if (!targetPresentation) throw new AppError('Presentación no encontrada.', 404);
  if (targetPresentation.isQuarantined) {
    throw new AppError('La presentación está en cuarentena y debe resolverse antes de evaluarla.', 422);
  }
  if (!targetPresentation.supplier.isActive) {
    throw new AppError(
      `El proveedor "${targetPresentation.supplier.name}" está inactivo y no admite pedidos.`,
      422
    );
  }
  if (targetPresentation.isDefault) {
    throw new AppError('La presentación ya es la predeterminada del insumo.', 422);
  }

  const alternativeUnitCost = calculateUnitCost(
    new Prisma.Decimal(String(targetPresentation.packagePrice)),
    new Prisma.Decimal(String(targetPresentation.packageSize))
  );

  const defaultRow = ingredient.suppliers.find(
    (row) => row.isDefault && !row.isQuarantined && row.supplier.isActive
  );
  let defaultPresentation: MarginImpactDefaultPresentation | null = null;
  if (defaultRow) {
    const defaultUnitCost = calculateUnitCost(
      new Prisma.Decimal(String(defaultRow.packagePrice)),
      new Prisma.Decimal(String(defaultRow.packageSize))
    );
    defaultPresentation = {
      supplierIngredientId: defaultRow.id,
      supplierName: defaultRow.supplier.name,
      unitCost: defaultUnitCost.toFixed(2),
    };
  }

  const currentCost = new Prisma.Decimal(String(ingredient.currentCost));
  const unitCostDifference = currentCost.sub(alternativeUnitCost).toFixed(2);
  const seenProductIds = new Set<string>();
  const productsImpact: MarginImpactProduct[] = [];
  let productsLeavingRiskOrLossCount = 0;

  for (const rel of ingredient.products) {
    const product = rel.product;
    if (!product || seenProductIds.has(product.id) || product.ingredients.length === 0) continue;
    seenProductIds.add(product.id);

    const salePrice = new Prisma.Decimal(String(product.salePrice));
    const minMarginPercent = new Prisma.Decimal(String(product.minMarginPercent));
    const currentRecipeCost = calculateRecipeTotal(
      product.ingredients.map((pi) => ({
        quantity: new Prisma.Decimal(String(pi.quantity)),
        unitCost: new Prisma.Decimal(String(pi.ingredient.currentCost)),
      }))
    );
    const projectedRecipeCost = calculateRecipeTotal(
      product.ingredients.map((pi) => ({
        quantity: new Prisma.Decimal(String(pi.quantity)),
        unitCost: pi.ingredientId === ingredient.id
          ? alternativeUnitCost
          : new Prisma.Decimal(String(pi.ingredient.currentCost)),
      }))
    );
    const currentMarginAmount = calculateMarginAmount(salePrice, currentRecipeCost);
    const projectedMarginAmount = calculateMarginAmount(salePrice, projectedRecipeCost);
    const currentMarginPercent = calculateMarginPercent(salePrice, currentRecipeCost);
    const projectedMarginPercent = calculateMarginPercent(salePrice, projectedRecipeCost);
    const currentBucket = classifyProductHealthBucket(
      currentMarginPercent,
      minMarginPercent,
      product.ingredients.length
    );
    const projectedBucket = classifyProductHealthBucket(
      projectedMarginPercent,
      minMarginPercent,
      product.ingredients.length
    );

    if (
      (currentBucket === 'risk' || currentBucket === 'loss') &&
      (projectedBucket === 'target' || projectedBucket === 'surplus')
    ) {
      productsLeavingRiskOrLossCount += 1;
    }

    productsImpact.push({
      productId: product.id,
      productName: product.name,
      salePrice: salePrice.toFixed(2),
      minMarginPercent: minMarginPercent.toFixed(2),
      currentRecipeCost: currentRecipeCost.toFixed(2),
      projectedRecipeCost: projectedRecipeCost.toFixed(2),
      currentMarginPercent: currentMarginPercent.toFixed(2),
      projectedMarginPercent: projectedMarginPercent.toFixed(2),
      currentBucket,
      projectedBucket,
      currentMarginAmount: currentMarginAmount.toFixed(2),
      projectedMarginAmount: projectedMarginAmount.toFixed(2),
    });
  }

  productsImpact.sort((a, b) => {
    const diffA = new Prisma.Decimal(a.projectedMarginPercent).sub(new Prisma.Decimal(a.currentMarginPercent));
    const diffB = new Prisma.Decimal(b.projectedMarginPercent).sub(new Prisma.Decimal(b.currentMarginPercent));
    const diffCmp = diffB.comparedTo(diffA);
    if (diffCmp !== 0) return diffCmp;
    return a.productName.localeCompare(b.productName, 'es', { sensitivity: 'base' });
  });

  return {
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    unit: ingredient.unit,
    currentCost: currentCost.toFixed(2),
    defaultPresentation,
    alternativePresentation: {
      supplierIngredientId: targetPresentation.id,
      supplierName: targetPresentation.supplier.name,
      unitCost: alternativeUnitCost.toFixed(2),
    },
    unitCostDifference,
    productsAffectedCount: productsImpact.length,
    productsLeavingRiskOrLossCount,
    products: productsImpact,
  };
}
