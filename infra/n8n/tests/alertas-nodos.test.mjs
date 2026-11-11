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

  // 7 Remitente (#254): emailSend 2.1 ignora `senderName`; el nombre va dentro de fromEmail, con HTML + texto plano y sin el pie de n8n
  const envio = wf.nodes.find((n) => n.name === 'Despachar Alerta SMTP (Brevo)').parameters;
  assert.deepEqual(
    [envio.fromEmail, envio.emailFormat, envio.html, envio.text, envio.options.appendAttribution, envio.options.senderName],
    ['MargenX <alertas@margenx.tech>', 'both', '={{ $json.emailHtml }}', '={{ $json.emailText }}', false, undefined],
  );

  // 8 Plantilla compartida con el resumen de ingesta (#254)
  const plantilla = fs.readFileSync(path.join(dir, '../plantillas/mail-margenx.js'), 'utf8').trim();
  assert.ok(node.parameters.jsCode.includes(plantilla), 'plantilla desincronizada: correr node infra/n8n/plantillas/sincronizar.mjs');
  [r] = await run(alerta([conId]));
  assert.ok(r.json.emailHtml.includes('MARGEN<span') && r.json.emailHtml.includes('#4f46e5'));

  // 9 Escapes: el HTML escapa comercio, insumo y destinatario; el texto plano no lleva entidades HTML
  [r] = await run(alerta([{ ...conId, productName: 'Pan <b>' }], { tradeName: 'Panadería <Central>', ingredient: { name: 'Harina "000"' } }));
  assert.ok(!r.json.emailHtml.includes('<Central>') && r.json.emailHtml.includes('Panadería &lt;Central&gt;'));
  assert.ok(!r.json.emailHtml.includes('Pan <b>') && r.json.emailHtml.includes('Harina &quot;000&quot;'));
  assert.ok(r.json.emailText.includes('Panadería <Central>') && r.json.emailText.includes('Harina "000"') && r.json.emailText.includes('Pan <b>'));
  assert.ok(!r.json.emailText.includes('&lt;') && !r.json.emailText.includes('&quot;'));
  assert.ok(!r.json.emailSubject.includes('&lt;'));
  [r] = await run(alerta([conId], { ownerEmail: 'a<b>@x.com' }));
  assert.ok(!r.json.emailHtml.includes('a<b>@x.com'));

  // 10 Singular y plural en el aviso
  [r] = await run(alerta([conId]));
  assert.ok(r.json.emailText.includes('1 producto quedó debajo de su margen mínimo'));
  [r] = await run(alerta([conId, { ...conId, productName: 'Medialunas' }]));
  assert.ok(r.json.emailText.includes('2 productos quedaron debajo de su margen mínimo'));
  assert.equal(r.json.emailSubject, '[MargenX ALERTA] Productos con margen bajo detectados - Panadería Central');
  [r] = await run(alerta([conId]));
  assert.equal(r.json.emailSubject, '[MargenX ALERTA] Producto con margen bajo detectado - Panadería Central');

  console.log('alertas-nodos: OK');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
