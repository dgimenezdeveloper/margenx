# Acta de Cierre de Sprint y Retrospectiva — Sprint 6 (Compras sugeridas, reporte semanal en PDF, invitación de colaboradores y pulido de la app)

**Proyecto:** MargenX — Control de Márgenes en Tiempo Real
**Materia:** Prácticas Profesionales Supervisadas (PPS) / Metodologías Ágiles
**Período del sprint:** 07/11/2026 al 20/11/2026
**Sprint Review:** 21/11/2026, en la clase de pre-entrega
**Fecha de sesión:** 21/11/2026, en la clase presencial (retrospectiva pendiente de validación del equipo, §6)
**Facilitador / Scrum Master:** Darío Giménez (sigue hasta la entrega final: acta del Sprint 4, §5)
**Participantes:** Darío Giménez (Scrum Master y DevOps), Federico Paal (Lead Frontend), Mauricio Barreras (Lead Backend), Leandro Herrera (QA y enlace con los comercios piloto)

---

## 1. Incremento logrado

El Sprint 6 cerró las funcionalidades que la cursada había dejado para el final (SAD §1, "Alcance de la cursada y Fase 2") y corrigió lo que los comercios piloto y QA encontraron en el uso diario:

1. **Compras sugeridas (RF-15):** API de sugerencias y vista previa de pedido agrupada por el proveedor más conveniente, y pantalla `/compras` con la orden lista para copiar o imprimir.
2. **Reporte semanal de márgenes en PDF:** API para n8n, workflow semanal con Gotenberg (ADR-009) y descarga desde la app, con el estado real del reporte en Perfil.
3. **Invitación de colaboradores** por mail desde Perfil (ADR-008).
4. **Catálogo grande:** búsqueda y paginación en insumos, productos, recetas y detalle de proveedor; métricas del panel sobre todo el catálogo, con mediana del margen.
5. **Uso diario:** cantidades de receta en gramos o mililitros, formato es-AR en toda la app, ficha del insumo editable, selector de insumos con teclado, un solo nombre para cada estado de margen, modales y barras fijas en mobile, zona segura de iOS en la app instalada, avisos visibles y confirmación al salir con cambios sin guardar.
6. **Calendario nuevo:** la entrega final pasó al 05/12/2026 por aviso de la docente del 12/11/2026. Se creó el Sprint 7 (21/11 al 04/12) y el congelamiento de funcionalidades quedó el 28/11 (`CHANGELOG.md` `[Unreleased]`, SAD §1 y §6).

No hubo release en este sprint: producción sigue en v0.6.0 y el incremento está en `https://dev.margenx.tech`. El release `v1.0.0` es del Sprint 7 (`#400`).

## 2. Métricas

Fuente: campo Sprint del tablero y GitHub, al 20/11/2026.

