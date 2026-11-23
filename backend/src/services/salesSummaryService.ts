import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { argentinaDayRange } from './salesService';

/*
  Ganancia real (ADR-010, docs/especificacion-funcional.md §13): ventas menos el costo
  congelado de cada renglón, y el margen ponderado por lo vendido (ganancia / ventas,
  sobre la venta como en ADR-004). Sin las ventas anuladas. Solo ADMIN.

  Períodos en días calendario de Argentina: day = hoy; week = hoy y los 6 anteriores
  (la misma ventana de 7 días del reporte semanal, ADR-009); month = hoy y los 29
  anteriores. El período anterior tiene el mismo largo y termina donde empieza el actual.
*/

const Decimal = Prisma.Decimal;
type DecimalType = Prisma.Decimal;

export const SUMMARY_PERIODS = ['day', 'week', 'month'] as const;
export type SummaryPeriod = (typeof SUMMARY_PERIODS)[number];

const PERIOD_DAYS: Record<SummaryPeriod, number> = { day: 1, week: 7, month: 30 };
export const TOP_PRODUCTS_LIMIT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';

export interface SummaryRange {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  /** Primer y último día, AAAA-MM-DD en hora de Argentina. */
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
}

export interface SummaryTotals {
  salesCount: number;
  salesTotal: string;
  costTotal: string;
  profit: string;
  /** Ganancia / ventas × 100, con 2 decimales; `null` si no hubo ventas. */
  marginPercent: string | null;
}

export interface RankedProduct {
  productId: string | null;
  productName: string;
  quantity: number;
  salesTotal: string;
  profit: string;
  marginPercent: string | null;
}

/** Fila de `saleItem.groupBy` por producto. */
export interface ProductGroup {
  productId: string | null;
  productName: string;
  _sum: { quantity: number | null; lineTotal: DecimalType | null; lineCost: DecimalType | null };
}

export function parseSummaryPeriod(query: Record<string, unknown>): SummaryPeriod {
  const raw = query.period ?? 'week';
  if (typeof raw !== 'string' || !(SUMMARY_PERIODS as readonly string[]).includes(raw)) {
    throw new AppError('El período tiene que ser day, week o month.', 400);
  }
  return raw as SummaryPeriod;
}

/** AAAA-MM-DD del día calendario de Argentina en que cae `date`. */
export function argentinaDateOf(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ARGENTINA_TIMEZONE }).format(date);
}

export function summaryRange(period: SummaryPeriod, now: Date = new Date()): SummaryRange {
  const days = PERIOD_DAYS[period];
  const today = argentinaDayRange(argentinaDateOf(now));
  const end = today.end;
  const start = new Date(end.getTime() - days * DAY_MS);
  const previousEnd = start;
  const previousStart = new Date(start.getTime() - days * DAY_MS);
  // El último día de un rango es el que empieza 24 h antes de su fin.
  const lastDay = (rangeEnd: Date) => argentinaDateOf(new Date(rangeEnd.getTime() - DAY_MS));
  return {
    start,
    end,
    previousStart,
    previousEnd,
    from: argentinaDateOf(start),
    to: lastDay(end),
    previousFrom: argentinaDateOf(previousStart),
    previousTo: lastDay(previousEnd),
  };
}

function marginOf(sales: DecimalType, profit: DecimalType): string | null {
  if (sales.lte(0)) return null;
  return profit.div(sales).mul(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

export function buildSummaryTotals(input: {
  salesCount: number;
  salesTotal: DecimalType | null;
  costTotal: DecimalType | null;
}): SummaryTotals {
  const sales = new Decimal(input.salesTotal ?? 0);
  const cost = new Decimal(input.costTotal ?? 0);
  const profit = sales.minus(cost);
  return {
    salesCount: input.salesCount,
    salesTotal: sales.toFixed(2),
    costTotal: cost.toFixed(2),
    profit: profit.toFixed(2),
    marginPercent: marginOf(sales, profit),
  };
}

/** Los más vendidos (por unidades) y los que más ganancia dejan, `limit` de cada uno. */
export function rankProducts(groups: ProductGroup[], limit: number = TOP_PRODUCTS_LIMIT) {
  const products = groups.map((group) => {
    const sales = new Decimal(group._sum.lineTotal ?? 0);
    const profit = sales.minus(group._sum.lineCost ?? 0);
    return { group, sales, profit };
  });
  const byName = (a: { group: ProductGroup }, b: { group: ProductGroup }) =>
    a.group.productName.localeCompare(b.group.productName, 'es', { sensitivity: 'base' });
  const toRanked = ({ group, sales, profit }: (typeof products)[number]): RankedProduct => ({
    productId: group.productId,
    productName: group.productName,
    quantity: group._sum.quantity ?? 0,
    salesTotal: sales.toFixed(2),
    profit: profit.toFixed(2),
    marginPercent: marginOf(sales, profit),
  });

  const topSold = [...products]
    .sort((a, b) => (b.group._sum.quantity ?? 0) - (a.group._sum.quantity ?? 0) || byName(a, b))
    .slice(0, limit)
    .map(toRanked);
  const topProfit = [...products]
    .sort((a, b) => b.profit.comparedTo(a.profit) || byName(a, b))
    .slice(0, limit)
    .map(toRanked);
  return { topSold, topProfit };
}

/** Ventas completadas de la cuenta en el rango: las anuladas no cuentan. */
function completedSalesWhere(accountId: string, start: Date, end: Date): Prisma.SaleWhereInput {
  return { accountId, status: 'COMPLETED', soldAt: { gte: start, lt: end } };
}

async function totalsBetween(accountId: string, start: Date, end: Date): Promise<SummaryTotals> {
  const where = completedSalesWhere(accountId, start, end);
  const [salesCount, sums] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.saleItem.aggregate({ where: { sale: where }, _sum: { lineTotal: true, lineCost: true } }),
  ]);
  return buildSummaryTotals({ salesCount, salesTotal: sums._sum.lineTotal, costTotal: sums._sum.lineCost });
}

/** Ganancia real de un rango, con los dos rankings: la usan el resumen y el reporte semanal. */
export async function salesSummaryBetween(accountId: string, start: Date, end: Date) {
  const [totals, groups] = await Promise.all([
    totalsBetween(accountId, start, end),
    prisma.saleItem.groupBy({
      by: ['productId', 'productName'],
      where: { sale: completedSalesWhere(accountId, start, end) },
      _sum: { quantity: true, lineTotal: true, lineCost: true },
    }),
  ]);
  return { ...totals, ...rankProducts(groups) };
}

function change(current: string, previous: string): string | null {
  const before = new Decimal(previous);
  if (before.eq(0)) return null;
  return new Decimal(current).minus(before).div(before.abs()).mul(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

/** `GET /api/sales/summary`: el período pedido, su comparación con el anterior y los rankings. */
export async function getSalesSummary(accountId: string, period: SummaryPeriod, now: Date = new Date()) {
  const range = summaryRange(period, now);
  const [current, previous] = await Promise.all([
    salesSummaryBetween(accountId, range.start, range.end),
    totalsBetween(accountId, range.previousStart, range.previousEnd),
  ]);
  const { topSold, topProfit, ...totals } = current;
  return {
    period,
    from: range.from,
    to: range.to,
    ...totals,
    previous: { from: range.previousFrom, to: range.previousTo, ...previous },
    /** Variación porcentual contra el período anterior; `null` si el anterior fue 0. */
    change: {
      salesTotal: change(totals.salesTotal, previous.salesTotal),
      profit: change(totals.profit, previous.profit),
    },
    topSold,
    topProfit,
  };
}
