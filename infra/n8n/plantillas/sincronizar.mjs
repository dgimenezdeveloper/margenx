// Copia la plantilla compartida de mails (mail-margenx.js) a los nodos Code que la usan.
// Uso: node infra/n8n/plantillas/sincronizar.mjs           (actualiza los workflows)
//      node infra/n8n/plantillas/sincronizar.mjs --check   (solo verifica; sale con 1 si hay diferencias)
// Reemplaza solo el texto entre los marcadores <plantilla-mail-margenx>, sin reformatear el JSON del workflow.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const DESTINOS = [
  ['../workflows/ingesta-listas.json', 'Generar Resumen al Dueño'],
  ['../workflows/alertas-margen.json', 'Generar Plantilla Dinámica'],
];
const BLOQUE = /\/\/ <plantilla-mail-margenx>[\s\S]*?\/\/ <\/plantilla-mail-margenx>/;

const plantilla = fs.readFileSync(path.join(dir, 'mail-margenx.js'), 'utf8').trim();
const soloVerificar = process.argv.includes('--check');
let desincronizados = 0;

for (const [archivo, nodo] of DESTINOS) {
  const ruta = path.join(dir, archivo);
  const texto = fs.readFileSync(ruta, 'utf8');
  const wf = JSON.parse(texto);
  const n = wf.nodes.find((x) => x.name === nodo);
  if (!n || !BLOQUE.test(n.parameters.jsCode)) {
    console.error(`${archivo}: el nodo "${nodo}" no tiene los marcadores de la plantilla`);
    process.exit(1);
  }
  const viejo = n.parameters.jsCode;
  const nuevo = viejo.replace(BLOQUE, () => plantilla);
  if (nuevo === viejo) continue;
  desincronizados++;
  if (soloVerificar) {
    console.error(`${archivo}: "${nodo}" no coincide con la plantilla`);
    continue;
  }
  const codificado = JSON.stringify(viejo);
  if (!texto.includes(codificado)) {
    console.error(`${archivo}: no se encontró el código del nodo "${nodo}" tal como lo codifica JSON`);
    process.exit(1);
  }
  fs.writeFileSync(ruta, texto.replace(codificado, () => JSON.stringify(nuevo)));
  console.log(`${archivo}: "${nodo}" actualizado`);
}
if (soloVerificar && desincronizados > 0) process.exit(1);
if (desincronizados === 0) console.log('Plantilla sincronizada en todos los workflows.');
