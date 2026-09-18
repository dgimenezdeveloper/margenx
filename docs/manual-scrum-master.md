# Manual Operativo y Checklist del Scrum Master — MargenX

**Proyecto:** MargenX — SaaS B2B Multi-tenant de Control de Rentabilidad y Costos  
**Marco de Trabajo:** Scrumban (Sprints fijos + Flujo continuo Kanban)  
**Vigencia:** Transición de cierre Sprint 1 y rotación para Sprints 2 y 3  
**Destinatarios:** Darío Giménez (@dgimenezdeveloper), Mauricio Barreras (@Mau-bar-iva), Federico Paal (@FedericoPaal), Leandro Herrera (@LeanHerrera97)  

---

## 1. Responsabilidades Core del Scrum Master en MargenX

El rol de Scrum Master en MargenX es **técnico, facilitador y rotativo**. Su propósito no es microgestionar personas, sino **garantizar la salud del flujo de trabajo, proteger la calidad arquitectónica y desbloquear al equipo de forma inmediata**.

```
                           RITMO Y GOBERNANZA SCRUMBAN
┌─────────────────────────────────────────────────────────────────────────────┐
│  CADENCIA FIJA (Entregas Cátedra)  +  FLUJO KANBAN PULL (Día a día del dev) │
│  • Sprints de 2 semanas (10 días)   • Límite WIP: Máx 2 tarea In Progress   │
│  • Fechas de entrega inamovibles   • Pull System: Halar del backlog al ocio │
│  • Sincronización continua         • Agregar issues descubiertas para el DoD│
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.1. Control del WIP (Work In Progress) y Pull System
* **Límite Estricto de WIP:** Cada desarrollador puede tener **como máximo 2 tareas en estado `In Progress`** en el tablero de GitHub Projects.
* **Prohibición de "Acumular Código":** Si un desarrollador se bloquea, la prioridad del Scrum Master y del equipo es desbloquearlo (o mover la tarjeta a `Blocked` con justificación técnica) antes de que el dev tome otra tarea.
* **Gestión de Tareas Descubiertas:** Durante el sprint está explícitamente permitido crear y sumar issues nuevas al sprint activo si son necesarias para cumplir el *Definition of Done* (DoD) de una historia de usuario (ej. un mock de red no previsto, una interfaz de tipado o un caso de test faltante).
* **Pull de Sprints Futuros:** Si un miembro completa todas sus tareas del sprint y no hay bloqueos en el equipo, el Scrum Master autoriza halar (*pull*) una issue del próximo sprint en una rama aislada, sin alterar el objetivo del sprint activo.

### 1.2. El Equilibrio de la Doble Evaluación (PO vs. Cliente)
En cada ceremonia y revisión diaria, el Scrum Master debe auditar que el trabajo satisfaga a los dos frentes evaluadores de la cátedra:

| Frente Evaluador | Representado por | Exigencias Innegociables en MargenX |
| :--- | :--- | :--- |
| **Product Owner (PPS)** | Docente de Cátedra Técnica | Arquitectura limpia, transaccionalidad ACID en Prisma (`prisma.$transaction`), contenedores Docker aislados, migraciones reproducibles, typecheck estricto (`no implicit any`), aislamiento multi-tenant por `accountId`. |
| **Cliente Real (Ágiles)** | Docente de Metodología y Comercios Piloto | Valor de negocio tangible, flujo comprensible para el dueño del local, responsividad **Mobile-First estricta en 360px** (probada con datos reales de *Panadería Central* y *Química GyJ*), cero pantallas blancas ante errores. |

### 1.3. Desbloqueo Operativo Diario (Daily / Standup Asíncrono)
Cada día a las **10:00 hs** (vía Discord / WhatsApp), el Scrum Master audita tres variables:
1. ¿Hay algún PR con más de 24 horas esperando Peer Review o aprobación de QA?
2. ¿Alguna integración entre Frontend y Backend tiene contratos de API desfasados?
3. ¿El entorno de Staging (`https://dev.margenx.tech`) está en verde tras los últimos despliegues?

---

## 2. Checklist de Documentación Continua (Durante el Sprint)

MargenX opera bajo el paradigma **Docs-as-Code**: la documentación vive en Git, se versiona junto al código y se audita en cada Pull Request.

### 2.1. Cuándo y Cómo Documentar Decisiones Técnicas (ADR)
Cuando el equipo tome una decisión técnica de impacto estructural (ej. incorporar un modelo a Prisma, cambiar la estrategia de autenticación o modificar el contrato de un webhook):
- [ ] **Crear archivo:** `docs/adr/000X-<nombre-decision>.md`.
- [ ] **Estructura obligatoria:**
  1. *Título y Estado:* Propuesto / Aceptado / Superado.
  2. *Contexto:* El problema técnico y las restricciones.
  3. *Decisión:* La solución elegida y las alternativas descartadas.
  4. *Consecuencias y Trade-offs:* Qué beneficios aporta y qué costos/deuda asumimos.
