# Manual de Usuario — Ventas, ticket y caja

Con **Ventas** cobrás en el mostrador en segundos y le das un ticket al cliente: cada venta queda registrada, con su número, y ya no hace falta el cuaderno. Lo usan el **Administrador** y el **Colaborador**.

**Es un módulo opcional.** Si en el menú no aparece **Ventas**, tu cuenta no lo tiene prendido. Por ahora lo prende el equipo de MargenX para cada comercio.

**El ticket no es una factura.** Dice "Comprobante no válido como factura". Si tu comercio tiene que facturar, seguí usando tu sistema de facturación.

## Antes de vender: abrir el turno de caja

Para cobrar tiene que haber un **turno de caja abierto** en el comercio. Lo abre el Administrador o el Colaborador, al empezar el día o el turno:

1. Entrá a **Ventas** (`/ventas`). Arriba ves **No hay un turno abierto**.
2. Escribí el **monto inicial en caja**: la plata que hay para dar cambio (por ejemplo, **10.000**).
3. Tocá **Abrir turno**.

Con el turno abierto, arriba de **Ventas** ves quién lo abrió, desde cuándo, cuántas ventas lleva y cuánto se vendió. Hay un solo turno abierto por comercio: si otra persona ya lo abrió, la app lo avisa y te muestra ese turno. Si entrás a **Nueva venta** sin un turno abierto, la app lo avisa y ofrece **Abrir el turno**.

<!-- [CAPTURA 360PX SUGERIDA: 09-ventas-turno.webp | Ventas a 360 px con el turno abierto: quién lo abrió, las ventas, Cerrar turno y Ver turnos] -->

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

El ticket muestra el nombre del comercio, el número (por ejemplo, **N.º 000008**; es correlativo en tu comercio), la fecha y la hora, cada producto con su cantidad y su importe, el total, el medio de pago y la leyenda **"Comprobante no válido como factura"**. Arriba lleva el logo de MargenX y al pie, "Emitido con MargenX · margenx.tech". En la ticketera el logo sale en negro; en A4 y en el PDF, en color.

- **Imprimir:** elegí el formato (**Ticketera 58 mm**, **Ticketera 80 mm** u **Hoja A4**) y tocá **Imprimir**. Se imprime solo el ticket, sin el menú.
- **Descargar PDF:** abre la ventana de impresión en tamaño A4. Ahí elegí **Guardar como PDF**.
- **Compartir por WhatsApp:** abre WhatsApp con el texto del ticket listo para mandarle al cliente.
- **Nueva venta:** vuelve a la pantalla de cobro.

<!-- [CAPTURA 360PX SUGERIDA: 09-ventas-ticket.webp | Ticket a 360 px con la leyenda no fiscal y los botones Imprimir, Descargar PDF y Compartir por WhatsApp] -->

## Historial y anulación

En **Ventas** (`/ventas`) ves las ventas de **Hoy**, **Del turno** (con un turno abierto) o **Todas**, la más reciente primero, con el número de ticket, la hora, el medio de pago y el total. El Administrador ve las de todo el comercio; el Colaborador, solo las que cobró él. Tocá una venta para abrir su ticket.

Para **anular** una venta (por ejemplo, si la cobraste dos veces): abrí su ticket, tocá **Anular venta**, escribí el motivo y confirmá.

- La venta **no se borra**: queda en el historial como **Anulada**, con el motivo.
- Solo se anulan ventas del **turno abierto**. Cuando el turno se cierra, sus ventas ya no se pueden anular, tampoco el Administrador: así el arqueo del cierre no cambia nunca.
- El **Colaborador** puede anular solo sus ventas; el **Administrador**, cualquier venta del turno.

## Cerrar la caja

Al terminar el turno, contá la plata y cerrá la caja. Lo puede hacer el Administrador o el Colaborador.

1. En **Ventas**, tocá **Cerrar turno**.
2. Para cada medio de pago ves lo **esperado**:
   - **Efectivo:** el monto inicial más las ventas en efectivo;
   - **Transferencia** y **Mercado Pago:** lo que se cobró por cada uno.

   Las ventas anuladas no cuentan.
3. Escribí lo **contado**. El efectivo lo contás en la caja. Transferencia y Mercado Pago ya vienen con lo esperado: si en la app del banco o de Mercado Pago ves otro monto, corregilo.
4. Al lado de cada medio y abajo, en el total, ves la **diferencia**:
   - **Falta** (en rojo, con un signo menos): hay menos plata de la esperada;
   - **Sobra** (en ámbar): hay más;
   - **Justo** (en verde): coincide.
5. Tocá **Cerrar turno** y confirmá. **Es definitivo:** en ese turno ya no se puede vender ni anular. Para seguir cobrando, abrí un turno nuevo.

Por ejemplo: si abriste con **$10.000**, vendiste **$25.000** en efectivo y al cerrar contás **$34.500**, lo esperado es $35.000 y la diferencia es **Falta −$500,00**.

**Tené en cuenta:**

- **El fondo es parte de lo contado.** Al cerrar contás toda la plata de la caja, también el fondo con el que abriste. Si vas a dejar un fondo para el turno siguiente, contalo igual: después, quien abre el turno nuevo lo escribe como monto inicial.
- **Varios vendedores, una caja.** Si en un turno venden varias personas, todas cobran en el mismo turno y el arqueo es de la caja entera, no de cada una. Para tener un arqueo por persona, que cada una abra y cierre su propio turno, uno después del otro.
- **Gastos pagados con la caja.** Si sacás plata de la caja durante el turno (por ejemplo, para pagarle al proveedor), por ahora no hay dónde anotarlo y va a aparecer como **Falta** en el arqueo. Anotá el gasto aparte. Registrar gastos y retiros está planificado para la v1.1.

<!-- [CAPTURA 360PX SUGERIDA: 09-ventas-cierre.webp | Cierre de caja a 360 px con lo esperado y lo contado por medio de pago, y la diferencia "Falta −$500,00" resaltada] -->

### El resumen del cierre

Al cerrar se abre el **resumen del turno** con el comercio, quién abrió y cerró y cuándo, el monto inicial, las ventas, las anuladas, lo vendido, el arqueo de cada medio de pago y la diferencia total.

- **Imprimir:** elegí **Ticketera 58 mm**, **Ticketera 80 mm** u **Hoja A4** y tocá **Imprimir** (o guardalo como PDF desde la ventana de impresión).
- **Ver las ventas del turno:** abre el historial con solo las ventas de ese turno.

En **Ventas → Ver turnos** (`/ventas/turnos`) están todos los turnos, el más reciente primero, con lo vendido y la diferencia de cada cierre. El Administrador ve todos; el Colaborador, el turno abierto y los que abrió, cerró o en los que vendió.

## Qué ve cada rol

| | Administrador | Colaborador |
|---|---|---|
| Cobrar y ver el ticket | Sí | Sí |
| Historial | Todas las ventas del comercio | Solo las suyas |
| Anular (solo con el turno abierto) | Cualquier venta del turno | Las suyas |
| Abrir y cerrar la caja | Sí | Sí |
| Historial de turnos | Todos | El abierto y los que abrió, cerró o en los que vendió |
| Costo y margen de cada venta | Los guarda MargenX para la ganancia real | **Nunca** los ve |

El precio y el costo de cada producto quedan **guardados en la venta**: si mañana cambia el precio de un insumo, el ticket y la ganancia de las ventas de hoy no cambian.
