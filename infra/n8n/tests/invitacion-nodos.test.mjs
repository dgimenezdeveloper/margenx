// Prueba el workflow invitacion-colaborador.json sin necesitar n8n: el nodo Code que arma el mail,
// el remitente, las conexiones y las respuestas al backend.
// Uso: node infra/n8n/tests/invitacion-nodos.test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const wf = JSON.parse(fs.readFileSync(path.join(dir, '../workflows/invitacion-colaborador.json'), 'utf8'));
const byName = (name) => {
  const found = wf.nodes.find((n) => n.name === name);
  assert.ok(found, `falta el nodo "${name}"`);
  return found;
};
const node = byName('Generar Mail de Invitación');
const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
// El nodo Code de n8n corre aislado y no garantiza los globales URL ni URLSearchParams de Node:
// se ocultan para que la prueba falle si el código depende de ellos (pasó en la verificación en n8n).
const run = (body) =>
  new AsyncFn('$input', 'URL', 'URLSearchParams', node.parameters.jsCode)({ all: () => [{ json: { body } }] }, undefined, undefined);

const ENLACE = 'https://possible-alpaca-7097.clerk.accounts.dev/v1/tickets/accept?ticket=ticket_quimica';
const invitacion = (extra = {}) => ({
  email: 'cajera.quimica@seed.example.test',
  tradeName: 'Química GyJ',
  inviterEmail: 'admin.quimica@seed.example.test',
  invitationUrl: ENLACE,
  expiresInDays: 30,
  ...extra,
});
const hrefs = (html) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);

