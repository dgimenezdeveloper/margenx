/// <reference types="node" />
import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  calculateMarginAmount,
  calculateMarginPercent,
  calculateRecipeTotal,
  calculateUnitCost,
} from "../src/services/marginCalculator";
import { normalizeSearchText } from "../src/utils/pagination";

// Seed de volumen para la cuenta "Demo MargenX": suma cientos de insumos,
// presentaciones, productos y recetas para probar paginación, rendimiento,
// integridad de la base y usabilidad con un catálogo grande.
//
// Requisitos: la cuenta Demo ya sembrada (seed-demo.ts). Este script no toca
// sus datos base: todo lo que crea tiene IDs con prefijo 32..., y el modo
// "limpiar" borra solo eso.
//
// Variables:
//   SEED_VOLUMEN_CONFIRM   host:puerto/base exacto del destino (obligatoria).
//   SEED_VOLUMEN_MODO      "cargar" (por defecto) o "limpiar".
//   SEED_VOLUMEN_INSUMOS   cantidad de insumos, 1 a 210 (por defecto 210).
//   SEED_VOLUMEN_PRODUCTOS cantidad de productos, 1 a 352 (por defecto 336).
//
// "cargar" primero limpia lo cargado antes, así que re-ejecutar no duplica.
// Los datos son ficticios y deterministas: misma escala, mismo resultado.

const ACCOUNT_ID = "31a00000-0000-4000-8000-000000000001";

const PREFIX = {
  ingredient: "32b00000-0000-4000-8000-",
  supplier: "32c00000-0000-4000-8000-",
  presentation: "32e00000-0000-4000-8000-",
  product: "32f00000-0000-4000-8000-",
  history: "32d00000-0000-4000-8000-",
} as const;

const id = (prefix: string, n: number) => prefix + String(n).padStart(12, "0");

// Generador pseudoaleatorio con semilla fija (mulberry32).
function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = createRandom(20261110);
const between = (min: number, max: number) => min + random() * (max - min);
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];

type Unit = "kg" | "l" | "u";

// Costo de referencia por unidad base, en ARS.
const BASES: ReadonlyArray<{ name: string; unit: Unit; cost: number }> = [
  { name: "Harina 000", unit: "kg", cost: 840 },
  { name: "Harina 0000", unit: "kg", cost: 950 },
  { name: "Harina integral", unit: "kg", cost: 1300 },
  { name: "Azúcar común", unit: "kg", cost: 1200 },
  { name: "Azúcar impalpable", unit: "kg", cost: 2100 },
  { name: "Manteca", unit: "kg", cost: 9500 },
  { name: "Margarina de hojaldre", unit: "kg", cost: 5200 },
  { name: "Grasa vacuna", unit: "kg", cost: 3800 },
  { name: "Huevo", unit: "u", cost: 250 },
  { name: "Leche entera", unit: "l", cost: 1200 },
  { name: "Crema de leche", unit: "l", cost: 6500 },
  { name: "Dulce de leche repostero", unit: "kg", cost: 3500 },
  { name: "Cacao amargo", unit: "kg", cost: 12000 },
  { name: "Chocolate cobertura semiamargo", unit: "kg", cost: 15000 },
  { name: "Levadura fresca", unit: "kg", cost: 6700 },
  { name: "Sal fina", unit: "kg", cost: 470 },
  { name: "Aceite de girasol", unit: "l", cost: 1800 },
  { name: "Esencia de vainilla", unit: "l", cost: 8000 },
  { name: "Polvo de hornear", unit: "kg", cost: 7000 },
  { name: "Queso crema", unit: "kg", cost: 9000 },
  { name: "Ricota", unit: "kg", cost: 5500 },
  { name: "Dulce de membrillo", unit: "kg", cost: 3200 },
  { name: "Dulce de batata", unit: "kg", cost: 3000 },
  { name: "Nueces peladas", unit: "kg", cost: 18000 },
  { name: "Coco rallado", unit: "kg", cost: 9000 },
  { name: "Almidón de maíz", unit: "kg", cost: 2500 },
  { name: "Miel", unit: "kg", cost: 7000 },
  { name: "Pasas de uva", unit: "kg", cost: 8000 },
  { name: "Avena arrollada", unit: "kg", cost: 2600 },
  { name: "Semillas de sésamo", unit: "kg", cost: 6000 },
];
const BRANDS = ["La Molinera", "Don Aurelio", "Campo Sur", "El Trébol", "Santa Inés", "Del Valle", "Primavera"] as const;

