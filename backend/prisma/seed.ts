/// <reference types="node" />
import "dotenv/config";
import { Prisma, PrismaClient, Role } from "@prisma/client";
import {
  calculateRecipeTotal,
  calculateMarginAmount,
  calculateMarginPercent,
} from "../src/services/marginCalculator";

// Issue #30 / Issue #90 — referencia QA confirmada.
// Todos los importes están en ARS.
// Conversión fija de insumos en USD: 1540 ARS/USD.
// No incluye envases ni descuentos por volumen.
//
// IMPORTANTE: conservar estos IDs entre ejecuciones.
const accounts = [
  {
    id: "30a00000-0000-4000-8000-000000000001",
    businessName: "Panadería Central",
    users: [
      { id: "30d00001-0000-4000-8000-000000000001", email: "admin.panaderia@hotmail.com", role: Role.ADMIN, authProviderId: "user_3J3QH50TxpOxRky6qNX7C79lj7x" },
      { id: "30d00001-0000-4000-8000-000000000002", email: "colab.panaderia@hotmail.com", role: Role.COLLABORATOR, authProviderId: "user_3J3Qf8N1X4mH5z5B9Ol757UdJmE" },
    ],
    ingredients: [
      { id: "30b00001-0000-4000-8000-000000000001", name: "Harina de trigo 000 Olavarriense", unit: "kg", currentCost: "742.98" },
      { id: "30b00001-0000-4000-8000-000000000002", name: "Harina de trigo 0000 Olavarriense", unit: "kg", currentCost: "868.77" },
      { id: "30b00001-0000-4000-8000-000000000003", name: "Azúcar común tipo A", unit: "kg", currentCost: "1150.00" },
      { id: "30b00001-0000-4000-8000-000000000004", name: "Manteca en bloque mayorista", unit: "kg", currentCost: "12090.00" },
      { id: "30b00001-0000-4000-8000-000000000005", name: "Grasa bovina refinada La Cordobesa", unit: "kg", currentCost: "5990.00" },
      { id: "30b00001-0000-4000-8000-000000000006", name: "Levadura fresca La Cordobesa", unit: "kg", currentCost: "6000.00" },
      { id: "30b00001-0000-4000-8000-000000000007", name: "Sal fina Aurora", unit: "kg", currentCost: "484.24" },
      { id: "30b00001-0000-4000-8000-000000000008", name: "Leche entera larga vida Silvia", unit: "l", currentCost: "1715.00" },
      // Se conserva "u" de la planilla. Costo redondeado: 5285 / 30.
      { id: "30b00001-0000-4000-8000-000000000009", name: "Huevo grande", unit: "u", currentCost: "176.17" },
      // Precio estimado en la referencia QA.
      { id: "30b00001-0000-4000-8000-000000000010", name: "Ricota Castelmar", unit: "kg", currentCost: "4294.14" },
    ],
    products: [
      {
        id: "30c00001-0000-4000-8000-000000000001",
        name: "Medialunas de manteca — docena (12 unidades)",
        salePrice: "13500.00",
        minMarginPercent: "65.00",
        recipe: [
          { ingredientId: "30b00001-0000-4000-8000-000000000002", quantity: "0.500" }, // Harina 0000
          { ingredientId: "30b00001-0000-4000-8000-000000000004", quantity: "0.250" }, // Manteca
          { ingredientId: "30b00001-0000-4000-8000-000000000003", quantity: "0.080" }, // Azúcar
          { ingredientId: "30b00001-0000-4000-8000-000000000006", quantity: "0.020" }, // Levadura
          { ingredientId: "30b00001-0000-4000-8000-000000000007", quantity: "0.010" }, // Sal
          { ingredientId: "30b00001-0000-4000-8000-000000000008", quantity: "0.150" }, // Leche
          { ingredientId: "30b00001-0000-4000-8000-000000000009", quantity: "1.000" }, // Huevo
        ],
      },
      {
        id: "30c00001-0000-4000-8000-000000000002",
        name: "Medialunas de grasa — docena (12 unidades)",
        salePrice: "13500.00",
        minMarginPercent: "70.00",
        recipe: [
          { ingredientId: "30b00001-0000-4000-8000-000000000002", quantity: "0.500" }, // Harina 0000
          { ingredientId: "30b00001-0000-4000-8000-000000000005", quantity: "0.250" }, // Grasa bovina
          { ingredientId: "30b00001-0000-4000-8000-000000000003", quantity: "0.060" }, // Azúcar
          { ingredientId: "30b00001-0000-4000-8000-000000000006", quantity: "0.020" }, // Levadura
          { ingredientId: "30b00001-0000-4000-8000-000000000007", quantity: "0.010" }, // Sal
          { ingredientId: "30b00001-0000-4000-8000-000000000008", quantity: "0.100" }, // Leche
        ],
      },
      {
        id: "30c00001-0000-4000-8000-000000000003",
        name: "Pan flauta — 1 kg",
        salePrice: "4332.14",
        minMarginPercent: "55.00",
        recipe: [
          { ingredientId: "30b00001-0000-4000-8000-000000000001", quantity: "1.000" }, // Harina 000
          { ingredientId: "30b00001-0000-4000-8000-000000000006", quantity: "0.015" }, // Levadura
          { ingredientId: "30b00001-0000-4000-8000-000000000007", quantity: "0.015" }, // Sal
        ],
      },
      {
        id: "30c00001-0000-4000-8000-000000000004",
        name: "Tarta de ricota — 24 cm",
        salePrice: "28000.00",
        minMarginPercent: "60.00",
        recipe: [
          { ingredientId: "30b00001-0000-4000-8000-000000000010", quantity: "1.000" }, // Ricota
          { ingredientId: "30b00001-0000-4000-8000-000000000002", quantity: "0.300" }, // Harina 0000
          { ingredientId: "30b00001-0000-4000-8000-000000000004", quantity: "0.150" }, // Manteca
          { ingredientId: "30b00001-0000-4000-8000-000000000003", quantity: "0.200" }, // Azúcar
          { ingredientId: "30b00001-0000-4000-8000-000000000009", quantity: "3.000" }, // Huevo
          { ingredientId: "30b00001-0000-4000-8000-000000000008", quantity: "0.200" }, // Leche
        ],
      },
      {
        // ⚠️ Alerta roja intencional (issue #90): margen real < minMarginPercent.
        id: "30c00001-0000-4000-8000-000000000005",
        name: "Bizcochitos de grasa — 1 kg",
        salePrice: "3200.00",
        minMarginPercent: "40.00",
        recipe: [
          { ingredientId: "30b00001-0000-4000-8000-000000000001", quantity: "0.500" }, // Harina 000
          { ingredientId: "30b00001-0000-4000-8000-000000000005", quantity: "0.300" }, // Grasa bovina
          { ingredientId: "30b00001-0000-4000-8000-000000000003", quantity: "0.050" }, // Azúcar
          { ingredientId: "30b00001-0000-4000-8000-000000000007", quantity: "0.010" }, // Sal
          { ingredientId: "30b00001-0000-4000-8000-000000000006", quantity: "0.010" }, // Levadura
        ],
      },
      {
        id: "30c00001-0000-4000-8000-000000000006",
        name: "Pan lactal — 800 g",
        salePrice: "4500.00",
        minMarginPercent: "55.00",
        recipe: [
          { ingredientId: "30b00001-0000-4000-8000-000000000002", quantity: "0.500" }, // Harina 0000
          { ingredientId: "30b00001-0000-4000-8000-000000000008", quantity: "0.300" }, // Leche
          { ingredientId: "30b00001-0000-4000-8000-000000000004", quantity: "0.050" }, // Manteca
          { ingredientId: "30b00001-0000-4000-8000-000000000003", quantity: "0.040" }, // Azúcar
          { ingredientId: "30b00001-0000-4000-8000-000000000006", quantity: "0.015" }, // Levadura
          { ingredientId: "30b00001-0000-4000-8000-000000000007", quantity: "0.010" }, // Sal
          { ingredientId: "30b00001-0000-4000-8000-000000000009", quantity: "1.000" }, // Huevo
        ],
      },
      {
        id: "30c00001-0000-4000-8000-000000000007",
        name: "Facturas surtidas — docena (12 unidades)",
        salePrice: "14000.00",
        minMarginPercent: "65.00",
        recipe: [
          { ingredientId: "30b00001-0000-4000-8000-000000000002", quantity: "0.500" }, // Harina 0000
          { ingredientId: "30b00001-0000-4000-8000-000000000004", quantity: "0.200" }, // Manteca
          { ingredientId: "30b00001-0000-4000-8000-000000000003", quantity: "0.150" }, // Azúcar
          { ingredientId: "30b00001-0000-4000-8000-000000000006", quantity: "0.020" }, // Levadura
          { ingredientId: "30b00001-0000-4000-8000-000000000009", quantity: "2.000" }, // Huevo
          { ingredientId: "30b00001-0000-4000-8000-000000000008", quantity: "0.150" }, // Leche
          { ingredientId: "30b00001-0000-4000-8000-000000000007", quantity: "0.010" }, // Sal
        ],
      },
      {
        id: "30c00001-0000-4000-8000-000000000008",
        name: "Cremonas de grasa — unidad",
        salePrice: "900.00",
        minMarginPercent: "60.00",
        recipe: [
          { ingredientId: "30b00001-0000-4000-8000-000000000001", quantity: "0.080" }, // Harina 000
          { ingredientId: "30b00001-0000-4000-8000-000000000005", quantity: "0.030" }, // Grasa bovina
          { ingredientId: "30b00001-0000-4000-8000-000000000007", quantity: "0.002" }, // Sal
          { ingredientId: "30b00001-0000-4000-8000-000000000006", quantity: "0.003" }, // Levadura
          { ingredientId: "30b00001-0000-4000-8000-000000000003", quantity: "0.010" }, // Azúcar
        ],
      },
      {
        id: "30c00001-0000-4000-8000-000000000009",
        name: "Cañoncitos con dulce de leche — docena (12 unidades)",
        salePrice: "12000.00",
        minMarginPercent: "60.00",
        recipe: [
          { ingredientId: "30b00001-0000-4000-8000-000000000002", quantity: "0.400" }, // Harina 0000
          { ingredientId: "30b00001-0000-4000-8000-000000000004", quantity: "0.300" }, // Manteca
          { ingredientId: "30b00001-0000-4000-8000-000000000003", quantity: "0.100" }, // Azúcar
          { ingredientId: "30b00001-0000-4000-8000-000000000009", quantity: "2.000" }, // Huevo
        ],
      },
      {
        id: "30c00001-0000-4000-8000-000000000010",
        name: "Prepizzas — x2 unidades",
        salePrice: "3600.00",
        minMarginPercent: "55.00",
        recipe: [
          { ingredientId: "30b00001-0000-4000-8000-000000000001", quantity: "0.400" }, // Harina 000
          { ingredientId: "30b00001-0000-4000-8000-000000000006", quantity: "0.015" }, // Levadura
          { ingredientId: "30b00001-0000-4000-8000-000000000007", quantity: "0.010" }, // Sal
          { ingredientId: "30b00001-0000-4000-8000-000000000003", quantity: "0.020" }, // Azúcar
        ],
      },
    ],
  },
  {
    id: "30a00000-0000-4000-8000-000000000002",
    businessName: "Química GyJ",
    users: [
      { id: "30d00002-0000-4000-8000-000000000001", email: "admin.quimica@hotmail.com", role: Role.ADMIN, authProviderId: "user_3J3QxljX607yJ96D5uYViLqZYvD" },
      { id: "30d00002-0000-4000-8000-000000000002", email: "colab.quimica@hotmail.com", role: Role.COLLABORATOR, authProviderId: "user_3J3R65zdLKecDm1vFiUZhOvgWq7" },
    ],
    ingredients: [
      { id: "30b00002-0000-4000-8000-000000000001", name: "Pasta suavi", unit: "kg", currentCost: "15400.00" },
      { id: "30b00002-0000-4000-8000-000000000002", name: "Soda", unit: "l", currentCost: "2300.00" },
      { id: "30b00002-0000-4000-8000-000000000003", name: "Etoxilado", unit: "kg", currentCost: "4928.00" },
      { id: "30b00002-0000-4000-8000-000000000004", name: "Sulfonico", unit: "l", currentCost: "6930.00" },
      { id: "30b00002-0000-4000-8000-000000000005", name: "Aceite", unit: "l", currentCost: "36960.00" },
      { id: "30b00002-0000-4000-8000-000000000006", name: "Alcohol", unit: "l", currentCost: "2400.00" },
      { id: "30b00002-0000-4000-8000-000000000007", name: "Nonil", unit: "l", currentCost: "10010.00" },
      { id: "30b00002-0000-4000-8000-000000000008", name: "Sal", unit: "kg", currentCost: "230.00" },
      { id: "30b00002-0000-4000-8000-000000000009", name: "Opacante", unit: "l", currentCost: "10166.00" },
      { id: "30b00002-0000-4000-8000-000000000010", name: "Color", unit: "l", currentCost: "2000.00" },
    ],
    products: [
      {
        id: "30c00002-0000-4000-8000-000000000001",
        name: "Jabón líquido (Ariel/Skip/Ace) — 1 L",
        salePrice: "750.00",
        minMarginPercent: "40.00",
        recipe: [
          { ingredientId: "30b00002-0000-4000-8000-000000000004", quantity: "0.050" }, // Sulfonico
          { ingredientId: "30b00002-0000-4000-8000-000000000008", quantity: "0.030" }, // Sal
          { ingredientId: "30b00002-0000-4000-8000-000000000010", quantity: "0.002" }, // Color
          { ingredientId: "30b00002-0000-4000-8000-000000000002", quantity: "0.020" }, // Soda
        ],
      },
      {
        // ⚠️ Alerta roja intencional (issue #90): margen real < minMarginPercent.
        id: "30c00002-0000-4000-8000-000000000002",
        name: "Suavizante (Vivere/Johnson Bebé/Lavadero/Confort Lila) — 1 L",
        salePrice: "750.00",
        minMarginPercent: "40.00",
        recipe: [
          { ingredientId: "30b00002-0000-4000-8000-000000000001", quantity: "0.030" }, // Pasta suavi
          { ingredientId: "30b00002-0000-4000-8000-000000000003", quantity: "0.010" }, // Etoxilado
          { ingredientId: "30b00002-0000-4000-8000-000000000010", quantity: "0.002" }, // Color
          { ingredientId: "30b00002-0000-4000-8000-000000000006", quantity: "0.010" }, // Alcohol
        ],
      },
      {
        id: "30c00002-0000-4000-8000-000000000003",
        name: "Detergente (Magistral) — 1 L",
        salePrice: "650.00",
        minMarginPercent: "35.00",
        recipe: [
          { ingredientId: "30b00002-0000-4000-8000-000000000004", quantity: "0.040" }, // Sulfonico
          { ingredientId: "30b00002-0000-4000-8000-000000000002", quantity: "0.015" }, // Soda
          { ingredientId: "30b00002-0000-4000-8000-000000000008", quantity: "0.020" }, // Sal
        ],
      },
      {
        id: "30c00002-0000-4000-8000-000000000004",
        name: "Perfumina (Vivere/Confort) — 250 ml",
        salePrice: "2000.00",
        minMarginPercent: "35.00",
        recipe: [
          { ingredientId: "30b00002-0000-4000-8000-000000000006", quantity: "0.150" }, // Alcohol
          { ingredientId: "30b00002-0000-4000-8000-000000000007", quantity: "0.020" }, // Nonil
          { ingredientId: "30b00002-0000-4000-8000-000000000010", quantity: "0.005" }, // Color
        ],
      },
      {
        // ⚠️ Margen real también queda por debajo del objetivo (no exigido por el
        // Gherkin del issue, pero coherente con el nombre "concentrado").
        id: "30c00002-0000-4000-8000-000000000005",
        name: "Desodorante de piso concentrado — 1 L",
        salePrice: "1200.00",
        minMarginPercent: "35.00",
        recipe: [
          { ingredientId: "30b00002-0000-4000-8000-000000000007", quantity: "0.080" }, // Nonil
          { ingredientId: "30b00002-0000-4000-8000-000000000006", quantity: "0.030" }, // Alcohol
          { ingredientId: "30b00002-0000-4000-8000-000000000010", quantity: "0.003" }, // Color
          { ingredientId: "30b00002-0000-4000-8000-000000000009", quantity: "0.005" }, // Opacante
        ],
      },
      {
        id: "30c00002-0000-4000-8000-000000000006",
        name: "Lavandina común — 1 L",
        salePrice: "500.00",
        minMarginPercent: "30.00",
        recipe: [
          { ingredientId: "30b00002-0000-4000-8000-000000000002", quantity: "0.080" }, // Soda
          { ingredientId: "30b00002-0000-4000-8000-000000000008", quantity: "0.010" }, // Sal
        ],
      },
      {
        id: "30c00002-0000-4000-8000-000000000007",
        name: "Desengrasante multiuso — 1 L",
        salePrice: "1500.00",
        minMarginPercent: "40.00",
        recipe: [
          { ingredientId: "30b00002-0000-4000-8000-000000000004", quantity: "0.060" }, // Sulfonico
          { ingredientId: "30b00002-0000-4000-8000-000000000002", quantity: "0.030" }, // Soda
          { ingredientId: "30b00002-0000-4000-8000-000000000005", quantity: "0.005" }, // Aceite
        ],
      },
      {
        id: "30c00002-0000-4000-8000-000000000008",
        name: "Limpiavidrios — 500 ml",
        salePrice: "800.00",
        minMarginPercent: "35.00",
        recipe: [
          { ingredientId: "30b00002-0000-4000-8000-000000000006", quantity: "0.100" }, // Alcohol
          { ingredientId: "30b00002-0000-4000-8000-000000000010", quantity: "0.002" }, // Color
          { ingredientId: "30b00002-0000-4000-8000-000000000003", quantity: "0.005" }, // Etoxilado
        ],
      },
      {
        id: "30c00002-0000-4000-8000-000000000009",
        name: "Cera líquida autobrillo — 1 L",
        salePrice: "2200.00",
        minMarginPercent: "40.00",
        recipe: [
          { ingredientId: "30b00002-0000-4000-8000-000000000005", quantity: "0.030" }, // Aceite
          { ingredientId: "30b00002-0000-4000-8000-000000000003", quantity: "0.020" }, // Etoxilado
          { ingredientId: "30b00002-0000-4000-8000-000000000009", quantity: "0.010" }, // Opacante
        ],
      },
      {
        id: "30c00002-0000-4000-8000-000000000010",
        name: "Jabón antibacterial manos — 500 ml",
        salePrice: "900.00",
        minMarginPercent: "35.00",
        recipe: [
          { ingredientId: "30b00002-0000-4000-8000-000000000001", quantity: "0.015" }, // Pasta suavi
          { ingredientId: "30b00002-0000-4000-8000-000000000003", quantity: "0.010" }, // Etoxilado
          { ingredientId: "30b00002-0000-4000-8000-000000000006", quantity: "0.030" }, // Alcohol
          { ingredientId: "30b00002-0000-4000-8000-000000000010", quantity: "0.002" }, // Color
        ],
      },
    ],
  },
];

