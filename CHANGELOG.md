# Changelog — MargenX

Todos los cambios notables de este proyecto serán documentados en este archivo siguiendo el estándar [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

> Tareas y características planificadas para el Sprint 5 (Smart Purchasing, Reportes PDF periódicos y Backups).


### Fixed

- **Frontend:** `/dashboard` e `/insumos` ya no muestran "0 productos en riesgo", "0 insumos" ni una lista vacía cuando la API falla (5xx) o no hay red: los indicadores se reemplazan por un estado de error con botón Reintentar, y mientras se reintenta se ve el estado de carga. Ante un fallo de red, estas pantallas y `/proveedores/cuarentena` muestran un texto en español y no el error técnico del navegador ("Failed to fetch") (`#257`).
- **Frontend:** La notificación de error o éxito (toast) ahora se muestra correctamente por encima de los modales abiertos (z-index elevado a 100) (`#322`).
- **Frontend:** El modal de compras mayoristas ahora advierte antes de cerrarse si hay cambios sin guardar, previniendo la pérdida accidental de datos (`#322`).
- **Backend / DevOps:** `seed.ts` ya no aborta en producción cuando los usuarios piloto tienen otro email que el seed: conserva el email y el `authProviderId` existentes. Ambos seeds restauran el nombre de un insumo, proveedor o producto renombrado (mismo ID) en vez de cortar la carga, y buscan nombres repetidos sin distinguir mayúsculas (`#240`).
- **DevOps:** `infra/vps/docker-compose.prod.yml` versiona las claves de Clerk separadas por entorno que ya corrían en la VPS (`CLERK_*_PROD` / `CLERK_*_DEV`) y fija `APP_BASE_URL` por servicio (`https://margenx.tech` en `backend-prod`, `https://dev.margenx.tech` en `backend-dev`); `infra/vps/.env.example` documenta las cuatro variables (`#240`).
- **Frontend / Backend:** El nombre del producto se guarda y se muestra tal como lo escribió el usuario ("Pan de Campo"): se quitó el `toLowerCase()` al guardar en `POST`/`PUT /api/products` y el `toUpperCase()` del listado. La unicidad de nombre por cuenta sigue siendo case-insensitive y queda cubierta por pruebas automatizadas (`#236`).
- **Security:** `/productos/nuevo` protegido con `AdminOnlyRoute`: un `COLLABORATOR` es redirigido a `/productos` (caso `TC-RBAC-04` en el E2E de RBAC) (`#236`).
- **QA:** Las 6 colecciones de Postman actualizadas al contrato vigente de la API — Insumos (paginación de la issue #36), Productos (`salePrice: 0` permitido a propósito y mensaje real de `salePrice` negativo), Webhooks (contrato de respuesta post-cuarentena) y Alertas de margen (orden de ejecución entre sus propios requests, mensaje de RBAC y campo `affectedProducts`), corrigiendo los fallos QA4-01 a QA4-04 de `docs/qa/reporte-calidad-sprint4.md` (`#264`).
- **QA:** `run-tests.sh` (Insumos) usaba un `accountId` que no corresponde a ninguna cuenta del seed; `run-tests-rbac-colaborador.sh` apuntaba al puerto 3021 en vez de 3000 (`#264`).
- **Backend:** Costo declarado de "Harina de trigo 000 Olavarriense" en el seed corregido de `742.98` a `736.25`, igual al costo activo real de su presentación mayorista por defecto (que siempre lo sobrescribía; el valor viejo nunca llegaba a la base y generaba confusión en revisiones). Se alinearon también la colección Postman `Alertas de margen (Insumos)` y `backend/scripts/check-ingredient-cost-change.ts`, que citaban la cifra vieja como si fuera la base real (`#265`).
- **QA:** `coverage/` agregado al `.gitignore` — quedaba sin rastrear después de correr `npm run test:coverage` (`#265`).
- **Security:** Se ocultó la cantidad de receta y los campos financieros para el rol `COLLABORATOR` en la API real y en la UI, y se cubrió con validación de regresión por endpoint y perfil.
- **Security:** Datos sensibles fuera del repositorio: los emails de los comercios piloto en `backend/prisma/seed.ts`, sus tests y la colección Postman de Webhooks pasan al dominio reservado para pruebas `seed.example.test` (RFC 2606); la contraseña del Postgres del devcontainer deja de ser `devpassword123`. Búsqueda confirmada sin coincidencias de emails reales, IP de la VPS ni esa contraseña fuera del historial (`#268`).
- **Docs:** `backend/.env.example` e `infra/vps/.env.example` sin variables muertas que no lee ningún archivo real (`N8N_WEBHOOK_URL`, `POSTGRES_DB`/`POSTGRES_PORT` sueltos, los 4 `*_PORT` de la app — todos los puertos de `docker-compose.prod.yml` están fijos, no son variables); `frontend/.env.example` suma `VITE_INACTIVITY_TIMEOUT_MS` (faltaba) y cambia el ejemplo de producción de una URL de Azure ya inexistente a los dominios reales de la VPS (`#268`).

### Added

- **Frontend:** Componente reutilizable `ErrorState` (`src/components/error-state.tsx`) con mensaje, botón Reintentar de 44 px de alto y `role="alert"`; lo usan `/dashboard`, `/insumos` y `/proveedores/cuarentena`, y queda documentado en `frontend/README.md` (`#257`).
- **QA:** Pruebas de Vitest de `ErrorState`, `DashboardPage` y `SuppliesPageContent` (fallo 500, fallo de red, reintento exitoso y estado de carga durante el reintento) y caso E2E en `smoke.spec.ts` que fuerza un 500 en `/api/dashboard/metrics` (`#257`).
- **DevOps:** Script `infra/scripts/seed-remoto.sh` para sembrar o resembrar staging y producción: compila los seeds localmente, compara migraciones, hace `pg_dump` previo y corre el seed en un contenedor temporal con la imagen del backend. En producción exige la rama `main` sin cambios sin commitear. Runbook en `docs/runbook-operacion.md` (`#240`).
- **Backend:** `seed-demo.ts` toma los `user_id` del Clerk de producción de `SEED_DEMO_ADMIN_AUTH_ID` y `SEED_DEMO_COLAB_AUTH_ID` (`#240`).
- **Frontend:** Página 404 dentro del panel (con el menú y un botón al dashboard) para cualquier ruta inexistente, y redirección de `/` al dashboard cuando hay sesión activa. Se eliminó el código muerto `productos/detalle` (`#236`).
- **Docs:** Tabla de rutas y accesos por rol en `docs/manual-usuario/02-rutas-y-roles.md` (`#236`).
- **Frontend:** Páginas públicas `/privacidad` y `/instalar` con contenido de política de datos y guía de instalación para Android, iPhone y escritorio, enlaces visibles desde login y perfil, y navegación sin sesión dentro de la SPA (`#244`).
- **Docs:** ADR-005 formalizando las decisiones de arquitectura sobre costo vigente de materias primas por proveedor predeterminado, umbrales de retención en cuarentena preventiva y canal de ingesta por correo (`precios-<slug>@margenx.tech`) (`#234`).
- **Backend / QA:** Suite integral de pruebas unitarias y de integración para middlewares (`rbac`, `errorHandler`, `auth`), utilitarios (`pagination`), servicios (`marginAlertDispatcher`, `marginCalculator` con resolución de los 8 casos borde de QA) y rutas REST (`ingredients`, `products`, `suppliers`, `webhooks`, `auth`, `dashboard`), elevando la cobertura de líneas de backend por encima del 90 % (`#277`).
- **Backend / Config:** Configuración de `backend/vitest.config.ts` con exclusión de archivos de arranque (`src/index.ts`, `src/lib/prisma.ts`) y umbral de cobertura estricto `thresholds.lines: 90` (`#277`).
- **Frontend / QA:** Configuración de cobertura de código con `@vitest/coverage-v8`, script `test:coverage`, umbral del 90 % en Vitest y suites de pruebas unitarias sobre stores (`useRecipeStore`, `useQuarantineStore`), esquemas Zod (`productSchema`, `ingredientSchema`, `supplierPackagingSchema`), helpers de saneamiento numérico (`numericInput`), hooks de RBAC (`useUserRole`, `useTheme`) y componentes financieros (`MarginBadge`) (`#276`).
- **QA:** Scripts `run-tests-webhooks.sh` y `run-tests-alertas-margen.sh`, para que las 6 colecciones tengan un wrapper uniforme (`#264`).
- **QA:** Cosecha de los comentarios no bloqueantes dejados en las revisiones de los PR #215 a #218: etiqueta `review-followup` y 5 issues nuevas agrupadas por tema (`#310`-`#314`); tabla de trazabilidad completa (28 ítems: resueltos, descartados o agrupados) en `docs/qa/reporte-calidad-sprint5.md` (`#265`).
- **Backend:** Límite conservador global de `256 KB` en el parser general de Express y parser específico de `5 MB` para `POST /api/webhooks/supplier-prices`.
- **Backend:** Manejo explícito de `entity.too.large` con respuesta `413`, código estable `PAYLOAD_TOO_LARGE` y mensaje en español orientado a dividir la lista.
- **Backend:** Bloqueo con error 422 al intentar quitar el proveedor predeterminado de un insumo sin asignar otro en su lugar.
- **Frontend:** Exclusión de proveedores ya vinculados en el modal de asociación de empaques y aviso claro al intentar desmarcar el proveedor predeterminado.
- **Security:** Incorporación de `helmet` con cabeceras por defecto para reforzar la capa de seguridad HTTP sin activar CSP aún.
- **Docs:** Formato normalizado de revisión de PR (`docs/process/revision-de-prs.md`), con IDs `[RV<PR>-<S><n>]` que reemplazan al prefijo `NB-n`, y comandos de Claude Code `/revisar-pr` y `/resolver-issue` en `.claude/commands/` (`#274`).
- **Docs:** Especificación funcional unificada (`docs/especificacion-funcional.md`), alineada con el código de `develop` (`#274`).
- **Docs:** ADR-005 sobre costo vigente, cuarentena e ingesta (`docs/adr/0005-costo-vigente-cuarentena-e-ingesta.md`), y actualización del manual de usuario con la regla del proveedor predeterminado.
- **DevOps / CI:** Jobs `Frontend Unit Tests` (Vitest con el umbral de cobertura del 90 %), `n8n Nodes Tests` y `Dependency Audit` (`npm audit --omit=dev` en ambos paquetes, con lista de excepciones en `.github/audit-allowlist.json` y su filtro probado en `.github/scripts/`) (`#260`).
- **DevOps:** `.github/dependabot.yml`: PR semanal agrupado de versiones menores y parches hacia `develop` para npm (backend y frontend), GitHub Actions e imágenes base de Docker (`#260`).
- **DevOps:** `.nvmrc` con Node 22 como versión única para el entorno local, el CI y las imágenes (`#260`).
- **Docs:** `frontend/README.md` propio (antes la plantilla genérica de Vite): cómo correr, variables de entorno, estructura de `src/`, cómo correr las pruebas unitarias y E2E, y una guía de verificación de instalabilidad PWA a completar cuando se mergee S5-FE-05 (`#268`).
- **Docs:** `README.md` principal: `Supplier`/`SupplierIngredient` y la cuarentena de precios en el modelo de datos, el módulo `/proveedores/cuarentena` en la lista de pantallas, y una nota exacta de qué ve y a qué pantallas llega el rol `COLLABORATOR` (`#268`).
- **Docs:** `infra/vps/README.md` §11-12: Cloudflare Email Routing, la casilla IMAP y Brevo (dónde vive cada credencial, no el flujo — eso sigue en `infra/n8n/README.md`), e inventario de titularidad de los servicios (VPS, dominio, Cloudflare, Clerk, Gmail, Brevo, Docker Hub) para preparar el traspaso a una cuenta empresarial en la fase 2; columna de titular actual a completar por Darío (`#268`).

### Changed

- **DevOps / Security:** SSH de la VPS solo con clave (`PasswordAuthentication no`, `PermitRootLogin prohibit-password`), sin reenvío de agente ni X11, en los puertos 22 y 5371; revisión de dueños de `authorized_keys` (se quitaron una clave sin dueño y la del CI de Allmart); confirmación de que MargenX solo publica en `127.0.0.1`; y hallazgos fuera de alcance (`ufw` inactivo, puertos de otros proyectos en `0.0.0.0`, Postfix en el 25) en `infra/vps/README.md` §9 (`#266`).
- **Docs:** Actualización de `docs/process/revision-de-prs.md` §5 ítem 6 formalizando la medición obligatoria del 90 % de líneas en `frontend/` mediante `npm run test:coverage` y retirando la excepción temporal de cobertura no verificada (`#276`).
- **Docs:** Documentados los límites de ingesta, el contrato de error 413 y el runbook operativo en [docs/api.md](docs/api.md) y [docs/runbook-ingesta.md](docs/runbook-ingesta.md).
- **Docs:** Convención de ramas única `N-slug`, creada desde la issue con *Create a branch*, en la DoD, el manual del Scrum Master y el SAD (`#274`).
- **Docs:** Dirección de ingesta unificada como `precios-<slug>@margenx.tech` en el README (`#274`).
- **DevOps:** `proxy_http_version 1.1` en el ejemplo de Nginx de staging y guía para activar gzip en el Nginx del host, con verificación y reversión, en `infra/vps/README.md` §8 (`#233`).
- **DevOps:** Migración a Node 22 LTS en `backend/Dockerfile`, `frontend/Dockerfile`, el devcontainer y el CI (Node 20 salió de soporte). Quien tenga el devcontainer creado debe reconstruirlo (`#260`).
- **DevOps / CI:** El job `Backend Lint & Typecheck` pasa a llamarse `Backend Build & Tests`, porque no corre linter; el linter real del backend queda para el Sprint 6. Checks requeridos actualizados en `docs/politica-proteccion-main.md` (`#260`).
- **DevOps:** `auto-move-issues.yml` toma el número de issue solo de ramas con formato `N-slug`, para que las ramas de Dependabot no muevan tarjetas ajenas (`#260`).
- **DevOps:** `auto-move-issues.yml` omite los PRs y ramas de Dependabot (no reciben `PROJECT_TOKEN` ni tienen tarjeta), y `dependabot.yml` ignora las versiones mayores de npm, que se planifican como issue propia (`#305`).
- **QA:** `frontend/.env.test.example` y `frontend/tests/e2e/README.md` recomiendan para uso local las credenciales de la cuenta Demo (`backend/prisma/seed-demo.ts`) en vez de las del comercio piloto Panadería Central. **Pendiente, documentado explícitamente:** los 5 specs E2E todavía aseveran contra los datos de Panadería Central — no se reescribieron contra el catálogo de Demo en esta issue porque requiere acceso real a Clerk/CI para verificarlo sin arriesgar el pipeline; el secret de GitHub Actions tampoco se cambia hasta que esa reescritura esté hecha y verificada (`#268`).
- **Docs:** `infra/vps/README.md` §6 aclara que `/opt/margenx-infra` no es un repositorio git a propósito (es solo el destino de despliegue) y que `infra/vps/docker-compose.prod.yml`, ya versionado en este repositorio, es la fuente de verdad real que se copia ahí (`#268`).

### Removed

- **Docs:** `especificacion-funcional-abastecimiento.md` y `Diseño-Dominio-Arquitectura-Gestion-Insumos-Multi‐Proveedor-Automatización-Operativa.md`, reemplazados por `docs/especificacion-funcional.md` (`#274`).

### Fixed

- **QA:** Las 6 colecciones de Postman actualizadas al contrato vigente de la API — Insumos (paginación de la issue #36), Productos (`salePrice: 0` permitido a propósito y mensaje real de `salePrice` negativo), Webhooks (contrato de respuesta post-cuarentena) y Alertas de margen (orden de ejecución entre sus propios requests, mensaje de RBAC y campo `affectedProducts`), corrigiendo los fallos QA4-01 a QA4-04 de `docs/qa/reporte-calidad-sprint4.md` (`#264`).
- **QA:** `run-tests.sh` (Insumos) usaba un `accountId` que no corresponde a ninguna cuenta del seed; `run-tests-rbac-colaborador.sh` apuntaba al puerto 3021 en vez de 3000 (`#264`).

### Security

- **Backend:** `npm audit fix` sin `--force`: `body-parser` 2.4.0, `proxy-addr` 2.0.8, `qs` 6.16.1 y `source-map-js` 1.2.2. Las vulnerabilidades restantes requieren versiones mayores de `prisma`, `vitest` y `@vitest/coverage-v8` (`#233`).
- **Frontend:** Actualización compatible de dependencias vulnerables: `zod` 4.6.7, `fast-uri` 3.1.9, `undici` 7.30.1, `brace-expansion` 5.0.12 y `source-map-js` 1.2.2; 0 vulnerabilidades en producción. `vite`, `vitest` y `@vitest/mocker` (solo desarrollo) quedan pendientes: `npm audit fix` falla con un error interno del resolvedor de npm (`Cannot read properties of null (reading 'edgesOut')`) al recalcular sus dependencias peer (`#233`).
- **DevOps / CI:** El CI falla ante cualquier vulnerabilidad alta o crítica en dependencias de producción. Única excepción aceptada: `deepmerge-ts` (GHSA-ggr8-5vv4-36mx), que llega por `prisma` y se resuelve con Prisma 7 (`#260`).

### Changed

- **Docs:** Especificación funcional sincronizada con el código: el canal de ingesta enlaza a ADR-005, el contrato de ingesta suma el 413 de 5 MB y la receta para el colaborador figura como disponible (`#269`).
- **Docs:** Notas de vigencia en ADR-001 y ADR-003 (enmendado por ADR-005) sin reescribir sus decisiones, y fecha definitiva de ADR-002 (`#269`).
- **Docs:** SAD 2.2: la integración con n8n distingue lo implementado de lo planificado y el backlog del Sprint 5 refleja el tablero; Smart Purchasing, el reporte PDF y la meta de Lighthouse pasan al Sprint 6 (`#269`).
- **Docs:** DoD §4: los datos de prueba son realistas de los rubros piloto, en las cuentas del seed o en Demo MargenX, nunca sobre la cuenta real de un comercio (`#269`).
- **Docs:** Documentos históricos marcados con nota al pie y `casos-prueba-sprint1.md` archivado en `docs/historicos/` (`#269`).
### Added

- **DevOps:** Bloque de servidor Nginx y certificado SSL expandido para `www.margenx.tech` con redirección permanente 301 a `margenx.tech` (`#261`).
- **DevOps:** Cabeceras de seguridad perimetral HTTP en Nginx: HSTS de 1 semana (`max-age=604800`), `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Referrer-Policy`, `X-Robots-Tag: noindex` en staging y CSP en modo reporte (`Content-Security-Policy-Report-Only`) (`#261`).
- **DevOps:** Límite `client_max_body_size 6m` específico en los bloques de servidor de API (`api` y `api-dev`), descartando cargas superiores a 6 MB con HTTP 413 antes de alcanzar Node.js (`#261`).
- **DevOps:** Configuraciones de Nginx del host versionadas sin secretos en `infra/vps/nginx/` y registro de vencimientos de certificados en `infra/vps/README.md` (`#261`).
- **DevOps:** Automatización de backup diario de base de datos (`margenx_prod`) con compresión nativa `pg_dump -Fc`, rotación (7 diarios y 4 semanales), alerta por fallo a Discord, script de ensayo de restauración (`restore-test.sh`) y runbook operativo (`#239`).

## [0.5.0] - 2026-10-24 (Sprint 4: Recálculo en Cascada, Automatización n8n "Zero-Click" y Cuarentena)

### Added

- **Backend:** Recálculo en cascada transaccional masivo de costos y márgenes de recetas (`applyIngredientCostChange`) con guarda Zero-Variation al editar materias primas (`#28`, PR `#182`).
- **Backend:** Endpoint receptor de webhook `POST /api/webhooks/supplier-prices` protegido por cabecera de secreto criptográfico validado en tiempo constante (`#160`, PR `#183`).
- **Backend:** Filtro Anti-Pollution en base de datos para ingesta batch con descarte estricto de artículos no mapeados (`#161`, PR `#194`).
- **Backend:** Endpoints de auditoría, retención y resolución de precios de proveedores en cuarentena (`#162`, PR `#198`).
- **Backend:** Ajuste de contrato en `PUT /api/ingredients/:id` para reportar el total de recetas afectadas y el subconjunto de productos críticos (`#199`, PR `#205`).
- **Backend:** Webhook de ingesta masiva v2 con matching implícito de proveedor por código, descarte de códigos ambiguos o inactivos y retorno del contacto del dueño (`#200`, PR `#208`).
- **Backend:** Cuarentena de precios v2 con campo `pendingPackagePrice`, retención ante variaciones superiores al 50% o costos unitarios insuficientes, y conservación de precio vigente al rechazar (`#202`, PR `#213`).
- **Backend:** Migración relacional de base de datos para backfill de precios pendientes en presentaciones mayoristas legacy en cuarentena (`20261022100000_backfill_legacy_quarantine_pending_prices`).
- **Frontend:** Modularización arquitectónica de la Ficha Técnica de Producto (`/productos/[id]`): separación en `ProductMasterDataForm` y `ProductRecipeBOM` (`#163`, PR `#184`).
- **Frontend:** Modularización de controles analíticos de producto: `ProductSimulatorPanel`, `ProductFinancialCockpit`, `ProductMobileSimulatorSheet`, `ProductDeleteDialog` y `ProductRemoveIngredientDialog` (`#164`, PR `#190`).
- **Frontend:** Modularización de la Despensa de Insumos (`/insumos`): tablas desktop `SuppliesTableDesktop`, tarjetas táctiles `SuppliesCardsMobile`, `IngredientSupplierList` y modal `IngredientUpsertSheet` (`#165`, PR `#185`).
- **Frontend:** Modularización del Dashboard (`/dashboard`): componentes especializados `DashboardKpiCards`, `HealthDistributionHistogram` y `MonitoredCatalogGrid` (`#166`, PR `#192`).
- **Frontend:** Bandeja visual de cuarentena de precios (`/proveedores/cuarentena`) para listar, liberar y rechazar anomalías de proveedores con recálculo automático (`#203`, PR `#217`).
- **Frontend:** Cola secuencial de notificaciones Toast interactivas (`ToastAlert`) con soporte de descarte táctil (_swipe-to-dismiss_) para recálculos en cascada (`#168`, PR `#211`).
- **DevOps:** Infraestructura de correo perimetral con Cloudflare Email Routing Catch-All (`*@margenx.tech`) para habilitar alias virtuales comerciales por comercio (`precios+<slug>@margenx.tech`) (`#169`, PR `#186`).
- **DevOps:** Workflow n8n de ingesta: trigger IMAP vía IDLE sobre Gmail, extracción de slug comercial, parseo de planillas XLSX/XLS/CSV y normalización de columnas (`#170`, PR `#206`).
- **DevOps:** Workflow n8n de despacho HTTP con política de reintentos exponenciales ante fallos de red y armado de correo con resumen de importación al dueño (`#171`, PR `#207`).
- **DevOps:** Workflow n8n de alertas críticas de margen: despacho asíncrono SMTP vía Brevo Relay con plantilla HTML responsive accesible sin dependencias externas (`#172`, PR `#187`).
- **DevOps:** Script centinela `monitor-memory.sh` en el host VPS con inspección periódica de consumo de memoria RAM, top de contenedores Docker y alertas enriquecidas a Discord (`#173`, PR `#188`).
- **Datos:** Cuenta de demostración _Demo MargenX_ (usuarios ADMIN y COLLABORATOR, 2 proveedores, 8 insumos, 3 productos y un caso de cuarentena) mediante el script independiente `prisma/seed-demo.ts` y el comando `npm run seed:demo`, con confirmación explícita del destino vía `SEED_DEMO_CONFIRM` (`#220`, PR `#221`).
- **QA:** Protocolo, ejecución presencial y bitácora firmada de pruebas de ergonomía y usabilidad in-situ en 360px en _Química GyJ_ (`#174`, PR `#191`).
- **QA:** Suite de pruebas automatizadas E2E en Playwright para el recálculo en cascada (`cascade-recalculation.spec.ts`) (`#175`, PR `#216`).
- **QA:** Colección automatizada de pruebas de estrés y resiliencia en Postman/Newman para el webhook de ingesta con lotes de 3.000 filas y 95% de polución (`#176`, PR `#215`).
- **QA:** Suite de regresión general integral y matriz de clasificación de defectos de release (`#177`, PR `#218`).
- **Docs:** Actualización y sincronización del Documento de Arquitectura de Software (SAD v2.0) con topología de red VPS, C4 y diagramas UML (`#179`, PR `#189`).
- **Docs:** Registro de Decisión Arquitectónica ADR-004 formalizando la adopción del Margen Comercial sobre Ventas frente al Markup (`#180`, commit `e4af603`).
- **Docs:** Regularización del CHANGELOG v0.4.0 y rotación de Scrum Master (`#209`, PR `#210`).
- **Docs:** Consolidación de documentación de metodologías ágiles y Reporte de Entrega 5 UNaB (`docs/entregables/entrega-pps-sprint-4.md`) (`#181`).

### Changed

- **Frontend:** Actualización comercial de la Landing Page institucional (`/`) reflejando los casos de uso reales de _Panadería Central_ y _Química GyJ_ e ingesta Zero-Click (`#167`, PR `#197`).
- **Frontend:** Normalización y validación estricta de unidades de medida en formularios reactivos de insumos (`#201`, PR `#204`).
- **Datos:** Actualización del script de seed idempotente (`prisma/seed.ts`) con proveedores mayoristas reales (_Distribuidora MarJuanC_, _Don Roque_ y _Limpikorn_) y homologación de códigos SKU (`#178`, PR `#196`).
- **Testing:** Configuración de ejecución serial (`workers: 1`) en `playwright.config.ts` para evitar colisiones de concurrencia en pruebas E2E que mutan insumos compartidos.

### Fixed

- **Backend:** Los links de las alertas de margen respetan el entorno: el despachador envía `appBaseUrl` (desde `APP_BASE_URL`, opcional) y el workflow n8n lo valida contra una lista cerrada de dominios (`#222`, PR `#223`).
- **Frontend:** Corrección del scroll de fondo en modales sobre iOS Safari mediante bloqueo con `position: fixed` y conteo de referencias en `useBodyScrollLock` (`#193`, PR `#195`).
- **Frontend:** Eliminación del parpadeo visual (_zero-flicker_) y textos transitorios `NaN%` en badges de margen durante la resolución de sesión y rol en el Dashboard.
- **Backend:** Prevención de transacciones innecesarias en base de datos al editar insumos mediante guarda Zero-Variation (`previousCost.equals(nextCost)`) (`#28`, PR `#182`).
- **DevOps:** Confinamiento de memoria a 1024 MB y configuración de `NODE_OPTIONS=--max-old-space-size=768` en el contenedor n8n para prevenir fallos por agotamiento de heap al procesar planillas extensas.

### Security

- **Docs:** Limpieza de datos sensibles en la documentación y los archivos de ejemplo: mails de cuentas piloto, contraseña de ejemplo y datos de conexión del VPS reemplazados por etiquetas y placeholders (`#224`, PR `#225`).
- **Backend:** Autenticación por cabecera de secreto criptográfico (`x-margenx-webhook-secret`) evaluada con `crypto.timingSafeEqual` para mitigar ataques de timing en el webhook de ingesta (`#160`).
- **Backend:** Aislamiento multi-tenant estricto por slug comercial y purga de códigos de artículo ambiguos presentes en múltiples proveedores activos (`#200`).

## [0.4.0] - 2026-10-10 (Sprint 3: Dashboard de Rentabilidad, Roles RBAC y Dominio Multi-Proveedor)

### Added

- **Backend:** Modelos Prisma `Supplier`, `SupplierIngredient` y `PriceHistory` con seed de referencia (`#116`).
- **Backend:** CRUD de proveedores con registro transaccional automático del historial de precios (`#117`).
- **Backend:** Conversión de empaques mayoristas a costo unitario equivalente y proveedor predeterminado (`#118`).
- **Backend:** Middleware RBAC que sanitiza campos de costo, margen y proveedores para el rol `COLLABORATOR` (`#119`).
- **Backend:** Endpoints de métricas consolidadas del Dashboard (`#120`).
- **Backend:** Upsert de precios de presentación de proveedor, en reemplazo del `409 Conflict` al reasociar (`#153`).
- **Frontend:** Dashboard con métricas reales de la API, semáforo de margen e histograma de distribución (`#121`, `#122`).
- **Frontend:** Adaptación de la UI por rol para ocultar datos financieros a colaboradores (`#123`).
- **Frontend:** Gestión de proveedores por insumo con calculadora de empaques en vivo (`#124`).
- **Frontend:** Historial de variaciones de costo por insumo (`#125`) y comparativa de proveedores con acción de predeterminado (`#152`).
- **QA:** Protocolo de pruebas in-situ en 360px (`#126`), suite E2E de seguridad RBAC (`#127`) y colección Postman de precisión de conversión (`#128`).
- **DevOps:** Imágenes Docker multi-stage, límites de memoria por contenedor y rotación de logs en el VPS (`#129`).

### Changed

- **Frontend:** Ficha técnica con inputs estáticos, botonera de margen normalizada y ordenamiento del Dashboard por margen ascendente (`#108`, `#110`, `#111`).
- **Frontend:** Redondeo ascendente del margen sugerido con `Math.ceil` (`#109`).
- **DevOps:** Puerto de Postgres replegado a `127.0.0.1:5435` (`#129`).

### Fixed

- **Frontend:** Blindaje de la UI ante campos ausentes en respuestas sanitizadas para `COLLABORATOR` (`#149`).

### Security

- **Frontend:** Diálogos de confirmación al descartar el modal de insumos, remover insumos de una receta y cerrar sesión (`#112`, `#113`, `#114`).
- **Backend:** Sanitización financiera server-side para el rol `COLLABORATOR` (`#119`).

## [0.3.0] - 2026-10-02 (Sprint 2: MVP Core — Recetas Compuestas, Cálculo en Vivo y Despliegue en Producción)

### Added

- **DevOps:** Puesta a punto y despliegue del entorno oficial de Producción (`https://margenx.tech`) bajo HTTPS con Nginx, Docker Compose y base aislada `margenx_prod` (`#81`).
- **DevOps:** Integración de la suite de pruebas E2E de Playwright en GitHub Actions (`ci.yml`) con bloqueo de PRs defectuosos y reportes HTML como artefactos (`#80`).
- **Backend:** Motor de cálculo financiero con tipos `Prisma.Decimal` para costos unitarios, costo total de receta y porcentaje de margen, respaldado por tests unitarios (`#75`).
- **Frontend:** Editor interactivo de recetas compuestas (BOM) con selector dinámico de insumos y cálculo reactivo en memoria ($<50\text{ ms}$) mediante Zustand (`#76`).
- **Frontend:** Vista dinámica de Detalle, Edición y Eliminación de Producto en `/productos/:id` con soporte de fichas con y sin receta (`#78`).
- **Frontend:** Conexión de API REST para persistencia de productos y recetas con manejo de skeletons y estados de error (`#79`).
- **Frontend:** Persistencia de margen global en perfil de comercio y sistema de jerarquía de margen por producto individual (`#91`).
- **Frontend:** Modal de confirmación de abandono de pantalla ante cambios no guardados para prevenir pérdidas de datos (`#99`).
- **QA:** Dataset oficial de 20 productos con recetas compuestas complejas (BOM) integrado al script de seed idempotente (`#90`).
- **QA:** Suite automatizada de pruebas E2E de recálculo de margen en cascada y aislamiento de datos en Playwright (`#47`).
- **QA:** Batería de validación de precisión aritmética en fórmulas financieras y análisis de casos borde (división por cero y costos nulos) (`#77`).

### Changed

- **Frontend:** Simulador financiero y selector de insumos adaptados para viewports tablet y mobile (`<1024px` con base en `360px`) (`#98`).
- **Frontend:** Hardening de rendimiento, persistencia de estado local y optimización de renderizado en vistas críticas (`#94`).
- **Frontend:** UI Polish general, integración del logotipo vectorizado de MargenX, toasts interactivos y estilización de inputs bajo Dark Mode (`#100`).

### Fixed

- **Backend:** Persistencia transaccional atómica de recetas compuestas con `prisma.$transaction` y mecanismo anti-double submit para evitar duplicaciones (`#92`).

### Security

- **Backend:** Validación de límites numéricos decimales máximos en DTOs con Zod para prevenir desbordes numéricos en PostgreSQL/Prisma ante entradas anómalas (`#102`).

## [0.2.0] - 2026-09-18 (Sprint 1: Insumos, Productos Base y Hardening)

### Added (Terminado y Mergeado)

- **DevOps:** Runner headless de Playwright (Chromium) en GitHub Actions (`ci.yml`) y preconfiguración SSL de producción (Nginx/Certbot) en VPS Donweb (`#68`).
- **QA:** Suite global de autenticación persistente con Clerk y smoke test E2E en Playwright (`#69`).
- **Backend:** Endpoints CRUD de Productos y Recetas con soporte borrador y transacciones ACID (`#65`).
- **QA:** Colección automatizada de pruebas de API en Postman/Newman para el módulo de Productos (`#64`).
- **DevOps:** Notificaciones automáticas de estado de CI/CD en Discord vía Webhooks (`#63`).
- **Docs:** Sincronización de arquitectura VPS consolidada, SAD y plan de entregas (`#62`).
- **Frontend:** Integración con `<ClerkProvider>`, rutas protegidas y consumo autenticado de API (`#60`).
- **DevOps:** Pipeline de Despliegue Continuo (CD) hacia VPS Donweb vía Docker Hub, SSH y Nginx Reverse Proxy (`#40` via PR `#58`).
- **DevOps:** Automatización de migraciones de Prisma en el pipeline de deploy mediante contenedor efímero con mecanismo de fallo seguro (`#41` via PR `#59`).
- **Backend:** Middleware global de captura, formateo y estandarización de errores HTTP (`#35` via PR `#51`).
- **Backend:** Paginación y ordenamiento (Sorting) nativo en base de datos para la API de Insumos (`#36` via PR `#57`).
- **Frontend:** Maquetado responsivo Mobile-First de vistas de Insumos y Productos con tablas, badges y Empty States (`#31` via PR `#53`).
- **Frontend:** Formularios de Insumos y Productos con validación estricta Zod y React Hook Form (`#32` via PR `#55`).
- **QA:** Script ejecutable de Seed idempotente (`prisma/seed.ts`) con dataset verídico de comercios piloto (`#30` via PR `#52`).
- **QA:** Redacción de Casos de Prueba manuales en formato Gherkin para Insumos y Productos (`#39` via PR `#54`).
- **QA:** Colección de pruebas automatizadas de API en Postman/Newman para el módulo de Insumos (`#37` via PR `#56`).

---

## [0.1.0] - 2026-09-04 (Sprint 0: Setup y Fundaciones)

### Added (Agregado)

- **DevOps:** Configuración de entorno aislado con VS Code DevContainers (Node 20, TypeScript, PostgreSQL 16 local).
- **DevOps:** Pipeline de Integración Continua (CI) en GitHub Actions (`ci.yml`) con verificación de lint, typecheck y compilación.
- **DevOps:** Automatización de tablero Kanban mediante GraphQL API (`auto-move-issues.yml`).
- **Infra:** Despliegue en VPS propia de PostgreSQL 16 y orquestador n8n bajo subdominio con certificado SSL.
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