import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import {
  calculateCatalogHealthSummary,
  calculateSuggestedSalePrice,
  classifyProductHealthBucket,
  type CatalogHealthSummary,
} from './marginCalculator';
import { getPurchasingSuggestions } from './purchasingService';
import { getAccountFeatures } from '../lib/features';
import { salesSummaryBetween, type RankedProduct, type SummaryTotals } from './salesSummaryService';

const Decimal = Prisma.Decimal;
const ZERO = new Decimal(0);
const HUNDRED = new Decimal(100);

const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';
const WEEKLY_WINDOW_DAYS = 7;
const STALE_COST_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const BELOW_MIN_LIMIT = 20;
const COST_CHANGES_LIMIT = 10;
const QUARANTINE_LIMIT = 5;
const SAVINGS_LIMIT = 5;
const STALE_COSTS_LIMIT = 20;

export interface ReportAccountSummary {
  id: string;
  slug: string;
  businessName: string;
  ownerEmail: string | null;
}

export interface ReportDateRangeOptions {
  from?: Date;
  to?: Date;
}

export interface BelowMinimumProductReportItem {
  productId: string;
  name: string;
  salePrice: string;
  cost: string;
  marginPercent: string;
  minMarginPercent: string;
  suggestedSalePrice: string;
  status: 'loss' | 'risk';
}

export interface WeeklyCostChangeReportItem {
  id: string;
  ingredientId: string;
  ingredientName: string;
  unit: string;
  oldCost: string;
  newCost: string;
  variationPercent: string;
  changedAt: string;
  affectedProductsCount: number;
}

export interface QuarantineReportItem {
  supplierIngredientId: string;
  ingredientId: string;
  ingredientName: string;
  unit: string;
  supplierId: string;
  supplierName: string;
  currentPackagePrice: string;
  pendingPackagePrice: string;
  currentUnitCost: string;
  proposedUnitCost: string;
  variationPercent: string;
  quarantineReason: string;
  quarantinedAt: string | null;
  isDefault: boolean;
}

export interface PurchasingSavingReportItem {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  currentSupplierName: string;
  currentUnitCost: string;
  bestSupplierName: string;
  bestUnitCost: string;
  packageSize: string;
  packagePrice: string;
  savingsPerUnit: string;
  savingsPercent: string;
  packageSavings: string;
}

export interface StaleCostReportItem {
  ingredientId: string;
  name: string;
  unit: string;
  currentCost: string;
  lastUpdatedAt: string;
  daysWithoutUpdate: number;
}

/** Ganancia real del período del reporte: solo viene si la cuenta tiene el módulo de ventas (ADR-010). */
export type WeeklySalesSection = SummaryTotals & {
  topSold: RankedProduct[];
  topProfit: RankedProduct[];
};

export interface WeeklyMarginReport {
  account: {
    id: string;
    businessName: string;
    slug: string;
    defaultMinMarginPercent: string;
  };
  period: {
    from: string;
    to: string;
    timezone: string;
    fromFormatted: string;
    toFormatted: string;
  };
  generatedAt: string;
  catalogHealth: CatalogHealthSummary & {
    activeIngredientsCount: number;
  };
  belowMinimumProducts: {
    totalCount: number;
    items: BelowMinimumProductReportItem[];
  };
  weeklyCostChanges: {
    totalCount: number;
    items: WeeklyCostChangeReportItem[];
  };
  quarantine: {
    totalCount: number;
    items: QuarantineReportItem[];
  };
  purchasingSavings: {
    totalCount: number;
    items: PurchasingSavingReportItem[];
  };
  staleCosts: {
    totalCount: number;
    thresholdDays: number;
    items: StaleCostReportItem[];
  };
  /** Solo con el módulo de ventas prendido; si no, el campo no viene. */
  sales?: WeeklySalesSection;
}

function formatArgentinaDate(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: ARGENTINA_TIMEZONE,
  }).format(date);
}

/** Devuelve la fecha YYYY-MM-DD en la zona horaria de Argentina. */
export function formatArgentinaIsoDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: ARGENTINA_TIMEZONE,
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) {
    throw new Error('No se pudo formatear la fecha en la zona horaria de Argentina.');
  }

  return `${year}-${month}-${day}`;
}

