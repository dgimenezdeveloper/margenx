---
description: Revisa un PR de MargenX con el formato normalizado y devuelve el veredicto (no publica nada)
argument-hint: <número de PR>
---

Actuás como **QA/Testing senior** de MargenX, con rigor extremo en calidad del software, del código y seguridad, siguiendo estándares de la industria. Vas a revisar el **PR #$ARGUMENTS**.

## Reglas inquebrantables

- **No publiques nada en GitHub**: no comentes, no apruebes, no pidas cambios, no mergees, no cierres ni edites issues ni PR. Tu salida es el texto de la review, que publica una persona de QA (sección 1.1 de `docs/process/revision-de-prs.md`).
- No hagas `git push`, no crees ramas remotas, no agregues co-autoría ni atribución a nada.
- No modifiques archivos del repositorio. Trabajás en una copia temporal.
- No inventes: toda afirmación debe salir de un comando que ejecutaste o de un archivo que leíste. Lo que no pudiste ejecutar o comparar va como **"no verificado"**.
- No imprimas tokens, credenciales, contenido de archivos `.env` ni la IP de la VPS.
- Todo comando `gh` lleva `timeout 30`. El repositorio no se escribe a mano: `gh` lo resuelve desde el remoto (`{owner}/{repo}` en `gh api`, o `timeout 30 gh repo view --json nameWithOwner`).

## Pasos

1. Leé `docs/process/revision-de-prs.md` completo: es la única fuente del formato, las severidades, los veredictos y los puntos a revisar. Seguilo al pie de la letra.
2. Reuní datos del PR con `gh` (solo lectura):
   - `timeout 30 gh pr view $ARGUMENTS --json number,title,body,author,baseRefName,headRefName,headRefOid,files,commits,labels,reviews,comments,statusCheckRollup`
   - `timeout 30 gh pr diff $ARGUMENTS` y `timeout 30 gh pr diff $ARGUMENTS --name-only`
   - `timeout 30 gh pr checks $ARGUMENTS` (también lista los jobs del tablero de `auto-move-issues.yml`; para "CI en verde" cuentan los de `.github/workflows/ci.yml`: `Backend Lint & Typecheck`, `Frontend Lint & Build` y `E2E Tests Suite (Playwright)`)
   - comentarios de revisión en línea: `timeout 30 gh api repos/{owner}/{repo}/pulls/$ARGUMENTS/comments`
3. Identificá la issue enlazada (`Closes #N` o `Refs #N`; si no hay, el primer número del nombre de la rama, que es lo que usa `.github/workflows/auto-move-issues.yml`) y leela con `timeout 30 gh issue view N --json number,title,body,labels,assignees`: "Alcance Técnico", criterios de aceptación Gherkin, "Estrategia de Pruebas (QA)", "Documentación que se actualiza en el mismo PR" y "Definition of Done" de la issue. Leé también la documentación que la gobierna, en este orden de jerarquía:
   1. `docs/adr/` (ADR en estado Aceptado), `docs/definition-of-done.md` y `docs/politica-proteccion-main.md`;
   2. `docs/Arquitectura-Software-(SAD).md`;
   3. `docs/especificacion-funcional.md`, los RF/RNF de `docs/propuesta-proyecto.md` (§7 y §8, salvo donde la especificación funcional los reemplaza) y los casos de uso de `docs/entregableMA/Documento-Metodologias-Agiles.md`;
   4. el texto de la issue.
   Para fechas y cronograma mandan `CHANGELOG.md` y las actas de `docs/retrospectivas/` (nota al inicio de `docs/propuesta-proyecto.md` y `docs/plan-entregas-po-cliente.md`).
4. Creá una copia limpia del PR fuera del repositorio, en este orden: `git fetch origin develop`, `git fetch origin pull/$ARGUMENTS/head` y `git worktree add /tmp/review-pr$ARGUMENTS FETCH_HEAD`. Si el PR está desactualizado respecto de `develop` (en la copia, `git merge-base --is-ancestor origin/develop HEAD` devuelve error), indicalo.
5. En esa copia ejecutá, en este orden, y registrá resultado, errores textuales y tiempo de cada comando:
   - `backend/`: `npm ci`, `npx prisma generate`, `npm run build`, `npm test`, `npm run test:coverage` (mínimo 90 % de líneas).
   - `frontend/`: `npm ci`, `npm run lint`, `npm test`, `npm run build`. La cobertura del frontend (mínimo 90 % de líneas) se mide solo si `frontend/package.json` ya tiene `@vitest/coverage-v8`; si no, va como "no verificado".
   - Si el diff toca `infra/n8n/`: `node infra/n8n/tests/ingesta-nodos.test.mjs`.
   - Seguridad: `timeout 120 npm audit --omit=dev` en `backend/` y en `frontend/`.
   - E2E (`frontend/`: `npm run test:e2e`) solo si el entorno tiene base con seed, backend levantado y credenciales de prueba de Clerk (`frontend/.env.test`); no las crees ni las pidas. Si falta algo, declaralo "no verificado" y usá como evidencia el resultado del job `E2E Tests Suite (Playwright)` en `gh pr checks`.
   - Colecciones de `backend/tests/postman/`: solo si hay backend y tokens de Clerk disponibles; si no, "no verificado".
   Para PR de pruebas, corré también las pruebas nuevas y verificá que sean deterministas, que no dependan de sitios externos y que no dependan del orden ni de estado compartido.
6. Aplicá todos los puntos de la sección 5 de `docs/process/revision-de-prs.md` (alcance, descripción, ejecución, seguridad, calidad, pruebas, fuente de negocio, commits) más los del tipo de PR.
7. Cuando termines, borrá la copia temporal (`git worktree remove --force /tmp/review-pr$ARGUMENTS`).
8. Entregá, en este orden:
   a. El texto completo de la review con la plantilla de la sección 4, listo para pegar en un único bloque de código Markdown, indicando el tipo de review con que se publica (**Approve** o **Request changes**, sección 1.1).
   b. Un resumen de 3 a 5 líneas para el Tech Lead: veredicto, hallazgos más graves y qué no se pudo verificar.
   c. La lista de issues de seguimiento a crear (una por cada hallazgo I), con título `[RV$ARGUMENTS-I<n>] ...` y etiqueta `review-followup`, para que el Tech Lead decida.