- [ ] **Regla de Git:** El ADR debe viajar en el **mismo Pull Request** que implementa la solución técnica.

### 2.2. Actualización del SAD (`docs/Arquitectura-Software-(SAD).md`)
- [ ] **REGLA MANDATORIA:** **JAMÁS incluir números de issue (`#XX`) dentro de la redacción del SAD.** Las issues son efímeras y pertenecen al tablero; el SAD debe contener únicamente títulos descriptivos y formales (ej. `[BE] Endpoints CRUD de Productos con soporte de borrador`).
- [ ] **Sincronización de Modelos:** Si se actualiza `backend/prisma/schema.prisma` (ej. creación de tablas o cambios relacionales), actualizar el diagrama entidad-relación y la descripción en la Sección 3 del SAD.
- [ ] **Casos de Uso (CU):** Si cambia un flujo de negocio (ej. permitir productos borrador sin receta o la exclusión de costos a colaboradores), actualizar el caso de uso correspondiente en la Sección 3.

### 2.3. Sincronización entre Tablero y GitFlow
- [ ] **Nomenclatura de Ramas:** Toda rama debe crearse desde `develop` siguiendo el formato `feature/<issue>-<slug>` o `fix/<issue>-<slug>` (ej. `feature/66-be-motor-margen`).
  * *Mecánica:* El script `.github/workflows/auto-move-issues.yml` parsea el número de issue del nombre de la rama y mueve la tarjeta automáticamente de `To Do` a `In Progress`.
- [ ] **Vinculación en Pull Request:** El cuerpo del PR debe contener la palabra clave de cierre: `Closes #<numero-issue>`.
- [ ] **Ciclo de Estados en Tablero:**
  * Al abrir PR hacia `develop` $\rightarrow$ la tarjeta pasa automáticamente a **`In Review`**.
  * Al aprobar Leandro (QA) el PR $\rightarrow$ la tarjeta pasa a **`QA Approved`**.
  * Al ejecutar Squash & Merge hacia `develop` $\rightarrow$ la tarjeta pasa a **`Done`**.

---

## 3. Checklist de Medio Sprint (Requerimiento de Cátedra)

En los sábados no presenciales del calendario académico, la cátedra exige presentar un **Reporte de Avance / Entregable de Medio Sprint antes de las 23:59 hs** por el campus virtual. El Scrum Master en funciones es el responsable directo de compilarlo.

### 3.1. Procedimiento de Confección
1. El día viernes previo a las 18:00 hs, el Scrum Master solicita a cada rol sus evidencias de avance (capturas de red, logs, tests de Playwright, estado de Staging).
2. Crear el archivo en el repositorio:  
   `docs/entregables/entrega-pps-sprint-<NUMERO_SPRINT>.md`
3. Abrir PR hacia `develop` y mergearlo antes del sábado al mediodía.

### 3.2. Estructura Mandatoria del Documento de Entrega

```markdown
# Reporte de Avance de Medio Sprint — Sprint X

**Proyecto:** MargenX — Control de Rentabilidad y Costos en Tiempo Real  
**Fecha de Entrega:** DD/MM/2026 — Campus UNaB  
**Scrum Master del Sprint:** [Nombre del integrante a cargo]  
**Estado General:** [A Tiempo / Con Desvíos / Bloqueado]  

---

## 1. PERSPECTIVA DE NEGOCIO Y CLIENTE (Evaluación Cátedra Ágiles)
* **Objetivo de Negocio del Sprint:** [Breve resumen del dolor que resuelve este incremento].
* **Historias de Usuario Completadas:**
  - HU-XX: [Nombre] — [Aporte de valor tangible].
* **Validación con Comercios Piloto:**
  - Evidencia de prueba con datos de Panadería Central y/o Química GyJ.
  - Comportamiento ante casos deliberados de margen bajo.
* **Verificación de Usabilidad Mobile-First (360px):**
  - [Adjuntar capturas de pantalla comprobando que no hay desbordes horizontales ni scroll en el body].

---

## 2. PERSPECTIVA ARQUITECTÓNICA Y DE INGENIERÍA (Evaluación Product Owner PPS)
* **Estado de la Infraestructura VPS Donweb (168.197.49.120):**
  - Contenedores activos en Staging: Frontend Dev (3020), Backend Dev (3021), Postgres (5435), n8n (5678).
  - Estado de la base de datos `margenx_dev`.
* **Integridad Transaccional y Persistencia:**
  - Migraciones de Prisma ejecutadas limpiamente (`prisma migrate deploy`).
  - Uso verificado de `prisma.$transaction` en operaciones compuestas.
* **Seguridad y Multi-tenancy:**
  - Aislamiento comprobado por `accountId` en cada consulta.
  - Validación de tokens asimétricos JWT de Clerk mediante `authMiddleware`.
* **Estado del Pipeline de CI/CD:**
  - Verificación de `ci.yml` y `deploy.yml` finalizados en verde en GitHub Actions.
  - URL de Staging operativa: `https://dev.margenx.tech`.

