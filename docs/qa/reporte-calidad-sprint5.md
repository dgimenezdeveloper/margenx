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
