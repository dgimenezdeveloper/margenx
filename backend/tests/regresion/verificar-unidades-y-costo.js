/*
 * Caso [RV371-I3] de la regresión final (#399): unidades de los insumos y edición del costo.
 *
 * Uso: abrir la app con la sesión del ADMIN de la cuenta Demo, abrir la consola del navegador (F12 → Console),
 * pegar este archivo entero y Enter.
 *
 * - En staging (dev.margenx.tech) y en localhost:
 *   1. cuenta los insumos de la cuenta por unidad y avisa si alguno tiene una unidad fuera de kg, l y u;
 *   2. crea un insumo de prueba, le cambia el costo con PUT, comprueba que quedó guardado, lo borra y comprueba
 *      que ya no existe. Si algo falla en el medio, igual intenta borrarlo.
 * - En producción (margenx.tech) hace solo el conteo, sin escribir nada.
 *
 * La salida tiene solo conteos por unidad, los códigos HTTP y los costos del insumo de prueba: ni nombres ni datos
 * de la cuenta. El token lo da Clerk en cada pedido y no se imprime. El insumo de prueba no está en ninguna
 * receta, así que el cambio de costo no recalcula productos ni manda alertas, y su historial de precios se borra
 * con él.
 *
 * La prueba está en verificar-unidades-y-costo.test.ts (corre con `npm test` del backend).
 */
