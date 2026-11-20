# Acta de Cierre de Sprint y Retrospectiva — Sprint 6 (Compras sugeridas, reporte semanal en PDF, invitación de colaboradores y pulido de la app)

**Proyecto:** MargenX — Control de Márgenes en Tiempo Real
**Materia:** Prácticas Profesionales Supervisadas (PPS) / Metodologías Ágiles
**Período del sprint:** 07/11/2026 al 20/11/2026
**Sprint Review:** 21/11/2026, en la clase de pre-entrega
**Fecha de sesión:** PENDIENTE — fecha y hora de la retrospectiva
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
| PRs mergeados a `develop` desde v0.6.0 | 39 (incluye 4 de Dependabot y `#349`, el cierre del Sprint 5) |
| Commits del período | 42 sin contar merges ([v0.6.0...develop](https://github.com/dgimenezdeveloper/margenx/compare/v0.6.0...develop), al commit `a34bbfb`) |
| Defectos graves abiertos al cierre | 0 (`docs/qa/reporte-calidad-sprint6.md` §1.7). Un defecto menor abierto: H2 |
| Adelantada del Sprint 7 | `#313` (aserciones de la colección de estrés del webhook), cerrada el 20/11 con el PR #422 |

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

PENDIENTE — se completa después de la clase del 21/11: qué se mostró (compras sugeridas, reporte semanal y deuda resuelta), lo que dijo la docente y la issue creada por cada observación.

## 5. Hallazgos de las revisiones de PR

Recuento de los IDs `[RV<PR>-<S><n>]` publicados en los PRs mergeados desde v0.6.0, sin contar los del cierre del Sprint 5 (PR #344 y #345), según `docs/process/revision-de-prs.md` §6.

| Severidad | Cantidad | Estado |
|---|---|---|
| B | 35 | Resueltos antes del merge (ningún PR se mergeó con un B abierto) |
| I | 29 | 16 resueltos en el mismo PR o en otra issue del sprint; 13 sin issue de seguimiento al 20/11 (tabla de abajo) |
| M | 123 | Se llevan a la retrospectiva (§6) |

I resueltos: `[RV370-I1]` a `[RV370-I3]`, `[RV371-I1]`, `[RV375-I2]`, `[RV377-I1]`, `[RV379-I1]` (con `#383`), `[RV405-I1]`, `[RV407-I1]`, `[RV407-I2]`, `[RV408-I1]`, `[RV413-I1]`, `[RV417-I1]` a `[RV417-I3]` y `[RV420-I1]`.

I que pasan al Sprint 7 con issue de seguimiento (`review-followup`):

| ID | PR | Qué falta | Issue |
|---|---|---|---|
| `[RV371-I2]` | #371 | Correr las pruebas de integración del backend en el CI, con PostgreSQL | PENDIENTE |
| `[RV371-I3]` | #371 | Verificar la migración de unidades con los datos de staging y, después del release, en producción | PENDIENTE |
| `[RV374-I1]` | #374 | Medir la cobertura del backend en el CI | PENDIENTE |
| `[RV375-I1]` | #375 | Medir en staging los tiempos de la búsqueda | PENDIENTE |
| `[RV376-I1]` | #376 | Decidir si los diálogos van a pantalla completa en mobile | PENDIENTE |
| `[RV381-I1]` | #381 | Correcciones en la especificación funcional sobre las métricas del panel | PENDIENTE |
| `[RV385-I1]` | #385 | Ocultar "Variaciones recientes" al colaborador y no mostrar 0 cuando falla la consulta de cuarentena | PENDIENTE |
| `[RV386-I1]` | #386 | Probar que el estado de margen usa el mínimo propio de cada producto | PENDIENTE |
| `[RV387-I1]` | #387 | Prueba automática de accesibilidad | PENDIENTE |
| `[RV410-I1]` | #410 | Probar que una respuesta vieja no pise a la nueva en la búsqueda | PENDIENTE |
| `[RV415-I1]` | #415 | Documentar en `docs/api.md` los campos de la respuesta del reporte | PENDIENTE |
| `[RV419-I1]` | #419 | Nombres viejos de los estados de margen fuera de los componentes del PR | PENDIENTE |
| `[RV422-I1]` | #422 | El webhook nunca da `unchanged` para un precio con más de 2 decimales | PENDIENTE |

## 6. Retrospectiva (Start / Stop / Continue)

### Datos para la sesión

Hechos del sprint que el equipo usó como punto de partida:

- **Títulos de PR fuera de Conventional Commits:** 9 de los 35 PRs del equipo (#371, #374, #376, #378, #381, #387, #413, #417 y #419) usaron el nombre de la rama u otro formato, y así quedaron en el historial de `develop`, porque el Squash and Merge toma el título del PR.
- **Evidencia visual incompleta:** varias revisiones pidieron capturas a 360 px en claro y oscuro que faltaban (por ejemplo `[RV423-M1]` y `[RV424-M2]`).
- **"Tipo de Cambio" fuera de la plantilla del PR:** `[RV386-M3]`, `[RV410-M1]`, `[RV423-M2]` y `[RV424-M3]`.
- **Seguimientos sin issue:** 13 hallazgos I quedaron sin issue al cierre (§5), aunque la regla pide crearlas al publicar la revisión.

### Puntos del equipo

PENDIENTE — aportes de los cuatro integrantes.

| Categoría | Puntos | Responsable |
|---|---|---|
| 🟢 Continuar | PENDIENTE | |
| 🔴 Dejar de hacer | PENDIENTE | |
| 🟡 Empezar | PENDIENTE | |

## 7. Lo que pasa al Sprint 7

| Issue | Motivo |
|---|---|
| Las 13 issues de seguimiento de §5 | Hallazgos I de las revisiones del Sprint 6. |
| H2 del reporte de calidad (formato es-AR en el simulador de precio) | Defecto menor informado el 16/11 (`docs/qa/reporte-calidad-sprint6.md` §1.7). Issue: PENDIENTE. |
| Verificación de `#406` en iPhone con la app instalada | Pendiente después del despliegue en `dev.margenx.tech` (`docs/qa/reporte-calidad-sprint6.md` §1.7, H1). |
| `#312` Colecciones Newman con datos que se restauran | Seguimiento del Sprint 5; ya está en el Sprint 7, en curso. |
| Observaciones de la Sprint Review | Ver §4. |

Las issues del Sprint 7 ya están en el tablero: `#393` (Swagger), `#394` (monitor de disponibilidad), `#398` (Lighthouse), `#399` (regresión final), `#400` (release `v1.0.0`), `#401` (entregables finales) y `#402` (defensa). Las funcionalidades cierran el 28/11; desde ese día `develop` solo recibe correcciones y documentación (SAD §6).

## 8. Traspaso al Sprint 7

Darío Giménez sigue como Scrum Master hasta la entrega final (acta del Sprint 4, §5).

- [ ] **Tablero limpio:** 34 de 35 issues del Sprint 6 en `Done`; `#396` pasa a `Done` al mergear su PR.
- [x] **Sin release en el Sprint 6:** producción en v0.6.0; el release `v1.0.0` es `#400`, con el congelamiento del 28/11.
- [ ] **Backlog del Sprint 7 refinado:** las issues `[SPRINT7-*]` están en el tablero; faltan las de seguimiento de §5 y la de H2.
- [ ] **Ambientes operativos:** healthcheck de `https://margenx.tech` y `https://dev.margenx.tech` en HTTP 200 — PENDIENTE de verificar el día de la Review.
