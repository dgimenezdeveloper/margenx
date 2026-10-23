/// <reference types="node" />
import "dotenv/config";
import { Prisma, PrismaClient, Role } from "@prisma/client";
import {
  calculateRecipeTotal,
  calculateMarginAmount,
  calculateMarginPercent,
  calculateUnitCost,
} from "../src/services/marginCalculator";

// Cuenta de demostración "Demo MargenX": script independiente de seed.ts.
// Datos 100% ficticios, importes en ARS. IDs fijos con prefijo 31..., distintos
// de los 30... del seed de QA, para poder re-ejecutar sin duplicar (upsert).
//
// Los usuarios deben existir previamente en Clerk (este script no los crea):
// el authProviderId es el user_id de Clerk de cada uno.
//
// Re-ejecutar REINICIA el escenario de demo (costos, precios y la cuarentena
// pendiente vuelven al estado inicial).
//
// Alertas: el destinatario es el primer usuario ADMIN de la cuenta
// (demo-admin@margenx.tech); Account no tiene un campo ownerEmail.

const ACCOUNT = {
  id: "31a00000-0000-4000-8000-000000000001",
  businessName: "Demo MargenX",
  slug: "demo-margenx",
  users: [
    { id: "31d00001-0000-4000-8000-000000000001", email: "demo-admin@margenx.tech", role: Role.ADMIN, authProviderId: "user_3L76Tx5xz0PLTzloe2wiSvRWTZT" },
    { id: "31d00001-0000-4000-8000-000000000002", email: "demo-colab@margenx.tech", role: Role.COLLABORATOR, authProviderId: "user_3L76U1ydsm6uUGxpPmnpg7ZJlIK" },
  ],
};

const ING = {
  harina: "31b00001-0000-4000-8000-000000000001",
  azucar: "31b00001-0000-4000-8000-000000000002",
  manteca: "31b00001-0000-4000-8000-000000000003",
  huevos: "31b00001-0000-4000-8000-000000000004",
  leche: "31b00001-0000-4000-8000-000000000005",
  cacao: "31b00001-0000-4000-8000-000000000006",
  dulceDeLeche: "31b00001-0000-4000-8000-000000000007",
  aceite: "31b00001-0000-4000-8000-000000000008",
};

const ingredients = [
  { id: ING.harina, name: "Harina 000 (demo)", unit: "kg" },
  { id: ING.azucar, name: "Azúcar común (demo)", unit: "kg" },
  { id: ING.manteca, name: "Manteca (demo)", unit: "kg" },
  { id: ING.huevos, name: "Huevos (demo)", unit: "unit" },
  { id: ING.leche, name: "Leche entera (demo)", unit: "l" },
  { id: ING.cacao, name: "Cacao amargo (demo)", unit: "kg" },
  { id: ING.dulceDeLeche, name: "Dulce de leche repostero (demo)", unit: "kg" },
  { id: ING.aceite, name: "Aceite de girasol (demo)", unit: "l" },
];

interface DemoSupplierItem {
  id: string;
  ingredientId: string;
  supplierCode?: string;
  rawDescription?: string;
  packageSize: string;
  packageUnit: string;
  packagePrice: string;
  isDefault: boolean;
  // Caso de cuarentena: precio propuesto pendiente de liberar o rechazar.
  pendingPackagePrice?: string;
  quarantineReason?: string;
}

