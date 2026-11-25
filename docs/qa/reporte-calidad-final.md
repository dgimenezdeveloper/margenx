# Reporte de Calidad Final — v1.0.0 (issue #399)

**Estado: preparado; falta correr la regresión.** La regresión se corre sobre `develop`
congelado el 28/11/2026 (acta de cierre del Sprint 6). Hasta entonces, las
tablas de resultados dicen *Pendiente* y la matriz de trazabilidad ya tiene
cada requisito con sus pruebas. Este reporte bloquea al release (#400): todo
defecto grave abierto lo posterga (§8).

## 1. Objetivo

Correr una regresión completa y trazable sobre el candidato a v1.0.0, para
entregar el 05/12 sabiendo que cada requisito tiene su prueba en verde:

- las 13 colecciones de Postman, con la salida real de Newman;
- Vitest del backend y del frontend con cobertura, el E2E completo de
  Playwright y las pruebas de los nodos de n8n;
- el caso `[RV371-I3]` en staging;
- el recorrido manual por rol en Android, iPhone y los navegadores de
  escritorio;
- la matriz de trazabilidad de RF-01 a RF-20 y de RNF-01 a RNF-11, y la
  matriz de defectos fechada.

## 2. Candidato

| Dato | Valor |
|---|---|
| Rama y commit | `develop` congelado, SHA *pendiente (28/11)* |
| Staging | `dev.margenx.tech`, con ese mismo commit desplegado (`.github/workflows/deploy.yml`) |
| Cuenta en staging | Demo MargenX, administrador y colaborador |
| Base local para Postman | Postgres 16 con `npx prisma db seed` (Panadería Central y Química GyJ) |

## 3. Método

### 3.1 Precondiciones

1. **Usuarios de Química GyJ en Clerk.** Sin ellos, las carpetas de
   aislamiento multiempresa (Cuenta B) de Insumos, Productos y Proveedores
   fallan con 401, como en los Sprints 5 y 7
   ([Sprint 5 §3.5](reporte-calidad-sprint5.md#35-lo-no-cubierto),
   [Sprint 7 §2.4](reporte-calidad-sprint7.md#24-lo-no-cubierto)). Los crea el
   equipo; los pasos están en
   [`ejecutar-colecciones-postman.md`](ejecutar-colecciones-postman.md#antes-de-la-regresión-final-usuarios-de-química-gyj-en-clerk).
2. **Base local recién sembrada** con el commit congelado, y backend en
   `localhost:3000`.
3. **Ventas prendido** para Panadería Central en la base local
   (`README-Ventas.md`).

### 3.2 Colecciones de Postman

Se corren las 13 en la base local, con el commit congelado:

```bash
cd backend/tests/postman
INTERNAL_WEBHOOK_SECRET=<el del .env del backend> ./run-regresion.sh ../../../docs/qa/evidencias/399
```

- **Qué hace el script** (`run-regresion.sh`):
  - corre las 12 colecciones de la guía y, al final, la de estrés, que
    cambia precios del seed;
  - pide un token nuevo de Clerk para cada una;
  - guarda por colección la salida de consola (`.txt`) y el reporte JUnit
    (`.xml`), con los tokens y el secreto tapados, más `00-resumen.md`.
- **Por qué en local y no en staging**, como decía la issue:
  - las colecciones están hechas para la base sembrada, con los usuarios de
    Panadería Central y Química GyJ;
  - Ventas modifica datos ("correrla solo contra la base local", según
    `ejecutar-colecciones-postman.md`);
  - la issue misma prohíbe modificar los datos de la cuenta Demo.

  En staging se hacen `[RV371-I3]` (§3.4) y el recorrido manual (§3.5). Es una
  propuesta de corrección de la issue para el Tech Lead.

### 3.3 Pruebas automáticas

| Suite | Cómo | Evidencia |
|---|---|---|
| Backend | `npm run build` y `npm run test:coverage` en `backend/` | Resumen de Vitest y la fila `All files` |
| Frontend | `npm run lint`, `npm run test:coverage` y `npm run build` en `frontend/` | Resumen de Vitest y la fila `All files` |
| E2E de Playwright | Job `E2E Tests Suite (Playwright)` del CI sobre el commit congelado (`chromium` y `chromium-collaborator`, con Clerk y el seed reales) | Enlace al job y su resumen (`passed`, `failed`, `skipped`) |
| Nodos de n8n | `node infra/n8n/tests/<suite>.test.mjs` para `ingesta`, `alertas`, `invitacion` y `reporte` | Salida de cada suite |
| Lighthouse | Job `Lighthouse CI (360 px, no bloquea)` del mismo commit | Enlace al job |

### 3.4 Caso `[RV371-I3]` en staging

Script `backend/tests/regresion/verificar-unidades-y-costo.js`, pegado en la
consola de `dev.margenx.tech` con la sesión del administrador de la Demo:

- **Conteo:** cuenta los insumos por unidad y marca cualquiera fuera de `kg`,
  `l` y `u`. La salida tiene solo conteos, sin nombres.
- **Costo:** crea un insumo de prueba, le cambia el costo con `PUT`,
  comprueba que quedó guardado y lo borra. No toca los datos existentes de la
  Demo: el insumo no está en ninguna receta, así que no recalcula productos ni
  manda alertas.
- **Después del release:** el mismo script en `margenx.tech` hace solo el
  conteo, sin escribir nada.

Su prueba (`verificar-unidades-y-costo.test.ts`) corre con el `npm test` del
backend.

### 3.5 Recorrido manual

**Dónde:**
- staging con la cuenta Demo, como administrador, como colaborador y como
  visitante;
- en un Android real con Chrome y un iPhone real con Safari, en claro y
  oscuro;
- en Chrome, Firefox y Edge de escritorio, en sus dos últimas versiones
  (RNF-07).

La base es el [checklist del Sprint 5](checklist-roles-sprint5.md) y la
[guía de dispositivos](guia-dispositivos-sprint5.md). Se suman las pantallas
nuevas desde entonces:

- [ ] **Menú del celular** (#437): 4 pestañas y **Más**, el panel con el
  arrastre, y el colaborador sin **Más**.
- [ ] **Impacto en el margen** (`/compras`): confirmar una alternativa como
  administrador, y que el colaborador vuelva a `/productos`.
- [ ] **Reporte semanal:** la descarga del PDF desde el panel y el mail del
  reporte del lunes (contenido, enlaces y que se lea en el celular).
- [ ] **Ventas, caja y ganancia real** (si el módulo está prendido en la
  Demo): abrir turno, vender, ver el ticket, anular y cerrar. Como
  colaborador, el ticket sin costos.
- [ ] **Colaboradores desde Perfil:** invitar con un correo del equipo, ver
  el 409 de invitación pendiente y revocarla. No se usa un correo ficticio:
  el mail de invitación sale por n8n y Brevo (una sola instancia de n8n para
  staging y producción, `docs/process/revision-de-prs.md` §5), y un rebote
  perjudica la reputación del remitente.
- [ ] **`/api/docs`:** la documentación interactiva carga y lista los
  módulos.
- [ ] **Mail de alerta de margen:** llega, se lee en el celular y el enlace
  **Ajustar** abre la app instalada.

**Mediciones manuales:**

- **RNF-01, carga inicial en menos de 2 s.**
  - **Cómo:** en Chrome con DevTools, un perfil de red de 20 Mbps y la CPU 4×
    más lenta (gama media), medir el LCP de `/dashboard`, `/insumos`,
    `/productos`, `/productos/:id`, `/compras` y `/ventas`, dos veces cada
    una.
  - **Criterio:** el 90 % de las vistas, por debajo de 2 s.
- **RNF-04, recálculo en menos de 1 s con hasta 50 productos.**
  - **Cómo:** en la base local, editar el costo del insumo que usan más
    productos y medir en DevTools → Network el `PUT /api/ingredients/:id`.
  - **Qué registrar:** la cantidad de productos afectados
    (`affectedProductsCount`), y que la tarjeta cambie sin recargar.

## 4. Resultados

### 4.1 Colecciones de Postman

| # | Colección | Pedidos | Aserciones | Resultado | Evidencia |
|---|---|---|---|---|---|
| 01 | Insumos API | | | Pendiente | |
| 02 | Productos API | | | Pendiente | |
| 03 | Proveedores y Conversiones | | | Pendiente | |
| 04 | Webhooks API | | | Pendiente | |
| 05 | Colaborador RBAC API | | | Pendiente | |
| 06 | Alertas de margen (Insumos) | | | Pendiente | |
| 07 | Cuarentena API | | | Pendiente | |
| 08 | Dashboard API | | | Pendiente | |
| 09 | Colaboradores API | | | Pendiente | |
| 10 | Compras API | | | Pendiente | |
| 11 | Reportes API | | | Pendiente | |
| 12 | Ventas API | | | Pendiente | |
| 13 | Estrés de ingesta | | | Pendiente | |

### 4.2 Pruebas automáticas

| Suite | Resultado | Evidencia |
|---|---|---|
| Backend: build | Pendiente | |
| Backend: Vitest con cobertura | Pendiente | |
| Frontend: lint | Pendiente | |
| Frontend: Vitest con cobertura | Pendiente | |
| Frontend: build | Pendiente | |
| E2E de Playwright (CI) | Pendiente | |
| n8n: ingesta, alertas, invitación y reporte | Pendiente | |
| Lighthouse (CI, no bloquea) | Pendiente | |

**Corrida de ensayo del 25/11 (antes del congelamiento, no es la evidencia
final).** Sobre la rama de esta issue (`develop` al 25/11 más las pruebas de
§7), en el entorno de desarrollo, con Node 22:

| Suite | Resultado |
|---|---|
| Backend: `npm run build` | OK |
| Backend: `npm run test:coverage` | 38 archivos, 674 pasan y 1 omitida; 94,77 % de líneas |
| Frontend: `npm run lint` | 0 errores y 0 advertencias |
| Frontend: `npm run test:coverage` | 132 archivos, 1029 pruebas; 98,71 % de líneas |
| Frontend: `npm run build` | OK |
| n8n: `ingesta`, `alertas`, `invitacion` y `reporte` | Las 4 suites OK |

### 4.3 Caso `[RV371-I3]`

| Ambiente | Conteo por unidad | Unidades fuera de `kg`, `l` y `u` | Alta, `PUT`, lectura y baja | Resultado |
|---|---|---|---|---|
| Staging | | | | Pendiente |
| Producción (después del release) | | | No aplica: solo conteo | Pendiente |

### 4.4 Recorrido manual

| Rol | Android (Chrome) | iPhone (Safari) | Chrome escritorio | Firefox escritorio | Edge escritorio |
|---|---|---|---|---|---|
| Administrador | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| Colaborador | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| Visitante | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |

| Medición | Resultado |
|---|---|
| RNF-01, LCP a 20 Mbps | Pendiente |
| RNF-04, recálculo | Pendiente |

## 5. Matriz de trazabilidad

**Fuentes de cada requisito:**
- **RF-01 a RF-12 y RNF-01 a RNF-09:** `docs/propuesta-proyecto.md` §7 y §8.
  Donde los reemplaza, manda `docs/especificacion-funcional.md`: RF-07 (§6),
  RF-12 y RNF-09 (§8) y RF-15 (§7).
- **RF-13, RF-14, RF-16 a RF-20, RNF-10 y RNF-11:** no tienen texto en esos
  documentos. Se toma el rótulo de la entrega del Sprint 5
  (`docs/entregables/entrega-pps-sprint-5.md` §1).

**Abreviaturas:** "Vitest B" es el backend y "Vitest F", el frontend. Las
rutas de Vitest B son relativas a `backend/src/`, y las de Vitest F, a
`frontend/src/`.

### 5.1 Requisitos funcionales

| Requisito | Pruebas asociadas | Resultado (28/11) | Evidencia |
|---|---|---|---|
| **RF-01** Alta, edición y baja de insumos con nombre, unidad y costo | Vitest B: `routes/ingredients.test.ts` (POST, PUT y DELETE). Vitest F: `IngredientUpsertSheet.test.tsx`, `SuppliesPageContent.test.tsx`. Postman: Insumos API. Manual: `/insumos` | Pendiente | |
| **RF-02** Alta de productos con nombre y precio | Vitest B: `routes/products.test.ts` (POST). Vitest F: `app/productos/nuevo/page.test.tsx`. Postman: Productos API | Pendiente | |
| **RF-03** Receta: insumos y cantidad de cada uno | Vitest B: `routes/products.test.ts` (POST y PUT con insumos). Vitest F: `ProductRecipeBOM.test.tsx`, `ProductAddIngredientModal.test.tsx`, `RecipeQuantityField.test.tsx`. Postman: Productos API | Pendiente | |
| **RF-04** Costo total por la cantidad de cada insumo | Vitest B: `services/marginCalculator.test.ts` (`calculateItemCost`, `calculateRecipeTotal` y los casos de frontera); `backend/tests/postman/precision-aritmetica.test.ts`. E2E: TC-MRG-01 | Pendiente | |
| **RF-05** Margen en pesos y en porcentaje sobre el precio | Vitest B: `marginCalculator.test.ts` (`calculateMarginAmount`, `calculateMarginPercent`). Vitest F: `simulador-formato.test.tsx`. Postman: Productos API | Pendiente | |
| **RF-06** Margen mínimo, general o por producto | Vitest B: `routes/ingredients.test.ts` ("Mínimo propio", #440); `marginCalculator.test.ts` (`classifyProductHealthBucket`). Vitest F: `app/perfil/page.test.tsx` (margen global), `app/productos/nuevo/page.test.tsx`. Manual: Perfil y ficha del producto | Pendiente | |
| **RF-07** Marca visual bajo el mínimo (especificación §6: Pérdida, En riesgo, En objetivo y Superávit, con el mínimo de cada producto) | Vitest B: `classifyProductHealthBucket`. Vitest F: `components/__tests__/MarginBadge.test.tsx`, `lib/__tests__/healthBucket.test.ts`, `HealthDistributionHistogram.test.tsx`. E2E: TC-CASCADA-01, TC-MRG-01 | Pendiente | |
| **RF-08** Recálculo de los productos al editar un insumo | Vitest B: `marginCalculator.test.ts` (`applyBatchIngredientCostChanges`), `routes/ingredients.test.ts` (PUT), `services/marginAlertDispatcher.test.ts`. E2E: TC-CASCADA-01, TC-MRG-01, TC-QUA-01. Postman: Alertas de margen (Insumos) | Pendiente | |
| **RF-09** Listado ordenable por margen, costo o precio | Vitest B: `routes/products.test.ts` ("RF-09: el ADMIN ordena por…", agregado en esta issue). Vitest F: `MonitoredCatalogGrid.test.tsx` (de menor a mayor margen). Postman: Productos API (paginación). Ver O-1 | Pendiente | |
| **RF-10** Cada cuenta, un comercio con sus datos aislados | Vitest B: `middlewares/auth.test.ts`, `services/purchasingService.test.ts` (aislamiento por cuenta). E2E: TC-SEC-01. Postman: carpetas de aislamiento de Insumos, Productos y Proveedores (precondición §3.1) | Pendiente | |
| **RF-11** Rol Administrador o Colaborador por usuario | Vitest B: `middlewares/rbac.test.ts`, `routes/collaborators.test.ts`. Vitest F: `collaborators-section.test.tsx`, `hooks/__tests__/useUserRole.test.ts`. Postman: Colaboradores API, Colaborador RBAC API | Pendiente | |
| **RF-12** (especificación §8) El colaborador no ve costo ni margen y no edita costos | Vitest B: `routes/products.test.ts` (sanitización RBAC), `middlewares/rbac.test.ts`. E2E: TC-RBAC-01, TC-RBAC-03, TC-RBAC-09, TC-VENTAS-02. Postman: Colaborador RBAC API | Pendiente | |
| **RF-13** Varios proveedores por insumo y conversión del empaque | Vitest B: `calculateUnitCost`, `routes/suppliers.test.ts` (alta o actualización de presentaciones). Vitest F: `IngredientSupplierList.test.tsx`, `lib/__tests__/recipeConversion.test.ts`. Postman: Proveedores y Conversiones | Pendiente | |
| **RF-14** Ingesta por correo con filtro y cuarentena | Vitest B: `routes/webhooks.test.ts`, `middlewares/internalWebhookAuth.test.ts`, `routes/suppliers.test.ts` (rechazo). Vitest F: `QuarantineList.test.tsx`. n8n: `ingesta-nodos.test.mjs`. E2E: TC-QUA-01, TC-QUA-02. Postman: Webhooks API, Cuarentena API, Estrés de ingesta | Pendiente | |
| **RF-15** (especificación §7) Compras: impacto en el margen por insumo | Vitest B: `routes/purchasing.test.ts`, `services/purchasingService.test.ts`. Vitest F: `app/compras/page.test.tsx`. E2E: TC-COMPRAS-01, TC-RBAC-07. Postman: Compras API | Pendiente | |
| **RF-16** Productos borrador, sin receta | Vitest B: `routes/products.test.ts` (borrador con precio 0; el colaborador sin borradores, #428). Vitest F: `ProductStatusBanner.test.tsx`. E2E: TC-RBAC-09 | Pendiente | |
| **RF-17** Alta, edición y baja de proveedores | Vitest B: `routes/suppliers.test.ts` (GET, POST, PUT y DELETE). Vitest F: `SupplierFormDialog.test.tsx`, `SupplierDeleteDialog.test.tsx`, `SuppliersPageContent.test.tsx`. E2E: TC-RBAC-05. Postman: Proveedores y Conversiones | Pendiente | |
| **RF-18** Calculadora de empaques mayoristas | Vitest F: `supplier-packaging-modal.test.tsx`, `schemas/__tests__/supplierPackagingSchema.test.ts`. Vitest B: `calculateUnitCost`. Postman: Proveedores y Conversiones | Pendiente | |
| **RF-19** Historial de precios | Vitest B: `routes/ingredients.test.ts` (`GET /:id/history`). Vitest F: `price-history-modal.test.tsx`, `SuppliesPageContent.variaciones.test.tsx` | Pendiente | |
| **RF-20** Proveedor predeterminado | Vitest B: `routes/ingredients.test.ts` (costo manual con presentación predeterminada, #427). Vitest F: `make-default-dialog.test.tsx`, `SuppliesPageContent.default.test.tsx`, `ingredientService.defaultPresentation.test.ts`. Postman: Alertas de margen (`defaultPresentationAction`) | Pendiente | |

### 5.2 Requisitos no funcionales

| Requisito | Pruebas asociadas | Resultado (28/11) | Evidencia |
|---|---|---|---|
| **RNF-01** El 90 % de las vistas, en menos de 2 s a 20 Mbps y en gama media | Lighthouse en el CI (no bloquea) y [Sprint 7 §3](reporte-calidad-sprint7.md#3-lighthouse-a-360-px-issue-398): LCP de 0,9 a 3,5 s con el perfil móvil de Lighthouse, más lento que 20 Mbps. [Sprint 7 §4](reporte-calidad-sprint7.md#4-tiempo-de-respuesta-con-y-sin-búsqueda-issue-444): la API responde en unos 55 ms. Manual: medición a 20 Mbps (§3.5). Ver O-3 | Pendiente | |
| **RNF-02** Usable desde 360 px | E2E: TC-LAYOUT-01 a TC-LAYOUT-04; axe a 360 px (TC-AXE). Vitest F: `__tests__/ios-safe-area.test.tsx`, `bottom-nav-alto.test.tsx`, `menu-movil.test.tsx`. Manual: Android e iPhone | Pendiente | |
| **RNF-03** Autenticación externa (Clerk); una cuenta no ve los datos de otra | Vitest B: `middlewares/auth.test.ts` (401 sin token o con un token inválido), `lib/clerk.test.ts`. Vitest F: `protected-route.test.tsx`. E2E: `auth.setup.ts`, `smoke.spec.ts`, TC-SEC-01 | Pendiente | |
| **RNF-04** Recálculo sin recargar, en menos de 1 s con hasta 50 productos | E2E: TC-CASCADA-01 (sin recargar; su umbral es de 15 s para todo el flujo). Vitest B: `applyBatchIngredientCostChanges`. Manual: medición del `PUT` (§3.5). Ver O-2 | Pendiente | |
| **RNF-05** Costos, cantidades y precios, numéricos y positivos | Vitest F: `schemas/__tests__/ingredientSchema.test.ts`, `productSchema.test.ts`, `supplierPresentationSchema.test.ts`, `components/NumericInput.test.tsx`. Vitest B: `routes/ingredients.test.ts` (400 con costo negativo). Postman: Insumos API, Productos API | Pendiente | |
| **RNF-06** Errores comprensibles, sin detalles técnicos | Vitest B: `middlewares/errorHandler.test.ts`. Vitest F: `components/error-state.test.tsx`, `toast-alert.test.tsx`. E2E: `smoke.spec.ts` (error con botón de reintentar) | Pendiente | |
| **RNF-07** Chrome, Firefox y Edge, últimas dos versiones | Manual: recorrido en los tres navegadores (§3.5). El CI corre solo Chromium (`ci.yml`); `playwright.config.ts` define Firefox y WebKit, pero el CI no los corre. Ver O-4 | Pendiente | |
| **RNF-08** Integridad referencial: no borrar un insumo usado sin advertir | Vitest B: `routes/ingredients.test.ts` (DELETE con 409 si está en una receta), `routes/products.test.ts` (schema y migración), `routes/suppliers.test.ts` (DELETE). Postman: Insumos API (409 al cambiar la unidad de un insumo en uso) | Pendiente | |
| **RNF-09** (especificación §8) El colaborador no llega ni por URL a las vistas o datos de margen | E2E: TC-RBAC-02, TC-RBAC-04 a TC-RBAC-08. Vitest F: `admin-only-route.test.tsx`. Vitest B: `middlewares/rbac.test.ts`, `routes/products.test.ts` ("RNF-09: el COLLABORATOR no puede ordenar…", agregado en esta issue). Postman: Colaborador RBAC API | Pendiente | |
| **RNF-10** Alertas por correo | Vitest B: `services/marginAlertDispatcher.test.ts`, `services/invitationMailDispatcher.test.ts`. n8n: `alertas-nodos.test.mjs`, `reporte-nodos.test.mjs`, `invitacion-nodos.test.mjs`. Manual: mail de alerta y mail del reporte semanal | Pendiente | |
| **RNF-11** Memoria de los contenedores acotada en la VPS (entregas de los Sprints 4 y 5) | Revisión de la configuración: los límites `deploy.resources` de `infra/vps/docker-compose.prod.yml`. `docker stats` en la VPS: lo corre el Tech Lead (QA no tiene acceso). El SAD le asigna RNF-11 a la PWA, con sus pruebas: Vitest F `__tests__/pwa.test.ts`, `__tests__/service-worker.test.ts` y `app/instalar/page.test.tsx`, y la instalación en el recorrido manual. Ver O-5 | Pendiente | |

### 5.3 Observaciones de la matriz

- **O-1 · RF-09 en la interfaz.**
  - **Qué hay:** la API ordena por margen, costo y precio. En la interfaz, la
    grilla del panel ordena de menor a mayor margen y el catálogo, por nombre.
  - **Qué falta:** no hay forma de elegir el orden por costo o por precio. La
    especificación no define cómo se ordena en la interfaz.
  - **Decisión del PO y el Tech Lead:** dar RF-09 por cumplido con el panel y
    la API, o anotarlo para la v1.1. Con el congelamiento no entra una
    pantalla nueva.
  - **Lo que suma esta issue:** como no había prueba del orden por margen y
    por costo, ni de que al colaborador se le ignore ese orden (que le
    revelaría el margen), se agregaron en `routes/products.test.ts` (§7).
- **O-2 · RNF-04 sin medición del umbral.** Ninguna prueba automática mide
  1 s con 50 productos: el E2E comprueba que no recarga y tolera 15 s para
  todo el flujo. Se mide a mano en la regresión (§3.5).
- **O-3 · RNF-01 con otro perfil de red.** Lighthouse mide con su perfil
  móvil, más lento que los 20 Mbps del requisito. Se mide a mano a 20 Mbps
  (§3.5).
- **O-4 · RNF-07 sin navegadores en el CI.** El E2E del CI corre solo en
  Chromium. Firefox y Edge se cubren en el recorrido manual.
- **O-5 · RNF-11 con dos definiciones.** Las entregas de los Sprints 4 y 5
  dicen "memoria de contenedores acotada en la VPS", y el SAD le asigna
  RNF-11 a la PWA. La matriz cubre las dos. Se propone al Tech Lead dejar una
  sola.

## 6. Matriz de defectos (fechada)

| Fecha | Defecto | Severidad | Pantalla o módulo | Cómo reproducirlo | Evidencia | Issue | Estado |
|---|---|---|---|---|---|---|---|
| | *Se completa con la regresión* | | | | | | |

**Severidades:**
- **Grave:** bloquea el release y se convierte en issue.
- **Importante:** se convierte en issue y se decide si entra.
- **Menor:** queda registrado.

## 7. Cambios de esta issue antes de la regresión

- **`run-regresion.sh`:** corre las 13 colecciones con `--reporters cli,junit`
  y guarda la evidencia sin tokens ni secreto. Los wrappers `run-tests*.sh`
  aceptan opciones extra de Newman después de sus argumentos, como ya lo
  hacían Colaboradores y Estrés. Estrés no agrega `htmlextra` cuando quien lo
  llama elige sus propios reporters.
- **`verificar-unidades-y-costo.js`:** el script del caso `[RV371-I3]` (§3.4),
  con su prueba.
- **Pruebas nuevas en `routes/products.test.ts`:** el orden por margen, costo
  y precio del administrador (RF-09), y el bloqueo de ese orden para el
  colaborador (RNF-09). Con la protección quitada, las dos del colaborador
  fallan.

## 8. Recomendación de publicación

*Se completa con la regresión.* Criterio de la issue: 0 defectos graves
abiertos, o el release se posterga con la causa registrada.

## 9. Lo no cubierto

*Se completa con la regresión.* Ya se sabe que:
- `docker stats` en la VPS (RNF-11) lo corre el Tech Lead;
- el E2E en Firefox y WebKit no corre en el CI (O-4).

## 10. Definition of Done de #399

- [ ] 100 % de las colecciones corridas, cada una con su evidencia (§4.1).
- [ ] Matriz de trazabilidad completa (§5).
- [ ] 0 defectos graves abiertos, o el release se posterga con su causa
  registrada (§6 y §8).
