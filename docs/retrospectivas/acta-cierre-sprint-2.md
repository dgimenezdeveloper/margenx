# Acta de Cierre de Sprint y Retrospectiva — Sprint 2 (MVP Core: Recetas Compuestas, Cálculo en Vivo y Despliegue en Producción)

**Proyecto:** MargenX — Control de Márgenes en Tiempo Real  
**Materia:** Prácticas Profesionales Supervisadas (PPS) / Metodologías Ágiles  
**Fecha de Sesión:** 02/10/2026  
**Hora:** 18:30 hs  
**Facilitador / Scrum Master Saliente:** Mauricio Barreras  
**Scrum Master Entrante (Rotación Sprint 3):** Leandro Herrera
**Participantes:** Darío Giménez (DevOps/SM), Mauricio Barreras (Lead Backend), Federico Paal (Lead Frontend), Leandro Herrera (QA Engineer & Enlace Cliente)

---

## 1. Objetivo del Sprint 2

Hacer realidad el **MVP Core funcional y público** de MargenX: dotar a la plataforma del motor de cálculo financiero de precisión con tipos `Prisma.Decimal`, construir el editor dinámico e interactivo de recetas compuestas (Bill of Materials) gestionado mediante estado global en Zustand con recálculo reactivo en $<50\text{ ms}$, habilitar la ficha técnica completa de producto (`/productos/:id`), sembrar un dataset realista de 20 recetas complejas para los comercios piloto, integrar la suite de pruebas E2E de Playwright en GitHub Actions y culminar con la **puesta a punto y despliegue del entorno productivo oficial en `https://margenx.tech`** bajo HTTPS.

---

## 2. Hitos Técnicos y Entregables Completados por Rol

### A. DevOps, Automatización e Infraestructura (Darío Giménez)

