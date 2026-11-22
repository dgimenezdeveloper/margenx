# 10. Módulo de Ventas con Ticket No Fiscal y Control de Módulos por Plan y por Cuenta

* **Estado:** Aceptado
* **Fecha:** 2026-11-22
* **Decisores:** Darío Giménez (Tech Lead). Lo propuso la docente en la clase del 21/11/2026 y el equipo acordó el alcance el 22/11/2026 (acta del Sprint 6, §5.4).
* **Issue:** #447 (SPRINT7-SALES-00). Lo implementan #448 (venta y ticket), #449 (turnos y caja) y #450 (ganancia real).
* **Relacionado con:** ADR-004 (margen sobre ventas), ADR-005 (costo vigente), ADR-007 (roles fijos), ADR-008 (alta de colaboradores), ADR-009 (reporte semanal), `docs/especificacion-funcional.md` §13; la hoja de ruta posterior a la cursada la publica #451

---

## Contexto y Planteamiento del Problema

MargenX calcula el margen **teórico** de cada producto: precio de venta contra el costo de su receta (ADR-004). Nada dice cuánto se vendió ni cuánto se ganó de verdad. Los comercios piloto anotan las ventas en un cuaderno o en una planilla.

En la clase del 21/11/2026, la docente propuso ofrecer al emprendedor una solución inmediata, vender y dar un ticket, como puerta de entrada al control de margen. Restricciones:

* **Congelamiento de funcionalidades el 28/11/2026 y entrega el 05/12/2026** (SAD §1 y §6). Lo que ya funciona no se puede poner en riesgo.
* **No todos los comercios lo van a usar desde el primer día.** Hace falta prenderlo por cuenta, y en la Fase 2 venderlo como parte de un plan.
* **El recorrido de cliente del 21/11** (`docs/qa/reporte-calidad-sprint7.md` §1.10) mostró que Compras sugeridas inventaba cantidades: sin stock, el pedido semanal suponía 1 bulto por insumo.
* **Facturar es un trámite fiscal** (ARCA, certificados, puntos de venta) que no entra en dos semanas.

## Opciones Consideradas

1. **No hacer nada en la cursada** y dejar las ventas para la Fase 2.
2. **Ventas completas con stock:** venta, descuento de insumos por receta, ingreso de mercadería y reposición. Exige una carga inicial de stock por comercio y cambia el dominio actual (insumos, recetas y compras).
3. **Ventas con ticket no fiscal, caja por turnos y ganancia real, detrás de un control de módulos.** No toca insumos, productos, proveedores ni el recálculo. Stock, compras con pedido y facturación quedan para la Fase 2.

## Decisión

Se adopta la **opción 3**.

* **Ticket no fiscal:** la venta registra los productos, las cantidades, el medio de pago (efectivo, transferencia o Mercado Pago, **solo registrado**, sin integración de cobro) y un número de ticket correlativo por cuenta. El ticket dice **"Comprobante no válido como factura"**. Es la puerta de entrada para quien hoy anota a mano.
* **Precio, costo y margen congelados en cada renglón de la venta.** Cada `SaleItem` guarda el precio unitario, el costo unitario y el margen **del momento de la venta**. Así, la ganancia histórica no cambia cuando cambia un costo (ADR-005). El margen se calcula sobre el precio de venta, como en ADR-004.
* **Caja por turnos:** un solo turno abierto por cuenta, con el monto inicial y, al cierre, lo esperado y lo contado por medio de pago. Una venta exige un turno abierto.
* **Ganancia real:** ventas menos costo congelado, y el margen ponderado por lo vendido (ganancia / ventas). Complementa al margen teórico de cada producto, no lo reemplaza.
* **Lo que no se borra:** una venta se anula, con su motivo, y queda en el historial. Si se da de baja a un colaborador (ADR-008), sus ventas y turnos quedan sin usuario, pero no se pierden.
* **El colaborador vende pero no ve costos ni márgenes** (ADR-007, `docs/especificacion-funcional.md` §8), igual que en el resto de la app.
* **Control de módulos por plan y por cuenta** (`backend/src/lib/features.ts`):
  * `PLAN_FEATURES`: los módulos que trae cada plan (`FREE`, `BASIC`, `PRO`, `BUSINESS`), sobre el `Account.subscriptionPlan` que ya existe. **Hoy ningún plan trae módulos:** qué plan incluye las ventas se decide en la v1.2, con el backoffice y los planes pagos. Esa asignación es una *propuesta* abierta, no una regla.
  * `AccountFeature`: excepciones por cuenta (prender o apagar un módulo para un comercio puntual).
  * `hasFeature`: primero la excepción de la cuenta y, si no hay, el plan. Un plan desconocido no trae módulos.
  * `requireFeature('sales')`: con el módulo apagado, las rutas `/api/sales` y `/api/cash-shifts` responden **404**, como si no existieran.
  * `GET /api/auth/me` informa los módulos de la cuenta en `user.features`, y el frontend los lee con un solo hook (`useFeatures`) para mostrar u ocultar el menú.
  * En la v1.0.0, el módulo está prendido solo en la cuenta Demo de staging. El 28/11 se decide si se prende en la cuenta Demo de producción (#450).
* **Compras sugeridas mide el impacto en el margen** de cambiar de proveedor. Sin stock no hay cantidades reales, así que la reposición con cantidades llega en la Fase 2, cuando exista el stock. La calculadora de bultos y el pedido semanal se quitan (#445, #446), y `POST /api/purchasing/order-preview` queda deprecado: se reutiliza para la reposición con stock o se elimina en la v1.1.
* **Pasan a la Fase 2** (la hoja de ruta con las versiones la publica #451):
  * **stock de insumos** descontado por receta desde las ventas, con carga inicial e ingreso de mercadería: exige datos iniciales por comercio y cambia el dominio de insumos y recetas;
  * **compras con pedido** a proveedores y **reposición** con cantidades: dependen del stock;
  * **facturación electrónica de ARCA**: trámites fiscales (certificados y puntos de venta) que no dependen del equipo.

## Consecuencias

* **Positivas:**
  * El comercio que hoy anota a mano tiene una razón inmediata para usar MargenX, y cada venta alimenta la ganancia real.
  * El módulo se activa por cuenta sin tocar a los demás comercios, y la misma tabla sirve para los planes de la Fase 2.
  * La migración es solo aditiva (tablas nuevas, ninguna columna existente cambia), así que el release v1.0.0 no depende del módulo: si el 28/11 no está listo, queda apagado.
  * El margen ponderado por lo vendido, que la especificación funcional daba como imposible por falta de volumen de ventas, pasa a ser calculable (nota en ADR-004).
* **Negativas / a mitigar:**
  * **El ticket no es una factura.** Un comercio que necesita facturar sigue usando su sistema fiscal. *Mitigación:* la leyenda en cada ticket y la aclaración en el manual.
  * **Sin stock, la venta no descuenta insumos.** La ganancia real es correcta (usa el costo de la receta), pero no hay control de faltantes. *Mitigación:* el stock es lo primero de la Fase 2 (v1.1).
  * **Un módulo más para probar antes de la entrega.** *Mitigación:* todo entra detrás del control de módulos y con la decisión del 28/11, que puede dejarlo apagado sin afectar el release.
  * **Las excepciones por cuenta se cargan a mano** (seed o SQL) hasta que exista el backoffice de la v1.2 (Concierge MVP, `docs/propuesta-proyecto.md` §13.1).
