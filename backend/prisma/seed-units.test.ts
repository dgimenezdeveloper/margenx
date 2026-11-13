// backend/prisma/seed-units.test.ts
import { describe, it, expect, afterAll } from 'vitest';
import 'dotenv/config';
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

const testDbUrl = process.env.TEST_DATABASE_URL;
const describeOrSkip = testDbUrl ? describe : describe.skip;

describeOrSkip('Escenario Gherkin: Datos existentes (Migración SQL contra PostgreSQL real)', () => {
  const TEST_ACCOUNT_ID = '33a00000-0000-4000-8000-000000000099';
  const TEST_SUPPLIER_ID = '33c00000-0000-4000-8000-000000000099';

  it('convierte efectivamente registros preexistentes de "unit" a "u" y preserva kg y l mediante rollback', async () => {
    const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });

    try {
      await prisma.$transaction(async (tx) => {
        // 1. DADO: creamos una cuenta, insumos de prueba (incluyendo control con kg y l) y presentaciones
        await tx.account.upsert({
          where: { id: TEST_ACCOUNT_ID },
          create: {
            id: TEST_ACCOUNT_ID,
            businessName: 'Cuenta Test Migración Unidades',
            slug: 'test-migracion-unidades',
          },
          update: {},
        });

        await tx.ingredient.createMany({
          data: [
            { id: '33b00001-0000-4000-8000-000000000091', accountId: TEST_ACCOUNT_ID, name: 'Insumo Unit', unit: 'unit', currentCost: new Prisma.Decimal('150.00') },
            { id: '33b00001-0000-4000-8000-000000000092', accountId: TEST_ACCOUNT_ID, name: 'Insumo KG', unit: 'kg', currentCost: new Prisma.Decimal('150.00') },
            { id: '33b00001-0000-4000-8000-000000000093', accountId: TEST_ACCOUNT_ID, name: 'Insumo L', unit: 'l', currentCost: new Prisma.Decimal('150.00') },
          ],
        });

        await tx.supplier.create({
          data: {
            id: TEST_SUPPLIER_ID,
            accountId: TEST_ACCOUNT_ID,
            name: 'Proveedor Histórico Test',
          },
        });

        await tx.supplierIngredient.createMany({
          data: [
            { id: '33e00001-0000-4000-8000-000000000091', supplierId: TEST_SUPPLIER_ID, ingredientId: '33b00001-0000-4000-8000-000000000091', packageSize: new Prisma.Decimal('10.000'), packageUnit: 'unit', packagePrice: new Prisma.Decimal('1500.00'), isDefault: true },
            { id: '33e00001-0000-4000-8000-000000000092', supplierId: TEST_SUPPLIER_ID, ingredientId: '33b00001-0000-4000-8000-000000000092', packageSize: new Prisma.Decimal('10.000'), packageUnit: 'kg', packagePrice: new Prisma.Decimal('1500.00'), isDefault: false },
          ],
        });

        // Verificación previa dentro de la transacción
        const beforeIngUnit = await tx.ingredient.findUnique({ where: { id: '33b00001-0000-4000-8000-000000000091' } });
        const beforeIngKg = await tx.ingredient.findUnique({ where: { id: '33b00001-0000-4000-8000-000000000092' } });
        expect(beforeIngUnit?.unit).toBe('unit');
        expect(beforeIngKg?.unit).toBe('kg');

        // 2. CUANDO: ejecutamos el archivo SQL real de la migración dentro de tx
        const migrationFilePath = join(
          __dirname,
          'migrations',
          '20261111120000_unify_ingredient_unit_u',
          'migration.sql'
        );
        const migrationSql = readFileSync(migrationFilePath, 'utf8');

        const cleanSql = migrationSql
          .split('\n')
          .filter((line) => !line.trim().startsWith('--'))
          .join('\n');

        const statements = cleanSql
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const statement of statements) {
          await tx.$executeRawUnsafe(statement);
        }

        // 3. ENTONCES: verificamos conversión de 'unit' a 'u' y que 'kg' / 'l' se mantienen intactos
        const afterIngUnit = await tx.ingredient.findUnique({ where: { id: '33b00001-0000-4000-8000-000000000091' } });
        const afterIngKg = await tx.ingredient.findUnique({ where: { id: '33b00001-0000-4000-8000-000000000092' } });
        const afterIngL = await tx.ingredient.findUnique({ where: { id: '33b00001-0000-4000-8000-000000000093' } });
        const afterSupUnit = await tx.supplierIngredient.findUnique({ where: { id: '33e00001-0000-4000-8000-000000000091' } });
        const afterSupKg = await tx.supplierIngredient.findUnique({ where: { id: '33e00001-0000-4000-8000-000000000092' } });

        expect(afterIngUnit?.unit).toBe('u');
        expect(afterSupUnit?.packageUnit).toBe('u');
        // Filas de control para comprobar que el WHERE funciona correctamente
        expect(afterIngKg?.unit).toBe('kg');
        expect(afterIngL?.unit).toBe('l');
        expect(afterSupKg?.packageUnit).toBe('kg');

        // Forzar rollback para aislar totalmente la ejecución
        throw new Error('TEST_ROLLBACK_SENTINEL');
      });
    } catch (err: any) {
      if (err.message !== 'TEST_ROLLBACK_SENTINEL') {
        throw err;
      }
    } finally {
      await prisma.$disconnect();
    }
  });
});