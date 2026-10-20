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
  'despacho.js': 'Despachar a API MargenX',
  'resumen.js': 'Generar Resumen al Dueño',
  'error.js': 'Armar Correo de Error',
};
const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
// ctx.nodes[nombre] = json único; ctx.all[nombre] = lista de json; ctx.match[nombre] = fn(i) -> json del ítem emparejado.
const run = (file, ctx) => {
  const node = wf.nodes.find((n) => n.name === CODE[file]);
  const $ = (n) => {
    const list = (ctx.all && ctx.all[n]) || (ctx.nodes && ctx.nodes[n] !== undefined ? [ctx.nodes[n]] : []);
    return {
      first: () => ({ json: list[0] }),
      all: () => list.map((json) => ({ json })),
      itemMatching: (i) => {
        const f = ctx.match && ctx.match[n];
        if (!f) throw new Error('sin pairedItem');
        return { json: f(i) };
      },
    };
  };
  return new AsyncFn('$input', '$', '$env', 'setTimeout', node.parameters.jsCode).call(ctx.self || {}, { all: () => ctx.items }, $, ctx.env || {}, (f) => f());
};
(async () => {
 // 1 Extraer
 const mail=(to,files,extra={})=>({json:{from:{value:[{address:'Prov@dist.com'}]},to:{text:to},subject:'Lista',...extra},binary:Object.fromEntries(files.map((f,i)=>['attachment_'+i,{fileName:f}]))});
 let r=await run('extraer.js',{items:[mail('precios+panaderia-central@margenx.tech',['Lista Octubre.xlsx'])],env:{IMAP_USER:'margenx.saas@gmail.com'}});
 assert.equal(r[0].json.slug,'panaderia-central');assert.equal(r[0].json.ext,'xlsx');assert.equal(r[0].json.error,'');
 for (const a of ['precios-panaderia-central','precios.panaderia-central','PRECIOS+panaderia-central']){r=await run('extraer.js',{items:[mail(a+'@margenx.tech',['l.csv'])],env:{IMAP_USER:'margenx.saas@gmail.com'}});assert.equal(r[0].json.slug,'panaderia-central',a);assert.equal(r[0].json.error,'');}
 r=await run('extraer.js',{items:[mail('hola@margenx.tech',['a.xlsx']),mail('precios+x1@margenx.tech',['foto.png']),mail('precios+x1@margenx.tech',['a.csv'],{from:{value:[{address:'margenx.saas@gmail.com'}]}})],env:{IMAP_USER:'margenx.saas@gmail.com'}});
 assert.equal(r.length,2);assert.ok(r[0].json.error.includes('identificador'));assert.ok(r[1].json.error.includes('adjunto'));
 // 2 CSV
 for(const [delim,txt] of [[',','Código,Descripción,Precio\n001,"Harina, 000","1.234,56"\n'],[';','Cod;Detalle;Precio Final\n001;Harina 000;"1.234,56"\r\n002;Azúcar;$ 980,5\r\n']]){
   const buf=Buffer.from(txt);
   const out=await run('csv.js',{items:[{json:{binaryKey:'attachment_0'}}],self:{helpers:{getBinaryDataBuffer:async()=>buf}}});
   assert.equal(out.length>=1,true);
 }
 // 3 Normalizar
 const meta={mailId:'0',slug:'panaderia-central',from:'p@d.com',fileName:'x.xlsx',error:''};
 const rows=[{Cód:'A1','Detalle':'Harina','Precio Final':'$ 1.234,56'},{Cód:456,Detalle:'Azúcar','Precio Final':980.5},{Cód:'',Detalle:'x','Precio Final':10},{Cód:'B',Detalle:'y','Precio Final':'abc'},{Cód:'C',Detalle:'Sal','Precio Final':'1.500'},{Cód:'D',Detalle:'Aceite','Precio Final':'1,234.50'}];
 r=await run('normalizar.js',{items:rows.map(j=>({json:j})),nodes:{'Extraer Slug y Adjunto':meta}});
 const it=r[0].json.items;assert.deepEqual(it.map(i=>i.price),[1234.56,980.5,1500,1234.5]);assert.equal(it[1].code,'456');assert.equal(r[0].json.rowsInvalid,2);
 r=await run('normalizar.js',{items:[{json:{A:1,B:2}}],nodes:{'Extraer Slug y Adjunto':meta}});assert.equal(r[0].json.ok,false);
 // lotes
 const big=Array.from({length:12000},(_,i)=>({json:{Codigo:'c'+i,Precio:i+1}}));
 r=await run('normalizar.js',{items:big,nodes:{'Extraer Slug y Adjunto':meta}});assert.deepEqual(r.map(x=>x.json.items.length),[5000,5000,2000]);
 // 4 Resumen
 const resp={received:1000,updated:2,discarded:998,account:{tradeName:'Panadería <Central>',ownerEmail:'dueno@x.com'},criticalProductsAlerts:[{productName:'Pan <b>',currentMarginPercent:'18.00',minMarginPercent:'30.00',newCost:'820.00'}]};
 r=await run('resumen.js',{items:[{json:{mailId:'0',fileName:'x.xlsx',rowsInvalid:0,body:resp}}]});
 assert.ok(r[0].json.text.includes('Se actualizaron 2 insumos de 1.000 filas. 998 filas descartadas por filtro anti-polución.'));assert.ok(!r[0].json.html.includes('<b>'));
 r=await run('resumen.js',{items:[{json:{mailId:'0',body:{received:1,updated:1,discarded:0}}}]});assert.equal(r.length,0);
 // 5 Error
 r=await run('error.js',{items:[{json:{...meta,error:'Algo'}}]});
 assert.equal(r[0].json.to,'p@d.com');assert.ok(r[0].json.text.includes('Motivo: Algo'));
 // errores del despacho: 404 / 401 / 503 -> motivo según status; dos lotes con la misma falla -> un solo correo
 r=await run('error.js',{items:[{json:{...meta,dispatchOk:false,status:404,apiError:'x'}},{json:{...meta,dispatchOk:false,status:404}},{json:{...meta,mailId:'1',from:'o@d.com',dispatchOk:false,status:0,apiError:'ECONNREFUSED'}}]});
 assert.equal(r.length,2);assert.ok(r[0].json.text.includes('no existe o está inactivo'));assert.equal(r[1].json.to,'o@d.com');assert.ok(r[1].json.text.includes('3 intentos'));assert.ok(!r[1].json.text.includes('ECONNREFUSED'));
 // 6 Varios correos: cada pasada (rama CSV / rama XLSX) responde SOLO por los correos que trae
 const mA={mailId:'0',slug:'panaderia-central',from:'a@d.com',fileName:'a.csv',error:''},mB={mailId:'1',slug:'otro',from:'b@d.com',fileName:'b.xlsx',error:''},mC={mailId:'2',slug:'vacio',from:'c@d.com',fileName:'c.csv',error:''};
 const todos=[mA,mB,mC,{mailId:'3',error:'x'}];
 const mixed=[{json:{Codigo:'A1',Precio:'10'}},{json:{Codigo:'A2',Precio:'abc'}},{json:{}}]; // 2 filas de A + marcador vacío de C
 let owner=[0,0,2];
 r=await run('normalizar.js',{items:mixed,all:{'Extraer Slug y Adjunto':todos},match:{'Extraer Slug y Adjunto':(i)=>todos[owner[i]]}});
 assert.equal(r.length,2); // A y C; B (no vino en esta pasada) NO genera error falso
 assert.deepEqual([r[0].json.from,r[0].json.fileName,r[0].json.items.length,r[0].json.rowsInvalid],['a@d.com','a.csv',1,1]);
 assert.equal(r[1].json.ok,false);assert.equal(r[1].json.from,'c@d.com'); // CSV sin filas: error al remitente correcto
 // segunda pasada (rama XLSX): solo B
 owner=[1,1];
 r=await run('normalizar.js',{items:[{json:{Cod:'B1',Precio:'20'}},{json:{Cod:'B2',Precio:'30'}}],all:{'Extraer Slug y Adjunto':todos},match:{'Extraer Slug y Adjunto':(i)=>todos[owner[i]]}});
 assert.equal(r.length,1);assert.deepEqual([r[0].json.from,r[0].json.fileName,r[0].json.items.length],['b@d.com','b.xlsx',2]);
 // CSV solo con encabezado en el nodo Parsear CSV -> marcador vacío ligado al correo
 const bufH=Buffer.from('Codigo;Precio\n');
 r=await run('csv.js',{items:[{json:{binaryKey:'attachment_0'}}],self:{helpers:{getBinaryDataBuffer:async()=>bufH}}});
 assert.equal(r.length,1);assert.deepEqual(r[0].json,{});assert.equal(r[0].pairedItem.item,0);
 // sin pairedItem y un solo correo: usa ese correo
 r=await run('normalizar.js',{items:[{json:{Codigo:'Z',Precio:5}}],all:{'Extraer Slug y Adjunto':[mA]}});assert.equal(r[0].json.items[0].code,'Z');
 // 7 Despacho: 200 directo; 4xx sin reintento; 5xx con reintentos; error de red agotado
 const batch=(extra={})=>({json:{ok:true,mailId:'0',accountSlug:'x',from:'a@d.com',fileName:'a.csv',items:[{code:'1',price:1}],rowsRead:1,rowsInvalid:0,batchIndex:1,batches:1,...extra}});
 const mk=(seq)=>{let n=0;return {calls:()=>n,self:{helpers:{httpRequest:async()=>{const s=seq[Math.min(n++,seq.length-1)];if(s instanceof Error)throw s;return {statusCode:s,body:{received:1}};}}}};};
 let h=mk([200]);r=await run('despacho.js',{items:[batch()],self:h.self,env:{INTERNAL_WEBHOOK_SECRET:'s'}});assert.equal(r[0].json.dispatchOk,true);assert.equal(h.calls(),1);
 h=mk([404]);r=await run('despacho.js',{items:[batch()],self:h.self});assert.deepEqual([r[0].json.dispatchOk,r[0].json.status,h.calls()],[false,404,1]);
 h=mk([401]);r=await run('despacho.js',{items:[batch()],self:h.self});assert.deepEqual([r[0].json.status,h.calls()],[401,1]);
 h=mk([503,502,200]);r=await run('despacho.js',{items:[batch()],self:h.self});assert.deepEqual([r[0].json.dispatchOk,r[0].json.attempts,h.calls()],[true,3,3]);
 h=mk([new Error('ETIMEDOUT')]);r=await run('despacho.js',{items:[batch()],self:h.self});assert.deepEqual([r[0].json.dispatchOk,r[0].json.status,r[0].json.attempts,h.calls()],[false,0,4,4]);
 h=mk([500]);r=await run('despacho.js',{items:[batch(),batch({mailId:'1',from:'b@d.com'})],self:h.self});assert.deepEqual([r.length,h.calls()],[2,8]);assert.equal(r[1].json.from,'b@d.com');
 // 8 Resumen: un correo por mailId
 const ok1=(mailId,upd,own)=>({json:{dispatchOk:true,mailId,accountSlug:'s'+mailId,fileName:mailId+'.csv',rowsInvalid:0,body:{received:10,updated:upd,discarded:10-upd,account:{tradeName:'T'+mailId,ownerEmail:own}}}});
 r=await run('resumen.js',{items:[ok1('0',3,'d0@x.com'),ok1('1',5,'d1@x.com'),ok1('2',1,'')]});
 assert.equal(r.length,2);assert.equal(r[0].json.ownerEmail,'d0@x.com');assert.ok(r[0].json.text.includes('3 insumos'));assert.ok(r[1].json.text.includes('5 insumos'));
 console.log('ingesta-listas: todos los nodos OK');
})().catch(e=>{console.error(e);process.exit(1)});
