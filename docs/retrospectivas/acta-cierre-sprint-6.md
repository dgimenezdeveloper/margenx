# Acta de Cierre de Sprint y Retrospectiva — Sprint 6 (Compras sugeridas, reporte semanal en PDF, invitación de colaboradores y pulido de la app)

**Proyecto:** MargenX — Control de Márgenes en Tiempo Real
**Materia:** Prácticas Profesionales Supervisadas (PPS) / Metodologías Ágiles
**Período del sprint:** 07/11/2026 al 20/11/2026
**Sprint Review:** 21/11/2026, en la clase de pre-entrega
**Fecha de sesión:** 21/11/2026, en la clase presencial (retrospectiva validada por el equipo el 21/11/2026, §6)
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

La clasificación se hizo el 22/11/2026, con la planificación del Sprint 7. Junta cuatro fuentes:

- los 13 hallazgos I de las revisiones de PR del Sprint 6 que llegaron al cierre sin issue (§6, "Dejar de hacer", punto 1);
- el defecto H2 del reporte de calidad;
- la revisión de usabilidad del equipo del 20/11 ("NOTAS DE REVISION" del tablero);
- el recorrido de cliente en staging del 21/11, RC-01 a RC-28 (`docs/qa/reporte-calidad-sprint7.md` §1).

Las issues nuevas usan `[SPRINT7-QA7-nn]` (arreglos), `[SPRINT7-R-0n]` (reenfoque de Compras), `[SPRINT7-SALES-0n]` (módulo de ventas) y `[SPRINT7-DOCS-02]`, para no chocar con los IDs `[SPRINT7-*]` que ya existían. Las de los hallazgos RV llevan la etiqueta `review-followup`.

### 5.1 Hallazgos I de las revisiones de PR y H2

| Hallazgo | Qué falta | Destino |
|---|---|---|
| `[RV371-I2]` | La prueba de integración de unidades no corre en el CI | `#438` |
| `[RV371-I3]` | Unidades y `PUT` de costo verificados en staging | Caso nuevo de la regresión final (`#399`) |
| `[RV374-I1]` | La cobertura del backend no se mide en el CI | `#438` |
| `[RV375-I1]` | Tiempo de respuesta con y sin búsqueda en staging | `#444` |
| `[RV376-I1]` | Pantalla completa en los bottom sheets | Not planned (§5.3) |
| `[RV381-I1]` | Fuente equivocada del margen ponderado en la especificación | `#443` |
| `[RV385-I1]` | "Variaciones recientes" en 0 para el colaborador y ante un error | `#433` |
| `[RV386-I1]` | Prueba del estado de margen con mínimo distinto de 30 % | `#440` |
| `[RV387-I1]` | Pruebas automáticas de accesibilidad con axe | `#442` |
| `[RV410-I1]` | Prueba de respuestas fuera de orden en la lista paginada | `#441` |
| `[RV415-I1]` | Cuerpo del JSON del reporte semanal en `docs/api.md` | `#443` |
| `[RV419-I1]` | Nombres de estado viejos fuera de los componentes del PR | `#430` |
| `[RV422-I1]` | El webhook compara el precio sin redondear | `#439` |
| H2 | Simulador fuera del formato es-AR | `#431` |

La revisión de usabilidad y el recorrido de cliente se clasifican en `docs/qa/reporte-calidad-sprint7.md` §1.5 y §1.6. Cada punto tiene issue o un motivo de not planned.

### 5.2 Mapa de ID a número de issue

Todas están en el Sprint 7 del tablero, con prioridad, tamaño, estimación en SP y fechas. Las dependencias se cargaron como relaciones "Blocked by".

