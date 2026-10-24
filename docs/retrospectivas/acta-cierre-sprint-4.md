# Acta de Cierre de Sprint y Retrospectiva — Sprint 4 (Recálculo en Cascada, Automatización n8n "Zero-Click", Cuarentena y Modularización)

**Proyecto:** MargenX — Control de Márgenes en Tiempo Real
**Materia:** Prácticas Profesionales Supervisadas (PPS) / Metodologías Ágiles
**Fecha de Sesión:** 24/10/2026
**Hora:** 18:30 hs
**Facilitador / Scrum Master Saliente:** Federico Paal
**Scrum Master Entrante (Rotación Sprint 5):** Darío Giménez
**Participantes:** Federico Paal (Lead Frontend & SM saliente), Darío Giménez (DevOps & SM entrante), Mauricio Barreras (Lead Backend), Leandro Herrera (QA Engineer & Enlace Cliente)

---

## 1. Objetivo del Sprint 4

Consolidar la **protección financiera automatizada y desatendida** en MargenX:
1. Implementar el motor transaccional de **recálculo en cascada** masivo ante cambios de costos de materias primas (cierre definitivo de la issue histórica `#28`), con guarda *Zero-Variation* y alertas asíncronas solo ante quiebres del margen mínimo.
2. Construir la infraestructura de **ingesta desatendida "Zero-Click"** mediante Cloudflare Email Routing Catch-All, lectura IMAP con n8n y un webhook receptor con **Filtro Anti-Pollution** y **Bandeja de Cuarentena de Precios Anómalos** para aumentos superiores al 50% o precios nulos.
3. Resolver la deuda técnica de componentes monolíticos en el frontend mediante la **modularización integral** de la Ficha Técnica de Producto (`/productos/[id]`), la Despensa de Insumos (`/insumos`) y el Panel Principal (`/dashboard`).
4. Validar la ergonomía móvil mediante **pruebas presenciales in-situ en 360px** en el comercio piloto *Química GyJ*, certificar el recálculo con suites E2E en Playwright y pruebas de estrés con lotes de 3.000 filas en Newman, y acondicionar el entorno de evaluación docente con cuentas de demostración dedicadas (*Demo MargenX*).

---

## 2. Hitos Técnicos y Entregables Completados por Rol