| Métrica | Valor |
|---|---|
| Issues del sprint | 35. Al cierre del Sprint 5 solo `#254` y `#328` tenían el Sprint 6 (acta del Sprint 5, §6); 19 issues se crearon el 10/11, 9 el 14/11 con la reorganización del backlog, 4 son seguimientos anteriores (`#307`, `#311`, `#314`, `#329`) y `#406` se sumó el 16/11 desde el reporte de calidad |
| Story Points | 116 en el tablero; 113 completados al 20/11. Los 3 restantes son de `#396` (esta acta), que se completa con su PR. `#406` no tiene estimación |
| Issues cerradas | 34 de 35; queda `#396` |
| PRs mergeados a `develop` desde v0.6.0 | 39 (incluye 4 de Dependabot y `#349`, el cierre del Sprint 5). Además entraron 3 commits directos (`f0f16c8`, `eb840bc` y `9f09d1e`): 42 integraciones en total |
| Commits del período | 42 sin contar merges ([v0.6.0...develop](https://github.com/dgimenezdeveloper/margenx/compare/v0.6.0...develop), al commit `a34bbfb`) |
| Defectos graves abiertos al cierre | 0 (`docs/qa/reporte-calidad-sprint6.md` §1.7). Un defecto menor abierto: H2 |
| Adelantada del Sprint 7 | `#313` (aserciones de la colección de estrés del webhook), cerrada el 20/11 con el PR #422 |
| Reporte de avance del Sprint 6 | No aplica: no hay entregas intermedias; la Entrega 7 quedó integrada a la entrega final del 05/12 (aviso de la docente del 12/11/2026) |

## 3. Hitos por rol

Cada ítem lleva la issue y el PR que la cerró, con el commit en `develop`. El rol sale de quien abrió el PR; en `#362` la issue estaba asignada a Federico Paal y el PR lo abrió Darío Giménez (`[RV424-M4]`).

### A. DevOps, n8n, Scrum Master y frontend (Darío Giménez)
- n8n: resumen de ingesta accionable (`#254`, PR #373, `aef2b06`), enlace de respaldo del mail de alerta (`#329`, PR #372, `0439915`) y reporte semanal en PDF con Gotenberg y ADR-009 (`#391`, PR #416, `806f25f`).
- DevOps: Vitest y coverage-v8 en la misma versión mayor (`#307`, PR #374, `1d7352a`).
- Backend: invitación de colaboradores (`#395`, PR #407, `9c1632a`).
- Frontend: formato es-AR (`#359`, PR #377, `1da18c0`), pantallas públicas con sesión (`#360`, PR #379, `6398712`), paginación y búsqueda (`#350`, PR #410, `302a2da`), panel sobre todo el catálogo (`#351`, PR #414, `5b904e9`), descarga del reporte (`#392`, PR #418, `74e82eb`), pie de página (`#363`, PR #421, `62fa27e`), avisos (`#364`, PR #423, `eeee152`) y retoques visuales (`#362`, PR #424, `a34bbfb`).
- Documentación: cierre del Sprint 5 (`#273`, PR #349, `a5ae1eb`), alcance y calendario al día (`#397`, PR #411, `58f255d`) y esta acta (`#396`).

### B. Backend (Mauricio Barreras)
- Unidad de los insumos unificada en `u` (`#353`, PR #371, `08ab726`), búsqueda por nombre y paginación de presentaciones (`#366`, PR #375, `eefd698`), buckets del histograma y mediana del margen (`#367`, PR #381, `0fda5a8`), productos que usan un insumo (`#368`, PR #386, `9667d72`), compras sugeridas (`#388`, PR #408, `73a7151`) y reporte semanal (`#390`, PR #415, `06ddb9f`).
- Frontend: selector de insumos de la receta (`#357`, PR #420, `19e1cf8`).

### C. Frontend (Federico Paal)
- Cantidades de receta en g/ml (`#352`, PR #370, `3612dc0`), modales y barras fijas en mobile (`#355`, PR #376, `add2b7a`), Perfil sin interruptores que no guardan (`#356`, PR #378, `e96ccb0`), accesibilidad de los campos de producto (`#361`, PR #387, `ddaf2cb`), ficha del insumo (`#354`, PR #413, `847e61c`), pantalla de compras sugeridas (`#389`, PR #417, `69e97c1`) y un solo nombre por estado de margen (`#358`, PR #419, `649dd18`).

### D. QA y enlace con los comercios piloto (Leandro Herrera)
- Pruebas en dispositivos: enlace "Ajustar" en iPhone y guía de instalación (`#365`, PR #380, `fec5434`), pruebas en iPhone y Android de los PR #376, #378 y #379 (`#383`, PR #405, `ac720bd`) y monitoreo de la sesión de Clerk en staging (`#328`, cerrada sin PR).
- Frontend: bandeja de cuarentena (`#311`, PR #385, `19daee1`) y zona segura de iOS (`#406`, PR #412, `e1887ae`).
- Pruebas y proceso: aserciones de la colección de estrés (`#313`, PR #422, `5959eba`) y regla de no incluir atribución de IA (`#314`, PR #409, `2ac799d`).
- Revisiones de QA de los PRs del sprint (§5).

## 4. Sprint Review (21/11/2026)

El incremento del Sprint 6 está desplegado en `https://dev.margenx.tech` (cuenta Demo):

- compras sugeridas (`/compras`);
- reporte semanal en PDF, por mail y como descarga;
- invitación de colaboradores;
- paginación y búsqueda;
- panel sobre todo el catálogo;
- ficha del insumo.

La docente reorganizó el cierre de la cursada (aviso del 12/11/2026): la clase del 21/11 es de consulta y ensayo, y no hay entregas intermedias hasta la entrega final del 05/12. Por eso el incremento se muestra en esa clase, sin una devolución formal que esperar. Si surge una observación, se carga como issue del Sprint 7 y se registra en el acta del Sprint 7.

## 5. Hallazgos de las revisiones de PR

Se completa con la clasificación de los hallazgos de revisión y de la revisión de usabilidad del 20/11.

## 6. Retrospectiva (Start / Stop / Continue)

**Sesión:** 21/11/2026, en la clase presencial, con los cuatro integrantes. El borrador lo preparó el Scrum Master con la evidencia del repositorio; queda pendiente de validación del equipo en la clase del 21/11.

### Cumplimiento de las acciones de la retrospectiva del Sprint 5

| Acción | Resultado |
|---|---|
| Core primero | Cumplido: RF-15, reporte PDF semanal e invitaciones entregados en el sprint |
| Títulos de PR en Conventional Commits | Mejoró (de 24 de 44 a 7 de 35 PRs del equipo), sin llegar a cero |
| Usuarios de QA de Química GyJ en Clerk | Pendiente: pasa a la regresión final (`#399`) |
| Carga repartida | Cumplido: core en los cuatro roles |
| Usabilidad con catálogo grande | Cumplido (06 al 10/11) |

### 🟢 Continuar

1. **Core primero, con el contrato del backend antes que el frontend:** `#366` → `#350` (paginación y búsqueda), `#367` → `#351` (panel), `#368` → `#354` (ficha del insumo), `#388` → `#389` (compras) y `#390` → workflow de n8n (PR #416) → `#392` (reporte PDF). En los cinco casos la API se mergeó antes que la pantalla (fechas de merge de los PRs en GitHub).
2. **Probar con datos de volumen:** el catálogo de 218 insumos y 339 productos mostró que 198 insumos no se podían agregar a ninguna receta (`#350`) y que el histograma y la grilla del panel calculaban sobre 20 productos (`#351`). Con los datos chicos de los seeds no se veía.
3. **QA en dispositivos reales con matriz fechada:** H1 (zona segura de iOS en la app instalada) se detectó el 16/11 y se corrigió el 17/11 (`#406`, PR #412; `docs/qa/reporte-calidad-sprint6.md` §1.7).
4. **Documentar las decisiones mientras se implementan:** ADR-008 (alta de colaboradores por invitación) y ADR-009 (reporte PDF con n8n y Gotenberg), y SAD, especificación y plan de entregas sincronizados (`#397`, PR #411).

### 🔴 Dejar de hacer

1. **Dejar hallazgos sin issue hasta el cierre:** 13 hallazgos I con condición posterior al merge y el defecto H2 (informado al SM el 16/11) llegaron al cierre sin issue. `docs/process/revision-de-prs.md` §6.1 pide crearla al publicar la revisión.
2. **Usar el nombre de la rama como título del PR:** 7 de los 35 PRs del equipo (por ejemplo, `358 sprint6 fe 05 un solo nombre…` y `Unidad-de-los-insumos:-unificar-…`). GitHub propone ese título por defecto y nadie lo corrigió antes del squash, así que quedó en el historial de `develop`.
3. **Concentrar los merges al final:** 20 de las 42 integraciones a `develop` desde v0.6.0 entraron entre el 17 y el 20/11 (`git log --first-parent`), con poco margen para probar en `dev.margenx.tech` antes del cierre.
4. **Evidencia incompleta en los PRs:** faltaron capturas a 360 px (por ejemplo `[RV423-M1]` y `[RV424-M2]`) y la sección "Tipo de Cambio" no siguió la plantilla (`[RV386-M3]`, `[RV410-M1]`, `[RV423-M2]` y `[RV424-M3]`). Además, la parte C de `#383` quedó sin captura ni video (`docs/qa/reporte-calidad-sprint6.md` §1.8).

### 🟡 Empezar (Sprint 7, del 21/11 al 04/12)

| Acción | Responsable | Cómo se mide |
|---|---|---|
| Crear la issue de cada hallazgo I **al publicar la revisión** | Revisor de cada PR (QA: Leandro Herrera) | 0 hallazgos I sin issue al 04/12 |
| Respetar el congelamiento del 28/11: después, solo correcciones de la regresión y documentación | Darío Giménez (SM) | Ningún `feat` mergeado en `develop` después del 28/11 |
| Corregir el título del PR antes de mergear | Cada autor de PR | 0 PRs fuera de Conventional Commits en el Sprint 7 |
| **Preparar la defensa individual:** cada integrante arma una ficha de los PRs que hizo (qué tocó, por qué y cómo se prueba). La docente evalúa la "defensa individual sobre el código que cada uno tocó" (aviso del 12/11/2026) | Cada integrante | Fichas listas para el ensayo general del 04/12 (`#402`) |
| Registro de horas acumulado y checklist de la entrega final (URL viva, repo accesible, README que funciona, datos de prueba cargados y tablero cerrado), que ahora forman parte de la entrega final | Darío Giménez (SM), con las horas de cada integrante | Checklist completo el 04/12 |
| Usuarios de QA de Química GyJ en Clerk (pendiente del Sprint 5) | Leandro Herrera | Todas las colecciones de `backend/tests/postman/` corridas en `#399` |

## 7. Lo que pasa al Sprint 7

| Issue | Motivo |
|---|---|
| Issues de seguimiento de §5 | Hallazgos de las revisiones de PR y de la revisión de usabilidad del 20/11, con severidad y prioridad. |
| H2 del reporte de calidad (formato es-AR en el simulador de precio) | Defecto menor informado el 16/11 (`docs/qa/reporte-calidad-sprint6.md` §1.7). Se clasifica con §5. |
| Verificación de `#406` en iPhone con la app instalada | Pendiente después del despliegue en `dev.margenx.tech` (`docs/qa/reporte-calidad-sprint6.md` §1.7, H1). |
| `#312` Colecciones Newman con datos que se restauran | Seguimiento del Sprint 5; ya está en el Sprint 7, en curso. |

Las issues del Sprint 7 ya están en el tablero: `#393` (Swagger), `#394` (monitor de disponibilidad), `#398` (Lighthouse), `#399` (regresión final), `#400` (release `v1.0.0`), `#401` (entregables finales) y `#402` (defensa). Las funcionalidades cierran el 28/11; desde ese día `develop` solo recibe correcciones y documentación (SAD §6).

## 8. Traspaso al Sprint 7

Darío Giménez sigue como Scrum Master hasta la entrega final (acta del Sprint 4, §5).

- [ ] **Tablero limpio:** 34 de 35 issues del Sprint 6 en `Done`; `#396` pasa a `Done` al mergear su PR.
- [x] **Sin release en el Sprint 6:** producción en v0.6.0; el release `v1.0.0` es `#400`, con el congelamiento del 28/11.
- [ ] **Backlog del Sprint 7 refinado:** las issues `[SPRINT7-*]` están en el tablero y su alcance se ajustó a la consigna de la entrega final; faltan las de seguimiento de §5, H2 incluido.
- [x] **Ambientes operativos:** el 20/11/2026 a las 20:23 (hora de Argentina), `https://api.margenx.tech/api/health` (production) y `https://api-dev.margenx.tech/api/health` (development) respondieron HTTP 200 con `status: ok`, y `https://margenx.tech` y `https://dev.margenx.tech`, HTTP 200.
