import { Prisma } from "@prisma/client";

// Generación determinista de las ventas y los turnos de caja de la cuenta Demo
// (ADR-010). Funciones puras, sin base de datos: las usa seed-ventas-demo.ts.
// Importes en ARS con Prisma.Decimal y redondeo ROUND_HALF_UP (ADR-004).

type Decimal = Prisma.Decimal;
const D = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value);
const money = (value: Decimal) => value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

export type PaymentMethodName = "CASH" | "TRANSFER" | "MERCADO_PAGO";

export interface DemoProduct {
  id: string;
  name: string;
  salePrice: string;
  cost: string;
  marginPercent: string;
}

export interface DemoUsers {
  admin: string;
  collaborator: string | null;
}

export interface DemoShift {
  id: string;
  status: "CLOSED";
  openedById: string;
  openedAt: Date;
  openingAmount: Decimal;
  closedById: string;
  closedAt: Date;
  expectedCash: Decimal;
  expectedTransfer: Decimal;
  expectedMercadoPago: Decimal;
  countedCash: Decimal;
  countedTransfer: Decimal;
  countedMercadoPago: Decimal;
  difference: Decimal;
}

export interface DemoSale {
  id: string;
  cashShiftId: string;
  soldById: string;
  ticketNumber: number;
  soldAt: Date;
  paymentMethod: PaymentMethodName;
  total: Decimal;
  status: "COMPLETED" | "VOIDED";
  voidedAt: Date | null;
  voidedById: string | null;
  voidReason: string | null;
}

export interface DemoSaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: Decimal;
  unitCost: Decimal;
  marginPercent: Decimal;
  lineTotal: Decimal;
  lineCost: Decimal;
}

export interface DemoSalesInput {
  products: readonly DemoProduct[];
  users: DemoUsers;
  /** Primer día, a las 00:00 UTC. */
  firstDay: Date;
  days: number;
  rng: () => number;
}

/** Generador pseudoaleatorio con semilla (mulberry32): mismos datos en cada corrida. */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ID_PREFIX = { shift: "33a", sale: "33b", item: "33c" } as const;

/** IDs fijos con prefijo 33 (QA usa 30, la Demo 31 y el volumen 32). */
export function demoId(kind: keyof typeof ID_PREFIX, n: number): string {
  return `${ID_PREFIX[kind]}00000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

// Turnos en hora de Argentina (UTC−3): mañana de 7 a 14 y tarde de 14 a 21.
const HOUR = 60 * 60 * 1000;
const SHIFT_WINDOWS = [
  { startUtcHour: 10, endUtcHour: 17 },
  { startUtcHour: 17, endUtcHour: 24 },
] as const;
const OPENING_AMOUNT = D("10000.00");
const CASH_DIFFERENCES = ["0", "0", "0", "0", "0", "0", "-500", "200", "-1000", "0"] as const;
const VOID_REASONS = ["Se cobró otro producto", "El cliente no se llevó el pedido", "Cobro duplicado"] as const;

function pick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]!;
}

function paymentMethod(rng: () => number): PaymentMethodName {
  const r = rng();
  if (r < 0.55) return "CASH";
  if (r < 0.8) return "TRANSFER";
  return "MERCADO_PAGO";
}

function quantity(rng: () => number): number {
  const r = rng();
  if (r < 0.6) return 1;
  if (r < 0.85) return 2;
  if (r < 0.95) return 3;
  return 4;
}

export function buildDemoSales({ products, users, firstDay, days, rng }: DemoSalesInput) {
  if (products.length === 0) {
    throw new Error("La cuenta Demo no tiene productos con receta y precio para vender.");
  }

  const shifts: DemoShift[] = [];
  const sales: DemoSale[] = [];
  const items: DemoSaleItem[] = [];

  for (let day = 0; day < days; day++) {
    const dayStart = firstDay.getTime() + day * 24 * HOUR;
    const isSunday = new Date(dayStart).getUTCDay() === 0;
    const windows = isSunday ? SHIFT_WINDOWS.slice(0, 1) : SHIFT_WINDOWS;

    windows.forEach((window, windowIndex) => {
      const cashier = windowIndex === 1 && users.collaborator ? users.collaborator : users.admin;
      const shiftId = demoId("shift", shifts.length + 1);
      const openedAt = new Date(dayStart + window.startUtcHour * HOUR);
      const closedAt = new Date(dayStart + window.endUtcHour * HOUR);
      const salesInShift = 10 + Math.floor(rng() * 15);
      const slot = (closedAt.getTime() - openedAt.getTime()) / (salesInShift + 1);

      const totals: Record<PaymentMethodName, Decimal> = { CASH: D(0), TRANSFER: D(0), MERCADO_PAGO: D(0) };

      for (let s = 0; s < salesInShift; s++) {
        const saleId = demoId("sale", sales.length + 1);
        const soldAt = new Date(Math.round(openedAt.getTime() + slot * (s + 1)));
        const method = paymentMethod(rng);

        const lineCount = 1 + Math.floor(rng() * Math.min(3, products.length));
        const chosen = new Set<DemoProduct>();
        while (chosen.size < lineCount) chosen.add(pick(products, rng));

        let total = D(0);
        for (const product of chosen) {
          const qty = quantity(rng);
          const unitPrice = money(D(product.salePrice));
          const unitCost = money(D(product.cost));
          const lineTotal = money(unitPrice.mul(qty));
          items.push({
            id: demoId("item", items.length + 1),
            saleId,
            productId: product.id,
            productName: product.name,
            quantity: qty,
            unitPrice,
            unitCost,
            marginPercent: money(D(product.marginPercent)),
            lineTotal,
            lineCost: money(unitCost.mul(qty)),
          });
          total = total.add(lineTotal);
        }

        const voided = rng() < 0.02;
        sales.push({
          id: saleId,
          cashShiftId: shiftId,
          soldById: cashier,
          ticketNumber: sales.length + 1,
          soldAt,
          paymentMethod: method,
          total: money(total),
          status: voided ? "VOIDED" : "COMPLETED",
          voidedAt: voided ? new Date(soldAt.getTime() + 5 * 60 * 1000) : null,
          voidedById: voided ? cashier : null,
          voidReason: voided ? pick(VOID_REASONS, rng) : null,
        });
        if (!voided) totals[method] = totals[method].add(total);
      }

      const expectedCash = money(OPENING_AMOUNT.add(totals.CASH));
      const expectedTransfer = money(totals.TRANSFER);
      const expectedMercadoPago = money(totals.MERCADO_PAGO);
      const countedCash = money(expectedCash.add(pick(CASH_DIFFERENCES, rng)));

      shifts.push({
        id: shiftId,
        status: "CLOSED",
        openedById: cashier,
        openedAt,
        openingAmount: OPENING_AMOUNT,
        closedById: cashier,
        closedAt,
        expectedCash,
        expectedTransfer,
        expectedMercadoPago,
        countedCash,
        countedTransfer: expectedTransfer,
        countedMercadoPago: expectedMercadoPago,
        difference: money(countedCash.sub(expectedCash)),
      });
    });
  }

  return { shifts, sales, items };
}
