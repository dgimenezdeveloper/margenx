# 4. Adopción del Margen Comercial sobre Precio de Venta (Profit Margin) en lugar del Recargo sobre Costo (Markup)

* **Estado:** Aceptado
* **Fecha:** 2026-10-19
* **Decisores:** Darío Giménez (DevOps/SM), Leandro Herrera (QA/PO), equipo de desarrollo MargenX
* **Issue:** #180 (SPRINT4-DOCS-02)
* **Relacionado con:** `docs/qa/reporte-precision-sprint2.md` (issue #77), `backend/src/services/marginCalculator.ts` (issue #75)

## Contexto y Planteamiento del Problema

En la práctica comercial de una PyME es habitual confundir "ganar el 100 %" con duplicar el costo. Eso es un **markup** (recargo sobre costo) del 100 %, que equivale a un **margen** del 50 % sobre el precio de venta. Un comerciante que fija precios multiplicando su costo y luego lee un "margen" calculado sobre otra base obtiene números que no coinciden con los de su cabeza, y toma decisiones de precio con una rentabilidad distinta de la que cree tener.

MargenX debe elegir **una sola métrica rectora** para mostrar, alertar y comparar la rentabilidad de cada producto, y definir cómo conviven con ella los hábitos de quien piensa en recargos.

### Las dos fórmulas

Sea `C` el costo total de la receta y `V` el precio de venta:

* **Margen sobre ventas:** `Margen % = (V − C) / V × 100`
* **Markup sobre costo:** `Markup % = (V − C) / C × 100`

Se relacionan por `Margen = Markup / (1 + Markup)` (con ambos expresados como fracción) y, a la inversa, `Markup = Margen / (1 − Margen)`.

| Costo | Venta | Markup | Margen |
|---:|---:|---:|---:|
| $1.000 | $1.250 | 25 % | 20 % |
| $1.000 | $1.500 | 50 % | 33,3 % |
| $1.000 | $2.000 | 100 % | 50 % |
| $1.000 | $3.000 | 200 % | 66,7 % |

### Demostración de que el margen sobre ventas está acotado

Para `V > 0` y `C ≥ 0`:

`Margen = (V − C) / V = 1 − C / V`

Como `C / V ≥ 0`, resulta `Margen ≤ 1`, es decir **un margen sobre ventas nunca supera el 100 %**. El 100 % solo se alcanza con costo cero; con costo positivo es siempre menor. El otro extremo no está acotado: si `C > V` el margen es negativo y puede ser arbitrariamente bajo (venta a pérdida). En cambio, el markup no tiene techo (`C → 0` implica `Markup → ∞`), por lo que no sirve como indicador acotado ni comparable entre productos de distinto costo.

Además, `V` es el dinero que efectivamente entra a la caja: el margen sobre ventas responde directamente a "de cada $100 que cobro, ¿cuánto queda después de pagar los insumos?".

## Opciones Consideradas

1. **Markup sobre costo** como métrica rectora: coincide con cómo muchos comerciantes fijan el precio, pero no está acotado, no es comparable con el resto del mercado y se confunde con el margen.
2. **Mostrar ambas métricas con el mismo peso:** duplica la información, genera ambigüedad sobre cuál dispara las alertas y complica los umbrales (`minMarginPercent`).
3. **Margen sobre ventas como única métrica rectora**, ofreciendo ayudas de fijación de precio que no obliguen al usuario a convertir mentalmente entre bases. **(elegida)**

## Decisión

MargenX adopta el **margen bruto sobre el precio de venta** como métrica rectora de rentabilidad, y todo lo que dependa de ella (alertas, semáforo, umbral mínimo, dashboard) se calcula con esa fórmula.

Implementación vigente:

* **Cálculo** (`backend/src/services/marginCalculator.ts`): `calculateMarginAmount = V − C` y `calculateMarginPercent = (V − C) / V × 100`, con `Prisma.Decimal` y redondeo a 2 decimales. Si `V ≤ 0` o el producto no tiene ingredientes, el porcentaje es `0.00 %` para evitar la división por cero.
* **Umbral:** cada producto tiene `minMarginPercent` y la cuenta tiene `defaultMinMarginPercent` (30 % por defecto). Un producto es *crítico* cuando `marginPercent < minMarginPercent`; las alertas se emiten solo al **cruzar** el umbral (ver ADR-003).
* **Simulador de precio** (frontend): para quien razona con recargos, los botones **+5 %** y **+10 %** aplican un factor sobre el *precio de venta* y el botón **Sugerir X %** calcula el precio que logra un margen objetivo `m` con `V = C / (1 − m / 100)`. En todos los casos el margen mostrado se recalcula sobre el precio resultante, nunca sobre el costo.
* **Límites de validación:** `minMarginPercent` se valida en el backend a un máximo de 999,99 % (columna `Decimal(5,2)`), mientras que `marginPercent` se almacena como `Decimal(8,2)` y admite valores negativos de venta a pérdida. Cuando el usuario ingresa un objetivo de margen ≥ 100 % (no alcanzable sobre ventas) el simulador usa un factor de 0,5 como respaldo en lugar de dividir por cero o por un número negativo.

## Consecuencias

* **Positivas:**
  * Claridad contable: el dueño sabe qué porcentaje de cada $1.000 que ingresan a caja es ganancia bruta.
  * Una única base para umbrales, alertas, semáforo y reportes; los números son comparables entre productos.
  * Métrica acotada superiormente, lo que permite validar entradas y detectar errores de carga.
  * Coherencia con el estándar financiero y con las pruebas de precisión de `reporte-precision-sprint2.md`.
* **Negativas / a mitigar:**
  * Un comerciante habituado al markup puede esperar "100 %" para duplicar el costo y ver 50 %. *Mitigación:* el simulador sugiere el precio para un margen objetivo y la documentación de soporte (`support-docs-modal`) debe explicar la equivalencia con la tabla de este ADR.
  * El frontend calcula y muestra el margen con 1 decimal mientras el backend lo liquida con 2 (hallazgo §5 de `reporte-precision-sprint2.md`, diferencia máxima de 0,05 puntos porcentuales). *Mitigación:* se propone unificar a 2 decimales (mejora pendiente, fuera del alcance de este ADR); hasta entonces la fuente de verdad es el valor del backend.
  * Los productos sin ingredientes muestran `0.00 %` aunque tengan precio; se interpreta como "sin costo cargado", no como rentabilidad nula.
