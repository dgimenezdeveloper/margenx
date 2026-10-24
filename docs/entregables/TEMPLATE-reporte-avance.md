## MARGENX — Template de Reporte de Avance

**Proyecto:** MargenX — Control de Márgenes en Tiempo Real
**Equipo:** [nombre del equipo, si corresponde]
**Sprint:** [Sprint N — nombre/objetivo del sprint]
**Fecha:** [fecha de esta entrega, = fecha de cierre real del sprint]

---

## Por qué existe este documento

En la devolución de la Entrega Sprint 2 (nota 8/10), la cátedra pidió que **a partir de ahora todos los equipos usen el mismo template**, con los mismos 7 puntos y en el mismo orden, en todas las entregas — para poder comparar la evolución sprint a sprint. Este archivo es ese template fijo.

Además de la estructura, la devolución trajo correcciones puntuales (algunas del informe escrito, otras del Sprint Review del 03/10). Se resumen acá, con su estado real a la fecha de este template, para que cada entrega futura las tenga presentes en vez de repetir el mismo señalamiento:

| # | Corrección de la cátedra | Origen | Estado |
| --- | --- | --- | --- |
| 1 | No cortar el reporte a mitad de sprint — alinear el cierre de sprint con la fecha de entrega | Informe Sprint 2 | **A aplicar desde esta entrega.** Este template exige completar la Sección 2 solo con el sprint ya cerrado. |
| 2 | Volver a incluir hashes de commit por hito (nivel de trazabilidad del Sprint 1) | Informe Sprint 2 | **A aplicar desde esta entrega.** La Sección 4 de este template pide explícitamente el hash corto por hito, no solo el link de compare. |
| 3 | Documentar cómo se carga el precio cuando el proveedor no tiene sistema integrable — "sin ese dato no hay margen que calcular" | Informe Sprint 2 **y** Sprint Review 03/10 (dicho dos veces, es el punto crítico del negocio) | **Resuelto en Sprint 3.** La PyME no tiene proveedores con sistemas integrables, así que la solución es carga manual, no integración: un ADMIN registra el empaque mayorista del proveedor (ej. "Bolsa 50 kg a $35.000") y el sistema calcula el costo unitario equivalente (`packagePrice / packageSize`) con `Prisma.Decimal` y redondeo `ROUND_HALF_UP`. Implementado en PR [#147](https://github.com/dgimenezdeveloper/margenx/pull/147) (modal de carga y cálculo), extendido en PR [#155](https://github.com/dgimenezdeveloper/margenx/pull/155) (actualizar precio de un proveedor ya cargado, sin error 409) y PR [#156](https://github.com/dgimenezdeveloper/margenx/pull/156) (comparar varios proveedores del mismo insumo y elegir cuál usar como predeterminado). Pendiente: cerrar este flujo como la respuesta formal y explícita en la próxima entrega, no solo como código — dedicarle un párrafo propio en la Sección 3 (Demo) de ese reporte. |
| 4 | Tener claras las etapas de implementación | Sprint Review 03/10 | Pendiente de un reporte propio — no hay una issue/PR puntual que lo resuelva, es una cuestión de cómo se presenta el plan en la próxima Demo. |
| 5 | Eliminar el deslogueo cada 15 minutos | Sprint Review 03/10 | **Pendiente.** No se encontró una issue abierta para esto en el repositorio — hay que cargarla y resolverla antes de la próxima entrega, o explicar en la Sección 5 (Impedimentos) por qué sigue así. |

El resto de la devolución fue positivo y no requiere corrección: la tabla de issues con SP/responsable/estado/PR, el staging con SSL y healthcheck, la suite E2E en CI y el reporte de precisión del redondeo (`#77`) quedan como el estándar a mantener, no a cambiar.

---

## Cómo usar este template

1. Copiar este archivo a `docs/entregables/entrega-pps-sprintN.md` (reemplazar `N` por el número de sprint/entrega).
2. Completar las 7 secciones de abajo — no agregar, quitar ni reordenar ninguna: es lo que la cátedra pidió mantener fijo entrega a entrega.
3. Completar la Sección 2 (Comprometido vs. completado) solo cuando el sprint esté efectivamente cerrado — ver corrección 1 de la tabla de arriba.
4. Exportar a PDF y nombrarlo exactamente `MargenX_EntregaN.pdf` (ej. `MargenX_Entrega3.pdf`).

---

### 1. Sprint, fechas e integrantes que participaron

*Fechas de inicio y fin reales del sprint — no la fecha de corte de un informe anterior cortado a mitad de camino. Listar solo a quienes efectivamente participaron en este período, con su rol.*

- **[Sprint N — nombre]:** [fecha de inicio] al [fecha de fin].
- **Integrantes que participaron:**
  - **[Nombre]:** [rol en el proyecto].
  - **[Nombre]:** [rol en el proyecto].

---

### 2. Comprometido vs. completado

🔗 **Tablero oficial:** [link al tablero de GitHub Projects, vista del sprint]

- **Compromiso total del Sprint [N]:** [X] Historias / Tareas Técnicas · **[Y] Story Points (SP)**.
- **Estado al cierre:** [X] historias completadas ([Y] SP — [Z]%) · [desglose de lo no completado, si lo hay].

| Issue | Responsable | Rol | SP | Estado | PR / Evidencia |
| --- | --- | --- | --: | --- | --- |
| `#` | | | | | |

---

### 3. Demo: qué se puede ver funcionando y en qué URL

*URLs reales y accesibles al momento de la entrega, no promesas de lo que "va a estar" — eso va en la Sección 7.*

- **Entorno:** [https://margenx.tech] (producción) / [https://dev.margenx.tech] (staging), según corresponda.
- **Healthcheck:** [URL del healthcheck, con el estado esperado].
- **Verificable en vivo:**
  - [funcionalidad 1, con la ruta/pantalla donde se ve].
  - [funcionalidad 2, con la ruta/pantalla donde se ve].
  - *Si corresponde a este corte: el flujo de carga manual de precios de proveedor (ver corrección 3 de la tabla de arriba) — mostrar `/insumos` → ficha de insumo → sección "Proveedores y Empaques".*

---

### 4. Commits del período

*Corrección 2 de la tabla de arriba: incluir el hash corto de al menos un commit representativo por cada hito/issue relevante, no solo el link de compare general.*

- **Compare oficial en GitHub:** [link a .../compare/vX.Y.Z...develop]
- **Hitos verificables, con hash de commit:**
  - `[hash corto]` — [qué hito/issue cubre].
  - `[hash corto]` — [qué hito/issue cubre].

---

### 5. Impedimentos y qué necesitan de la cátedra

*Separar impedimentos ya resueltos (mitigación aplicada) de los que siguen activos y requieren algo concreto de la cátedra — no dejar "sin bloqueos" si en realidad hay algo pendiente de confirmar.*

- **Resuelto en este período:** [impedimento] → [cómo se resolvió].
- **Activo / requiere de la cátedra:** [qué necesitan exactamente, o "Sin bloqueos activos" si es el caso real].

---

### 6. Horas dedicadas por integrante

| Integrante | Rol en el Proyecto | Horas Sprint [N] | Total Acumulado |
| :--- | :--- | :---: | :---: |
| **[Nombre]** | [rol] | [h] | **[h]** |
| **TOTALES** | *(Horas acreditables de práctica)* | **[h]** | **[h]** |

---

### 7. Compromiso del próximo período

*Lo que el equipo se compromete a entregar en el próximo sprint/corte — es la base de comparación para la próxima entrega con este mismo template.*

- **Para el Sprint [N+1]:** [compromisos concretos, con número de issue cuando corresponda].
