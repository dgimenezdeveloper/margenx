// Pruebas del filtro de `npm audit` del CI (issue #260).
// Ejecutar con: node --test .github/scripts/audit-check.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateAudit, validateAllowlist } from './audit-check.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'audit-check.mjs');

// Misma forma que `npm audit --omit=dev --json` del backend al 28/10/2026:
// deepmerge-ts es el origen; @prisma/config y prisma lo heredan.
const advisory = (name, severity, ghsa, title = 'Advisory de prueba') => ({
  source: 1145093,
  name,
  dependency: name,
  title,
  url: `https://github.com/advisories/${ghsa}`,
  severity,
  range: '<7.1.2',
});

const reportWith = (...entries) => {
  const vulnerabilities = {};
  for (const e of entries) vulnerabilities[e.name] = e;
  return { auditReportVersion: 2, vulnerabilities, metadata: {} };
};

const prismaChain = [
  { name: 'deepmerge-ts', severity: 'high', via: [advisory('deepmerge-ts', 'high', 'GHSA-ggr8-5vv4-36mx')] },
  { name: '@prisma/config', severity: 'high', via: ['deepmerge-ts'] },
  { name: 'prisma', severity: 'high', via: ['@prisma/config'] },
];

const prismaAllowlist = [
  {
    id: 'GHSA-ggr8-5vv4-36mx',
    package: 'deepmerge-ts',
    directory: 'backend',
    reason: 'Llega por prisma; el arreglo exige Prisma 7 (cambio mayor).',
    exitCondition: 'Migración a Prisma 7.',
  },
];

test('la vulnerabilidad aceptada de deepmerge-ts no bloquea', () => {
  const r = evaluateAudit(reportWith(...prismaChain), prismaAllowlist, 'backend');
  assert.equal(r.blocking.length, 0);
  assert.deepEqual(r.accepted.map((a) => a.id), ['GHSA-ggr8-5vv4-36mx']);
});

test('sin lista de excepciones, la misma vulnerabilidad alta bloquea', () => {
  const r = evaluateAudit(reportWith(...prismaChain), [], 'backend');
  assert.deepEqual(r.blocking.map((a) => a.id), ['GHSA-ggr8-5vv4-36mx']);
});

test('una alta nueva bloquea aunque la de prisma esté aceptada', () => {
  const report = reportWith(...prismaChain, {
    name: 'express',
    severity: 'high',
    via: [advisory('express', 'high', 'GHSA-aaaa-bbbb-cccc')],
  });
  const r = evaluateAudit(report, prismaAllowlist, 'backend');
  assert.deepEqual(r.blocking.map((a) => a.id), ['GHSA-aaaa-bbbb-cccc']);
  assert.equal(r.accepted.length, 1);
});

test('una crítica bloquea', () => {
  const report = reportWith({
    name: 'proxy-addr',
    severity: 'critical',
    via: [advisory('proxy-addr', 'critical', 'GHSA-cccc-dddd-eeee')],
  });
  assert.equal(evaluateAudit(report, [], 'backend').blocking.length, 1);
});

test('una moderada no bloquea (umbral alto)', () => {
  const report = reportWith({
    name: 'qs',
    severity: 'moderate',
    via: [advisory('qs', 'moderate', 'GHSA-ffff-gggg-hhhh')],
  });
  assert.equal(evaluateAudit(report, [], 'backend').blocking.length, 0);
});

test('la excepción exige el mismo paquete además del GHSA', () => {
  const report = reportWith({
    name: 'otro-paquete',
    severity: 'high',
    via: [advisory('otro-paquete', 'high', 'GHSA-ggr8-5vv4-36mx')],
  });
  assert.equal(evaluateAudit(report, prismaAllowlist, 'backend').blocking.length, 1);
});

test('el mismo advisory repetido en la cadena se informa una sola vez', () => {
  const report = reportWith(...prismaChain, {
    name: 'otro-que-lo-trae',
    severity: 'high',
    via: [advisory('deepmerge-ts', 'high', 'GHSA-ggr8-5vv4-36mx')],
  });
  assert.equal(evaluateAudit(report, [], 'backend').blocking.length, 1);
});

test('una excepción que ya no aparece en el reporte se marca como vencida', () => {
  const r = evaluateAudit(reportWith(), prismaAllowlist, 'backend');
  assert.equal(r.blocking.length, 0);
  assert.deepEqual(r.stale.map((e) => e.id), ['GHSA-ggr8-5vv4-36mx']);
});

test('una excepción de otro paquete del repo no aplica ni se marca como vencida', () => {
  const enFrontend = evaluateAudit(reportWith(), prismaAllowlist, 'frontend');
  assert.equal(enFrontend.stale.length, 0);
  const report = reportWith(...prismaChain);
  assert.equal(evaluateAudit(report, prismaAllowlist, 'frontend').blocking.length, 1);
});

test('si npm audit no pudo consultar el registro, falla en vez de pasar en blanco', () => {
  const report = { error: { code: 'ENOTFOUND', summary: 'request to registry failed' } };
  assert.throws(() => evaluateAudit(report, [], 'backend'), /npm audit no pudo.*registry failed/);
  // Forma real de npm 10 sin red: el detalle viene en `message` y `error` llega vacío.
  const sinRed = { message: 'request to http://127.0.0.1:9 failed, reason: ECONNREFUSED', error: { summary: '', detail: '' } };
  assert.throws(() => evaluateAudit(sinRed, [], 'backend'), /ECONNREFUSED/);
});

test('un reporte sin la sección de vulnerabilidades es inválido', () => {
  assert.throws(() => evaluateAudit({}, [], 'backend'), /reporte de npm audit es inválido/);
});

test('cada excepción debe tener id, paquete, motivo y condición de salida', () => {
  assert.throws(
    () => validateAllowlist([{ id: 'GHSA-ggr8-5vv4-36mx', package: 'deepmerge-ts', directory: 'backend' }]),
    /reason/,
  );
  assert.throws(
    () => validateAllowlist([{ ...prismaAllowlist[0], directory: undefined }]),
    /directory/,
  );
  assert.throws(() => validateAllowlist({}), /lista/);
  assert.doesNotThrow(() => validateAllowlist(prismaAllowlist));
});

test('la lista de excepciones del repositorio es válida', async () => {
  const { readFileSync } = await import('node:fs');
  const path = join(dirname(SCRIPT), '..', 'audit-allowlist.json');
  assert.doesNotThrow(() => validateAllowlist(JSON.parse(readFileSync(path, 'utf8'))));
});

test('CLI: sale con 1 si hay vulnerabilidades bloqueantes y con 0 si no', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-check-'));
  const reportPath = join(dir, 'report.json');
  const allowEmpty = join(dir, 'allow-empty.json');
  const allowPrisma = join(dir, 'allow-prisma.json');
  writeFileSync(reportPath, JSON.stringify(reportWith(...prismaChain)));
  writeFileSync(allowEmpty, '[]');
  writeFileSync(allowPrisma, JSON.stringify(prismaAllowlist));

  assert.throws(
    () => execFileSync(process.execPath, [SCRIPT, reportPath, allowEmpty, 'backend'], { stdio: 'pipe' }),
    (err) => err.status === 1 && /GHSA-ggr8-5vv4-36mx/.test(err.stdout.toString()),
  );
  const out = execFileSync(process.execPath, [SCRIPT, reportPath, allowPrisma, 'backend'], { stdio: 'pipe' });
  assert.match(out.toString(), /aceptada/);
});