(function (global) {
  'use strict';

  var UNIDADES_VALIDAS = ['kg', 'l', 'u'];
  var CONFIG = {
    apiUrl: 'https://api-dev.margenx.tech/api',
    limite: 100,
    probarCosto: true,
    costoInicial: '1000.00',
    costoNuevo: '1250.00',
  };

  async function pedir(opciones, metodo, ruta, cuerpo) {
    var token = await opciones.getToken();
    var headers = { Authorization: 'Bearer ' + token };
    if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
    var respuesta = await opciones.fetchImpl(opciones.config.apiUrl + ruta, {
      method: metodo,
      headers: headers,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      cache: 'no-store',
    });
    var datos = null;
    try {
      datos = await respuesta.json();
    } catch (error) {
      datos = null;
    }
    return { estado: respuesta.status, datos: datos };
  }

  /** Recorre todas las páginas de GET /api/ingredients y devuelve solo los conteos por unidad. */
  async function contarUnidades(opciones) {
    var porUnidad = {};
    var total = 0;
    var pagina = 1;
    var paginas = 1;
    do {
      var r = await pedir(opciones, 'GET', '/ingredients?page=' + pagina + '&limit=' + opciones.config.limite);
      if (r.estado !== 200 || !r.datos || !Array.isArray(r.datos.data)) {
        throw new Error('GET /api/ingredients respondió ' + r.estado + ' en la página ' + pagina);
      }
      r.datos.data.forEach(function (insumo) {
        var unidad = String(insumo.unit);
        porUnidad[unidad] = (porUnidad[unidad] || 0) + 1;
      });
      total = r.datos.meta && typeof r.datos.meta.total === 'number' ? r.datos.meta.total : total;
      paginas = r.datos.meta && typeof r.datos.meta.totalPages === 'number' ? r.datos.meta.totalPages : 1;
      pagina += 1;
    } while (pagina <= paginas);

    var contados = Object.keys(porUnidad).reduce(function (suma, unidad) {
      return suma + porUnidad[unidad];
    }, 0);
    var fueraDeRango = Object.keys(porUnidad).filter(function (unidad) {
      return UNIDADES_VALIDAS.indexOf(unidad) === -1;
    });
    return {
      porUnidad: porUnidad,
      total: total,
      contados: contados,
      unidadesFueraDeRango: fueraDeRango,
      ok: fueraDeRango.length === 0 && contados === total,
    };
  }

  /** Crea un insumo de prueba, le cambia el costo, lo verifica y lo borra. */
  async function probarCosto(opciones) {
    var config = opciones.config;
    var nombre = 'QA regresion 399 ' + opciones.marca();
    var pasos = [];
    var id = null;
    try {
      var alta = await pedir(opciones, 'POST', '/ingredients', {
        name: nombre,
        unit: 'kg',
        currentCost: config.costoInicial,
      });
      pasos.push({ paso: 'POST alta del insumo de prueba', estado: alta.estado, esperado: 201 });
      // POST y GET /api/ingredients/:id devuelven { ingredient }.
      if (alta.estado !== 201 || !alta.datos || !alta.datos.ingredient || !alta.datos.ingredient.id) {
        throw new Error('el alta respondió ' + alta.estado);
      }
      id = alta.datos.ingredient.id;

      var edicion = await pedir(opciones, 'PUT', '/ingredients/' + id, {
        name: nombre,
        unit: 'kg',
        currentCost: config.costoNuevo,
      });
      pasos.push({
        paso: 'PUT costo ' + config.costoInicial + ' → ' + config.costoNuevo,
        estado: edicion.estado,
        esperado: 200,
        // Sin recetas, el cambio no puede recalcular productos.
        productosAfectados: edicion.datos ? edicion.datos.affectedProductsCount : null,
      });

      var lectura = await pedir(opciones, 'GET', '/ingredients/' + id);
      var insumo = lectura.datos && lectura.datos.ingredient;
      var guardado = insumo && insumo.currentCost !== undefined ? String(insumo.currentCost) : null;
      pasos.push({
        paso: 'GET costo guardado',
        estado: lectura.estado,
        esperado: 200,
        costo: guardado,
        costoEsperado: config.costoNuevo,
      });
    } catch (error) {
      pasos.push({ paso: 'Error', detalle: error.message });
    } finally {
      if (id) {
        var baja = await pedir(opciones, 'DELETE', '/ingredients/' + id);
        pasos.push({ paso: 'DELETE baja del insumo de prueba', estado: baja.estado, esperado: 200 });
        var despues = await pedir(opciones, 'GET', '/ingredients/' + id);
        pasos.push({ paso: 'GET después de borrar', estado: despues.estado, esperado: 404 });
      }
    }

    var ok = pasos.every(function (p) {
      if (p.paso === 'Error') return false;
      var estadoOk = p.estado === p.esperado;
      var costoOk = p.costoEsperado === undefined || Number(p.costo) === Number(p.costoEsperado);
      var sinAfectados = p.productosAfectados === undefined || p.productosAfectados === 0;
      return estadoOk && costoOk && sinAfectados;
    });
    return { pasos: pasos, ok: ok };
  }

  async function verificarUnidadesYCosto(opciones) {
    var config = opciones.config || CONFIG;
    var conConfig = Object.assign({}, opciones, { config: config });
    var unidades = await contarUnidades(conConfig);
    var costo = config.probarCosto ? await probarCosto(conConfig) : null;
    return {
      unidades: unidades,
      costo: costo,
      ok: unidades.ok && (costo === null || costo.ok),
    };
  }

  global.verificarUnidadesYCosto = verificarUnidadesYCosto;
  global.verificarUnidadesYCostoConfig = CONFIG;

  // Pegado en la consola de la app, con la sesión iniciada, corre solo.
  if (typeof window === 'undefined') return;
  if (!(window.Clerk && window.Clerk.session)) {
    console.error(
      'verificar-unidades-y-costo: no encontré la sesión de Clerk. Iniciá sesión con el ADMIN de la cuenta Demo y volvé a pegar el script.'
    );
    return;
  }
  var host = location.hostname;
  var ambientes = {
    'dev.margenx.tech': { apiUrl: CONFIG.apiUrl, probarCosto: true },
    localhost: { apiUrl: 'http://localhost:3000/api', probarCosto: true },
    'margenx.tech': { apiUrl: 'https://api.margenx.tech/api', probarCosto: false },
  };
  if (!ambientes[host]) {
    console.error('verificar-unidades-y-costo: se corre en dev.margenx.tech, margenx.tech o localhost; esta página es ' + host + '.');
    return;
  }
  verificarUnidadesYCosto({
    config: Object.assign({}, CONFIG, ambientes[host]),
    getToken: function () {
      return window.Clerk.session.getToken();
    },
    fetchImpl: function (url, init) {
      return fetch(url, init);
    },
    marca: function () {
      return new Date().toISOString();
    },
  })
    .then(function (resultado) {
      console.table(resultado.unidades.porUnidad);
      if (resultado.costo) console.table(resultado.costo.pasos);
      console.log(
        JSON.stringify(
          {
            caso: '[RV371-I3]',
            verificado: new Date().toISOString(),
            pagina: host,
            unidades: resultado.unidades,
            costo: resultado.costo,
            ok: resultado.ok,
          },
          null,
          2
        )
      );
    })
    .catch(function (error) {
      console.error('verificar-unidades-y-costo: ' + error.message);
    });
})(globalThis);