const suppliers: Array<{
  id: string;
  name: string;
  contactPhone: string;
  email: string;
  address: string;
  ingredients: DemoSupplierItem[];
}> = [
  {
    id: "31c00001-0000-4000-8000-000000000001",
    name: "Proveedor Demo con códigos",
    contactPhone: "+54 11 5555-0101",
    email: "ventas@proveedor-demo-con-codigos.example",
    address: "Calle Ficticia 100, Ciudad Demo",
    ingredients: [
      { id: "31e00001-0000-4000-8000-000000000001", ingredientId: ING.harina, supplierCode: "DEMO-HAR-25", rawDescription: "HARINA 000 BOLSA 25KG", packageSize: "25.000", packageUnit: "kg", packagePrice: "21000.00", isDefault: true },
      { id: "31e00001-0000-4000-8000-000000000002", ingredientId: ING.azucar, supplierCode: "DEMO-AZU-10", rawDescription: "AZUCAR COMUN 10KG", packageSize: "10.000", packageUnit: "kg", packagePrice: "12000.00", isDefault: true },
      { id: "31e00001-0000-4000-8000-000000000003", ingredientId: ING.manteca, supplierCode: "DEMO-MAN-02", rawDescription: "MANTECA PAN 2KG", packageSize: "2.000", packageUnit: "kg", packagePrice: "19000.00", isDefault: true },
      // Cuarentena: 12000 -> 21000 por kg (+75 %), pendiente de revisión.
      { id: "31e00001-0000-4000-8000-000000000004", ingredientId: ING.cacao, supplierCode: "DEMO-CAC-01", rawDescription: "CACAO AMARGO 1KG", packageSize: "1.000", packageUnit: "kg", packagePrice: "12000.00", isDefault: true, pendingPackagePrice: "21000.00", quarantineReason: "VARIACION_MAYOR_50_POR_CIENTO" },
      { id: "31e00001-0000-4000-8000-000000000005", ingredientId: ING.dulceDeLeche, supplierCode: "DEMO-DDL-05", rawDescription: "DULCE DE LECHE REPOSTERO 5KG", packageSize: "5.000", packageUnit: "kg", packagePrice: "17500.00", isDefault: true },
      { id: "31e00001-0000-4000-8000-000000000006", ingredientId: ING.aceite, supplierCode: "DEMO-ACE-05", rawDescription: "ACEITE GIRASOL 5L", packageSize: "5.000", packageUnit: "l", packagePrice: "9000.00", isDefault: true },
    ],
  },
  {
    // Sin supplierCode: sirve para mostrar la carga manual de precios.
    id: "31c00001-0000-4000-8000-000000000002",
    name: "Proveedor Demo sin códigos",
    contactPhone: "+54 11 5555-0102",
    email: "ventas@proveedor-demo-sin-codigos.example",
    address: "Avenida Inventada 200, Ciudad Demo",
    ingredients: [
      { id: "31e00001-0000-4000-8000-000000000007", ingredientId: ING.huevos, rawDescription: "Maple de huevos x30", packageSize: "30.000", packageUnit: "unit", packagePrice: "7500.00", isDefault: true },
      { id: "31e00001-0000-4000-8000-000000000008", ingredientId: ING.leche, rawDescription: "Leche entera sachet, caja x12 L", packageSize: "12.000", packageUnit: "l", packagePrice: "14400.00", isDefault: true },
      { id: "31e00001-0000-4000-8000-000000000009", ingredientId: ING.azucar, rawDescription: "Azúcar 10 kg", packageSize: "10.000", packageUnit: "kg", packagePrice: "11500.00", isDefault: false },
    ],
  },
];

// Costos por kg/l/unidad con los precios de arriba: harina 840, azúcar 1200,
// manteca 9500, huevo 250, leche 1200, cacao 12000, dulce de leche 3500, aceite 1800.
const products = [
  {
    id: "31f00001-0000-4000-8000-000000000001",
    name: "Torta de chocolate — 1 unidad",
    salePrice: "9800.00",
    minMarginPercent: "30.00",
    recipe: [
      { ingredientId: ING.harina, quantity: "0.350" },
      { ingredientId: ING.azucar, quantity: "0.300" },
      { ingredientId: ING.manteca, quantity: "0.200" },
      { ingredientId: ING.huevos, quantity: "5.000" },
      { ingredientId: ING.leche, quantity: "0.250" },
      { ingredientId: ING.cacao, quantity: "0.080" },
    ],
  },
  {
    // Costo 3681 sobre venta 5200 => margen 29,21 % con mínimo 28 %: una suba
    // de ~5 % en la manteca cruza el mínimo y dispara la alerta.
    id: "31f00001-0000-4000-8000-000000000002",
    name: "Alfajores de dulce de leche — docena",
    salePrice: "5200.00",
    minMarginPercent: "28.00",
    recipe: [
      { ingredientId: ING.harina, quantity: "0.400" },
      { ingredientId: ING.manteca, quantity: "0.150" },
      { ingredientId: ING.azucar, quantity: "0.100" },
      { ingredientId: ING.huevos, quantity: "3.000" },
      { ingredientId: ING.dulceDeLeche, quantity: "0.300" },
    ],
  },
  {
    id: "31f00001-0000-4000-8000-000000000003",
    name: "Pan de campo — 1 kg",
    salePrice: "2800.00",
    minMarginPercent: "35.00",
    recipe: [
      { ingredientId: ING.harina, quantity: "0.700" },
      { ingredientId: ING.aceite, quantity: "0.080" },
      { ingredientId: ING.azucar, quantity: "0.020" },
      { ingredientId: ING.leche, quantity: "0.300" },
    ],
  },
];

