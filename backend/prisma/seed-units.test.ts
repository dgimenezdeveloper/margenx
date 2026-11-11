// backend/prisma/seed-units.test.ts
import { describe, it, expect, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient, Prisma } from '@prisma/client';

const VALID_UNITS = ['kg', 'l', 'u'] as const;
type Unit = (typeof VALID_UNITS)[number];

const isValidUnit = (val: string): val is Unit =>
  (VALID_UNITS as readonly string[]).includes(val);

describe('Auditoría estática de consistencia de unidades en Seeds y Schema (Issue #353)', () => {
  const seedDemoPath = join(__dirname, 'seed-demo.ts');
  const seedPilotPath = join(__dirname, 'seed.ts');
  const schemaPath = join(__dirname, 'schema.prisma');
  const migrationFilePath = join(
    __dirname,
    'migrations',
    '20261111120000_unify_ingredient_unit_u',
    'migration.sql'
  );

  it('seed-demo.ts no debe contener "unit" como valor de unidad de insumo o empaque', () => {
    const seedDemoContent = readFileSync(seedDemoPath, 'utf8');

    const invalidIngredientUnit = /unit:\s*["']unit["']/g.test(seedDemoContent);
    const invalidPackageUnit = /packageUnit:\s*["']unit["']/g.test(seedDemoContent);

    expect(invalidIngredientUnit, 'seed-demo.ts contiene un insumo con unit: "unit"').toBe(false);
    expect(invalidPackageUnit, 'seed-demo.ts contiene un empaque con packageUnit: "unit"').toBe(false);
  });

  it('todos los insumos y empaques en seed-demo.ts deben usar estrictamente unidades de VALID_UNITS (kg, l, u)', () => {
    const seedDemoContent = readFileSync(seedDemoPath, 'utf8');

    const ingredientUnitMatches = [...seedDemoContent.matchAll(/unit:\s*["']([^"']+)["']/g)];
    for (const match of ingredientUnitMatches) {
      const unitValue = match[1] ?? '';
      expect(
        isValidUnit(unitValue),
        `Unidad inválida en seed-demo.ts: "${unitValue}". Debe ser una de: ${VALID_UNITS.join(', ')}`
      ).toBe(true);
    }

    const packageUnitMatches = [...seedDemoContent.matchAll(/packageUnit:\s*["']([^"']+)["']/g)];
    for (const match of packageUnitMatches) {
      const unitValue = match[1] ?? '';
      expect(
        isValidUnit(unitValue),
        `packageUnit inválido en seed-demo.ts: "${unitValue}". Debe ser una de: ${VALID_UNITS.join(', ')}`
      ).toBe(true);
    }
  });

  it('todos los insumos y empaques en seed.ts (pilotos) deben usar estrictamente unidades de VALID_UNITS (kg, l, u)', () => {
    const seedPilotContent = readFileSync(seedPilotPath, 'utf8');

    const ingredientUnitMatches = [...seedPilotContent.matchAll(/unit:\s*["']([^"']+)["']/g)];
    for (const match of ingredientUnitMatches) {
      const unitValue = match[1] ?? '';
      expect(
        isValidUnit(unitValue),
        `Unidad inválida en seed.ts: "${unitValue}". Debe ser una de: ${VALID_UNITS.join(', ')}`
      ).toBe(true);
    }

    const packageUnitMatches = [...seedPilotContent.matchAll(/packageUnit:\s*["']([^"']+)["']/g)];
    for (const match of packageUnitMatches) {
      const unitValue = match[1] ?? '';
      expect(
        isValidUnit(unitValue),
        `packageUnit inválido en seed.ts: "${unitValue}". Debe ser una de: ${VALID_UNITS.join(', ')}`
      ).toBe(true);
    }
  });

  it('schema.prisma debe documentar las unidades válidas canónicas (kg, l, u)', () => {
    const schemaContent = readFileSync(schemaPath, 'utf8');
    expect(schemaContent).toContain('unit         String // kg, l, u');
    expect(schemaContent).not.toContain('unit         String // kg, l, unit');
  });

  it('el archivo migration.sql debe existir y referenciar la issue #353', () => {
    const sqlContent = readFileSync(migrationFilePath, 'utf8');
    expect(sqlContent).toContain('#353');
    expect(sqlContent).not.toContain('#350');
  });
});

describe('Escenario Gherkin: Datos existentes (Migración SQL contra PostgreSQL real) — [RV371-B1]', () => {
  const prisma = new PrismaClient();
  const TEST_ACCOUNT_ID = '33a00000-0000-4000-8000-000000000099';
  const TEST_INGREDIENT_ID = '33b00000-0000-4000-8000-000000000099';
  const TEST_SUPPLIER_ID = '33c00000-0000-4000-8000-000000000099';
  const TEST_SUPPLIER_ING_ID = '33e00000-0000-4000-8000-000000000099';

  afterAll(async () => {
    // Limpieza atómica de registros efímeros de prueba
    try {
      await prisma.account.deleteMany({ where: { id: TEST_ACCOUNT_ID } });
    } catch {
      // Ignorar si no llegó a crearse
    } finally {
      await prisma.$disconnect();
    }
  });

  it('convierte efectivamente registros preexistentes de "unit" a "u" al ejecutar el script migration.sql', async () => {
    // 1. DADO: creamos una cuenta, insumo y presentación con unidad "unit" previa a la migración
    await prisma.account.upsert({
      where: { id: TEST_ACCOUNT_ID },
      create: {
        id: TEST_ACCOUNT_ID,
        businessName: 'Cuenta Test Migración Unidades',
        slug: 'test-migracion-unidades',
      },
      update: {},
    });

    // Inserción deliberada de 'unit' simulando datos históricos en la base
    await prisma.ingredient.upsert({
      where: { id: TEST_INGREDIENT_ID },
      create: {
        id: TEST_INGREDIENT_ID,
        accountId: TEST_ACCOUNT_ID,
        name: 'Insumo Histórico Con Unidad Vieja',
        unit: 'unit',
        currentCost: new Prisma.Decimal('150.00'),
      },
      update: {
        unit: 'unit',
      },
    });

    await prisma.supplier.upsert({
      where: { id: TEST_SUPPLIER_ID },
      create: {
        id: TEST_SUPPLIER_ID,
        accountId: TEST_ACCOUNT_ID,
        name: 'Proveedor Histórico Test',
      },
      update: {},
    });

    await prisma.supplierIngredient.upsert({
      where: { id: TEST_SUPPLIER_ING_ID },
      create: {
        id: TEST_SUPPLIER_ING_ID,
        supplierId: TEST_SUPPLIER_ID,
        ingredientId: TEST_INGREDIENT_ID,
        packageSize: new Prisma.Decimal('10.000'),
        packageUnit: 'unit',
        packagePrice: new Prisma.Decimal('1500.00'),
        isDefault: true,
      },
      update: {
        packageUnit: 'unit',
      },
    });

    // Verificación previa: confirmar que los datos se crearon en la base con 'unit'
    const beforeIng = await prisma.ingredient.findUnique({ where: { id: TEST_INGREDIENT_ID } });
    const beforeSup = await prisma.supplierIngredient.findUnique({ where: { id: TEST_SUPPLIER_ING_ID } });
    expect(beforeIng?.unit).toBe('unit');
    expect(beforeSup?.packageUnit).toBe('unit');

    // 2. CUANDO: ejecutamos el archivo SQL real de la migración
    const migrationFilePath = join(
      __dirname,
      'migrations',
      '20261111120000_unify_ingredient_unit_u',
      'migration.sql'
    );
    const migrationSql = readFileSync(migrationFilePath, 'utf8');

    // Se eliminan los comentarios línea por línea y se ejecutan las sentencias separadas por punto y coma
    const cleanSql = migrationSql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');

    const statements = cleanSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }

    // 3. ENTONCES: verificamos que ambas entidades fueron actualizadas a 'u'
    const afterIng = await prisma.ingredient.findUnique({ where: { id: TEST_INGREDIENT_ID } });
    const afterSup = await prisma.supplierIngredient.findUnique({ where: { id: TEST_SUPPLIER_ING_ID } });

    expect(afterIng?.unit).toBe('u');
    expect(afterSup?.packageUnit).toBe('u');
  });
});