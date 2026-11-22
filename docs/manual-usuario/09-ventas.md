# Manual de Usuario — Ventas y ticket

Con **Ventas** cobrás en el mostrador en segundos y le das un ticket al cliente: cada venta queda registrada, con su número, y ya no hace falta el cuaderno. Lo usan el **Administrador** y el **Colaborador**.

**Es un módulo opcional.** Si en el menú no aparece **Ventas**, tu cuenta no lo tiene prendido. Por ahora lo prende el equipo de MargenX para cada comercio.

**El ticket no es una factura.** Dice "Comprobante no válido como factura". Si tu comercio tiene que facturar, seguí usando tu sistema de facturación.

## Antes de vender: el turno de caja

Para cobrar tiene que haber un **turno de caja abierto** en el comercio. Si no lo hay, al tocar **Cobrar** la app lo avisa ("No hay un turno de caja abierto") y ofrece **Abrir el turno**. La apertura y el cierre de la caja se explican en este mismo capítulo cuando estén disponibles.

## Cobrar una venta

En **Ventas → Nueva venta** (`/ventas/nueva`):

1. Buscá el producto por su nombre (no hace falta poner tildes: "cafe" encuentra "Café con leche").
2. Tocá **+** para sumar una unidad y **−** para sacarla. Arriba de cada tarjeta ves el precio.
3. Abajo, la barra de cobro muestra el **total** y cuántas unidades llevás.
4. Elegí el medio de pago: **Efectivo**, **Transferencia** o **Mercado Pago**. MargenX solo lo anota: no cobra ni se conecta con Mercado Pago ni con el banco.
5. Tocá **Cobrar**. La venta queda registrada y se abre el ticket.

Solo aparecen los productos que se pueden vender: los que tienen receta y precio de venta. Un producto en **borrador** (sin receta) o con precio en $0 no se ofrece.

<!-- [CAPTURA 360PX SUGERIDA: 09-ventas-nueva.webp | Nueva venta a 360 px: búsqueda, grilla con + y −, y la barra de cobro con el total, el medio de pago y Cobrar] -->

## El ticket

El ticket muestra el nombre del comercio, el número (por ejemplo, **N.º 000008**; es correlativo en tu comercio), la fecha y la hora, cada producto con su cantidad y su importe, el total, el medio de pago y la leyenda **"Comprobante no válido como factura"**.

- **Imprimir:** elegí el formato (**Ticketera 58 mm**, **Ticketera 80 mm** u **Hoja A4**) y tocá **Imprimir**. Se imprime solo el ticket, sin el menú.
- **Descargar PDF:** abre la ventana de impresión en tamaño A4. Ahí elegí **Guardar como PDF**.
- **Compartir por WhatsApp:** abre WhatsApp con el texto del ticket listo para mandarle al cliente.
- **Nueva venta:** vuelve a la pantalla de cobro.

<!-- [CAPTURA 360PX SUGERIDA: 09-ventas-ticket.webp | Ticket a 360 px con la leyenda no fiscal y los botones Imprimir, Descargar PDF y Compartir por WhatsApp] -->

## Historial y anulación

En **Ventas** (`/ventas`) ves las ventas de **Hoy** o **Todas**, la más reciente primero, con el número de ticket, la hora, el medio de pago y el total. El Administrador ve las de todo el comercio; el Colaborador, solo las que cobró él. Tocá una venta para abrir su ticket.

Para **anular** una venta (por ejemplo, si la cobraste dos veces): abrí su ticket, tocá **Anular venta**, escribí el motivo y confirmá.

- La venta **no se borra**: queda en el historial como **Anulada**, con el motivo.
- El **Colaborador** puede anular solo sus ventas y mientras el turno de caja siga abierto. Después, la anulación la hace el Administrador.
- El **Administrador** puede anular cualquier venta del comercio.

## Qué ve cada rol

| | Administrador | Colaborador |
|---|---|---|
| Cobrar y ver el ticket | Sí | Sí |
| Historial | Todas las ventas del comercio | Solo las suyas |
| Anular | Cualquier venta | Las suyas, con el turno abierto |
| Costo y margen de cada venta | Los guarda MargenX para la ganancia real | **Nunca** los ve |

El precio y el costo de cada producto quedan **guardados en la venta**: si mañana cambia el precio de un insumo, el ticket y la ganancia de las ventas de hoy no cambian.