export async function getActiveReportAccounts(): Promise<ReportAccountSummary[]> {
  const accounts = await prisma.account.findMany({
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

  return accounts.map((account) => ({
    id: account.id,
    slug: account.slug,
    businessName: account.businessName,
    ownerEmail: account.users[0]?.email ?? null,
  }));
}

export async function getWeeklyMarginReportBySlug(
  slug: string,
  options?: ReportDateRangeOptions
): Promise<WeeklyMarginReport> {
  const account = await prisma.account.findUnique({
    where: { slug },
    select: { id: true, isActive: true },
  });

  if (!account || !account.isActive) {
    throw new AppError('No existe una cuenta activa para el slug indicado.', 404);
  }

  return buildWeeklyMarginReport(account.id, options);
}

export async function buildWeeklyMarginReport(
  accountId: string,
  options?: ReportDateRangeOptions
): Promise<WeeklyMarginReport> {
  const to = options?.to ? new Date(options.to) : new Date();
  const from = options?.from
    ? new Date(options.from)
    : new Date(to.getTime() - WEEKLY_WINDOW_DAYS * MS_PER_DAY);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    throw new AppError('El rango de fechas del reporte es inválido.', 400);
  }

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      businessName: true,
      slug: true,
      isActive: true,
      defaultMinMarginPercent: true,
    },
  });

  if (!account || !account.isActive) {
    throw new AppError('Cuenta no encontrada o inactiva.', 404);
  }

  const staleCutoff = new Date(to.getTime() - STALE_COST_DAYS * MS_PER_DAY);
  const [products, ingredients, weeklyPriceHistory, quarantinedRows, purchasingSuggestions] =
    await Promise.all([
      prisma.product.findMany({
        where: { accountId },
        select: {
          id: true,
          name: true,
          salePrice: true,
          cost: true,
          marginPercent: true,
          minMarginPercent: true,
          _count: { select: { ingredients: true } },
        },
      }),
      prisma.ingredient.findMany({
        where: { accountId },
        select: {
          id: true,
          name: true,
          unit: true,
          currentCost: true,
          updatedAt: true,
          priceHistory: {
            where: { changedAt: { lte: to } },
            orderBy: { changedAt: 'desc' },
            take: 1,
            select: { changedAt: true },
          },
        },
      }),
      prisma.priceHistory.findMany({
        where: {
          ingredient: { accountId },
          changedAt: { gte: from, lte: to },
        },
        select: {
          id: true,
          ingredientId: true,
          oldCost: true,
          newCost: true,
          changedAt: true,
          ingredient: {
            select: {
              id: true,
              name: true,
              unit: true,
              _count: { select: { products: true } },
            },
          },
        },
        orderBy: { changedAt: 'desc' },
      }),
      prisma.supplierIngredient.findMany({
        where: {
          ingredient: { accountId },
          isQuarantined: true,
        },
        select: {
          id: true,
          supplierId: true,
          ingredientId: true,
          packageSize: true,
          packageUnit: true,
          packagePrice: true,
          pendingPackagePrice: true,
          quarantinedAt: true,
          quarantineReason: true,
          isDefault: true,
          ingredient: { select: { id: true, name: true, unit: true } },
          supplier: { select: { id: true, name: true } },
        },
        orderBy: [{ quarantinedAt: 'asc' }, { id: 'asc' }],
      }),
      getPurchasingSuggestions(accountId),
    ]);

  const healthSummary = calculateCatalogHealthSummary(
    products.map((product) => ({
      marginPercent: product.marginPercent,
      minMarginPercent: product.minMarginPercent,
      ingredientsCount: product._count?.ingredients ?? 0,
    }))
  );

  const belowMinimumCandidates: Array<{
    id: string;
    name: string;
    salePrice: Prisma.Decimal;
    cost: Prisma.Decimal;
    marginPercent: Prisma.Decimal;
    minMarginPercent: Prisma.Decimal;
    status: 'loss' | 'risk';
  }> = [];

  for (const product of products) {
    const ingredientsCount = product._count?.ingredients ?? 0;
    const marginPercent = new Decimal(product.marginPercent ?? 0);
    const minMarginPercent = new Decimal(product.minMarginPercent ?? 0);
    const bucket = classifyProductHealthBucket(marginPercent, minMarginPercent, ingredientsCount);

    if (bucket === 'loss' || bucket === 'risk') {
      belowMinimumCandidates.push({
        id: product.id,
        name: product.name,
        salePrice: new Decimal(product.salePrice ?? 0),
        cost: new Decimal(product.cost ?? 0),
        marginPercent,
        minMarginPercent,
        status: bucket,
      });
    }
  }

  belowMinimumCandidates.sort((a, b) => {
    const marginCmp = a.marginPercent.comparedTo(b.marginPercent);
    if (marginCmp !== 0) return marginCmp;
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  });

  const belowMinimumItems: BelowMinimumProductReportItem[] = belowMinimumCandidates
    .slice(0, BELOW_MIN_LIMIT)
    .map((item) => ({
      productId: item.id,
      name: item.name,
      salePrice: item.salePrice.toFixed(2),
      cost: item.cost.toFixed(2),
      marginPercent: item.marginPercent.toFixed(2),
      minMarginPercent: item.minMarginPercent.toFixed(2),
      suggestedSalePrice: calculateSuggestedSalePrice(item.cost, item.minMarginPercent).toFixed(2),
      status: item.status,
    }));

  const costChangeCandidates = weeklyPriceHistory.map((row) => {
    const oldCost = new Decimal(String(row.oldCost));
    const newCost = new Decimal(String(row.newCost));
    const variationPercent = oldCost.gt(ZERO)
      ? newCost.sub(oldCost).div(oldCost).mul(HUNDRED).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      : ZERO;

    return {
      id: row.id,
      ingredientId: row.ingredientId,
      ingredientName: row.ingredient.name,
      unit: row.ingredient.unit,
      oldCost,
      newCost,
      variationPercent,
      absVariation: variationPercent.abs(),
      changedAt: row.changedAt,
      affectedProductsCount: row.ingredient._count?.products ?? 0,
    };
  });

  costChangeCandidates.sort((a, b) => {
    const variationCmp = b.absVariation.comparedTo(a.absVariation);
    if (variationCmp !== 0) return variationCmp;
    const dateCmp = b.changedAt.getTime() - a.changedAt.getTime();
    if (dateCmp !== 0) return dateCmp;
    return a.ingredientName.localeCompare(b.ingredientName, 'es', { sensitivity: 'base' });
  });

  const weeklyCostChangeItems: WeeklyCostChangeReportItem[] = costChangeCandidates
    .slice(0, COST_CHANGES_LIMIT)
    .map((item) => ({
      id: item.id,
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName,
      unit: item.unit,
      oldCost: item.oldCost.toFixed(2),
      newCost: item.newCost.toFixed(2),
      variationPercent: item.variationPercent.toFixed(2),
      changedAt: item.changedAt.toISOString(),
      affectedProductsCount: item.affectedProductsCount,
    }));

  const quarantineItems: QuarantineReportItem[] = quarantinedRows
    .slice(0, QUARANTINE_LIMIT)
    .map((row) => {
      const currentPackagePrice = new Decimal(String(row.packagePrice));
      const pendingPackagePrice = new Decimal(
        String(row.pendingPackagePrice ?? row.packagePrice)
      );
      const packageSize = new Decimal(String(row.packageSize));
      const currentUnitCost = packageSize.gt(ZERO)
        ? currentPackagePrice.div(packageSize).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        : ZERO;
      const proposedUnitCost = packageSize.gt(ZERO)
        ? pendingPackagePrice.div(packageSize).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        : ZERO;
      const variationPercent = currentPackagePrice.gt(ZERO)
        ? pendingPackagePrice
            .sub(currentPackagePrice)
            .div(currentPackagePrice)
            .mul(HUNDRED)
            .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        : ZERO;

      return {
        supplierIngredientId: row.id,
        ingredientId: row.ingredientId,
        ingredientName: row.ingredient.name,
        unit: row.ingredient.unit,
        supplierId: row.supplierId,
        supplierName: row.supplier.name,
        currentPackagePrice: currentPackagePrice.toFixed(2),
        pendingPackagePrice: pendingPackagePrice.toFixed(2),
        currentUnitCost: currentUnitCost.toFixed(2),
        proposedUnitCost: proposedUnitCost.toFixed(2),
        variationPercent: variationPercent.toFixed(2),
        quarantineReason: row.quarantineReason ?? 'SIN_MOTIVO',
        quarantinedAt: row.quarantinedAt ? row.quarantinedAt.toISOString() : null,
        isDefault: row.isDefault,
      };
    });

  const sortedSavings = [...purchasingSuggestions.byIngredient].sort((a, b) => {
    const packageCmp = new Decimal(b.packageSavings).comparedTo(new Decimal(a.packageSavings));
    if (packageCmp !== 0) return packageCmp;
    const percentCmp = new Decimal(b.savingsPercent).comparedTo(new Decimal(a.savingsPercent));
    if (percentCmp !== 0) return percentCmp;
    return a.ingredientName.localeCompare(b.ingredientName, 'es', { sensitivity: 'base' });
  });

  const purchasingSavingItems: PurchasingSavingReportItem[] = sortedSavings
    .slice(0, SAVINGS_LIMIT)
    .map((item) => ({
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName,
      unit: item.unit,
      currentSupplierName: item.defaultPresentation.supplierName,
      currentUnitCost: item.defaultPresentation.unitCost,
      bestSupplierName: item.cheapestPresentation.supplierName,
      bestUnitCost: item.cheapestPresentation.unitCost,
      packageSize: item.cheapestPresentation.packageSize,
      packagePrice: item.cheapestPresentation.packagePrice,
      savingsPerUnit: item.savingsPerUnit,
      savingsPercent: item.savingsPercent,
      packageSavings: item.packageSavings,
    }));

  const staleCandidates: Array<{
    id: string;
    name: string;
    unit: string;
    currentCost: Prisma.Decimal;
    lastUpdatedAt: Date;
    daysWithoutUpdate: number;
  }> = [];

  // Ingredient no tiene createdAt ni costUpdatedAt: si nunca tuvo PriceHistory hasta `to`,
  // se toma `updatedAt` como fecha de referencia (limitación conocida ante ediciones de nombre).
  for (const ingredient of ingredients) {
    const lastUpdatedAt = ingredient.priceHistory[0]?.changedAt ?? ingredient.updatedAt;
    if (lastUpdatedAt.getTime() < staleCutoff.getTime()) {
      const daysWithoutUpdate = Math.floor(
        (to.getTime() - lastUpdatedAt.getTime()) / MS_PER_DAY
      );
      staleCandidates.push({
        id: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit,
        currentCost: new Decimal(String(ingredient.currentCost)),
        lastUpdatedAt,
        daysWithoutUpdate,
      });
    }
  }

  staleCandidates.sort((a, b) => {
    const dateCmp = a.lastUpdatedAt.getTime() - b.lastUpdatedAt.getTime();
    if (dateCmp !== 0) return dateCmp;
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  });

  // Ventas de la semana (ADR-010): mismo período del reporte, solo con el módulo prendido.
  const features = await getAccountFeatures(accountId);
  const salesSection: WeeklySalesSection | null = features.sales ? await salesSummaryBetween(accountId, from, to) : null;

  const staleCostItems: StaleCostReportItem[] = staleCandidates
    .slice(0, STALE_COSTS_LIMIT)
    .map((item) => ({
      ingredientId: item.id,
      name: item.name,
      unit: item.unit,
      currentCost: item.currentCost.toFixed(2),
      lastUpdatedAt: item.lastUpdatedAt.toISOString(),
      daysWithoutUpdate: item.daysWithoutUpdate,
    }));

  return {
    account: {
      id: account.id,
      businessName: account.businessName,
      slug: account.slug,
      defaultMinMarginPercent: new Decimal(account.defaultMinMarginPercent).toFixed(2),
    },
    period: {
      from: from.toISOString(),
      to: to.toISOString(),
      timezone: ARGENTINA_TIMEZONE,
      fromFormatted: formatArgentinaDate(from),
      toFormatted: formatArgentinaDate(to),
    },
    generatedAt: to.toISOString(),
    catalogHealth: {
      ...healthSummary,
      activeIngredientsCount: ingredients.length,
    },
    belowMinimumProducts: {
      totalCount: belowMinimumCandidates.length,
      items: belowMinimumItems,
    },
    weeklyCostChanges: {
      totalCount: costChangeCandidates.length,
      items: weeklyCostChangeItems,
    },
    quarantine: {
      totalCount: quarantinedRows.length,
      items: quarantineItems,
    },
    purchasingSavings: {
      totalCount: purchasingSuggestions.byIngredient.length,
      items: purchasingSavingItems,
    },
    staleCosts: {
      totalCount: staleCandidates.length,
      thresholdDays: STALE_COST_DAYS,
      items: staleCostItems,
    },
    ...(salesSection ? { sales: salesSection } : {}),
  };
}