const SUPPLIERS = [
  { name: "Distribuidora Molinera del Sur", code: "MS", phone: "+54 11 5555-0201", email: "ventas@molinera-del-sur.example", address: "Ruta Ficticia 12 km 4, Ciudad Demo" },
  { name: "Mayorista Pampa Alimentos", code: "PA", phone: "+54 11 5555-0202", email: "pedidos@pampa-alimentos.example", address: "Calle Inventada 450, Ciudad Demo" },
  { name: "Lácteos y Frescos del Oeste", code: "LF", phone: "+54 11 5555-0203", email: "ventas@lacteos-oeste.example", address: "Avenida Demo 1200, Ciudad Demo" },
  { name: "Insumos Pasteleros Avellaneda", code: "IP", phone: "+54 11 5555-0204", email: "hola@insumos-pasteleros.example", address: "Pasaje Ficticio 33, Ciudad Demo" },
  { name: "Almacén Mayorista El Puente", code: "EP", phone: "+54 11 5555-0205", email: "compras@el-puente.example", address: "Calle Falsa 742, Ciudad Demo" },
] as const;

// Familias de productos de panadería con sus sabores y presentaciones.
const FAMILIES: ReadonlyArray<{ name: string; flavors: readonly string[]; formats: readonly string[]; uses: readonly string[] }> = [
  { name: "Medialunas", flavors: ["de manteca", "de grasa", "rellenas de dulce de leche", "rellenas de crema pastelera"], formats: ["docena", "media docena", "unidad"], uses: ["Harina 0000", "Manteca", "Azúcar común", "Levadura fresca", "Huevo", "Leche entera"] },
  { name: "Facturas", flavors: ["surtidas", "de membrillo", "de batata", "de dulce de leche"], formats: ["docena", "media docena"], uses: ["Harina 0000", "Margarina de hojaldre", "Azúcar común", "Dulce de membrillo", "Dulce de batata"] },
  { name: "Pan", flavors: ["francés", "de campo", "integral", "de molde", "lactal", "de salvado"], formats: ["1 kg", "1/2 kg"], uses: ["Harina 000", "Harina integral", "Sal fina", "Levadura fresca", "Aceite de girasol"] },
  { name: "Budín", flavors: ["de vainilla", "de limón", "marmolado", "de chocolate", "con pasas", "de nuez"], formats: ["unidad", "porción"], uses: ["Harina 0000", "Azúcar común", "Huevo", "Manteca", "Polvo de hornear", "Esencia de vainilla", "Pasas de uva", "Nueces peladas", "Cacao amargo"] },
  { name: "Torta", flavors: ["de chocolate", "de ricota", "de coco", "de manzana", "selva negra", "chocotorta", "rogel", "de nuez"], formats: ["entera", "porción"], uses: ["Harina 0000", "Azúcar común", "Huevo", "Manteca", "Cacao amargo", "Ricota", "Coco rallado", "Dulce de leche repostero", "Crema de leche", "Nueces peladas"] },
  { name: "Alfajores", flavors: ["de maicena", "de chocolate", "de nuez", "santafesinos", "de miel"], formats: ["docena", "media docena", "unidad"], uses: ["Almidón de maíz", "Harina 0000", "Manteca", "Dulce de leche repostero", "Chocolate cobertura semiamargo", "Coco rallado", "Miel"] },
  { name: "Galletitas", flavors: ["de avena", "de manteca", "de chips de chocolate", "de sésamo", "de coco"], formats: ["1/2 kg", "1/4 kg", "bolsa x12"], uses: ["Harina 0000", "Avena arrollada", "Manteca", "Azúcar común", "Chocolate cobertura semiamargo", "Semillas de sésamo", "Coco rallado"] },
  { name: "Tarta", flavors: ["de ricota", "de coco y dulce de leche", "de frutillas", "de manzana", "frola de membrillo", "frola de batata"], formats: ["entera", "porción"], uses: ["Harina 0000", "Manteca", "Azúcar común", "Huevo", "Ricota", "Coco rallado", "Dulce de membrillo", "Dulce de batata"] },
  { name: "Bizcochos", flavors: ["de grasa", "salados", "dulces", "de hojaldre"], formats: ["1/2 kg", "1/4 kg", "1 kg"], uses: ["Harina 000", "Grasa vacuna", "Sal fina", "Levadura fresca", "Azúcar común", "Margarina de hojaldre"] },
  { name: "Chipá", flavors: ["clásico", "relleno de queso", "con semillas"], formats: ["1/2 kg", "1/4 kg", "docena"], uses: ["Almidón de maíz", "Queso crema", "Huevo", "Leche entera", "Semillas de sésamo"] },
  { name: "Scones", flavors: ["de queso", "dulces", "con pasas"], formats: ["docena", "media docena"], uses: ["Harina 0000", "Manteca", "Leche entera", "Polvo de hornear", "Queso crema", "Pasas de uva"] },
  { name: "Brownies", flavors: ["clásicos", "con nuez", "con dulce de leche"], formats: ["unidad", "caja x6", "bandeja"], uses: ["Chocolate cobertura semiamargo", "Manteca", "Azúcar común", "Huevo", "Harina 0000", "Nueces peladas", "Dulce de leche repostero"] },
  { name: "Pastelitos", flavors: ["de membrillo", "de batata", "mixtos"], formats: ["docena", "media docena"], uses: ["Margarina de hojaldre", "Harina 000", "Dulce de membrillo", "Dulce de batata", "Azúcar común"] },
  { name: "Cañoncitos", flavors: ["de dulce de leche", "de crema"], formats: ["docena", "media docena", "unidad"], uses: ["Margarina de hojaldre", "Harina 0000", "Dulce de leche repostero", "Crema de leche"] },
  { name: "Rosca", flavors: ["de pascua", "de crema", "de dulce de leche"], formats: ["entera", "porción"], uses: ["Harina 0000", "Huevo", "Manteca", "Azúcar común", "Levadura fresca", "Crema de leche", "Dulce de leche repostero"] },
  { name: "Pan dulce", flavors: ["con frutas", "con chips", "con nueces"], formats: ["1 kg", "1/2 kg"], uses: ["Harina 0000", "Manteca", "Azúcar común", "Huevo", "Levadura fresca", "Pasas de uva", "Chocolate cobertura semiamargo", "Nueces peladas"] },
  { name: "Muffins", flavors: ["de vainilla", "de chocolate", "de arándanos", "de limón"], formats: ["unidad", "caja x6"], uses: ["Harina 0000", "Azúcar común", "Huevo", "Aceite de girasol", "Leche entera", "Cacao amargo", "Polvo de hornear"] },
  { name: "Grisines", flavors: ["clásicos", "con sésamo", "integrales"], formats: ["1/2 kg", "1/4 kg"], uses: ["Harina 000", "Harina integral", "Aceite de girasol", "Sal fina", "Semillas de sésamo", "Levadura fresca"] },
];

