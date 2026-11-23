import { Prisma, type PaymentMethod, type Role, type Sale, type SaleItem } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../utils/pagination';
import { calculateMarginPercent } from './marginCalculator';

/*
  Venta con ticket no fiscal (ADR-010, docs/especificacion-funcional.md §13).
  Cada renglón guarda el precio, el costo y el margen DEL MOMENTO de la venta, así
  la ganancia histórica no cambia cuando cambia un costo (ADR-005). El precio y el
  costo salen siempre de la base, nunca del cliente.
*/

const Decimal = Prisma.Decimal;
type DecimalType = Prisma.Decimal;

export const PAYMENT_METHODS: readonly PaymentMethod[] = ['CASH', 'TRANSFER', 'MERCADO_PAGO'];
export const MAX_SALE_ITEMS = 50;
export const MAX_ITEM_QUANTITY = 999;
const MAX_TICKET_ATTEMPTS = 3;
const VOID_REASON_MIN = 3;
const VOID_REASON_MAX = 200;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
/** Argentina no tiene horario de verano: el día va de 00:00 a 24:00 en UTC−3. */
const ARGENTINA_OFFSET = '-03:00';
const DAY_MS = 24 * 60 * 60 * 1000;

export const NO_OPEN_SHIFT_MESSAGE = 'No hay un turno de caja abierto. Abrí el turno para empezar a cobrar.';
export const CLOSED_SHIFT_VOID_MESSAGE =
  'Solo se pueden anular ventas del turno abierto. El turno de esta venta ya se cerró y su arqueo no cambia.';

export interface SaleItemInput {
  productId: string;
  quantity: number;
}

export interface SaleInput {
  paymentMethod: PaymentMethod;
  items: SaleItemInput[];
}

export interface ProductForSale {
  id: string;
  name: string;
  salePrice: DecimalType;
  cost: DecimalType;
  ingredientsCount: number;
}

export interface SaleLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: DecimalType;
  unitCost: DecimalType;
  marginPercent: DecimalType;
  lineTotal: DecimalType;
  lineCost: DecimalType;
}

export type SaleWithItems = Sale & { items: SaleItem[] };

export interface SaleListQuery {
  page: number;
  limit: number;
  date?: string;
  cashShiftId?: string;
}

/** El vendedor que pide la operación: la cuenta sale siempre de la sesión (DoD §6). */
export interface SaleActor {
  id: string;
  accountId: string;
  role: Role;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Valida el cuerpo de `POST /api/sales`. Solo toma producto, cantidad y medio de pago. */
export function parseSaleInput(body: unknown): SaleInput {
  const data = isRecord(body) ? body : {};
  const paymentMethod = data.paymentMethod;
  if (typeof paymentMethod !== 'string' || !PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)) {
    throw new AppError('Elegí el medio de pago: efectivo, transferencia o Mercado Pago.', 400);
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new AppError('La venta tiene que tener al menos un producto.', 400);
  }

  const quantities = new Map<string, number>();
  for (const raw of data.items) {
    const item = isRecord(raw) ? raw : {};
    const productId = item.productId;
    if (typeof productId !== 'string' || !UUID_REGEX.test(productId)) {
      throw new AppError('Cada renglón tiene que indicar un producto válido.', 400);
    }
    const quantity = item.quantity;
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
      throw new AppError(`La cantidad de cada producto tiene que ser un número entero entre 1 y ${MAX_ITEM_QUANTITY}.`, 400);
    }
    const accumulated = (quantities.get(productId) ?? 0) + quantity;
    if (accumulated > MAX_ITEM_QUANTITY) {
      throw new AppError(`La cantidad de cada producto tiene que ser un número entero entre 1 y ${MAX_ITEM_QUANTITY}.`, 400);
    }
    quantities.set(productId, accumulated);
  }

  if (quantities.size > MAX_SALE_ITEMS) {
    throw new AppError(`Una venta puede tener hasta ${MAX_SALE_ITEMS} productos distintos.`, 400);
  }

  return {
    paymentMethod: paymentMethod as PaymentMethod,
    items: [...quantities].map(([productId, quantity]) => ({ productId, quantity })),
  };
}

/**
 * Arma los renglones con el precio y el costo vigentes del producto. Rechaza los productos
 * que no son de la cuenta (404), los borradores sin receta y los que tienen precio en $0 (422).
 */
