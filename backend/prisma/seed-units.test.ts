// backend/prisma/seed-units.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const VALID_UNITS = ['kg', 'l', 'u'] as const;

describe('Auditoría de consistencia de unidades en Seeds y Schema (Issue SPRINT6-BE-01)', () => {
  const seedDemoPath = join(__dirname, 'seed-demo.ts');
  const seedPilotPath = join(__dirname, 'seed.ts');
  const schemaPath = join(__dirname, 'schema.prisma');
  const migrationsDir = join(__dirname, 'migrations');

  it('seed-demo.ts no debe contener "unit" como valor de unidad de insumo o empaque', () => {
    const seedDemoContent = readFileSync(seedDemoPath, 'utf8');

    // Verifica que no haya definiciones unit: "unit" o packageUnit: "unit"
    const invalidIngredientUnit = /unit:\s*["']unit["']/g.test(seedDemoContent);
    const invalidPackageUnit = /packageUnit:\s*["']unit["']/g.test(seedDemoContent);

    expect(invalidIngredientUnit, 'seed-demo.ts contiene un insumo con unit: "unit"').toBe(false);
    expect(invalidPackageUnit, 'seed-demo.ts contiene un empaque con packageUnit: "unit"').toBe(false);
  });

  it('todos los insumos y empaques en seed-demo.ts deben usar estrictamente unidades de VALID_UNITS (kg, l, u)', () => {
    const seedDemoContent = readFileSync(seedDemoPath, 'utf8');

    // Extraer todas las unidades de insumos declaradas en el array ingredients
    const ingredientUnitMatches = [...seedDemoContent.matchAll(/unit:\s*["']([^"']+)["']/g)];
    for (const match of ingredientUnitMatches) {
      const unitValue = match[1];
      expect(
        VALID_UNITS.includes(unitValue as any),
        `Unidad inválida encontrada en seed-demo.ts: "${unitValue}". Debe ser una de: ${VALID_UNITS.join(', ')}`
      ).toBe(true);
    }

    // Extraer todas las unidades de empaques declaradas en suppliers
    const packageUnitMatches = [...seedDemoContent.matchAll(/packageUnit:\s*["']([^"']+)["']/g)];
    for (const match of packageUnitMatches) {
      const unitValue = match[1];
      expect(
        VALID_UNITS.includes(unitValue as any),
        `packageUnit inválido encontrado en seed-demo.ts: "${unitValue}". Debe ser una de: ${VALID_UNITS.join(', ')}`
      ).toBe(true);
    }
  });

  it('todos los insumos y empaques en seed.ts (pilotos) deben usar estrictamente unidades de VALID_UNITS (kg, l, u)', () => {
    const seedPilotContent = readFileSync(seedPilotPath, 'utf8');

    const ingredientUnitMatches = [...seedPilotContent.matchAll(/unit:\s*["']([^"']+)["']/g)];
    for (const match of ingredientUnitMatches) {
      const unitValue = match[1];
      expect(
        VALID_UNITS.includes(unitValue as any),
        `Unidad inválida encontrada en seed.ts: "${unitValue}". Debe ser una de: ${VALID_UNITS.join(', ')}`
      ).toBe(true);
    }

    const packageUnitMatches = [...seedPilotContent.matchAll(/packageUnit:\s*["']([^"']+)["']/g)];
    for (const match of packageUnitMatches) {
      const unitValue = match[1];
      expect(
        VALID_UNITS.includes(unitValue as any),
        `packageUnit inválido encontrado en seed.ts: "${unitValue}". Debe ser una de: ${VALID_UNITS.join(', ')}`
      ).toBe(true);
    }
  });

  it('schema.prisma debe documentar las unidades válidas canónicas (kg, l, u)', () => {
    const schemaContent = readFileSync(schemaPath, 'utf8');
    expect(schemaContent).toContain('unit         String // kg, l, u');
    expect(schemaContent).not.toContain('unit         String // kg, l, unit');
  });

  it('debe existir la migración SQL que unifica "unit" a "u" en Ingredient y SupplierIngredient', () => {
    const migrationFilePath = join(
      migrationsDir,
      '20261111120000_unify_ingredient_unit_u',
      'migration.sql'
    );
    const sqlContent = readFileSync(migrationFilePath, 'utf8');

    expect(sqlContent).toContain('UPDATE "Ingredient"');
    expect(sqlContent).toContain('SET "unit" = \'u\'');
    expect(sqlContent).toContain('WHERE "unit" = \'unit\';');

    expect(sqlContent).toContain('UPDATE "SupplierIngredient"');
    expect(sqlContent).toContain('SET "packageUnit" = \'u\'');
    expect(sqlContent).toContain('WHERE "packageUnit" = \'unit\';');
  });
});