# Acta de Cierre de Sprint y Retrospectiva — Sprint 3 (Gestión de Proveedores, RBAC y Blindaje Financiero)

**Proyecto:** MargenX — Control de Márgenes en Tiempo Real
**Materia:** Prácticas Profesionales Supervisadas (PPS) / Metodologías Ágiles
**Fecha de Sesión:** 10/10/2026
**Hora:** _[completar — hora real de la reunión]_
**Facilitador / Scrum Master Saliente:** Leandro Herrera
**Scrum Master Entrante (Rotación Sprint 4):** Federico Paal _(a confirmar por el SM oficial — es el único integrante que no ocupó el rol todavía, siguiendo la rotación Darío → Mauricio → Leandro)_
**Participantes:** Darío Giménez (DevOps), Mauricio Barreras (Lead Backend), Federico Paal (Lead Frontend), Leandro Herrera (QA Engineer & SM saliente)

---

## 1. Objetivo del Sprint 3

Incorporar la **gestión de proveedores y presentaciones de empaque mayorista** al núcleo de MargenX, con cálculo de costo unitario equivalente y registro automático de historial de precios; blindar la plataforma para el rol `COLLABORATOR` con un middleware de sanitización financiera server-side de doble capa (backend + UI); exponer métricas consolidadas en el Dashboard; y optimizar la infraestructura de contenedores de la VPS con límites de memoria y rotación de logs para sostener los 6 contenedores de Staging/Producción dentro de los 4 GB de RAM disponibles.

> ⚠️ Nota de cierre: este Sprint cerró hoy, 10/10/2026, de forma adelantada respecto al cronograma interno original del equipo, porque la cátedra actualizó el cronograma académico y el equipo se acopló a esa estructura. No es un cierre motivado por atraso o adelanto del trabajo técnico — ver `docs/entregables/entrega-pps-sprint-3.md`.

---

## 2. Hitos Técnicos y Entregables Completados por Rol

### A. DevOps, Automatización e Infraestructura (Darío Giménez)