const prisma = new PrismaClient();

// Misma lógica de destino que confirmDatabaseTarget de seed.ts (host:puerto/base),
// pero con SEED_DEMO_CONFIRM. seed.ts no la exporta y no se modifica.
function confirmDatabaseTarget() {
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

  if (process.env.SEED_DEMO_CONFIRM !== target) {
    throw new Error(
      "Carga no autorizada. Destino detectado: " + target +
      ". Configurá SEED_DEMO_CONFIRM con ese valor exacto para confirmar que es la base correcta.",
    );
  }

  console.log("Destino confirmado:", target);
}

async function main() {
  confirmDatabaseTarget();

  const counts = await prisma.$transaction(async (tx) => {
    const matchingAccounts = await tx.account.findMany({
      where: { OR: [{ id: ACCOUNT.id }, { businessName: ACCOUNT.businessName }, { slug: ACCOUNT.slug }] },
    });
    if (matchingAccounts.some((row) =>
      row.id !== ACCOUNT.id || row.businessName !== ACCOUNT.businessName || row.slug !== ACCOUNT.slug
    )) {
      throw new Error("Conflicto de identidad en la cuenta " + ACCOUNT.businessName + ". No se adopta ni elimina ningún registro existente.");
    }

    await tx.account.upsert({
      where: { id: ACCOUNT.id },
      create: { id: ACCOUNT.id, businessName: ACCOUNT.businessName, slug: ACCOUNT.slug },
      update: { businessName: ACCOUNT.businessName, slug: ACCOUNT.slug },
    });

    for (const user of ACCOUNT.users) {
      const matchingUsers = await tx.user.findMany({
        where: { OR: [{ id: user.id }, { email: user.email }, { authProviderId: user.authProviderId }] },
      });
      if (matchingUsers.some((row) =>
        row.id !== user.id || row.accountId !== ACCOUNT.id ||
        row.email !== user.email || row.authProviderId !== user.authProviderId
      )) {
        throw new Error("Conflicto de identidad del usuario " + user.email + ".");
      }

      await tx.user.upsert({
        where: { id: user.id },
        create: { ...user, accountId: ACCOUNT.id },
        update: { role: user.role },
      });
    }

    // Costo unitario por insumo según su proveedor predeterminado.
    const costById = new Map<string, Prisma.Decimal>();
    for (const supplier of suppliers) {
      for (const item of supplier.ingredients) {
        if (!item.isDefault) continue;
        costById.set(
          item.ingredientId,
          calculateUnitCost(new Prisma.Decimal(item.packagePrice), new Prisma.Decimal(item.packageSize)),
        );
      }
    }

    for (const ingredient of ingredients) {
      const matching = await tx.ingredient.findMany({
        where: { OR: [{ id: ingredient.id }, { accountId: ACCOUNT.id, name: ingredient.name }] },
      });
      if (matching.some((row) => row.id !== ingredient.id || row.accountId !== ACCOUNT.id || row.name !== ingredient.name)) {
        throw new Error("Conflicto de identidad en el insumo " + ingredient.name + ".");
      }

      const cost = costById.get(ingredient.id);
      if (!cost) throw new Error("El insumo " + ingredient.name + " no tiene proveedor predeterminado.");

      const existing = matching.find((row) => row.id === ingredient.id);
      if (existing && !existing.currentCost.equals(cost)) {
        await tx.priceHistory.create({
          data: { ingredientId: ingredient.id, oldCost: existing.currentCost, newCost: cost },
        });
      }

      const values = { name: ingredient.name, unit: ingredient.unit, currentCost: cost };
      await tx.ingredient.upsert({
        where: { id: ingredient.id },
        create: { id: ingredient.id, accountId: ACCOUNT.id, ...values },
        update: values,
      });
    }

    for (const supplier of suppliers) {
      const matching = await tx.supplier.findMany({
        where: { OR: [{ id: supplier.id }, { accountId: ACCOUNT.id, name: supplier.name }] },
      });
      if (matching.some((row) => row.id !== supplier.id || row.accountId !== ACCOUNT.id || row.name !== supplier.name)) {
        throw new Error("Conflicto de identidad en el proveedor " + supplier.name + ".");
      }

      const supplierValues = {
        name: supplier.name,
        contactPhone: supplier.contactPhone,
        email: supplier.email,
        address: supplier.address,
        isActive: true,
      };
      await tx.supplier.upsert({
        where: { id: supplier.id },
        create: { id: supplier.id, accountId: ACCOUNT.id, ...supplierValues },
        update: supplierValues,
      });

      for (const item of supplier.ingredients) {
        const quarantined = item.pendingPackagePrice !== undefined;
        const values = {
          supplierCode: item.supplierCode ?? null,
          rawDescription: item.rawDescription ?? null,
          packageSize: new Prisma.Decimal(item.packageSize),
          packageUnit: item.packageUnit,
          packagePrice: new Prisma.Decimal(item.packagePrice),
          pendingPackagePrice: quarantined ? new Prisma.Decimal(item.pendingPackagePrice!) : null,
          isDefault: item.isDefault,
          isQuarantined: quarantined,
          quarantinedAt: quarantined ? new Date() : null,
          quarantineReason: quarantined ? item.quarantineReason ?? null : null,
        };
        await tx.supplierIngredient.upsert({
          where: { supplierId_ingredientId: { supplierId: supplier.id, ingredientId: item.ingredientId } },
          create: { id: item.id, supplierId: supplier.id, ingredientId: item.ingredientId, ...values },
          update: values,
        });
      }
    }

    for (const product of products) {
      const matching = await tx.product.findMany({
        where: { OR: [{ id: product.id }, { accountId: ACCOUNT.id, name: product.name }] },
      });
      if (matching.some((row) => row.id !== product.id || row.accountId !== ACCOUNT.id || row.name !== product.name)) {
        throw new Error("Conflicto de identidad en el producto " + product.name + ".");
      }

      const salePrice = new Prisma.Decimal(product.salePrice);
      const cost = calculateRecipeTotal(
        product.recipe.map((item) => {
          const unitCost = costById.get(item.ingredientId);
          if (!unitCost) throw new Error("Receta de \"" + product.name + "\" referencia un insumo inexistente.");
          return { quantity: new Prisma.Decimal(item.quantity), unitCost };
        }),
      );

      const values = {
        name: product.name,
        salePrice,
        minMarginPercent: new Prisma.Decimal(product.minMarginPercent),
        cost,
        marginAmount: calculateMarginAmount(salePrice, cost),
        marginPercent: calculateMarginPercent(salePrice, cost),
      };
      await tx.product.upsert({
        where: { id: product.id },
        create: { id: product.id, accountId: ACCOUNT.id, ...values },
        update: values,
      });

      for (const item of product.recipe) {
        await tx.productIngredient.upsert({
          where: { productId_ingredientId: { productId: product.id, ingredientId: item.ingredientId } },
          create: { productId: product.id, ingredientId: item.ingredientId, quantity: new Prisma.Decimal(item.quantity) },
          update: { quantity: new Prisma.Decimal(item.quantity) },
        });
      }
    }

    // Conteos acotados a la cuenta demo.
    const accountId = ACCOUNT.id;
    return [
      { tabla: "User", total: await tx.user.count({ where: { accountId } }) },
      { tabla: "Ingredient", total: await tx.ingredient.count({ where: { accountId } }) },
      { tabla: "Supplier", total: await tx.supplier.count({ where: { accountId } }) },
      { tabla: "SupplierIngredient", total: await tx.supplierIngredient.count({ where: { supplier: { accountId } } }) },
      { tabla: "SupplierIngredient en cuarentena", total: await tx.supplierIngredient.count({ where: { supplier: { accountId }, isQuarantined: true } }) },
      { tabla: "Product", total: await tx.product.count({ where: { accountId } }) },
      { tabla: "ProductIngredient", total: await tx.productIngredient.count({ where: { product: { accountId } } }) },
    ];
  }, { timeout: 30000 });

  console.log("Seed demo completado para la cuenta " + ACCOUNT.businessName + ".");
  console.table(counts);
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Error inesperado al ejecutar el seed demo.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
