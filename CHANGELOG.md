# Changelog — MargenX

Todos los cambios notables de este proyecto serán documentados en este archivo siguiendo el estándar [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased] (En desarrollo - Sprint 1)
### Added (Planificado)
- **Frontend:** Formularios con validación Zod y React Hook Form (`#32`).
- **Frontend:** Integración de `<ClerkProvider>` y consumo de API con token JWT (`#29`, `#33`).
- **Backend:** Middleware global de captura de excepciones HTTP (`#35`).
- **Backend:** Paginación y ordenamiento en endpoint de Insumos (`#36`).
- **QA:** Script ejecutable de Seed idempotente en `prisma/seed.ts` (`#30`).
- **QA:** Colecciones automatizadas de Postman para Insumos y Productos (`#37`, `#38`).
- **DevOps:** Pipeline de Despliegue Continuo (CD) hacia Azure App Service (`#40`).

---

## [0.1.0] - 2026-09-04 (Sprint 0: Setup y Fundaciones)
### Added (Agregado)
- **DevOps:** Configuración de entorno aislado con VS Code DevContainers (Node 20, TypeScript, PostgreSQL 16 local).
- **DevOps:** Pipeline de Integración Continua (CI) en GitHub Actions (`ci.yml`) con verificación de lint, typecheck y compilación.
- **DevOps:** Automatización de tablero Kanban mediante GraphQL API (`auto-move-issues.yml`).
- **Infra:** Despliegue en VPS propia de PostgreSQL 16 (puerto 5435) y orquestador n8n bajo subdominio con certificado SSL.
- **Backend:** Modelo relacional base en Prisma (`Account`, `User`, `Ingredient`, `Product`, `ProductIngredient`).
- **Backend:** Middleware de autenticación delegada (`authMiddleware`) con verificación asimétrica de JWT mediante Clerk.
- **Backend:** Endpoints CRUD para gestión de Insumos (`/api/ingredients`) con aislamiento multi-tenant y tipos `Decimal`.
- **Backend:** Extensión no destructiva del modelo `Account` con campos comerciales (`isActive`, `trialEndsAt`).
- **Frontend:** Inicialización de React 19 con Vite, Tailwind CSS v4 y React Router v7.
- **Frontend:** Maquetado responsivo Mobile-First con Bottom Navigation Bar (360px) y catálogo base.
- **Frontend:** Soporte nativo para Modo Oscuro / Modo Claro y unificación visual bajo la marca MargenX.
- **Frontend:** Prototipado interactivo de constructor de recetas y simulador de ajuste de precios de venta.
- **QA:** Setup inicial de Playwright para pruebas E2E y matriz de pruebas con 10 casos en formato Gherkin.
- **QA:** Dataset verídico de validación (Seed Data) relevado con comercios reales (Panadería Central y Química GyJ).
- **Docs:** Registros de Decisiones de Arquitectura iniciales (ADR-001, ADR-002, ADR-003) y Acta de Cierre de Sprint 0.