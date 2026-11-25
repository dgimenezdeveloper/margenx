// Prueba del script del caso [RV371-I3] (#399), que se pega en la consola del navegador en staging y producción.
// Se carga en un contexto aislado de `vm`, sin `window`, con una API falsa en memoria: no sale a la red.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

type Insumo = { id: string; name: string; unit: string; currentCost: string };
type Pedido = { metodo: string; ruta: string; cuerpo: Record<string, unknown> | null; authorization: string | undefined };
type Init = { method?: string; headers: Record<string, string>; body?: string };
type Resultado = {
  unidades: { porUnidad: Record<string, number>; total: number; contados: number; unidadesFueraDeRango: string[]; ok: boolean };
  costo: { pasos: Array<Record<string, unknown>>; ok: boolean } | null;
  ok: boolean;
};
type Verificar = (opciones: {
  config: Record<string, unknown>;
  getToken: () => Promise<string>;
  fetchImpl: (url: string, init: Init) => Promise<unknown>;
  marca: () => string;
}) => Promise<Resultado>;

const SCRIPT = readFileSync(join(__dirname, 'verificar-unidades-y-costo.js'), 'utf8');
const API = 'https://api-dev.margenx.tech/api';

function cargarScript() {
  const contexto = vm.createContext({});
  vm.runInContext(SCRIPT, contexto);
  return contexto as unknown as { verificarUnidadesYCosto: Verificar; verificarUnidadesYCostoConfig: Record<string, unknown> };
}

// Insumos de la Demo con sus unidades; los nombres no tienen que aparecer en la salida.
const CATALOGO: Insumo[] = [
  { id: 'i1', name: 'Harina de trigo 000 Olavarriense', unit: 'kg', currentCost: '736.25' },
  { id: 'i2', name: 'Leche entera La Serenísima', unit: 'l', currentCost: '1450.00' },
  { id: 'i3', name: 'Huevos blancos', unit: 'u', currentCost: '180.00' },
  { id: 'i4', name: 'Manteca', unit: 'kg', currentCost: '9500.00' },
  { id: 'i5', name: 'Esencia de vainilla', unit: 'kg', currentCost: '12000.00' },
];

/** API falsa con las formas reales: { data, meta } en la lista, { ingredient } en alta y lectura. */
function apiFalsa(opciones: { catalogo?: Insumo[]; estadoPut?: number; costoGuardado?: string; estadoLista?: number } = {}) {
  const insumos = new Map((opciones.catalogo ?? CATALOGO).map((i) => [i.id, { ...i }]));
  const pedidos: Pedido[] = [];
  let siguiente = 1;
  const responder = (status: number, cuerpo: unknown) => ({ status, ok: status < 400, json: async () => cuerpo });

  const fetchImpl = async (url: string, init: Init) => {
    const ruta = url.replace(API, '');
    const metodo = init.method ?? 'GET';
    const cuerpo = init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null;
    pedidos.push({ metodo, ruta, cuerpo, authorization: init.headers.Authorization });

    const lista = ruta.match(/^\/ingredients\?page=(\d+)&limit=(\d+)$/);
    if (metodo === 'GET' && lista) {
      if (opciones.estadoLista) return responder(opciones.estadoLista, { error: 'Error interno del servidor.' });
      const [page, limit] = [Number(lista[1]), Number(lista[2])];
      const todos = [...insumos.values()];
      const data = todos.slice((page - 1) * limit, page * limit);
      const totalPages = todos.length === 0 ? 0 : Math.ceil(todos.length / limit);
      return responder(200, { data, meta: { total: todos.length, page, limit, totalPages } });
    }
    if (metodo === 'POST' && ruta === '/ingredients') {
      const nuevo = { id: `qa-${siguiente++}`, name: String(cuerpo?.name), unit: String(cuerpo?.unit), currentCost: String(cuerpo?.currentCost) };
      insumos.set(nuevo.id, nuevo);
      return responder(201, { ingredient: nuevo });
    }
    const porId = ruta.match(/^\/ingredients\/([^/?]+)$/);
    if (porId) {
      const insumo = insumos.get(porId[1]!);
      if (!insumo) return responder(404, { error: 'Insumo no encontrado.' });
      if (metodo === 'GET') return responder(200, { ingredient: insumo });
      if (metodo === 'PUT') {
        if (opciones.estadoPut) return responder(opciones.estadoPut, { error: 'Error interno del servidor.' });
        insumo.currentCost = opciones.costoGuardado ?? String(cuerpo?.currentCost);
        return responder(200, { ingredient: insumo, affectedProductsCount: 0, affectedProducts: [] });
      }
      if (metodo === 'DELETE') {
        insumos.delete(insumo.id);
        return responder(200, { message: 'Insumo eliminado correctamente.' });
      }
    }
    return responder(404, { error: 'Ruta no encontrada.' });
  };
  return { fetchImpl, pedidos, insumos };
}