- **Optimización de Imágenes Docker y Confinamiento de Memoria en VPS:** Multi-stage builds en `backend/Dockerfile` (usuario sin privilegios `node`, `dumb-init` como PID 1) y `frontend/Dockerfile` (`nginx:1.27-alpine` con healthcheck propio); límites `deploy.resources.limits.memory` por contenedor (Postgres 1 GB, n8n 512 MB, backend 512 MB c/u, frontend 128 MB c/u — techo del stack ~2.8 GB) y rotación de logs `json-file` (`max-size: 10m`, `max-file: 3`) en los 6 servicios; puerto de Postgres replegado a `127.0.0.1:5435` (Issue #129 / PR #157).
- **Contribución en Frontend — Semáforo de Margen y Dashboard:** Estandarización del semáforo de rentabilidad con Recharts y agregado del histograma de distribución de salud financiera (Issue #122); visualización del historial de variaciones de costo por insumo (Issue #125).

### B. Arquitectura de Datos y Backend (Mauricio Barreras)

- **Migración y Modelo Relacional de Proveedores:** Modelos Prisma `Supplier`, `SupplierIngredient` y `PriceHistory`, con seeding de datos de referencia (Issue #116).
- **CRUD de Proveedores y Registro Automático de Historial de Precios:** Endpoints REST completos con registro transaccional de cada variación de precio (Issue #117).
- **Conversión de Empaques Mayoristas:** Lógica de cálculo de costo unitario equivalente a partir de presentaciones de bulto (ej. bolsa 50 kg → costo por kg) (Issue #118).
- **Middleware RBAC y Sanitización Financiera:** Interceptor server-side que purga campos de costo, margen y proveedores de toda respuesta de API para el rol `COLLABORATOR` (Issue #119, acuerdo heredado de la retro del Sprint 2).
- **Endpoints de Métricas del Dashboard:** Consolidación de insumos activos, productos en riesgo y margen promedio en un endpoint único (Issue #120).
- **Upsert de Precios de Presentación de Proveedor:** Reemplazo del `409 Conflict` por comportamiento de upsert al reasociar un insumo con un proveedor ya existente, desbloqueando la comparativa de proveedores del frontend (Issue #153 / PR #155).

### C. Frontend y Experiencia de Usuario Mobile-First (Federico Paal)

- **Dashboard con Métricas Reales de la API:** Integración de las tarjetas y gráficos del Dashboard contra los endpoints consolidados de Mauricio (Issue #121).
- **Adaptación de UI por Rol (RBAC):** Ocultamiento condicional de secciones y campos financieros para `COLLABORATOR` en el cliente, como segunda capa sobre la sanitización de backend (Issue #123).
- **Gestión de Proveedores y Calculadora de Empaques:** Pantallas de alta/edición de proveedores y presentaciones, con calculadora de costo unitario equivalente en vivo (Issue #124).
- **Blindaje Defensivo de UI ante Datos Sanitizados:** Manejo explícito de campos `undefined`/ausentes cuando el backend sanitiza la respuesta para `COLLABORATOR`, evitando errores de renderizado (Issue #149).
- **Comparativa de Proveedores y Conmutación de Predeterminado:** Vista de comparación de precios por proveedor en la ficha de insumo, con acción de "Hacer Predeterminado" (Issue #152 / PR #156 — **en revisión al cierre de este Sprint**, bloqueada hasta hoy por la dependencia con el upsert de Mauricio, ya resuelta).

### D. Calidad, Testing y Enlace con Dominio Real (Leandro Herrera)

- **Protocolo de Pruebas In-Situ (360px):** Redacción del protocolo de validación presencial para _Panadería Central_ y _Química GyJ_ (Issue #126) — **documento escrito y mergeado; la ejecución presencial y el acta de conformidad quedan pendientes para el Sprint 4**.
- **Suite E2E de Seguridad RBAC:** Automatización Playwright (`rbac-security.spec.ts`) verificando que el rol `COLLABORATOR` no reciba datos financieros ni en la red ni en el DOM (Issue #127).
- **Colección Postman/Newman de Precisión de Conversión:** Validación automatizada de los factores de conversión de empaques mayoristas de Mauricio (Issue #128).
- **Revisión de pares (peer review):** QA de los PR #155, #156 y #157, incluyendo el bloqueo documentado y re-validado del PR #156 por dependencia con el PR #155, y la verificación del PR #157 contra el DoD de la Issue #129.

---

## 3. Dinámica de Retrospectiva (Start / Stop / Continue)

### 🟢 Qué funcionó bien y debemos MANTENER (Continue)

1. **Middleware RBAC de doble capa (backend + UI):** El acuerdo de la retro del Sprint 2 se cumplió tal cual se planificó — la sanitización en el servidor (Issue #119) y el blindaje defensivo en el cliente (Issues #123, #149) se verificaron juntos con la suite E2E (#127), sin fugas de datos financieros detectadas.
2. **QA bloqueando merges por dependencias reales:** La revisión del PR #156 detectó correctamente que dependía de un comportamiento de backend (upsert) que todavía no estaba en `develop`, evitando que una funcionalidad rota llegara a Staging. El bloqueo se resolvió ordenadamente mergeando primero el PR #155.
3. **Historial de precios automático:** Registrar cada variación de precio de proveedor como efecto colateral del CRUD (Issue #117) evitó tener que construir una auditoría manual después.
4. **Flexibilidad de roles ante sobrecarga:** Frontend concentró más issues de las previstas en este Sprint; Darío (DevOps) se corrió a colaborar ahí (Issues #122, #125) y dejó la Issue #129 —simple y de bajo riesgo— para el final a propósito. Buena decisión de priorización del equipo, no un problema.

### 🔴 Qué nos generó fricción y debemos ELIMINAR (Stop)

1. **Ambiente local de QA desactualizado:** El Prisma Client y las migraciones locales de Leandro no reflejaban los nuevos modelos de proveedores, bloqueando la validación de la colección Postman del #128 con errores de cliente obsoleto. Falta un paso estándar de `prisma generate && migrate deploy && db seed` documentado para onboarding/retoma de entorno.
2. **Dependencias entre PRs no señalizadas:** El PR #156 no dejaba explícito en su descripción que dependía del PR #155 sin mergear — el bloqueo se descubrió recién en la revisión de QA, no antes.

### 🟡 Qué acciones y acuerdos IMPLEMENTAREMOS en el Sprint 4 (Start)

1. **Resolver la deuda técnica del webhook de Discord** (Issue #129, ítem de DoD que quedó pendiente) como tarea propia al inicio del Sprint 4, si el equipo sostiene ese criterio de monitoreo.
2. **Señalizar dependencias entre PRs explícitamente** en la descripción ("Depende de #155") para que QA no las descubra recién en la revisión.
3. **Ejecutar la validación presencial pendiente** del protocolo de pruebas in-situ (#126) en _Panadería Central_ y _Química GyJ_, con acta de conformidad firmada.

---

## 4. Compromisos y Acuerdos de Equipo para el Sprint 4

| Acuerdo / Acción de Mejora | Responsable | Criterio de Medición |
| --- | --- | --- |
| Cerrar `#152` (comparativa de proveedores, PR #156) ya desbloqueada | Federico Paal | PR aprobado y mergeado a `develop` |
| Implementar o descartar formalmente el webhook de Discord del DoD de `#129` | Darío Giménez | Alerta probada en Discord ante >85% de uso de memoria, o issue de decisión documentada si se descarta |
| Ejecutar protocolo de pruebas in-situ en Panadería Central y Química GyJ | Leandro Herrera | Acta de conformidad firmada en `docs/retrospectivas/` |
| Cargar issue del deslogueo automático cada 15 min (corrección Sprint Review 03/10) | Leandro Herrera | Issue creada y priorizada en el tablero |
| Señalizar dependencias entre PRs en la descripción de cada PR | Todo el equipo | 0 bloqueos de QA descubiertos recién en revisión |

---

## 5. Acta de Traspaso y Rotación de Scrum Master (Handover)

En cumplimiento de las pautas del manual operativo de MargenX, al completarse el Sprint 3 se formaliza la rotación del rol de Scrum Master.

- **Scrum Master Saliente:** Leandro Herrera
- **Scrum Master Entrante:** Federico Paal

### Checklist de Traspaso Verificado:

- [x] **Issue `#129` (DevOps/VPS):** mergeada hoy (PR #157), con deuda técnica documentada (webhook de Discord pendiente — ver Sección 3).
- [ ] **Tablero NO completamente limpio al cierre:** `#152` queda en revisión (PR #156), pasa como carry-over al Sprint 4.
- [x] **Ambientes de Staging/Producción:** `https://margenx.tech` y `https://dev.margenx.tech` operativos, con límites de memoria y rotación de logs aplicados tras el PR #157.
- [ ] **Variables de entorno de la VPS (`.env.prod` / `.env.dev`):** el PR #157 cambió el compose para que `DATABASE_URL` se arme por separado en cada archivo en vez de inline — **pendiente confirmar en la VPS real que ambos apuntan a bases distintas (`margenx_prod` / `margenx_dev`)** antes de dar esto por cerrado.
- [ ] **Backlog refinado para Sprint 4:** _a completar por el SM entrante — no se definió en esta sesión._
- [x] **Secretos e Infraestructura de VPS:** sin cambios de credenciales reportados en este Sprint.

---

**Firma y Aprobación del Equipo:**

- Darío Giménez _(DevOps & Automatización)_
- Mauricio Barreras _(Lead Backend & Data Architect)_
- Federico Paal _(Lead Frontend & UX/UI — SM entrante)_
- Leandro Herrera _(QA Engineer & Enlace Cliente — SM saliente)_
