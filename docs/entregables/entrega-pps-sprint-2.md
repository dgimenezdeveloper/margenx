## MARGENX — ENTREGABLE ACADÉMICO PPS

**Materia:** Prácticas Profesionales Supervisadas (PPS) · **Fecha de Corte:** 26/09/2026  
**Repositorio:** [github.com/dgimenezdeveloper/margenx](https://github.com/dgimenezdeveloper/margenx) · **Tablero Kanban:** [GitHub Projects v2 MargenX](https://github.com/users/dgimenezdeveloper/projects/7)

---

### 1. Sprint, fechas e integrantes

- **Sprint 2 (MVP Core — Recetas Compuestas y Cálculo en Vivo):** 19/09/2026 al 02/10/2026 · Corte de control: **26/09/2026** (Día 8 de 14). El Sprint continúa abierto al momento de este corte.
- **Integrantes del Equipo:**
  - **Darío Giménez:** DevOps & Automatización (Lead Infraestructura).
  - **Federico Paal:** Lead Frontend & UX/UI Mobile-First.
  - **Mauricio Barreras:** Scrum Master (rol rotativo, Sprint 2) · Lead Backend & Data Architect.
  - **Leandro Herrera:** QA Engineer & Enlace con Cliente Real.

---

### 2. Comprometido vs. completado

- **Compromiso total del Sprint 2:** 8 Historias / Tareas Técnicas · **24 Story Points (SP)**.
- **Estado al corte:** 6 historias completadas (19 SP — 79.2%) · 1 historia en revisión (2 SP — 8.3%) · 1 historia en progreso activo (3 SP — 12.5%).

| Issue | Responsable       | Rol      |  SP | Estado      | PR / Evidencia                                                                                                                  |
| ----- | ----------------- | -------- | --: | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `#47` | Leandro Herrera   | QA       |   3 | Done        | [PR #85](https://github.com/dgimenezdeveloper/margenx/pull/85)                                                                  |
| `#75` | Mauricio Barreras | Backend  |   3 | Done        | [PR #83](https://github.com/dgimenezdeveloper/margenx/pull/83) · [PR #88](https://github.com/dgimenezdeveloper/margenx/pull/88) |
| `#76` | Federico Paal     | Frontend |   5 | Done        | [PR #82](https://github.com/dgimenezdeveloper/margenx/pull/82)                                                                  |
| `#77` | Leandro Herrera   | QA       |   2 | Done        | [PR #86](https://github.com/dgimenezdeveloper/margenx/pull/86) · `docs/qa/reporte-precision-sprint2.md`                         |
| `#78` | Federico Paal     | Frontend |   3 | Done        | [PR #87](https://github.com/dgimenezdeveloper/margenx/pull/87)                                                                  |
| `#79` | Federico Paal     | Frontend |   2 | In Review   | [PR #89](https://github.com/dgimenezdeveloper/margenx/pull/89)                                                                  |
| `#80` | Darío Giménez     | DevOps   |   3 | Done        | [PR #84](https://github.com/dgimenezdeveloper/margenx/pull/84)                                                                  |
| `#81` | Darío Giménez     | DevOps   |   3 | In Progress | — (despliegue en curso)                                                                                                         |

---

### 3. Demo y estado operativo

- **Entorno Staging (VPS Donweb):** [https://dev.margenx.tech](https://dev.margenx.tech) (SSL Let's Encrypt).
- **API Backend Healthcheck:** [https://api-dev.margenx.tech/api/health](https://api-dev.margenx.tech/api/health) (`status: ok`, entorno `staging`).
- **Verificable en vivo:**
  - Constructor interactivo de recetas en `/productos/nuevo` con selector reactivo y Zustand (<50 ms de latencia en recálculo).
  - Ficha técnica dinámica `/productos/:id` con pre-poblado Zod, edición en vivo y eliminación controlada.
  - Persistencia y cálculo exacto con `Prisma.Decimal` (tolerancia $0.00 ARS en costos monetarios frente al frontend).
  - Soporte de productos comerciales en borrador ("Sin Receta") con costo $0 y margen 0% sin falsos positivos.
  - Suite E2E de Playwright ejecutándose en GitHub Actions con reportes HTML como artefacto descargable.

---

### 4. Commits del período

- **Compare oficial en GitHub:** [v0.2.0...develop](https://github.com/dgimenezdeveloper/margenx/compare/v0.2.0...develop) · [Historial en develop](https://github.com/dgimenezdeveloper/margenx/commits/develop)
- **Hitos verificables auditados:** `marginCalculator.ts` desacoplado con Vitest (`#75`), Store Zustand de recetas (`#76`), ruta dinámica `/productos/:id` (`#78`), tests Playwright E2E (`#47`), reporte de precisión (`#77`), runner Playwright en CI (`#80`).
- _Nota metodológica: a diferencia del entregable de Sprint 1, este período no incluye hashes de commit individuales por hito; se recomienda incorporarlos en el próximo corte para mantener el mismo nivel de trazabilidad._

---

### 5. Impedimentos y mitigaciones

- **Técnico superado (Reporte `#77`):** Se detectó que el frontend redondea `marginPercent` a 1 decimal mientras el backend liquida a 2 con `ROUND_HALF_UP`. Se documentó en `docs/qa/reporte-precision-sprint2.md` aceptando una tolerancia de ±0.05 pp en UI, certificando 0 discrepancias monetarias ($0.00 ARS) en `totalCost` y `marginAmount`.
- **En revisión (`#79`):** Se mitigó el riesgo de doble submit en persistencia de recetas con bloqueo de botón y spinners, previo a la fusión de PR #89.
- **Cátedra:** Sin bloqueos activos. Se solicita confirmación de horario y modalidad para la Demo oficial del MVP Core en Producción (Hito 02/10).

---

### 6. Horas dedicadas por integrante

| Integrante            | Rol en el Proyecto                    | Horas Sprint 0 (2 sem) | Horas Sprint 1 (2 sem) | Horas Sprint 2 (1ª sem) | Total Acumulado |
| :-------------------- | :------------------------------------ | :--------------------: | :--------------------: | :---------------------: | :-------------: |
| **Darío Giménez**     | Scrum Master, DevOps & Automatización |          24 h          |          24 h          |          13 h           |    **61 h**     |
| **Federico Paal**     | Lead Frontend & UX/UI Mobile-First    |          22 h          |          22 h          |          12 h           |    **56 h**     |
| **Mauricio Barreras** | Lead Backend & Data Architect         |          22 h          |          22 h          |          12 h           |    **56 h**     |
| **Leandro Herrera**   | QA Engineer & Enlace Cliente          |          20 h          |          22 h          |          12 h           |    **54 h**     |
| **TOTALES**           | _(Horas acreditables de práctica)_    |        **88 h**        |        **90 h**        |        **49 h**         |    **227 h**    |

---

### 7. Compromiso del próximo período

- **Cierre Sprint 2 (hasta 02/10):** Fusión de PR #89 (`#79`), finalización de `#81` (despliegue del entorno productivo `https://margenx.tech` con SSL y base `margenx_prod`), smoke test final y publicación del Release `v0.3.0`.
- **Inicio Sprint 3 (03/10 al 16/10):** Migración relacional de proveedores (`Supplier`, `SupplierIngredient`, `PriceHistory`), sanitización financiera por RBAC para rol `COLLABORATOR` y protocolo de pruebas in-situ en 360px con los comercios piloto (_Panadería Central_ y _Química GyJ_).
