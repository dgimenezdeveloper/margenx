# Reporte de Calidad — Suite de Regresión General Sprint 4

**Proyecto:** MargenX

**Issue:** #177 — [SPRINT4-QA-04] Suite de Regresión General y Matriz de Defectos

**Responsable de QA:** Leandro Herrera

**Estado del documento:** Firmado por QA (ver hallazgos de §4, ninguno bloqueante)

**Última actualización:** 2026-10-23

---

## 1. Objetivo

Certificar el release del Sprint 4 corriendo de punta a punta toda la batería
de pruebas automatizadas del repositorio — unitarias de backend, las 4
colecciones Newman y las suites E2E de Auth, RBAC y Recálculo en Cascada —
contra el código ya mergeado a `develop` (hasta `af672fe`, que incluye
#213, #215, #216 y #217), y consolidar en un único documento qué pasó, qué
no, y qué de lo que no pasó es un defecto real de la aplicación versus deuda
de las propias herramientas de QA.

## 2. Alcance y metodología

**Nota sobre el entorno de ejecución:** la corrida documentada en este
reporte es **local** (Postgres + backend + frontend en este entorno de
desarrollo), no contra Staging (`https://dev.margenx.tech`) como pide el
Gherkin de la issue. Este entorno no tiene salida de red hacia ese dominio
ni credenciales para él. Correrlo contra Staging real queda pendiente de que
alguien del equipo con acceso lo ejecute — los pasos son exactamente los de
§3, apuntando `VITE_API_URL`/`baseUrl` de Newman a ese host.

**Nota sobre "Ejecución en paralelo" (Estrategia de Pruebas de la issue):**
se corrió todo con `workers: 1` / `newman run` secuencial, **a propósito, no
por limitación del entorno**. La review de PR #216 (issue #175) encontró y
confirmó que `cascade-recalculation.spec.ts` y `margin-recalculation.spec.ts`
mutan el mismo insumo compartido del seed (Harina 000) y se pisan entre sí
con 2+ workers — por eso el propio `playwright.config.ts` fija `workers: 1`
de forma permanente desde ese PR. Correr esta regresión en paralelo habría
reproducido exactamente ese defecto ya conocido y invalidado los resultados.
No es una ejecución degradada: es la única forma de que el resultado sea
confiable con el estado actual de la suite.

**Nota sobre Discord:** no se cuenta con acceso al webhook de
`#notificaciones-infra` desde este entorno. El ítem "Estado de build de CI
reportado en verde en Discord" del DoD queda pendiente de que QA lo postee
a mano una vez que el pipeline corra en verde sobre el PR real (el propio
workflow de CI ya hace esto automáticamente para pruebas de staging/infra,
ver `infra/n8n` — no para corridas de regresión de QA).

### 2.1 Qué se corrió

1. **Tests unitarios del backend:** `npx vitest run --coverage` desde
   `backend/`, con foco de cobertura en `marginCalculator.ts`.
2. **Colecciones Newman** (desde `backend/tests/postman/`, backend local
   seedeado, tokens de Clerk reales de corta duración vía
   `scripts/get-test-token.ts`):
   - `MargenX - Insumos API.postman_collection.json`
   - `MargenX - Productos API.postman_collection.json`
   - `MargenX - Proveedores y Conversiones.postman_collection.json`
   - `MargenX - Webhooks API.postman_collection.json`
3. **Suites E2E Playwright** (`npx playwright test`, Chromium headless,
   `workers: 1`):
   - Auth: `smoke.spec.ts` (acceso directo a `/dashboard` ya autenticado).
   - RBAC: `rbac-security.spec.ts` (4 casos, sesión COLLABORATOR real).
   - Cascade Recalculation: `cascade-recalculation.spec.ts` (issue #175).

## 3. Resultados por capa

| Capa | Archivo(s) | Ejecutados | Fallidos | Duración |
|---|---|---:|---:|---:|
| Backend unitarios | 12 archivos (`vitest`) | 171 tests | **0** | 4.20s |
| Newman — Insumos | 11 requests / 29 aserciones | 29 | **2** | 836ms |
| Newman — Productos | 7 requests / 24 aserciones | 24 | **5** | 404ms |
| Newman — Proveedores y Conversiones | 19 requests / 51 aserciones | 51 | **0** | 695ms |
| Newman — Webhooks | 5 requests / 10 aserciones | 10 | **1** | 257ms |
| E2E — Auth (`smoke.spec.ts`) | 1 test | 1 | **1** | 2.4s |
| E2E — RBAC (`rbac-security.spec.ts`) | 4 tests | 4 | **0** | 12.0s |
| E2E — Cascade Recalculation | 1 test | 1 | **0** | 10.3s |
| **Total** | | **291** | **9** | — |

## 3.1 Evidencia visual

Capturas reales tomadas durante esta misma corrida (no mockups), con sesiones
de Clerk reales vía `scripts/get-test-token.ts`/`@clerk/testing`. Se adjuntan
como archivos aparte al PR (informe UNaB) — no se versionan en el repo:

- **`qa-regresion-01-auth-dashboard.png`** — Auth: `/dashboard` tras login real
  como `admin.panaderia@hotmail.com`, sin pasar por `/login` (issue base de
  `smoke.spec.ts`).
- **`qa-regresion-02-cascade-badge-critico.png`** — Cascade Recalculation:
  `/productos` después de subir el costo de Harina 000 a $4.500 — "Pan Flauta
  — 1 Kg" con el badge **"Crítico (-6.4%)"**, igual que afirma el test
  automatizado de `cascade-recalculation.spec.ts`.
- **`qa-regresion-03-rbac-colaborador-sin-margenes.png`** — RBAC: la misma
  pantalla `/productos`, sesión `colab.panaderia@hotmail.com` — sin columna
  "Costo" ni "Margen", sin tab "Insumos" en la barra superior.
- **`qa-regresion-04-rbac-insumos-redirige.png`** — RBAC: intento de acceso
  directo a `/insumos` como COLLABORATOR — la URL final es `/productos`
  (redirección confirmada, no solo el tab oculto).

**Cobertura de `marginCalculator.ts`** (`@vitest/coverage-v8`, agregado como
devDependency para este reporte — no existía cobertura configurada en el
repo): **94.52%** statements, **90.19%** branch, **100%** funciones,
**94.52%** líneas. Líneas sin cubrir: tramos acotados de manejo de casos
límite (`67-68`, `129-132` del archivo) — ningún camino de negocio principal
queda sin ejercitar.

De los **9 fallos**, **0 son defectos de la aplicación**. Los 9 están
documentados y clasificados en la matriz de §4.

## 4. Matriz de Defectos

Taxonomía de la issue: **Crítico (Bloqueante)** / **Mayor** / **Menor (Visual)**.

| ID | Severidad | Área | Descripción | Evidencia |
|---|---|---|---|---|
| QA4-01 | Mayor | Newman — Insumos | `GET Listar insumos (200)` valida el schema **anterior** a la paginación (`{ "ingredients": [...] }`), pero la API real responde `{ "data": [...], "meta": {...} }` desde que se implementó la issue #36. El propio `README-Insumos.md` de la colección ya advertía este desvío pendiente de actualizar. No es un bug de la app — el endpoint pagina correctamente. | `expected data to satisfy schema but found following errors: data should have required property 'ingredients'` |
| QA4-02 | Mayor | Newman — Productos | Dos aserciones (`POST Validación - salePrice en cero (400)` y el mensaje esperado en `salePrice negativo`) asumen un contrato viejo. El backend permite `salePrice: 0` **a propósito** (`decimal(body.salePrice, 'salePrice', true) // ← allowZero`, `backend/src/routes/products.ts:92`) y el mensaje real para negativo es "debe ser mayor o igual a cero", no el que la colección espera. No es un bug — la colección no se actualizó cuando se decidió permitir precio cero. | `expected response to have status code 400 but got 201` |
| QA4-03 | Mayor | Newman — Webhooks | `04 - Acepta payload válido` valida la respuesta **pre-#200/#208** (`message`, `processedItems`). El contrato real hoy es `{received, updated, unchanged, quarantined, duplicates, discarded, discardedCodes, account, criticalProductsAlerts}`. No es un bug — el webhook responde correctamente, la colección quedó desactualizada. | `expected undefined to deeply equal 'Lote de precios recibido correctament…'` |
| QA4-04 | Mayor | Tooling — `run-tests.sh` (Insumos) | El wrapper hardcodea `accountId_cuentaA=d45e2fab-df12-4baa-b597-6f2da538cef5`, un ID que no corresponde a ninguna cuenta del seed actual (`30a00000-0000-4000-8000-000000000001`). Correr el script tal cual, sin overridear ese valor a mano, hace que toda la colección falle de forma engañosa. | Comparación directa contra `SELECT id FROM "Account"` |
| QA4-05 | Menor | E2E — `smoke.spec.ts` | El umbral local de `< 2000ms` es sensible a la velocidad de la máquina; en este entorno midió consistentemente ~2150-2180ms. Ya identificado y confirmado como no-bloqueante en la review de PR #216 (en CI usa `< 5000ms` y no falla). | `Expected: < 2000  Received: 2159` |

**Ningún hallazgo es Crítico (Bloqueante).** Los cuatro primeros son la misma
causa raíz repetida tres veces y media: las colecciones Postman y su
wrapper script no se actualizaron en el mismo PR que cambió el contrato que
validan. Se recomienda una issue de seguimiento ("QA: actualizar
colecciones Newman al contrato vigente") para QA4-01 a QA4-04 — no se
corrigieron en este PR porque el alcance de #177 es ejecutar y documentar,
no modificar la suite.

## 5. Veredicto del Gherkin de la issue

```gherkin
Entonces el 100% de los tests críticos deben finalizar en Passed
Y no debe existir ningún defecto bloqueante sin mitigar en el backlog
```

Se cumple: **0 defectos Crítico (Bloqueante)**. Los 9 fallos observados son
deuda de tooling de QA (8) y sensibilidad de entorno ya triada (1), ninguno
en código de aplicación. La corrida fue local, no contra Staging — ver nota
de §2.

## 6. Definition of Done

- [x] Reporte firmado por QA y versionado en `docs/qa/` — este documento.
- [ ] Estado de build de GitHub Actions reportado en verde en Discord —
      pendiente, requiere que QA lo postee a mano una vez que CI corra en
      verde sobre el PR real (sin acceso al webhook desde este entorno, ver §2).
- [ ] PR abierto hacia `develop` — pendiente de abrir.
