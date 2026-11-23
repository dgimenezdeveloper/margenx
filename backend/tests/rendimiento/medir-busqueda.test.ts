// Prueba del script de medición de #444 ([RV375-I1]), que se pega en la consola del navegador en staging.
// Se carga en un contexto aislado de `vm`, sin `window`, con fetch y reloj falsos: no sale a la red.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

type Fila = {
  endpoint: string;
  variante: string;
  pedidos: number;
  medianaRespuestaMs: number;
  medianaTotalMs: number;
  p90TotalMs: number;
  minTotalMs: number;
  maxTotalMs: number;
  encontrados: number | null;
};
type Pedido = { url: string; authorization: string | undefined };
type FetchFalso = (url: string, init: { headers: Record<string, string> }) => Promise<unknown>;
type Medir = (opciones: {
  config?: Record<string, unknown>;
  getToken: () => Promise<string>;
  fetchImpl: FetchFalso;
  now: () => number;
}) => Promise<Fila[]>;

const SCRIPT = readFileSync(join(__dirname, 'medir-busqueda.js'), 'utf8');

function cargarScript(globales: Record<string, unknown> = {}) {
  const contexto = vm.createContext({ ...globales });
  vm.runInContext(SCRIPT, contexto);
  return contexto as unknown as { medirBusqueda: Medir; medirBusquedaConfig: Record<string, unknown> } & Record<string, unknown>;
}

/**
 * API falsa: el reloj avanza lo que "tarda" cada pedido. Sin search, 80 ms hasta la respuesta y 20 ms de cuerpo;
 * con search, 130 ms y 10 ms. Los dos primeros pedidos de cada variante (calentamiento) tardan 900 ms.
 */
function apiFalsa(opciones: { estado?: number } = {}) {
  let reloj = 0;
  const pedidos: Pedido[] = [];
  const vistos = new Map<string, number>();
  const fetchImpl: FetchFalso = async (url, init) => {
    pedidos.push({ url, authorization: init.headers.Authorization });
    const vez = (vistos.get(url) ?? 0) + 1;
    vistos.set(url, vez);
    const conSearch = url.includes('search=');
    const calentando = vez <= 2;
    reloj += calentando ? 900 : conSearch ? 130 : 80;
    const total = url.includes('/ingredients') ? (conSearch ? 18 : 218) : conSearch ? 24 : 339;
    return {
      ok: (opciones.estado ?? 200) < 400,
      status: opciones.estado ?? 200,
      json: async () => {
        reloj += conSearch ? 10 : 20;
        return { data: [{ name: 'Harina 000 Molinos del Sur' }], meta: { total, page: 1, limit: 20 } };
      },
    };
  };
  return { fetchImpl, now: () => reloj, pedidos };
}

