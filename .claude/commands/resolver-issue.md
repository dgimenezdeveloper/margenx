---
description: Resuelve una issue de MargenX con test primero y docs-as-code. Uso: /resolver-issue 12  (o #12)
argument-hint: <número de issue, con o sin #> [foco opcional]
---

TECH_LEAD_LOGIN: dgimenezdeveloper

# /resolver-issue — Resolver una issue con test primero y docs-as-code

La línea `TECH_LEAD_LOGIN` de arriba es el **único lugar** donde figura el login del Tech Lead; si cambia, se cambia ahí. El dueño del repositorio no se escribe en ningún comando: `gh` lo resuelve desde el remoto (`{owner}/{repo}` en `gh api`, o `timeout 30 gh repo view --json nameWithOwner`). Todo comando `gh` lleva `timeout`.

## Entrada

`$ARGUMENTS` = número de la issue, con o sin `#` (ejemplos: `12`, `#12`). Lo que siga al número es un **foco opcional** del Tech Lead (contexto extra, no reemplaza nada de lo definido en la issue ni en los documentos). Quitá el `#` y quedate solo con el número `N`. Si no hay un número válido, detenete y pedilo.

## Principios (no se negocian)

1. **Jerarquía de fuentes:** ADR aceptados de `docs/adr/` + `docs/definition-of-done.md` + `docs/politica-proteccion-main.md` > `docs/Arquitectura-Software-(SAD).md` > especificación funcional (`docs/especificacion-funcional.md`; RF/RNF de `docs/propuesta-proyecto.md` §7 y §8, salvo donde la especificación funcional los reemplaza; casos de uso de `docs/entregableMA/Documento-Metodologias-Agiles.md`) > texto de la issue. Si dos fuentes se contradicen, gana la de mayor jerarquía. Para fechas y cronograma mandan `CHANGELOG.md` y las actas de `docs/retrospectivas/`.
2. **La documentación crece con el código (docs-as-code, `docs/manual-scrum-master.md` §2):** ningún cambio de comportamiento, contrato, regla o comando se entrega sin su cambio de documentación en la misma rama.
3. **Test primero:** prueba que falla → implementación mínima → refactor.
4. **No inventar:** lo no confirmado por el equipo, por los comercios piloto o por los documentos se marca como *propuesta*, nunca como regla. Si falta una decisión de negocio, frená y preguntá.
5. **Sin atribución a herramientas:** commits y textos sin co-autoría ni firma de IA.
6. **Nunca** publicar, mergear, mover tarjetas del tablero, hacer push (a ninguna rama) ni crear ramas a mano (ni locales ni remotas). Todo lo que sale hacia GitHub (push, PR, comentarios) lo decide el humano. La única excepción son las correcciones de la issue del Paso 3, y solo si quien ejecuta es el Tech Lead.
7. Sin credenciales, tokens, contenido de `.env`, la IP de la VPS ni datos personales en commits, issues o comentarios (el repositorio es público: issues #224 y #230).

## Paso 0 — Preflight (solo lectura)

1. `timeout 30 gh auth status` y `timeout 30 gh api user --jq .login` (guardá el login: define el modo, ver Paso 3).
2. `git status --short`: el árbol debe estar limpio. Si no, detenete y avisá.
3. Leé la issue: `timeout 30 gh issue view N --json number,title,body,state,assignees,labels,milestone,url`.
4. Compuertas (si falla una, **detenerse** y explicar qué falta):
   - La issue está **abierta** y tiene **responsable asignado**.
   - Está en **To Do** o **In Progress** en el tablero. Esta versión de `gh` no expone `projectItems` en `gh issue view`; leé el estado con:
     ```bash
     timeout 30 gh api graphql -F owner='{owner}' -F name='{repo}' -F n=N -f query='query($owner:String!,$name:String!,$n:Int!){repository(owner:$owner,name:$name){issue(number:$n){projectItems(first:5){nodes{fieldValueByName(name:"Status"){... on ProjectV2ItemFieldSingleSelectValue{name}}}}}}}' --jq '.data.repository.issue.projectItems.nodes[].fieldValueByName.name'
     ```
     Las columnas del tablero son `Backlog`, `To Do`, `In Progress`, `In Review`, `QA Approved` y `Done`. Si no se puede leer el estado, declararlo "no verificado" y continuar solo con confirmación del usuario.
   - Sus bloqueos nativos están cerrados: `timeout 20 gh api repos/{owner}/{repo}/issues/N/dependencies/blocked_by --jq '.[] | {number,state}'`. Un bloqueo abierto = detenerse. Contrastalo también con la línea "Bloqueada por" de los "Metadatos del Tablero" de la issue; si no coinciden, informalo.
   - **Límite de WIP:** como máximo 2 tareas en `In Progress` por persona (`docs/manual-scrum-master.md` §1.1). Listá las issues abiertas del asignado (`timeout 30 gh issue list --assignee <login> --state open --json number --jq '.[].number'`) y leé el estado de cada una con la consulta de arriba. Si ya tiene 2 en `In Progress` sin contar esta, advertirlo y pedir confirmación.
5. **Rama:** se crea desde la issue con el botón **Create a branch** de GitHub (base `develop`) y tiene el formato `N-slug` en minúsculas ASCII con guiones (DoD §1). El workflow `.github/workflows/auto-move-issues.yml` toma **el número con que empieza** el nombre de la rama (solo si sigue el formato `N-slug`) para mover la tarjeta a `In Progress`. La rama actual (`git branch --show-current`) debe empezar con `N-`:
   - Si corresponde a la issue, seguí.
   - Si estás en `develop` o en otra rama, **no la crees a mano**: indicá al usuario que use el botón *Create a branch* de la issue (editando el nombre en el diálogo si el título tiene tildes o eñes, porque el botón las conserva) y luego `git fetch origin && git switch <rama>`, y detenete.
   - Si el nombre de la rama tiene caracteres que no son ASCII, advertilo (retro del Sprint 0).
6. Traé lo nuevo con **merge** (nunca rebase; retro del Sprint 0): `git fetch origin && git merge origin/develop`. Luego `npm ci` en `backend/` y en `frontend/`, y en `backend/` `npx prisma generate`. Si hay migraciones nuevas, aplicalas a la base **local** con `npx prisma migrate deploy` desde `backend/`, después de confirmar que `DATABASE_URL` de `backend/.env` apunta a la base del devcontainer (sin imprimir la cadena de conexión). No corras el seed: requiere que el humano configure `SEED_CONFIRM_TARGET` (`backend/prisma/seed.ts`).

## Paso 1 — Leer el contexto (obligatorio, completo)

`README.md`, `docs/definition-of-done.md`, `docs/politica-proteccion-main.md`, los ADR de `docs/adr/`, `docs/Arquitectura-Software-(SAD).md` (§5 a §7 siempre; el resto según el tema), `docs/manual-scrum-master.md` §2, la especificación funcional y los casos de uso que toquen el tema, la documentación del módulo afectado (`backend/tests/postman/README*.md`, `frontend/tests/e2e/README.md`, `infra/n8n/README.md`, `infra/vps/README.md`) y `docs/process/revision-de-prs.md` (sección 5, para la autorrevisión del Paso 6). Anotá qué secciones de la issue gobiernan el trabajo: "Alcance Técnico", criterios Gherkin, "Estrategia de Pruebas (QA)", "Documentación que se actualiza en el mismo PR" y "Definition of Done".

## Paso 2 — Auditoría de consistencia (antes de escribir código)

Contrastá la issue contra la documentación y armá una tabla: **Punto · Dice la issue · Dicen los documentos (archivo y sección) · Resolución**. Revisá como mínimo:

- "Alcance Técnico" de la issue vs. lo que el código y el SAD exigen tocar.
- Criterios Gherkin vs. especificación funcional, RF/RNF y casos de uso (citados correctamente).
- Reglas de negocio citadas (fórmula de margen, umbrales, cuarentena, códigos HTTP) vs. ADR, SAD y especificación funcional.
- Dependencias/bloqueos, tamaño y estimación ("Metadatos del Tablero") vs. el alcance real.
- Reglas transversales: `accountId` siempre desde el usuario autenticado (`req.user`, `backend/src/middlewares/auth.ts`) y nunca desde el cliente (DoD §6); datos financieros ocultos para `COLLABORATOR` en API y UI (`docs/especificacion-funcional.md` §8, `backend/src/middlewares/rbac.ts`); n8n nunca escribe directamente en la base de datos (ADR-003); migraciones versionadas en `backend/prisma/migrations/` y aplicadas con `prisma migrate deploy` (`.github/workflows/deploy.yml`); montos con `Prisma.Decimal` y operaciones compuestas en `prisma.$transaction` (ADR-004, `docs/manual-scrum-master.md` §1.2); TypeScript estricto sin `any` injustificado (DoD §2); mobile-first a 360 px y contraste WCAG AA (DoD §5, README); contrato HTTP modificado = colección de Postman actualizada en el mismo PR (retro del Sprint 4).

Clasificá cada discrepancia:

| Tipo | Qué hacer |
|---|---|
| **A. La issue contradice un documento** | Corregir la **issue** (Paso 3). El documento manda. |
| **B. Un documento de menor jerarquía contradice a uno de mayor** (p. ej. el SAD vs. un ADR aceptado) | Corregir el de menor jerarquía en esta misma rama. |
| **C. Laguna: la documentación no define algo que el código necesita** | Si se deduce de una fuente de mayor jerarquía, completarlo en el documento. Si es decisión de negocio o de arquitectura, **detenerse y preguntar**; mientras tanto, marcarlo como *propuesta*. |
| **D. Cambio en un ADR aceptado o en la DoD** | **Nunca autónomo.** Proponer el texto (un ADR nuevo que lo reemplace, según `docs/manual-scrum-master.md` §2.1) y esperar decisión del Tech Lead. |

Mostrá la tabla al usuario. Si hay solo tipos A/B/C resueltos, continuá; si queda algún C sin fuente o algún D, detenete hasta tener respuesta.

## Paso 3 — Aplicar las correcciones (según quién ejecuta)

El Tech Lead es el login de la línea `TECH_LEAD_LOGIN` al inicio de este archivo. Según el login del Paso 0:

- **Tech Lead:** podés corregir la issue y los documentos (A, B, C resueltos).
  - *Issue:* antes de tocarla, guardá el cuerpo original como comentario (`timeout 30 gh issue comment N --body-file <original>` con el encabezado "Cuerpo original antes de la corrección"), luego `timeout 30 gh issue edit N --body-file <nuevo>`. Después, comentá qué cambió y por qué, con la referencia al documento que manda. No cambies título, asignado, etiquetas ni campos del tablero salvo que la discrepancia lo exija (y entonces, decilo).
  - *Documentos:* editá en la rama de la issue, con commit propio `docs(<módulo>): ... (#N)` que cite la fuente.
- **Cualquier otro usuario:** **no** edites la issue, los ADR aceptados, `docs/definition-of-done.md`, `docs/politica-proteccion-main.md` ni `docs/manual-scrum-master.md`. Redactá una "Propuesta de corrección" (tabla del Paso 2 con el texto exacto sugerido) para que el Tech Lead la aplique, y si bloquea la implementación, detenete. Sí podés actualizar la documentación que la issue pide en "Documentación que se actualiza en el mismo PR" y la que acompaña tu cambio (README del módulo, colecciones de Postman, `.env.example`, `CHANGELOG.md` en `[Unreleased]`).

## Paso 4 — Implementar con test primero

Trabajá **un criterio Gherkin o un punto del "Alcance Técnico" por vez**, en el orden de la issue:

1. **Rojo:** escribí la prueba (incluyendo caso de error y de borde), ejecutala y comprobá que **falla por la razón correcta**. Pruebas unitarias con Vitest (`backend/src/**/*.test.ts`, `frontend/src/**/*.test.{ts,tsx}`); E2E en `frontend/tests/e2e/`; API en `backend/tests/postman/`; nodos de n8n en `infra/n8n/tests/`.
2. **Verde:** implementá lo mínimo para que pase.
3. **Refactor:** limpiá sin cambiar comportamiento; las pruebas siguen en verde.
4. **Commit** por unidad de trabajo: Conventional Commits `tipo(módulo): descripción` (DoD §1, SAD §7.3), en español, imperativo, terminando con `(#N)`. `git add` con rutas concretas, nunca `git add .` ni `-A`. Sin secretos ni `.env`.

Restricciones: tocar **solo** lo que pide el "Alcance Técnico" de la issue; sin `any` injustificado; tipado estricto; sin `console.log` de depuración; sin código muerto ni plantillas sin adaptar; errores manejados con códigos HTTP estables; migraciones nuevas con `npx prisma migrate dev --name <descripción>` desde `backend/` y solo contra la base local; `accountId` nunca desde el cliente; datos de prueba realistas de los comercios piloto, nunca cadenas genéricas (DoD §4). Si el alcance no alcanza o algo no cuadra con la especificación, **frená y preguntá**. **No tildes** los checklists de la issue: eso queda para el humano.

## Paso 5 — Documentación que crece con el código

En los mismos commits (o en uno `docs:` inmediato) actualizá lo que el cambio afecte, y solo eso:

- Lo que la issue lista en "Documentación que se actualiza en el mismo PR".
- `CHANGELOG.md`, sección `[Unreleased]` (`docs/manual-scrum-master.md` §4, fase 3).
- Endpoints nuevos o modificados: método, ruta, cabeceras, payload y respuestas (DoD §6) y su colección en `backend/tests/postman/`.
- Cambios en `backend/prisma/schema.prisma` o en un flujo de negocio: SAD §3 (diagrama y casos de uso), **sin números de issue** dentro del SAD (`docs/manual-scrum-master.md` §2.2).
- `docs/adr/000X-<decision>.md`: una decisión técnica de impacto estructural, en el mismo PR que la implementa (`docs/manual-scrum-master.md` §2.1). Si no sos el Tech Lead, el ADR nuevo va con estado *Propuesto*.
- Workflows de n8n: `infra/n8n/README.md`.
- Variables de entorno nuevas: `.env.example` del paquete que corresponda (solo la plantilla) y su descripción.

Regla de cierre: si el diff cambia comportamiento y no toca ningún documento, justificá explícitamente por qué no hace falta.

## Paso 6 — Verificación y autorrevisión

1. Ejecutá y registrá resultado:
   - `backend/`: `npm run build`, `npm test` y `npm run test:coverage` (mínimo 90 % de líneas).
   - `frontend/`: `npm run lint`, `npm test` y `npm run build`. Cobertura mínima del 90 % de líneas: se mide solo si `frontend/package.json` ya tiene `@vitest/coverage-v8`; si no, se declara "no verificado". No agregues la dependencia salvo que la issue lo pida.
   - Si tocaste `infra/n8n/`: `node infra/n8n/tests/ingesta-nodos.test.mjs`.
   - E2E (`frontend/`: `npm run test:e2e`) si el entorno tiene base con seed, backend levantado y `frontend/.env.test`; si no, "no verificado".
   - `timeout 120 npm audit --omit=dev` en cada paquete tocado.
   - Control rápido de aislamiento si tocaste rutas: `grep -rn "prisma\." backend/src/routes/ | grep -v "accountId"` (`docs/manual-scrum-master.md` §4) y revisá cada resultado.
2. Volvé a traer `develop` por merge, y reejecutá lo anterior si entró algo.
3. `git diff origin/develop --name-only`: todo archivo debe estar dentro del "Alcance Técnico" de la issue o de su documentación. Si hay uno fuera, revertilo o justificalo antes de seguir.
4. Autorrevisión contra la sección 5 de `docs/process/revision-de-prs.md` (alcance, seguridad, calidad, pruebas, fuente de negocio, commits). Corregí lo que encuentres. Esta autorrevisión **no reemplaza** la revisión de un compañero ni la de QA (`/revisar-pr`).
5. Lo que no pudiste ejecutar (por ejemplo, navegadores, Clerk o servicios ausentes en el entorno) se declara **"no verificado"**, nunca como OK. La verificación a 360 px y en la VPS (`dev.margenx.tech`) que pide la DoD queda para el humano y se declara pendiente.

## Paso 7 — Entrega (sin publicar)

No hagas push, no abras el PR, no muevas tarjetas. Entregá al usuario, en este orden:

1. **Resumen** de 3 a 6 líneas: qué se resolvió y qué quedó pendiente.
2. **Correcciones a la issue y a los documentos** (tabla del Paso 2 con lo aplicado y los commits).
3. **Commits** (`git log --oneline origin/develop..HEAD`).
4. **Resultados de verificación** (comando → resultado) y la lista "No verificado".
5. **Texto del PR** listo para pegar, con las secciones de `.github/PULL_REQUEST_TEMPLATE.md`: título corto en español con formato Conventional Commits y `(#N)`; "Resumen de Cambios"; "Issue Vinculada" con `Closes #N` (y "Depende de #M" si corresponde, acuerdo de la retro del Sprint 3); "Tipo de Cambio"; "Pasos para Validar (QA / Peer Review)"; "Evidencia" veraz (comandos y resultados); documentación actualizada; y el "Checklist de Definition of Done (DoD)" marcado solo en lo verificado.
6. **Próximos pasos para el humano:** `git push -u origin <rama>` (nunca a `develop`/`main`; al publicar la rama la tarjeta pasa a `In Progress`), abrir el PR hacia `develop` (pasa a `In Review`) y, tras cada solicitud de cambios, pedir *Re-request review* (vuelve a `In Review`). Sugerí correr `/revisar-pr <PR>` desde una sesión limpia para la revisión independiente.
