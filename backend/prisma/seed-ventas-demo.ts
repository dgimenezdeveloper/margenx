/// <reference types="node" />
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { buildDemoSales, createRng, type DemoProduct } from "./seed-ventas-demo-data";

// Módulo de ventas de la cuenta "Demo MargenX" (ADR-010): script independiente.
// Requiere la Demo ya sembrada (seed-demo.ts). Solo toca la cuenta Demo.
//
//   SEED_VENTAS_MODO="cargar" (por defecto): borra las ventas y los turnos de caja
//     de la Demo, carga 21 días de ventas y turnos cerrados que terminan ayer y
//     prende la excepción "sales" de la cuenta. Volver a correrlo reinicia el escenario.
//   SEED_VENTAS_MODO="apagar": apaga la excepción "sales" sin borrar nada.
//
// Mismas protecciones que seed.ts: SEED_CONFIRM_TARGET con el host:puerto/base exacto
// y, con NODE_ENV=production, ALLOW_PRODUCTION_SEED=true.

const ACCOUNT = {
  id: "31a00000-0000-4000-8000-000000000001",
  businessName: "Demo MargenX",
  slug: "demo-margenx",
};
const USERS = {
  admin: "31d00001-0000-4000-8000-000000000001",
  collaborator: "31d00001-0000-4000-8000-000000000002",
};
const DAYS = 21;
const MAX_PRODUCTS = 12;
const RNG_SEED = 20261122;
const CHUNK = 500;

const prisma = new PrismaClient();

function confirmDatabaseTarget() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error(
      "Seed bloqueado: NODE_ENV=production. Para cargar las ventas de la Demo en producción, " +
      "configurá ALLOW_PRODUCTION_SEED=true explícitamente.",
    );
  }

  const connection = process.env.DATABASE_URL;
  if (!connection) {
    throw new Error("Falta DATABASE_URL. No se realizó la carga.");
  }

  const url = new URL(connection);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("El seed requiere una conexión PostgreSQL.");
  }

  const database = decodeURIComponent(url.pathname.slice(1));
  if (!url.hostname || !database) {
    throw new Error("DATABASE_URL debe indicar un host y una base de datos.");
  }

  // No muestra usuario, contraseña ni parámetros de conexión.
  const target = url.hostname + ":" + (url.port || "5432") + "/" + database;

  if (process.env.SEED_CONFIRM_TARGET !== target) {
    throw new Error(
      "Carga no autorizada. Destino detectado: " + target +
      ". Verificá que sea la base correcta y configurá SEED_CONFIRM_TARGET con ese valor exacto.",
    );
  }

  console.log("Destino confirmado:", target);
}

/** Primer día de la carga, a las 00:00 UTC: los 21 días terminan ayer. */
function firstDay(now: Date): Date {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(today - DAYS * 24 * 60 * 60 * 1000);
}

function chunks<T>(rows: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(rows.slice(i, i + CHUNK));
  return out;
}

async function main() {
  confirmDatabaseTarget();
  const mode = process.env.SEED_VENTAS_MODO ?? "cargar";
  if (mode !== "cargar" && mode !== "apagar") {
    throw new Error('SEED_VENTAS_MODO debe ser "cargar" o "apagar".');
  }

  const counts = await prisma.$transaction(async (tx) => {
    const account = await tx.account.findUnique({ where: { id: ACCOUNT.id } });
    if (!account || account.slug !== ACCOUNT.slug || account.businessName !== ACCOUNT.businessName) {
      throw new Error("No está la cuenta " + ACCOUNT.businessName + " del seed demo. Sembrá primero seed-demo.ts.");
    }
    const accountId = ACCOUNT.id;

    if (mode === "cargar") {
      const users = await tx.user.findMany({
        where: { accountId, id: { in: [USERS.admin, USERS.collaborator] } },
        select: { id: true },
      });
      const ids = new Set(users.map((user) => user.id));
      if (!ids.has(USERS.admin)) {
        throw new Error("Falta el administrador de la Demo. Sembrá primero seed-demo.ts.");
      }

      const rows = await tx.product.findMany({
        where: { accountId, ingredients: { some: {} }, salePrice: { gt: 0 }, cost: { gt: 0 }, marginPercent: { gt: 0 } },
        select: { id: true, name: true, salePrice: true, cost: true, marginPercent: true },
        orderBy: { name: "asc" },
        take: MAX_PRODUCTS,
      });
      const products: DemoProduct[] = rows.map((row) => ({
        id: row.id,
        name: row.name,
        salePrice: row.salePrice.toFixed(2),
        cost: row.cost.toFixed(2),
        marginPercent: row.marginPercent.toFixed(2),
      }));

      const { shifts, sales, items } = buildDemoSales({
        products,
        users: { admin: USERS.admin, collaborator: ids.has(USERS.collaborator) ? USERS.collaborator : null },
        firstDay: firstDay(new Date()),
        days: DAYS,
        rng: createRng(RNG_SEED),
      });

      // Reinicia el escenario: solo las ventas y los turnos de la cuenta Demo.
      await tx.saleItem.deleteMany({ where: { sale: { accountId } } });
      await tx.sale.deleteMany({ where: { accountId } });
      await tx.cashShift.deleteMany({ where: { accountId } });

      for (const part of chunks(shifts)) {
        await tx.cashShift.createMany({ data: part.map((shift) => ({ ...shift, accountId })) });
      }
      for (const part of chunks(sales)) {
        await tx.sale.createMany({ data: part.map((sale) => ({ ...sale, accountId })) });
      }
      for (const part of chunks(items)) {
        await tx.saleItem.createMany({ data: part });
      }
    }

    await tx.accountFeature.upsert({
      where: { accountId_feature: { accountId, feature: "sales" } },
      create: { accountId, feature: "sales", enabled: mode === "cargar" },
      update: { enabled: mode === "cargar" },
    });

    return [
      { tabla: "AccountFeature sales", total: mode === "cargar" ? "prendida" : "apagada" },
      { tabla: "CashShift", total: await tx.cashShift.count({ where: { accountId } }) },
      { tabla: "Sale", total: await tx.sale.count({ where: { accountId } }) },
      { tabla: "Sale anuladas", total: await tx.sale.count({ where: { accountId, status: "VOIDED" } }) },
      { tabla: "SaleItem", total: await tx.saleItem.count({ where: { sale: { accountId } } }) },
    ];
  }, { timeout: 60000 });

  console.log("Seed de ventas (" + mode + ") completado para la cuenta " + ACCOUNT.businessName + ".");
  console.table(counts);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
