# Acta de Cierre de Sprint y Retrospectiva — Sprint 0 (Inception)

**Proyecto:** MargenX — Control de Márgenes en Tiempo Real  
**Materia:** Prácticas Profesionales Supervisadas (PPS)  
**Fecha de Sesión:** 04/09/2026  
**Hora:** 18:30 hs  
**Facilitador / Scrum Master:** Dario Gimenez  
**Participantes:** Dario Gimenez (DevOps/SM), Mauricio Barreras (Lead Backend), Federico Paal (Lead Frontend), Leandro Herrera (QA Lead)  

---

## 1. Objetivo del Sprint 0 (Inception)
Establecer las bases arquitecturales, el entorno de desarrollo estandarizado, el modelo de datos relacional, la infraestructura híbrida de producción y el marco de calidad para dar inicio al desarrollo de las Historias de Usuario del MVP.

---

## 2. Hitos Técnicos y Entregables Completados

### A. DevOps, Automatización e Infraestructura (Dario Gimenez)
- **Entorno de Desarrollo Aislado:** Configuración completa de VS Code DevContainers con Node.js 20, TypeScript y PostgreSQL 16 efímero.
- **Pipeline de Integración Continua (CI):** Workflow de GitHub Actions (ci.yml) que valida linter, typecheck y compilación en cada Pull Request.
- **Tablero Ágil Automatizado:** Workflow con GitHub GraphQL API (auto-move-issues.yml) para gestión de estados en GitHub Projects v2.
- **Infraestructura Híbrida de Producción (VPS):** Despliegue dockerizado de PostgreSQL 16 (puerto host seguro 5435) y orquestador de webhooks n8n con volúmenes persistentes y playbook de recuperación ante desastres (infra/vps/README.md).

### B. Arquitectura de Datos y Backend (Mauricio Barreras)
- **Modelo de Dominio Prisma (schema.prisma):** Entidades Account, User, Ingredient, Product y ProductIngredient.
- **Estrategia Multi-Tenant:** Aislamiento estricto por accountId en todas las operaciones de persistencia.
- **Autenticación Delegada:** Middleware en Express (authMiddleware) con verificación asimétrica de JWT mediante Clerk y extracción segura de sesión (/api/auth/me).
- **CRUD de Insumos (/api/ingredients):** Endpoints REST completos con tipado estricto en Express 5, uso de Prisma.Decimal para precisión financiera y captura controlada de integridad referencial.
- **Extensión del Modelo Comercial:** Migración no destructiva para soporte de estados comerciales (isActive, trialEndsAt).

