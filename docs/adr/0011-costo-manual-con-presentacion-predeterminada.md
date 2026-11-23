# 11. Costo Manual de un Insumo con Presentación Predeterminada

* **Estado:** Aceptado
* **Fecha:** 2026-11-23
* **Decisores:** Darío Giménez (Tech Lead), al resolver la contradicción entre la issue #427 (SPRINT7-QA7-02) y ADR-005.
* **Issue:** #427. Origen: hallazgo RC-28 del recorrido de cliente del 21/11/2026 (`docs/qa/reporte-calidad-sprint7.md` §1) y la revisión de usabilidad del equipo.
* **Reemplaza en parte a:** ADR-005, en dos reglas: "Sobrescritura deliberada de ediciones manuales" y, para un caso nuevo, "todo insumo con proveedores asociados conserve siempre una presentación predeterminada activa". El resto de ADR-005 sigue vigente.

---

## Contexto y Planteamiento del Problema

ADR-005 establece que el costo de un insumo sale de su presentación predeterminada. También admite que el administrador edite el costo a mano: ese costo funciona como *override* temporal, y la próxima actualización de la presentación (una lista del proveedor o un cambio del bulto) lo pisa.

En el recorrido de cliente del 21/11/2026 eso apareció como un defecto (RC-28):

* El dueño cambia el costo de un insumo de $900 a $950 por kg. Se guarda, pero la presentación predeterminada sigue a $900 por kg y sigue siendo la predeterminada.
* Nada le avisa. Compras sugeridas y el reporte semanal comparan contra un costo que ya no sale de ningún proveedor, y la próxima lista vuelve a $900 sin que el dueño entienda por qué.

ADR-005 también exige que todo insumo con proveedores conserve una presentación predeterminada. Esa regla ya tenía una excepción: al dar de baja un proveedor, los insumos en los que era el predeterminado quedan sin predeterminado hasta que el dueño elija otro (`docs/manual-usuario/04-proveedores-y-listas.md`, "Desactivar o dar de baja").

## Opciones Consideradas

1. **Mantener el override temporal** y solo avisar. El aviso no resuelve la contradicción: el costo y la presentación siguen sin coincidir hasta la próxima lista.
2. **Ofrecer tres salidas:** las dos de la opción 3 más "guardar solo en el insumo" (el override de ADR-005). Suma una opción que el recorrido mostró que confunde.
3. **Pedir que el dueño elija qué hacer con la presentación**, con dos salidas: actualizar su precio o dejar de usarla como predeterminada. **(Elegida)**

## Decisión

Cuando el administrador cambia el costo de un insumo, el insumo tiene una presentación predeterminada y el costo nuevo no coincide con el costo unitario de esa presentación, `PUT /api/ingredients/:id`:

* **Sin decisión del dueño:** responde `409` con `code: "DEFAULT_PRESENTATION_MISMATCH"` y los datos de la presentación (proveedor, bulto, precio del bulto y costo unitario). No guarda nada.
* **`defaultPresentationAction: "update-presentation"`:** en la misma transacción que el costo, el precio del bulto pasa a `costo × tamaño del bulto`, redondeado a 2 decimales con `ROUND_HALF_UP` (ADR-004). La presentación sigue siendo la predeterminada, así que el costo y la presentación vuelven a coincidir.
* **`defaultPresentationAction: "clear-default"`:** en la misma transacción, la presentación deja de ser la predeterminada. El insumo queda con el costo manual y **sin presentación predeterminada** hasta que el dueño elija otra. Es la segunda excepción a la regla de ADR-005, junto con la baja de un proveedor.

El override temporal de ADR-005 deja de existir para los insumos con presentación predeterminada. Sin presentación predeterminada, con el mismo costo o con un costo que coincide con el de la presentación, el costo se guarda como antes.

## Consecuencias

* **Positivas:**
  * El costo del insumo y el de su presentación predeterminada no se contradicen sin que el dueño lo decida.
  * La decisión queda en la base, en una sola transacción, con el historial de costos del insumo.
* **Negativas y deuda:**
  * Un insumo puede quedar sin presentación predeterminada aunque tenga proveedores. Hasta que el dueño elija otra, las listas de precios actualizan las presentaciones pero no el costo del insumo (ADR-005: solo la predeterminada mueve el costo).
  * El precio del bulto calculado con `update-presentation` puede diferir en centavos de la factura real del proveedor. Lo corrige la próxima lista.
  * El cliente que edita el costo tiene que manejar el `409` nuevo. Hoy es solo la ficha del insumo en `/insumos`.
