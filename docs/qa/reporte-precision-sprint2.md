# Reporte de Precisión Aritmética en Fórmulas Financieras — Sprint 2

**Proyecto:** MargenX

**Issue:** #77 — Validación de precisión aritmética en fórmulas financieras y edge cases

**Responsable de QA:** Leandro Herrera

**Estado del documento:** Firmado por QA (ver hallazgo pendiente de decisión en §5)

**Última actualización:** 2026-09-23

---

## 1. Objetivo

Certificar que no existan discrepancias de redondeo entre lo que calcula y
muestra el frontend (número flotante nativo de JavaScript) y lo que liquida
el backend (`Prisma.Decimal`, vía `backend/src/services/marginCalculator.ts`,
issue #75) para el costo de receta, el margen nominal y el margen porcentual,
dentro de la tolerancia de **±$0.01 ARS** definida por la issue.

## 2. Alcance y metodología

En vez de una colección Postman (que solo puede ejercitar la API, no la UI),
se implementó `backend/tests/postman/precision-aritmetica.test.ts`: un test
Vitest que reimplementa fielmente la matemática que corre **hoy** en el
frontend —

- `frontend/src/app/productos/detalle/page.tsx`
- `frontend/src/stores/useRecipeStore.ts` (mismo patrón en ambos)

— y compara sus resultados, para los mismos datos de entrada, contra las
funciones reales del backend (`calculateRecipeTotal`, `calculateMarginAmount`,
`calculateMarginPercent`). Esto permite detectar discrepancias de redondeo de
forma determinística y reproducible en CI, sin depender de un navegador.

**Nota sobre el entorno de ejecución:** la corrida documentada en este reporte
es **local**, contra el código de las issues #75/#83 (mergeadas a esta rama).
La issue pide además correr la suite contra Staging
(`https://api-dev.margenx.tech`); ese paso queda pendiente de que QA lo
ejecute manualmente contra ese entorno una vez desplegado, dado que este
entorno de desarrollo no tiene salida de red hacia esa URL.

## 3. Casos de prueba de frontera

| ID | Caso | Datos |
|----|------|-------|
| TC-PREC-01 | Insumo fraccionario mínimo | Azafrán: 0.005 kg a $85.000/kg, precio de venta $1.500 |
| TC-PREC-02 | Receta extensa | 16 insumos con cantidades fraccionarias irregulares, precio de venta $5.000 |
| TC-PREC-03 | Precio con decimal no exacto | $10.000 dividido entre 3 unidades ($3.333,33...), precio de venta $5.000 |
| TC-PREC-04 | Margen negativo | Costo de receta ($41.330,50) muy superior al precio de venta ($1.000) |

## 4. Matriz de comparación (resultado real de la corrida)

| Caso | Campo | Backend (Decimal, 2 dec.) | Frontend (float, según resolución) | Diferencia | ¿Dentro de tolerancia? |
|------|-------|---------------------------|-------------------------------------|-----------|------------------------|
| TC-PREC-01 | totalCost | 425.00 | 425.00 | 0.0000 | ✅ Sí |
| TC-PREC-01 | marginAmount | 1075.00 | 1075.00 | 0.0000 | ✅ Sí |
| TC-PREC-01 | marginPercent | 71.67% | 71.7% | 0.03 pp | ✅ Sí (ver §5) |
| TC-PREC-02 | totalCost | 947.31 | 947.31 | 0.0032 | ✅ Sí |
| TC-PREC-02 | marginAmount | 4052.69 | 4052.69 | 0.0032 | ✅ Sí |
| TC-PREC-02 | marginPercent | 81.05% | 81.1% | 0.05 pp | ✅ Sí (ver §5) |
| TC-PREC-03 | totalCost | 3333.33 | 3333.33 | 0.0033 | ✅ Sí |
| TC-PREC-03 | marginAmount | 1666.67 | 1666.67 | 0.0033 | ✅ Sí |
| TC-PREC-03 | marginPercent | 33.33% | 33.3% | 0.03 pp | ✅ Sí (ver §5) |
| TC-PREC-04 | totalCost | 41330.50 | 41330.50 | 0.0000 | ✅ Sí |
| TC-PREC-04 | marginAmount | -40330.50 | -40330.50 | 0.0000 | ✅ Sí |
| TC-PREC-04 | marginPercent | -4033.05% | -4033.0% | 0.05 pp | ✅ Sí (ver §5) |

**Resultado de la corrida:** `5 tests passed (5)` — 0 discrepancias monetarias
(`totalCost` / `marginAmount`) fuera de tolerancia en los 4 casos de frontera.

## 5. Hallazgo: el `marginPercent` del frontend redondea a 1 decimal, el backend a 2

En **todos** los casos, `totalCost` y `marginAmount` coinciden entre frontend
y backend dentro de la tolerancia de $0.01 ARS que pide la issue — la
diferencia máxima observada fue de $0.0033, producto de que el backend
redondea el costo de cada ítem de receta a 2 decimales *antes* de sumarlo
(`calculateItemCost`), mientras el frontend suma en punto flotante puro y
solo redondea al mostrar el valor en pantalla. Con importes reales de
comercio (no valores de laboratorio), esta diferencia es indetectable a
simple vista y queda muy por debajo del umbral.

**El `marginPercent` es otra historia.** El frontend calcula el margen
porcentual y lo redondea a **1 decimal**:

```js
// frontend/src/app/productos/detalle/page.tsx (y useRecipeStore.ts, mismo patrón)
const margin = Math.round(((sale - cost) / sale) * 1000) / 10