### A. DevOps, Automatización e Infraestructura (Darío Giménez)
- **Canal de Ingesta por Correo Catch-All:** Configuración en Cloudflare Email Routing de la regla Catch-All (`*@margenx.tech`) para habilitar alias virtuales ilimitados por comercio (`precios+<slug>@margenx.tech`), reexpidiendo los mensajes a una casilla central de Gmail con IMAP habilitado a costo $0 (Issue #169 / PR #186).
- **Workflow n8n de Ingesta y Normalización:** Orquestación de workflow reactivo vía IMAP IDLE que detecta adjuntos (XLSX, XLS, CSV), normaliza encabezados heterogéneos y procesa lotes de hasta 5.000 filas (Issue #170 / PR #206).
- **Workflow n8n de Despacho y Resumen:** Lógica de envío al backend con reintentos exponenciales (2s, 5s, 10s) ante errores transitorios y confección de resumen ejecutivo por email al dueño con conteo de filas actualizadas, descartadas y en cuarentena (Issue #171 / PR #207).
- **Workflow n8n de Alertas Críticas (Brevo Relay):** Despacho asíncrono SMTP vía Brevo (`smtp-relay.brevo.com:587`, STARTTLS) con plantilla HTML responsive y accesible (WCAG AA), disparado por el webhook `margin.alert.triggered` del backend (Issue #172 / PR #187). Enlace dinámico según entorno mediante `APP_BASE_URL` (Issue #222 / PR #223).
- **Monitor Centinela de Memoria VPS (`monitor-memory.sh`):** Script host cronometrado cada 5 minutos que audita el uso de RAM del servidor Donweb (`168.197.49.120`), inspecciona `docker stats` y emite alertas Embed a Discord con cooldown ante consumo $\ge 85\%$ (Issue #173 / PR #188).
- **Entorno de Demo Dedicado y Sanitización:** Creación del script `backend/prisma/seed-demo.ts` para sembrar la cuenta ficticia *Demo MargenX* (`demo-admin@margenx.tech` / `demo-colab@margenx.tech`) para evaluación docente (Issue #220 / PR #221) y depuración de credenciales sensibles en archivos de ejemplo (Issue #224 / PR #225).
- **Gobernanza Arquitectónica:** Sincronización del SAD v2.0 con diagramas C4 y UML (Issue #179 / PR #189) y confección de ADR-004 formalizando la adopción de Margen sobre Ventas vs. Markup (Issue #180, regularizado en Issue #227 / PR #228).

### B. Arquitectura de Datos y Backend (Mauricio Barreras)
- **Recálculo Transaccional en Cascada (Cierre Issue `#28`):** Servicio de dominio `applyIngredientCostChange` en `marginCalculator.ts`, ejecutando la actualización del insumo, la inserción en `PriceHistory`, el recálculo atómico de recetas con `Prisma.Decimal` (`ROUND_HALF_UP`) y la detección de cruce de umbral en una única transacción ACID (Issue #28 / PR #182).
- **Guarda Zero-Variation:** Optimización en `PUT /api/ingredients/:id` que compara `previousCost.equals(nextCost)` y retorna `200 OK` inmediato (`affectedProductsCount: 0`), impidiendo la apertura innecesaria de transacciones y escrituras redundantes (Issue #28 / PR #182).
- **Endpoint de Ingesta Masiva y Secreto Criptográfico:** `POST /api/webhooks/supplier-prices` protegido por cabecera `x-margenx-webhook-secret` validada con `crypto.timingSafeEqual` para prevenir ataques de timing (Issue #160 / PR #183).
- **Filtro Anti-Pollution en Base de Datos:** Algoritmo en lote que busca coincidencias de `supplierCode` sobre `SupplierIngredient` y descarta silenciosamente los códigos no vinculados, evitando la inserción de registros basura en el catálogo (Issue #161 / PR #194).
- **Bandeja de Cuarentena v1 y v2:** Endpoints `GET /api/suppliers/quarantine`, `POST .../release` y `POST .../reject`. Incorporación de los campos `pendingPackagePrice`, `quarantinedAt` y `quarantineReason`, reteniendo propuestas ante subas $>50\%$ o costos unitarios $\le \$0.01$ y preservando intacto el precio vigente si el dueño rechaza la anomalía (Issues #162 y #202 / PRs #198 y #213).
- **Webhook de Ingesta v2:** Identificación implícita de proveedor, deduplicación intra-lote, resolución de ambigüedad (`AMBIGUOUS`), descarte por proveedor inactivo y retorno veraz de `ownerEmail` (Issue #200 / PR #208).
- **Ajuste de Contratos de API:** Exposición de total de afectados y subconjunto crítico en `PUT /api/ingredients/:id` (Issue #199 / PR #205).

### C. Frontend y Experiencia de Usuario Mobile-First (Federico Paal)
- **Modularización de Ficha de Producto (`/productos/[id]`):** Desacoplamiento de componentes monolíticos dividiendo responsabilidades en `ProductMasterDataForm` y `ProductRecipeBOM` (Issue #163 / PR #184).
- **Modularización de Simulador y Modales:** Creación de `ProductSimulatorPanel`, `ProductFinancialCockpit`, `ProductMobileSimulatorSheet`, `ProductDeleteDialog` y `ProductRemoveIngredientDialog` (Issue #164 / PR #190).
- **Modularización de Despensa (`/insumos`):** Refactorización en `SuppliesTableDesktop`, `SuppliesCardsMobile`, `IngredientSupplierList` y `IngredientUpsertSheet` (Issue #165 / PR #185).
- **Modularización de Dashboard (`/dashboard`):** Componentes aislados `DashboardKpiCards`, `HealthDistributionHistogram` y `MonitoredCatalogGrid` (Issue #166 / PR #192).
- **Bandeja Visual de Cuarentena (`/proveedores/cuarentena`):** Interfaz responsive en tarjetas móviles y tabla desktop para listar, auditar variaciones, liberar y rechazar precios anómalos (Issue #203 / PR #217).
- **Cola de Notificaciones Toast Interactivas:** Componente `ToastAlert` con soporte táctil *swipe-to-dismiss* y encolamiento dinámico para informar recálculos masivos (Issue #168 / PR #211).
- **Fix de Scroll en iOS Safari:** Reescritura del hook `useBodyScrollLock` con `position: fixed`, compensación de layout shift y conteo de referencias (`activeLocks`) para eliminar el arrastre de fondo en iPhone (Issue #193 / PR #195).
- **Eliminación de Parpadeo (*Zero-Flicker*):** Bloqueo reactivo de montaje en `DashboardPage` y `MarginBadge` durante la resolución de sesión, impidiendo destellos de `NaN%` o costos antes de aplicar la sanitización RBAC.
- **Actualización Comercial de Landing Page:** Rediseño enfocado en los casos reales de *Panadería Central* y *Química GyJ*, ingesta Zero-Click y accesibilidad (Issue #167 / PR #197).
- **Corrección de Formularios:** Normalización de unidades de medida (`kg`, `litro`, `unidad`) en el alta/edición de insumos (Issue #201 / PR #204).
- **Reporte de Avance Entrega 5 UNaB:** Consolidación de documentación y acta bajo la plantilla estandarizada de 7 puntos (`#181`).

### D. Calidad, Testing y Enlace con Dominio Real (Leandro Herrera)
- **Pruebas In-Situ 360px en *Química GyJ*:** Ejecución presencial del protocolo de pruebas ergonómicas con el responsable del local sobre dispositivos reales (Motorola Edge 50 Pro e iPhone), certificando la carga con una mano, ausencia de fugas en rol colaborador y detección del bug de scroll en Safari (Issue #174 / PR #191 / `acta-pruebas-insitu-quimica-gyj.md`).
- **Seed con Proveedores Mayoristas Reales:** Actualización de `prisma/seed.ts` incorporando a *Distribuidora MarJuanC* (SKUs reales en PDF: `HAR188`, `AZU015`, etc.), *Don Roque* y *Limpikorn*, vinculando factores de empaque mayorista (Issue #178 / PR #196).
- **Suite E2E de Recálculo en Cascada:** Automatización en Playwright (`cascade-recalculation.spec.ts`) validando que la suba de un insumo base en `/insumos` refleje el badge crítico en `/productos` y emita el toast informativo en $<15\text{ s}$ sin recargar la página (Issue #175 / PR #216).
- **Pruebas de Estrés y Resiliencia en Newman:** Colección automatizada inyectando lotes de 3.000 filas con 95% de polución (2.990 códigos basura con caracteres especiales) contra Panadería Central, certificando 0 caídas (0 errores 500) y tiempos $<1.5\text{ s}$ (Issue #176 / PR #215).
- **Suite de Regresión General y Matriz de Defectos:** Auditoría integral sobre 329 pruebas automatizadas (171 unitarios backend, 10 frontend, 6 colecciones Newman y 5 specs Playwright), certificando 0 defectos críticos en la aplicación (Issue #177 / PR #218 / `reporte-calidad-sprint4.md`).
- **Aislamiento de Workers E2E:** Detección de colisiones por mutación de insumos compartidos en Playwright y configuración definitiva de `workers: 1` en `playwright.config.ts`.

---

## 3. Dinámica de Retrospectiva (Start / Stop / Continue)

### 🟢 Qué funcionó bien y debemos MANTENER (Continue)
1. **Modularización Arquitectónica de Vistas Complejas:** Dividir pantallas monolíticas de más de 600 líneas en subcomponentes especializados (`MasterData`, `BOM`, `Cockpit`, `Simulator`) redujo drásticamente los conflictos de merge y mejoró la legibilidad y rendimiento de React.
2. **Defensa Estricta del Catálogo (Anti-Pollution + Cuarentena):** El desacoplamiento entre el insumo interno y los códigos del proveedor, sumado a la retención preventiva ante variaciones $>50\%$, resuelve el principal riesgo operativo de las PyMEs sin riesgo de corrupción de datos.
3. **Validación In-Situ y Pruebas de Estrés:** Probar en mostrador real con smartphones físicos permitió detectar el fallo de scroll de iOS Safari que no aparecía en los emuladores de Chromium. Asimismo, la prueba de 3.000 filas demostró la resiliencia del backend ante lotes masivos.
4. **Respuesta Rápida al Feedback de Cátedra:** La creación de la cuenta *Demo MargenX* con credenciales ficticias y la limpieza de datos sensibles resolvió formalmente las observaciones de seguridad de la Entrega 4.

### 🔴 Qué nos generó fricción y debemos ELIMINAR (Stop)
1. **Desincronización de Contratos en Colecciones Postman:** El reporte de regresión (#177) arrojó 11 fallos en Newman originados en que las colecciones no se actualizaron en los mismos PRs que modificaron los endpoints (`ingredients`, `products`, `webhooks`). **Acuerdo:** En Sprint 5, toda modificación de contrato HTTP debe incluir obligatoriamente la actualización de su colección Postman en el mismo PR.
2. **Dependencias de Orden y Estado Compartido en Pruebas:** Varios tests de Postman y Playwright fallaban si se ejecutaban en desorden porque mutaban insumos compartidos sin restaurarlos.
3. **Ausencia de Guardas de Cambios sin Guardar en Modales Secundarios:** El modal de asociación de empaques mayoristas se cierra al tocar fuera sin advertir sobre pérdida de datos.

### 🟡 Qué acciones y acuerdos IMPLEMENTAREMOS en el Sprint 5 (Start)
1. **Implementación de Smart Purchasing (RF-15):** Desarrollar la vista analítica que compare proveedores por insumo, calcule ahorros potenciales y emita órdenes de compra consolidadas hacia la opción más económica.
2. **Reportes Periódicos en PDF vía n8n:** Configurar el trigger Cron semanal (lunes 08:00 hs) para compilar y enviar por correo el balance de rentabilidad del catálogo en formato PDF.
3. **Estrategia de Backup y Disaster Recovery en VPS:** Implementar rutinas automatizadas de dump de PostgreSQL (`margenx_prod`) en la VPS y documentar el ensayo de restauración.
4. **Separación de Instancias de Clerk:** Migrar hacia instancias independientes para Producción y Staging para eliminar los pedidos recurrentes de verificación de sesión por IP nueva.

---

## 4. Compromisos y Acuerdos de Equipo para el Sprint 5

| Acuerdo / Acción de Mejora | Responsable | Criterio de Medición |
|---|---|---|
| Desarrollar el módulo de Smart Purchasing (RF-15) en Backend y Frontend | Mauricio Barreras / Federico Paal | Comparativa de precios y orden de compra generada en `/compras` |
| Orquestar el workflow de Reporte Semanal en PDF con n8n | Darío Giménez | Correo con adjunto PDF generado los lunes a las 08:00 hs |
| Automatizar backups diarios en VPS y ensayar script de Restore | Darío Giménez | Archivo `.sql.gz` generado en crontab y restauración probada |
| Actualizar colecciones de Postman/Newman al contrato vigente | Leandro Herrera | 100% de requests en verde en las 6 colecciones |
| Auditoría de accesibilidad WCAG y performance en Lighthouse | Leandro Herrera / Federico Paal | Puntaje superior a 90 puntos en móvil (360px) |
| Facilitación ágil y preparación de release final | Darío Giménez | Tablero sincronizado, burndown saludable y 0 bloqueos |

---

## 5. Acta de Traspaso y Rotación de Scrum Master (Handover)

En cumplimiento de las directivas de rotación de roles del manual operativo de MargenX, al término del Sprint 4 se formaliza el traspaso de la facilitación ágil.

- **Scrum Master Saliente:** Federico Paal
- **Scrum Master Entrante:** Darío Giménez (conducción para Sprint 5 y 6 hacia la defensa final)

### Checklist de Traspaso Verificado:
- [x] **Tablero Limpio:** 34 de 35 issues del Sprint 4 en estado `Done` (incluyendo la issue `#181` tras este commit); queda pendiente `#226` (release v0.5.0) hasta publicar el tag.
- [x] **Ambientes en Producción y Staging:** `https://margenx.tech` y `https://dev.margenx.tech` operativos con certificados SSL y healthchecks respondiendo HTTP 200 OK.
- [ ] **Release v0.5.0 Publicado:** a completar al publicar el tag `v0.5.0` (creación en GitHub y despliegue en la VPS mediante `deploy.yml`).
- [ ] **Backlog Refinado para Sprint 5:** pendiente: issues del Sprint 5 por crear (Smart Purchasing, Reportes PDF y Backups, con criterios de aceptación Gherkin y prioridades).
- [x] **Secretos e Infraestructura de VPS Verificados:** Archivo `/opt/margenx-infra/.env` en orden, variables de n8n actualizadas y centinela de memoria activo.

---

**Firma y Aprobación del Equipo:**

- Federico Paal *(Lead Frontend & Scrum Master saliente)*
- Darío Giménez *(DevOps, Automatización & Scrum Master entrante)*
- Mauricio Barreras *(Lead Backend & Data Architect)*
- Leandro Herrera *(QA Engineer & Enlace Cliente)*