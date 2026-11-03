import { Prisma } from '@prisma/client';
import {
  calculateRecipeTotal,
  calculateMarginAmount,
  calculateMarginPercent,
  applyBatchIngredientCostChanges,
  type IngredientCostUpdateInput,
} from '../src/services/marginCalculator';

// Obtención de timestamp de alta precisión sin dependencias externas
const now = (): number => {
  if (typeof globalThis !== 'undefined' && 'performance' in globalThis) {
    return (globalThis as unknown as { performance: { now: () => number } }).performance.now();
  }
  return Date.now();
};

const D = (v: string | number) => new Prisma.Decimal(v);

// Configuración del escenario de estrés: 300 insumos modificados y 40 productos compuestos
const INGREDIENT_COUNT = 300;
const PRODUCT_COUNT = 40;
const INGREDIENTS_PER_PRODUCT = 10;

console.log('================================================================');
console.log('  MargenX — Benchmark de Recálculo en Cascada (Issue SPRINT5-BE-05)');
console.log(`  Escenario: ${INGREDIENT_COUNT} insumos actualizados | ${PRODUCT_COUNT} productos afectados`);
console.log('================================================================\n');

// 1. Insumos con variación de costo
const changes: IngredientCostUpdateInput[] = Array.from({ length: INGREDIENT_COUNT }, (_, i) => ({
  ingredientId: `ing-${i + 1}`,
  previousCost: D('100.00'),
  newCost: D('150.00'),
}));

// 2. Mock de 40 productos y sus relaciones
const mockRelations: Array<{ productId: string; ingredientId: string }> = [];
const mockProducts = Array.from({ length: PRODUCT_COUNT }, (_, pIdx) => {
  const pId = `prod-${pIdx + 1}`;
  const ingredients = Array.from({ length: INGREDIENTS_PER_PRODUCT }, (_, iIdx) => {
    const ingIndex = ((pIdx * 7 + iIdx * 11) % INGREDIENT_COUNT) + 1;
    const ingId = `ing-${ingIndex}`;
    mockRelations.push({ productId: pId, ingredientId: ingId });
    return {
      ingredientId: ingId,
      quantity: D('0.250'),
      ingredient: { id: ingId, currentCost: D('100.00') },
    };
  });

  return {
    id: pId,
    name: `Producto Terminado ${pIdx + 1}`,
    salePrice: D('5000.00'),
    minMarginPercent: D('30.00'),
    cost: D('250.00'),
    marginPercent: D('95.00'),
    ingredients,
  };
});

// ----------------------------------------------------------------------------
// SIMULACIÓN 1: MÉTODO ANTERIOR (Secuencial insumo por insumo)
// ----------------------------------------------------------------------------
async function runLegacySequentialMethod() {
  let simulatedDbQueries = 0;
  const start = performance.now();

  for (const change of changes) {
    // 1 query por insumo para registrar historial
    simulatedDbQueries += 1;

    // 1 query por insumo para buscar los productos que lo usan
    const affected = mockRelations.filter((r) => r.ingredientId === change.ingredientId);
    simulatedDbQueries += 1;

    // Por cada producto afectado: 1 findUnique + 1 update
    for (const rel of affected) {
      const product = mockProducts.find((p) => p.id === rel.productId);
      if (!product) continue;
      simulatedDbQueries += 2; // findUnique + update

      // Recálculo individual
      const nextCost = calculateRecipeTotal(
        product.ingredients.map((pi) => ({
          quantity: pi.quantity,
          unitCost: pi.ingredientId === change.ingredientId ? change.newCost : pi.ingredient.currentCost,
        }))
      );
      calculateMarginAmount(product.salePrice, nextCost);
      calculateMarginPercent(product.salePrice, nextCost);
    }
  }

  const durationMs = performance.now() - start;
  return { durationMs, simulatedDbQueries };
}

// ----------------------------------------------------------------------------
// SIMULACIÓN 2: MÉTODO NUEVO (Batch consolidado)
// ----------------------------------------------------------------------------
async function runBatchOptimizedMethod() {
  let simulatedDbQueries = 0;

  const mockTx = {
    priceHistory: {
      create: async () => {
        simulatedDbQueries += 1;
        return {};
      },
    },
    productIngredient: {
      findMany: async () => {
        simulatedDbQueries += 1; // 1 sola consulta findMany para todas las relaciones
        return mockRelations;
      },
    },
    product: {
      findMany: async () => {
        simulatedDbQueries += 1; // 1 sola consulta findMany para todos los productos
        return mockProducts;
      },
      update: async () => {
        simulatedDbQueries += 1; // 1 update por cada producto único
        return {};
      },
    },
  };

  const start = performance.now();
  await applyBatchIngredientCostChanges(mockTx, changes);
  const durationMs = performance.now() - start;

  return { durationMs, simulatedDbQueries };
}

async function main() {
  console.log('⏳ Ejecutando simulación método anterior (secuencial)...');
  const legacy = await runLegacySequentialMethod();

  console.log('⏳ Ejecutando simulación método nuevo (en lote consolidado)...');
  const batch = await runBatchOptimizedMethod();

  const queryReductionPercent = (
    ((legacy.simulatedDbQueries - batch.simulatedDbQueries) / legacy.simulatedDbQueries) *
    100
  ).toFixed(1);

  const speedup = (legacy.durationMs / batch.durationMs).toFixed(1);

  console.log('\n================================================================');
  console.log('  RESULTADOS COMPARATIVOS DEL BENCHMARK');
  console.log('================================================================');
  console.table([
    {
      Métrica: 'Tiempo de Ejecución',
      'Método Anterior (Secuencial)': `${legacy.durationMs.toFixed(2)} ms`,
      'Método Nuevo (Lote)': `${batch.durationMs.toFixed(2)} ms`,
      Mejora: `${speedup}x más rápido`,
    },
    {
      Métrica: 'Consultas a Base de Datos (I/O)',
      'Método Anterior (Secuencial)': `${legacy.simulatedDbQueries} ops`,
      'Método Nuevo (Lote)': `${batch.simulatedDbQueries} ops`,
      Mejora: `-${queryReductionPercent}% de queries`,
    },
    {
      Métrica: 'Recálculos por Producto',
      'Método Anterior (Secuencial)': 'Hasta 10 recálculos parciales/prod',
      'Método Nuevo (Lote)': '1 recálculo consolidado/prod',
      Mejora: '100% determinístico',
    },
  ]);
}

main().catch(console.error);