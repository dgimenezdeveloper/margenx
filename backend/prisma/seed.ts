import "dotenv/config";
import { Prisma, PrismaClient, Role } from "@prisma/client";

// Issue #30 — referencia QA confirmada.
// Todos los importes están en ARS.
// Conversión fija de insumos en USD: 1540 ARS/USD.
// No incluye envases, descuentos por volumen ni recetas.
//
// IMPORTANTE: conservar estos IDs entre ejecuciones.
const accounts = [
  {
    id: "30a00000-0000-4000-8000-000000000001",
    businessName: "Panadería Central",
    users: [
      { id: "30d00001-0000-4000-8000-000000000001", email: "admin.panaderia@seed.example.test", role: Role.ADMIN, authProviderId: "seed_local_panaderia_admin" },
      { id: "30d00001-0000-4000-8000-000000000002", email: "colaborador.panaderia@seed.example.test", role: Role.COLLABORATOR, authProviderId: "seed_local_panaderia_collaborator" },
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
      { id: "30c00001-0000-4000-8000-000000000001", name: "Medialunas de manteca — docena (12 unidades)", salePrice: "13500.00", minMarginPercent: "65.00" },
      { id: "30c00001-0000-4000-8000-000000000002", name: "Medialunas de grasa — docena (12 unidades)", salePrice: "13500.00", minMarginPercent: "70.00" },
      { id: "30c00001-0000-4000-8000-000000000003", name: "Pan flauta — 1 kg", salePrice: "4332.14", minMarginPercent: "55.00" },
      { id: "30c00001-0000-4000-8000-000000000004", name: "Tarta de ricota — 24 cm", salePrice: "28000.00", minMarginPercent: "60.00" },
    ],
  },
  {
    id: "30a00000-0000-4000-8000-000000000002",
    businessName: "Química GyJ",
    users: [
      { id: "30d00002-0000-4000-8000-000000000001", email: "admin.quimica@seed.example.test", role: Role.ADMIN, authProviderId: "seed_local_quimica_admin" },
      { id: "30d00002-0000-4000-8000-000000000002", email: "colaborador.quimica@seed.example.test", role: Role.COLLABORATOR, authProviderId: "seed_local_quimica_collaborator" },
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
      { id: "30c00002-0000-4000-8000-000000000001", name: "Jabón líquido (Ariel/Skip/Ace) — 1 L", salePrice: "750.00", minMarginPercent: "40.00" },
      { id: "30c00002-0000-4000-8000-000000000002", name: "Suavizante (Vivere/Johnson Bebé/Lavadero/Confort Lila) — 1 L", salePrice: "750.00", minMarginPercent: "40.00" },
      { id: "30c00002-0000-4000-8000-000000000003", name: "Detergente (Magistral) — 1 L", salePrice: "650.00", minMarginPercent: "35.00" },
      { id: "30c00002-0000-4000-8000-000000000004", name: "Perfumina (Vivere/Confort) — 250 ml", salePrice: "2000.00", minMarginPercent: "35.00" },
    ],
  },
];

// Usuarios ficticios de base de datos: no registran usuarios en Clerk.
const prisma = new PrismaClient();

function confirmDatabaseTarget() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed bloqueado: NODE_ENV=production.");
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
      ". Verificá que sea tu base local/de pruebas y luego configurá " +
      "SEED_CONFIRM_TARGET con ese valor exacto. No uses una base de producción.",
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

        const values = {
          name: product.name,
          salePrice: new Prisma.Decimal(product.salePrice),
          minMarginPercent: new Prisma.Decimal(product.minMarginPercent),
        };

        await tx.product.upsert({
          where: { id: product.id },
          create: { id: product.id, accountId: account.id, ...values },
          // Conserva cost, marginAmount, marginPercent y recetas existentes.
          update: values,
        });
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

  console.log("Seed completado: 2 cuentas, 4 usuarios, 20 insumos y 8 productos base.");
  console.log("No se insertaron, modificaron ni eliminaron recetas.");
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