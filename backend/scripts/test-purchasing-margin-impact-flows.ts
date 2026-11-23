import dotenv from 'dotenv';
dotenv.config();

import { createClerkClient } from '@clerk/backend';

// ============================================================================
// CONFIGURACIÓN Y UTILITARIOS
// ============================================================================

const DEFAULT_BASE_URL = 'http://localhost:3000/api';

const CLERK_USERS: Record<string, string> = {
  'panaderia-admin': 'user_3LHkU9OL8FBdKxkZOsI0CvoVJ1j',
  'panaderia-colab': 'user_3LHkX5fpp3AcI7HvYn42PBV1xwP',
};

interface TestContext {
  baseUrl: string;
  adminToken: string;
  collabToken: string;
}

interface StepResult {
  flowName: string;
  stepName: string;
  passed: boolean;
  status: number;
  expectedStatus: number;
  durationMs: number;
  error?: string;
  details?: Record<string, unknown>;
}

const results: StepResult[] = [];

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Aserción fallida: ${message}`);
  }
}

async function getOrGenerateTokens(): Promise<{ adminToken: string; collabToken: string }> {
  const args = process.argv.slice(2);
  let adminToken = args[0] ?? process.env.ADMIN_TOKEN;
  let collabToken = args[1] ?? process.env.COLLAB_TOKEN;

  if (adminToken && collabToken) {
    return { adminToken, collabToken };
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      'Faltan tokens y no se encontró CLERK_SECRET_KEY en el .env.\n' +
      'Uso: npx tsx scripts/test-purchasing-margin-impact-flows.ts <ADMIN_TOKEN> <COLLAB_TOKEN>\n' +
      'o definí ADMIN_TOKEN y COLLAB_TOKEN en las variables de entorno.'
    );
  }

  console.log('🔑 Generando tokens de sesión de Clerk para Panadería Central...');
  const clerk = createClerkClient({ secretKey });

  const adminSession = await clerk.sessions.createSession({ userId: CLERK_USERS['panaderia-admin']! });
  const { jwt: adminJwt } = await clerk.sessions.getToken(adminSession.id);

  const collabSession = await clerk.sessions.createSession({ userId: CLERK_USERS['panaderia-colab']! });
  const { jwt: collabJwt } = await clerk.sessions.getToken(collabSession.id);

  return { adminToken: adminJwt, collabToken: collabJwt };
}

// ============================================================================
// EJECUCIÓN DE LOS USER FLOWS
// ============================================================================

async function runFlows(ctx: TestContext): Promise<void> {
  let targetIngredientId = '';
  let targetAlternativeId = '';
  let targetDefaultId = '';

  // --------------------------------------------------------------------------
  // USER FLOW 1: Consulta General de Impacto en el Margen (ADMIN)
  // --------------------------------------------------------------------------
  console.log('\n============================================================');
  console.log('▶ USER FLOW 1: Consulta General de Impacto en el Margen (ADMIN)');
  console.log('============================================================');
  {
    const start = performance.now();
    const res = await fetch(`${ctx.baseUrl}/purchasing/margin-impact`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ctx.adminToken}`,
        Accept: 'application/json',
      },
    });
    const durationMs = Math.round(performance.now() - start);
    const body = await res.json() as Record<string, unknown>;

    try {
      assert(res.status === 200, `Status HTTP esperado 200 pero fue ${res.status}`);
      assert(typeof body.summary === 'object' && body.summary !== null, 'El campo summary es obligatorio');

      const summary = body.summary as Record<string, unknown>;
      assert(typeof summary.ingredientsWithAlternative === 'number', 'summary.ingredientsWithAlternative debe ser un número');
      assert(typeof summary.productsAffected === 'number', 'summary.productsAffected debe ser un número');
      assert(typeof summary.productsLeavingRiskOrLoss === 'number', 'summary.productsLeavingRiskOrLoss debe ser un número');
      assert(Array.isArray(body.byIngredient), 'El campo byIngredient debe ser un array');

      const byIngredient = body.byIngredient as Array<Record<string, unknown>>;
      console.log(`  ✓ Status 200 OK (${durationMs} ms)`);
      console.log(`  ✓ Resumen: ${summary.ingredientsWithAlternative} insumos con alternativa, ${summary.productsAffected} productos afectados, ${summary.productsLeavingRiskOrLoss} que salen de riesgo/pérdida`);

      if (byIngredient.length > 0) {
        const first = byIngredient[0]!;
        assert(typeof first.ingredientId === 'string', 'ingredientId debe ser string');
        assert(typeof first.currentCost === 'string', 'currentCost debe ser string');
        assert(typeof first.unitCostDifference === 'string', 'unitCostDifference debe ser string');
        assert(typeof first.alternativePresentation === 'object' && first.alternativePresentation !== null, 'alternativePresentation requerida');

        const alt = first.alternativePresentation as Record<string, unknown>;
        assert(typeof alt.supplierIngredientId === 'string', 'alternativePresentation.supplierIngredientId requerido');
        assert(typeof alt.unitCost === 'string', 'alternativePresentation.unitCost requerido');

        targetIngredientId = first.ingredientId as string;
        targetAlternativeId = alt.supplierIngredientId as string;

        if (first.defaultPresentation && typeof first.defaultPresentation === 'object') {
          targetDefaultId = (first.defaultPresentation as Record<string, unknown>).supplierIngredientId as string;
        }

        console.log(`  ✓ Insumo analizado: "${first.ingredientName}" (Costo actual: $${first.currentCost}, Ahorro unitario: $${first.unitCostDifference})`);
      }

      results.push({
        flowName: 'User Flow 1',
        stepName: 'GET /api/purchasing/margin-impact como ADMIN',
        passed: true,
        status: res.status,
        expectedStatus: 200,
        durationMs,
      });
    } catch (err) {
      results.push({
        flowName: 'User Flow 1',
        stepName: 'GET /api/purchasing/margin-impact como ADMIN',
        passed: false,
        status: res.status,
        expectedStatus: 200,
        durationMs,
        error: (err as Error).message,
        details: body,
      });
    }
  }

  // --------------------------------------------------------------------------
  // USER FLOW 2: Bloqueo de Acceso a Colaborador (RBAC)
  // --------------------------------------------------------------------------
  console.log('\n============================================================');
  console.log('▶ USER FLOW 2: Bloqueo de Acceso a Colaborador (RBAC)');
  console.log('============================================================');
  {
    const start = performance.now();
    const res = await fetch(`${ctx.baseUrl}/purchasing/margin-impact`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ctx.collabToken}`,
        Accept: 'application/json',
      },
    });
    const durationMs = Math.round(performance.now() - start);
    const body = await res.json() as Record<string, unknown>;

    try {
      assert(res.status === 403, `Status HTTP esperado 403 pero fue ${res.status}`);
      assert(
        body.error === 'Acceso denegado. Se requiere rol ADMIN.',
        `Mensaje de error inesperado: "${body.error}"`
      );

      console.log(`  ✓ Status 403 Forbidden estricto (${durationMs} ms)`);
      console.log(`  ✓ Mensaje RBAC verificado: "${body.error}"`);

      results.push({
        flowName: 'User Flow 2',
        stepName: 'GET /api/purchasing/margin-impact como COLLABORATOR',
        passed: true,
        status: res.status,
        expectedStatus: 403,
        durationMs,
      });
    } catch (err) {
      results.push({
        flowName: 'User Flow 2',
        stepName: 'GET /api/purchasing/margin-impact como COLLABORATOR',
        passed: false,
        status: res.status,
        expectedStatus: 403,
        durationMs,
        error: (err as Error).message,
        details: body,
      });
    }
  }

  // --------------------------------------------------------------------------
  // USER FLOW 3: Validación para Confirmación "Ya le compro a este proveedor"
  // --------------------------------------------------------------------------
  console.log('\n============================================================');
  console.log('▶ USER FLOW 3: Proyección Individual de Insumo (ADMIN)');
  console.log('============================================================');
  if (!targetIngredientId || !targetAlternativeId) {
    console.log('  ⚠ Salteando Flow 3: el catálogo de la cuenta no tiene insumos con alternativas más baratas.');
  } else {
    const start = performance.now();
    const url = `${ctx.baseUrl}/purchasing/margin-impact/${targetIngredientId}?supplierIngredientId=${targetAlternativeId}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ctx.adminToken}`,
        Accept: 'application/json',
      },
    });
    const durationMs = Math.round(performance.now() - start);
    const body = await res.json() as Record<string, unknown>;

    try {
      assert(res.status === 200, `Status HTTP esperado 200 pero fue ${res.status}`);
      assert(body.ingredientId === targetIngredientId, 'ingredientId no coincide con el solicitado');
      assert(Array.isArray(body.products), 'products debe ser un array');

      const products = body.products as Array<Record<string, unknown>>;
      console.log(`  ✓ Status 200 OK (${durationMs} ms)`);
      console.log(`  ✓ Productos analizados para el cambio: ${products.length}`);

      if (products.length > 0) {
        const prod = products[0]!;
        assert(typeof prod.currentRecipeCost === 'string', 'currentRecipeCost requerido');
        assert(typeof prod.projectedRecipeCost === 'string', 'projectedRecipeCost requerido');
        assert(typeof prod.currentMarginPercent === 'string', 'currentMarginPercent requerido');
        assert(typeof prod.projectedMarginPercent === 'string', 'projectedMarginPercent requerido');
        assert(typeof prod.currentBucket === 'string', 'currentBucket requerido');
        assert(typeof prod.projectedBucket === 'string', 'projectedBucket requerido');

        console.log(`  ✓ Ejemplo: "${prod.productName}" | Costo: $${prod.currentRecipeCost} ➔ $${prod.projectedRecipeCost} | Margen: ${prod.currentMarginPercent}% ➔ ${prod.projectedMarginPercent}% (${prod.currentBucket} ➔ ${prod.projectedBucket})`);
      }

      results.push({
        flowName: 'User Flow 3',
        stepName: 'GET /api/purchasing/margin-impact/:id individual exitoso',
        passed: true,
        status: res.status,
        expectedStatus: 200,
        durationMs,
      });
    } catch (err) {
      results.push({
        flowName: 'User Flow 3',
        stepName: 'GET /api/purchasing/margin-impact/:id individual exitoso',
        passed: false,
        status: res.status,
        expectedStatus: 200,
        durationMs,
        error: (err as Error).message,
        details: body,
      });
    }
  }

  // --------------------------------------------------------------------------
  // USER FLOW 4: Casos Negativos de Validación
  // --------------------------------------------------------------------------
  console.log('\n============================================================');
  console.log('▶ USER FLOW 4: Casos Negativos de Validación Individual');
  console.log('============================================================');

  const validIngId = targetIngredientId || '30b00001-0000-4000-8000-000000000001';

  // 4.1: Falta de query param supplierIngredientId (400)
  {
    const start = performance.now();
    const res = await fetch(`${ctx.baseUrl}/purchasing/margin-impact/${validIngId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${ctx.adminToken}` },
    });
    const durationMs = Math.round(performance.now() - start);
    const body = await res.json() as Record<string, unknown>;

    try {
      assert(res.status === 400, `Status esperado 400 pero fue ${res.status}`);
      assert(typeof body.error === 'string' && /supplierIngredientId/i.test(body.error), 'Mensaje debe indicar que supplierIngredientId es obligatorio');
      console.log(`  ✓ 4.1: Sin query param responde 400 Bad Request ("${body.error}")`);
      results.push({ flowName: 'User Flow 4', stepName: '4.1 Sin supplierIngredientId (400)', passed: true, status: res.status, expectedStatus: 400, durationMs });
    } catch (err) {
      results.push({ flowName: 'User Flow 4', stepName: '4.1 Sin supplierIngredientId (400)', passed: false, status: res.status, expectedStatus: 400, durationMs, error: (err as Error).message });
    }
  }

  // 4.2: Presentación que ya es la predeterminada (422)
  if (targetDefaultId) {
    const start = performance.now();
    const res = await fetch(`${ctx.baseUrl}/purchasing/margin-impact/${validIngId}?supplierIngredientId=${targetDefaultId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${ctx.adminToken}` },
    });
    const durationMs = Math.round(performance.now() - start);
    const body = await res.json() as Record<string, unknown>;

    try {
      assert(res.status === 422, `Status esperado 422 pero fue ${res.status}`);
      assert(typeof body.error === 'string' && /ya es la predeterminada/i.test(body.error), 'Mensaje debe indicar que ya es la predeterminada');
      console.log(`  ✓ 4.2: Presentación ya predeterminada responde 422 Unprocessable Entity ("${body.error}")`);
      results.push({ flowName: 'User Flow 4', stepName: '4.2 Presentación ya predeterminada (422)', passed: true, status: res.status, expectedStatus: 422, durationMs });
    } catch (err) {
      results.push({ flowName: 'User Flow 4', stepName: '4.2 Presentación ya predeterminada (422)', passed: false, status: res.status, expectedStatus: 422, durationMs, error: (err as Error).message });
    }
  }

  // 4.3: Presentación inexistente o de otra cuenta (404)
  {
    const start = performance.now();
    const res = await fetch(`${ctx.baseUrl}/purchasing/margin-impact/${validIngId}?supplierIngredientId=00000000-0000-4000-8000-000000000000`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${ctx.adminToken}` },
    });
    const durationMs = Math.round(performance.now() - start);
    const body = await res.json() as Record<string, unknown>;

    try {
      assert(res.status === 404, `Status esperado 404 pero fue ${res.status}`);
      assert(body.error === 'Presentación no encontrada.', `Mensaje inesperado: "${body.error}"`);
      console.log(`  ✓ 4.3: Presentación ajena/inexistente responde 404 Not Found ("${body.error}")`);
      results.push({ flowName: 'User Flow 4', stepName: '4.3 Presentación inexistente (404)', passed: true, status: res.status, expectedStatus: 404, durationMs });
    } catch (err) {
      results.push({ flowName: 'User Flow 4', stepName: '4.3 Presentación inexistente (404)', passed: false, status: res.status, expectedStatus: 404, durationMs, error: (err as Error).message });
    }
  }

  // 4.4: Insumo inexistente (404)
  {
    const start = performance.now();
    const res = await fetch(`${ctx.baseUrl}/purchasing/margin-impact/00000000-0000-4000-8000-000000000000?supplierIngredientId=00000000-0000-4000-8000-000000000000`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${ctx.adminToken}` },
    });
    const durationMs = Math.round(performance.now() - start);
    const body = await res.json() as Record<string, unknown>;

    try {
      assert(res.status === 404, `Status esperado 404 pero fue ${res.status}`);
      assert(body.error === 'Insumo no encontrado.', `Mensaje inesperado: "${body.error}"`);
      console.log(`  ✓ 4.4: Insumo inexistente responde 404 Not Found ("${body.error}")`);
      results.push({ flowName: 'User Flow 4', stepName: '4.4 Insumo inexistente (404)', passed: true, status: res.status, expectedStatus: 404, durationMs });
    } catch (err) {
      results.push({ flowName: 'User Flow 4', stepName: '4.4 Insumo inexistente (404)', passed: false, status: res.status, expectedStatus: 404, durationMs, error: (err as Error).message });
    }
  }
  // --------------------------------------------------------------------------
  // USER FLOW 5: Paridad de Margen Proyectado vs Recálculo Real (con limpieza)
  // --------------------------------------------------------------------------
  console.log('\n============================================================');
  console.log('▶ USER FLOW 5: Paridad Proyección vs Recálculo Real (Temporal)');
  console.log('============================================================');
  const tag = Date.now();
  const headers = {
    Authorization: `Bearer ${ctx.adminToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  let tempIngId = '';
  let tempSup1Id = '';
  let tempSup2Id = '';
  let tempProdId = '';

  const startParity = performance.now();
  try {
    // 1. Crear insumo y dos proveedores temporales
    const ingRes = await fetch(`${ctx.baseUrl}/ingredients`, {
      method: 'POST', headers, body: JSON.stringify({ name: `Harina QA Paridad ${tag}`, unit: 'kg', currentCost: '1000.00' }),
    });
    assert(ingRes.status === 201, `Crear insumo falló (${ingRes.status})`);
    tempIngId = ((await ingRes.json()) as { ingredient: { id: string } }).ingredient.id;

    const sup1Res = await fetch(`${ctx.baseUrl}/suppliers`, {
      method: 'POST', headers, body: JSON.stringify({ name: `Prov Paridad A ${tag}` }),
    });
    assert(sup1Res.status === 201, `Crear prov A falló (${sup1Res.status})`);
    tempSup1Id = ((await sup1Res.json()) as { supplier: { id: string } }).supplier.id;

    const sup2Res = await fetch(`${ctx.baseUrl}/suppliers`, {
      method: 'POST', headers, body: JSON.stringify({ name: `Prov Paridad B ${tag}` }),
    });
    assert(sup2Res.status === 201, `Crear prov B falló (${sup2Res.status})`);
    tempSup2Id = ((await sup2Res.json()) as { supplier: { id: string } }).supplier.id;

    // 2. Asociar presentación predeterminada ($1000/kg) y alternativa más barata ($850/kg)
    const assoc1 = await fetch(`${ctx.baseUrl}/suppliers/${tempSup1Id}/ingredients`, {
      method: 'POST', headers,
      body: JSON.stringify({ ingredientId: tempIngId, packageSize: '10', packageUnit: 'kg', packagePrice: '10000', isDefault: true }),
    });
    assert(assoc1.status === 201, `Asociar A falló (${assoc1.status})`);

    const assoc2 = await fetch(`${ctx.baseUrl}/suppliers/${tempSup2Id}/ingredients`, {
      method: 'POST', headers,
      body: JSON.stringify({ ingredientId: tempIngId, packageSize: '10', packageUnit: 'kg', packagePrice: '8500', isDefault: false }),
    });
    assert(assoc2.status === 201, `Asociar B falló (${assoc2.status})`);
    const altSiId = ((await assoc2.json()) as { supplierIngredient: { id: string } }).supplierIngredient.id;

    // 3. Crear producto de prueba que usa 1.255 kg (ejercita redondeo) a $2000 con mínimo 35%
    const prodRes = await fetch(`${ctx.baseUrl}/products`, {
      method: 'POST', headers,
      body: JSON.stringify({
        name: `Producto QA Paridad ${tag}`,
        salePrice: '2000.00',
        minMarginPercent: '35.00',
        ingredients: [{ ingredientId: tempIngId, quantity: '1.255' }],
      }),
    });
    assert(prodRes.status === 201, `Crear producto falló (${prodRes.status})`);
    tempProdId = ((await prodRes.json()) as { product: { id: string } }).product.id;

    // 4. Consultar proyección antes de aplicar
    const impactRes = await fetch(`${ctx.baseUrl}/purchasing/margin-impact/${tempIngId}?supplierIngredientId=${altSiId}`, {
      method: 'GET', headers,
    });
    assert(impactRes.status === 200, `margin-impact falló (${impactRes.status})`);
    const impactBody = (await impactRes.json()) as {
      products: Array<{ productId: string; projectedRecipeCost: string; projectedMarginPercent: string }>;
    };
    const projected = impactBody.products.find((p) => p.productId === tempProdId);
    assert(Boolean(projected), 'Producto temporal ausente en proyección');

    // 5. Hacer predeterminada la alternativa y comparar contra el recálculo real
    const confirmRes = await fetch(`${ctx.baseUrl}/suppliers/${tempSup2Id}/ingredients`, {
      method: 'POST', headers,
      body: JSON.stringify({ ingredientId: tempIngId, packageSize: '10', packageUnit: 'kg', packagePrice: '8500', isDefault: true }),
    });
    assert(confirmRes.status === 200, `Confirmar B como predeterminada falló (${confirmRes.status})`);

    const realProdRes = await fetch(`${ctx.baseUrl}/products/${tempProdId}`, { method: 'GET', headers });
    assert(realProdRes.status === 200, `Leer producto real falló (${realProdRes.status})`);
    const realProd = ((await realProdRes.json()) as { product: { cost: string; marginPercent: string } }).product;

    assert(
      Number(realProd.cost).toFixed(2) === projected!.projectedRecipeCost,
      `Costo distinto: proyectado ${projected!.projectedRecipeCost} vs real ${realProd.cost}`
    );
    assert(
      Number(realProd.marginPercent).toFixed(2) === projected!.projectedMarginPercent,
      `Margen distinto: proyectado ${projected!.projectedMarginPercent} vs real ${realProd.marginPercent}`
    );

    console.log(`  ✓ Paridad exacta verificada: costo $${realProd.cost} | margen ${realProd.marginPercent}%`);
    results.push({
      flowName: 'User Flow 5',
      stepName: 'Paridad margen proyectado vs recálculo real',
      passed: true,
      status: 200,
      expectedStatus: 200,
      durationMs: Math.round(performance.now() - startParity),
    });
  } catch (err) {
    results.push({
      flowName: 'User Flow 5',
      stepName: 'Paridad margen proyectado vs recálculo real',
      passed: false,
      status: 500,
      expectedStatus: 200,
      durationMs: Math.round(performance.now() - startParity),
      error: (err as Error).message,
    });
  } finally {
    // Limpieza garantizada aunque falle alguna aserción
    if (tempProdId) await fetch(`${ctx.baseUrl}/products/${tempProdId}`, { method: 'DELETE', headers }).catch(() => undefined);
    if (tempSup1Id) await fetch(`${ctx.baseUrl}/suppliers/${tempSup1Id}`, { method: 'DELETE', headers }).catch(() => undefined);
    if (tempSup2Id) await fetch(`${ctx.baseUrl}/suppliers/${tempSup2Id}`, { method: 'DELETE', headers }).catch(() => undefined);
    if (tempIngId) await fetch(`${ctx.baseUrl}/ingredients/${tempIngId}`, { method: 'DELETE', headers }).catch(() => undefined);
  }
}

// ============================================================================
// PUNTO DE ENTRADA Y REPORTE
// ============================================================================

async function main() {
  const baseUrl = (process.env.API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  console.log('🚀 Iniciando certificación automatizada de User Flows [SPRINT7-R-01 / #445]');
  console.log(`🎯 URL Destino: ${baseUrl}`);

  const tokens = await getOrGenerateTokens();
  await runFlows({ baseUrl, ...tokens });

  console.log('\n============================================================');
  console.log('📊 RESUMEN FINAL DE CERTIFICACIÓN QA');
  console.log('============================================================');

  let allPassed = true;
  console.table(
    results.map((r) => {
      if (!r.passed) allPassed = false;
      return {
        Flujo: r.flowName,
        Prueba: r.stepName,
        Resultado: r.passed ? '✅ PASÓ' : '❌ FALLÓ',
        HTTP: `${r.status} (Esp: ${r.expectedStatus})`,
        Tiempo: `${r.durationMs} ms`,
        Detalle: r.error ?? 'OK',
      };
    })
  );

  if (!allPassed) {
    console.error('\n❌ Uno o más flujos fallaron. Revisá la tabla anterior.');
    process.exit(1);
  }

  console.log('\n✨ Todos los User Flows se ejecutaron y pasaron exitosamente.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n💥 Error fatal al ejecutar los flujos:', err instanceof Error ? err.message : err);
  process.exit(1);
});