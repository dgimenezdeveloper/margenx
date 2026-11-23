// Prueba el workflow reporte-semanal.json sin necesitar n8n: los nodos Code (cuentas, HTML del PDF y del mail,
// adjunto y aviso de falla), la estructura del workflow y el contenedor de Gotenberg del compose.
// Uso: node infra/n8n/tests/reporte-nodos.test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const wf = JSON.parse(fs.readFileSync(path.join(dir, '../workflows/reporte-semanal.json'), 'utf8'));
const byName = (name) => {
  const found = wf.nodes.find((n) => n.name === name);
  assert.ok(found, `falta el nodo "${name}"`);
  return found;
};
const next = (from, output = 0) => (wf.connections[from]?.main?.[output] ?? []).map((c) => c.node);

// `$('Nodo')` de n8n: `item` es el ítem emparejado, `first()` el primero e `isExecuted` si corrió en esta ejecución.
const nodos = (mapa) => (nombre) => {
  const n = mapa[nombre];
  if (!n) {
    return { isExecuted: false, get item() { throw new Error(`"${nombre}" no corrió`); }, first() { throw new Error(`"${nombre}" no corrió`); } };
  }
  return { isExecuted: true, item: { json: n }, first: () => ({ json: n }) };
};
const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
// El nodo Code de n8n corre aislado y no garantiza URL, Buffer ni btoa: se ocultan para que la prueba falle si el código depende de ellos.
const ejecutar = (nombre, { item, items, $ = nodos({}), prevNode = '' }) => {
  const node = byName(nombre);
  const todos = items ?? [item];
  const $input = { item: todos[0], all: () => todos, first: () => todos[0] };
  return new AsyncFn('$input', '$', '$prevNode', 'URL', 'URLSearchParams', 'Buffer', 'btoa', node.parameters.jsCode)(
    $input, $, { name: prevNode }, undefined, undefined, undefined, undefined,
  );
};
const html = (salida) => Buffer.from(salida.binary.html.data, 'base64').toString('utf8');
const hrefs = (texto) => [...texto.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
const enOrden = (texto, partes) => {
  let desde = -1;
  for (const parte of partes) {
    const i = texto.indexOf(parte, desde + 1);
    assert.ok(i > desde, `"${parte}" falta o está fuera de orden`);
    desde = i;
  }
};

// Reporte con la forma de GET /api/internal/reports/weekly/:slug (backend/src/services/reportService.ts)
const reporte = (extra = {}) => ({
  account: { id: 'acc-quimica', businessName: 'Química GyJ', slug: 'quimica-gyj', defaultMinMarginPercent: '30.00' },
  period: {
    from: '2026-11-16T11:00:00.000Z',
    to: '2026-11-23T11:00:00.000Z',
    timezone: 'America/Argentina/Buenos_Aires',
    fromFormatted: '16/11/2026',
    toFormatted: '23/11/2026',
  },
  generatedAt: '2026-11-23T11:00:00.000Z',
  catalogHealth: {
    totalProducts: 48, criticalProductsCount: 23, healthyProductsCount: 22, averageMarginPercent: 34.5,
    lossCount: 9, riskCount: 14, targetCount: 20, surplusCount: 2, draftCount: 3, activeIngredientsCount: 27,
  },
  belowMinimumProducts: {
    totalCount: 23,
    items: [
      { productId: 'p1', name: 'Lavandina concentrada 5 L', salePrice: '1234.56', cost: '1388.88', marginPercent: '-12.50', minMarginPercent: '30.00', suggestedSalePrice: '1984.11', status: 'loss' },
      { productId: 'p2', name: 'Detergente neutro 1 L', salePrice: '2150.00', cost: '1612.50', marginPercent: '25.00', minMarginPercent: '30.00', suggestedSalePrice: '2303.57', status: 'risk' },
    ],
  },
  weeklyCostChanges: {
    totalCount: 1,
    items: [{ id: 'h1', ingredientId: 'i1', ingredientName: 'Hipoclorito de sodio 10 %', unit: 'l', oldCost: '850.00', newCost: '1360.00', variationPercent: '60.00', changedAt: '2026-11-18T14:30:00.000Z', affectedProductsCount: 4 }],
  },
  quarantine: {
    totalCount: 1,
    items: [{
      supplierIngredientId: 's1', ingredientId: 'i2', ingredientName: 'Lauril éter sulfato de sodio', unit: 'kg', supplierId: 'sup1', supplierName: 'Distribuidora Química Sur',
      currentPackagePrice: '42000.00', pendingPackagePrice: '71400.00', currentUnitCost: '2100.00', proposedUnitCost: '3570.00', variationPercent: '70.00',
      quarantineReason: 'VARIACION_MAYOR_50_POR_CIENTO', quarantinedAt: '2026-11-19T12:00:00.000Z', isDefault: true,
    }],
  },
  purchasingSavings: {
    totalCount: 1,
    items: [{
      ingredientId: 'i3', ingredientName: 'Envase PET 1 L', unit: 'u', currentSupplierName: 'Plásticos del Oeste', currentUnitCost: '185.00',
      bestSupplierName: 'Envases Lanús', bestUnitCost: '162.50', packageSize: '100.000', packagePrice: '16250.00', savingsPerUnit: '22.50', savingsPercent: '12.16', packageSavings: '2250.00',
    }],
  },
  staleCosts: {
    totalCount: 1,
    thresholdDays: 30,
    items: [{ ingredientId: 'i4', name: 'Fragancia lavanda', unit: 'l', currentCost: '15400.00', lastUpdatedAt: '2026-09-30T13:00:00.000Z', daysWithoutUpdate: 53 }],
  },
  ...extra,
});
const vacio = () => reporte({
  catalogHealth: { totalProducts: 0, criticalProductsCount: 0, healthyProductsCount: 0, averageMarginPercent: 0, lossCount: 0, riskCount: 0, targetCount: 0, surplusCount: 0, draftCount: 0, activeIngredientsCount: 0 },
  belowMinimumProducts: { totalCount: 0, items: [] },
  weeklyCostChanges: { totalCount: 0, items: [] },
  quarantine: { totalCount: 0, items: [] },
  purchasingSavings: { totalCount: 0, items: [] },
  staleCosts: { totalCount: 0, thresholdDays: 30, items: [] },
});
const cuenta = (extra = {}) => ({ entorno: 'prod', apiBase: 'http://backend-prod:3000', slug: 'quimica-gyj', comercio: 'Química GyJ', destinatario: 'admin.quimica@seed.example.test', ...extra });
const semanal = (datos, extra) => ejecutar('Generar Reporte HTML', { item: { json: datos }, $: nodos({ 'Separar Cuentas': cuenta(extra) }) });
const descarga = (body, headers = { 'x-margenx-webhook-secret': 'secreto' }) =>
  ejecutar('Generar Reporte HTML', { item: { json: { headers, params: {}, query: {}, body } } });

(async () => {
  // 1 Envío semanal: PDF con las secciones en el orden de la issue, nombre del adjunto y asunto
  let r = await semanal(reporte());
  assert.equal(r.json.valido, true);
  assert.equal(r.json.origen, 'semanal');
  assert.equal(r.json.destinatario, 'admin.quimica@seed.example.test');
  assert.equal(r.json.emailSubject, 'MargenX · Reporte semanal · Química GyJ');
  assert.equal(r.json.nombreArchivo, 'margenx-reporte-2026-11-23.pdf');
  assert.deepEqual([r.binary.html.mimeType, r.binary.html.fileName], ['text/html', 'index.html']);
  let pdf = html(r);
  assert.ok(pdf.startsWith('<!DOCTYPE html>') && pdf.includes('<html lang="es">'));
  enOrden(pdf, ['Química GyJ', 'del 16/11/2026 al 23/11/2026', 'Para revisar', 'Productos debajo de su margen mínimo', 'Precios en cuarentena',
    'Costos sin actualizar', 'Salud del catálogo', 'Cambios de costo de la semana', 'Oportunidades de ahorro', 'Montos calculados por MargenX al 23/11/2026']);
  assert.ok(pdf.includes('Generado el 23/11/2026, 08:00'), 'la hora de generación va en hora de Argentina');

  // 2 Formato es-AR: miles con punto, decimales con coma; nunca el número crudo del backend
  for (const esperado of ['1.234,56', '1.984,11', '1.360,00', '71.400,00', '2.250,00', '15.400,00', '-12,50%', '+60,00%', '+70,00%', '34,50%']) {
    assert.ok(pdf.includes(esperado), `falta ${esperado}`);
  }
  assert.ok(!pdf.includes('1234.56') && !pdf.includes('15400.00'));

  // 3 Nombres de estado de la especificación funcional §6, unidades legibles y motivo de cuarentena como en la app
  for (const estado of ['Pérdida', 'En riesgo', 'En objetivo', 'Superávit', 'Borrador']) assert.ok(pdf.includes(estado), `falta el estado ${estado}`);
  assert.ok(!/Crítico|Saludable|Margen Bajo/.test(pdf));
  assert.ok(pdf.includes('/ unidad') && !pdf.includes('/ u<'));
  assert.ok(pdf.includes('Aumento &gt; 50%'));
  assert.ok(pdf.includes('53 días'));

  // 3b Columna Estado sin cortar la palabra (RC-05, #435): "Pérdida" no se parte en "Pérdid/a"
  assert.ok(/\.mx-nowrap\s*\{[^}]*white-space:\s*nowrap/.test(pdf), 'la hoja A4 define la clase mx-nowrap');
  const encabezadosEstado = pdf.match(/<th[^>]*>Estado<\/th>/g) ?? [];
  assert.equal(encabezadosEstado.length, 2, 'las dos tablas con columna Estado');
  for (const th of encabezadosEstado) assert.ok(th.includes('class="mx-nowrap"'), `encabezado sin mx-nowrap: ${th}`);
  assert.ok(pdf.includes('<td class="mx-nowrap">Pérdida</td>'), 'la celda Pérdida no se corta');
  assert.ok(pdf.includes('<td class="mx-nowrap">En riesgo</td>'), 'la celda En riesgo no se corta');

  // 3c Soporte: el mismo correo que la app (RC-06, #435)
  assert.ok(pdf.includes('soporte@margenx.tech') && !pdf.includes('contacto@margenx.tech'));
  assert.ok(r.json.emailText.includes('Soporte: soporte@margenx.tech') && !r.json.emailText.includes('contacto@'), 'el texto plano del mail también');

  // 3d Margen mediano (RC-03, #430): el PDF y el mail lo llaman por su nombre y explican qué es
  assert.ok(pdf.includes('Margen mediano: <strong>34,50%</strong>'), 'el PDF dice "Margen mediano"');
  assert.ok(pdf.includes('La mitad de tus productos gana más que esto y la mitad menos.'), 'el PDF explica la mediana');
  assert.ok(r.json.emailText.includes('Margen mediano: 34,50%') && r.json.emailHtml.includes('Margen mediano'), 'el mail usa el mismo rótulo');
  for (const texto of [pdf, r.json.emailHtml, r.json.emailText]) {
    assert.ok(!/margen promedio|cr[ií]tic[oa]s?\b|saludable/i.test(texto), 'queda un rótulo viejo en el reporte');
  }

  // 4 Se avisa cuando el backend manda solo una parte (tope de 20 productos)
  assert.ok(pdf.includes('Se muestran 2 de 23'));

  // 5 Versión para imprimir en A4: tamaño de página, filas que no se cortan y encabezados que se repiten
  for (const regla of ['@page', 'size: A4', 'break-inside: avoid', 'display: table-header-group', 'print-color-adjust: exact']) {
    assert.ok(pdf.includes(regla), `falta la regla CSS ${regla}`);
  }

  // 6 Mail: números clave, botón "Abrir MargenX" al entorno de la ejecución y texto plano sin HTML
  assert.ok(r.json.emailHtml.includes('Abrir MargenX'));
  assert.deepEqual(hrefs(r.json.emailHtml), ['https://margenx.tech/dashboard']);
  for (const dato of ['23 productos debajo de su margen mínimo', '1 precio en cuarentena', '1 costo sin actualizar', '34,50%', 'adjunto']) {
    assert.ok(r.json.emailText.includes(dato), `al texto del mail le falta "${dato}"`);
    assert.ok(r.json.emailHtml.includes(dato), `al HTML del mail le falta "${dato}"`);
  }
  assert.ok(r.json.emailText.includes('https://margenx.tech/dashboard'));
  assert.ok(!/<[a-z]/i.test(r.json.emailText));
  r = await semanal(reporte(), { entorno: 'dev' });
  assert.deepEqual(hrefs(r.json.emailHtml), ['https://dev.margenx.tech/dashboard']);

  // 7 Escapes: nada del reporte entra como HTML; el asunto no lleva saltos de línea
  r = await semanal(reporte({
    account: { id: 'acc', businessName: 'Química "GyJ" <S.A.>\r\nBcc: x@evil.example', slug: 'quimica-gyj', defaultMinMarginPercent: '30.00' },
    belowMinimumProducts: { totalCount: 1, items: [{ ...reporte().belowMinimumProducts.items[0], name: '<script>alert(1)</script>' }] },
  }));
  pdf = html(r);
  assert.ok(!pdf.includes('<script>') && pdf.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(pdf.includes('Química &quot;GyJ&quot; &lt;S.A.&gt;'));
  assert.ok(!r.json.emailHtml.includes('<S.A.>') && r.json.emailHtml.includes('&lt;S.A.&gt;'));
  assert.ok(!/[\r\n]/.test(r.json.emailSubject));
  assert.ok(r.json.emailText.includes('Química "GyJ" <S.A.>') && !r.json.emailText.includes('&quot;'));

  // 8 Semana sin novedades: lo dice en cada sección
  r = await semanal(vacio());
  pdf = html(r);
  assert.ok(pdf.includes('Nada para revisar esta semana'));
  assert.ok(pdf.includes('No hubo cambios de costo en el período'));
  assert.ok(pdf.includes('No hay presentaciones más baratas'));
  assert.ok(r.json.emailText.includes('Nada para revisar esta semana'));

  // 9 Descarga a pedido (webhook report-pdf): el mismo generador, sin mail y sin pedir datos a otros nodos
  r = await descarga(reporte());
  assert.equal(r.json.valido, true);
  assert.equal(r.json.origen, 'descarga');
  assert.equal(r.json.nombreArchivo, 'margenx-reporte-2026-11-23.pdf');
  assert.equal(r.json.emailHtml, undefined);
  assert.equal(r.json.destinatario, undefined);
  enOrden(html(r), ['Química GyJ', 'Para revisar', 'Salud del catálogo', 'Cambios de costo de la semana', 'Oportunidades de ahorro', 'Montos calculados por MargenX']);
  const semanalHtml = html(await semanal(reporte()));
  assert.equal(html(r), semanalHtml, 'el PDF de la descarga y el del mail tienen que ser el mismo');

  // 10 Datos que no sirven: no se genera nada y se informa el motivo
  for (const malo of [{}, null, reporte({ catalogHealth: undefined }), reporte({ account: { businessName: '  ' } }), reporte({ generatedAt: 'ayer' })]) {
    r = await descarga(malo);
    assert.equal(r.json.valido, false);
    assert.equal(r.json.origen, 'descarga');
    assert.ok(r.json.motivo);
    assert.equal(r.binary, undefined);
  }
  for (const destinatario of ['', 'admin-sin-arroba', null]) {
    r = await semanal(reporte(), { destinatario });
    assert.equal(r.json.valido, false);
    assert.equal(r.json.slug, 'quimica-gyj');
    assert.match(r.json.motivo, /correo/);
  }

  // 11 Plantilla compartida con los otros mails, incluida la versión A4
  const plantilla = fs.readFileSync(path.join(dir, '../plantillas/mail-margenx.js'), 'utf8').trim();
  assert.ok(byName('Generar Reporte HTML').parameters.jsCode.includes(plantilla), 'plantilla desincronizada: correr node infra/n8n/plantillas/sincronizar.mjs');
  assert.ok(plantilla.includes('function mxDocumentoA4('));
  assert.ok(semanalHtml.includes('MARGEN<span'));
  execFileSync(process.execPath, [path.join(dir, '../plantillas/sincronizar.mjs'), '--check'], { stdio: 'pipe' });
  assert.ok(fs.readFileSync(path.join(dir, '../plantillas/sincronizar.mjs'), 'utf8').includes("'../workflows/reporte-semanal.json', 'Generar Reporte HTML'"));

  // 12 Separar Cuentas: una salida por cuenta; en staging, casilla de prueba y slug opcionales; en producción se ignoran
  const cuentas = { accounts: [
    { id: 'a1', slug: 'panaderia-central', businessName: 'Panadería Central', ownerEmail: 'admin.panaderia@seed.example.test' },
    { id: 'a2', slug: 'quimica-gyj', businessName: 'Química GyJ', ownerEmail: null },
  ] };
  const separar = (entornos) => ejecutar('Separar Cuentas', { item: { json: cuentas }, $: nodos(entornos) });
  let salida = await separar({ 'Entorno Producción': { entorno: 'prod', apiBase: 'http://backend-prod:3000', destinatarioPrueba: 'qa@seed.example.test', soloSlug: 'quimica-gyj' } });
  assert.deepEqual(salida.map((i) => i.json), [
    { entorno: 'prod', apiBase: 'http://backend-prod:3000', slug: 'panaderia-central', comercio: 'Panadería Central', destinatario: 'admin.panaderia@seed.example.test' },
    { entorno: 'prod', apiBase: 'http://backend-prod:3000', slug: 'quimica-gyj', comercio: 'Química GyJ', destinatario: '' },
  ]);
  salida = await separar({ 'Entorno Staging': { entorno: 'dev', apiBase: 'http://backend-dev:3000', destinatarioPrueba: ' qa@seed.example.test ', soloSlug: 'quimica-gyj' } });
  assert.deepEqual(salida.map((i) => i.json), [
    { entorno: 'dev', apiBase: 'http://backend-dev:3000', slug: 'quimica-gyj', comercio: 'Química GyJ', destinatario: 'qa@seed.example.test' },
  ]);
  salida = await separar({ 'Entorno Staging': { entorno: 'dev', apiBase: 'http://backend-dev:3000', destinatarioPrueba: '', soloSlug: '' } });
  assert.equal(salida.length, 2);
  assert.equal(salida[0].json.destinatario, 'admin.panaderia@seed.example.test');
  salida = await ejecutar('Separar Cuentas', { item: { json: { accounts: [] } }, $: nodos({ 'Entorno Producción': { entorno: 'prod', apiBase: 'x' } }) });
  assert.deepEqual(salida, []);

  // 13 Preparar Mail: el PDF de Gotenberg sale como margenx-reporte-AAAA-MM-DD.pdf, con los datos del mail
  const generado = await semanal(reporte());
  const adjunto = await ejecutar('Preparar Mail del Reporte', {
    item: { json: {}, binary: { pdf: { id: 'filesystem-v2:pdf-1', mimeType: 'application/octet-stream', fileName: 'a1b2c3.pdf', fileSize: '48 kB' } } },
    $: nodos({ 'Generar Reporte HTML': generado.json }),
  });
  assert.deepEqual(adjunto.binary.pdf, { id: 'filesystem-v2:pdf-1', mimeType: 'application/pdf', fileName: 'margenx-reporte-2026-11-23.pdf', fileExtension: 'pdf', fileSize: '48 kB' });
  assert.deepEqual(Object.keys(adjunto.json).sort(), ['destinatario', 'emailHtml', 'emailSubject', 'emailText', 'entorno', 'slug']);
  assert.equal(adjunto.json.destinatario, 'admin.quimica@seed.example.test');

  // 14 Aviso de falla a Discord: qué cuenta, en qué paso y con qué código; sin correos ni datos personales
  const aviso = (prevNode, json, mapa = { 'Separar Cuentas': cuenta() }) => ejecutar('Armar Aviso de Falla', { item: { json }, $: nodos(mapa), prevNode });
  let a = await aviso('Pedir Reporte Semanal', { error: { message: '500 - "Internal Server Error"', httpCode: '500' } });
  assert.match(a.json.content, /quimica-gyj/);
  assert.match(a.json.content, /producción/);
  assert.match(a.json.content, /backend no devolvió el reporte/);
  assert.match(a.json.content, /HTTP 500/);
  assert.match(a.json.content, /siguen/);
  assert.ok(!a.json.content.includes('@'));
  a = await aviso('Pedir Reporte Semanal', { error: 'Request failed with status code 404' }, { 'Separar Cuentas': cuenta({ entorno: 'dev' }) });
  assert.match(a.json.content, /HTTP 404/);
  assert.match(a.json.content, /staging/);
  a = await aviso('¿Descarga inválida?', { valido: false, origen: 'semanal', slug: 'quimica-gyj', entorno: 'prod', motivo: 'La cuenta no tiene un correo de Administrador válido: no se envió el reporte.' });
  assert.match(a.json.content, /correo de Administrador/);
  assert.ok(!a.json.content.includes('HTTP'));
  a = await aviso('¿Falló la descarga?', { error: { message: 'connect ECONNREFUSED gotenberg:3000' } });
  assert.match(a.json.content, /Gotenberg/);
  a = await aviso('Enviar Reporte (Brevo)', { error: { message: '535 Authentication failed' } });
  assert.match(a.json.content, /Brevo/);
  assert.ok(!a.json.content.includes('admin.quimica'));
  a = await aviso('Pedir Cuentas Activas', { error: { message: '401 - Unauthorized', httpCode: '401' } }, { 'Entorno Producción': { entorno: 'prod' } });
  assert.match(a.json.content, /ningún reporte/);
  assert.match(a.json.content, /lista de cuentas/);
  assert.match(a.json.content, /HTTP 401/);
  assert.match(a.json.content, /INTERNAL_WEBHOOK_SECRET/);

  // 15 Disparadores: lunes 08:00 en hora de Argentina para producción; el manual es de staging
  const cron = byName('Lunes 08:00');
  assert.equal(cron.type, 'n8n-nodes-base.scheduleTrigger');
  assert.deepEqual(cron.parameters.rule.interval, [{ field: 'cronExpression', expression: '0 8 * * 1' }]);
  assert.equal(wf.settings.timezone, 'America/Argentina/Buenos_Aires');
  assert.deepEqual(next('Lunes 08:00'), ['Entorno Producción']);
  assert.equal(byName('Prueba Manual (Staging)').type, 'n8n-nodes-base.manualTrigger');
  assert.deepEqual(next('Prueba Manual (Staging)'), ['Entorno Staging']);
  const valores = (nombre) => Object.fromEntries(byName(nombre).parameters.assignments.assignments.map((x) => [x.name, x.value]));
  const prod = valores('Entorno Producción');
  const dev = valores('Entorno Staging');
  assert.equal(prod.entorno, 'prod');
  assert.ok(prod.apiBase.includes('$env.MARGENX_INTERNAL_API_URL') && prod.apiBase.includes('http://backend-prod:3000'));
  assert.equal(prod.destinatarioPrueba, undefined);
  assert.equal(dev.entorno, 'dev');
  assert.ok(dev.apiBase.includes('$env.MARGENX_INTERNAL_DEV_API_URL') && dev.apiBase.includes('http://backend-dev:3000'));
  assert.deepEqual([dev.destinatarioPrueba, dev.soloSlug], ['', '']);

  // 16 Backend por la red interna (Nginx niega /api/internal/ desde afuera) y con el secreto; una cuenta que falla no frena a las demás
  const secreto = (nodo) => nodo.parameters.headerParameters.parameters.find((h) => h.name === 'x-margenx-webhook-secret')?.value;
  const cuentasHttp = byName('Pedir Cuentas Activas');
  const reporteHttp = byName('Pedir Reporte Semanal');
  assert.equal(cuentasHttp.parameters.url, '={{ $json.apiBase }}/api/internal/reports/accounts');
  assert.equal(reporteHttp.parameters.url, "={{ $json.apiBase }}/api/internal/reports/weekly/{{ encodeURIComponent($json.slug) }}");
  for (const nodo of [cuentasHttp, reporteHttp]) {
    assert.equal(secreto(nodo), '={{ $env.INTERNAL_WEBHOOK_SECRET }}');
    assert.equal(nodo.onError, 'continueErrorOutput');
  }
  assert.ok(!JSON.stringify(wf).includes('MARGENX_API_URL'), 'la URL pública no sirve para /api/internal/');
  assert.equal(reporteHttp.parameters.options.batching.batch.batchSize, 1);

  // 17 Gotenberg: un solo nodo para el mail y la descarga, de a un PDF por vez
  const gotenberg = byName('Convertir a PDF (Gotenberg)');
  assert.equal(gotenberg.parameters.method, 'POST');
  assert.ok(gotenberg.parameters.url.includes('$env.GOTENBERG_URL') && gotenberg.parameters.url.includes('http://gotenberg:3000'));
  assert.ok(gotenberg.parameters.url.endsWith('/forms/chromium/convert/html'));
  assert.equal(gotenberg.parameters.contentType, 'multipart-form-data');
  assert.deepEqual(gotenberg.parameters.bodyParameters.parameters, [
    { parameterType: 'formBinaryData', name: 'files', inputDataFieldName: 'html' },
    { parameterType: 'formData', name: 'preferCssPageSize', value: 'true' },
    { parameterType: 'formData', name: 'printBackground', value: 'true' },
  ]);
  assert.deepEqual(gotenberg.parameters.options.response.response, { responseFormat: 'file', outputPropertyName: 'pdf' });
  assert.equal(gotenberg.parameters.options.batching.batch.batchSize, 1);
  assert.equal(gotenberg.onError, 'continueErrorOutput');
  assert.equal(wf.nodes.filter((n) => JSON.stringify(n.parameters).includes('/forms/chromium')).length, 1);
  assert.equal(wf.nodes.filter((n) => n.type === 'n8n-nodes-base.code' && n.parameters.jsCode.includes('mxDocumentoA4(')).length, 1);

  // 18 Webhook report-pdf: mismo control de secreto que las alertas; 401 sin secreto, PDF binario si sale bien
  const webhook = byName('Webhook Reporte PDF');
  assert.deepEqual([webhook.parameters.httpMethod, webhook.parameters.path, webhook.parameters.responseMode], ['POST', 'report-pdf', 'responseNode']);
  const alertas = JSON.parse(fs.readFileSync(path.join(dir, '../workflows/alertas-margen.json'), 'utf8'));
  assert.deepEqual(byName('Validar Secreto Webhook').parameters, alertas.nodes.find((n) => n.name === 'Validar Secreto Webhook').parameters);
  const pdfRespuesta = byName('Responder PDF').parameters;
  assert.deepEqual([pdfRespuesta.respondWith, pdfRespuesta.responseDataSource, pdfRespuesta.inputFieldName, pdfRespuesta.options.responseCode], ['binary', 'set', 'pdf', 200]);
  assert.ok(pdfRespuesta.options.responseHeaders.entries.some((h) => h.name === 'Content-Type' && h.value === 'application/pdf'));
  assert.equal(byName('Responder 401 No Autorizado').parameters.options.responseCode, 401);
  assert.equal(byName('Responder 422 Datos Inválidos').parameters.options.responseCode, 422);
  assert.equal(byName('Responder 502 Sin PDF').parameters.options.responseCode, 502);
  const origen = "={{ $('Generar Reporte HTML').item.json.origen }}";
  assert.equal(byName('¿Descarga a pedido?').parameters.conditions.conditions[0].leftValue, origen);
  assert.equal(byName('¿Falló la descarga?').parameters.conditions.conditions[0].leftValue, origen);

  // 19 Mail: remitente verificado, HTML + texto, sin el pie de n8n y con el PDF adjunto
  const envio = byName('Enviar Reporte (Brevo)');
  assert.deepEqual(
    [envio.parameters.fromEmail, envio.parameters.toEmail, envio.parameters.subject, envio.parameters.emailFormat, envio.parameters.html, envio.parameters.text, envio.parameters.options.appendAttribution, envio.parameters.options.attachments],
    ['MargenX <alertas@margenx.tech>', '={{ $json.destinatario }}', '={{ $json.emailSubject }}', 'both', '={{ $json.emailHtml }}', '={{ $json.emailText }}', false, 'pdf'],
  );
  assert.equal(envio.credentials.smtp.name, 'Brevo MargenX SMTP Relay');
  assert.equal(envio.onError, 'continueErrorOutput');
  const discord = byName('Avisar a Discord');
  assert.equal(discord.parameters.url, '={{ $env.DISCORD_WEBHOOK_URL }}');
  assert.ok(discord.parameters.jsonBody.includes('allowed_mentions'));
  assert.equal(discord.onError, 'continueRegularOutput');

  // 20 Conexiones: cada falla termina en Discord (envío semanal) o en una respuesta al backend (descarga)
  assert.deepEqual(next('Entorno Producción'), ['Pedir Cuentas Activas']);
  assert.deepEqual(next('Entorno Staging'), ['Pedir Cuentas Activas']);
  assert.deepEqual(next('Pedir Cuentas Activas', 0), ['Separar Cuentas']);
  assert.deepEqual(next('Pedir Cuentas Activas', 1), ['Armar Aviso de Falla']);
  assert.deepEqual(next('Separar Cuentas'), ['Pedir Reporte Semanal']);
  assert.deepEqual(next('Pedir Reporte Semanal', 0), ['Generar Reporte HTML']);
  assert.deepEqual(next('Pedir Reporte Semanal', 1), ['Armar Aviso de Falla']);
  assert.deepEqual(next('Webhook Reporte PDF'), ['Validar Secreto Webhook']);
  assert.deepEqual(next('Validar Secreto Webhook', 0), ['Generar Reporte HTML']);
  assert.deepEqual(next('Validar Secreto Webhook', 1), ['Responder 401 No Autorizado']);
  assert.deepEqual(next('Generar Reporte HTML'), ['¿Reporte válido?']);
  assert.deepEqual(next('¿Reporte válido?', 0), ['Convertir a PDF (Gotenberg)']);
  assert.deepEqual(next('¿Reporte válido?', 1), ['¿Descarga inválida?']);
  assert.deepEqual(next('¿Descarga inválida?', 0), ['Responder 422 Datos Inválidos']);
  assert.deepEqual(next('¿Descarga inválida?', 1), ['Armar Aviso de Falla']);
  assert.deepEqual(next('Convertir a PDF (Gotenberg)', 0), ['¿Descarga a pedido?']);
  assert.deepEqual(next('Convertir a PDF (Gotenberg)', 1), ['¿Falló la descarga?']);
  assert.deepEqual(next('¿Descarga a pedido?', 0), ['Responder PDF']);
  assert.deepEqual(next('¿Descarga a pedido?', 1), ['Preparar Mail del Reporte']);
  assert.deepEqual(next('¿Falló la descarga?', 0), ['Responder 502 Sin PDF']);
  assert.deepEqual(next('¿Falló la descarga?', 1), ['Armar Aviso de Falla']);
  assert.deepEqual(next('Preparar Mail del Reporte'), ['Enviar Reporte (Brevo)']);
  assert.deepEqual(next('Enviar Reporte (Brevo)', 1), ['Armar Aviso de Falla']);
  assert.deepEqual(next('Armar Aviso de Falla'), ['Avisar a Discord']);

  // 21 ADR-003: n8n no habla con la base. Exporte sin datos de la instancia: inactivo y sin ids reales
  assert.ok(!wf.nodes.some((n) => /postgres|mysql|mongo|redis|supabase/i.test(n.type)));
  assert.equal(wf.active, false);
  assert.equal(wf.id, undefined);
  assert.equal(wf.meta, undefined);

  // 22 Gotenberg en el compose: solo red interna, con límite de memoria y Chromium sin arranque automático
  const compose = fs.readFileSync(path.join(dir, '../../vps/docker-compose.prod.yml'), 'utf8');
  const bloque = /\n {2}gotenberg:\n([\s\S]*?)(?=\n {2}[a-z][\w-]*:\n|\nnetworks:)/.exec(compose)?.[1];
  assert.ok(bloque, 'falta el servicio gotenberg en docker-compose.prod.yml');
  assert.match(bloque, /image: gotenberg\/gotenberg:8\.\d+\.\d+\n/, 'versión fija, la misma que se probó');
  assert.ok(!/\bports:/.test(bloque), 'Gotenberg no publica puertos');
  assert.match(bloque, /limits:\s*\n\s*memory: 512M/);
  assert.match(bloque, /reservations:\s*\n\s*memory: 128M/);
  for (const flag of ['--api-timeout=30s', '--chromium-auto-start=false', '--chromium-idle-shutdown-timeout=', '--chromium-disable-javascript=true', '--chromium-allow-list=^file:///tmp/']) assert.ok(bloque.includes(flag), `falta ${flag}`);
  assert.match(bloque, /- margenx_network/);
  for (const variable of ['GOTENBERG_URL', 'MARGENX_INTERNAL_API_URL', 'MARGENX_INTERNAL_DEV_API_URL']) {
    assert.match(compose, new RegExp(`- ${variable}=\\$\\{${variable}:-http://`), `n8n no recibe ${variable}`);
  }

  // 23 Ventas de la semana (#450): la sección viene solo si la cuenta tiene el módulo de ventas
  const ventas = {
    salesCount: 41, salesTotal: '100000.00', costTotal: '62000.00', profit: '38000.00', marginPercent: '38.00',
    topSold: [{ productId: 'p1', productName: 'Lavandina concentrada 5 L', quantity: 120, salesTotal: '148147.20', profit: '-18518.40', marginPercent: '-12.50' }],
    topProfit: [{ productId: 'p2', productName: 'Detergente neutro 1 L', quantity: 40, salesTotal: '86000.00', profit: '21500.00', marginPercent: '25.00' }],
  };
  r = await semanal(reporte({ sales: ventas }));
  pdf = html(r);
  enOrden(pdf, ['Para revisar', 'Salud del catálogo', 'Ventas de la semana', 'Cambios de costo de la semana']);
  for (const esperado of ['100.000,00', '62.000,00', '38.000,00', '38,00%', '41 ventas', 'Lavandina concentrada 5 L', '18.518,40', 'Detergente neutro 1 L', '21.500,00']) {
    assert.ok(pdf.includes(esperado), `falta ${esperado} en la sección de ventas`);
  }
  assert.ok(pdf.includes('Sin las ventas anuladas'), 'la sección aclara que no cuenta las anuladas');
  assert.match(pdf, /-\s?\$\s?18\.518,40/, 'una ganancia negativa lleva el signo menos');
  assert.ok(!pdf.includes('100000.00') && !pdf.includes('-18518.40'), 'nunca el número crudo del backend');
  assert.ok(r.json.emailText.includes('Ganancia real de la semana: $ 38.000,00') || /Ganancia real de la semana: \$\s?38\.000,00/.test(r.json.emailText), 'el mail resume la ganancia real');

  // Escenario "Reporte sin módulo": sin el campo sales, ni el PDF ni el mail hablan de ventas
  r = await semanal(reporte());
  assert.ok(!html(r).includes('Ventas de la semana'), 'sin el módulo no aparece la sección');
  assert.ok(!r.json.emailText.includes('Ganancia real'), 'sin el módulo el mail no habla de ventas');

  // Semana con el módulo pero sin ventas: lo dice, sin tablas vacías ni margen dividido por cero
  r = await semanal(reporte({ sales: { salesCount: 0, salesTotal: '0.00', costTotal: '0.00', profit: '0.00', marginPercent: null, topSold: [], topProfit: [] } }));
  pdf = html(r);
  assert.ok(pdf.includes('Ventas de la semana') && pdf.includes('No hubo ventas en el período.'));
  assert.ok(!/NaN|null|undefined/.test(pdf), 'sin NaN, null ni undefined en el PDF');

  console.log('reporte-nodos: todas las pruebas pasaron');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
