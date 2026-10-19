import process from 'node:process';

const DEFAULT_BASE_URL = 'http://localhost:3000';
const DEFAULT_SCENARIO = 'affected';

const scenarioMap = {
  affected: {
    label: 'Cambio real: afecta 2 productos y marca 1 crítico',
    body: {
      name: 'Harina de trigo 000 Olavarriense',
      unit: 'kg',
      currentCost: '9500.00',
    },
  },
  noChange: {
    label: 'Sin cambio real de costo',
    body: {
      name: 'Harina de trigo 000 Olavarriense',
      unit: 'kg',
      currentCost: '742.98',
    },
  },
  forbidden: {
    label: 'Colaborador intenta actualizar y recibe 403',
    body: {
      name: 'Harina de trigo 000 Olavarriense',
      unit: 'kg',
      currentCost: '9500.00',
    },
  },
} as const;

function parseArgs() {
  const args = process.argv.slice(2);
  const scenario = args[0] ?? process.env.SCENARIO ?? DEFAULT_SCENARIO;
  const ingredientId = args[1] ?? process.env.INGREDIENT_ID ?? '30b00001-0000-4000-8000-000000000001';

  return {
    scenario,
    ingredientId,
    baseUrl: process.env.API_BASE_URL ?? DEFAULT_BASE_URL,
    token: process.env.AUTH_TOKEN,
  };
}

function printUsage() {
  console.error('Uso:');
  console.error('  AUTH_TOKEN="<jwt>" npx tsx scripts/check-ingredient-cost-change.ts [affected|noChange|forbidden] [INGREDIENT_ID]');
  console.error('');
  console.error('Ejemplos:');
  console.error('  AUTH_TOKEN="..." npx tsx scripts/check-ingredient-cost-change.ts affected');
  console.error('  AUTH_TOKEN="..." npx tsx scripts/check-ingredient-cost-change.ts noChange 30b00001-0000-4000-8000-000000000001');
}

async function main() {
  const { scenario, ingredientId, baseUrl, token } = parseArgs();

  const scenarioDef = scenarioMap[scenario as keyof typeof scenarioMap];
  if (!scenarioDef) {
    console.error(`Escenario inválido: "${scenario}". Opciones: ${Object.keys(scenarioMap).join(', ')}`);
    printUsage();
    process.exit(1);
  }

  if (!token) {
    console.error('Falta AUTH_TOKEN. Debe venir en el header Authorization: Bearer <token>.');
    printUsage();
    process.exit(1);
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/ingredients/${ingredientId}`;

  console.log(`\n=== Escenario: ${scenarioDef.label} ===`);
  console.log(`URL: ${url}`);
  console.log('Payload enviado al backend:');
  console.log(JSON.stringify(scenarioDef.body, null, 2));

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(scenarioDef.body),
  });

  const text = await response.text();
  const contentType = response.headers.get('content-type') ?? '';

  console.log(`\n[HTTP ${response.status}] ${response.statusText}`);

  try {
    const json = contentType.includes('application/json') ? JSON.parse(text) : text;
    console.log('\nRespuesta que recibe el frontend:');
    if (typeof json === 'object' && json !== null) {
      const frontendPayload = {
        ingredient: json.ingredient,
        affectedProductsCount: json.affectedProductsCount,
        affectedProducts: json.affectedProducts,
        criticalProducts: json.criticalProducts,
      };
      console.log(JSON.stringify(frontendPayload, null, 2));
    } else {
      console.log(JSON.stringify(json, null, 2));
    }
  } catch {
    console.log('\nRespuesta cruda:');
    console.log(text);
  }
}

main().catch((error) => {
  console.error('Error al ejecutar la validación:', error);
  process.exit(1);
});
