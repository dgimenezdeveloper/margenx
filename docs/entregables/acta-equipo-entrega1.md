# ACTA DE EQUIPO Y PROPUESTA DE PROYECTO (ENTREGABLE 1)

**Materia:** Prácticas Profesionales Supervisadas (PPS)  
**Proyecto:** MargenX — Control de Márgenes en Tiempo Real  
**Fecha de Entrega:** 29/08/2026  
**Estado:** Aprobado / Entregado  

---

## 1. Acta de Equipo: Integrantes y Metodología de Trabajo

| Integrante | Rol Asignado | Responsabilidad Principal |
|:---|:---|:---|
| **Darío Giménez** | Scrum Master, DevOps & Automatización | Gestión ágil, tablero de proyecto, CI/CD, infraestructura VPS y n8n |
| **Federico Paal** | Lead Frontend & UX/UI Mobile-First | Capa de presentación (React 19, Vite, Tailwind CSS), diseño Figma y rutas |
| **Mauricio Barreras** | Lead Backend & Data Architect | API REST (Node/Express/TS), ORM Prisma, base de datos y Auth |
| **Leandro Herrera** | QA Engineer & Enlace Cliente Real | Matriz de pruebas, datos de seed, calidad y testing E2E (Playwright) |

***Nota sobre la gestión ágil:** Darío Giménez asume la facilitación como Scrum Master para la implementación del marco ágil, estandarización de issues y gobierno del repositorio, previendo esquemas de rotación en etapas avanzadas según pautas de la cátedra.*

* **Canales de comunicación:** Discord (reuniones sincrónicas y técnicas) y WhatsApp (coordinación ágil diaria).
* **Herramientas de gestión:** GitHub Projects v2 (Tablero Kanban automatizado con GraphQL) y Figma.
* **Horarios de trabajo conjunto / Daily Meeting:** Lunes a sábados a las 10:00 hs.

---

## 2. Propuesta de Proyecto

### 2.1. Problema, Justificación y Usuarios
* **Usuarios:** Dueños (Administradores) y encargados de compras/stock (Colaboradores) de comercios de elaboración y manufactura (panaderías, fábricas de pastas, químicas de limpieza, talleres artesanales).
* **El Problema:** En el contexto económico argentino, las PyMEs sufren aumentos constantes de precios en sus materias primas y no ajustan sus precios de venta a tiempo, operando a margen ciego o a pérdida por falta de herramientas accesibles.
* **La Solución (Alcance del MVP):** Permitir que un usuario actualice el costo de un insumo y el sistema recalcule en tiempo real el costo total y el margen de ganancia de todos los productos que lo utilizan en su receta, alertando visualmente (semáforo) y por email (vía n8n) cuando un producto queda por debajo del margen mínimo esperado.
* **Ciclo de Desarrollo:** El proyecto se estructura en 7 iteraciones de 2 semanas (**Sprint 0 a Sprint 6**), cubriendo desde la fase de fundaciones técnicas hasta la entrega final y defensa el 28/11/2026.

### 2.2. Requerimientos Principales (Alto Nivel)
* **Requerimientos Funcionales:**
  1. **Aislamiento Multiempresa y Roles (Multi-tenant):** Cuentas y catálogos aislados por comercio con roles de Administrador (acceso total) y Colaborador (carga de costos sin visibilidad de márgenes ni precios).
  2. **ABM de Insumos y Productos:** Gestión de materias primas con costos unitarios y definición de productos terminados con sus recetas exactas.
  3. **Motor de Recálculo en Cascada:** Actualización automática y transaccional de costos y márgenes de todos los productos afectados ante la variación de un insumo.
  4. **Sistema de Alertas Asíncronas:** Identificación visual de rentabilidad y notificación por correo electrónico vía webhooks ante desvíos de margen.
* **Requerimientos No Funcionales:**
  1. **Interfaz Web Mobile-First:** Diseño responsive verificado y navegable desde pantallas móviles de 360px de ancho.
  2. **Seguridad y Control de Acceso:** Autenticación delegada segura y validación estricta de roles a nivel de API para evitar fuga de información financiera.

### 2.3. Diseño de Arquitectura (Monolito Híbrido)
El sistema se diseñó bajo el patrón de **Monolito Ordenado con Arquitectura Híbrida**, separando la capa de cómputo de la capa de persistencia y automatización:

* **Capa de Cómputo y Aplicación (Nube Pública):** Frontend (React SPA) y Backend (API REST Node/Express) empaquetados en contenedores Docker y desplegados en **Microsoft Azure App Service** mediante CI/CD (GitHub Actions).
* **Capa de Persistencia y Eventos (VPS Privada):** Base de datos relacional (**PostgreSQL 16**) y motor de orquestación (**n8n**) alojados en una VPS propia con volúmenes persistentes y base de datos expuesta de forma segura en el puerto `5435`. n8n actúa como servicio satélite consumiendo webhooks del backend para el envío de alertas y reportes PDF sin sobrecargar el monolito.

---

## 3. Clientes Reales / Validación de Dominio

El equipo cuenta con dos comercios reales para la toma de requerimientos, validación de fórmulas y pruebas piloto:

1. **Comercio Principal (Manufactura):** **Química GyJ** (Química barrial de productos de limpieza; contacto directo a través de Leandro Herrera).
2. **Comercio Piloto (Gastronomía):** **Panadería Central** (Panadería artesanal para validación de recetas alimenticias y materias primas por peso/volumen).

---

## 4. Stack Tecnológico

* **Frontend:** React 19 + TypeScript, Vite, Tailwind CSS v4, React Router v7, Zustand, React Hook Form + Zod.
* **Backend:** Node.js, Express, TypeScript, Prisma ORM.
* **Base de Datos:** PostgreSQL 16 (Docker local para desarrollo en DevContainers; Docker con volúmenes persistentes en VPS para producción).
* **Autenticación:** Clerk (Gestión de identidad delegada y control de roles RBAC: `ADMIN` vs `COLLABORATOR` vía JWT).
* **Automatización:** n8n (Self-hosted en VPS disparado por webhooks para alertas por email y generación de reportes PDF).
* **Infraestructura y DevOps:** VS Code DevContainers, GitHub Actions (CI/CD) y Microsoft Azure (App Service).
* **Testing:** Playwright (E2E de navegador) y Postman/Newman (API e integración).

---

## 5. Firmas y Compromiso del Equipo

- **Darío Giménez** *(Scrum Master, DevOps & Automatización)*
- **Mauricio Barreras** *(Lead Backend & Data Architect)*
- **Federico Paal** *(Lead Frontend & UX/UI Mobile-First)*
- **Leandro Herrera** *(QA Engineer & Enlace Cliente Real)*