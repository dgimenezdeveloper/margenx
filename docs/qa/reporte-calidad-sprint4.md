# Reporte de Calidad — Suite de Regresión General Sprint 4

**Proyecto:** MargenX

**Issue:** #177 — [SPRINT4-QA-04] Suite de Regresión General y Matriz de Defectos

**Responsable de QA:** Leandro Herrera

**Estado del documento:** Borrador / condicionado — pendiente de decisión de SM/PO sobre la excepción propuesta en §5. No se marca "Firmado por QA" mientras el DoD propio (Staging, Discord) siga incompleto.

**Última actualización:** 2026-10-23 (Revisión 2 — responde a la review "Request changes" del SM sobre este mismo reporte)

---

## 0. Qué cambió en esta revisión

El SM re-ejecutó la regresión contra la misma rama y confirmó los números de backend/cobertura/Newman, pero encontró tres bloqueantes reales en cómo este documento los presentaba. Esta revisión los resuelve corriendo lo que faltaba (no solo reescribiendo texto):

- **B1 — Matriz no reconciliada:** se reescribió §4 con una fila por aserción fallida; la suma ahora coincide con los totales de §3.
- **B2 — Alcance declarado no coincidía con lo ejecutado:** se corrieron las 2 colecciones Newman y los 2 specs E2E que faltaban (Colaborador RBAC, Alertas de margen, `home.spec.ts`, `margin-recalculation.spec.ts`), más vitest/lint/build de frontend (issue #217). Lo que sigue genuinely sin cubrir está en §2.2, explícito.
- **B3 — Veredicto y firma sin sustento:** §5 ya no afirma "se cumple"; propone una excepción y deja la decisión a SM/PO. El documento bajó de "Firmado por QA" a "Borrador / condicionado". QA4-05 se reformuló como intermitente (se reprodujo fallando de nuevo en esta revisión, a 2059ms). La decisión de `salePrice: 0` ahora cita dónde vive en el código y deja constancia de que no hay ADR/issue que la respalde formalmente.

Los items **No bloqueantes** (NB-1 a NB-7) de la review quedan para la issue de limpieza de colecciones que se abre como seguimiento — no se tocan acá, según lo pedido.

## 1. Objetivo

Certificar el release del Sprint 4 corriendo de punta a punta la batería de pruebas automatizadas del repositorio — unitarias de backend y frontend, las 6 colecciones Newman y las 5 suites E2E — contra el código ya mergeado a `develop` (hasta `af672fe`, que incluye #213, #215, #216 y #217), y consolidar en un único documento qué pasó, qué no, y qué de lo que no pasó es un defecto real de la aplicación versus deuda de las propias herramientas de QA.

## 2. Alcance y metodología

**Nota sobre el entorno de ejecución:** la corrida documentada en este reporte es **local** (Postgres + backend + frontend en este entorno de desarrollo), no contra Staging (`https://dev.margenx.tech`) como pide el Gherkin de la issue. Este entorno no tiene salida de red hacia ese dominio ni credenciales para él. Correrlo contra Staging real queda pendiente de que alguien del equipo con acceso lo ejecute — los pasos son exactamente los de §2.1, apuntando `VITE_API_URL`/`baseUrl` de Newman a ese host.

**Nota sobre "Ejecución en paralelo" (Estrategia de Pruebas de la issue):** se corrió todo con `workers: 1` / `newman run` secuencial, **a propósito, no por limitación del entorno**. La review de PR #216 (issue #175) encontró y confirmó que `cascade-recalculation.spec.ts` y `margin-recalculation.spec.ts` mutan el mismo insumo compartido del seed (Harina 000) y se pisan entre sí con 2+ workers — por eso el propio `playwright.config.ts` fija `workers: 1` de forma permanente desde ese PR. Correr esta regresión en paralelo habría reproducido exactamente ese defecto ya conocido y invalidado los resultados. No es una ejecución degradada: es la única forma de que el resultado sea confiable con el estado actual de la suite. Por este mismo motivo, la "Estrategia de Pruebas (QA)" de la issue no se tilda como cumplida sin aclaración — ver §6.

**Nota sobre Discord:** no se cuenta con acceso al webhook de `#notificaciones-infra` desde este entorno. El ítem "Estado de build de CI reportado en verde en Discord" del DoD queda pendiente de que QA lo postee a mano una vez que el pipeline corra en verde sobre el PR real.

### 2.1 Qué se corrió

1. **Backend:** `npx vitest run --coverage` desde `backend/` (171 tests), con foco de cobertura en `marginCalculator.ts`.
2. **Frontend** (nuevo en esta revisión — issue #217, faltaba en la v1): `npx vitest run` (10 tests), `npx eslint .` y `npx tsc -b && npx vite build`.
3. **Las 6 colecciones Newman** (desde `backend/tests/postman/`, backend local seedeado, tokens de Clerk reales de corta duración vía `scripts/get-test-token.ts`):
   - `MargenX - Insumos API.postman_collection.json`
   - `MargenX - Productos API.postman_collection.json`
   - `MargenX - Proveedores y Conversiones.postman_collection.json`
   - `MargenX - Webhooks API.postman_collection.json`
   - `MargenX - Colaborador RBAC API.postman_collection.json` — **nueva en esta revisión**
   - `MargenX - Alertas de margen (Insumos).postman_collection.json` — **nueva en esta revisión**
4. **Las 5 suites E2E Playwright** (`npx playwright test`, Chromium headless, `workers: 1`):
   - `home.spec.ts` — **nueva en esta revisión**
   - `smoke.spec.ts` (Auth)
   - `rbac-security.spec.ts` (RBAC, 4 casos)
   - `cascade-recalculation.spec.ts` (issue #175)
   - `margin-recalculation.spec.ts` — **nueva en esta revisión**

### 2.2 Qué no se cubrió (explícito, no implícito)

- **Staging.** Ver nota más arriba — nadie en este entorno tiene acceso de red a `dev.margenx.tech`.
- **Cuarentena de precios** (la feature central del sprint, #216/#217): ninguna de las 6 colecciones Newman ni de las 5 suites E2E ejercita el flujo de Liberar/Rechazar. La única cobertura automatizada es unitaria (servicios de cuarentena en `backend/src/services`); la verificación de API, aislamiento multiempresa, RBAC y UI (360/1440px) que reporta el SM en su revisión fue manual y la hizo el SM, no esta corrida de QA.
- **Contrato de Webhooks "cuarentena-aware".** La colección `Webhooks API` solo cubre autenticación y límite de tamaño de payload (ver QA4-03 más abajo sobre su mensaje desactualizado); no tiene aserciones sobre los campos `quarantined`, `duplicates`, `discarded` ni `discardedCodes` que la evolución del contrato post-cuarentena agregó a la respuesta.
- **Discord.** Ver nota más arriba.

Para cerrar cobertura completa de #177 antes de un tag de release, correspondería abrir el flujo de cuarentena en Newman/E2E y correr esta misma batería contra Staging — ninguna de las dos cosas se hizo acá.

## 3. Resultados por capa

| Capa | Archivo(s) | Ejecutados | Fallidos | Duración |
|---|---|---:|---:|---:|
| Backend unitarios | 12 archivos (`vitest`) | 171 tests | **0** | ~4-5s (varía entre corridas) |
| Frontend unitarios | 3 archivos (`vitest`) | 10 tests | **0** | 6.17s |
| Frontend lint (`eslint .`) | — | — | **0** | — |
| Frontend build (`tsc -b && vite build`) | — | — | **0** | 4.12s (advertencia de tamaño de chunk, preexistente, no bloqueante) |
| Newman — Insumos | 11 requests / 29 aserciones | 29 | **2** | 695ms |
| Newman — Productos | 7 requests / 24 aserciones | 24 | **5** | 444ms |
| Newman — Proveedores y Conversiones | 19 requests / 51 aserciones | 51 | **0** | 798ms |
| Newman — Webhooks | 5 requests / 10 aserciones | 10 | **1** | 319ms |
| Newman — Colaborador RBAC | 5 requests / 10 aserciones | 10 | **0** | 306ms |
| Newman — Alertas de margen (Insumos) | 4 requests / 12 aserciones | 12 | **3** | 338ms |
| E2E — Auth (`smoke.spec.ts`) | 1 test | 1 | **1** | ~2.0-2.2s (intermitente, ver QA4-05) |
| E2E — Home (`home.spec.ts`) | 2 tests | 2 | **0** | — |
| E2E — RBAC (`rbac-security.spec.ts`) | 4 tests | 4 | **0** | — |
| E2E — Cascade Recalculation | 1 test | 1 | **0** | — |
| E2E — Margin Recalculation + Aislamiento | 2 tests | 2 | **0** | — |
| **Total** | | **329** | **12** | 1.4min (los 12 tests E2E, un solo worker) |

De los **12 fallos**, **0 son defectos confirmados de la aplicación**: 11 son colecciones Newman que validan un contrato anterior al vigente o dependen del orden interno de sus propios requests, y 1 es un umbral de timing E2E sensible a la velocidad de la máquina. Hay una excepción parcial (QA4-02, `salePrice: 0`): el código marca el comportamiento como intencional, pero no hay un ADR o issue que lo documente formalmente — ver matriz de §4 y el detalle en esa fila. Aparte de estos 12, se confirmó un defecto adicional de **tooling** (no una aserción fallida, así que no está contado en los 12): el wrapper `run-tests.sh` de Insumos tiene un `accountId` hardcodeado que no corresponde a ninguna cuenta real del seed — ver QA4-04.

### 3.1 Evidencia visual

Capturas reales tomadas durante esta misma corrida (no mockups), con sesiones de Clerk reales vía `scripts/get-test-token.ts`/`@clerk/testing`. Se adjuntan como archivos aparte al PR (informe UNaB) — no se versionan en el repo:

- **`qa-regresion-01-auth-dashboard.png`** — Auth: `/dashboard` tras login real como `admin.panaderia@hotmail.com`, sin pasar por `/login` (issue base de `smoke.spec.ts`).
- **`qa-regresion-02-cascade-badge-critico.png`** — Cascade Recalculation: `/productos` después de subir el costo de Harina 000 a $4.500 — "Pan Flauta — 1 Kg" con el badge **"Crítico (-6.4%)"**, igual que afirma el test automatizado de `cascade-recalculation.spec.ts`.
- **`qa-regresion-03-rbac-colaborador-sin-margenes.png`** — RBAC: la misma pantalla `/productos`, sesión `colab.panaderia@hotmail.com` — sin columna "Costo" ni "Margen", sin tab "Insumos" en la barra superior.
- **`qa-regresion-04-rbac-insumos-redirige.png`** — RBAC: intento de acceso directo a `/insumos` como COLLABORATOR — la URL final es `/productos` (redirección confirmada, no solo el tab oculto).

### 3.2 Cobertura de `marginCalculator.ts`

`@vitest/coverage-v8`, agregado como devDependency para este reporte (no existía cobertura configurada en el repo): **94.52%** statements, **90.19%** branch, **100%** funciones, **94.52%** líneas.

Líneas sin cubrir (confirmadas línea por línea en esta revisión, vía el reporte `json` de `v8`): **59, 60, 67, 68, 129, 130, 131, 132**. Las líneas 59-60 son la guarda `packagePrice.lte(0)` de `calculateUnitCost` — una validación de dinero, no un caso límite trivial; la v1 de este reporte las omitió de la lista. 67-68 son la guarda de monto máximo de la misma función; 129-132 son guardas equivalentes en el cálculo de métricas de producto. Son rutas de validación de borde que no se ejercitan en los tests actuales — no caminos de negocio del happy path, pero tampoco "sin importancia": matizando la frase de la v1, estas sí son validaciones de dinero sin cobertura, ninguna crítica para el release pero sí candidatas a un test adicional en la issue de seguimiento.

## 4. Matriz de Defectos

Taxonomía de la issue: **Crítico (Bloqueante)** / **Mayor** / **Menor (Visual)**. Una fila por aserción fallida; el mismo ID de matriz se repite cuando dos aserciones comparten la misma causa raíz. La suma de filas (12) coincide con el total de fallos de §3.

| ID | Severidad | Colección / Capa | Request | Aserción fallida | Mensaje real | Causa raíz |
|---|---|---|---|---|---|---|
| QA4-01 | Mayor | Newman — Insumos | `GET Listar insumos (200)` | "El body respeta el schema vigente (sin paginar, issue #36 pendiente)" | `data should have required property 'ingredients'` | La API pagina (`{data, meta}`) desde la issue #36; la colección valida el contrato plano anterior. No es bug de la app. |
| QA4-01 | Mayor | Newman — Insumos | `GET Listar insumos (200)` | "El insumo creado en este run aparece en el listado de su cuenta" | `TypeError: Cannot read properties of undefined (reading 'map')` | Misma causa que la fila anterior: el script intenta `response.ingredients.map(...)`, y esa clave ya no existe. |
| QA4-02 | Mayor* | Newman — Productos | `POST Validación - salePrice en cero (400)` | "Status code 400" | `expected response to have status code 400 but got 201` | `salePrice: 0` es aceptado a propósito (`decimal(body.salePrice, 'salePrice', true)`, `backend/src/routes/products.ts:92` y `:236`, flag `allowZero`). *No hay ADR/issue que documente esta decisión — solo el comentario inline del código (introducido en el PR #115, sin explicación individual). Se abre la consulta formal a PO/SM. |
| QA4-02 | Mayor* | Newman — Productos | `POST Validación - salePrice en cero (400)` | "El body respeta el schema de error uniforme" | `data should have required property 'error'` | Misma causa: al no rechazarse, la respuesta es un éxito sin campo `error` que validar. |
| QA4-02 | Mayor* | Newman — Productos | `POST Validación - salePrice en cero (400)` | "El mensaje indica que el precio debe ser mayor a cero" | `the given combination of arguments (undefined and string) is invalid for this assertion` | Misma causa: no hay mensaje de error que inspeccionar porque la petición no fue rechazada. |
| QA4-02 | Mayor* | Newman — Productos | `POST Validación - salePrice en cero (400)` | "No se creó ningún registro (respuesta no incluye un product)" | `expected { product: {...} } to not have property 'product'` | Misma causa, y con efecto colateral real: queda un producto de precio $0 persistido en la base (sin `DELETE /api/products/:id` para limpiarlo). |
| QA4-03 | Mayor | Newman — Webhooks | `04 - Acepta payload válido para cuenta activa` | "Respuesta confirma recepción del lote" | `expected undefined to deeply equal 'Lote de precios recibido correctament…'` | El contrato real hoy es `{received, updated, unchanged, quarantined, duplicates, discarded, discardedCodes, account, criticalProductsAlerts}` (evolucionó con #200/#208 y cuarentena); la colección valida el contrato anterior (`message`/`processedItems`). No es bug de la app. |
| QA4-04 (no contado en los 12) | Mayor | Tooling — `run-tests.sh` (Insumos) | — | — | — | El wrapper hardcodea `accountId_cuentaA=d45e2fab-df12-4baa-b597-6f2da538cef5`, un ID que no corresponde a ninguna cuenta del seed actual. Correrlo tal cual (sin overridear el valor a mano) agrega un 3er fallo engañoso ("El insumo creado pertenece a la Cuenta A") en el mismo request de Insumos — confirmado reproduciéndolo en esta revisión. No es una aserción del contrato de la API, es un bug del propio script, por eso no suma a los 12 de arriba. |
| QA4-05 | Menor | E2E — `smoke.spec.ts` | — | "accede a /dashboard ya autenticado" | `Expected: < 2000  Received: 2059` (esta revisión); `2150-2180ms` (corrida original) | Umbral local de `<2000ms` sensible a la velocidad de la CPU del entorno — **intermitente**, no un fallo consistente: el SM lo reprodujo pasando 3/3 en su máquina (1.5-1.6s), acá volvió a fallar (2059ms) en esta misma revisión. En CI usa `<5000ms` y no falla (confirmado en PR #216). No bloqueante. |
| QA4-06 | Mayor | Newman — Productos | `POST Validación - salePrice negativo (400)` | "El mensaje indica que el precio debe ser numérico" | `expected 'El campo "salePrice" debe ser mayor o…' to include 'numérico'` | A diferencia de QA4-02, esta petición sí retorna 400 correctamente — solo cambió el texto del mensaje de error y la colección no se actualizó. Causa distinta a QA4-02, por eso tiene ID propio. |
| QA4-07 | Mayor | Newman — Alertas de margen (Insumos) | `02 - Sin cambio real` | "No hubo cambio real" | `expected 4 to deeply equal +0` | El request 02 asume que no hubo cambio de costo, pero depende del estado que deja el request 01 sobre el mismo insumo (`30b00001-...-001`) dentro de la misma corrida — es una dependencia de orden interna de la colección, no un contrato roto de la API. |
| QA4-08 | Mayor | Newman — Alertas de margen (Insumos) | `03 - Colaborador: 403 Forbidden` | "Se bloquea la mutación por RBAC" | `expected 'Acceso denegado. Se requiere rol ADMI…' to include 'no autorizado'` | El mensaje real de RBAC es `"Acceso denegado. Se requiere rol ADMIN."` (`backend/src/middlewares/rbac.ts:52`); la colección espera un texto distinto que nunca se actualizó. |
| QA4-09 | Mayor | Newman — Alertas de margen (Insumos) | `04 - Alert dispatch` | "La respuesta sigue el contrato esperado por el frontend" | `expected {...} to have keys 'ingredient', 'affectedProductsCount', and 'criticalProducts'` | La respuesta real agrega también `affectedProducts` (lista completa, issue #211 — `backend/src/routes/ingredients.ts:302-313`), además de `affectedProductsCount`. La colección exige exactamente esas 3 claves y no se actualizó tras #211. Cambio aditivo, no rompe al frontend real. |

**Ningún hallazgo es Crítico (Bloqueante).** La causa raíz dominante (QA4-01, 03, 06, 08, 09: 6 de los 12) es la misma repetida: colecciones Postman que no se actualizaron en el mismo PR que cambió el contrato que validan. QA4-02 (4 de los 12) es un caso aparte con una pregunta de producto abierta (ver nota del `allowZero`). QA4-07 es un problema de diseño de la propia colección (orden/estado compartido entre sus requests), no de la API. QA4-05 es sensibilidad de entorno ya triada. QA4-04 es un bug de tooling, no contado en los 12. Se recomienda abrir la issue de seguimiento "QA: actualizar colecciones Newman al contrato vigente" (cubre QA4-01, 03, 04, 06, 08, 09 y la limpieza de datos zombie que deja QA4-02/07) — no se corrige en este PR porque el alcance de #177 es ejecutar y documentar, no modificar la suite.

## 5. Veredicto del Gherkin de la issue

```gherkin
Entonces el 100% de los tests críticos deben finalizar en Passed
Y no debe existir ningún defecto bloqueante sin mitigar en el backlog
```

**Literalmente, no se cumple:** hubo 12 fallos (no 9, ver B1 de la review que corrigió este conteo) sobre el conjunto real ejecutado, y la corrida fue local, no contra Staging como pide el Gherkin.

QA propone una excepción, no una afirmación de cumplimiento: de los 12 fallos, **0 son defectos confirmados de la aplicación** (11 son deuda de tooling/colecciones desactualizadas o dependencias de orden en la propia suite de pruebas, 1 es sensibilidad de entorno ya triada e intermitente) — ver matriz de §4. La única pieza sin cerrar del todo es QA4-02 (`salePrice: 0`), donde el código es consistente con una decisión de producto intencional pero no hay documento formal que la respalde.

**Esta excepción la propone QA; decidir si alcanza para avanzar con el release sin volver a correr contra Staging y sin las colecciones corregidas le corresponde a SM/PO**, no a QA. Las dos alternativas son: (a) aceptar la excepción y abrir la issue de colecciones como seguimiento no bloqueante, o (b) corregir las 6 colecciones Newman al contrato vigente y volver a correr antes de dar por cerrada la regresión.

## 6. Definition of Done

- [ ] Reporte firmado por QA y versionado en `docs/qa/` — **versionado**, pero no firmado: el estado del documento es "Borrador / condicionado" (ver header) hasta que SM/PO decida sobre la excepción de §5.
- [ ] Estado de build de GitHub Actions reportado en verde en Discord — pendiente, requiere que QA lo postee a mano una vez que CI corra en verde sobre el PR real (sin acceso al webhook desde este entorno, ver §2).
- [x] PR abierto hacia `develop`.
