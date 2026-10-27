# Revisión de pull requests: formato normalizado

Este documento es la **única fuente** del formato de los comentarios de revisión (aprobación, aprobación con condiciones y solicitud de cambios) de MargenX. Lo usan por igual el Tech Lead, QA y Claude Code (`/revisar-pr`). Si se cambia el formato, se cambia **aquí** y en ningún otro lado.

Complementa, no reemplaza, a `docs/definition-of-done.md` (DoD), `docs/politica-proteccion-main.md` y la sección 7.3 de `docs/Arquitectura-Software-(SAD).md` (reglas de Pull Requests).

## 1. Quién revisa y con qué estándar

El Tech Lead de MargenX es Darío Giménez (`dgimenezdeveloper`).

Según la DoD (§1 y §4) y el SAD (§7.3), todo PR hacia `develop` necesita la aprobación de **al menos un compañero** (no se permite la autoaprobación) y la **aprobación de QA**, que es la que mueve la tarjeta a `QA Approved` en el tablero.

La revisión se hace con el rigor de un **QA/Testing senior**: se protege la calidad del software, la calidad del código y la seguridad, siguiendo estándares de la industria (OWASP, pruebas automatizadas, revisión de dependencias, mínimo privilegio, trazabilidad). Una afirmación en una revisión solo es válida si se contrastó contra la fuente (código, comando ejecutado, issue, documentación del repo). Lo que no se ejecutó o no se comparó se declara **"no verificado"**.

Reglas de redacción:

- En español. Sin co-autoría ni atribución a herramientas: el comentario figura como del revisor humano que lo publica.
- Las herramientas **preparan** el texto; no aprueban, no piden cambios, no comentan ni mergean por su cuenta.
- No se pegan credenciales, tokens, contenido de archivos `.env`, la IP de la VPS ni datos personales (el repositorio es público: ver issues #224 y #230).
- El tono es exigente con el contenido y respetuoso con la persona.

### 1.1. Cómo se publica

El texto se publica como **review de GitHub** (no como comentario suelto), porque el workflow `.github/workflows/auto-move-issues.yml` (job `handle_qa_review`) mueve la tarjeta según el estado de la review:

| Veredicto | Tipo de review en GitHub | Efecto en el tablero |
|---|---|---|
| ✅ Aprobado / ✅ Aprobado con condiciones | **Approve** | La issue vinculada pasa a `QA Approved` y el PR recibe las etiquetas `qa-approved` y `ready-to-merge`. |
| ❌ Cambios solicitados | **Request changes** | La issue vinculada vuelve a `In Progress` y el PR recibe `qa-rejected`. |

Solo mueven la tarjeta las reviews de las personas listadas en la variable del repositorio `QA_GITHUB_USERS`. Una review de tipo *Comment* no mueve nada. GitHub no permite aprobar el PR propio: si quien prepara la revisión es el autor del PR, la publica otra persona de `QA_GITHUB_USERS`.

## 2. Veredictos

| Veredicto | Condición |
|---|---|
| ✅ **Aprobado** | B=0 e I=0 |
| ✅ **Aprobado con condiciones** | B=0 e I≥1 (cada I exige issue de seguimiento) |
| ❌ **Cambios solicitados** | B≥1 |

## 3. Severidad e IDs de hallazgo

Cada hallazgo lleva un ID `[RV<PR>-<S><n>]`, por ejemplo `[RV229-B1]`. `<PR>` es el número del PR, `<S>` la severidad y `<n>` un correlativo por PR y severidad. Un ID publicado no se renumera. Se escribe en texto plano y entre corchetes, para poder buscarlo al cerrar el sprint.

- **B, bloqueante:** se resuelve antes del merge. Ejemplos:
  - fuga de datos entre cuentas (consulta sin filtro por `accountId`, o `accountId` tomado del cliente);
  - datos financieros (costo, margen, proveedores) expuestos al rol `COLLABORATOR` en la API o en la UI (`docs/especificacion-funcional.md` §8);
  - n8n escribiendo directamente en la base de datos (ADR-003);
  - secretos, credenciales o la IP de la VPS en el código o en la documentación;
  - CI en rojo (DoD §3);
  - regla de dominio sin prueba;
  - cambio en `backend/prisma/schema.prisma` sin su migración en `backend/prisma/migrations/` (el despliegue solo aplica migraciones con `prisma migrate deploy`);
  - contrato HTTP modificado sin actualizar su colección de `backend/tests/postman/` en el mismo PR (acuerdo de la retro del Sprint 4, DoD §6);
  - cambios fuera del "Alcance Técnico" de la issue sin justificación en el PR;
  - dependencia vulnerable de severidad alta en producción;
  - información falsa en la descripción del PR.
- **I, importante:** se puede mergear, pero exige una issue de seguimiento en el sprint siguiente (etiqueta `review-followup`). Ejemplos: contenido sin fuente trazable, deuda técnica que afecta a la siguiente tarea, cobertura insuficiente de un caso borde.
- **M, menor:** mejora opcional. Queda solo en el comentario y se revisa en la retro.

Este formato **reemplaza al prefijo `NB-n`** que se usó para los comentarios no bloqueantes hasta el Sprint 4. Desde el 26/10/2026 no se usa `NB-n` en revisiones nuevas: un comentario no bloqueante que exige seguimiento es **I**, y uno opcional es **M**. Los `NB-n` ya publicados (PR #215 a #218) se conservan tal cual y se tratan en su propia issue de cosecha.

## 4. Plantilla del comentario

Usar exactamente esta estructura y este orden. Las secciones sin contenido se omiten salvo las marcadas como obligatorias.

````markdown
## Review — <título del PR> (Issue #<N> / PR #<M>)

**Veredicto: <✅ Aprobado | ✅ Aprobado con condiciones | ❌ Cambios solicitados>.** <Una o dos frases con el motivo.>

**Resumen: B=<n> · I=<n> · M=<n> · Estado: <veredicto en minúsculas>**

### Alcance y método   (obligatoria)

- **Alcance verificado:** <archivos y carpetas; contraste con el "Alcance Técnico" y la "Documentación que se actualiza en el mismo PR" de la issue>.
- **Método:** <fuentes contra las que se contrastó: issue (Gherkin y DoD de la issue), DoD del repo, ADR, SAD, especificación funcional>.
- **Pruebas ejecutadas:** <cada comando con su paquete y resultado, por ejemplo `backend: npm run build` → OK>. Si no aplica, explicar por qué.
- **No verificado en esta review:** <lo que no se pudo ejecutar o comparar, con el motivo>.

### [RV<PR>-B1] <título del hallazgo bloqueante>

<Qué ocurre, dónde (archivo:línea), por qué importa, cómo reproducirlo.>

**Acción:** <qué se pide, concreto y verificable>.

### [RV<PR>-I1] <título del hallazgo importante>

<Igual que arriba.>

### Menores

- **[RV<PR>-M1]** <descripción breve>.
- **[RV<PR>-M2]** <descripción breve>.

### ✅ Verificado   (obligatoria)

- <Cada punto contrastado, con su fuente o comando>.

### Condiciones post-merge   (solo si es "Aprobado con condiciones")

1. <Issues de seguimiento por cada I, con su número, etiqueta `review-followup` y el Sprint siguiente en el tablero>.

### Checklist   (obligatoria)

- [x] Alcance según la issue
- [x] Sin secretos ni datos sensibles
- [x] Aislamiento por `accountId` y sanitización para `COLLABORATOR`
- [x] CI en verde
- [ ] <Ítem pendiente, con su ID>

---

<Cierre de una o dos frases: "Apruebo.", "Apruebo con condiciones." o "Solicito cambios.", dirigido a la persona autora.>
````

En una **solicitud de cambios** se agrega, antes del cierre, una sección `### Para volver a revisar` con la lista ordenada de lo que debe corregirse y la indicación de pedir **"Re-request review"** al terminar (eso devuelve la tarjeta a `In Review`).

## 5. Qué se revisa siempre

MargenX tiene dos paquetes npm independientes, `backend/` y `frontend/`, cada uno con su `package-lock.json`. No hay `package.json` en la raíz. Los comandos se corren dentro de cada paquete.

1. **Alcance:** `gh pr diff <N> --name-only` contra el "Alcance Técnico" y la "Documentación que se actualiza en el mismo PR" de la issue. Un archivo sin relación con ese alcance y sin justificación en el PR es **B**. Cambios en `.github/`, `.devcontainer/` o `.gitignore` solo si la issue lo pide expresamente. Si el PR depende de otro sin mergear, debe decirlo en la descripción ("Depende de #N", acuerdo de la retro del Sprint 3).
2. **Descripción y trazabilidad:** usa `.github/PULL_REQUEST_TEMPLATE.md`, coincide con el diff, trae `Closes #N` (o `Refs #N` si es parcial), el checklist de DoD completo y los "Pasos para Validar" y la "Evidencia" veraces (no se acepta "probado" sin evidencia). La rama se creó desde la issue con el botón **Create a branch** (base `develop`) y tiene el formato `N-slug` en minúsculas ASCII (DoD §1); el workflow del tablero toma **el primer número** del nombre de la rama, así que ese número tiene que ser el de la issue.
3. **Ejecución real:** en una copia limpia del PR correr, y registrar resultado y tiempos:
   - `backend/`: `npm ci`, `npx prisma generate`, `npm run build` (compilación TypeScript estricta), `npm test` (Vitest) y `npm run test:coverage`.
   - `frontend/`: `npm ci`, `npm run lint`, `npm test` (Vitest), `npm run build` (`tsc -b && vite build`).
   - Si se tocó `infra/n8n/`: `node infra/n8n/tests/ingesta-nodos.test.mjs`.
   - E2E (`frontend/`: `npm run test:e2e`) solo si el entorno tiene base de datos con seed, backend levantado y las credenciales de prueba de Clerk; si no, se declara "no verificado" y se toma como evidencia el job `E2E Tests Suite (Playwright)` del CI.
4. **Seguridad:** búsqueda de secretos, credenciales e IP de la VPS en el diff; `npm audit --omit=dev` en cada paquete tocado; dependencias nuevas justificadas (licencia, mantenimiento, necesidad); servicios de terceros nuevos fuera del stack del README; `accountId` siempre desde el usuario autenticado (`req.user`, que arma `backend/src/middlewares/auth.ts` a partir del JWT de Clerk) y nunca desde el cliente; rutas nuevas con `requireRole`, `blockCollaboratorMutations` o `sanitizeFinancialData` (`backend/src/middlewares/rbac.ts`) según corresponda; el webhook público (`POST /api/webhooks/supplier-prices`) sigue protegido por `x-margenx-webhook-secret`; n8n solo habla con la API (ADR-003); el seed sigue protegido por `SEED_CONFIRM_TARGET` y `ALLOW_PRODUCTION_SEED` (`backend/prisma/seed.ts`).
5. **Calidad del código:** sin `any` injustificado (DoD §2), tipado estricto, 0 errores y 0 advertencias de ESLint, sin `console.log` de depuración (DoD §2 y plantilla de PR), sin código muerto, sin archivos de ejemplo o plantillas sin adaptar, errores manejados, nombres y mensajes en español cuando corresponda.
6. **Pruebas:** test primero, casos de error y de borde, pruebas deterministas y sin dependencias de sitios externos ni de estado compartido entre pruebas (retro del Sprint 4). Tests unitarios, colección de Postman o suite de Playwright creados o actualizados si la tarea afecta un flujo crítico (DoD §4). **Cobertura mínima del 90 % de líneas en `backend/` y en `frontend/`** (decisión del Tech Lead del 26/10/2026). En `backend/` se mide con `npm run test:coverage`. En `frontend/` todavía no hay cobertura configurada (`@vitest/coverage-v8` no está en sus dependencias): hasta que se configure, la cobertura del frontend se declara "no verificado".
7. **Contra la fuente de negocio:** criterios Gherkin de la issue, ADR de `docs/adr/`, SAD, especificación funcional (`docs/especificacion-funcional.md`), requisitos RF/RNF de `docs/propuesta-proyecto.md` §7 y §8 (salvo donde la especificación funcional los reemplaza) y casos de uso de `docs/entregableMA/Documento-Metodologias-Agiles.md`. Lo no confirmado por el equipo o por los comercios piloto se marca como propuesta, no como regla.
8. **Commits e historia:** Conventional Commits `tipo(módulo): descripción` (DoD §1, SAD §7.3), sin commits de ruido; el merge a `develop` es Squash and Merge (SAD §7.3).

Para cada tipo de PR se agregan estos puntos:

- **Documentación:** cada dato tiene fuente; nada se presenta como confirmado si no lo está; enlaces y referencias válidos; el SAD no lleva números de issue (`docs/manual-scrum-master.md` §2.2); `CHANGELOG.md` actualizado en `[Unreleased]` si corresponde.
- **Backend:** migración versionada en `backend/prisma/migrations/` por cada cambio de `schema.prisma` (y SAD §3 actualizado); aislamiento por `accountId` (control rápido: `grep -rn "prisma\." backend/src/routes/ | grep -v "accountId"`, `docs/manual-scrum-master.md` §4); operaciones compuestas dentro de `prisma.$transaction`; montos con `Prisma.Decimal` (ADR-004); endpoints nuevos documentados con método, ruta, cabeceras, payload y respuestas, y su colección de Postman (DoD §6); variables de entorno nuevas en `.env.example`.
- **Frontend:** mobile-first verificado a 360 px sin scroll horizontal en el `body` (DoD §5); estados de carga, error y vacío (DoD §5); contraste WCAG AA y sin depender solo del color (README, SAD §0 Rol 2); campos financieros ocultos para `COLLABORATOR` como segunda capa (`AdminOnlyRoute`, `useUserRole`); sin rutas de prueba en la navegación.
- **Pruebas / QA:** que las pruebas pasen de verdad (no solo que existan), sin dependencias de sitios externos, escenarios Gherkin alineados con los criterios de aceptación de la issue, datos realistas de los comercios piloto (DoD §4) y lo no cubierto declarado con su motivo.
- **Infra / CI / n8n:** permisos mínimos, secretos fuera del repositorio, cambios reversibles; workflows de n8n sin nodos que escriban en la base de datos (ADR-003) y `infra/n8n/README.md` actualizado.

## 6. Después de publicar la revisión

1. Cada hallazgo **I** se convierte en una issue con el ID en el título (`[RV229-I1] ...`), etiqueta `review-followup` y el campo `Sprint` del tablero en el sprint siguiente.
2. Los **M** se recogen en la retro del sprint (`docs/retrospectivas/`).
3. Al cerrar el sprint se buscan todos los hallazgos con la búsqueda `"RV" in:comments` (más `type:pr` y el rango de fechas) y se arma una tabla: ID, PR, severidad, estado e issue vinculada.