function positiveInt(name: string, fallback: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(name + " debe ser un entero entre 1 y " + max + ".");
  }
  return value;
}

const prisma = new PrismaClient();

// Misma verificación de destino que seed-demo.ts, con SEED_VOLUMEN_CONFIRM.
function confirmDatabaseTarget() {
  const connection = process.env.DATABASE_URL;
  if (!connection) throw new Error("Falta DATABASE_URL. No se realizó la carga.");
  const url = new URL(connection);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("El seed requiere una conexión PostgreSQL.");
  }
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!url.hostname || !database) throw new Error("DATABASE_URL debe indicar un host y una base de datos.");
  const target = url.hostname + ":" + (url.port || "5432") + "/" + database;
  if (process.env.SEED_VOLUMEN_CONFIRM !== target) {
    throw new Error(
      "Carga no autorizada. Destino detectado: " + target +
      ". Configurá SEED_VOLUMEN_CONFIRM con ese valor exacto para confirmar que es la base correcta.",
    );
  }
  console.log("Destino confirmado:", target);
}

async function clean(tx: Prisma.TransactionClient) {
  // Las recetas, presentaciones e historial se borran en cascada.
  const products = await tx.product.deleteMany({ where: { accountId: ACCOUNT_ID, id: { startsWith: "32f" } } });
  const suppliers = await tx.supplier.deleteMany({ where: { accountId: ACCOUNT_ID, id: { startsWith: "32c" } } });
  const ingredients = await tx.ingredient.deleteMany({ where: { accountId: ACCOUNT_ID, id: { startsWith: "32b" } } });
  return { products: products.count, suppliers: suppliers.count, ingredients: ingredients.count };
}

