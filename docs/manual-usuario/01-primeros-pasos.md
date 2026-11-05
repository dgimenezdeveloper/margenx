# Manual de Usuario - Primeros Pasos

Bienvenido a MargenX. Esta guía te ayudará a dar tus primeros pasos en la plataforma.

## Tres formas de cargar tus insumos

Según cuántos insumos tengas y de dónde salen sus costos, hay tres caminos. Los dos primeros los usa el administrador; el colaborador no ve costos ni puede cargar insumos.

### 1. Uno por uno

Para pocos insumos o para sumar uno puntual.

1. Entrá a **Insumos** y tocá **Nuevo Insumo**.
2. Escribí el nombre, elegí la unidad (`kg`, `litro` o `unidad`) y el costo de esa unidad.
3. Tocá **Guardar**.

### 2. Desde una planilla

Para arrancar con toda tu despensa de una vez (hasta 500 insumos por archivo).

1. Entrá a **Insumos** y tocá **Cargar desde planilla** (en el celular es el ícono de planilla, al lado de **Nuevo Insumo**). Si todavía no tenés insumos, también aparece el enlace **Cargala desde una planilla**.
2. Tocá **Descargar plantilla**. Es un Excel (.xlsx) con una hoja **Insumos**, que trae filas de ejemplo, y una hoja **Instrucciones**.
3. Completá una fila por insumo y borrá los ejemplos:
   - **Nombre:** cómo lo reconocés vos, con al menos 2 letras.
   - **Unidad:** `kg` (kilo), `l` (litro) o `u` (unidad). También se aceptan palabras como `kilos`, `litros` o `unidades`.
   - **Costo:** lo que te cuesta 1 kg, 1 litro o 1 unidad, mayor a 0 y con hasta 2 decimales, por ejemplo `1.234,56`.
4. Guardá el archivo como Excel (.xlsx o .xls) o como CSV y subilo desde **Elegí tu planilla**. En la computadora también podés arrastrarlo. El archivo se lee en tu dispositivo: a MargenX solo llegan las filas que confirmes.
5. Revisá la vista previa, que separa las filas en tres pestañas:
   - **Válidas:** se van a cargar.
   - **Repetidas:** el nombre ya está en tu despensa o aparece más de una vez en la planilla (sin importar mayúsculas). No se cargan, así no cambia el costo de un insumo que ya tenías.
   - **Con error:** muestran el número de fila de tu planilla y el motivo, por ejemplo un costo con letras o una unidad que no existe.
6. Tocá **Importar** y vas a ver cuántos insumos se crearon y cuántos se omitieron. Las filas con error no frenan al resto: corregilas en tu planilla y subilas en otra carga.

Si guardás la planilla como CSV, conviene que esté separada por punto y coma (`;`), que es lo que hace Excel en español. Si está separada por comas y el costo lleva coma decimal sin comillas, la fila se marca con error para no cargar un costo equivocado.

### 3. Con la lista de precios del proveedor

Sirve para **actualizar los costos** de insumos que ya cargaste; no crea insumos nuevos.

1. Antes, vinculá cada insumo con su proveedor y cargá el código con que ese proveedor lo identifica en su lista.
2. Cuando te llegue la lista (por correo o por WhatsApp), reenviá el archivo por correo a la dirección de tu comercio: `precios-<slug>@margenx.tech`. La encontrás en **Proveedores**, con el botón **Copiar** (ver [Tu dirección para listas de precios](02-proveedores-y-listas.md#tu-dirección-para-listas-de-precios)).
3. MargenX lee la lista y actualiza solo los códigos vinculados. Los códigos que no reconoce se informan y no modifican nada.
4. Si un precio cambia más de un 50 % respecto del vigente, queda retenido en **Proveedores › Cuarentena** hasta que lo apruebes o lo rechaces.

---

## Cómo escribir importes y cantidades

Para facilitar la carga de datos y evitar errores, MargenX está adaptado al formato numérico de uso común en Argentina:

- **Decimales:** Utilizá la **coma (`,`)** para separar los centavos o cantidades fraccionarias. Ejemplo: `1234,56` o `12,5`.
- **Miles y millones:** Podés usar el **punto (`.`)** para separar los miles. Ejemplo: `1.234,56` o montos redondos como `1.500.000`.
- **Atajo para montos cerrados:** Si escribís un número con puntos que separan bloques de exactamente tres dígitos (por ejemplo: `1.234` o `1.500.000`), el sistema los interpretará automáticamente como miles y millones (`1234` y `1500000`), no como números decimales.
- **Formateo automático:** Al terminar de escribir y salir del campo, el sistema acomodará visualmente el número al formato oficial argentino (ej. `1.234,56` o `1.500.000`) para que puedas confirmar de un vistazo que se interpretó correctamente.

Si ingresás un formato ambiguo o texto con letras (como `1.2.3` o `abc`), el sistema te mostrará un mensaje de error debajo del campo y no te permitirá guardar hasta que lo corrijas.

## Proveedor Predeterminado

Cuando asocies empaques de proveedores a tus insumos, tené en cuenta lo siguiente:
- Solo un proveedor puede ser el **predeterminado** para cada insumo. El costo de este proveedor es el que se usará para calcular tus recetas.
- Para proteger tus costos, **no podés quitar el proveedor predeterminado sin elegir otro**. Si querés cambiar de proveedor, simplemente marcá el nuevo como predeterminado y el sistema se encargará de desmarcar el anterior y recalcular tus productos automáticamente.