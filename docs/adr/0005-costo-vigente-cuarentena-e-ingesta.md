# 5. Costo Vigente de Insumos, Retención en Cuarentena y Canal de Ingesta Desatendida

* **Estado:** Aceptado
* **Fecha:** 2026-10-27
* **Decisores:** Darío Giménez (Tech Lead / DevOps), Mauricio Barreras (Lead Backend), Federico Paal (Lead Frontend), Leandro Herrera (QA Engineer)
* **Issue:** #234 (SPRINT5-DOCS-01)
* **Relacionado con:** ADR-003 (n8n Webhooks), ADR-004 (Margen sobre Ventas), `docs/especificacion-funcional.md` (§4, §5, §10), `backend/src/routes/suppliers.ts`, `backend/src/routes/webhooks.ts`

---

## Contexto y Planteamiento del Problema

MargenX protege la rentabilidad de las PyMEs manufactureras y gastronómicas recalculando automáticamente el costo y margen de sus recetas ante variaciones en las materias primas. Sin embargo, en el escenario operativo real:
1. **Múltiples presentaciones y proveedores:** Un insumo (ej. *Harina 000*) puede ser provisto por diferentes mayoristas en bultos de distinto tamaño (bolsas de 25 kg, 50 kg o packs fraccionados), con precios dispares. Se requiere definir sin ambigüedad **cuál es el costo que alimenta el cálculo de las recetas** en cada momento.
2. **Volatilidad y errores en listas de proveedores:** Las listas mayoristas reenviadas pueden contener errores tipográficos graves (ej. saltos de coma decimal, precios en cero o aumentos especulativos del 200%). Aplicar estos cambios de forma ciega corrompe el cálculo de márgenes y genera falsas alarmas financieras masivas.
3. **Fricción de carga y polución de catálogo:** Los mayoristas envían catálogos con miles de artículos que el comercio no consume. La ingesta no debe requerir que el usuario pase datos a mano ni debe llenar la base de datos de insumos irrelevantes.

---

## Decisiones de Arquitectura y Dominio

### 1. Regla del Costo Vigente y Proveedor Predeterminado
* El costo activo de un insumo (`Ingredient.currentCost`) utilizado por el motor de costeo de recetas (`marginCalculator.ts`) **proviene estrictamente de la presentación marcada como predeterminada (`SupplierIngredient.isDefault = true`)**.
* **Fórmula de costo unitario:**
  $$\text{unitCost} = \frac{\text{packagePrice}}{\text{packageSize}} \quad (\text{redondeo } \text{ROUND\_HALF\_UP} \text{ a 2 decimales con } Prisma.Decimal)$$
* **Sobrescritura deliberada de ediciones manuales:** Si el Administrador edita a mano `Ingredient.currentCost` desde `/insumos`, ese costo opera como *override* temporal. La próxima actualización legítima proveniente de la presentación predeterminada (sea por ingesta de lista o actualización del empaque) **sobrescribe el costo manual**, garantizando coherencia con la compra física.
* **Unicidad de presentación y estado predeterminado:** Existe como máximo una presentación por par proveedor-insumo (`@@unique([supplierId, ingredientId])`). La regla de negocio exige que todo insumo con proveedores asociados conserve siempre una presentación predeterminada activa; el bloqueo defensivo con HTTP 409 ante desmarques manuales que dejen estados huérfanos queda registrado como requerimiento a instrumentar en la evolución de endpoints de proveedores.

### 2. Bandeja de Cuarentena Preventiva de Precios Anómalos
Para evitar distorsiones en las recetas ante listas con errores o saltos bruscos de precios, el backend aplica un buffer de retención transaccional previo a impactar `Ingredient.currentCost`:
* **Criterios de retención en Cuarentena:**
  1. `VARIACION_MAYOR_50_POR_CIENTO`: Cuando el costo unitario propuesto varía más de un **50 %** en valor absoluto ($|\Delta\%| > 50\%$) respecto del costo vigente.
  2. `COSTO_UNITARIO_INSUFICIENTE`: Cuando el costo unitario resultante es menor o igual a **$0,01** ($\le \$0.01$) o no puede ser liquidado numéricamente.
* **Mecánica de retención:** El precio propuesto se almacena en `SupplierIngredient.pendingPackagePrice`, fijando `isQuarantined = true`, `quarantinedAt = now()` y el motivo en `quarantineReason`. El campo `packagePrice` y el costo del insumo (`currentCost`) **permanecen intactos**, preservando las recetas existentes.
* **Resolución de Cuarentena:**
  * **Liberar (`POST /api/suppliers/quarantine/:id/release`):** El Administrador valida la suba. Se consolida `packagePrice = pendingPackagePrice`, se limpia la cuarentena y, si es la presentación predeterminada (`isDefault = true`), se actualiza `Ingredient.currentCost` y se dispara el recálculo en cascada (`applyIngredientCostChange`).
  * **Rechazar (`POST /api/suppliers/quarantine/:id/reject`):** El Administrador descarta la anomalía. Se purga `pendingPackagePrice = null` y se desmarca la cuarentena. El insumo mantiene su costo vigente seguro. En esta fase del MVP, el rechazo **no emite notificaciones salientes** al proveedor ni al dueño (funcionalidad de Fase 2).