| ID | Issue | Responsable | Prioridad | Depende de |
|---|---|---|---|---|
| QA7-01 | `#426` Bloquear el cambio de unidad de un insumo con recetas o presentaciones | Mauricio Barreras | P1 | — |
| QA7-02 | `#427` Costo manual con proveedor predeterminado | Mauricio Barreras y Federico Paal | P1 | `#426` |
| QA7-03 | `#428` No mostrar al colaborador productos en borrador a $0,00 | Mauricio Barreras | P1 | — |
| QA7-04 | `#429` Perfil: margen global, "(n8n)" y botones duplicados | Federico Paal | P1 | — |
| QA7-05 | `#430` Nombres de estado viejos, margen mediano y rótulos a 360 px | Darío Giménez | P2 | — |
| QA7-06 | `#431` Simulador en formato es-AR | Federico Paal | P2 | — |
| QA7-07 | `#432` Productos: selector con teclado, "+ +", cursor y hovers | Federico Paal | P2 | — |
| QA7-08 | `#433` Insumos: modo oscuro, "Se usa en", historial y "Variaciones recientes" | Federico Paal | P2 | — |
| QA7-09 | `#434` Proveedores: tabla, confirmación, baja y nombres unificados | Federico Paal | P2 | — |
| QA7-10 | `#435` PDF y mails: columna Estado y correo de soporte | Darío Giménez | P2 | — |
| QA7-11 | `#436` Textos para el dueño y Clerk en español rioplatense | Leandro Herrera | P2 | — |
| QA7-12 | `#437` Menú inferior a 360 px y 409 de invitación | Mauricio Barreras | P3 | — |
| QA7-13 | `#438` CI del backend: cobertura e integración con PostgreSQL | Leandro Herrera (revisa Darío Giménez) | P2 | — |
| QA7-14 | `#439` Webhook: precio redondeado a 2 decimales | Mauricio Barreras | P2 | — |
| QA7-15 | `#440` Prueba del estado de margen con mínimo propio | Mauricio Barreras | P3 | — |
| QA7-16 | `#441` Prueba de respuestas fuera de orden | Federico Paal | P3 | — |
| QA7-17 | `#442` Pruebas automáticas de accesibilidad con axe | Leandro Herrera y Federico Paal | P2 | `#398` |
| QA7-18 | `#443` Especificación funcional y contrato del reporte en `api.md` | Mauricio Barreras (revisa Leandro Herrera) | P3 | — |
| QA7-19 | `#444` Tiempo de respuesta con y sin búsqueda | Leandro Herrera | P3 | — |
| R-01 | `#445` Compras sugeridas: impacto en el margen (backend) | Mauricio Barreras | P1 | `#447` (solo el texto del ADR-010) |
| R-02 | `#446` Compras sugeridas como "Impacto en el margen" (frontend) | Federico Paal | P1 | `#445` |
| SALES-00 | `#447` ADR-010, control de módulos y modelo de ventas | Darío Giménez | P1 | — |
| SALES-01 | `#448` Venta rápida con ticket no fiscal | Darío Giménez | P1 | `#447` |
| SALES-02 | `#449` Turnos y cierre de caja | Darío Giménez | P1 | `#447` |
| SALES-03 | `#450` Ganancia real en el panel y en el reporte semanal | Darío Giménez | P1 | `#448` |
| DOCS-02 | `#451` Hoja de ruta de la Fase 2 y milestones | Darío Giménez | P2 | — |

Además, `#400` (release) queda bloqueada por `#450`, por la decisión del 28/11 sobre el módulo de ventas.

### 5.3 Not planned, con su motivo

| Origen | Tema | Motivo |
|---|---|---|
| `[RV376-I1]` | Pantalla completa en los bottom sheets | El diálogo ya se adaptó, y cambiarlo es riesgo antes del congelamiento |
| Revisión de usabilidad | Impedir la baja de un proveedor con insumos predeterminados | El diálogo actual informa y el insumo conserva su costo. El texto se simplifica en `#434` |
| RC-13 | "Superávit" con mínimo ≥ 60 % | Es la regla acordada en `#367`. Se aclara en el manual |
| RC-07 | "Documentación" del pie lleva a GitHub | El manual se entrega en `#401` |
| `[RV371-I3]` | Verificación en staging | Sin issue propia: caso nuevo de `#399` |
| Datos de staging | Restos de pruebas en la cuenta Demo (Medialunas a $13, Champinión) | Sin issue propia: reseed antes de la defensa, sumado a `#400` |

### 5.4 Cambio de alcance del 22/11/2026: módulo de ventas y Fase 2

En la clase del 21/11, la docente propuso ofrecer al emprendedor una solución inmediata (vender con ticket) como puerta de entrada al control de margen. El 22/11 el equipo acordó:

- **Entra en la v1.0.0, detrás de un control de módulos por plan y por cuenta:** ventas con ticket no fiscal, caja por turnos y ganancia real (`#447` a `#450`). Se prende solo en la cuenta Demo de staging. El 28/11 se decide si se prende en la cuenta Demo de producción (`#450`). En los dos casos, el release v1.0.0 sale el 02/12.
- **Compras sugeridas mide el impacto en el margen** (`#445` y `#446`). Se quitan la calculadora de bultos y el pedido semanal, que suponían cantidades sin stock (RC-16 a RC-19).
- **Pasan a la Fase 2:** stock de insumos, compras con pedido a proveedores, reposición con cantidades y facturación de ARCA. El monitor de disponibilidad (`#394`) se sacó del Sprint 7 y quedó en el milestone v1.1, porque el SM toma el módulo de ventas.
- La decisión y sus motivos quedan en el **ADR-010** (`docs/adr/0010-modulo-de-ventas-y-control-de-modulos.md`, `#447`). La hoja de ruta posterior a la cursada es `#451`.
- **Orden de corte:** cada integrante trabaja por prioridad (P1, P2, P3). Lo que no esté mergeado el 28/11 se trata así: P3 se cierra como not planned con su motivo, P2 se decide en la daily del 28/11 y el módulo de ventas sigue la decisión de `#450`. El módulo nunca desplaza al release (`#400`) ni a los entregables (`#401`).

## 6. Retrospectiva (Start / Stop / Continue)

**Sesión:** 21/11/2026, en la clase presencial, con los cuatro integrantes. El borrador lo preparó el Scrum Master con la evidencia del repositorio. Validada por el equipo (Darío Giménez, Federico Paal, Mauricio Barreras y Leandro Herrera) el 21/11/2026. La validación fue en persona, en la clase del 21/11, después de que cada integrante leyó las dos actas. El 22/11/2026 el Tech Lead decidió no pedir además la confirmación por escrito en el PR que preveía la estrategia de QA de `#396`, y lo dejó registrado acá y en la issue.

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
| `#426` a `#446` | Arreglos y reenfoque de Compras: hallazgos de las revisiones de PR, de la revisión de usabilidad del 20/11 y del recorrido de cliente del 21/11, con severidad y prioridad (§5.2). |
| `#431` (H2 del reporte de calidad) | Formato es-AR en el simulador de precio, defecto menor informado el 16/11 (`docs/qa/reporte-calidad-sprint6.md` §1.7). |
| `#447` a `#451` | Módulo de ventas y hoja de ruta, por el cambio de alcance del 22/11 (§5.4). |
| Verificación de `#406` en iPhone con la app instalada | Pendiente después del despliegue en `dev.margenx.tech` (`docs/qa/reporte-calidad-sprint6.md` §1.7, H1). |
| `#312` Colecciones Newman con datos que se restauran | Seguimiento del Sprint 5; ya está en el Sprint 7, en curso. |

Las issues del Sprint 7 que ya estaban en el tablero: `#393` (Swagger, con el vencimiento adelantado al 24/11 porque los PRs de ventas suman sus rutas), `#398` (Lighthouse), `#399` (regresión final), `#400` (release `v1.0.0`), `#401` (entregables finales) y `#402` (defensa). `#394` (monitor de disponibilidad) pasó al milestone v1.1 (§5.4). Las funcionalidades cierran el 28/11; desde ese día `develop` solo recibe correcciones y documentación (SAD §6).

## 8. Traspaso al Sprint 7

Darío Giménez sigue como Scrum Master hasta la entrega final (acta del Sprint 4, §5).

- [ ] **Tablero limpio:** 34 de 35 issues del Sprint 6 en `Done`; `#396` pasa a `Done` al mergear su PR.
- [x] **Sin release en el Sprint 6:** producción en v0.6.0; el release `v1.0.0` es `#400`, con el congelamiento del 28/11.
- [x] **Backlog del Sprint 7 refinado:** las issues `[SPRINT7-*]` están en el tablero y su alcance se ajustó a la consigna de la entrega final. El 22/11 se sumaron las de seguimiento de §5, H2 incluido (`#426` a `#446`), y las del módulo de ventas y la hoja de ruta (`#447` a `#451`). Ese mismo día pasaron a `Done` en el tablero los ítems `#3`, `#4`, `#226` y `#228`, que ya estaban cerrados o mergeados en GitHub.
- [x] **Ambientes operativos:** el 20/11/2026 a las 20:23 (hora de Argentina), `https://api.margenx.tech/api/health` (production) y `https://api-dev.margenx.tech/api/health` (development) respondieron HTTP 200 con `status: ok`, y `https://margenx.tech` y `https://dev.margenx.tech`, HTTP 200.
