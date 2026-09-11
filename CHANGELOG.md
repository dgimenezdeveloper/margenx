
# Changelog — MargenX

Todos los cambios notables de este proyecto serán documentados en este archivo siguiendo el estándar [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased] (En desarrollo - Sprint 1)

### Added (Terminado y Mergeado)
- **DevOps:** Pipeline de Despliegue Continuo (CD) hacia VPS Donweb vía Docker Hub, SSH (puerto 5371) y Nginx Reverse Proxy (`#40` via PR `#58`).
- **DevOps:** Automatización de migraciones de Prisma en el pipeline de deploy mediante contenedor efímero con mecanismo de fallo seguro (`#41` via PR `#59`).
- **Backend:** Middleware global de captura, formateo y estandarización de errores HTTP (`#35` via PR `#51`).
- **Backend:** Paginación y ordenamiento (Sorting) nativo en base de datos para la API de Insumos (`#36` via PR `#57`).
- **Frontend:** Maquetado responsivo Mobile-First de vistas de Insumos y Productos con tablas, badges y Empty States (`#31` via PR `#53`).
- **Frontend:** Formularios de Insumos y Productos con validación estricta Zod y React Hook Form (`#32` via PR `#55`).
- **QA:** Script ejecutable de Seed idempotente (`prisma/seed.ts`) con dataset verídico de comercios piloto (`#30` via PR `#52`).
- **QA:** Redacción de Casos de Prueba manuales en formato Gherkin para Insumos y Productos (`#39` via PR `#54`).
- **QA:** Colección de pruebas automatizadas de API en Postman/Newman para el módulo de Insumos (`#37` via PR `#56`).

### In Review (En Revisión de Pares / PR Abierto)
- **Frontend:** Integración con `<ClerkProvider>`, capa de servicios y consumo de API autenticada mediante tokens JWT (`#29` en PR `#60`).
- **Frontend:** Integración de API de Insumos y Productos con manejo visual de estados de carga (Loading/Skeletons) y error (`#33` en PR `#60`).

### In Progress (En Desarrollo)
- **QA:** Colección de pruebas automatizadas de API para el módulo de Productos en Postman/Newman (`#38`).

### To Do (Planificado / Próximo a iniciar)
- **DevOps:** Configuración de notificaciones automáticas de estado de CI/CD vía Webhook de Discord (`#42`).

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