export function buildSaleLines(
  items: SaleItemInput[],
  products: ProductForSale[]
): { lines: SaleLine[]; total: DecimalType; totalCost: DecimalType } {
  const byId = new Map(products.map((product) => [product.id, product]));
  let total = new Decimal(0);
  let totalCost = new Decimal(0);

  const lines = items.map(({ productId, quantity }) => {
    const product = byId.get(productId);
    if (!product) {
      throw new AppError('Uno de los productos de la venta no existe.', 404);
    }
    if (product.ingredientsCount === 0) {
      throw new AppError(`"${product.name}" está en borrador (no tiene receta) y no se puede vender.`, 422);
    }
    if (product.salePrice.lte(0)) {
      throw new AppError(`"${product.name}" no tiene precio de venta cargado y no se puede vender.`, 422);
    }

    const unitPrice = product.salePrice.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const unitCost = product.cost.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const lineTotal = unitPrice.mul(quantity).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const lineCost = unitCost.mul(quantity).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    total = total.add(lineTotal);
    totalCost = totalCost.add(lineCost);

    return {
      productId,
      productName: product.name,
      quantity,
      unitPrice,
      unitCost,
      marginPercent: calculateMarginPercent(unitPrice, unitCost),
      lineTotal,
      lineCost,
    };
  });

  return { lines, total, totalCost };
}

const money = (value: DecimalType) => new Decimal(value).toFixed(2);

/** Respuesta de una venta. Al COLLABORATOR no le llega ningún campo de costo ni de margen. */
export function serializeSale(sale: SaleWithItems, role: Role, businessName: string) {
  const isAdmin = role === 'ADMIN';
  const totalCost = sale.items.reduce((sum, item) => sum.add(item.lineCost), new Decimal(0));

  return {
    id: sale.id,
    ticketNumber: sale.ticketNumber,
    businessName,
    soldAt: sale.soldAt.toISOString(),
    paymentMethod: sale.paymentMethod,
    total: money(sale.total),
    ...(isAdmin ? { totalCost: money(totalCost) } : {}),
    status: sale.status,
    cashShiftId: sale.cashShiftId,
    voidedAt: sale.voidedAt ? sale.voidedAt.toISOString() : null,
    voidReason: sale.voidReason,
    items: sale.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: money(item.unitPrice),
      lineTotal: money(item.lineTotal),
      ...(isAdmin
        ? { unitCost: money(item.unitCost), lineCost: money(item.lineCost), marginPercent: money(item.marginPercent) }
        : {}),
    })),
  };
}

function isValidIsoDate(text: string): boolean {
  if (!ISO_DATE_REGEX.test(text)) return false;
  const parsed = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text;
}

/** Rango de un día calendario de Argentina, para filtrar por `soldAt`. */
export function argentinaDayRange(date: string): { start: Date; end: Date } {
  const start = new Date(`${date}T00:00:00${ARGENTINA_OFFSET}`);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/** Filtros de `GET /api/sales`: página, día (AAAA-MM-DD, hora de Argentina) y turno. */
export function parseSaleListQuery(query: Record<string, unknown>): SaleListQuery {
  const rawPage = Number(query.page);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;
  const rawLimit = Number(query.limit);
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;
  const result: SaleListQuery = { page, limit };

  if (query.date !== undefined) {
    if (typeof query.date !== 'string' || !isValidIsoDate(query.date)) {
      throw new AppError('La fecha tiene que tener el formato AAAA-MM-DD.', 400);
    }
    result.date = query.date;
  }
  if (query.cashShiftId !== undefined) {
    if (typeof query.cashShiftId !== 'string' || !UUID_REGEX.test(query.cashShiftId)) {
      throw new AppError('El turno indicado no es válido.', 400);
    }
    result.cashShiftId = query.cashShiftId;
  }
  return result;
}

/** Motivo obligatorio de una anulación. */
export function parseVoidReason(body: unknown): string {
  const raw = isRecord(body) && typeof body.reason === 'string' ? body.reason.trim() : '';
  if (raw.length < VOID_REASON_MIN) {
    throw new AppError('Escribí el motivo de la anulación.', 400);
  }
  if (raw.length > VOID_REASON_MAX) {
    throw new AppError(`El motivo puede tener hasta ${VOID_REASON_MAX} caracteres.`, 400);
  }
  return raw;
}

function isTicketNumberConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
  const target = (error.meta as { target?: unknown } | undefined)?.target;
  const fields = Array.isArray(target) ? target.map(String) : [String(target ?? '')];
  return fields.some((field) => field.includes('ticketNumber'));
}

/**
 * Registra una venta en una sola transacción: turno abierto, precios y costos vigentes,
 * número de ticket correlativo por cuenta y renglones congelados. Si dos ventas toman el
 * mismo número a la vez, el índice único lo rechaza y se reintenta con el siguiente.
 */
