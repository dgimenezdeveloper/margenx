#!/usr/bin/env node
// Filtro de `npm audit` para el CI (issue #260).
//
// Falla si el reporte trae algún advisory de severidad alta o crítica que no
// esté en la lista de excepciones aceptadas (.github/audit-allowlist.json).
// Cada excepción lleva motivo y condición de salida; cuando el advisory deja
// de aparecer, se avisa para quitarla de la lista.
//
// Uso: node audit-check.mjs <reporte-npm-audit.json> <audit-allowlist.json> <directorio>
// <directorio> es el paquete auditado (backend o frontend).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SEVERITY_ORDER = ['info', 'low', 'moderate', 'high', 'critical'];
const BLOCKING_LEVEL = SEVERITY_ORDER.indexOf('high');
const REQUIRED_FIELDS = ['id', 'package', 'directory', 'reason', 'exitCondition'];

const ghsaFromUrl = (url) => (typeof url === 'string' ? url.split('/').pop() : '');

export function validateAllowlist(allowlist) {
  if (!Array.isArray(allowlist)) {
    throw new Error('La lista de excepciones debe ser un arreglo JSON.');
  }
  allowlist.forEach((entry, i) => {
    for (const field of REQUIRED_FIELDS) {
      if (typeof entry?.[field] !== 'string' || entry[field].trim() === '') {
        throw new Error(`Excepción ${i}: falta el campo "${field}".`);
      }
    }
  });
}

export function evaluateAudit(report, allowlist, directory) {
  if (report?.error) {
    const detail = report.message || report.error.summary || report.error.code || 'error desconocido';
    throw new Error(`npm audit no pudo completar la consulta: ${detail}`);
  }
  if (!report || typeof report.vulnerabilities !== 'object' || report.vulnerabilities === null) {
    throw new Error('El reporte de npm audit es inválido: falta "vulnerabilities".');
  }
  validateAllowlist(allowlist);
  // Cada excepción vale solo para el paquete del repo donde se aceptó.
  const scoped = allowlist.filter((e) => e.directory === directory);

  // Solo los objetos de `via` son advisories; los strings apuntan a otro
  // paquete del mismo reporte que ya trae su propio advisory.
  const advisories = new Map();
  for (const vuln of Object.values(report.vulnerabilities)) {
    for (const via of vuln.via ?? []) {
      if (typeof via !== 'object' || via === null) continue;
      if (SEVERITY_ORDER.indexOf(via.severity) < BLOCKING_LEVEL) continue;
      const id = ghsaFromUrl(via.url);
      const key = `${id}|${via.name}`;
      if (!advisories.has(key)) {
        advisories.set(key, { id, package: via.name, severity: via.severity, title: via.title });
      }
    }
  }

  const isAccepted = (a) => scoped.some((e) => e.id === a.id && e.package === a.package);
  const found = [...advisories.values()];
  return {
    blocking: found.filter((a) => !isAccepted(a)),
    accepted: found.filter(isAccepted),
    stale: scoped.filter((e) => !found.some((a) => a.id === e.id && a.package === e.package)),
  };
}

function main([reportPath, allowlistPath, directory]) {
  if (!reportPath || !allowlistPath || !directory) {
    console.error('Uso: node audit-check.mjs <reporte-npm-audit.json> <audit-allowlist.json> <directorio>');
    return 2;
  }
  let result;
  try {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const allowlist = JSON.parse(readFileSync(allowlistPath, 'utf8'));
    result = evaluateAudit(report, allowlist, directory);
  } catch (err) {
    console.error(`::error::${err.message}`);
    return 1;
  }

  for (const a of result.accepted) {
    console.log(`Excepción aceptada: ${a.id} (${a.package}, ${a.severity}) — ver .github/audit-allowlist.json`);
  }
  for (const e of result.stale) {
    console.log(`::warning::La excepción ${e.id} (${e.package}) ya no aparece en el reporte: quitarla de .github/audit-allowlist.json.`);
  }
  if (result.blocking.length > 0) {
    for (const a of result.blocking) {
      console.log(`::error::${a.id} en ${a.package} (${a.severity}): ${a.title}`);
    }
    console.log(`${result.blocking.length} vulnerabilidad(es) alta(s) o crítica(s) sin excepción aceptada.`);
    return 1;
  }
  console.log('Sin vulnerabilidades altas ni críticas fuera de la lista de excepciones.');
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
