## MARGENX — ENTREGABLE ACADÉMICO PPS

**Materia:** Prácticas Profesionales Supervisadas (PPS) · **Fecha de Corte:** 10/10/2026
**Repositorio:** [github.com/dgimenezdeveloper/margenx](https://github.com/dgimenezdeveloper/margenx) · **Tablero Kanban:** [GitHub Projects v2 MargenX](https://github.com/users/dgimenezdeveloper/projects/7)

---

> ⚠️ **Nota sobre el corte de este reporte — a resolver con la cátedra antes de entregar.**
> El Sprint 3 arrancó el 03/10/2026 (commit `ab07bbf`, cierre del Sprint 2 / release `v0.3.0`) y las historias cargadas tienen fechas target hasta el 14–15/10/2026 — es decir, un sprint de ~14 días, igual que los anteriores. Si este reporte se entrega hoy 10/10, es el **día 7-8 de 14**: el mismo patrón de corte a mitad de sprint que la cátedra corrigió sobre la Entrega Sprint 2. Dos historias siguen sin cerrar al momento de este corte (`#129` sin iniciar, `#152` en revisión). El equipo/SM debe decidir si este envío se presenta explícitamente como **corte intermedio** (no como cierre de sprint) o si corresponde adelantar el cierre real de Sprint 3 antes de entregar.

---

### 1. Sprint, fechas e integrantes que participaron

- **Sprint 3 (Gestión de Proveedores, RBAC y Blindaje Financiero):** 03/10/2026 al 14-15/10/2026 (estimado, 14 días) · **Corte de este reporte: 10/10/2026 (día 7-8 de 14, sprint abierto — ver nota arriba).**
- **Integrantes que participaron:**
  - **Darío Giménez:** Scrum Master (rol rotativo, Sprint 2) saliente · DevOps & Automatización.
  - **Federico Paal:** Lead Frontend & UX/UI Mobile-First.
  - **Mauricio Barreras:** Lead Backend & Data Architect.
  - **Leandro Herrera:** Scrum Master (rol rotativo, Sprint 3) entrante · QA Engineer & Enlace con Cliente Real.

---

### 2. Comprometido vs. completado

🔗 **Tablero oficial:** [GitHub Projects v2 MargenX](https://github.com/users/dgimenezdeveloper/projects/7)

- **Compromiso total del Sprint 3:** 17 Historias / Tareas Técnicas · **51 Story Points (SP)**.
- **Estado al corte (10/10):** 15 historias completadas (45 SP — 88.2%) · 1 historia en revisión (3 SP — 5.9%, PR abierto) · 1 historia sin iniciar (3 SP — 5.9%).

| Issue | Responsable | Rol | SP | Estado | PR |
| --- | --- | --- | --: | --- | --- |
| `#116` SPRINT3-BE-01 Migración Prisma Supplier/SupplierIngredient/PriceHistory | Mauricio Barreras | Backend | 3 | Done | [PR #132](https://github.com/dgimenezdeveloper/margenx/pull/132) |
| `#117` SPRINT3-BE-02 CRUD de Proveedores + Historial de Precios | Mauricio Barreras | Backend | 5 | Done | [PR #137](https://github.com/dgimenezdeveloper/margenx/pull/137) |
| `#118` SPRINT3-BE-03 Conversión de Empaques Mayoristas | Mauricio Barreras | Backend | 3 | Done | [PR #144](https://github.com/dgimenezdeveloper/margenx/pull/144) |
| `#119` SPRINT3-BE-04 Middleware RBAC y Sanitización Financiera | Mauricio Barreras | Backend | 3 | Done | [PR #143](https://github.com/dgimenezdeveloper/margenx/pull/143) |
| `#120` SPRINT3-BE-05 Endpoints de Métricas del Dashboard | Mauricio Barreras | Backend | 3 | Done | [PR #139](https://github.com/dgimenezdeveloper/margenx/pull/139) |
| `#121` SPRINT3-FE-01 Dashboard con Métricas Reales de la API | Federico Paal | Frontend | 3 | Done | [PR #142](https://github.com/dgimenezdeveloper/margenx/pull/142) |
| `#122` SPRINT3-FE-02 Semáforo de Margen y Gráficos Recharts | Darío Giménez | Frontend | 3 | Done | [PR #146](https://github.com/dgimenezdeveloper/margenx/pull/146) |
| `#123` SPRINT3-FE-03 Adaptación de UI por Rol (RBAC) | Federico Paal | Frontend | 3 | Done | [PR #145](https://github.com/dgimenezdeveloper/margenx/pull/145) |
| `#124` SPRINT3-FE-04 Gestión de Proveedores y Calculadora de Empaques | Federico Paal | Frontend | 5 | Done | [PR #147](https://github.com/dgimenezdeveloper/margenx/pull/147) |
| `#125` SPRINT3-FE-05 Historial de Variaciones de Costo | Darío Giménez | Frontend | 2 | Done | [PR #140](https://github.com/dgimenezdeveloper/margenx/pull/140) |
| `#126` SPRINT3-QA-01 Protocolo de Pruebas In-Situ (360px) | Leandro Herrera | QA | 3 | Done* | [PR #154](https://github.com/dgimenezdeveloper/margenx/pull/154) |
| `#127` SPRINT3-QA-02 Suite E2E de Seguridad RBAC | Leandro Herrera | QA | 3 | Done | [PR #148](https://github.com/dgimenezdeveloper/margenx/pull/148) |
| `#128` SPRINT3-QA-03 Colección Postman de Precisión de Conversión | Leandro Herrera | QA | 2 | Done | [PR #150](https://github.com/dgimenezdeveloper/margenx/pull/150) |
| `#129` SPRINT3-DEVOPS-01 Optimización de Imágenes Docker y Monitoreo VPS | Darío Giménez | DevOps | 3 | Sin iniciar | — |
| `#149` SPRINT3-FE-06 Blindaje Defensivo UI ante Datos Sanitizados | Federico Paal | Frontend | 2 | Done | [PR #151](https://github.com/dgimenezdeveloper/margenx/pull/151) |
| `#152` SPRINT3-FE-07 Comparativa de Proveedores y Conmutación de Predeterminado | Federico Paal | Frontend | 3 | En revisión | [PR #156](https://github.com/dgimenezdeveloper/margenx/pull/156) |
| `#153` SPRINT3-BE-07 Upsert y Actualización de Precios de Proveedor | Mauricio Barreras | Backend | 2 | Done | [PR #155](https://github.com/dgimenezdeveloper/margenx/pull/155) |

\* `#126` tiene el protocolo escrito mergeado, pero la ejecución presencial en los comercios piloto y el acta de conformidad siguen pendientes — ver Sección 5.

*Además de estas 17 historias formales, el período incluyó 8 ajustes técnicos menores de UI/UX previos al inicio formal del naming `SPRINT3-` (issues `#108`–`#115`: confirmaciones preventivas, normalización visual, redondeo de margen sugerido), ya cerrados — no se les asignó SP individual porque no siguieron el template de Historia de Usuario.*

---

### 3. Demo: qué se puede ver funcionando y en qué URL

- **Entorno de Producción:** [https://margenx.tech](https://margenx.tech) (SSL Let's Encrypt).
- **API Backend:** [https://api.margenx.tech](https://api.margenx.tech) *(confirmar con Darío Giménez la URL exacta de healthcheck vigente en producción antes de entregar — no se encontró documentada en los entregables previos, solo la de Staging).*
- **Verificable en vivo:**
  - **Gestión de proveedores y empaques mayoristas** (`/insumos` → ficha de insumo → "Proveedores y Empaques"): carga manual de presentaciones (ej. "Bolsa 50 kg a $35.000"), cálculo reactivo del costo unitario equivalente y actualización del costo activo del insumo (`#124`, `#153`).
  - **RBAC completo end a end:** un colaborador (`colab.panaderia@hotmail.com`) ve únicamente nombre y precio de venta en `/productos` y `/dashboard`, sin acceso a `/insumos` ni a ningún dato de costo/margen, ni en el DOM ni en la red (`#119`, `#123`, `#149`).
  - **Dashboard con métricas reales**: tarjetas de insumos activos, productos en riesgo y margen promedio calculadas sobre la cuenta real, más el histograma de distribución de salud financiera (`#120`, `#121`, `#122`).
  - **Historial de variaciones de costo** por insumo, con porcentaje de aumento/disminución (`#125`).
  - **Suite E2E de Playwright** (incluida `rbac-security.spec.ts`) y **colección Postman/Newman de precisión aritmética** corriendo en CI (`#127`, `#128`).

---

### 4. Commits del período

- **Compare oficial en GitHub:** [v0.3.0...develop](https://github.com/dgimenezdeveloper/margenx/compare/v0.3.0...develop) · [Historial en develop](https://github.com/dgimenezdeveloper/margenx/commits/develop)
- **Hitos verificables, con hash de commit:**
  - `6994f44` — Migración Prisma: modelos Supplier/SupplierIngredient/PriceHistory (`#116`).
  - `c45217d` — CRUD de Proveedores y registro automático de historial de precios (`#117`).
  - `fe05fdf` — Lógica de conversión de empaques mayoristas (`#118`).
  - `2270ab5` — Middleware RBAC y sanitización financiera para `COLLABORATOR` (`#119`).
  - `895cff3` — Endpoints de métricas del Dashboard (`#120`).
  - `747c6e8` — Dashboard integrado con métricas reales de la API (`#121`).
  - `906f069` — Semáforo de margen estandarizado + histograma (`#122`).
  - `1ea6c12` — Adaptación de UI por rol / ocultamiento financiero (`#123`).
  - `8a4df71` — Gestión de proveedores y calculadora de empaques (`#124`).
  - `9dc31dc` — Visualización del historial de variaciones de costo (`#125`).
  - `2f330c0` — Protocolo de pruebas in-situ 360px (`#126`).
  - `c0a1e6a` — Suite E2E RBAC `rbac-security.spec.ts` (`#127`).
  - `b83a3aa` — Colección Postman/Newman de precisión de conversión (`#128`).
  - `4d72f15` — Blindaje defensivo UI ante datos financieros sanitizados (`#149`).
  - `aaee9b3` — Upsert y actualización de precios de presentación de proveedor (`#153`).

---

### 5. Impedimentos y qué necesitan de la cátedra

- **Resuelto:** El entorno local de QA tenía el Prisma Client y las migraciones desactualizadas respecto al schema con los nuevos modelos de proveedores, lo que bloqueaba validar la colección Postman del `#128` con un 401/error de cliente desactualizado → se resolvió corriendo `prisma generate` + `migrate deploy` + `db seed` antes de validar.
- **Resuelto:** `#152` (PR #156) dependía de un comportamiento de backend (upsert sin error 409) que todavía no estaba en `develop` cuando se abrió el PR → quedó bloqueado hasta mergear `#153` (PR #155), que ya se mergeó hoy 10/10.
- **Activo / requiere de la cátedra:** definir si el corte de este reporte (día 7-8 de 14) cuenta como cierre formal de Sprint 3 o como checkpoint intermedio — ver nota al inicio del documento.
- **Activo (interno):** `#129` (optimización de imágenes Docker y monitoreo de recursos VPS) sin iniciar; `#152` en revisión, pendiente de aprobación final.
- **Activo (interno):** la corrección del Sprint Review del 03/10 sobre "eliminar el deslogueo cada 15 minutos" todavía no tiene una issue abierta en el repositorio — pendiente de cargar y resolver.

---