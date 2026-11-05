# Manual de Usuario - Proveedores y Listas de Precios

La pantalla **Proveedores** reúne a quién le comprás, cómo contactarlo y cuántos precios suyos esperan tu decisión. Es solo para el administrador: el colaborador no ve el enlace en el menú y, si entra a `/proveedores`, vuelve a **Productos**.

## Dónde está

- **En la computadora:** en la barra de arriba, botón **Proveedores**.
- **En el celular:** en el menú de abajo, ícono del camión **Proveedores**.

La sección tiene dos pestañas, arriba de todo:

- **Proveedores:** la lista de a quién le comprás (lo que explica este manual a continuación).
- **Cuarentena:** la bandeja de precios retenidos (ver [Revisar la cuarentena](#revisar-la-cuarentena)). Si hay precios esperando tu decisión, la pestaña muestra cuántos.

## Tu dirección para listas de precios

Debajo de las pestañas está la **dirección de tu comercio** para recibir listas de precios. Tiene la forma `precios-<slug>@margenx.tech`, donde `<slug>` es el identificador de tu comercio. Por ejemplo, para Panadería Central es `precios-panaderia-central@margenx.tech`.

1. Tocá **Copiar**. El botón pasa a decir **Copiada** y abajo aparece el aviso "Dirección copiada. Pasásela a tu proveedor."
2. Pegala donde la necesites: en un mail o un WhatsApp a tu proveedor para que mande ahí sus listas, o como destinatario cuando reenvíes una lista que te llegó a vos.

Si el navegador no deja copiar (por ejemplo, en un sitio sin `https`), aparece el aviso "No se pudo copiar": mantené presionada la dirección (o seleccionala) y copiala a mano.

La dirección es la misma para todos tus proveedores: MargenX reconoce de quién es cada precio por el código de artículo de la lista. Solo la ve el administrador.

## Qué muestra la lista

Arriba, tres números: **Proveedores activos**, **Insumos vinculados** (la suma de lo que le comprás a cada uno) y **Precios en cuarentena**. Si hay precios retenidos, aparece un aviso con el botón **Revisar**, que lleva a la bandeja de cuarentena.

Por cada proveedor ves:

| Dato | Qué significa |
|---|---|
| **Nombre** y **estado** | **Activo** (verde) o **Inactivo** (gris). El estado siempre dice la palabra, no solo el color. |
| **Contacto** | El teléfono y, debajo, el email. Si no hay teléfono, se muestra el email o la dirección. Si no cargaste ninguno, dice "Sin datos de contacto". |
| **Insumos** | Cuántos insumos le comprás, es decir, cuántas presentaciones tiene vinculadas (por ejemplo, "4 insumos"). |
| **Cuarentena** | "2 en cuarentena" si hay precios suyos retenidos porque cambiaron demasiado. Al pasar el mouse o llegar con el teclado se explica qué significa, y al tocarlo vas a la bandeja para aprobarlos o rechazarlos. Si no hay ninguno, dice "Sin precios retenidos". |

En el celular cada proveedor es una tarjeta; en la computadora se ve como una tabla.

Si todavía no cargaste ninguno, la pantalla te invita con el botón **Cargar mi primer proveedor**. Si no se pudo cargar la lista (por ejemplo, sin conexión), aparece un aviso con el botón **Reintentar**.

## Cargar un proveedor

1. Tocá **Nuevo proveedor**.
2. Escribí el **Nombre** (obligatorio, entre 2 y 120 caracteres). No puede repetirse en tu cuenta, sin importar mayúsculas: si ya existe, el aviso aparece debajo del campo.
3. Si querés, completá **Teléfono**, **Email** y **Dirección**. El teléfono acepta números, espacios, guiones, paréntesis y `+`, con al menos 6 dígitos (por ejemplo, `+54 9 2284 41-5566`). El email tiene que tener la forma `ventas@proveedor.com.ar`.
4. Tocá **Crear proveedor**. Mientras se guarda, el botón dice "Guardando..." y, al terminar, el proveedor aparece en la lista con un aviso de confirmación.

Los errores se marcan al salir de cada campo y se corrigen solos mientras escribís. Si cerrás el formulario con datos sin guardar, MargenX te pregunta si querés descartarlos.

Un proveedor nuevo arranca sin insumos. Para vincularle un insumo, abrí la ficha del insumo en **Insumos** y asociá la presentación (ver [Primeros pasos](01-primeros-pasos.md#proveedor-predeterminado)).

## Editar un proveedor

1. Tocá **Editar** en la fila del proveedor.
2. Cambiá lo que necesites. Para borrar un dato de contacto, dejá el campo vacío.
3. Con el interruptor **Proveedor activo** lo desactivás o lo volvés a activar.
4. Tocá **Guardar cambios**.

## Desactivar o dar de baja

Hay dos formas de dejar de usar un proveedor:

| | **Desactivar** | **Dar de baja** |
|---|---|---|
| El proveedor | Queda guardado como **Inactivo** | Se borra |
| Sus presentaciones | Se conservan | Se borran |
| Sus listas de precios | No se aplican mientras esté inactivo | Ya no actualizan esos insumos |
| ¿Se puede deshacer? | Sí, activándolo de nuevo | No |

Ninguna de las dos cambia el costo actual de tus insumos.

**Para dar de baja:**

1. Tocá **Dar de baja** en la fila del proveedor.
2. Antes de habilitar el botón, MargenX busca y lista las **Presentaciones afectadas**: cada insumo con su bulto, su precio y su código de artículo, y las marcas **Predeterminada** y **En cuarentena** cuando corresponden.
3. Debajo se explica qué pasa:
   - los insumos donde este proveedor era el **predeterminado** conservan su costo, pero quedan sin proveedor predeterminado hasta que elijas otro;
   - los precios **en cuarentena** de este proveedor se descartan sin aplicarse;
   - sus listas de precios ya no van a actualizar esos insumos.
4. Tocá **Sí, dar de baja** para confirmar, o **Cancelar**.

Si lo vas a volver a usar, en el mismo diálogo tocá **Desactivar en su lugar**: queda inactivo y conserva sus presentaciones.

Si no se pudieron traer las presentaciones, el botón de baja queda deshabilitado hasta que tocás **Reintentar**: así nunca confirmás sin ver qué se borra.

## Listas de precios y cuarentena

Las listas de precios de tus proveedores actualizan el costo de los insumos que ya tenés vinculados con su código de artículo (ver [Primeros pasos](01-primeros-pasos.md), "Con la lista de precios del proveedor"). Se mandan a [tu dirección para listas de precios](#tu-dirección-para-listas-de-precios). Solo se aplican las de proveedores **activos**. Si un precio cambia más de un 50 % respecto del vigente (o llega en cero o casi cero), queda retenido en **Proveedores › Cuarentena** hasta que lo apruebes o lo rechaces, y se cuenta en la columna **Cuarentena** de la lista.

Mientras un precio está retenido, el costo del insumo **no cambia**.

## Revisar la cuarentena

Entrá a **Proveedores** y tocá la pestaña **Cuarentena**. También llegás desde el aviso **Revisar** de la lista, desde la columna **Cuarentena** de cada proveedor o desde la ficha del insumo.

Por cada precio retenido ves el insumo y el proveedor, el costo **Actual** y el **Propuesto** (por unidad), la **Variación** en porcentaje y el **Motivo** (por ejemplo, "Aumento > 50%" o "Costo casi nulo"). Si no hay ninguno, la bandeja dice "Bandeja limpia".

Para decidir:

1. Tocá **Liberar** si el precio es correcto (por ejemplo, el proveedor aumentó de verdad), o **Rechazar** si es un error de la lista.
2. Leé el diálogo de confirmación:
   - **Liberar** aplica el precio nuevo. Si ese proveedor es el predeterminado del insumo, se actualiza el costo y se recalculan las recetas que lo usan; si algún producto queda por debajo de su margen mínimo, te llega la alerta. Si no es el predeterminado, solo se actualiza esa presentación.
   - **Rechazar** descarta el precio retenido: el insumo conserva su costo actual.
3. Tocá **Sí, liberar** o **Sí, rechazar**. Al terminar, el precio sale de la bandeja y aparece un aviso de confirmación.

Si algo falla (por ejemplo, se cortó la conexión), el mensaje de error aparece **dentro del mismo diálogo**, que queda abierto para que vuelvas a intentar o toques **Cancelar**. El precio sigue retenido hasta que la acción salga bien.

## El aviso en la ficha del insumo

Si un insumo tiene un precio retenido, al abrir su ficha en **Insumos** la sección **Proveedores y Empaques** muestra un aviso ("1 precio de este insumo está retenido en cuarentena") con el enlace **Revisar en Cuarentena**, y la presentación de ese proveedor lleva la marca **En cuarentena**.
