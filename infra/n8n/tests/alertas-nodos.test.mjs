// Prueba el nodo Code del workflow alertas-margen.json sin necesitar n8n.
// Uso: node infra/n8n/tests/alertas-nodos.test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const wf = JSON.parse(fs.readFileSync(path.join(dir, '../workflows/alertas-margen.json'), 'utf8'));
const node = wf.nodes.find((n) => n.name === 'Generar Plantilla Dinámica');
const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
const run = (body) => new AsyncFn('$input', node.parameters.jsCode)({ all: () => [{ json: { body } }] });

const alerta = (criticalProducts, extra = {}) => ({
  tradeName: 'Panadería Central',
  ownerEmail: 'dueno@panaderiacentral.com.ar',
  ingredient: { name: 'Harina 000' },
  criticalProducts,
  ...extra,
});
const sinId = { productName: 'Pan francés', currentMarginPercent: '18.00', minMarginPercent: '30.00', newCost: '820.00' };
const conId = { ...sinId, productId: '3f2c1a9e-7b4d-4c1e-9a2b-5d6e7f8a9b0c' };
const hrefs = (html) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);

(async () => {
  // 1 Sin ID de producto: "Ajustar" y botón principal van a <appBase>/productos (producción por defecto)
  let [r] = await run(alerta([sinId]));
  assert.deepEqual(hrefs(r.json.emailHtml), ['https://margenx.tech/productos', 'https://margenx.tech/productos']);
  assert.ok(!r.json.emailHtml.includes('${appBase}'));
  assert.ok(!r.json.emailText.includes('${appBase}'));
  assert.ok(r.json.emailText.includes('Enlace de ajuste: https://margenx.tech/productos\n'));

  // 2 Sin ID con appBaseUrl de staging
  [r] = await run(alerta([{ ...sinId, id: '' }], { appBaseUrl: 'https://dev.margenx.tech' }));
  assert.deepEqual(hrefs(r.json.emailHtml), ['https://dev.margenx.tech/productos', 'https://dev.margenx.tech/productos']);
  assert.ok(!r.json.emailText.includes('${appBase}'));

  // 3 Con productId: el enlace sigue apuntando al producto
  [r] = await run(alerta([conId], { appBaseUrl: 'https://dev.margenx.tech' }));
  assert.deepEqual(hrefs(r.json.emailHtml), [
    `https://dev.margenx.tech/productos/${conId.productId}`,
    `https://dev.margenx.tech/productos/${conId.productId}`,
  ]);

  // 4 Mezcla: el primero sin ID (botón principal al listado), el segundo con `id`
  [r] = await run(alerta([sinId, { ...sinId, productName: 'Medialunas', id: 'abc-123' }]));
  assert.deepEqual(hrefs(r.json.emailHtml), [
    'https://margenx.tech/productos',
    'https://margenx.tech/productos/abc-123',
    'https://margenx.tech/productos',
  ]);

  // 5 ID con caracteres no permitidos que quedan vacíos tras sanear: también va al listado
  [r] = await run(alerta([{ ...sinId, productId: '../"><' }]));
  assert.deepEqual(hrefs(r.json.emailHtml), ['https://margenx.tech/productos', 'https://margenx.tech/productos']);

  // 6 appBaseUrl fuera de la lista permitida: se usa producción
  [r] = await run(alerta([sinId], { appBaseUrl: 'https://evil.example' }));
  assert.ok(hrefs(r.json.emailHtml).every((h) => h === 'https://margenx.tech/productos'));

  console.log('alertas-nodos: OK');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