function packageFor(unit: Unit): number {
  if (unit === "u") return pick([30, 180, 360]);
  if (unit === "l") return pick([1, 5, 12]);
  return pick([1, 5, 10, 25]);
}

function quantityFor(unit: Unit): Prisma.Decimal {
  if (unit === "u") return new Prisma.Decimal(Math.ceil(between(1, 6)).toFixed(3));
  return new Prisma.Decimal(between(0.01, 0.8).toFixed(3));
}

// Cada combinación sale en la línea habitual y en la línea económica: 352 nombres.
const LINES = ["", " (línea económica)"] as const;
const MAX_PRODUCTS = 352;

function productNames() {
  return LINES.flatMap((line) =>
    FAMILIES.flatMap((family) =>
      family.flavors.flatMap((flavor) =>
        family.formats.map((format) => ({ family, name: family.name + " " + flavor + " — " + format + line })),
      ),
    ),
  );
}

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// existingNames: nombres (en minúsculas) que la cuenta ya tiene fuera del volumen,
// para no chocar con el índice único case-insensitive.
function buildData(ingredientCount: number, productCount: number, existingNames: Set<string>) {
  const ingredients = shuffle(BASES.flatMap((base) => BRANDS.map((brand) => ({ ...base, brand }))))
    .filter((item) => !existingNames.has((item.name + " " + item.brand).toLowerCase()))
    .slice(0, ingredientCount)
    .map((item, index) => ({
      id: id(PREFIX.ingredient, index + 1),
      name: item.name + " " + item.brand,
      base: item.name,
      unit: item.unit,
      referenceCost: item.cost * between(0.85, 1.2),
    }));

  const suppliers = SUPPLIERS.map((supplier, index) => ({ ...supplier, id: id(PREFIX.supplier, index + 1), nextCode: 1 }));

  // El primer proveedor concentra muchas presentaciones (lista larga en su detalle).
  const presentations: Prisma.SupplierIngredientCreateManyInput[] = [];
  const unitCost = new Map<string, Prisma.Decimal>();
  const addPresentation = (supplierIndex: number, ingredient: (typeof ingredients)[number], isDefault: boolean) => {
    const supplier = suppliers[supplierIndex];
    const size = packageFor(ingredient.unit);
    const price = new Prisma.Decimal((ingredient.referenceCost * size * between(0.92, 1.1)).toFixed(2));
    if (isDefault) unitCost.set(ingredient.id, calculateUnitCost(price, new Prisma.Decimal(size)));
    presentations.push({
      id: id(PREFIX.presentation, presentations.length + 1),
      supplierId: supplier.id,
      ingredientId: ingredient.id,
      supplierCode: supplier.code + "-" + String(supplier.nextCode++).padStart(4, "0"),
      rawDescription: ingredient.name.toUpperCase() + " X " + size + (ingredient.unit === "u" ? " U" : " " + ingredient.unit.toUpperCase()),
      packageSize: new Prisma.Decimal(size.toFixed(3)),
      packageUnit: ingredient.unit,
      packagePrice: price,
      isDefault,
    });
  };

  ingredients.forEach((ingredient, index) => {
    const defaultSupplier = index < 60 ? 0 : 1 + (index % 4);
    addPresentation(defaultSupplier, ingredient, true);
    if (index < 8) {
      // Insumos con 5 proveedores: ficha con muchas presentaciones.
      for (let s = 0; s < suppliers.length; s++) if (s !== defaultSupplier) addPresentation(s, ingredient, false);
    } else if (index % 5 === 0) {
      addPresentation((defaultSupplier + 1) % suppliers.length, ingredient, false);
    }
  });

  // Tres presentaciones predeterminadas en cuarentena (+80 %).
  presentations
    .filter((item) => item.isDefault)
    .slice(10, 13)
    .forEach((item) => {
      item.isQuarantined = true;
      item.quarantinedAt = new Date();
      item.quarantineReason = "VARIACION_MAYOR_50_POR_CIENTO";
      item.pendingPackagePrice = new Prisma.Decimal(item.packagePrice as Prisma.Decimal).mul(1.8).toDecimalPlaces(2);
    });

  const ingredientByBase = new Map<string, typeof ingredients>();
  for (const ingredient of ingredients) {
    ingredientByBase.set(ingredient.base, [...(ingredientByBase.get(ingredient.base) ?? []), ingredient]);
  }

  const names = productNames()
    .filter((item) => !existingNames.has(item.name.toLowerCase()))
    .slice(0, productCount);

  const products: Prisma.ProductCreateManyInput[] = [];
  const lines: Prisma.ProductIngredientCreateManyInput[] = [];
  names.forEach(({ family, name }, index) => {
    const productId = id(PREFIX.product, index + 1);
    const minMarginPercent = new Prisma.Decimal(pick([25, 30, 35, 40]));
    const roll = random();

    // 5 % borradores sin receta y con precio 0.
    if (roll < 0.05) {
      products.push({ id: productId, accountId: ACCOUNT_ID, name, searchName: normalizeSearchText(name), salePrice: new Prisma.Decimal(0), minMarginPercent });
      return;
    }

    const candidates = family.uses.flatMap((base) => ingredientByBase.get(base) ?? []);
    if (candidates.length === 0) {
      products.push({ id: productId, accountId: ACCOUNT_ID, name, searchName: normalizeSearchText(name), salePrice: new Prisma.Decimal(0), minMarginPercent });
      return;
    }
    const chosen = new Map<string, (typeof ingredients)[number]>();
    const target = Math.min(candidates.length, 2 + Math.floor(random() * 5));
    while (chosen.size < target) {
      const ingredient = pick(candidates);
      chosen.set(ingredient.id, ingredient);
    }
    const recipe = [...chosen.values()].map((ingredient) => ({ ingredient, quantity: quantityFor(ingredient.unit) }));
    for (const item of recipe) lines.push({ productId, ingredientId: item.ingredient.id, quantity: item.quantity });

    const cost = calculateRecipeTotal(
      recipe.map((item) => ({ quantity: item.quantity, unitCost: unitCost.get(item.ingredient.id)! })),
    );

    // Distribución de márgenes: pérdida, riesgo, en objetivo y holgado.
    const min = minMarginPercent.toNumber() / 100;
    let margin: number;
    if (roll < 0.17) margin = between(-0.4, -0.02);
    else if (roll < 0.37) margin = between(0.02, min - 0.01);
    else if (roll < 0.77) margin = between(min, min + 0.15);
    else margin = between(min + 0.15, 0.75);
    let salePrice = cost.div(1 - margin).toDecimalPlaces(0);
    // Un precio mal cargado (sin ceros), caso real visto en las pruebas de usabilidad.
    if (index === 7) salePrice = new Prisma.Decimal(13);

    products.push({
      id: productId,
      accountId: ACCOUNT_ID,
      name,
      searchName: normalizeSearchText(name),
      salePrice,
      minMarginPercent,
      cost,
      marginAmount: calculateMarginAmount(salePrice, cost),
      marginPercent: calculateMarginPercent(salePrice, cost),
    });
  });

  // Historial: 12 cambios semanales en los primeros 20 insumos.
  const history: Prisma.PriceHistoryCreateManyInput[] = [];
  const now = Date.now();
  for (const ingredient of ingredients.slice(0, 20)) {
    let cost = ingredient.referenceCost * 0.7;
    for (let week = 12; week >= 1; week--) {
      const next = week === 1 ? unitCost.get(ingredient.id)!.toNumber() : cost * between(0.97, 1.08);
      history.push({
        id: id(PREFIX.history, history.length + 1),
        ingredientId: ingredient.id,
        oldCost: new Prisma.Decimal(cost.toFixed(2)),
        newCost: new Prisma.Decimal(next.toFixed(2)),
        changedAt: new Date(now - week * 7 * 24 * 60 * 60 * 1000),
      });
      cost = next;
    }
  }

  return {
    ingredients: ingredients.map((item) => ({
      id: item.id,
      accountId: ACCOUNT_ID,
      name: item.name,
      searchName: normalizeSearchText(item.name),
      unit: item.unit,
      currentCost: unitCost.get(item.id)!,
    })),
    suppliers: suppliers.map((item) => ({
      id: item.id,
      accountId: ACCOUNT_ID,
      name: item.name,
      contactPhone: item.phone,
      email: item.email,
      address: item.address,
    })),
    presentations,
    products,
    lines,
    history,
  };
}

