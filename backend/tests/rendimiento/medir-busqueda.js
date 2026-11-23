/*
 * Medición de #444 ([RV375-I1]): tiempo de respuesta de GET /api/ingredients y GET /api/products, con y sin
 * `search`, sobre la cuenta Demo de staging. Solo lectura.
 *
 * Uso: abrir https://dev.margenx.tech con la sesión del ADMIN de la cuenta Demo, abrir la consola del navegador
 * (F12 → Console), pegar este archivo entero y Enter. Tarda menos de un minuto.
 *
 * - Pide la primera página de 20, como la app, con y sin búsqueda y alternando las dos variantes: 2 pedidos de
 *   calentamiento (no se cuentan) y 20 medidos por variante.
 * - El token lo da Clerk en cada pedido y no se imprime. La salida tiene solo tiempos y la cantidad que informa
 *   la API (`meta.total`), sin nombres ni datos de la cuenta.
 * - "Respuesta" es hasta que llegan las cabeceras; "total", hasta tener el cuerpo leído. Los dos incluyen la
 *   consulta previa de CORS (OPTIONS) que el navegador hace antes de cada pedido con token, igual que en la app,
 *   y la red de quien mide: pesan lo mismo con y sin búsqueda, así que la diferencia entre las dos medianas es el
 *   costo de la búsqueda.
 *
 * La prueba está en medir-busqueda.test.ts (corre con `npm test` del backend).
 */
(function (global) {
  'use strict';

  var CONFIG = {
    apiUrl: 'https://api-dev.margenx.tech/api',
    repeticiones: 20,
    calentamiento: 2,
    limite: 20,
    // Términos reales del catálogo Demo; "budin" sin tilde ejercita la búsqueda sin acentos (searchName).
    casos: [
      { endpoint: 'ingredients', busqueda: 'harina' },
      { endpoint: 'products', busqueda: 'budin' },
    ],
    variantes: ['sin', 'con'],
  };

  function redondear(ms) {
    return Math.round(ms * 10) / 10;
  }

  function ordenar(valores) {
    return valores.slice().sort(function (a, b) {
      return a - b;
    });
  }

  function mediana(valores) {
    if (valores.length === 0) return null;
    var orden = ordenar(valores);
    var medio = Math.floor(orden.length / 2);
    return orden.length % 2 === 0 ? (orden[medio - 1] + orden[medio]) / 2 : orden[medio];
  }

  /** Percentil por el método del puesto más cercano (p90 de 20 pedidos = el 18.º más rápido). */
  function percentil(valores, p) {
    if (valores.length === 0) return null;
    var orden = ordenar(valores);
    return orden[Math.max(0, Math.ceil((p / 100) * orden.length) - 1)];
  }

  async function medirPedido(url, ruta, opciones) {
    var token = await opciones.getToken();
    var inicio = opciones.now();
    var respuesta = await opciones.fetchImpl(url, {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store',
    });
    var cabeceras = opciones.now();
    if (!respuesta.ok) {
      throw new Error('La API respondió ' + respuesta.status + ' en ' + ruta);
    }
    var cuerpo = await respuesta.json();
    var fin = opciones.now();
    var meta = cuerpo && cuerpo.meta;
    return {
      respuestaMs: cabeceras - inicio,
      totalMs: fin - inicio,
      encontrados: meta && typeof meta.total === 'number' ? meta.total : null,
    };
  }

  async function medirBusqueda(opciones) {
    var config = opciones.config || CONFIG;
    var filas = [];
    for (var c = 0; c < config.casos.length; c++) {
      var caso = config.casos[c];
      var ruta = '/api/' + caso.endpoint;
      var base = config.apiUrl + '/' + caso.endpoint + '?page=1&limit=' + config.limite;
      var urls = { sin: base, con: base + '&search=' + encodeURIComponent(caso.busqueda) };
      var medidas = {};
      config.variantes.forEach(function (v) {
        medidas[v] = { respuesta: [], total: [], encontrados: null };
      });

      for (var i = 0; i < config.calentamiento + config.repeticiones; i++) {
        for (var k = 0; k < config.variantes.length; k++) {
          var variante = config.variantes[k];
          var r = await medirPedido(urls[variante], ruta, opciones);
          if (i < config.calentamiento) continue;
          medidas[variante].respuesta.push(r.respuestaMs);
          medidas[variante].total.push(r.totalMs);
          medidas[variante].encontrados = r.encontrados;
        }
      }

      config.variantes.forEach(function (v) {
        var m = medidas[v];
        filas.push({
          endpoint: ruta,
          variante: v === 'con' ? 'search=' + caso.busqueda : 'sin search',
          pedidos: m.total.length,
          medianaRespuestaMs: redondear(mediana(m.respuesta)),
          medianaTotalMs: redondear(mediana(m.total)),
          p90TotalMs: redondear(percentil(m.total, 90)),
          minTotalMs: redondear(Math.min.apply(null, m.total)),
          maxTotalMs: redondear(Math.max.apply(null, m.total)),
          encontrados: m.encontrados,
        });
      });
    }
    return filas;
  }

  global.medirBusqueda = medirBusqueda;
  global.medirBusquedaConfig = CONFIG;

  // Pegado en la consola de la app, con la sesión iniciada, corre solo.
  if (typeof window !== 'undefined' && !(window.Clerk && window.Clerk.session)) {
    console.error(
      'medir-busqueda: no encontré la sesión de Clerk. Iniciá sesión en dev.margenx.tech con el ADMIN de la cuenta Demo y volvé a pegar el script.'
    );
    return;
  }
  if (typeof window !== 'undefined') {
    var host = location.hostname;
    if (host !== 'dev.margenx.tech' && host !== 'localhost') {
      console.error('medir-busqueda: se corre en dev.margenx.tech (staging) o en localhost; esta página es ' + host + '.');
      return;
    }
    var config = Object.assign({}, CONFIG, {
      apiUrl: host === 'localhost' ? 'http://localhost:3000/api' : CONFIG.apiUrl,
    });
    medirBusqueda({
      config: config,
      getToken: function () {
        return window.Clerk.session.getToken();
      },
      fetchImpl: function (url, init) {
        return fetch(url, init);
      },
      now: function () {
        return performance.now();
      },
    })
      .then(function (filas) {
        console.table(filas);
        console.log(
          JSON.stringify({ medido: new Date().toISOString(), pagina: host, filas: filas }, null, 2)
        );
      })
      .catch(function (error) {
        console.error('medir-busqueda: ' + error.message);
      });
  }
})(globalThis);
