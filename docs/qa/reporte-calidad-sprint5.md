# Reporte de Calidad — Sprint 5

Este documento lo inicia la issue #265 (cosecha de comentarios no bloqueantes).
Las issues #255 (recorrido por rol y dispositivos reales) y #270 (regresión
con matriz de defectos) agregan sus propias secciones más abajo cuando se
ejecuten; esta primera sección no las reemplaza.

## 1. Cosecha de comentarios no bloqueantes (issue #265)

### 1.1 Objetivo

Revisar los comentarios no bloqueantes (`NB-`) dejados en las revisiones de
los PR #215 a #218, confirmar cuáles siguen vigentes contra el código real de
`develop` (no contra lo que decía la revisión en su momento) y convertir lo
que sigue pendiente en issues agrupadas por tema, con la etiqueta
`review-followup`. Lo ya resuelto o que ya no aplica se descarta acá mismo,
con el motivo.

### 1.2 Método

- Los `NB-` no están en los comentarios del PR: están en el *cuerpo* de las
  revisiones (`get_reviews`), no en los comentarios sueltos (`get_comments`).
  Se confirmó además que ninguno de los 4 PR tiene comentarios de revisión en
  línea (`get_review_comments` devolvió 0 en los cuatro) — el inventario de
  cada PR está completo.