async function timed<T>(label: string, timings: Array<{ paso: string; ms: number }>, run: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await run();
  timings.push({ paso: label, ms: Math.round(performance.now() - start) });
  return result;
}

// Chequeos de integridad sobre toda la cuenta Demo (base + volumen).
async function integrityReport() {
  const [costMismatch, defaults, buckets, orphanDrafts] = await Promise.all([
    prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*)::bigint AS total FROM (
        SELECT p.id, p.cost, ROUND(SUM(ROUND(pi.quantity * i."currentCost", 2)), 2) AS expected
        FROM "Product" p
        JOIN "ProductIngredient" pi ON pi."productId" = p.id
        JOIN "Ingredient" i ON i.id = pi."ingredientId"
        WHERE p."accountId" = ${ACCOUNT_ID}
        GROUP BY p.id, p.cost
      ) t WHERE t.cost <> t.expected`,
    prisma.$queryRaw<Array<{ sin_predeterminado: bigint; con_varios: bigint }>>`
      SELECT
        COUNT(*) FILTER (WHERE defaults = 0)::bigint AS sin_predeterminado,
        COUNT(*) FILTER (WHERE defaults > 1)::bigint AS con_varios
      FROM (
        SELECT i.id, COUNT(si.id) FILTER (WHERE si."isDefault") AS defaults
        FROM "Ingredient" i
        JOIN "SupplierIngredient" si ON si."ingredientId" = i.id
        WHERE i."accountId" = ${ACCOUNT_ID}
        GROUP BY i.id
      ) t`,
    prisma.$queryRaw<Array<{ estado: string; total: bigint }>>`
      SELECT CASE
          WHEN NOT EXISTS (SELECT 1 FROM "ProductIngredient" pi WHERE pi."productId" = p.id) THEN 'borrador'
          WHEN p."marginPercent" < 0 THEN 'pérdida'
          WHEN p."marginPercent" < p."minMarginPercent" THEN 'en riesgo'
          ELSE 'en objetivo o más'
        END AS estado, COUNT(*)::bigint AS total
      FROM "Product" p WHERE p."accountId" = ${ACCOUNT_ID}
      GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*)::bigint AS total FROM "Product" p
      WHERE p."accountId" = ${ACCOUNT_ID} AND p."salePrice" = 0
        AND EXISTS (SELECT 1 FROM "ProductIngredient" pi WHERE pi."productId" = p.id)`,
  ]);

  console.log("\nIntegridad de la cuenta Demo (0 es lo esperado en las tres primeras filas):");
  console.table([
    { chequeo: "Productos cuyo costo guardado no coincide con su receta", total: Number(costMismatch[0].total) },
    { chequeo: "Insumos con presentaciones pero sin predeterminada", total: Number(defaults[0].sin_predeterminado) },
    { chequeo: "Insumos con más de una predeterminada", total: Number(defaults[0].con_varios) },
    { chequeo: "Productos con receta y precio 0", total: Number(orphanDrafts[0].total) },
  ]);
  console.log("Productos por estado de margen:");
  console.table(buckets.map((row) => ({ estado: row.estado, total: Number(row.total) })));
}

async function main() {
  confirmDatabaseTarget();
  const mode = process.env.SEED_VOLUMEN_MODO ?? "cargar";
  if (mode !== "cargar" && mode !== "limpiar") throw new Error('SEED_VOLUMEN_MODO debe ser "cargar" o "limpiar".');

  const account = await prisma.account.findUnique({ where: { id: ACCOUNT_ID } });
  if (!account) throw new Error("No existe la cuenta Demo. Corré primero seed-demo.ts.");

  const timings: Array<{ paso: string; ms: number }> = [];

  if (mode === "limpiar") {
    const removed = await timed("limpiar", timings, () => prisma.$transaction((tx) => clean(tx), { timeout: 120000 }));
    console.log("Volumen eliminado de la cuenta Demo:");
    console.table([removed]);
    console.table(timings);
    return;
  }

  const [baseIngredients, baseProducts] = await Promise.all([
    prisma.ingredient.findMany({ where: { accountId: ACCOUNT_ID, NOT: { id: { startsWith: "32b" } } }, select: { name: true } }),
    prisma.product.findMany({ where: { accountId: ACCOUNT_ID, NOT: { id: { startsWith: "32f" } } }, select: { name: true } }),
  ]);
  const existingNames = new Set([...baseIngredients, ...baseProducts].map((row) => row.name.toLowerCase()));
  const data = buildData(
    positiveInt("SEED_VOLUMEN_INSUMOS", 210, BASES.length * BRANDS.length),
    positiveInt("SEED_VOLUMEN_PRODUCTOS", 336, MAX_PRODUCTS),
    existingNames,
  );

  await prisma.$transaction(async (tx) => {
    await timed("limpiar carga anterior", timings, () => clean(tx));
    await timed("insumos", timings, () => tx.ingredient.createMany({ data: data.ingredients }));
    await timed("proveedores", timings, () => tx.supplier.createMany({ data: data.suppliers }));
    await timed("presentaciones", timings, () => tx.supplierIngredient.createMany({ data: data.presentations }));
    await timed("productos", timings, () => tx.product.createMany({ data: data.products }));
    await timed("líneas de receta", timings, () => tx.productIngredient.createMany({ data: data.lines }));
    await timed("historial de precios", timings, () => tx.priceHistory.createMany({ data: data.history }));
  }, { timeout: 120000 });

  console.log("Volumen cargado en la cuenta " + account.businessName + ":");
  console.table([
    { tabla: "Insumos", total: data.ingredients.length },
    { tabla: "Proveedores", total: data.suppliers.length },
    { tabla: "Presentaciones", total: data.presentations.length },
    { tabla: "Presentaciones en cuarentena", total: data.presentations.filter((item) => item.isQuarantined).length },
    { tabla: "Productos", total: data.products.length },
    { tabla: "Líneas de receta", total: data.lines.length },
    { tabla: "Cambios en el historial", total: data.history.length },
  ]);
  console.log("Tiempos de escritura (ms):");
  console.table(timings);

  await integrityReport();
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Error inesperado al ejecutar el seed de volumen.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
