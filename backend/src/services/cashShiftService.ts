import { Prisma, type CashShift, type PaymentMethod, type SaleStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../utils/pagination';
import { PAYMENT_METHODS, type SaleActor } from './salesService';

/*
  Caja por turnos (ADR-010, docs/especificacion-funcional.md §13).
  Un solo turno abierto por cuenta (índice parcial único "CashShift_accountId_open_key").
  ADMIN y COLLABORATOR abren y cierran. Al cierre se guardan lo esperado y lo contado
  por medio de pago, y la diferencia total: el arqueo de un turno cerrado no cambia,
  porque con el turno cerrado tampoco se anulan ventas. El arqueo no tiene costos ni
  márgenes, así que es el mismo para los dos roles.
*/

const Decimal = Prisma.Decimal;
type DecimalType = Prisma.Decimal;
type ByMethod = Record<PaymentMethod, DecimalType>;

/** Tope de `Decimal(12,2)` acotado a un monto de caja razonable. */
export const MAX_CASH_AMOUNT = 99_999_999.99;
const AMOUNT_REGEX = /^\d{1,8}(\.\d{1,2})?$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SHIFT_ALREADY_OPEN_MESSAGE = 'Ya hay un turno de caja abierto. Cerralo antes de abrir otro.';
export const SHIFT_ALREADY_CLOSED_MESSAGE = 'El turno ya está cerrado.';
export const SHIFT_NOT_FOUND_MESSAGE = 'El turno no existe.';

const METHOD_FIELDS: Record<PaymentMethod, { counted: string; label: string }> = {
  CASH: { counted: 'countedCash', label: 'en efectivo' },
  TRANSFER: { counted: 'countedTransfer', label: 'por transferencia' },
  MERCADO_PAGO: { counted: 'countedMercadoPago', label: 'por Mercado Pago' },
};

export interface ShiftListQuery {
  page: number;
  limit: number;
}

/** Una fila de `sale.groupBy` por medio de pago y estado. */
export interface SalesGroup {
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  _sum: { total: DecimalType | null };
  _count: { _all: number };
}

export interface SalesSummary {
  byMethod: ByMethod;
  salesCount: number;
  voidedCount: number;
  salesTotal: DecimalType;
}

export interface Arqueo {
  differenceByMethod: ByMethod;
  expectedTotal: DecimalType;
  countedTotal: DecimalType;
  difference: DecimalType;
}

type ShiftWithUsers = CashShift & {
  openedBy: { email: string } | null;
  closedBy: { email: string } | null;
};

const SHIFT_INCLUDE = {
  openedBy: { select: { email: true } },
  closedBy: { select: { email: true } },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function zeroByMethod(): ByMethod {
  return { CASH: new Decimal(0), TRANSFER: new Decimal(0), MERCADO_PAGO: new Decimal(0) };
}

function sum(values: DecimalType[]): DecimalType {
  return values.reduce((acc, value) => acc.plus(value), new Decimal(0));
}

function money(value: DecimalType): string {
  return value.toFixed(2);
}

/** Monto de caja: número o texto, de 0 a 99.999.999,99, con hasta 2 decimales. */
function parseAmount(raw: unknown, what: string): DecimalType {
  const text = typeof raw === 'number' && Number.isFinite(raw) ? String(raw) : typeof raw === 'string' ? raw.trim() : '';
  if (!AMOUNT_REGEX.test(text)) {
    throw new AppError(
      `Indicá ${what}: un monto de 0 a $99.999.999,99, con hasta 2 decimales.`,
      400
    );
  }
  return new Decimal(text);
}

/** Cuerpo de `POST /api/cash-shifts/open`. */
export function parseOpeningAmount(body: unknown): DecimalType {
  return parseAmount(isRecord(body) ? body.openingAmount : undefined, 'el monto inicial de la caja');
}

/** Cuerpo de `POST /api/cash-shifts/:id/close`: lo contado en los tres medios de pago. */
export function parseCloseInput(body: unknown): ByMethod {
  const record = isRecord(body) ? body : {};
  const counted = zeroByMethod();
  for (const method of PAYMENT_METHODS) {
    const { counted: field, label } = METHOD_FIELDS[method];
    counted[method] = parseAmount(record[field], `lo contado ${label}`);
  }
  return counted;
}

export function parseShiftListQuery(query: Record<string, unknown>): ShiftListQuery {
  const rawPage = Number(query.page);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;
  const rawLimit = Number(query.limit);
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;
  return { page, limit };
}

/** Ventas del turno por medio de pago. Las anuladas no suman: se cuentan aparte. */
export function summarizeSales(groups: SalesGroup[]): SalesSummary {
  const byMethod = zeroByMethod();
  let salesCount = 0;
  let voidedCount = 0;
  for (const group of groups) {
    if (group.status === 'VOIDED') {
      voidedCount += group._count._all;
      continue;
    }
    salesCount += group._count._all;
    byMethod[group.paymentMethod] = byMethod[group.paymentMethod].plus(group._sum.total ?? 0);
  }
  return { byMethod, salesCount, voidedCount, salesTotal: sum(Object.values(byMethod)) };
}

/** Lo esperado en caja: el monto inicial va al efectivo; los otros medios, solo sus ventas. */
export function computeExpected(openingAmount: DecimalType, salesByMethod: ByMethod): ByMethod {
  return {
    CASH: openingAmount.plus(salesByMethod.CASH),
    TRANSFER: salesByMethod.TRANSFER,
    MERCADO_PAGO: salesByMethod.MERCADO_PAGO,
  };
}

/** Diferencia (contado − esperado) por medio de pago y total. Negativa = falta plata. */
export function computeArqueo(expected: ByMethod, counted: ByMethod): Arqueo {
  const differenceByMethod = zeroByMethod();
  for (const method of PAYMENT_METHODS) {
    differenceByMethod[method] = counted[method].minus(expected[method]);
  }
  const expectedTotal = sum(Object.values(expected));
  const countedTotal = sum(Object.values(counted));
  return { differenceByMethod, expectedTotal, countedTotal, difference: countedTotal.minus(expectedTotal) };
}

/**
 * Resumen del turno para la API. Abierto: lo esperado se calcula con las ventas hasta ahora.
 * Cerrado: lo esperado y lo contado son los guardados al cierre.
 */
export function serializeShift(shift: ShiftWithUsers, summary: SalesSummary) {
  const isClosed =
    shift.status === 'CLOSED' &&
    shift.expectedCash !== null &&
    shift.expectedTransfer !== null &&
    shift.expectedMercadoPago !== null &&
    shift.countedCash !== null &&
    shift.countedTransfer !== null &&
    shift.countedMercadoPago !== null;

  const expected: ByMethod = isClosed
    ? { CASH: shift.expectedCash!, TRANSFER: shift.expectedTransfer!, MERCADO_PAGO: shift.expectedMercadoPago! }
    : computeExpected(shift.openingAmount, summary.byMethod);
  const counted: ByMethod | null = isClosed
    ? { CASH: shift.countedCash!, TRANSFER: shift.countedTransfer!, MERCADO_PAGO: shift.countedMercadoPago! }
    : null;
  const arqueo = counted ? computeArqueo(expected, counted) : null;

  return {
    id: shift.id,
    status: shift.status,
    openedAt: shift.openedAt.toISOString(),
    openedBy: shift.openedBy?.email ?? null,
    closedAt: shift.closedAt?.toISOString() ?? null,
    closedBy: shift.closedBy?.email ?? null,
    openingAmount: money(shift.openingAmount),
    salesCount: summary.salesCount,
    voidedCount: summary.voidedCount,
    salesTotal: money(summary.salesTotal),
    methods: PAYMENT_METHODS.map((method) => ({
      paymentMethod: method,
      salesTotal: money(summary.byMethod[method]),
      expected: money(expected[method]),
      counted: counted ? money(counted[method]) : null,
      difference: arqueo ? money(arqueo.differenceByMethod[method]) : null,
    })),
    expectedTotal: money(sum(Object.values(expected))),
    countedTotal: arqueo ? money(arqueo.countedTotal) : null,
    difference: arqueo ? money(arqueo.difference) : null,
  };
}

export type ShiftSummary = ReturnType<typeof serializeShift>;

/**
 * El ADMIN ve todos los turnos; el colaborador, "el arqueo de su turno" (especificación §13):
 * el abierto y los que abrió, cerró o en los que vendió.
 */
function visibleShiftsWhere(actor: SaleActor): Prisma.CashShiftWhereInput {
  if (actor.role === 'ADMIN') return { accountId: actor.accountId };
  return {
    accountId: actor.accountId,
    OR: [
      { status: 'OPEN' },
      { openedById: actor.id },
      { closedById: actor.id },
      { sales: { some: { soldById: actor.id } } },
    ],
  };
}

async function summaryOf(accountId: string, shiftId: string, client: Prisma.TransactionClient = prisma) {
  const groups = await client.sale.groupBy({
    by: ['paymentMethod', 'status'],
    where: { accountId, cashShiftId: shiftId },
    _sum: { total: true },
    _count: { _all: true },
  });
  return summarizeSales(groups);
}

function isOpenShiftConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export async function openShift(actor: SaleActor, openingAmount: DecimalType): Promise<ShiftSummary> {
  const existing = await prisma.cashShift.findFirst({
    where: { accountId: actor.accountId, status: 'OPEN' },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(SHIFT_ALREADY_OPEN_MESSAGE, 409);
  }

  try {
    const shift = await prisma.cashShift.create({
      data: { accountId: actor.accountId, openedById: actor.id, openingAmount },
      include: SHIFT_INCLUDE,
    });
    return serializeShift(shift, summarizeSales([]));
  } catch (error) {
    // Dos aperturas a la vez: el índice parcial único deja pasar solo una.
    if (isOpenShiftConflict(error)) throw new AppError(SHIFT_ALREADY_OPEN_MESSAGE, 409);
    throw error;
  }
}

/** El turno abierto de la cuenta con lo vendido hasta ahora, o `null` si no hay. */
export async function getCurrentShift(actor: SaleActor): Promise<ShiftSummary | null> {
  const shift = await prisma.cashShift.findFirst({
    where: { accountId: actor.accountId, status: 'OPEN' },
    include: SHIFT_INCLUDE,
  });
  if (!shift) return null;
  return serializeShift(shift, await summaryOf(actor.accountId, shift.id));
}

export async function findShift(actor: SaleActor, shiftId: string): Promise<ShiftSummary | null> {
  if (!UUID_REGEX.test(shiftId)) return null;
  const shift = await prisma.cashShift.findFirst({
    where: { id: shiftId, ...visibleShiftsWhere(actor) },
    include: SHIFT_INCLUDE,
  });
  if (!shift) return null;
  return serializeShift(shift, await summaryOf(actor.accountId, shift.id));
}

/**
 * Cierra el turno con el arqueo, en una transacción. Primero pasa el turno a CLOSED: esa
 * actualización espera a las ventas y anulaciones en curso (que toman un bloqueo compartido
 * sobre la fila) y frena las que llegan después. Recién entonces suma las ventas, así
 * ninguna queda afuera del arqueo.
 */
export async function closeShift(actor: SaleActor, shiftId: string, counted: ByMethod): Promise<ShiftSummary> {
  if (!UUID_REGEX.test(shiftId)) {
    throw new AppError(SHIFT_NOT_FOUND_MESSAGE, 404);
  }

  return prisma.$transaction(async (tx) => {
    const shift = await tx.cashShift.findFirst({
      where: { id: shiftId, accountId: actor.accountId },
      select: {
        id: true,
        status: true,
        openingAmount: true,
        openedById: true,
        closedById: true,
        _count: { select: { sales: { where: { soldById: actor.id } } } },
      },
    });
    if (!shift) {
      throw new AppError(SHIFT_NOT_FOUND_MESSAGE, 404);
    }
    if (shift.status === 'CLOSED') {
      // Al colaborador, un turno cerrado ajeno le responde igual que uno que no existe.
      const visible =
        actor.role === 'ADMIN' ||
        shift.openedById === actor.id ||
        shift.closedById === actor.id ||
        shift._count.sales > 0;
      throw new AppError(visible ? SHIFT_ALREADY_CLOSED_MESSAGE : SHIFT_NOT_FOUND_MESSAGE, visible ? 409 : 404);
    }

    const locked = await tx.cashShift.updateMany({
      where: { id: shift.id, accountId: actor.accountId, status: 'OPEN' },
      data: { status: 'CLOSED', closedAt: new Date(), closedById: actor.id },
    });
    if (locked.count === 0) {
      throw new AppError(SHIFT_ALREADY_CLOSED_MESSAGE, 409);
    }

    const summary = await summaryOf(actor.accountId, shift.id, tx);
    const expected = computeExpected(shift.openingAmount, summary.byMethod);
    const arqueo = computeArqueo(expected, counted);

    const closed = await tx.cashShift.update({
      where: { id: shift.id },
      data: {
        expectedCash: expected.CASH,
        expectedTransfer: expected.TRANSFER,
        expectedMercadoPago: expected.MERCADO_PAGO,
        countedCash: counted.CASH,
        countedTransfer: counted.TRANSFER,
        countedMercadoPago: counted.MERCADO_PAGO,
        difference: arqueo.difference,
      },
      include: SHIFT_INCLUDE,
    });
    return serializeShift(closed, summary);
  });
}

export async function listShifts(actor: SaleActor, query: ShiftListQuery) {
  const where = visibleShiftsWhere(actor);
  const [total, shifts] = await prisma.$transaction([
    prisma.cashShift.count({ where }),
    prisma.cashShift.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: SHIFT_INCLUDE,
    }),
  ]);

  const groups = shifts.length
    ? await prisma.sale.groupBy({
        by: ['cashShiftId', 'paymentMethod', 'status'],
        where: { accountId: actor.accountId, cashShiftId: { in: shifts.map((shift) => shift.id) } },
        _sum: { total: true },
        _count: { _all: true },
      })
    : [];

  return {
    data: shifts.map((shift) =>
      serializeShift(shift, summarizeSales(groups.filter((group) => group.cashShiftId === shift.id)))
    ),
    meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) },
  };
}
