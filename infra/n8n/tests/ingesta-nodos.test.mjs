// Prueba los nodos Code del workflow ingesta-listas.json sin necesitar n8n.
// Uso: node infra/n8n/tests/ingesta-nodos.test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const wf = JSON.parse(fs.readFileSync(path.join(dir, '../workflows/ingesta-listas.json'), 'utf8'));
const CODE = {
  'extraer.js': 'Extraer Slug y Adjunto',
  'csv.js': 'Parsear CSV',
  'normalizar.js': 'Normalizar Columnas',
  'resumen.js': 'Generar Resumen al Dueño',
  'error.js': 'Armar Correo de Error',
};
const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
const run = (file, ctx) => {
  const node = wf.nodes.find((n) => n.name === CODE[file]);
  return new AsyncFn('$input', '$', '$env', node.parameters.jsCode).call(ctx.self || {}, { all: () => ctx.items }, (n) => ({ first: () => ({ json: ctx.nodes[n] }), all: () => [] }), ctx.env || {});
};
(async () => {
 // 1 Extraer
 const mail=(to,files,extra={})=>({json:{from:{value:[{address:'Prov@dist.com'}]},to:{text:to},subject:'Lista',...extra},binary:Object.fromEntries(files.map((f,i)=>['attachment_'+i,{fileName:f}]))});
 let r=await run('extraer.js',{items:[mail('precios+panaderia-central@margenx.tech',['Lista Octubre.xlsx'])],env:{IMAP_USER:'margenx.saas@gmail.com'}});
 assert.equal(r[0].json.slug,'panaderia-central');assert.equal(r[0].json.ext,'xlsx');assert.equal(r[0].json.error,'');
 r=await run('extraer.js',{items:[mail('hola@margenx.tech',['a.xlsx']),mail('precios+x1@margenx.tech',['foto.png']),mail('precios+x1@margenx.tech',['a.csv'],{from:{value:[{address:'margenx.saas@gmail.com'}]}})],env:{IMAP_USER:'margenx.saas@gmail.com'}});
 assert.equal(r.length,2);assert.ok(r[0].json.error.includes('identificador'));assert.ok(r[1].json.error.includes('adjunto'));
 // 2 CSV
 for(const [delim,txt] of [[',','Código,Descripción,Precio\n001,"Harina, 000","1.234,56"\n'],[';','Cod;Detalle;Precio Final\n001;Harina 000;"1.234,56"\r\n002;Azúcar;$ 980,5\r\n']]){
   const buf=Buffer.from(txt);
   const out=await run('csv.js',{items:[{json:{binaryKey:'attachment_0'}}],self:{helpers:{getBinaryDataBuffer:async()=>buf}}});
   assert.equal(out.length>=1,true);
 }
 // 3 Normalizar
 const meta={slug:'panaderia-central',from:'p@d.com',fileName:'x.xlsx'};
 const rows=[{Cód:'A1','Detalle':'Harina','Precio Final':'$ 1.234,56'},{Cód:456,Detalle:'Azúcar','Precio Final':980.5},{Cód:'',Detalle:'x','Precio Final':10},{Cód:'B',Detalle:'y','Precio Final':'abc'},{Cód:'C',Detalle:'Sal','Precio Final':'1.500'},{Cód:'D',Detalle:'Aceite','Precio Final':'1,234.50'}];
 r=await run('normalizar.js',{items:rows.map(j=>({json:j})),nodes:{'Extraer Slug y Adjunto':meta}});
 
 const it=r[0].json.items;assert.deepEqual(it.map(i=>i.price),[1234.56,980.5,1500,1234.5]);assert.equal(it[1].code,'456');assert.equal(r[0].json.rowsInvalid,2);
 r=await run('normalizar.js',{items:[{json:{A:1,B:2}}],nodes:{'Extraer Slug y Adjunto':meta}});assert.equal(r[0].json.ok,false);
 // lotes
 const big=Array.from({length:12000},(_,i)=>({json:{Codigo:'c'+i,Precio:i+1}}));
 r=await run('normalizar.js',{items:big,nodes:{'Extraer Slug y Adjunto':meta}});assert.deepEqual(r.map(x=>x.json.items.length),[5000,5000,2000]);
 // 4 Resumen
 const resp={received:1000,updated:2,discarded:998,account:{tradeName:'Panadería <Central>',ownerEmail:'dueno@x.com'},criticalProductsAlerts:[{productName:'Pan <b>',currentMarginPercent:'18.00',minMarginPercent:'30.00',newCost:'820.00'}]};
 r=await run('resumen.js',{items:[{json:resp}],nodes:{'Normalizar Columnas':{fileName:'x.xlsx',rowsInvalid:0}}});
 assert.ok(r[0].json.text.includes('Se actualizaron 2 insumos de 1.000 filas. 998 filas descartadas por filtro anti-polución.'));assert.ok(!r[0].json.html.includes('<b>'));
 r=await run('resumen.js',{items:[{json:{received:1,updated:1,discarded:0}}],nodes:{'Normalizar Columnas':{}}});assert.equal(r.length,0);
 // 5 Error
 r=await run('error.js',{items:[{json:{error:'Algo'}},{json:{error:{message:'Request failed 404'}}},{json:{error:{message:'ECONNREFUSED'}}}],nodes:{'Extraer Slug y Adjunto':meta}});
 assert.equal(r[0].json.to,'p@d.com');
 console.log('ingesta-listas: todos los nodos OK');
})().catch(e=>{console.error(e);process.exit(1)});
