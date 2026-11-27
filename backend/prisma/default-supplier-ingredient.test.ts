import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';

/*
  E7 (#499): un insumo no puede quedar con dos presentaciones predeterminadas. Lo garantiza el índice
  único parcial de la migración 20261127130811, y la misma migración corrige antes los insumos que ya
  tenían dos (como el de la cuenta Demo de staging), para que `prisma migrate deploy` no falle.
*/
const MIGRATION_SQL = resolve(
  __dirname,
  'migrations/20261127130811_add_unique_default_supplier_ingredient/migration.sql'
);

// Sin TEST_DATABASE_URL se omite, como prisma/seed-units.test.ts. En el CI es obligatoria (#438).
const testDbUrl = process.env.TEST_DATABASE_URL;
const integrationRequired = process.env.CI === 'true';
const describeOrSkip = testDbUrl || integrationRequired ? describe : describe.skip;

const ACCOUNT_ID = '34a00000-0000-4000-8000-000000000499';
const MOLINO = '34c00000-0000-4000-8000-000000000001';
const TREBOL = '34c00000-0000-4000-8000-000000000002';

/** Deshace todo lo que hizo la prueba dentro de la transacción. */
class Rollback extends Error {}

async function cuentaConProveedores(tx: Prisma.TransactionClient) {
  await tx.account.create({ data: { id: ACCOUNT_ID, businessName: 'Panadería Central (prueba E7)', slug: 'panaderia-central-e7' } });
  await tx.supplier.createMany({
    data: [
      { id: MOLINO, accountId: ACCOUNT_ID, name: 'Molino del Sur' },
      { id: TREBOL, accountId: ACCOUNT_ID, name: 'Abastecedora El Trébol' },
    ],
  });
}

async function insumo(tx: Prisma.TransactionClient, id: string, name: string, currentCost: string) {
  await tx.ingredient.create({ data: { id, accountId: ACCOUNT_ID, name, unit: 'kg', currentCost: new Prisma.Decimal(currentCost) } });
}

async function presentacion(tx: Prisma.TransactionClient, id: string, supplierId: string, ingredientId: string, packagePrice: string, isDefault: boolean) {
  await tx.supplierIngredient.create({
    data: { id, supplierId, ingredientId, packageSize: new Prisma.Decimal('25'), packageUnit: 'kg', packagePrice: new Prisma.Decimal(packagePrice), isDefault },
  });
}

describeOrSkip('Escenario Gherkin: Una sola presentación predeterminada (E7, #499), contra PostgreSQL real', () => {
  it('la base rechaza una segunda presentación predeterminada para el mismo insumo', async () => {
    expect(testDbUrl, 'Falta TEST_DATABASE_URL: en el CI esta prueba corre contra PostgreSQL y no puede omitirse').toBeTruthy();
    const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });

    try {
      await expect(
        prisma.$transaction(async (tx) => {
          await cuentaConProveedores(tx);
          await insumo(tx, '34b00000-0000-4000-8000-000000000001', 'Harina 000', '480.00');
          await presentacion(tx, '34d00000-0000-4000-8000-000000000001', MOLINO, '34b00000-0000-4000-8000-000000000001', '12000', true);
          await presentacion(tx, '34d00000-0000-4000-8000-000000000002', TREBOL, '34b00000-0000-4000-8000-000000000001', '21000', true);
        })
      ).rejects.toThrow(/Unique constraint failed/);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('la migración deja una sola predeterminada en los insumos que tenían dos: la que da el costo actual, o si no la de menor id', async () => {
    expect(testDbUrl, 'Falta TEST_DATABASE_URL: en el CI esta prueba corre contra PostgreSQL y no puede omitirse').toBeTruthy();
    const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
    const sentencias = readFileSync(MIGRATION_SQL, 'utf8')
      .split(';')
      .map((sentencia) => sentencia.trim())
      .filter((sentencia) => sentencia.replace(/--.*$/gm, '').trim() !== '');

    try {
      await expect(
        prisma.$transaction(async (tx) => {
          // DADO: la base como estaba antes de la migración, sin el índice y con insumos con dos predeterminadas.
          await tx.$executeRawUnsafe('DROP INDEX "SupplierIngredient_ingredientId_default_key"');
          await cuentaConProveedores(tx);
          // El costo actual (840) es el de El Trébol (21.000 / 25), aunque Molino tenga el id menor.
          await insumo(tx, '34b00000-0000-4000-8000-000000000011', 'Harina 000', '840.00');
          await presentacion(tx, '34d00000-0000-4000-8000-000000000011', MOLINO, '34b00000-0000-4000-8000-000000000011', '12000', true);
          await presentacion(tx, '34d00000-0000-4000-8000-000000000012', TREBOL, '34b00000-0000-4000-8000-000000000011', '21000', true);
          // Costo cargado a mano (999): ninguna presentación lo da, se queda la de menor id.
          await insumo(tx, '34b00000-0000-4000-8000-000000000021', 'Manteca', '999.00');
          await presentacion(tx, '34d00000-0000-4000-8000-000000000021', MOLINO, '34b00000-0000-4000-8000-000000000021', '12000', true);
          await presentacion(tx, '34d00000-0000-4000-8000-000000000022', TREBOL, '34b00000-0000-4000-8000-000000000021', '21000', true);
          // Un insumo sano no cambia.
          await insumo(tx, '34b00000-0000-4000-8000-000000000031', 'Azúcar', '480.00');
          await presentacion(tx, '34d00000-0000-4000-8000-000000000031', MOLINO, '34b00000-0000-4000-8000-000000000031', '12000', true);
          await presentacion(tx, '34d00000-0000-4000-8000-000000000032', TREBOL, '34b00000-0000-4000-8000-000000000031', '21000', false);

          // CUANDO: corre la migración.
          for (const sentencia of sentencias) await tx.$executeRawUnsafe(sentencia);

          // ENTONCES: una sola predeterminada por insumo, el índice existe y los costos no cambian.
          const predeterminadas = await tx.supplierIngredient.findMany({
            where: { isDefault: true, ingredient: { accountId: ACCOUNT_ID } },
            select: { id: true, ingredientId: true },
            orderBy: { ingredientId: 'asc' },
          });
          expect(predeterminadas).toEqual([
            { id: '34d00000-0000-4000-8000-000000000012', ingredientId: '34b00000-0000-4000-8000-000000000011' },
            { id: '34d00000-0000-4000-8000-000000000021', ingredientId: '34b00000-0000-4000-8000-000000000021' },
            { id: '34d00000-0000-4000-8000-000000000031', ingredientId: '34b00000-0000-4000-8000-000000000031' },
          ]);
          const indices = await tx.$queryRawUnsafe<Array<{ indexname: string }>>(
            `SELECT indexname FROM pg_indexes WHERE indexname = 'SupplierIngredient_ingredientId_default_key'`
          );
          expect(indices).toHaveLength(1);
          const costos = await tx.ingredient.findMany({ where: { accountId: ACCOUNT_ID }, select: { currentCost: true }, orderBy: { id: 'asc' } });
          expect(costos.map((c) => c.currentCost.toFixed(2))).toEqual(['840.00', '999.00', '480.00']);

          throw new Rollback();
        })
      ).rejects.toBeInstanceOf(Rollback);
    } finally {
      await prisma.$disconnect();
    }
  });
});
