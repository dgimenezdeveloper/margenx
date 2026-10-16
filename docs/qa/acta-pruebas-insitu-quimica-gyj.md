# Acta de Conformidad — Pruebas In-Situ 360px en Química GyJ

**Proyecto:** MargenX — Control de Márgenes en Tiempo Real
**Materia:** Prácticas Profesionales Supervisadas (PPS)
**Issue de referencia:** #174 ([SPRINT4-QA-01], protocolo heredado de la issue #126)
**Fecha de sesión:** 16/10/2026
**Hora:** 21:35 a 21:51 hs (aprox.)
**Comercio piloto:** Química GyJ
**Responsable de QA:** Leandro Herrera
**Responsable del comercio presente:** Leandro Herrera (QA y responsable de Química GyJ)
**Estado del documento:** Para revisión

---

## 1. Objeto del acta

Dejar constancia de la ejecución presencial del protocolo de pruebas
in-situ en dispositivos móviles reales (360px), descrito en
`docs/qa/protocolo-pruebas-insitu-sprint3.md`, validando la ergonomía de
MargenX en condiciones reales de operación del comercio piloto Química GyJ.

## 2. Nota sobre el comercio piloto

La issue #174 fue redactada originalmente sobre "Panadería Central", un
registro del seed de demostración con precios reales tomados de fuentes
públicas de internet, pero sin vínculo con un local físico real ni un
responsable con quien coordinar una visita. Química GyJ es un comercio
real, por lo que esta sesión se realizó ahí — opción ya prevista como
sitio piloto adicional en el protocolo original de Sprint 3 (issue #126,
sección 9).

## 3. Resumen de ejecución

Dispositivos: **Motorola Edge 50 Pro** (Android) y un **iPhone** (iOS), ambos reales.

| Caso | Resultado (Pass/Fail) | Observación principal |
|---|---|---|
| TC-INSITU-01 — Carga de costo con una mano | **Pass** | Cambio de costo de "Pasta suavi" ($15.400 → $16.000) con una sola mano, respuesta instantánea, sin trabas. |
| TC-INSITU-02 — Consulta de colaborador sin fuga de márgenes | **Pass** | Revisado en `/productos` y `/dashboard` como colaborador: sin "%", sin "Costo", sin parpadeo de datos al cargar. El bottom nav de colaborador tampoco muestra la pestaña "Insumos". |
| TC-INSITU-03 — Teclado virtual no tapa botones | **Pass** | Probado en Android e iOS sobre el modal "Asociar otro empaque": botones "Cancelar"/"Guardar" visibles arriba del teclado en ambas plataformas. |
| Criterio general (BottomNav / sin overflow horizontal) | **Pass** | La barra de navegación inferior se alcanza cómoda con el pulgar en una sola mano; no se observó scroll horizontal en ningún momento de la sesión. |

Bitácora completa de la sesión: `docs/qa/bitacora-pruebas-insitu-quimica-gyj.md`.

## 4. Incidencias detectadas

**Scroll de fondo no bloqueado en iOS Safari dentro de modales** — detectado en los modales "Asociar otro empaque" y edición de insumo. En iOS, el fondo de la página se mueve al scrollear dentro de un modal con contenido más alto que la pantalla; en Android no ocurre. Afecta al hook compartido `useBodyScrollLock`.

Reportada verbalmente al Scrum Master (Darío Giménez); queda a su criterio la carga y el seguimiento en el tablero.

## 5. Conclusión

La experiencia de MargenX en dispositivo móvil real, en condiciones de uso genuinas de Química GyJ, resultó fluida y correcta en los tres casos centrales del protocolo: edición de costos con una sola mano, aislamiento de información financiera para el rol colaborador, y accesibilidad de los botones de acción con el teclado virtual desplegado — tanto en Android como en iOS. Se detectó una incidencia real de scroll de fondo en iOS Safari, no cubierta por la suite E2E automatizada (que corre sobre Chromium), que queda reportada al equipo de desarrollo para su ajuste.

## 6. Conformidad

El responsable de Química GyJ presente durante la sesión confirma que
la experiencia descripta en este acta refleja fielmente lo observado
durante la prueba presencial.

**Firma del responsable del comercio:** Leandro Herrera

**Firma de QA (Leandro Herrera):** Leandro Herrera
