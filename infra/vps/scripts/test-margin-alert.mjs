#!/usr/bin/env node

/**
 * Script de Verificación E2E para Issue #172 (Sprint 4)
 * Dispara el Webhook de Alerta de Margen en n8n autenticando mediante secret header.
 */

const targetUrl = process.argv[2] || process.env.N8N_ALERT_WEBHOOK_URL || 'https://n8n.margenx.tech/webhook/margin-alert';
const recipientEmail = process.argv[3] || process.env.ALERT_TARGET_EMAIL || 'margenx.saas@gmail.com';
const webhookSecret = process.argv[4] || process.env.INTERNAL_WEBHOOK_SECRET || 'dev_secret_margenx_2026';

const testPayload = {
  accountId: '30a00000-0000-4000-8000-000000000001',
  accountSlug: 'panaderia-central',
  tradeName: 'Panadería Central',
  ownerEmail: recipientEmail,
  ingredient: {
    id: 'ing-harina-000',
    name: 'Harina 000',
  },
  affectedProductsCount: 2,
  criticalProducts: [
    {
      productId: 'prod-pan-flauta-001',
      productName: 'Pan flauta',
      previousCost: '450.00',
      newCost: '620.00',
      currentMarginPercent: '31.73',
      minMarginPercent: '55.00',
    },
    {
      productId: 'prod-medialuna-manteca',
      productName: 'Medialuna de Manteca',
      previousCost: '320.00',
      newCost: '480.00',
      currentMarginPercent: '44.80',
      minMarginPercent: '60.00',
    },
  ],
  triggeredAt: new Date().toISOString(),
};

console.log('\n======================================================');
console.log(' MARGENX — PRUEBA DE DISPARO DE ALERTA SMTP (ISSUE #172)');
console.log('======================================================');
console.log(`📡 URL Destino n8n: ${targetUrl}`);
console.log(`📧 Destinatario:    ${recipientEmail}`);
console.log(`🔑 Header Secret:   ${webhookSecret ? 'Configurado (***)' : 'Ausente'}`);
console.log(`🍞 Insumo:          ${testPayload.ingredient.name}`);
console.log(`⚠️  Producto:        ${testPayload.criticalProducts[0].productName} (${testPayload.criticalProducts[0].currentMarginPercent}% vs min ${testPayload.criticalProducts[0].minMarginPercent}%)`);
console.log('------------------------------------------------------\n');

async function run() {
  const startTime = Date.now();
  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MargenX-Backend-Dispatcher/1.0',
        'x-margenx-webhook-secret': webhookSecret,
      },
      body: JSON.stringify(testPayload),
    });

    const elapsed = Date.now() - startTime;
    const status = response.status;
    const rawText = await response.text();

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(rawText);
    } catch {
      jsonResponse = rawText;
    }

    if (response.ok) {
      console.log(`✅ [HTTP ${status}] Webhook autenticado respondió en ${elapsed}ms:`);
      console.dir(jsonResponse, { depth: null, colors: true });
      console.log('\n🎉 Alerta encolada exitosamente. Revisa la bandeja de entrada de ' + recipientEmail);
      console.log('   (Remitente: alertas@margenx.tech | Asunto: [MargenX ALERTA])\n');
      process.exit(0);
    } else {
      console.error(`❌ [HTTP ${status}] Error al despachar el webhook (${elapsed}ms):`);
      console.error(rawText);
      process.exit(1);
    }
  } catch (error) {
    console.error(`💥 Excepción durante la conexión:`, error.message);
    process.exit(1);
  }
}

run();