- **Despliegue del Entorno de Producción Oficial:** Aprovisionamiento del contenedor de producción (`frontend-prod`, `backend-prod`) conectado a la base `margenx_prod` (PostgreSQL 16 en puerto 5435), configuración de directivas de proxy inverso Nginx nativo en el host y renovación de certificados SSL Let's Encrypt para `margenx.tech` y `api.margenx.tech` (Issue #81).
- **Integración de Playwright en GitHub Actions:** Configuración del workflow de CI (`ci.yml`) con ejecución automatizada de tests E2E contra contenedores efímeros, bloqueo de PRs con fallas y subida automática de artefactos con reportes HTML de Playwright (Issue #80).
- **Integridad de Datos y Modales de Salida:** Implementación y securización del flujo de advertencia ante abandono de formularios con cambios no guardados en el frontend para evitar pérdidas accidentales de recetas (Issue #99).

### B. Arquitectura de Datos y Backend (Mauricio Barreras)

- **Motor Financiero con `Prisma.Decimal`:** Desarrollo del módulo de cálculo con aritmética de precisión arbitraria para costos unitarios, costo total de receta y porcentaje de margen, eliminando definitivamente errores de punto flotante de JavaScript (Issue #75 / RF-04, RF-05).
- **Validación de Límites Decimales y Prevención de Desbordes:** Incorporación de middleware y validaciones con esquemas Zod en Express para mitigar desbordamientos numéricos en base de datos (`PrismaClientKnownRequestError`) ante valores atípicos o entradas maliciosas (Issue #102).
- **Persistencia de Recetas Compuestas (BOM) y Anti-Double Submit:** Refactorización transaccional con `prisma.$transaction` para inserciones y actualizaciones simultáneas de productos y sus líneas de receta (`ProductIngredient`), sumando tokens de idempotencia para prevenir creaciones duplicadas (Issue #92 / RF-02, RF-03).

### C. Frontend y Experiencia de Usuario Mobile-First (Federico Paal)

- **Editor Interactivo de Recetas con Zustand:** Construcción del selector reactivo de materias primas con cálculo instantáneo en memoria ($<50\text{ ms}$) de costos y márgenes en el cliente antes del envío al backend (Issue #76 / RNF-04).
- **Ficha Técnica y Gestión Integral de Productos (`/productos/:id`):** Vista dinámica y modular para la visualización, edición en vivo y baja lógica de productos con y sin receta asociada (Issue #78 / RF-02, RF-09).
- **Conexión de API y Gestión de Estados:** Enlace con la API REST mediante React Query/Axios, con manejo exhaustivo de estados de carga (skeletons), estados vacíos (empty states) y banners de error (Issue #79).
- **Jerarquía de Márgenes y Margen Global:** Configuración de persistencia del margen mínimo objetivo general en el perfil del comercio y herencia configurable a nivel producto individual (Issue #91).
- **Simulador Financiero Mobile/Tablet:** Adaptación responsiva del simulador de sensibilidad de precios optimizado para pantallas táctiles estrechas ($<1024\text{px}$ y base en $360\text{px}$) (Issue #98).
- **Hardening, Dark Mode & UI Polish:** Implementación del tema oscuro/claro con tokens de Tailwind CSS, estilización final de inputs de insumos, toasts de notificación interactivos y carga del logotipo oficial vectorizado de MargenX (Issues #94 y #100).

### D. Calidad, Testing y Enlace con Dominio Real (Leandro Herrera)

- **Dataset Oficial de 20 Productos Compuestos:** Expansión del script de Seed idempotente (`prisma/seed.ts`) incorporando 20 fichas técnicas completas con datos operativos de _Panadería Central_ (ej. Medialunas de manteca, Baguette, Tarta de ricota) y _Química GyJ_ (ej. Detergente industrial concentrado, Desengrasante), con márgenes saludables, en umbral y críticos (Issue #90).
- **Suite Automatizada E2E en Playwright:** Automatización de pruebas end-to-end cubriendo los flujos críticos de recálculo en vivo, actualización de costos de materias primas y verificación del aislamiento multi-tenant por `accountId` (Issue #47 / TC-MRG-01, TC-SEC-01).
- **Auditoría de Precisión Aritmética y Casos Borde:** Batería de pruebas manuales y automatizadas sobre divisiones por cero (precio de venta $0), costos nulos y productos comerciales sin receta (Issue #77).

---

## 3. Dinámica de Retrospectiva (Start / Stop / Continue)

### 🟢 Qué funcionó bien y debemos MANTENER (Continue)

1. **Store Global con Zustand en el Frontend:** La separación del estado del editor de recetas de los componentes React permitió un cálculo instantáneo en vivo sin renders innecesarios ni latencia en pantallas móviles.
2. **Uso Estricto de `Prisma.Decimal`:** Adoptar precisión decimal desde el modelo de datos evitó cualquier divergencia de centavos entre el backend, la base de datos y la interfaz.
3. **Flujo de PRs con Playwright en CI:** Atrapó 2 roturas de interfaz antes de fusionar a `develop`, impidiendo que código inestable llegara al entorno de staging.
4. **Capacidad de Absorción de Tareas Descubiertas:** El equipo aplicó correctamente la regla de Scrumban al dar de alta issues técnicas (#91, #92, #94, #98, #99, #100, #102) indispensables para blindar el DoD sin frenar la cadencia.

### 🔴 Qué nos generó fricción y debemos ELIMINAR (Stop)

1. **Subestimación de Casos Borde Numéricos en Formularios:** Tuvimos que crear la Issue #102 a último momento porque valores numéricos excesivos en inputs rompían la serialización en base de datos. En el Sprint 3 los límites máximos y mínimos de Zod deben definirse en el refactor inicial.
2. **Retención de Ramas Locales sin Prune:** Varios integrantes acumularon ramas locales de features ya mergeadas, lo que generó confusiones menores de checkout. Se debe automatizar la limpieza post-merge.

### 🟡 Qué acciones y acuerdos IMPLEMENTAREMOS en el Sprint 3 (Start)

1. **Middleware de Sanitización Financiera para RBAC:** Diseñar un middleware unificado de backend que intercepte y purgue campos de costo y margen según el rol del JWT (`COLLABORATOR`), garantizando la seguridad financiera a nivel de API (RNF-09).
2. **Modelado y Conversión de Empaques Mayoristas:** Planificar desde el inicio la tabla relacional de múltiples proveedores por insumo con factores de conversión de bulto a unidad de receta (ej. bolsa 50kg $\to$ gramos).
3. **Validación de Usabilidad Presencial:** Conducir una sesión de prueba in-situ en _Panadería Central_ con el MVP en producción sobre smartphones reales de 360px.

---

## 4. Compromisos y Acuerdos de Equipo para el Sprint 3

| Acuerdo / Acción de Mejora                                                          | Responsable                       | Criterio de Medición                                                                          |
| ----------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------- |
| Implementar middleware RBAC de filtrado de campos financieros para `COLLABORATOR`   | Mauricio Barreras                 | Tests de API en Postman/Newman verificando respuestas 200 OK sin claves de costos             |
| Desarrollar el Semáforo de Rentabilidad en Dashboard con Recharts                   | Federico Paal                     | Renderizado responsivo de gráficos y badges condicionales en $<1.5\text{ s}$ en móvil (360px) |
| Modelar tablas de Proveedores, Historial de Precios y Calculadora de Empaques       | Mauricio Barreras / Darío Giménez | Migración Prisma limpia con índices y constraints `onDelete: Restrict`                        |
| Protocolo de pruebas de campo con usuarios reales (Panadería Central / Química GyJ) | Leandro Herrera                   | Acta de feedback firmada y relevamiento de usabilidad en mobile                               |
| Optimización de imágenes Docker con Multi-stage builds en VPS                       | Darío Giménez                     | Reducción del tamaño de imágenes en Docker Hub en al menos un 30%                             |

---

## 5. Acta de Traspaso y Rotación de Scrum Master (Handover)

En cumplimiento de las pautas del manual operativo de MargenX, al completarse el Sprint 2 y alcanzarse el hito del MVP Core en Producción, se formaliza la rotación del rol de Scrum Master.

- **Scrum Master Saliente:** Mauricio Barreras
- **Scrum Master Entrante:** Leandro Herrera

### Checklist de Traspaso Verificado:

- [x] **Tablero Limpio:** 16 issues del Sprint 2 en estado `Done`, sin tareas huérfanas ni bloqueos pendientes.
- [x] **Ambientes en Producción:** `https://margenx.tech` y `https://dev.margenx.tech` con status 200 OK y certificados SSL activos.
- [x] **Release de Producción Publicado:** Tag `v0.2.0` creado formalmente en GitHub Web y desplegado vía pipeline `deploy.yml`.
- [x] **Backlog Refinado para Sprint 3:** Historias de Dashboard, RBAC y Multi-proveedor desglosadas con criterios Gherkin y prioridades asignadas (P1/P2).
- [x] **Secretos e Infraestructura de VPS:** Variables de entorno y llaves de Clerk verificadas en `/opt/margenx-infra/.env`.

---

**Firma y Aprobación del Equipo:**

- Darío Giménez _(Scrum Master & DevOps)_
- Mauricio Barreras _(Lead Backend & Data Architect)_
- Federico Paal _(Lead Frontend & UX/UI)_
- Leandro Herrera _(QA Engineer & Enlace Cliente)_