export async function createSale(actor: SaleActor, input: SaleInput): Promise<SaleWithItems> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Bloqueo compartido sobre la fila del turno hasta el fin de la transacción: el cierre
        // (que actualiza esa fila) espera a que termine la venta, y una venta que llega
        // durante un cierre espera y encuentra el turno cerrado. Así ninguna venta queda
        // afuera de un arqueo ya calculado.
        const [shift] = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "CashShift"
          WHERE "accountId" = ${actor.accountId} AND "status" = 'OPEN'
          FOR SHARE`;
        if (!shift) {
          throw new AppError(NO_OPEN_SHIFT_MESSAGE, 409);
        }

        const products = await tx.product.findMany({
          where: { accountId: actor.accountId, id: { in: input.items.map((item) => item.productId) } },
          select: { id: true, name: true, salePrice: true, cost: true, _count: { select: { ingredients: true } } },
        });
        const { lines, total } = buildSaleLines(
          input.items,
          products.map((product) => ({
            id: product.id,
            name: product.name,
            salePrice: product.salePrice,
            cost: product.cost,
            ingredientsCount: product._count.ingredients,
          }))
        );

        const last = await tx.sale.aggregate({
          where: { accountId: actor.accountId },
          _max: { ticketNumber: true },
        });

        return tx.sale.create({
          data: {
            accountId: actor.accountId,
            cashShiftId: shift.id,
            soldById: actor.id,
            ticketNumber: (last._max.ticketNumber ?? 0) + 1,
            paymentMethod: input.paymentMethod,
            total,
            items: { create: lines },
          },
          include: { items: true },
        });
      });
    } catch (error) {
      if (attempt < MAX_TICKET_ATTEMPTS && isTicketNumberConflict(error)) continue;
      throw error;
    }
  }
}

/** El colaborador solo ve sus ventas; el ADMIN, las de toda la cuenta. */
function visibleSalesWhere(actor: SaleActor): Prisma.SaleWhereInput {
  return actor.role === 'ADMIN'
    ? { accountId: actor.accountId }
    : { accountId: actor.accountId, soldById: actor.id };
}

export async function listSales(actor: SaleActor, query: SaleListQuery) {
  const where: Prisma.SaleWhereInput = { ...visibleSalesWhere(actor) };
  if (query.date) {
    const { start, end } = argentinaDayRange(query.date);
    where.soldAt = { gte: start, lt: end };
  }
  if (query.cashShiftId) {
    where.cashShiftId = query.cashShiftId;
  }

  const [total, sales] = await prisma.$transaction([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      orderBy: { soldAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        ticketNumber: true,
        soldAt: true,
        paymentMethod: true,
        total: true,
        status: true,
        cashShiftId: true,
        _count: { select: { items: true } },
      },
    }),
  ]);

  return {
    data: sales.map((sale) => ({
      id: sale.id,
      ticketNumber: sale.ticketNumber,
      soldAt: sale.soldAt.toISOString(),
      paymentMethod: sale.paymentMethod,
      total: money(sale.total),
      status: sale.status,
      cashShiftId: sale.cashShiftId,
      itemsCount: sale._count.items,
    })),
    meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) },
  };
}

/** Una venta con sus renglones, o `null` si no existe o el usuario no puede verla. */
export async function findSale(actor: SaleActor, saleId: string) {
  if (!UUID_REGEX.test(saleId)) return null;
  return prisma.sale.findFirst({
    where: { id: saleId, ...visibleSalesWhere(actor) },
    include: { items: { orderBy: { productName: 'asc' } }, account: { select: { businessName: true } } },
  });
}

/**
 * Anula una venta con su motivo; no borra nada. Solo mientras el turno de la venta siga
 * abierto, para que el arqueo de un turno cerrado no cambie nunca. El ADMIN anula
 * cualquier venta del turno; el colaborador, solo las suyas.
 */
export async function voidSale(actor: SaleActor, saleId: string, reason: string) {
  if (!UUID_REGEX.test(saleId)) {
    throw new AppError('La venta no existe.', 404);
  }

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: saleId, accountId: actor.accountId },
      select: { id: true, status: true, soldById: true, cashShiftId: true },
    });
    // A un colaborador, la venta de otro usuario le responde igual que una que no existe.
    if (!sale || (actor.role !== 'ADMIN' && sale.soldById !== actor.id)) {
      throw new AppError('La venta no existe.', 404);
    }
    if (sale.status === 'VOIDED') {
      throw new AppError('La venta ya está anulada.', 409);
    }
    // Mismo bloqueo compartido que la venta: un cierre en curso espera a la anulación.
    const [shift] = await tx.$queryRaw<Array<{ status: string }>>`
      SELECT "status" FROM "CashShift"
      WHERE "id" = ${sale.cashShiftId} AND "accountId" = ${actor.accountId}
      FOR SHARE`;
    if (shift?.status !== 'OPEN') {
      throw new AppError(CLOSED_SHIFT_VOID_MESSAGE, 403);
    }

    const updated = await tx.sale.updateMany({
      where: { id: sale.id, accountId: actor.accountId, status: 'COMPLETED' },
      data: { status: 'VOIDED', voidedAt: new Date(), voidedById: actor.id, voidReason: reason },
    });
    if (updated.count === 0) {
      throw new AppError('La venta ya está anulada.', 409);
    }

    return tx.sale.findFirstOrThrow({
      where: { id: sale.id, accountId: actor.accountId },
      include: { items: { orderBy: { productName: 'asc' } }, account: { select: { businessName: true } } },
    });
  });
}