- La issue dice "#217 (NB-1 a NB-11)". El inventario real de ese PR son
  **9** ítems distintos: NB-1 a NB-7 aparecen idénticos en dos revisiones
  consecutivas del mismo commit (un envío duplicado, no 14 ítems), más 2
  puntos no bloqueantes sin numerar en la revisión de aprobación final. Se
  revisó dos veces y se confirmó que no hay una tercera fuente posible. Los
  otros tres PR coinciden exactamente con el conteo de la issue (#215: 5,
  #216: NB-1 a NB-7, #218: NB-1 a NB-7), lo que da confianza en que el
  método no se comió ningún ítem — la issue simplemente sobreestimó el
  conteo de #217.
- Cada ítem se contrastó contra el código real de `develop` al 29/10/2026:
  lectura directa del archivo señalado y, cuando fue posible verificarlo en
  los hechos en vez de solo leyendo, ejecución real — se corrió
  `npm run test:coverage` del backend, se levantó Postgres 16 local, se
  corrió el seed de verdad y se consultó la base con `psql` para confirmar
  el costo de Harina 000 antes de tocar nada.

### 1.3 Tabla de trazabilidad

| PR (issue) | Ítem | Descripción | Estado verificado | Destino |
|---|---|---|---|---|
| #215 (#176) | 1/5 | Tildar los ítems pendientes del DoD en el cuerpo del PR | Descartado: el PR ya está mergeado, el cuerpo es historial | — |
| #215 (#176) | 2/5 | Aserciones de "muchos decimales" y "código con espacios" solo verifican `discarded === 0`, no el valor resultante | Confirmado vigente en `backend/tests/postman/ingesta-estres.json` | #313 |
| #215 (#176) | 3/5 | Documentar que la corrida muta precios reales y hace falta re-seedear | Ya resuelto — `README-IngestaEstres.md:16` | — |
| #215 (#176) | 4/5 | Documentar `updated+unchanged+quarantined==10` como desviación aceptada | Ya resuelto — `README-IngestaEstres.md:81` | — |
| #215 (#176) | 5/5 | Sin aserción de tiempo en el caso de concurrencia (hasta 4.5s por encolado) | Confirmado vigente, sin ninguna aserción de tiempo | #313 |
| #216 (#175) | NB-1 | Comentarios desactualizados en `margin-recalculation.spec.ts` (dice que el seed no crea recetas y que el form no tiene `noValidate`) | Confirmado vigente: el seed ya crea `ProductIngredient` y el form ya tiene `noValidate` | #310 |
| #216 (#175) | NB-2 | `/// <reference types="node" />` sobrante en el spec nuevo | Ya resuelto — ya no está en el archivo | — |
| #216 (#175) | NB-3 | `afterEach` restaura el costo sin confirmar que se guardó | Ya resuelto — ya no existe un `afterEach` separado; el helper compartido ya espera la confirmación en el DOM | — |
| #216 (#175) | NB-4 | El límite de 15s mide desde antes de la precondición | Ya no aplica — el archivo ya no tiene ninguna aserción de tiempo explícita | — |
| #216 (#175) | NB-5 | `getByRole('link', {name:'Productos'}).last()` depende del orden del DOM | Confirmado vigente, hoy en `cascade-recalculation.spec.ts:80` | #310 |
| #216 (#175) | NB-6 | Un commit incluyó un trailer `Co-Authored-By: Claude…`, contra regla del equipo | La regla sigue sin estar escrita en `CONTRIBUTING.md` | #314 |
| #216 (#175) | NB-7 | Umbral de 2000ms de `smoke.spec.ts` fuera de CI, sensible a la máquina | Confirmado vigente, sin cambios | #310 |
| #217 (#203) | NB-1 | Botones Liberar/Rechazar mobile sin `aria-label`/`min-h-11` | Ya resuelto, verificado en `QuarantineList.tsx` | — |
| #217 (#203) | NB-2 | Toast con fuga de `setTimeout`, sin `onClose` | Parcial: la fuga ya no existe (hay `clearTimeout`), pero `onClose` sigue sin pasarse en `page.tsx:38` | #311 |
| #217 (#203) | NB-3 | Tests solo cubrían render y apertura de modal | Parcial: liberar/rechazar y el texto del toast ya están cubiertos; sigue sin test el estado vacío/error de la página | #311 |
| #217 (#203) | NB-4 | JSDoc borrado de `IngredientUpsertSheet.tsx`, ajeno a la issue | Descartado: cambio histórico ya mergeado | — |
| #217 (#203) | NB-5 | Copia del modal de liberar incorrecta para presentaciones no predeterminadas | Ya resuelto, verificado en `QuarantineList.tsx` | — |
| #217 (#203) | NB-6 | Vitest no corre en CI | Ya resuelto — PR #290 agregó el job "Frontend Unit Tests" | — |
| #217 (#203) | NB-7 | Sin E2E de la bandeja de cuarentena, sin capturas a 360px | Confirmado vigente, no existe ningún spec E2E para `/proveedores/cuarentena` | #310 |
| #217 (#203) | (sin num.) | Tipos declarados `number` en campos que la API devuelve como string | Confirmado vigente en `suppliers.ts` (`.toString()` sobre `Decimal`) vs. `supplierService.ts` | #311 |
| #217 (#203) | (sin num.) | "Variaciones recientes" en `/insumos` hardcodeado en `2` | Confirmado vigente en `SuppliesPageContent.tsx:408` | #311 |
| #218 (#177) | NB-1 | Líneas 59-60/67-68/129-132 de `marginCalculator.ts` sin cubrir | Ya resuelto — hoy 100% de líneas cubiertas, verificado corriendo `npm run test:coverage` | — |
| #218 (#177) | NB-2 | Agregar `coverage/` al `.gitignore` | **Resuelto en esta misma issue** | — |
| #218 (#177) | NB-3 | PR tipeado "Docs" debería ser "Chore" | Descartado: tipeo histórico del PR #218 | — |
| #218 (#177) | NB-4 | Colecciones Newman: `accountId` obsoleto, puerto RBAC, datos sin restaurar | Parcial: `accountId` y puerto/`baseUrl` ya resueltos por #264 (PR #281); la restauración de datos de Productos/Alertas sigue sin existir | #312 |
| #218 (#177) | NB-5 | Documentar `INTERNAL_WEBHOOK_SECRET`, `E2E_CLERK_COLLAB_EMAIL`, `baseUrl` de Alertas | Ya resuelto — los 3 están documentados hoy | — |
| #218 (#177) | NB-6 | Evidencia en capturas en vez de evidencia auditable; PII de emails Clerk sin decidir | Parcial: sigue usando capturas; no hay política escrita sobre emails de prueba | #312 |
| #218 (#177) | NB-7 | Separar taxonomía defecto de app vs. deuda de tooling | Ya resuelto dentro del propio PR #218 (su segunda revisión) | — |

**Resumen:** 28 ítems reales (no 30, por la corrección del conteo de #217).
11 ya estaban resueltos y verificados contra el código actual. 3 se
descartan por ser historial de PRs ya mergeados. 1 se resuelve en esta misma
issue (`.gitignore`). 13 pasan a 5 issues nuevas agrupadas por tema, todas
con la etiqueta `review-followup`, sin asignar a nadie (queda para
Planning):

| Issue | Tema | Ítems que agrupa | Prioridad sugerida / Área |
|---|---|---|---|
| [#310](https://github.com/dgimenezdeveloper/margenx/issues/310) | E2E: limpieza de specs y cobertura pendiente | #216 NB-1, NB-5, NB-7; #217 NB-7 | P3 · QA/Frontend |
| [#311](https://github.com/dgimenezdeveloper/margenx/issues/311) | Bandeja de cuarentena: toast, tests y contrato de tipos | #217 NB-2, NB-3, +2 sin numerar | P2 · Frontend |
| [#312](https://github.com/dgimenezdeveloper/margenx/issues/312) | Colecciones Newman: restauración de datos y evidencia auditable | #218 NB-4 (parcial), NB-6 | P3 · QA |
| [#313](https://github.com/dgimenezdeveloper/margenx/issues/313) | Webhook de ingesta: aserciones de valor y tiempo pendientes | #215 (2 ítems) | P3 · QA/Backend |
| [#314](https://github.com/dgimenezdeveloper/margenx/issues/314) | Documentar la regla de atribución de IA en commits | #216 NB-6 | P3 · Docs/Proceso |

### 1.4 Los dos arreglos directos de esta issue

- **`.gitignore`:** se agregó `coverage/` (reporte de Vitest/v8, se
  regenera con `npm run test:coverage`). Antes de este cambio, correr la
  cobertura dejaba `backend/coverage/` sin rastrear; confirmado con
  `git status` después de correr `npm run test:coverage` (ver §1.5).

- **Costo de Harina 000 en el seed:** `backend/prisma/seed.ts` declaraba
  `currentCost: "742.98"` para "Harina de trigo 000 Olavarriense", pero esa
  cifra nunca llega a la base: el insumo tiene proveedor predeterminado
  (`HAR188`, `18406.25 / 25 = 736.25`), así que el paso de sincronización de
  `main()` siempre la sobrescribe. Se confirmó corriendo el seed real contra
  Postgres 16 y consultando con `psql`: **antes y después del cambio, la
  base queda en `736.25`** — el valor declarado era puramente decorativo
  para este insumo, nunca funcionó como respaldo.
  - El patrón "valor declarado (histórico, Sprint 1) ≠ valor activo
    post-seed" es intencional y está documentado para los otros 9 insumos
    de Panadería Central en `docs/qa/seed-data-comercios.md` — no se tocó
    ninguno de esos otros 9, porque nadie reportó confusión sobre ellos y
    siguen funcionando como respaldo real para insumos sin proveedor
    predeterminado (hoy ninguno de los 10 está en ese caso, pero el campo
    sigue siendo necesario por el esquema).
    Harina 000 es la excepción deliberada: su valor declarado se corrigió a
    `736.25` porque nunca actuó como respaldo real (siempre tuvo proveedor
    predeterminado) y porque el PR #217 mostró que la cifra vieja generaba
    confusión real en la revisión (confundible con el costo vigente de la
    presentación). Se actualizó también la tabla y la nota de
    `docs/qa/seed-data-comercios.md`, y los dos lugares que citaban
    `742.98` como si fuera "la base real" en vez de la referencia histórica:
    la colección Postman `MargenX - Alertas de margen (Insumos)` (su propio
    paso de restauración, que decía "vuelve a la base del seed (742.98)" y
    en los hechos no volvía a la base real) y
    `backend/scripts/check-ingredient-cost-change.ts` (su escenario
    `noChange`, que mandaba un valor que ya no coincidía con el costo
    vigente).

### 1.5 Verificación

- `npm run test:coverage` (backend): **196/196 tests en verde**, sin
  cambios de resultado contra el estado anterior a estos arreglos.
  `marginCalculator.ts` en 100% de líneas.
- `npx tsc --noEmit` (backend): sin errores.
- Seed real corrido dos veces contra Postgres 16 local (antes y después del
  cambio): `Harina de trigo 000 Olavarriense.currentCost = 736.25` en la
  base en ambos casos, confirmado con `psql`. Corrida idempotente: no generó
  un nuevo registro en `PriceHistory` la segunda vez (el valor efectivo no
  cambió).
- `git status` después de correr `npm run test:coverage` dentro de
  `backend/`: sin archivos de `coverage/` sin rastrear (quedan ignorados).
- Colección `MargenX - Alertas de margen (Insumos).postman_collection.json`
  validada como JSON después de la edición (`python3 -m json.tool`... /
  `json.load`).

### 1.6 Veredicto contra el Gherkin de la issue

- **Etiqueta:** `review-followup` existe en el repositorio y está en uso en
  5 issues (#310-#314). ✅
- **Todos los comentarios tratados:** cada uno de los 28 ítems reales de
  #215-#218 figura en esta tabla con una issue agrupada o un motivo de
  descarte. ✅
- **Archivos del repositorio:** `coverage/` está en `.gitignore` y el costo
  de Harina 000 es coherente (`736.25` en el seed, en la documentación y en
  los dos artefactos de prueba que lo citaban). ✅

### 1.7 Definition of Done

- [x] Etiqueta creada y NB- tratados.
- [x] Cambios de `.gitignore` y seed revisados.
- [ ] PR abierto hacia `develop` con CI en verde. *(pendiente de abrir el PR)*
- [x] Documentación actualizada en el mismo PR (esta sección, más
      `docs/qa/ejecutar-colecciones-postman.md` y
      `docs/qa/seed-data-comercios.md`).

## 2. Recorrido por rol y validación en dispositivos reales (issue #255)

**Estado de esta sección: completa.** Los tres roles
(Visitante, Admin, Colaborador) y los dos dispositivos (Android, iPhone)
quedaron recorridos. Resultado: 3 hallazgos reales, todos Importante o
Menor — ninguno grave. El enlace "Ajustar" del mail quedó confirmado con
un mail real en Android durante el Sprint 5. En iPhone solo se había
probado por simulación; la prueba con un mail real se hizo en el Sprint 6
(issue #365, 12/11/2026) y también quedó confirmada (ver §2.5).

### 2.1 Objetivo

Recorrer la app como la usaría cada rol (administrador, colaborador,
visitante) sobre `dev.margenx.tech` con la cuenta Demo, e instalar y usar
la app en un Android y un iPhone reales, para encontrar antes de la
Entrega 6 fallas que las pruebas automáticas no ven.

### 2.2 Método

- **Visitante (sin sesión):** se automatizó con Playwright, porque no
  requiere autenticación. El primer intento fue contra el sitio
  desplegado (`https://dev.margenx.tech`) y falló en la primera
  navegación con `net::ERR_CERT_AUTHORITY_INVALID`. Se descartó que
  fuera un problema del certificado del sitio: `curl -sSv` contra el
  mismo dominio confirma un certificado Let's Encrypt válido, con el SAN
  correcto y verificación exitosa — el bloqueo fue del entorno de
  automatización usado para correr Playwright, no del sitio. Se probó
  apuntar `NODE_EXTRA_CA_CERTS` al bundle de CA de ese entorno y pasar
  el proxy explícito a `chromium.launch()`: ninguno de los dos cambió el
  error. No se usó `ignoreHTTPSErrors` para evitarlo.
- **Sustitución explícita:** ante el bloqueo, se corrió el mismo
  recorrido contra un build de producción real (`vite build` + `vite
  preview`) del propio código de `develop` en `localhost`, sin HTTPS de
  por medio. Esto no es lo mismo que probar el sitio desplegado, pero
  ejecuta el mismo código, el mismo bundle de Vite y el mismo plugin de
  PWA que se despliega — la sustitución queda declarada acá, no
  disfrazada de prueba contra el sitio real.
- **Falso positivo detectado y descartado antes de reportarlo:** la
  primera corrida mostró que ninguna de las 8 rutas protegidas
  redirigía a `/login`. Antes de registrarlo como hallazgo, se
  inspeccionó el contenido real de la página (no solo la URL): estaba
  el spinner de `ProtectedRoute` trabado, no el contenido protegido
  expuesto. La causa fue el mismo bloqueo de red del entorno de
  automatización, esta vez contra `fluent-moose-9060.clerk.accounts.dev`
  (el SDK de Clerk nunca llega a cargar, así que `isLoaded` nunca pasa a
  `true` y el componente se queda esperando). Para no dejar el punto sin
  verificar, se corrió de verdad (no solo se leyó) la suite
  `protected-route.test.tsx` del propio proyecto — que mockea Clerk y no
  depende de red — y las 7 pruebas pasan, incluida la que cubre
  exactamente "sin sesión → redirige a `/login` con la URL de retorno".
- El build de producción sí permitió verificar `manifest.webmanifest`,
  `sw.js` y `offline.html` en condiciones reales, incluyendo que el
  service worker se registra y toma control de la página de verdad, no
  solo que el archivo existe.
- **Admin, Colaborador y dispositivos reales:** no son automatizables
  con las herramientas disponibles (requieren la sesión autenticada de
  Clerk y hardware físico), así que Leandro Herrera hizo el recorrido en
  vivo contra `dev.margenx.tech`, con la cuenta Demo
  (`admin.panaderia@seed.example.test` / `colab.panaderia@seed.example.test`),
  siguiendo el checklist y la guía de `docs/qa/`, con capturas de cada
  pantalla relevante (ver evidencia en §2.4, §2.5 y §2.6). Cada hallazgo
  se contrastó contra el código fuente antes de registrarlo: por
  ejemplo, un ícono que parecía faltar en el menú inferior del
  Colaborador resultó ser un artefacto de compresión de una captura —
  se verificó `bottom-nav.tsx` e `isNavLinkVisible()` y se confirmó
  visualmente antes de descartarlo. Los tres hallazgos reales que sí
  quedaron (§2.6) se verificaron leyendo el componente responsable, no
  solo observando el síntoma.

### 2.3 Recorrido por pantalla — Visitante (sin sesión)

| Pantalla | Resultado |
|---|---|
| `/` (landing) — [captura](evidencias/255/visitante-01-landing.png) | Sin fallas. 200, título y contenido correctos, 360px sin cortes. |
| `/login` — [captura](evidencias/255/visitante-02-login.png) | Sin fallas en el marco propio de la página (volver, logo, enlaces a privacidad/instalación). El widget de `<SignIn/>` de Clerk no se pudo verificar visualmente en el entorno de automatización — ver §2.2. |
| `/privacidad` — [captura](evidencias/255/visitante-03-privacidad.png) | Sin fallas. |
| `/instalar` — [captura](evidencias/255/visitante-04-instalar.png) | Con hallazgo menor registrado en la matriz (§2.6). |
| `/dashboard` sin sesión | Redirige a `/login` — verificado por ejecución real de `protected-route.test.tsx` (ver §2.2), no por Playwright en vivo. |
| `/insumos` sin sesión | Redirige a `/login` — mismo mecanismo y misma verificación que la fila anterior. |
| `/productos` sin sesión | Redirige a `/login` — ídem. |
| `/perfil` sin sesión | Redirige a `/login` — ídem. |
| `/proveedores` sin sesión | Redirige a `/login` — ídem. |
| `/proveedores/cuarentena` sin sesión | Redirige a `/login` — ídem. |
| `/productos/nuevo` sin sesión | Redirige a `/login` — ídem. |
| `/proveedores/abc123` (ruta dinámica, sin sesión) | Redirige a `/login` — ídem. |
| Ruta inexistente (`/esto-no-existe-12345`) sin sesión | Redirige a `/login` (el 404 del panel usa el mismo `ProtectedRoute`, así que antes de mostrar el 404 exige sesión) — mismo mecanismo. |
| `manifest.webmanifest` | Sin fallas. 200, `application/manifest+json`, nombre/`start_url`/`display`/íconos correctos. |
| `sw.js` | Sin fallas. 200 en build de producción; se confirmó además que se registra y toma control de la página en un navegador real. |
| `offline.html` | Sin fallas. 200, alcanzable directamente. |

Sin errores de consola propios de la aplicación en ninguna pantalla. Los
únicos errores de consola observados fueron los fallos de red del
entorno de automatización al pedir recursos externos (Clerk) — ruido del
entorno de pruebas, no de la aplicación (ver §2.2).

### 2.4 Recorrido por pantalla — Admin y Colaborador (`dev.margenx.tech`, cuenta Demo Panadería Central)

| Pantalla | Admin | Colaborador |
|---|---|---|
| `/` con sesión activa (escrita a mano) | Mismo flash de la landing que en Visitante — ver hallazgo en §2.6 | Mismo flash (comportamiento idéntico, no depende del rol) |
| Dashboard — [captura](evidencias/255/android-01-dashboard-admin.png) | Métricas completas: alerta "Productos en Riesgo", "Distribución de Salud Financiera", catálogo con costo y badge de margen. Se confirmó en vivo que el recálculo de costos se propaga de verdad: al guardar una presentación de proveedor con nuevo costo (ver fila Proveedores), un producto cruzó el umbral y pasó de 0 a 1 "Producto en Riesgo" | Sin métricas financieras: sin la alerta de riesgo, sin "Distribución de Salud Financiera", catálogo solo con precio de venta. Coincide con `docs/manual-usuario/02-rutas-y-roles.md` |
| `/insumos` | Catálogo completo, sin fallas | Redirige a `/productos` al escribir la URL a mano — confirmado |
| `/proveedores`, `/proveedores/:id` — [antes](evidencias/255/android-06-proveedor-predeterminada-antes.png) / [después](evidencias/255/android-07-proveedor-predeterminada-despues.png) | Sin fallas. **Fix del PR #341 verificado con datos reales**: en la ficha de "Distribuidora MarJuanC Alimentos" (7 presentaciones, todas predeterminadas), se editó y guardó la presentación de Manteca (marcada predeterminada) — las otras 6 presentaciones conservaron su marca "Predeterminada" después de guardar, tal como corrigió el PR #341 | Redirige a `/productos` al escribir la URL a mano — confirmado |
| `/productos` (lista) — [captura, Colaborador](evidencias/255/android-12-productos-lista-colaborador.png) | Costo y Precio visibles | Solo "Precio" (etiqueta "Atención al público"), sin "Costo" — correcto |
| `/productos/:id` (receta) — [Admin](evidencias/255/android-03-receta-admin.png) / [Colaborador](evidencias/255/android-04-receta-colaborador.png) | Banner de margen, cantidades, costo base y subtotal por ingrediente, botón de eliminar — todo visible | Sin banner de margen, sin "Margen Mínimo Objetivo", la receta son solo los nombres de los ingredientes (sin cantidades/costos/subtotal/acciones), y abajo solo "Precio de Venta al Público" — coincide exactamente con `docs/manual-usuario/03-colaborador.md` |
| `/perfil` | "Margen Objetivo Global" y "Alertas Automáticas (n8n)" visibles (ver hallazgo del "% %" en §2.6) | Ambas secciones correctamente ocultas |
| Menú inferior | 5 ítems: Inicio, Insumos, Productos, Proveedores, Perfil | 3 ítems: Inicio, Productos, Perfil — confirmado visualmente tras descartar un posible ícono faltante (ver §2.2) |

`/insumos` con "Insumos activos: 0 → 10" durante la carga y "Variaciones
recientes" fijo en `2` (`SuppliesPageContent.tsx:449`, hardcodeado) se
observaron de nuevo: el primero es el patrón normal de carga, no es un
defecto; el segundo ya está trackeado en el issue
[#311](https://github.com/dgimenezdeveloper/margenx/issues/311), no es un
hallazgo nuevo.

### 2.5 Recorrido en dispositivos reales — Android e iPhone

| Prueba | Android (Chrome) | iPhone (Safari) |
|---|---|---|
| Instalación — [Android](evidencias/255/android-08-instalacion.png) | "Instalar app" desde el menú de Chrome, ícono correcto | "Agregar a Inicio" desde Compartir, ícono correcto (sin captura de este paso puntual en iPhone) |
| Modo standalone — [Android](evidencias/255/android-09-standalone-sesion-persistente.png) / [iPhone](evidencias/255/iphone-03-standalone-sesion-persistente.png) | Sin barra de direcciones, nada tapado | Sin barra de Safari, nada tapado por el notch |
| **Gherkin — sesión tras cerrar la app** | Cerrada del todo y reabierta: entra directo, sin pedir login | Cerrada del todo y reabierta: entra directo, sin pedir login |
| **Gherkin — enlace "Ajustar" lleva al producto** — [mail](evidencias/255/android-13-mail-alerta-ajustar.jpg) / [resultado](evidencias/255/android-14-ajustar-abre-producto.jpg) | **Confirmado con un mail real.** La alerta "[MargenX ALERTA] Producto con margen bajo detectado - Panadería Central" (Tarta de ricota — 24 cm, 46,82 % contra un mínimo de 60 %, disparada por el aumento de Manteca en bloque mayorista durante este recorrido) llegó por correo. Con la app cerrada, al tocar "Ajustar" en Gmail se abrió la app instalada (sin barra de direcciones) directo en la ficha de Tarta de ricota, sin pedir login | **Confirmado con un mail real (Sprint 6, issue #365, 12/11/2026)** — [mail](evidencias/365/iphone-01-mail-alerta-ajustar.png) / [origen](evidencias/365/iphone-02-mail-reenviado-origen.png) / [sin sesión](evidencias/365/iphone-03-ajustar-sin-sesion-login.png) / [con sesión, producto 1](evidencias/365/iphone-04-ajustar-con-sesion-medialunas.png) / [con sesión, producto 2](evidencias/365/iphone-05-ajustar-con-sesion-rosca.png). Alerta real de staging de la cuenta Demo MargenX, enviada el 10/11/2026 a la casilla del admin de la Demo (`demo-admin@margenx.tech`) por el aumento de Manteca El Trébol, con dos productos: "Medialunas rellenas de dulce de leche — docena" y "Rosca de pascua — porción (línea económica)". El Tech Lead la reenvió a la casilla del tester. Abierta en la app Gmail del iPhone, el enlace se abre en Safari, no en la app instalada: las apps "Agregadas a Inicio" en iOS no capturan enlaces del sistema. **Sin sesión en Safari**, pidió login y, al iniciar sesión, volvió directo a la ficha del producto, por la URL de retorno de ADR-0006 §4 (confirmado por reporte directo, sin captura de ese paso puntual). **Con la sesión iniciada**, los dos "Ajustar" abrieron directo la ficha de cada producto, sin pedir login. Las fichas muestran el margen vigente al 12/11 y no el del mail: los costos cambiaron después de la alerta. En el navegador común rigen los cierres de ADR-0006: 30 min de inactividad y cierre del navegador. Por eso cubrimos los dos casos |
| Scroll en modales largos (regresión PR #195) | No se repitió explícitamente (el bug original fue específico de iOS Safari) | Confirmado sin regresión por reporte directo (fondo congelado con el modal de editar insumo abierto); no se generó una captura de este paso puntual |
| Offline — aviso en pantalla (falla un fetch con la app ya abierta) — [Android](evidencias/255/android-10-offline-aviso-en-panel.png) | "Error al cargar el panel" + botón Reintentar, en español | Mismo patrón, en español (sin captura de este paso puntual en iPhone) |
| Offline — página dedicada (abrir la app de cero sin conexión) — [Android](evidencias/255/android-11-offline-pagina-dedicada.png) / [iPhone](evidencias/255/iphone-04-offline-pagina-dedicada.png) | Pantalla "Sin conexión" de MargenX | Misma pantalla (con un aviso nativo de iOS superpuesto — "Para acceder a tus datos, desactivá Modo de vuelo..." — es el sistema operativo, no la app) |

Los escenarios Gherkin de recorrido por rol y de sesión persistente
quedan confirmados en ambos dispositivos. El del enlace "Ajustar" queda
confirmado con un mail real en Android (Sprint 5) y en iPhone (Sprint 6,
issue #365).

### 2.6 Matriz de defectos (fechada)

| Fecha | Defecto | Severidad | Pantalla | Cómo reproducirlo | Quién lo encontró | Evidencia | Estado |
|---|---|---|---|---|---|---|---|
| 2026-11-06 | `/instalar` muestra el placeholder "Captura pendiente" en las secciones Android y Escritorio; solo iPhone tiene las 3 capturas reales cargadas (`frontend/src/app/instalar/page.tsx`, array `guideSections`) | Menor / cosmético | `/instalar` | Entrar a `/instalar` como Visitante (no requiere sesión) y mirar las secciones "Android · Chrome" y "Escritorio · Chrome o Edge" | Recorrido automatizado del rol Visitante | — | Sin issue — es un fallback intencional y prolijo (el propio texto se autodenomina "pendiente"), no un bug; queda anotado para que el equipo decida si lo completa |
| 2026-11-06 | Flash (~1s) de la landing pública al visitar `/` con sesión activa, antes de redirigir a `/dashboard`. `frontend/src/app/page.tsx:117`: el guard `if (isLoaded && isSignedIn) return null` solo evita el parpadeo cuando Clerk ya confirmó la sesión; mientras `isLoaded` sigue en `false` (justo después de una navegación completa, por ejemplo escribir el dominio a mano) no hay ninguna guarda y se renderiza la landing completa | Importante | `/` | Con sesión iniciada (Admin o Colaborador), borrar la barra de direcciones y escribir de nuevo `dev.margenx.tech` | Leandro Herrera — confirmado en Android/Chrome **e** iPhone/Safari | [iPhone, en transición](evidencias/255/iphone-01-landing-flash.png) / [iPhone, resuelto](evidencias/255/iphone-02-dashboard-tras-flash.png) | Abierto — issue de seguimiento del Sprint 6 (no es grave: no pierde datos ni rompe funcionalidad) |
| 2026-11-06 | "50 % %" — símbolo de porcentaje duplicado en el campo "Margen Mínimo Sugerido" de Perfil. `frontend/src/app/perfil/page.tsx:202-211`: el propio `NumericInput` ya renderiza su `suffixSymbol="%"` (línea 205) y el código agrega otro `<span>%</span>` suelto al lado (línea 211). Los otros 2 usos de `NumericInput` con `%` en el proyecto (`productos/nuevo/page.tsx`, `ProductMasterDataForm.tsx`) no tienen el duplicado | Menor | `/perfil` | Entrar a Perfil como Admin y mirar el campo "Margen Mínimo Sugerido" | Leandro Herrera (Android) | [captura](evidencias/255/android-02-perfil-margen-duplicado.png) (recortada, sin el correo de la cuenta) | Abierto — issue de seguimiento del Sprint 6 |
| 2026-11-06 | Terminología inconsistente para el mismo estado de margen bajo: las listas y el panel inferior dicen "Crítico" (`MarginBadge.tsx`), el banner grande de la ficha de producto dice "Margen Bajo" (`ProductStatusBanner.tsx`) — mismo cálculo (`margin < objetivo`), dos palabras distintas | Menor | `/productos/:id` | Abrir un producto con margen por debajo del objetivo como Admin y comparar el banner de arriba con el badge del panel inferior | Leandro Herrera (Android) | [captura](evidencias/255/android-05-tarta-ricota-critico-vs-bajo.png) | Abierto — issue de seguimiento del Sprint 6 (el término único se acuerda en la issue) |

No se registraron defectos de severidad alta/grave en ningún rol ni
dispositivo.

**Escala de severidad de la matriz.** "Grave" equivale a la "severidad
alta" de la issue: bloquea un flujo, pierde o corrompe datos, o expone
datos financieros o de otra cuenta; todo defecto grave se convierte en
issue antes de cerrar el recorrido. "Importante" afecta lo que el usuario
ve o entiende sin bloquear ni perder datos. "Menor" es cosmético. Los
defectos Importante y Menor de esta matriz se registran como issues de
seguimiento del Sprint 6 (review RV342-I1).

### 2.7 Lo no cubierto

- **El enlace "Ajustar" con un mail real en iPhone:** en el Sprint 5 no
  se probó (en Android sí, §2.5). Quedó cubierto en el Sprint 6, issue
  #365 (ver §2.5).
- **Widget de login de Clerk (`<SignIn/>`) en el entorno de
  automatización:** no se pudo verificar visualmente con Playwright por
  el bloqueo de red descrito en §2.2. El recorrido real contra
  `dev.margenx.tech` sí lo usó en cada login, sin novedades.
- **Scroll-lock (PR #195) en Android:** no se probó explícitamente — el
  bug original fue específico de iOS Safari, así que no formaba parte
  del alcance mínimo, aunque el hook es compartido por ambas
  plataformas.
- **Captura del paso de instalación en iPhone y del scroll-lock en
  iPhone:** confirmados por reporte directo durante el recorrido, sin
  una captura de ese paso puntual (el resto de la prueba en iPhone sí
  tiene evidencia, ver §2.5).

### 2.8 Verificación

- Build de producción real: `npx vite build` (se evitó `tsc -b` porque
  falla por un problema preexistente y no relacionado — `xlsx` resuelto
  desde un CDN bloqueado en el entorno de automatización, el mismo que
  ya afectó a las revisiones de los PR #338-#341; no es código de esta
  issue). Se confirmó que `dist/` quedó completo y consistente:
  `index.html` referencia exactamente los bundles generados, y
  `manifest.webmanifest`, `sw.js`, `offline.html` están presentes.
- `npx vite preview` sirviendo ese build en `localhost`, recorrido con
  Playwright real (Chromium) a 390×844 (`deviceScaleFactor: 2`),
  capturando status, título, contenido de página, y errores de consola
  por URL.
- `npx vitest run src/components/__tests__/protected-route.test.tsx
  src/routes.public.test.tsx`: el primero, **7/7 en verde**, incluida la
  prueba de redirección sin sesión con mock de Clerk. El segundo falla al
  cargar por el mismo bloqueo preexistente de `xlsx` (importa `./routes`,
  que arrastra toda la app) — no es un resultado de esta issue.
- `curl -sSv https://dev.margenx.tech/`: confirmó un certificado Let's
  Encrypt válido para el sitio real, descartando que el bloqueo fuera del
  lado del sitio.
- Admin y Colaborador, Android e iPhone: recorrido real contra
  `dev.margenx.tech` (no un doble ni un build local), con capturas de
  cada pantalla relevante (`docs/qa/evidencias/255/`). Cada uno de los 3
  hallazgos de §2.6 se verificó además leyendo el componente responsable
  en el código fuente (`page.tsx`, `perfil/page.tsx`,
  `NumericInput.tsx`, `MarginBadge.tsx`, `ProductStatusBanner.tsx`)
  antes de registrarlo, y se descartó un posible cuarto hallazgo (ícono
  faltante en el menú del Colaborador) tras revisar
  `bottom-nav.tsx`/`navigation.ts` y confirmar visualmente que no había
  ninguna falla real.

### 2.9 Pendiente / próximos pasos

- **Hecho en el Sprint 6 (issue #365):** probar el enlace "Ajustar" con
  un mail real en iPhone y completar esa columna de §2.5 con sus
  capturas.
- Los tres defectos abiertos de §2.6 pasan a issues de seguimiento del
  Sprint 6: el flash de la landing (cambio acotado a
  `frontend/src/app/page.tsx`, falta la guarda para `!isLoaded`), el
  "% %" de Perfil y la terminología "Crítico" / "Margen Bajo". No
  bloquean esta issue.
- El recorrido del Visitante contra `dev.margenx.tech`, incluido el
  widget `<SignIn/>`, se repite en vivo en el recorrido final del
  Sprint 6 (S6-QA-03), como prevé el recorte de la issue.

### 2.10 Definition of Done

- [x] Los tres roles recorridos y los dos dispositivos probados. *(Instalación, standalone y sesión persistente confirmados en ambos. El enlace "Ajustar" con mail real se confirmó en Android; en iPhone se confirmó en el Sprint 6, issue #365 — ver §2.5)*
- [x] Matriz de defectos publicada (§2.6), con evidencia.
- [x] Defectos graves convertidos en issues. *(no se encontró ningún defecto grave — nada que convertir)*
- [x] PR abierto hacia `develop` con CI en verde. *(PR #342)*
- [x] Documentación actualizada en el mismo PR (esta sección).

## 3. Regresión del Sprint 5 con matriz de defectos (issue #270)

**Estado de esta sección: ejecutada parcialmente, en local.** Se armó el
entorno local (Postgres 16, migraciones, seed, backend) y, en el camino,
apareció y se corrigió un defecto real en
`backend/scripts/get-test-token.ts` (D1 de §3.4, commit `d8d8b77`).
Tras corregir también el `CLERK_SECRET_KEY` del entorno (inválido al
principio, por una causa distinta a la del script), corrieron 3 de las 6
colecciones de Postman de la issue #264 en verde: Webhooks API,
Colaborador RBAC API y Alertas de margen (Insumos). El E2E de RBAC
(`rbac-security.spec.ts`) no corrió localmente, pero sí tiene evidencia
real: pasaron sus 7 pruebas en el job `E2E Tests Suite (Playwright)` del
CI de este mismo PR, así que no es una excepción. Las otras 3 colecciones
(Insumos, Productos, Proveedores y Conversiones) sí quedan sin cubrir, por
un motivo puntual y confirmado (D2 de §3.4): la secret key disponible en
este entorno corresponde a una instancia de Clerk
(`possible-alpaca-7097.clerk.accounts.dev`) distinta a la que usa el
frontend (`fluent-moose-9060.clerk.accounts.dev`, codificada en
`VITE_CLERK_PUBLISHABLE_KEY`). Esa instancia alternativa tiene a los 2
usuarios de Panadería Central pero no a los de Química GyJ — confirmado
buscándolos por email con `users.getUserList`, 0 resultados. Según me
confirmó el Scrum Master, la configuración de Clerk para Química GyJ
todavía no está creada — no es una clave que haya que encontrar, es
trabajo pendiente del equipo. Con el sprint cerrando hoy mismo, declaro
esto como no cubierto, con motivo, en vez de demorar el cierre de la
issue.

### 3.1 Objetivo

Ejecutar una regresión liviana del sprint — las colecciones de Postman
actualizadas en la issue #264, el E2E de RBAC y los casos clave de la
issue #255 — para completar la matriz fechada de defectos del sprint,
declarar lo no cubierto con su motivo y emitir una recomendación de
publicación con las excepciones que Darío decida aceptar.

### 3.2 Método

- Se levantó Postgres 16 local (estaba instalado pero el cluster apagado),
  se configuró `DATABASE_URL` contra una base `margenx_dev` propia y
  descartable, se corrieron las 14 migraciones (`npx prisma migrate
  deploy`) y el seed (`npx prisma db seed`), y se levantó el backend en
  `localhost:3000` (health check en verde). Esta corrida es local, no
  contra `dev.margenx.tech` — ver el desvío declarado en §3.5.
- Al generar el primer token de prueba de Clerk
  (`backend/scripts/get-test-token.ts`, necesario para 5 de las 6
  colecciones de la issue #264) apareció un defecto real: el script tenía
  los `authProviderId` de `panaderia-admin` y `panaderia-colab`
  desactualizados — la siembra de la cuenta Demo y pilotos en producción
  (#240) los cambió en `backend/prisma/seed.ts` pero no se reflejó acá, y
  Clerk devolvía Bad Request al pedir el token por default. Corregido en
  el commit `d8d8b77` de este mismo PR; queda registrado como defecto en
  §3.4 (D1), no se da por verificado sin matriz.
- Ya con el script corregido, generar el token siguió fallando: el
  `CLERK_SECRET_KEY` configurado en el entorno de esta sesión es inválido
  — confirmado llamando directamente a `users.getUserList` y `users.getUser`
  contra la API real de Clerk, que responde `401 clerk_key_invalid`. Esta
  parte sí es ajena al script: la misma clave falla para cualquier
  llamada, incluso antes de tocar un `userId` puntual.
- De las 6 colecciones, la única que no depende de un token de Clerk
  (Webhooks API, usa `INTERNAL_WEBHOOK_SECRET`) sí se pudo correr
  completa, con un secreto propio generado para esta corrida (no se
  reutilizó ningún secreto real de producción ni de otro entorno).
- Se reemplazó el `CLERK_SECRET_KEY` por una clave válida contra la API
  real de Clerk.
- Con la clave nueva se regeneraron los tokens y corrieron Colaborador
  RBAC API y Alertas de margen (Insumos), ambas en verde. `quimica-admin`
  devolvió `404 Not Found` al generar su token. Se decodificó
  `VITE_CLERK_PUBLISHABLE_KEY` (no es secreta: Clerk la expone a propósito
  en el bundle del frontend) y se confirmó que apunta a la instancia
  `fluent-moose-9060.clerk.accounts.dev`, distinta de la instancia
  `possible-alpaca-7097.clerk.accounts.dev` de la nueva secret key. Se buscaron las cuentas de `quimica-admin` y `quimica-colab` por sus
  emails (las direcciones no se publican en este reporte) con
  `users.getUserList` directamente contra la API de Clerk: 0 resultados,
  confirmando que no existen en esta instancia bajo ningún ID.
- Se intentó también el E2E de RBAC localmente (`auth.collaborator.setup.ts`
  + `rbac-security.spec.ts`), con un `executablePath` explícito al
  Chromium ya instalado en este entorno. El sign-in de `@clerk/testing`
  hizo timeout a los 30s: el frontend (instancia `fluent-moose-9060`) y el
  token generado (instancia `possible-alpaca-7097`) no pueden coincidir en
  una sesión válida al ser dos aplicaciones de Clerk distintas. Esa corrida
  local fallida queda solo como dato de este entorno puntual: el job
  requerido `E2E Tests Suite (Playwright)` del CI de este mismo PR
  (run [42304817428](https://github.com/dgimenezdeveloper/margenx/actions/runs/42304817428/job/128191920642),
  SHA `799d2e3`) corrió con sus propios secretos de Clerk (consistentes
  entre sí) y pasó `rbac-security.spec.ts` dentro del proyecto `chromium-collaborator`:
  el job terminó con 18 passed en 49,5 s, de los cuales 7 son las pruebas
  de `rbac-security.spec.ts` (el resto son el proyecto `chromium` y los dos
  setups de sesión). Esa es la
  evidencia real del E2E de RBAC, no la corrida local.
- Según confirmó el Scrum Master, la configuración de Clerk de Química
  GyJ todavía no está creada — no es una secret key que haya que buscar
  entre las credenciales disponibles, es trabajo pendiente del equipo.
- Como los casos clave de la issue #255 (los 3 hallazgos de §2.6) ya están
  verificados y fechados hoy mismo, no se repitió el recorrido completo:
  se releyó el código vigente de los tres (`page.tsx:117`,
  `perfil/page.tsx:202-211`, `MarginBadge.tsx:79` vs
  `ProductStatusBanner.tsx:54`) para confirmar que ninguno cambió ni se
  corrigió por accidente desde que se registraron.

### 3.3 Resultados

| Suite | Resultado |
|---|---|
| Webhooks API (Postman, issue #264) | ✅ 5/5 requests, 10/10 assertions, 0 failures |
| Colaborador RBAC API (Postman) | ✅ 5/5 requests, 10/10 assertions, 0 failures |
| Alertas de margen (Insumos) (Postman) | ✅ 4/4 requests, 12/12 assertions, 0 failures |
| Insumos API, Productos API, Proveedores y Conversiones (Postman) | No ejecutadas en esta regresión — necesitan un token de `quimica-admin` que no existe en la instancia de Clerk disponible, ver §3.5 |
| E2E de RBAC (`rbac-security.spec.ts`) | ✅ 7/7 pruebas en verde (job completo: 18 passed, 49,5 s) — evidencia del job `E2E Tests Suite (Playwright)` del CI de este PR, ver §3.6. La corrida local falló por el mismo motivo que química (instancias de Clerk distintas); no es la evidencia operativa |
| Casos clave de §2.6 (issue #255) | Releídos contra el código vigente: los 3 siguen idénticos a como se registraron, sin regresión ni corrección adicional |

### 3.4 Matriz de defectos (fechada)

| Fecha | Defecto | Severidad | Pantalla | Cómo reproducirlo | Quién lo encontró | Evidencia | Estado |
|---|---|---|---|---|---|---|---|
| 2026-11-06 | `backend/scripts/get-test-token.ts` tenía los `authProviderId` de `panaderia-admin` y `panaderia-colab` desactualizados contra `backend/prisma/seed.ts` (la siembra de la cuenta Demo y pilotos en producción, #240, los cambió ahí pero no acá); generar el token por default devolvía Bad Request de Clerk | Menor (herramienta de desarrollo, sin impacto en producción ni en los comercios piloto) | — (script de backend, no hay pantalla) | `npx tsx scripts/get-test-token.ts panaderia-admin` contra el seed actual | Leandro Herrera, en esta misma regresión | commit `d8d8b77` | **Corregido en este PR** |
| 2026-11-06 | La secret key de Clerk disponible en el entorno de QA de esta sesión pertenece a una instancia (`possible-alpaca-7097`) distinta de la que usa el frontend (`fluent-moose-9060`); no tiene a los usuarios de Química GyJ, lo que bloquea 3 de las 6 colecciones de Postman en esta regresión puntual | Importante (bloquea cobertura de QA; no es un defecto del producto) | — (entorno de pruebas, no pantalla de la app) | Generar un token de `quimica-admin` con `get-test-token.ts` en este entorno | Leandro Herrera | `users.getUserList` por email, 0 resultados; `VITE_CLERK_PUBLISHABLE_KEY` decodificada (§3.6) | Abierto — la configuración de Clerk de Química GyJ todavía no está creada (confirmado por el Scrum Master), no es algo que haya que buscar |

Ninguno de los dos es un defecto del código de la aplicación en producción
(uno es de un script de desarrollo, ya corregido; el otro es de las
credenciales del entorno de pruebas de esta sesión). Los 3 defectos
abiertos del sprint en el producto siguen siendo los de la matriz de §2.6
(issue #255); esta sección no los repite, para no reproducir el problema
de listas duplicadas que ya se señaló en la revisión del PR #343.

No se registraron defectos de severidad alta/grave en ningún frente
verificado, ni hoy ni en lo acumulado del sprint (§1, §2 y §3).

### 3.5 Lo no cubierto

- **3 de las 6 colecciones de Postman** de la issue #264 (Insumos,
  Productos, Proveedores y Conversiones): las tres necesitan un token de
  `quimica-admin` (y Insumos/Productos también uno de `panaderia-admin`
  en paralelo, que sí funciona). La secret key de Clerk disponible en
  este entorno es válida, pero pertenece a una instancia
  (`possible-alpaca-7097.clerk.accounts.dev`) que no tiene ningún usuario
  de Química GyJ — confirmado buscándolos por email, 0 resultados (D2 de
  §3.4). No es un problema de código ni de producto ni algo que haya que
  buscar entre credenciales existentes: el Scrum Master confirmó que la
  configuración de Clerk de Química GyJ todavía no está creada. Queda
  para cuando el equipo la cree, después del cierre de este sprint.
- **La regresión corrió en local, no contra `dev.margenx.tech`** como pide
  el Alcance Técnico de la issue #270. Las colecciones de la issue #264
  están diseñadas para correr contra una base sembrada local, no contra
  `dev` (ver `docs/qa/ejecutar-colecciones-postman.md`); no evalué
  adaptarlas a `dev` en esta corrida. El E2E de RBAC sí tiene evidencia
  contra el entorno de CI (§3.3/§3.6), que tampoco es `dev`.
- El E2E de RBAC (`rbac-security.spec.ts`) **no** es una excepción: corrió
  en verde en el CI de este mismo PR (§3.3/§3.6). La corrida local falló
  por el mismo desajuste de instancias de Clerk que química, pero ya hay
  evidencia real y no hace falta repetirla.

### 3.6 Verificación

- `npx prisma migrate deploy` contra Postgres 16 local recién levantado:
  14 migraciones aplicadas sin errores.
- `npx prisma db seed`: `Seed completado: 2 cuentas, 4 usuarios, 20
  insumos, 4 proveedores, 21 presentaciones mayoristas, 20 productos y
  sus recetas`.
- Backend levantado en `localhost:3000`: `GET /api/health` responde `200
  {"status":"ok"}`.
- `INTERNAL_WEBHOOK_SECRET=<propio, generado para esta corrida>
  ./run-tests-webhooks.sh`: 5/5 requests, 10/10 assertions, 0 failures.
- `./run-tests-rbac-colaborador.sh <token_panaderia-colab>`: 5/5
  requests, 10/10 assertions, 0 failures.
- `./run-tests-alertas-margen.sh <token_panaderia-admin>
  <token_panaderia-colab>`: 4/4 requests, 12/12 assertions, 0 failures.
- Llamadas directas con `@clerk/backend` (`users.getUser` contra el
  `userId` de `panaderia-admin`): confirmado, responde con el usuario
  real. El mismo método contra `quimica-admin` responde `404 Not Found`.
- `users.getUserList` con los emails de las cuentas de `quimica-admin` y
  `quimica-colab` (no se publican) contra la API real
  de Clerk: 0 resultados.
- Decodificación de `VITE_CLERK_PUBLISHABLE_KEY` (campo público por
  diseño de Clerk, no es un secreto): confirma la instancia
  `fluent-moose-9060.clerk.accounts.dev`, distinta de la que resuelve la
  secret key actual.
- CI de este PR, SHA `799d2e3`, job
  [`E2E Tests Suite (Playwright)`](https://github.com/dgimenezdeveloper/margenx/actions/runs/42304817428/job/128191920642):
  `--project=chromium --project=chromium-collaborator`, **18 passed (49,5 s)**, de los cuales 7 son de `rbac-security.spec.ts`. Esta es la evidencia real
  del E2E de RBAC.
- Intento local de `auth.collaborator.setup.ts` (dato, no evidencia
  operativa): `page.waitForFunction` agota el timeout de 30s dentro de
  `clerk.signIn()` por el desajuste de instancias de Clerk de este
  entorno puntual — no reproduce en CI.
- Lectura directa del código vigente de los 3 hallazgos de §2.6: los tres
  idénticos a como se registraron hoy.

### 3.7 Recomendación de publicación

**Propongo publicar, con una excepción que Darío todavía tiene que
aceptar:** ningún defecto grave está abierto en ningún frente que se pudo
verificar — ni en el recorrido de dispositivos reales de §2, ni en las 3
colecciones de Postman corridas hoy (Webhooks, Colaborador RBAC y Alertas
de margen, las tres en 0 failures), ni en el E2E de RBAC (7/7 en el CI de este PR), ni en el código de los 3 hallazgos menores ya trackeados
para el Sprint 6. La excepción es solo Insumos, Productos y Proveedores
(por el token de `quimica-admin`, D2 de §3.4), que quedan para correr
cuando el equipo cree la configuración de Clerk de Química GyJ
(confirmado pendiente por el Scrum Master, no una clave que haya que
buscar). Si esa corrida pendiente llegara a encontrar algo, se reporta
como issue de seguimiento igual que el resto de los hallazgos de este
sprint.

### 3.8 Definition of Done

- [x] Regresión ejecutada (parcialmente, ver §3.1) y matriz publicada —
      §3.3/§3.4.
- [x] Lo no cubierto declarado, con motivo — §3.5.
- [x] Recomendación de publicación escrita, con una excepción propuesta
      que Darío todavía no aceptó — §3.7.
- [x] PR abierto hacia `develop` con CI en verde. *(PR #344)*
- [x] Documentación actualizada en el mismo PR (esta sección, más
      CHANGELOG).
