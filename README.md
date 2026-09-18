# 📊 MargenX — Control de Márgenes en Tiempo Real / Real-Time Profit Margin SaaS

[![CI/CD Pipeline](https://img.shields.io/github/actions/workflow/status/dgimenezdeveloper/margenx/ci.yml?branch=develop&label=CI%20Pipeline&logo=githubactions&logoColor=white)](#)
[![Deployment](https://img.shields.io/badge/CD%20Deploy-VPS%20Linux%20%7C%20Docker%20Hub-2496ED?logo=docker&logoColor=white)](#)
[![Stack](https://img.shields.io/badge/Stack-React%2019%20%7C%20Express%205%20%7C%20Prisma%206%20%7C%20PostgreSQL%2016-blue)](#)
[![Automation](https://img.shields.io/badge/Automation-n8n%20Webhooks%20%7C%20IMAP-FF6D5A?logo=n8n&logoColor=white)](#)
[![Testing](https://img.shields.io/badge/Testing-Playwright%20E2E%20%7C%20Vitest%20%7C%20Postman-darkgreen?logo=playwright&logoColor=white)](#)
[![Figma](https://img.shields.io/badge/UI%2FUX-Figma%20Interactive%20Prototype-F24E1E?logo=figma&logoColor=white)](https://www.figma.com/proto/VP7NOtPGVwSCPZex5wYpmZ/Margen-X?node-id=0-1&t=AkoTRJ9OMR8ePuRU-1)

> Aplicación web multiempresa para comercios gastronómicos, manufactura artesanal y química. Calcula el margen de ganancia real por producto ante la variación de costos de materias primas, con recálculo en cascada, alertas automáticas vía n8n y aislamiento estricto multi-tenant.
>
> 🌐 **Navegación rápida / Quick Navigation:** [English Documentation](#-english-documentation) | [Documentación en Español](#-documentación-en-español)

---

## 🌐 English Documentation

### 1. Executive Summary & Business Problem
In high-inflation economies, small and medium manufacturing enterprises (bakeries, food trucks, craft manufacturers, cleaning product packagers) calculate product costs once on static spreadsheets and rarely update them. 

When a raw material increases in price (e.g., flour, beef, chemicals, containers), selling prices remain outdated. Consequently, profit margins shrink silently, leading businesses to operate at a loss without realizing it.

**MargenX** solves this problem through:
- **Cascading Recalculation:** Updating an ingredient's cost triggers an automated database transaction that recalculates the total cost and gross profit margin of every finished good using that ingredient across the entire catalog.
- **Visual & Automated Alerts:** Immediate traffic-light badges on the dashboard and asynchronous alerts via **n8n** (Email / Telegram) when a product falls below the target margin threshold.
- **Zero-Click Supplier Ingestion:** Business owners forward supplier price lists (Excel/CSV) to a virtual inbox (`precios+<slug>@margenx.tech`). The system updates mapped items and discards unmapped rows (anti-pollution catalog protection).

---

### 2. UI/UX Design & Figma Prototype
To ensure an intuitive user experience and validate recipe creation flows prior to code implementation, the interface was designed from the ground up under a **Mobile-First (360px)** strategy.

🔗 **[View Interactive Figma Prototype](https://www.figma.com/proto/VP7NOtPGVwSCPZex5wYpmZ/Margen-X?node-id=0-1&t=AkoTRJ9OMR8ePuRU-1)**

The application is structured into four core operational modules:
1. **Authentication & Onboarding (`/login`):** Streamlined sign-in with delegated identity management and multi-tenant domain isolation.
2. **Main Dashboard (`/dashboard`):** Real-time financial summary displaying monitored catalog items, average profitability, and risk alerts with WCAG AA compliant contrast badges (Green $\ge 30\%$, Red $< 30\%$).
3. **Pantry & Supply Management (`/insumos`):** Responsive inventory catalog with live unit cost tracking, search filtering, and inline modal creation.
4. **Products & Recipes (`/productos`, `/productos/nuevo`):** Bill of Materials (BOM) constructor with dynamic supply row additions, yield factor conversions, and interactive pricing simulator (+5%, +10%, target 30%).

---

### 3. Agile Leadership, Product Management & DevOps Case Study

> **Author's Role:** Darío Giménez — **Scrum Master, Product Manager, DevOps & Automation Architect**  
> **Team:** 4 Software Engineers (UNaB - PPS Supervised Professional Practice Program).  
> **Pilot Clients:** Real-world validation with *Panadería Central* (Gastronomy) and *Química GyJ* (Chemical packager).

#### Agile Project Management & Team Leadership
- **Scrum Framework:** Facilitated 7 two-week sprints (Sprint 0 to Sprint 6), leading daily standups (Discord, 10:00 hs), backlog grooming, and sprint retrospectives (`docs/retrospectivas/`).
- **Automated Kanban Board:** Authored `.github/workflows/auto-move-issues.yml`, connecting GitHub Actions to GitHub Projects v2 via GraphQL. Issues move automatically across stages: `BACKLOG → TO DO → IN PROGRESS → IN REVIEW → QA APPROVED → DONE`.
- **Definition of Done (DoD):** Enforced mandatory peer reviews, zero linter warnings, strict TypeScript typing, Gherkin acceptance criteria verification, and mobile-first 360px validation.
- **Progressive Complexity Strategy:** Decoupled ingredients from mandatory suppliers on Day 1, allowing draft "Uncosted" products (`cost = 0, margin = 0`) to prevent blocking commercial onboarding.

#### DevOps, Cloud Infrastructure & Automation
- **Standardized DevContainers:** Configured Dockerized VS Code environments (Node.js 20, TypeScript, PostgreSQL 16) ensuring zero configuration drift between Windows, macOS, and Linux.
- **Production VPS Deployment:** Configured a dedicated Ubuntu VPS hosting persistent PostgreSQL 16 (port 5435), n8n orchestrator (port 5678), Docker Compose, and Nginx reverse proxy with SSL certificates.
- **CI/CD Pipelines:**
  - `ci.yml`: Automated GitHub Actions pipeline verifying TypeScript compilation, ESLint, and Vite production build with Discord failure alerts.
  - `deploy.yml`: Automated continuous deployment building Docker Hub images, executing SSH deployment to VPS, running `prisma migrate deploy`, and notifying success/failure to team channels.
- **Satellite Automation with n8n:** Offloaded heavy reporting and email delivery to a self-hosted n8n instance via HTTP webhooks, ensuring n8n never directly writes to production PostgreSQL.

---

### 4. Technical Architecture & Core Data Model

#### Tech Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, Zustand, React Hook Form, Zod, Base UI, Lucide Icons.
- **Backend:** Node.js 20, Express 5, TypeScript, Prisma ORM 6.
- **Database:** PostgreSQL 16 (strict multi-tenant partitioning by `accountId`).
- **Identity & RBAC:** Clerk (asymmetric JWT verification; `ADMIN` with full financial visibility vs. `COLLABORATOR` with sanitized operational access).
- **Automation & Alerts:** n8n (self-hosted), Cloudflare Email Routing Catch-All, Discord Webhooks.
- **Quality Assurance:** Playwright (E2E), Vitest (Unit testing), Postman / Newman (API integration).

#### Relational Schema Overview
- `Account`: Multi-tenant business account with unique routing slug and subscription status.
- `User`: Team operators linked to Clerk `authProviderId` with assigned role (`ADMIN` or `COLLABORATOR`).
- `Ingredient`: Raw materials with internal unit of measure (`kg`, `l`, `u`) and current cost.
- `Product`: Finished goods with sale price, minimum margin threshold, and calculated financial metrics.
- `ProductIngredient`: Relational recipe matrix joining products and ingredients with specific yield quantities.

---

### 5. Local Setup & Quick Start

#### Option A: Automated DevContainers (Recommended)
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (WSL2 enabled on Windows) and [VS Code](https://code.visualstudio.com/).
2. Install the **Dev Containers** extension in VS Code.
3. Clone the repository and open it:
   ```bash
   git clone https://github.com/dgimenezdeveloper/margenx.git
   cd margenx
   code .
   ```
4. Press `F1` and select **"Dev Containers: Reopen in Container"**. All services, Node dependencies, and database containers will initialize automatically.

#### Option B: Manual Local Setup
```bash
# 1. Start PostgreSQL 16 in Docker
docker run --name margenx_postgres_dev -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=devpassword123 -e POSTGRES_DB=margenx_dev -p 5432:5432 -d postgres:16-alpine

# 2. Setup & Run Backend
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
export SEED_CONFIRM_TARGET="localhost:5432/margenx_dev"
npx prisma db seed
npm run dev

# 3. Setup & Run Frontend (in another terminal)
cd ../frontend
npm install
cp .env.example .env
npm run dev
```

---

### 6. Project Team & Academic Context
Developed as part of the **Supervised Professional Practice (PPS)** — *University Degree in Software Development* (Universidad Nacional Guillermo Brown - UNaB):

- **Darío Giménez** — *Scrum Master, Product Manager, DevOps & Automation Architect*  
  [GitHub](https://github.com/dgimenezdeveloper) • [LinkedIn](https://www.linkedin.com/in/daseg/)
- **Mauricio Barreras** — *Lead Backend & Data Architect*  
  [GitHub](https://github.com/Mau-bar-iva) • [LinkedIn](https://www.linkedin.com/in/mauricio-barreras-235b8128a/)
- **Federico Paál** — *Lead Frontend & Mobile-First UX/UI*  
  [GitHub](https://github.com/FedericoPaal) • [LinkedIn](https://www.linkedin.com/in/federico-paal/)
- **Leandro Herrera** — *QA Engineer & Client Liaison*  
  [GitHub](https://github.com/LeanHerrera97)

---

## 🇪🇸 Documentación en Español

### 1. Resumen Ejecutivo y Problema del Negocio
En economías con alta inflación, las PyMEs y microemprendimientos de elaboración (panaderías, fábricas de pastas, productos químicos de limpieza, talleres artesanales) calculan sus costos una sola vez en planillas estáticas y rara vez los actualizan.

Cuando sube el costo de una materia prima (harina, carne, cloro, envases), los precios de venta permanecen desactualizados. En consecuencia, el margen de ganancia se reduce progresivamente, llevando a vender a pérdida o a operar a margen ciego sin que el dueño lo note.

**MargenX** resuelve este problema mediante:
- **Recálculo en Cascada:** La modificación del costo de un insumo actualiza de forma transaccional el costo total de receta y el margen porcentual de todos los productos vinculados en el catálogo.
- **Alertas Visuales y Automatizadas:** Semáforo de rentabilidad en el panel principal y notificaciones inmediatas por email o Telegram vía **n8n** ante quiebres del umbral mínimo de rentabilidad.
- **Ingesta Desatendida "Zero-Click":** El dueño reenvía listas mayoristas en Excel/CSV a una casilla virtual (`precios+<slug>@margenx.tech`). El sistema actualiza los códigos equivalentes y descarta automáticamente los miles de artículos que el negocio no consume (filtro anti-polución).

---

### 2. Diseño UI/UX y Prototipo en Figma
Para garantizar una experiencia visual clara y validar los flujos de carga antes del desarrollo, la interfaz fue diseñada bajo un enfoque **Mobile-First (360px)**.

🔗 **[Ver Prototipo Interactivo en Figma](https://www.figma.com/proto/VP7NOtPGVwSCPZex5wYpmZ/Margen-X?node-id=0-1&t=AkoTRJ9OMR8ePuRU-1)**

Módulos principales del sistema:
1. **Login y Acceso (`/login`):** Inicio de sesión con autenticación delegada y aislamiento multiempresa.
2. **Dashboard Principal (`/dashboard`):** Resumen de rentabilidad en tiempo real con semáforo de alerta visual accesible bajo estándar WCAG AA (Verde $\ge 30\%$, Rojo $< 30\%$).
3. **Insumos (`/insumos`):** Gestión de materias primas con buscador, unidades de medida (`kg`, `l`, `u`) y formulario modal de alta y edición rápida.
4. **Productos y Recetas (`/productos`, `/productos/nuevo`):** Ficha técnica con selector dinámico de ingredientes por receta, conversión de unidades y simulador interactivo de precios de venta (+5%, +10%, margen 30%).

---

### 3. Caso de Estudio: Liderazgo Ágil, Gestión de Producto y DevOps

> **Rol:** Darío Giménez — **Scrum Master, Product Manager, Ingeniero DevOps y Automatización**  
> **Equipo:** 4 Desarrolladores (UNaB - PPS Prácticas Profesionales Supervisadas).  
> **Comercios Piloto:** Validación con *Panadería Central* (Gastronomía) y *Química GyJ* (Manufactura química).

#### Gestión Ágil y Liderazgo de Equipo
- **Marco Scrum:** Planificación y facilitación de 7 sprints de 2 semanas (Sprint 0 al 6), standups diarias a las 10:00 hs por Discord y actas de retrospectiva (`docs/retrospectivas/`).
- **Tablero Kanban Automatizado con GraphQL:** Implementación del workflow `.github/workflows/auto-move-issues.yml` que sincroniza GitHub Projects v2 según los eventos de Git: `BACKLOG → TO DO → IN PROGRESS → IN REVIEW → QA APPROVED → DONE`.
- **Definition of Done (DoD):** Criterios rigurosos de cierre que exigen aprobación por pares (Peer Review), tipado TypeScript estricto sin `any`, verificación Gherkin, compatibilidad mobile en 360px y aprobación de QA.
- **Estrategia de Complejidad Progresiva:** Desacoplamiento de insumos y proveedores para permitir productos en borrador "Sin Costear" (`cost = 0, margin = 0`), evitando trabas en el onboarding inicial.

#### DevOps, Infraestructura y Automatización
- **DevContainers Estandarizados:** Configuración de contenedores en VS Code (Node 20, TypeScript, PostgreSQL 16 local) para que cualquier integrante levante el stack en menos de 10 minutos sin discrepancias de entorno.
- **Infraestructura en VPS Linux:** Despliegue en servidor propio Ubuntu con PostgreSQL 16 persistente (puerto 5435), n8n (puerto 5678), red aislada en Docker Compose y Nginx con certificados SSL.
- **Pipelines de CI/CD:**
  - `ci.yml`: Integración continua validando compilación de backend y build de frontend con alertas enriquecidas en Discord.
  - `deploy.yml`: Despliegue continuo hacia Staging (`dev.margenx.tech`) y Producción (`margenx.tech`) mediante Docker Hub, conexión SSH a VPS y ejecución de migraciones automáticas (`prisma migrate deploy`).
- **Automatización Satélite con n8n:** Desacoplamiento de reportes PDF y correos transaccionales en n8n mediante webhooks HTTP, preservando la regla: *n8n nunca escribe directamente en la base de datos de producción.*

---

### 4. Arquitectura Técnica y Modelo de Datos

#### Stack Tecnológico
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, Zustand, React Hook Form, Zod, Base UI, Lucide Icons.
- **Backend:** Node.js 20, Express 5, TypeScript, Prisma ORM 6.
- **Base de Datos:** PostgreSQL 16 (particionamiento multiempresa por `accountId`).
- **Autenticación:** Clerk (JWT asimétrico con roles `ADMIN` y `COLLABORATOR`).
- **Automatización:** n8n, Cloudflare Email Routing Catch-All, Webhooks Discord.
- **Testing:** Playwright (E2E), Vitest, Postman / Newman.

#### Entidades Principales de Persistencia
- `Account`: Comercio registrado con slug único para la recepción de listas por correo.
- `User`: Usuarios vinculados al proveedor Clerk con rol asignado.
- `Ingredient`: Insumo con unidad de costeo y costo vigente.
- `Product`: Producto final con precio de venta, costo calculado y margen resultante.
- `ProductIngredient`: Receta compuesta que vincula producto con insumos y sus cantidades.

---

### 5. Guía de Inicio Rápido Local

#### Opción A: DevContainers de VS Code (Recomendada)
1. Instalar [Docker Desktop](https://www.docker.com/products/docker-desktop/) (con WSL2 en Windows) y [VS Code](https://code.visualstudio.com/).
2. Instalar la extensión **Dev Containers** en VS Code.
3. Clonar y abrir el proyecto:
   ```bash
   git clone https://github.com/dgimenezdeveloper/margenx.git
   cd margenx
   code .
   ```
4. Presionar `F1` y seleccionar **"Dev Containers: Reopen in Container"**. El entorno configurará automáticamente Node.js 20 y PostgreSQL 16.

#### Opción B: Ejecución Manual
```bash
# 1. Iniciar PostgreSQL 16
docker run --name margenx_postgres_dev -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=devpassword123 -e POSTGRES_DB=margenx_dev -p 5432:5432 -d postgres:16-alpine

# 2. Configurar y levantar Backend
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
export SEED_CONFIRM_TARGET="localhost:5432/margenx_dev"
npx prisma db seed
npm run dev

# 3. Configurar y levantar Frontend (en otra consola)
cd ../frontend
npm install
cp .env.example .env
npm run dev
```

---

### 6. Equipo de Desarrollo y Contexto Académico
Proyecto desarrollado en el marco de las **Prácticas Profesionales Supervisadas (PPS)** — *Tecnicatura Universitaria en Programación / Desarrollo de Software* (Universidad Nacional Guillermo Brown - UNaB):

- **Darío Giménez** — *Scrum Master, Product Manager, DevOps & Automation Architect*  
  [GitHub](https://github.com/dgimenezdeveloper) • [LinkedIn](https://www.linkedin.com/in/daseg/)
- **Mauricio Barreras** — *Lead Backend & Data Architect*  
  [GitHub](https://github.com/Mau-bar-iva) • [LinkedIn](https://www.linkedin.com/in/mauricio-barreras-235b8128a/)
- **Federico Paál** — *Lead Frontend & Mobile-First UX/UI*  
  [GitHub](https://github.com/FedericoPaal) • [LinkedIn](https://www.linkedin.com/in/federico-paal/)
- **Leandro Herrera** — *QA Engineer & Client Liaison*  
  [GitHub](https://github.com/LeanHerrera97)

---

## 📄 Licencia
Este proyecto se encuentra bajo la licencia **ISC**. Consultar el archivo `package.json` para más detalles.