function correr(api: ReturnType<typeof apiFalsa>, config: Record<string, unknown> = {}) {
  const { verificarUnidadesYCosto, verificarUnidadesYCostoConfig } = cargarScript();
  return verificarUnidadesYCosto({
    config: { ...verificarUnidadesYCostoConfig, ...config },
    getToken: async () => 'token-de-prueba',
    fetchImpl: api.fetchImpl,
    marca: () => '2026-11-28T15:00:00.000Z',
  });
}

describe('verificar-unidades-y-costo.js ([RV371-I3])', () => {
  it('cuenta los insumos por unidad recorriendo todas las páginas, sin nombres en la salida', async () => {
    const api = apiFalsa();

    const resultado = await correr(api, { limite: 2, probarCosto: false });

    expect(resultado.unidades).toEqual({
      porUnidad: { kg: 3, l: 1, u: 1 },
      total: 5,
      contados: 5,
      unidadesFueraDeRango: [],
      ok: true,
    });
    expect(api.pedidos.map((p) => p.ruta)).toEqual([
      '/ingredients?page=1&limit=2',
      '/ingredients?page=2&limit=2',
      '/ingredients?page=3&limit=2',
    ]);
    const salida = JSON.stringify(resultado);
    CATALOGO.forEach((insumo) => expect(salida).not.toContain(insumo.name));
  });

  it('marca la unidad fuera de kg, l y u y no da por bueno el caso', async () => {
    const api = apiFalsa({ catalogo: [...CATALOGO, { id: 'i6', name: 'Levadura fresca', unit: 'gr', currentCost: '9.50' }] });

    const resultado = await correr(api, { probarCosto: false });

    expect(resultado.unidades.porUnidad).toEqual({ kg: 3, l: 1, u: 1, gr: 1 });
    expect(resultado.unidades.unidadesFueraDeRango).toEqual(['gr']);
    expect(resultado.ok).toBe(false);
  });

  it('en staging crea el insumo de prueba, cambia el costo, lo verifica y lo borra, con el token en cada pedido', async () => {
    const api = apiFalsa();

    const resultado = await correr(api);

    expect(resultado.ok).toBe(true);
    const escrituras = api.pedidos.filter((p) => !p.ruta.includes('?'));
    expect(escrituras.map((p) => `${p.metodo} ${p.ruta}`)).toEqual([
      'POST /ingredients',
      'PUT /ingredients/qa-1',
      'GET /ingredients/qa-1',
      'DELETE /ingredients/qa-1',
      'GET /ingredients/qa-1',
    ]);
    expect(escrituras[0]!.cuerpo).toEqual({ name: 'QA regresion 399 2026-11-28T15:00:00.000Z', unit: 'kg', currentCost: '1000.00' });
    expect(escrituras[1]!.cuerpo).toMatchObject({ currentCost: '1250.00' });
    expect(api.pedidos.every((p) => p.authorization === 'Bearer token-de-prueba')).toBe(true);
    expect(resultado.costo!.pasos.map((p) => p.estado)).toEqual([201, 200, 200, 200, 404]);
    // Los datos de la cuenta quedan como estaban.
    expect([...api.insumos.values()]).toEqual(CATALOGO);
  });

  it('en producción solo cuenta: no hace ninguna escritura', async () => {
    const api = apiFalsa();

    const resultado = await correr(api, { probarCosto: false });

    expect(resultado.costo).toBeNull();
    expect(api.pedidos.every((p) => p.metodo === 'GET')).toBe(true);
  });

  it('si el PUT falla, igual borra el insumo de prueba y el caso no pasa', async () => {
    const api = apiFalsa({ estadoPut: 500 });

    const resultado = await correr(api);

    expect(resultado.ok).toBe(false);
    expect(api.pedidos.some((p) => p.metodo === 'DELETE' && p.ruta === '/ingredients/qa-1')).toBe(true);
    expect(api.insumos.has('qa-1')).toBe(false);
  });

  it('si el costo guardado no es el que se mandó, el caso no pasa', async () => {
    const api = apiFalsa({ costoGuardado: '1000.00' });

    const resultado = await correr(api);

    expect(resultado.ok).toBe(false);
    expect(resultado.costo!.pasos.find((p) => p.paso === 'GET costo guardado')).toMatchObject({
      costo: '1000.00',
      costoEsperado: '1250.00',
    });
  });

  it('si la lista de insumos no responde 200, avisa en qué página falló', async () => {
    const api = apiFalsa({ estadoLista: 500 });

    await expect(correr(api)).rejects.toThrow('GET /api/ingredients respondió 500 en la página 1');
  });
});