---

## 3. TABLA DE VELOCIDAD Y ESTADO DE ISSUES
| Issue | Asignado | Rol | Story Points | Estado | PR Vinculado |
|---|---|---|---|---|---|
| #XX | @usuario | Backend/Frontend/QA/DevOps | X SP | Done / In Review | #YY |
```

---

## 4. Checklist de Cierre de Sprint (Hardening, Release & Retrospectiva)

El cierre de sprint se ejecuta durante la ventana de estabilización (*hardening window*). El Scrum Master lidera la auditoría de calidad, la actualización de gobernanza y el despliegue a producción.

---

### FASE 1: Auditoría Estricta de Definition of Done (DoD) (Runbook Técnico)

Antes de autorizar el cierre del sprint, el Scrum Master ejecuta los siguientes comandos de auditoría en la terminal local del proyecto:

```bash
# 1. Auditoría Backend: Compilación TypeScript estricta (0 errores, sin any)
cd backend && npm run build

# 2. Auditoría Frontend: Linter y Typecheck de producción
cd ../frontend && npm run lint && npm run build

# 3. Auditoría de Tests E2E (Playwright)
npm run test:e2e
```

Además, verifica manualmente las siguientes reglas arquitectónicas:
- [ ] **TypeScript Estricto:** Cero uso injustificado de `any`. En backend, `tsconfig.json` debe compilar exclusivamente `src/**/*` (`rootDir: ./src`). El seed debe usar `tsconfig.seed.json`.
- [ ] **Mobile-First Real (360px):** Abrir DevTools en 360px. Ninguna tabla, card o modal debe generar scroll horizontal en el `body`. Las tablas deben implementar el patrón *Table-to-Cards* o contenedor con `overflow-x-auto`.
- [ ] **Aislamiento Multi-Tenant Inviolable:** Correr el script de validación estricta por `accountId` en las rutas de Prisma:
  ```bash
  grep -rn "prisma\." backend/src/routes/ | grep -v "accountId"
  ```
  *(Asegurarse de que toda consulta de lectura y escritura esté blindada por la cuenta del usuario).*
- [ ] **Integridad Referencial en Insumos:** Confirmar que `DELETE /api/ingredients/:id` devuelva `HTTP 409 Conflict` con `{ productsAffected: [...] }` si el insumo está en uso en alguna receta activa.
- [ ] **Staging Operativo:** Verificar healthcheck en Staging:
  ```bash
  curl -I https://api-dev.margenx.tech/api/health
  # Debe responder HTTP/2 200 OK
  ```

---

### FASE 2: Acta de Cierre y Retrospectiva de Sprint

Crear el archivo en el repositorio: `docs/retrospectivas/acta-cierre-sprint-<NUMERO_SPRINT>.md`.

#### Estructura Requerida:
1. **Datos de la Sesión:** Fecha, hora, participantes y facilitador.
2. **Cumplimiento del Sprint Goal:** Declaración explícita del incremento de producto logrado.
3. **Métricas de Rendimiento:** Story Points comprometidos vs. completados, PRs mergeados y bugs resueltos.
4. **Dinámica Start / Stop / Continue (Retrospectiva):** Análisis de lo que funcionó, lo que generó fricción y los acuerdos de mejora.
5. **Traspaso de Mando:** Firma del Scrum Master saliente y aceptación del Scrum Master entrante.

---

### FASE 3: Actualización del `CHANGELOG.md`

En la raíz del repositorio, actualizar `CHANGELOG.md` siguiendo el estándar [Keep a Changelog](https://keepachangelog.com/) y [Semantic Versioning](https://semver.org/):

1. Mover el contenido acumulado en `## [Unreleased]` hacia la nueva versión (ej. `## [0.2.0] - 2026-09-18`).
2. Clasificar los cambios bajo las categorías estándar: `### Added`, `### Changed`, `### Fixed`, `### Security`.
3. Commitear y pushear el cambio a `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b docs/cierre-sprint-X
   git add CHANGELOG.md docs/
   git commit -m "docs(release): preparar changelog y acta de cierre sprint X"
   git push origin docs/cierre-sprint-X
   ```

---

### FASE 4: Regla Crítica de Permisos y Procedimiento de Release en GitHub (Runbook de Despliegue)

