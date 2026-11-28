# Política de Protección de la Rama Main

Este documento describe la configuración de seguridad, validación automática y gobernanza de despliegue aplicada sobre las ramas `main` y `develop` en GitHub.

---

## 1. Reglas de Protección Activas (Ruleset)

Para evitar despliegues accidentales o código defectuoso en producción, la rama `main` cuenta con las siguientes restricciones obligatorias (ruleset "Protección de Producción (main)"). La rama `develop` tiene su propio ruleset, "Protección de Ramas Principales", con los mismos status checks requeridos:

1. **Pull Request Obligatorio:** todo cambio a `main` ingresa vía Pull Request desde `develop`. Además, la regla *Restrict updates* hace que solo quien tiene bypass (el rol de administrador) pueda actualizar `main`, también al mergear el PR: por eso el merge del release lo hace el Tech Lead. El administrador saltea el ruleset (ver §1.1).
2. **Bloqueo de Force Push, Deletion y Creation:** protección contra la sobreescritura del historial (`git push --force`), el borrado y la creación de la rama. Valen para todos salvo el rol de administrador, que tiene bypass (§1.1).
3. **Status Checks Requeridos (CI Verde):** El botón de merge permanece bloqueado hasta que los siguientes jobs de `.github/workflows/ci.yml` finalicen en estado exitoso (Passed). Los rulesets los exigen **por nombre**: si se renombra un job, se actualizan los dos rulesets y esta lista en el mismo cambio.
   - `Backend Build & Tests` (compilación TypeScript, migraciones sobre un PostgreSQL efímero y Vitest del backend con el umbral de cobertura del 90 % y la prueba de integración; todavía no corre linter).
   - `Frontend Lint & Build` (ESLint y compilación de producción con Vite).
   - `Frontend Unit Tests` (Vitest del frontend con el umbral de cobertura del 90 %).
   - `n8n Nodes Tests` (prueba de los nodos de código de los workflows de ingesta).
   - `Dependency Audit` (`npm audit --omit=dev` en ambos paquetes; falla con cualquier vulnerabilidad alta o crítica que no esté en `.github/audit-allowlist.json`, donde cada excepción lleva motivo y condición de salida).
   - `E2E Tests Suite (Playwright)` (suite E2E contra backend y base de prueba). Necesita los secrets de Clerk; para que también corra en los PRs de Dependabot, esos secrets se cargan además como *Dependabot secrets*.
4. **Aprobación de Code Review:** en `develop` el ruleset exige una aprobación (de un par, y la de QA mueve la tarjeta a `QA Approved`). En `main` el ruleset pide 0 aprobaciones: el PR de release reúne cambios que ya se aprobaron uno por uno en `develop`, y lo controla la lista de verificación de `docs/runbook-release.md`.

### 1.1. Bypass del administrador y lo que pasó el 16/11/2026

Los dos rulesets tienen como bypass al rol de administrador del repositorio, en modo *Always*. Por eso un administrador puede hacer push, borrar o crear `main` aunque las reglas lo prohíban: GitHub lo permite y solo deja el aviso "Bypassed rule violations".

- **El 16/11/2026, `main` se borró del remoto** con ese bypass. Producción no se vio afectada (siguió corriendo la v0.6.0), pero sin `main` no había camino de release ni de vuelta atrás.
- **El 25/11/2026 se recreó desde la etiqueta `v0.6.0`** (`0f43a99`, el mismo commit que tenía), con el mismo bypass, y el ruleset volvió a aplicarse por nombre de rama. El push volvió a desplegar el mismo commit en producción.
- **La rama por defecto del repositorio es `develop`**, donde llegan todos los PRs del sprint.
- **Recomendación (propuesta, pendiente de decisión del Tech Lead):** cambiar el bypass de `main` de *Always* a *For pull requests only*, para que nadie pueda borrarla ni hacer push directo sin querer, ni siquiera un administrador.
- **Control en cada release:** `docs/runbook-release.md` §2.1, paso 5, verifica que `main` exista antes de empezar.

---

## 2. Flujo y Método de Fusión para Liberación a Producción (Release)

1. Las funcionalidades y correcciones se integran diariamente en `develop` utilizando **Squash and Merge**.
2. Al finalizar un Sprint o ciclo de incremento, se abre el PR de Release formal: `develop` -> `main`.
3. El pipeline de CI ejecuta la suite completa de pruebas unitarias y validaciones de compilación.
4. **Método de Merge Obligatorio para Release:** Se debe seleccionar exclusivamente **"Create a merge commit"** (NO usar Squash and Merge ni Rebase). Esto preserva el árbol de commits de `develop` y garantiza que ambas ramas conserven paridad histórica en Git.
5. El merge exitoso en `main` dispara automáticamente el pipeline `deploy.yml`, desplegando la nueva versión inmutable en el stack productivo de la VPS Donweb (`margenx.tech`).