(async () => {
  // 1 Mail válido: destinatario, asunto, botón y enlace de respaldo con la URL exacta de Clerk
  let [r] = await run(invitacion());
  assert.equal(r.json.valid, true);
  assert.equal(r.json.email, 'cajera.quimica@seed.example.test');
  assert.equal(r.json.emailSubject, 'Química GyJ te invitó a MargenX');
  assert.deepEqual(hrefs(r.json.emailHtml), [ENLACE, ENLACE]);
  assert.ok(r.json.emailHtml.includes('Aceptar invitación'));
  assert.ok(r.json.emailHtml.includes('admin.quimica@seed.example.test'));
  assert.ok(r.json.emailHtml.includes('vence en 30 días'));
  assert.ok(r.json.emailText.includes(ENLACE));
  assert.ok(r.json.emailText.includes('Química GyJ') && r.json.emailText.includes('vence en 30 días'));
  assert.ok(r.json.emailHtml.includes('<html lang="es">'));

  // 1b Ticket con el formato real de Clerk (JWT con puntos, guiones y guiones bajos) y parámetros extra
  const jwt = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3OTIwMDAsImlzcyI6Imh0dHBzIn0.VMqBO_lpsixqF3bulk-fVI_7-1nEjg87gF8ZL3s2bwg';
  for (const invitationUrl of [
    `https://possible-alpaca-7097.clerk.accounts.dev/v1/tickets/accept?ticket=${jwt}`,
    `https://possible-alpaca-7097.clerk.accounts.dev/v1/tickets/accept?ticket=${jwt}&redirect_url=https%3A%2F%2Fdev.margenx.tech%2Flogin`,
    `https://possible-alpaca-7097.clerk.accounts.dev/v1/tickets/accept?redirect_url=x&ticket=${jwt}`,
  ]) {
    [r] = await run(invitacion({ invitationUrl }));
    assert.equal(r.json.valid, true, `debería aceptar ${invitationUrl}`);
    assert.ok(r.json.emailText.includes(invitationUrl));
  }

  // 1c Enlaces con caracteres que romperían el HTML del mail o el atributo href
  for (const invitationUrl of [
    `https://possible-alpaca-7097.clerk.accounts.dev/v1/tickets/accept?ticket=abc"onmouseover=alert(1)`,
    `https://possible-alpaca-7097.clerk.accounts.dev/v1/tickets/accept?ticket=abc def`,
    `https://possible-alpaca-7097.clerk.accounts.dev/v1/tickets/accept?ticket=`,
  ]) {
    [r] = await run(invitacion({ invitationUrl }));
    assert.equal(r.json.valid, false, `debería rechazar ${invitationUrl}`);
  }

  // 2 Dominio de producción de Clerk (clerk.margenx.tech) también se acepta
  [r] = await run(invitacion({ invitationUrl: 'https://clerk.margenx.tech/v1/tickets/accept?ticket=t_prod' }));
  assert.equal(r.json.valid, true);

  // 3 Enlaces que no son de Clerk o están mal formados: no se manda nada
  for (const invitationUrl of [
    'https://evil.example/v1/tickets/accept?ticket=t',
    'http://possible-alpaca-7097.clerk.accounts.dev/v1/tickets/accept?ticket=t',
    'https://possible-alpaca-7097.clerk.accounts.dev.evil.example/v1/tickets/accept?ticket=t',
    'https://margenx.tech.evil.example/v1/tickets/accept?ticket=t',
    'https://possible-alpaca-7097.clerk.accounts.dev/otra/ruta?ticket=t',
    'https://possible-alpaca-7097.clerk.accounts.dev/v1/tickets/accept',
    'javascript:alert(1)',
    'no es una url',
    '',
  ]) {
    [r] = await run(invitacion({ invitationUrl }));
    assert.equal(r.json.valid, false, `debería rechazar ${invitationUrl}`);
    assert.equal(r.json.emailHtml, undefined);
  }

  // 4 Destinatario o comercio inválidos
  [r] = await run(invitacion({ email: 'cajera-quimica' }));
  assert.equal(r.json.valid, false);
  [r] = await run(invitacion({ tradeName: '   ' }));
  assert.equal(r.json.valid, false);

  // 5 Sin quién invita (o inválido): el mail no lo menciona, pero se manda igual
  [r] = await run(invitacion({ inviterEmail: 'no-es-un-mail' }));
  assert.equal(r.json.valid, true);
  assert.ok(!r.json.emailHtml.includes('no-es-un-mail') && !r.json.emailText.includes('no-es-un-mail'));

  // 6 Escapes y asunto sin saltos de línea (evita inyectar encabezados)
  [r] = await run(invitacion({ tradeName: 'Química <GyJ>\r\nBcc: x@evil.example' }));
  assert.equal(r.json.valid, true);
  assert.ok(!/[\r\n]/.test(r.json.emailSubject));
  assert.ok(!r.json.emailHtml.includes('<GyJ>') && r.json.emailHtml.includes('Química &lt;GyJ&gt;'));
  assert.ok(r.json.emailText.includes('Química <GyJ>') && !r.json.emailText.includes('&lt;'));

  // 7 Vencimiento por defecto si no llega
  [r] = await run(invitacion({ expiresInDays: undefined }));
  assert.ok(r.json.emailText.includes('vence en 30 días'));

  // 8 Plantilla compartida con alertas e ingesta
  const plantilla = fs.readFileSync(path.join(dir, '../plantillas/mail-margenx.js'), 'utf8').trim();
  assert.ok(node.parameters.jsCode.includes(plantilla), 'plantilla desincronizada: correr node infra/n8n/plantillas/sincronizar.mjs');
  [r] = await run(invitacion());
  assert.ok(r.json.emailHtml.includes('MARGEN<span') && r.json.emailHtml.includes('#4f46e5'));

  // 9 Remitente: casilla verificada de MargenX, HTML + texto, sin el pie de n8n
  const envio = byName('Enviar Invitación (Brevo)');
  assert.deepEqual(
    [envio.parameters.fromEmail, envio.parameters.toEmail, envio.parameters.emailFormat, envio.parameters.html, envio.parameters.text, envio.parameters.options.appendAttribution],
    ['MargenX <alertas@margenx.tech>', '={{ $json.email }}', 'both', '={{ $json.emailHtml }}', '={{ $json.emailText }}', false],
  );
  assert.equal(envio.credentials.smtp.name, 'Brevo MargenX SMTP Relay');

  // 10 Webhook y secreto: mismo control que las alertas de margen
  const webhook = byName('Webhook Invitación Colaborador');
  assert.deepEqual([webhook.parameters.httpMethod, webhook.parameters.path, webhook.parameters.responseMode], ['POST', 'collaborator-invitation', 'responseNode']);
  const alertas = JSON.parse(fs.readFileSync(path.join(dir, '../workflows/alertas-margen.json'), 'utf8'));
  const secretoAlertas = alertas.nodes.find((n) => n.name === 'Validar Secreto Webhook').parameters;
  assert.deepEqual(byName('Validar Secreto Webhook').parameters, secretoAlertas);

  // 11 Conexiones: 200 solo después de que Brevo envió; 422 si los datos no sirven; 401 sin secreto
  const next = (from, output = 0) => (wf.connections[from]?.main?.[output] ?? []).map((c) => c.node);
  assert.deepEqual(next('Webhook Invitación Colaborador'), ['Validar Secreto Webhook']);
  assert.deepEqual(next('Validar Secreto Webhook', 0), ['Generar Mail de Invitación']);
  assert.deepEqual(next('Validar Secreto Webhook', 1), ['Responder 401 No Autorizado']);
  assert.deepEqual(next('Generar Mail de Invitación'), ['¿Invitación válida?']);
  assert.deepEqual(next('¿Invitación válida?', 0), ['Enviar Invitación (Brevo)']);
  assert.deepEqual(next('¿Invitación válida?', 1), ['Responder 422 Datos Inválidos']);
  assert.deepEqual(next('Enviar Invitación (Brevo)'), ['Responder 200 Enviado']);
  assert.equal(byName('Responder 200 Enviado').parameters.options.responseCode, 200);
  assert.equal(byName('Responder 422 Datos Inválidos').parameters.options.responseCode, 422);
  assert.equal(byName('Responder 401 No Autorizado').parameters.options.responseCode, 401);
  // Si Brevo falla, la ejecución falla y n8n responde 5xx: el backend lo informa como emailSent: false
  assert.notEqual(envio.continueOnFail, true);
  assert.notEqual(envio.onError, 'continueRegularOutput');

  // 12 Exporte sin datos de la instancia: inactivo y sin ids reales de credenciales
  assert.equal(wf.active, false);
  assert.equal(wf.id, undefined);

  // Soporte: el mismo correo que la app en el pie del mail (RC-06, #435)
  {
    const codigo = wf.nodes.map((n) => n.parameters?.jsCode ?? '').join('\n');
    assert.ok(codigo.includes('Soporte: soporte@margenx.tech'), 'el pie del mail usa soporte@margenx.tech');
    assert.ok(!codigo.includes('contacto@margenx.tech'), 'no queda contacto@margenx.tech');
  }
  console.log('invitacion-nodos: todas las pruebas pasaron');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