> ⚠️ **REGLA DE PERMISOS ESTRICTA (NO BYPASS):**  
> Las ramas `main` y `develop` cuentan con **reglas de protección de ramas activas**. Ningún desarrollador (incluido el Scrum Master) tiene permisos para hacer merge por terminal ni hacer push directo de tags por consola (`git push origin vX.Y.Z` será rechazado).  
> **El proceso de release debe ejecutarse 100% a través de la interfaz web de GitHub.**

```
                           FLUJO DE RELEASE WEB EN GITHUB
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. PR en GitHub Web: develop ➔ main (Squash & Merge tras aprobación)        │
│ 2. GitHub Web ➔ Releases ➔ Draft a new release (Crear tag vX.Y.Z en main)   │
│ 3. GitHub Actions dispara deploy.yml automáticamente hacia la VPS           │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Procedimiento Paso a Paso:

#### Paso 1: Abrir el Pull Request de Release en la Web de GitHub
1. Ir a: `https://github.com/dgimenezdeveloper/margenx/compare/main...develop`.
2. **Configuración:** `base: main` ⟵ `compare: develop`.
3. **Título:** `release: vX.Y.Z - Cierre Sprint X (<Hito Principal>)`.
4. **Descripción:** Pegar el bloque de cambios redactado en el `CHANGELOG.md`. En *Issue Vinculada* colocar: `N/A - Release formal de cierre de Sprint X`.
5. Esperar que el pipeline de CI (`ci.yml`) termine en verde y solicitar aprobación de Peer Review.

#### Paso 2: Ejecutar la Fusión Web (Squash and Merge)
1. Hacer clic en **Squash and merge**. La rama `main` de producción queda actualizada con todo el código del sprint.

#### Paso 3: Crear el Tag de Release desde la Web de GitHub
1. Ir a la pestaña **Releases** (`https://github.com/dgimenezdeveloper/margenx/releases`).
2. Hacer clic en **Draft a new release**.
3. En *Choose a tag*: Escribir el nuevo tag con la convención oficial: **`vX.Y.Z`** (ej. `v0.2.0`), asegurando que el *Target* sea **`main`**.
4. En *Release title*: Colocar `MargenX Release vX.Y.Z - Sprint X`, pegar las notas del `CHANGELOG.md` en la descripción y hacer clic en **Publish release**.

#### Paso 4: Impacto y Monitoreo del Pipeline de Despliegue (`deploy.yml`)
Al publicarse el Release en `main`, GitHub Actions dispara automáticamente el workflow `deploy.yml`:
1. Compila las imágenes de Frontend y Backend con tag `:latest`.
2. Sube las imágenes a Docker Hub (`dgimenezdeveloper/margenx-frontend:latest` y `dgimenezdeveloper/margenx-backend:latest`).
3. Se conecta por SSH a la VPS Donweb (`168.197.49.120`) y ejecuta:
   ```bash
   docker compose pull backend-prod frontend-prod
   docker compose run --rm backend-prod npx prisma migrate deploy  # Contra la base margenx_prod en puerto 5435
   docker compose up -d --no-deps backend-prod frontend-prod
   ```
4. Envía notificación verde a Discord con mención `@everyone`.

#### Paso 5: Sincronización Local Post-Release
```bash
git checkout develop
git pull origin develop
git fetch --tags  # Descarga el tag creado en la web a tu máquina local
```

#### Paso 6: Verificación en Vivo (Smoke Test de Producción)
- [ ] Verificar endpoint de healthcheck en producción:
  ```bash
  curl -I https://api.margenx.tech/api/health
  # Debe responder HTTP/2 200 OK
  ```
- [ ] Abrir `https://margenx.tech` en navegador de celular (360px) y verificar inicio de sesión con Clerk y listados operativos.

---

## 5. Matriz de Handover para la Rotación de Roles

Al concluir la FASE 4, el Scrum Master saliente realiza la entrega formal al entrante verificando esta lista de traspaso:

- [ ] **Tablero Limpio:** Todas las issues del sprint cerrado están en columna `Done`.
- [ ] **Backlog Refinado:** Las issues del sprint entrante tienen responsable asignado, prioridad fijada (P1 a P4) y descripción técnica alineada al DoD.
- [ ] **Ramas Eliminadas:** Ramas de trabajo de issues cerradas (`feature/*` y `fix/*`) borradas tanto en local como en remoto (`git remote prune origin`).
- [ ] **Variables de VPS Verificadas:** El archivo `/opt/margenx-infra/.env` en la VPS conserva intactas las 9 líneas del certificado PEM `CLERK_JWT_KEY` y credenciales de base de datos.
- [ ] **Fecha de Entrega de Medio Sprint:** Notificada en el grupo de WhatsApp la fecha límite del próximo entregable online para la cátedra.