// Usuarios ficticios de base de datos: no registran usuarios en Clerk.
const prisma = new PrismaClient();

function confirmDatabaseTarget() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error(
      "Seed bloqueado: NODE_ENV=production. Si realmente querés cargar el dataset de demo en " +
      "producción, configurá ALLOW_PRODUCTION_SEED=true explícitamente (ver \"db:seed:prod\").",
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
      ". Verificá que sea tu base local/de pruebas (o de staging, si es intencional) y luego " +
      "configurá SEED_CONFIRM_TARGET con ese valor exacto.",
    );
  }

  console.log("Destino confirmado:", target);
}

async function main() {
  confirmDatabaseTarget();

  const counts = await prisma.$transaction(async (tx) => {
    for (const account of accounts) {
      const matchingAccounts = await tx.account.findMany({
        where: { OR: [{ id: account.id }, { businessName: account.businessName }] },
      });

      if (matchingAccounts.some((row) =>
        row.id !== account.id || row.businessName !== account.businessName
      )) {
        throw new Error(
          "Conflicto de identidad en la cuenta " + account.businessName +
          ". No se adopta ni elimina ningún registro existente.",
        );
      }

      await tx.account.upsert({
        where: { id: account.id },
        create: { id: account.id, businessName: account.businessName },
        // Conserva plan, estado y vencimiento de prueba existentes.
        update: { businessName: account.businessName },
      });

      for (const user of account.users) {
        const matchingUsers = await tx.user.findMany({
          where: {
            OR: [
              { id: user.id },
              { email: user.email },
              { authProviderId: user.authProviderId },
            ],
          },
        });

        if (matchingUsers.some((row) =>
          row.id !== user.id || row.accountId !== account.id ||
          row.email !== user.email || row.authProviderId !== user.authProviderId
        )) {
          throw new Error("Conflicto de identidad del usuario de prueba " + user.email + ".");
        }

        await tx.user.upsert({
          where: { id: user.id },
          create: { ...user, accountId: account.id },
          update: { role: user.role },
        });
      }

      for (const ingredient of account.ingredients) {
        const matchingIngredients = await tx.ingredient.findMany({
          where: {
            OR: [
              { id: ingredient.id },
              { accountId: account.id, name: ingredient.name },
            ],
          },
        });

        if (matchingIngredients.some((row) =>
          row.id !== ingredient.id ||
          row.accountId !== account.id ||
          row.name !== ingredient.name
        )) {
          throw new Error("Conflicto de identidad en el insumo " + ingredient.name + ".");
        }

        const values = {
          name: ingredient.name,
          unit: ingredient.unit,
          currentCost: new Prisma.Decimal(ingredient.currentCost),
        };

        await tx.ingredient.upsert({
          where: { id: ingredient.id },
          create: { id: ingredient.id, accountId: account.id, ...values },
          update: values,
        });
      }

      // Costo unitario vigente de cada insumo de la cuenta, para calcular las recetas.
      const ingredientCostById = new Map(
        account.ingredients.map((ingredient) => [ingredient.id, new Prisma.Decimal(ingredient.currentCost)]),
      );

      for (const product of account.products) {
        const matchingProducts = await tx.product.findMany({
          where: {
            OR: [
              { id: product.id },
              { accountId: account.id, name: product.name },
            ],
          },
        });

        if (matchingProducts.some((row) =>
          row.id !== product.id ||
          row.accountId !== account.id ||
          row.name !== product.name
        )) {
          throw new Error("Conflicto de identidad en el producto " + product.name + ".");
        }

        const salePrice = new Prisma.Decimal(product.salePrice);
        const recipeItems = product.recipe.map((item) => {
          const unitCost = ingredientCostById.get(item.ingredientId);
          if (!unitCost) {
            throw new Error(
              "Receta de \"" + product.name + "\" referencia un insumo inexistente: " + item.ingredientId,
            );
          }
          return { quantity: new Prisma.Decimal(item.quantity), unitCost };
        });

        const cost = calculateRecipeTotal(recipeItems);
        const marginAmount = calculateMarginAmount(salePrice, cost);
        const marginPercent = calculateMarginPercent(salePrice, cost);

        const values = {
          name: product.name,
          salePrice,
          minMarginPercent: new Prisma.Decimal(product.minMarginPercent),
          cost,
          marginAmount,
          marginPercent,
        };

        await tx.product.upsert({
          where: { id: product.id },
          create: { id: product.id, accountId: account.id, ...values },
          update: values,
        });

        // Idempotencia por clave compuesta [productId, ingredientId]: upsert, nunca duplica.
        for (const item of product.recipe) {
          await tx.productIngredient.upsert({
            where: {
              productId_ingredientId: {
                productId: product.id,
                ingredientId: item.ingredientId,
              },
            },
            create: {
              productId: product.id,
              ingredientId: item.ingredientId,
              quantity: new Prisma.Decimal(item.quantity),
            },
            update: {
              quantity: new Prisma.Decimal(item.quantity),
            },
          });
        }
      }
    }

    // Son totales globales: pueden ser mayores si ya había otros datos.
    return [
      { tabla: "Account", total: await tx.account.count() },
      { tabla: "User", total: await tx.user.count() },
      { tabla: "Ingredient", total: await tx.ingredient.count() },
      { tabla: "Product", total: await tx.product.count() },
      { tabla: "ProductIngredient", total: await tx.productIngredient.count() },
    ];
  }, { timeout: 30000 });

  console.log("Seed completado: 2 cuentas, 4 usuarios, 20 insumos, 20 productos y sus recetas (BOM).");
  console.table(counts);
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Error inesperado al ejecutar el seed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
