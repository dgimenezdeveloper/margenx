# Guía de Contribución — MargenX

Este documento explica **cómo se trabaja** en el repositorio: qué se actualiza en cada Pull Request, cómo se interpretan los números de issue y sus bloqueos, y las decisiones de proceso que todavía están abiertas. No reemplaza a los documentos técnicos existentes, los complementa:

- [`docs/definition-of-done.md`](docs/definition-of-done.md) — Definition of Done completa (Git, código, CI, QA, UI, API, despliegue).
- [`docs/process/revision-de-prs.md`](docs/process/revision-de-prs.md) — formato de las revisiones de PR, severidades e IDs `[RV<PR>-<S><n>]`.
- [`docs/politica-proteccion-main.md`](docs/politica-proteccion-main.md) — reglas de protección de la rama `main`.
- [`docs/manual-scrum-master.md`](docs/manual-scrum-master.md) — ceremonias, tablero y entregables de cátedra.

---

## 1. Documentación como código

La documentación afectada por un cambio **se actualiza en el mismo Pull Request que lo introduce**, no en una tarea aparte ni al final del sprint. Si un PR cambia comportamiento, contrato o configuración y no actualiza la documentación que ese cambio vuelve inexacta, no está `Done` (`docs/definition-of-done.md` §1 y §6).

Ejemplos de "documentación afectada", según qué toque el PR:

| El PR cambia... | Se actualiza en el mismo PR |
|---|---|
| El comportamiento visible para el usuario o el equipo | `CHANGELOG.md`, sección `[Unreleased]` (ver §2) |
| El contrato de un endpoint existente | La colección de Postman de `backend/tests/postman/` (`docs/definition-of-done.md` §6) |
| Un endpoint nuevo o una variable de entorno | `docs/api.md` y/o `.env.example` |
| Un flujo de negocio o caso de uso | La sección correspondiente de `docs/especificacion-funcional.md` o del SAD |
| Una decisión arquitectónica nueva | Un ADR nuevo en `docs/adr/`, en el mismo PR que la implementa (`docs/manual-scrum-master.md` §2.1) |
| El propio proceso del equipo | Este archivo, la plantilla de PR o `docs/process/revision-de-prs.md` |

Si un reviewer encuentra documentación desactualizada por el propio cambio del PR, es un hallazgo **bloqueante** (`docs/process/revision-de-prs.md` §3: "información falsa en la descripción del PR" aplica por extensión a la documentación del repo).

### 1.1. CHANGELOG `[Unreleased]`

Todo PR que cambia comportamiento agrega su línea en `CHANGELOG.md`, dentro de `[Unreleased]`, **en el mismo PR** — no se acumula para completarlo al cerrar el sprint. Se agrega bajo el encabezado que corresponda (`Added`, `Changed`, `Fixed`, `Removed`, `Security`, siguiendo [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)) y cierra con el número de issue entre paréntesis, por ejemplo:

```markdown
### Added

- **Backend:** Endpoint `GET /api/reports/margin` con paginación (`#123`).
```

Si ya existe un encabezado del mismo tipo más abajo en `[Unreleased]` por un PR anterior, se agrega uno nuevo al final en vez de reabrir el anterior (así queda cada PR agrupado y es más fácil de rastrear al armar el release).

---

## 2. Convención de numeración y de bloqueos

- **El número de la issue identifica, no ordena.** Que la issue #230 exista no implica que deba resolverse antes o después de la #235: el número es un identificador único, no una cola de prioridad.
- **La dependencia real vive en dos lugares, siempre consistentes entre sí:** el campo **"Bloqueada por"** en los metadatos de la issue (texto, para quien lee el issue) y la relación nativa de GitHub **Tracked by / Blocked by** (para que el tablero y las búsquedas la entiendan). Si una issue depende de otra, se declara en ambos.
- **Dentro de la misma área, la issue que bloquea lleva el número menor.** Es una convención de legibilidad (al ordenar por número, el bloqueante aparece primero), no una regla técnica de GitHub.
- **Convención de tablero:** asignar una persona a una issue la mueve a `To Do`. Una issue bloqueada se deja **sin asignar** en `Backlog` hasta que su bloqueante cierra — así nadie arranca un trabajo que todavía no puede completarse, y el tablero refleja de un vistazo qué está realmente disponible para tomar.

---

## 3. Plantilla de Pull Request

Todo PR usa `.github/PULL_REQUEST_TEMPLATE.md`. Además de la Definition of Done (`docs/definition-of-done.md`), la plantilla pide:

- **Documentación actualizada en este mismo PR**, según la tabla de la sección 1. Se marca "No aplica" solo cuando el cambio genuinamente no vuelve inexacta ninguna documentación existente.
- **Hallazgos de revisión referenciados**, cuando el PR corrige observaciones de una revisión anterior: se cita el ID exacto (`[RV<PR>-<S><n>]`) tal como lo publicó quien revisó, para que quede trazable al cerrar el sprint (`docs/process/revision-de-prs.md` §3 y §6). Un ID publicado no se renumera.
- **`Refs #N` en los PR de release** (`develop` → `main`): estos PR no usan `Closes #N`, porque las issues que integran ya están cerradas desde que se mergearon a `develop`. Usan `Refs #N` por cada issue relevante del release, a modo de trazabilidad para quien lee el PR o arma el changelog de la versión — sin disparar de nuevo el cierre automático de una issue que ya está en `Done`.

---

## 4. Método de Merge hacia `main` y `develop`

**Estado: ✅ Decisión ratificada por Darío Giménez (Tech Lead) el 27/10/2026.**

Para garantizar la estabilidad del historial de versiones y evitar desincronizaciones entre ramas, se adopta la siguiente diferenciación técnica obligatoria:

1. **Ramas de Feature hacia `develop`:** Se fusionan **exclusivamente mediante Squash and Merge**. Esto condensa los commits intermedios de trabajo en un único commit descriptivo que referencia la issue (`Closes #N`), facilitando la trazabilidad y la lectura del log en Staging.
2. **Ramas de Release (`develop` hacia `main`):** Se fusionan **únicamente mediante "Create a merge commit"**, sin squash ni rebase. Esto preserva la genealogía exacta de los commits aprobados en Staging, evitando que `main` reciba un hash inventado que confunda a Git en futuros diffs y sincronizaciones de releases.
3. **Disciplina del Equipo:** Al no permitir GitHub una restricción de método de merge segmentada por rama sin afectar al resto del repositorio, esta política constituye una disciplina obligatoria de pre-release auditada en el checklist del Scrum Master antes de ejecutar la fusión en producción.

---

## 5. `gh` CLI en el DevContainer

Se agregó el feature oficial `ghcr.io/devcontainers/features/github-cli:1` a `.devcontainer/devcontainer.json`, para poder gestionar issues y Pull Requests desde la terminal del propio DevContainer sin instalar nada manualmente.

**No verificado en este documento:** instalar el `gh` CLI requiere reconstruir el DevContainer (`Dev Containers: Rebuild Container` en VS Code) para que el feature se aplique; quien lo pruebe primero debe confirmar `gh --version` y dejar la constancia en la issue o en la retro. Autenticarlo además requiere `gh auth login` (o la variable `GH_TOKEN`) por persona — eso no se automatiza desde este cambio.
