# ACTA DE EQUIPO Y PROPUESTA DE PROYECTO
**Materia:** Practicas Profesionales Supervisadas (PPS)  
**Proyecto:** MargenX — Control de Margenes en Tiempo Real  
**Fecha de Entrega:** 29/08/2026  

---

## 1. Integrantes, Roles y Canales de Trabajo

| Integrante | Rol Asignado | Responsabilidad Principal |
|---|---|---|
| **Darío Gimenez** | Scrum Master, DevOps & Automatizacion | Gestion agil, tablero de proyecto, CI/CD, infraestructura VPS y n8n |
| **Federico Paal** | Lead Frontend & UX/UI Mobile-First | Capa de presentacion (React, Vite, Tailwind), diseno Figma y rutas |
| **Mauricio Barreras** | Lead Backend & Data Architect | API REST (Node/Express/TS), ORM Prisma, base de datos y Auth |
| **Leandro Herrera** | QA Engineer & Enlace Cliente Real | Matriz de pruebas, datos de seed, calidad y testing E2E (Playwright) |

***Nota sobre la gestion agil:** Darío Gimenez asume la facilitacion como Scrum Master para la implementacion del marco agil, estandarizacion de issues y gobierno del repositorio, previendo esquemas de rotacion de facilitacion en etapas avanzadas segun pautas de la catedra.*

* **Canales de comunicacion:** Discord (reuniones sincronicas y tecnicas) y WhatsApp (coordinacion agil diaria).
* **Herramientas de gestion:** Repositorio y Tablero Kanban en GitHub Projects v2 (con automatizacion CI/CD via GitHub Actions) y Figma.
* **Horarios de trabajo conjunto / Daily Meeting:** Lunes a sabados (De entrega) a las 10:00 hs.

---

## 2. Proyecto Elegido y Justificacion
* **Proyecto:** MargenX.
* **Justificacion:** En el contexto economico argentino actual, las PyMEs y emprendimientos productivos sufren aumentos constantes de precios en sus materias primas y no ajustan sus precios de venta a tiempo, operando a margen ciego o a perdida. MargenX resuelve esto de forma practica, escalable y con un modelo transaccional robusto, perfectamente acotado para un MVP de 8 sprints bajo arquitectura monolitica con automatizaciones satelite.

---

## 3. Problema y Usuarios Objetivo
* **Usuarios:** Dueños (Administradores) y encargados de compras/stock (Colaboradores) de comercios de elaboracion y manufactura (panaderias, fabricas de pastas, quimicas de limpieza, talleres artesanales).
* **Problema que resuelve:** Elimina la gestion manual en planillas de calculo desactualizadas o a calculo mental, recalculando al instante el margen de ganancia de cada producto terminado ante cualquier cambio de precio en sus insumos y alertando desvios de rentabilidad.

---

## 4. Alcance del MVP
> *"Permitir que un usuario actualice el costo de un insumo y el sistema recalcule en tiempo real el costo y margen de todos los productos que lo utilizan, alertando visualmente y por email (via n8n) cuando un producto queda por debajo del margen minimo esperado."*

---

## 5. Requerimientos Principales (Alto Nivel)

**Requerimientos Funcionales:**
1. **Gestion Multiempresa y Roles:** Aislamiento de datos por comercio (Multi-tenant) con roles de Administrador (dueño) y Colaborador (empleado restringido).
2. **ABM de Insumos y Productos:** Carga de materias primas y definicion de productos terminados con su receta exacta y precio de venta.
3. **Motor de Recalculo en Cascada:** Al actualizar el costo de un insumo, el sistema recalcula automaticamente el costo total y el margen de todos los productos que lo utilizan.
4. **Sistema de Alertas:** Identificacion visual (semaforo) y notificacion asincrona por email cuando un producto cae por debajo del margen minimo esperado.

**Requerimientos No Funcionales:**
1. **Interfaz:** Web Mobile-First, responsive desde 360px.
2. **Seguridad:** Autenticacion delegada y validacion estricta de roles en el backend para evitar fuga de datos financieros.

---

## 6. Diseno de Arquitectura

El sistema se diseno bajo el patron de **Monolito Ordenado con Arquitectura Hibrida**, separando la capa de computo de la capa de persistencia y automatizacion. 



* **Capa de Presentacion y Aplicacion (Nube Publica):** Frontend (React) y Backend (Node/Express) dockerizados y desplegados en Microsoft Azure mediante CI/CD (GitHub Actions).
* **Capa de Datos y Eventos (VPS Privada):** Base de datos relacional (PostgreSQL) y motor de orquestacion (n8n) alojados en una VPS propia (On-Premise) con volumenes persistentes. n8n actua como servicio satelite consumiendo webhooks del backend para el envio de alertas, sin acoplar logica pesada al monolito.

---

## 7. Clientes Reales / Validacion de Dominio
El equipo cuenta con dos comercios reales para la toma de requerimientos, prueba de datos y validacion de la prueba piloto:
1. **Comercio Principal (Manufactura):** Quimica de productos de limpieza barrial (contacto directo a traves de Leandro Herrera).
2. **Comercio Piloto (Gastronomia):** Panaderia barrial (contacto comercial del equipo para validacion de recetas alimenticias).

---

## 8. Stack Tecnologico
* **Frontend:** React 19 + TypeScript, Vite, Tailwind CSS, React Router, Zustand.
* **Backend:** Node.js, Express, TypeScript, Prisma ORM.
* **Base de Datos:** PostgreSQL 16 (Docker local para desarrollo; Docker con volumenes persistentes en VPS para produccion).
* **Autenticacion:** Supabase Auth o Clerk (Control de roles RBAC: Administrador vs. Colaborador).
* **Automatizacion:** n8n (Self-hosted en VPS disparado por webhooks para generacion de PDFs y alertas por email).
* **Infraestructura y DevOps:** VS Code DevContainers, GitHub Actions (CI/CD) y Microsoft Azure (App Service).
* **Testing:** Playwright (E2E) y Vitest (Unitario).