describe('medir-busqueda.js: mediana de pedidos con y sin search (#444)', () => {
  it('informa por endpoint la mediana con y sin search, sin contar el calentamiento', async () => {
    const { medirBusqueda } = cargarScript();
    const api = apiFalsa();
    let tokens = 0;

    const filas = JSON.parse(
      JSON.stringify(
        await medirBusqueda({ getToken: async () => `token-${++tokens}`, fetchImpl: api.fetchImpl, now: api.now })
      )
    ) as Fila[];

    expect(filas).toEqual([
      { endpoint: '/api/ingredients', variante: 'sin search', pedidos: 20, medianaRespuestaMs: 80, medianaTotalMs: 100, p90TotalMs: 100, minTotalMs: 100, maxTotalMs: 100, encontrados: 218 },
      { endpoint: '/api/ingredients', variante: 'search=harina', pedidos: 20, medianaRespuestaMs: 130, medianaTotalMs: 140, p90TotalMs: 140, minTotalMs: 140, maxTotalMs: 140, encontrados: 18 },
      { endpoint: '/api/products', variante: 'sin search', pedidos: 20, medianaRespuestaMs: 80, medianaTotalMs: 100, p90TotalMs: 100, minTotalMs: 100, maxTotalMs: 100, encontrados: 339 },
      { endpoint: '/api/products', variante: 'search=budin', pedidos: 20, medianaRespuestaMs: 130, medianaTotalMs: 140, p90TotalMs: 140, minTotalMs: 140, maxTotalMs: 140, encontrados: 24 },
    ]);
    // 2 de calentamiento y 20 medidos por variante, con dos variantes por endpoint y dos endpoints.
    expect(api.pedidos).toHaveLength(88);
    // Un token por pedido, en la cabecera; nunca en la URL.
    expect(tokens).toBe(88);
    expect(api.pedidos.every((p) => /^Bearer token-\d+$/.test(p.authorization ?? ''))).toBe(true);
    expect(api.pedidos.some((p) => p.url.includes('token'))).toBe(false);
  });

  it('pide lo mismo que la app: primera página de 20, con y sin search, alternando las variantes', async () => {
    const { medirBusqueda } = cargarScript();
    const api = apiFalsa();

    await medirBusqueda({ getToken: async () => 'token', fetchImpl: api.fetchImpl, now: api.now });

    const base = 'https://api-dev.margenx.tech/api/ingredients?page=1&limit=20';
    expect(api.pedidos.slice(0, 6).map((p) => p.url)).toEqual([
      base,
      `${base}&search=harina`,
      base,
      `${base}&search=harina`,
      base,
      `${base}&search=harina`,
    ]);
    expect(api.pedidos.at(-1)?.url).toBe('https://api-dev.margenx.tech/api/products?page=1&limit=20&search=budin');
  });

  it('la mediana de una cantidad par es el promedio de los dos del medio, y el p90 es el del puesto 90 %', async () => {
    const { medirBusqueda } = cargarScript();
    let reloj = 0;
    let n = 0;
    // Sin calentamiento y un solo caso: los totales medidos son 10, 20, ..., 100 ms.
    const fetchImpl: FetchFalso = async () => {
      n += 1;
      reloj += n * 10;
      return { ok: true, status: 200, json: async () => ({ meta: { total: 218 } }) };
    };
    const config = {
      apiUrl: 'http://localhost:3000/api',
      repeticiones: 10,
      calentamiento: 0,
      limite: 20,
      casos: [{ endpoint: 'ingredients', busqueda: 'harina' }],
      variantes: ['sin'],
    };

    const [fila] = JSON.parse(
      JSON.stringify(await medirBusqueda({ config, getToken: async () => 'token', fetchImpl, now: () => reloj }))
    ) as Fila[];

    expect(fila).toMatchObject({ pedidos: 10, medianaTotalMs: 55, p90TotalMs: 90, minTotalMs: 10, maxTotalMs: 100 });
  });

  it('si la API responde con error, corta y dice el código, sin seguir midiendo', async () => {
    const { medirBusqueda } = cargarScript();
    const api = apiFalsa({ estado: 401 });

    await expect(
      medirBusqueda({ getToken: async () => 'token', fetchImpl: api.fetchImpl, now: api.now })
    ).rejects.toThrow('La API respondió 401 en /api/ingredients');
    expect(api.pedidos).toHaveLength(1);
  });

  it('fuera del navegador no corre solo; en el navegador, solo en staging o en local', async () => {
    expect(cargarScript().medirBusquedaConfig).toMatchObject({ apiUrl: 'https://api-dev.margenx.tech/api', repeticiones: 20 });

    const errores: string[] = [];
    let pidioToken = false;
    cargarScript({
      window: { Clerk: { session: { getToken: async () => { pidioToken = true; return 'token'; } } } },
      location: { hostname: 'margenx.tech' },
      console: { error: (mensaje: string) => errores.push(mensaje), log: () => {}, table: () => {} },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(pidioToken).toBe(false);
    expect(errores).toEqual([
      'medir-busqueda: se corre en dev.margenx.tech (staging) o en localhost; esta página es margenx.tech.',
    ]);
  });
});

describe('medir-busqueda.js pegado sin la sesión iniciada (#444)', () => {
  it('avisa que hay que iniciar sesión en lugar de no hacer nada', () => {
    const errores: string[] = [];
    cargarScript({
      window: {},
      location: { hostname: 'dev.margenx.tech' },
      console: { error: (mensaje: string) => errores.push(mensaje), log: () => {}, table: () => {} },
    });

    expect(errores).toEqual([
      'medir-busqueda: no encontré la sesión de Clerk. Iniciá sesión en dev.margenx.tech con el ADMIN de la cuenta Demo y volvé a pegar el script.',
    ]);
  });
});