### C. Frontend y Experiencia de Usuario Mobile-First (Federico Paal)
- **Arquitectura de Presentación:** Setup de React 19, Vite, Tailwind CSS v4 y React Router v7 con shims de navegación optimizados.
- **Identidad de Marca y Theming:** Unificación visual completa bajo la marca MargenX (logo, favicon y metadatos) e implementación de soporte nativo para Modo Oscuro y Modo Claro.
- **Sistema de Navegación Adaptativo:** Implementación de Bottom Navigation Bar fija para dispositivos móviles (360px) y Navbar/Footer para resoluciones de escritorio.
- **Maquetado Estático Completo de Vistas (Issue #9 / PR #46):**
  - **Dashboard:** KPIs de rentabilidad, alertas de productos en riesgo y tabla resumida.
  - **Catálogo de Insumos (/insumos):** Listado con buscador, filtrado y modal para alta/edición de materias primas.
  - **Catálogo de Productos (/productos):** Vista de productos con badges de semáforo visual de rentabilidad (verde >= 30%, rojo < 30%).
  - **Editor de Recetas (/productos/nuevo):** Constructor de ficha técnica (BOM) con agregado dinámico de insumos, cantidades y cálculo de costo proyectado.
  - **Detalle de Producto y Simulador (/productos/:id):** Desglose de costos y simulador interactivo de ajuste de precio de venta (+5%, +10%, objetivo 30%).
  - **Perfil de Comercio (/perfil) y Login (/login):** Configuración de umbrales de margen global, switches de automatización n8n y pantalla de acceso.

### D. Calidad, Testing y Enlace con Dominio Real (Leandro Herrera)
- **Framework E2E:** Setup inicial de Playwright con configuración de reportes, trazas y script npm run test:e2e.
- **Matriz de Pruebas Sprint 1:** Documentación de casos de prueba funcionales y de seguridad multi-tenant en formato Gherkin (docs/qa/casos-prueba-sprint1.md).
- **Dataset Realista de Validación (Seed Data):** Relevamiento de datos con dos comercios reales (Panadería Central y Química GyJ), con insumos, productos terminados y recetas detalladas con verificación matemática de márgenes y casos deliberados de alerta roja.

---

## 3. Dinámica de Retrospectiva (Start / Stop / Continue)

### 🟢 Qué funcionó bien y debemos MANTENER (Continue)
1. **Rigor en la Definition of Done (DoD):** El circuito de Peer Review + QA Approval evitó que ingresaran bugs o inconsistencias a develop.
2. **Uso de Datos Verídicos:** El dataset confeccionado con comercios reales le da solidez inmediata a las pruebas de integración y a la futura demo con la cátedra.
3. **Aislamiento Multi-Tenant desde el Día 1:** Cada endpoint nace blindado por accountId.
4. **Alta Velocidad en Prototipado UI:** El maquetado anticipado de todas las pantallas permite que el equipo visualice el flujo completo del MVP desde el inicio.

### 🔴 Qué nos generó fricción y debemos ELIMINAR (Stop)
1. **Conflictos en package-lock.json:** Ocurridos al instalar dependencias en ramas de trabajo desactualizadas respecto a develop.
2. **Convención de Nombres de Ramas:** Se detectaron ramas creadas con caracteres especiales y tildes que generaron advertencias de codificación unicode en Git.
3. **Mocks Estáticos Desacoplados:** Evitar mantener datos inventados en el frontend; priorizar el consumo del script de Seed oficial una vez mergeado.

### 🟡 Qué acciones y acuerdos IMPLEMENTAREMOS en el Sprint 1 (Start)
1. **Sincronización Previa de Ramas:** Antes de abrir un Pull Request, el desarrollador debe sincronizar con `git fetch origin && git merge origin/develop` y verificar que el lockfile compile limpiamente.
2. **Nomenclatura Estricta de Ramas:** Uso exclusivo de caracteres ASCII en minúsculas, números y guiones vinculando el número de issue (ej: `feat/32-formularios-zod`).
3. **Separación de Capas:** Reemplazar el estado local de los formularios por esquemas de validación Zod (Issue #32), autenticación real con Clerk (Issue #29) y conexión a la API de Express (Issue #33).

---

## 4. Compromisos y Acuerdos de Equipo para el Sprint 1

| Acuerdo / Acción de Mejora | Responsable | Criterio de Medición |
|---|---|---|
| Estandarizar nombres de ramas en formato ASCII con número de issue | Todo el equipo | 0 advertencias de caracteres en PRs |
| Implementar Middleware de Errores y Paginación en Insumos | Mauricio Barreras | Endpoints probados con status 200/400/404 |
| Integrar formularios con Zod, autenticación Clerk y consumo de API real | Federico Paal | Eliminación de mocks estáticos en /insumos |
| Crear script de Seed idempotente (seed.ts) y colección Postman | Leandro Herrera | Base de datos poblada y tests de API en verde |
| Automatizar despliegue continuo (CD) a Azure y alertas en Discord | Dario Gimenez | Pipeline automático en cada merge a develop |

---

**Firma y Aprobación del Equipo:**  
- Dario Gimenez (Scrum Master / DevOps)  
- Mauricio Barreras (Lead Backend)  
- Federico Paal (Lead Frontend)  
- Leandro Herrera (QA Engineer)