* **Auto-recuperación:** Si una ingesta posterior trae un precio que coincide con el valor vigente activo, la presentación sale de cuarentena automáticamente.

### 3. Canal de Ingesta Desatendida "Zero-Click" y Filtro Anti-Pollution
El flujo de importación opera desacoplado del monolito mediante el satélite n8n:
1. **Entrada de correo perimetral:** El dueño reenvía la lista del distribuidor (Excel/CSV) a `precios-<slug>@margenx.tech` (o alias virtuales compatibles `precios+<slug>@`).
2. **Enrutamiento Cloudflare + Gmail:** Cloudflare Email Routing (regla Catch-All `*@margenx.tech`) entrega el mensaje en la casilla central de Gmail.
3. **Orquestación en n8n:** El nodo IMAP IDLE captura el adjunto, normaliza encabezados heterogéneos y despacha un lote JSON autenticado al webhook `POST /api/webhooks/supplier-prices` con la cabecera `x-margenx-webhook-secret` (validada con `crypto.timingSafeEqual`).
4. **Filtro Anti-Pollution (Regla de Descarte Estricto):** La lista **nunca crea insumos**. El backend busca coincidencias de `supplierCode` sobre la cuenta:
   - Códigos no vinculados se descartan con motivo `NOT_FOUND`.
   - Códigos de proveedores inactivos se descartan con `INACTIVE_SUPPLIER`.
   - Códigos que coinciden con más de un proveedor activo se descartan como `AMBIGUOUS`.
5. **Cierre transaccional y reporte:** Las filas válidas no anómalas actualizan el catálogo; las anómalas van a cuarentena. n8n recibe el consolidado y despacha un correo de resumen ejecutivo al Administrador mediante Brevo SMTP Relay.

### 4. Integridad Referencial y Borrado Seguro
* En PostgreSQL, las relaciones secundarias cuelgan con `onDelete: Cascade` para permitir el purgado completo y seguro de organizaciones (`Account`) sin violaciones de clave foránea.
* A nivel de aplicación, `DELETE /api/ingredients/:id` intercepta dependencias: si el insumo está vinculado a una o más recetas en `ProductIngredient`, **aborta la operación respondiendo HTTP 409 Conflict** con el arreglo `productsAffected`, impidiendo la pérdida accidental de fichas técnicas.

---

## Puntos de Implementación en el Código Fuente

Esta decisión arquitectónica se materializa en los siguientes puntos críticos del backend:

1. **Liberación de Cuarentena con Recálculo en Cascada:**
   * Archivo: `backend/src/routes/suppliers.ts`
   * Handler: `router.post('/quarantine/:id/release')`
   * Detalle: Comprueba `quarantined.isDefault`, actualiza `Ingredient.currentCost = unitCost` y ejecuta `applyIngredientCostChange`.
2. **Homologación y Conmutación de Proveedor Predeterminado (Upsert):**
   * Archivo: `backend/src/routes/suppliers.ts`
   * Handler: `router.post('/:id/ingredients')`
   * Detalle: Desmarca defaults previos mediante `updateMany({ where: { ingredientId, id: { not: ... } }, data: { isDefault: false } })`, actualiza el costo unitario del insumo y liquida la cascada transaccional.
3. **Ingesta Batch con Filtro Anti-Pollution y Retención de Cuarentena:**
   * Archivo: `backend/src/routes/webhooks.ts`
   * Handler: `router.post('/supplier-prices')`
   * Detalle: Evalúa variación $>50\%$ y costo $\le \$0.01$, retiene en `pendingPackagePrice` o actualiza `Ingredient.currentCost` disparando `applyIngredientCostChange` para ítems con `mapped.isDefault`.

---

## Consecuencias y Compensaciones (Trade-offs)

### Positivas
* **Cero Polución:** La base de datos queda completamente blindada contra catálogos masivos basura de distribuidores.
* **Estabilidad de Recetas:** Ningún error tipográfico del proveedor distorsiona márgenes ni dispara falsas alarmas de rentabilidad sin revisión humana previa.
* **Determinismo:** El costo de costeo es único y auditable; las decisiones del comerciante sobre su proveedor habitual quedan registradas de forma trazable.

### Negativas / Deuda Asumida
* **Rechazo silencioso en cuarentena:** Al rechazar un precio anómalo no se genera una notificación externa al proveedor. Queda como propuesta para la Fase 2.
* **Monopresentación:** No es posible registrar dos tamaños de empaque distintos (ej. bolsa 25 kg y pack 5 kg) del mismo proveedor para un mismo insumo debido a la restricción relacional `@@unique([supplierId, ingredientId])`.