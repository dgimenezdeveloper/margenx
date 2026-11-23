# Manual de Usuario — Primeros Pasos

Bienvenido a MargenX. Esta guía te ayudará a dar tus primeros pasos en la plataforma para tomar el control de la rentabilidad de tu negocio en tiempo real.

<!-- [CAPTURA 360PX SUGERIDA: 01-landing-mobile.webp | Vista inicial de la aplicación en pantalla móvil de 360px destacando los accesos principales] -->

## Tres formas de cargar tus insumos

Según cuántos insumos tengas y de dónde salgan sus costos, podés elegir entre tres caminos. Los dos primeros los utiliza el Administrador; el personal con rol Colaborador no tiene acceso a la carga ni a los costos.

### 1. Uno por uno (Carga Manual Rápida)

Recomendado para comercios con pocos insumos o para dar de alta materias primas puntuales.

1. Entrá a la sección **Insumos** desde la barra de navegación.
2. Tocá el botón **+ Nuevo Insumo**.
3. Escribí el nombre del insumo (mínimo 2 caracteres).
4. Seleccioná la unidad de costeo base: `kg` (kilogramo), `litro` o `unidad`.
5. Ingresá el costo unitario de compra actual en pesos argentinos (ej. `736,25`).
6. Tocá **Crear Insumo**.

<!-- [CAPTURA 360PX SUGERIDA: 01-modal-nuevo-insumo.webp | Bottom sheet de alta manual de insumo con campos Nombre, Unidad y Costo Unitario] -->

### 2. Desde una planilla (Carga Masiva de Despensa)

Recomendado para arrancar rápidamente si ya tenés tu lista de precios en Excel o CSV (admite hasta 500 insumos por lote).

1. Entrá a **Insumos** y tocá el botón **Cargar desde planilla** (en el celular se identifica con el ícono de la planilla de cálculo al lado de *Nuevo Insumo*). Si la despensa está vacía, también podés usar el enlace directo en pantalla.
2. Presioná **Descargar plantilla**. Se descargará `plantilla-insumos-margenx.xlsx` con dos hojas:
   - *Insumos*: los títulos con el color de MargenX, la primera fila fija y cinco ejemplos en gris (borralos antes de subirla). La columna **Unidad** tiene una lista desplegable y la columna **Costo** ya tiene formato de pesos (`$ 1.234,56`) y no acepta valores negativos ni en cero, en las 500 filas que admite un lote.
   - *Instrucciones*: los pasos para completarla, la tabla de unidades con ejemplos y qué pasa al subirla.
3. Completá tus materias primas respetando las 3 columnas obligatorias:
   - **Nombre:** denominación de la materia prima (ej. *Harina 000 Olavarriense*).
   - **Unidad:** elegila de la lista (`kg`, `l` o `u`).
   - **Costo:** valor numérico positivo (por kilo, litro o unidad), con hasta dos decimales. Escribilo como lo ves en pantalla (`1.234,56`): no hace falta cambiar el formato de la celda para volver a subir la planilla.
4. Guardá el archivo como Excel o CSV y subilo tocando en **Elegí tu planilla** (o arrastralo desde tu computadora). La lectura se procesa de forma segura en tu propio dispositivo sin viajar por internet.
5. Revisá la vista previa organizada en tres pestañas:
   - **Válidas:** filas listas para ser importadas al catálogo.
   - **Repetidas:** insumos que ya existen en tu despensa o que se repiten dentro de la misma planilla. El sistema los omite para no alterar los costos vigentes.
   - **Con error:** filas que presentan problemas de formato (ej. unidades inexistentes o costos no numéricos), indicando el número exacto de fila para que puedas corregirlas.
6. Tocá **Importar insumos**. Al terminar, un aviso confirma el resultado, por ejemplo *"Se cargaron 12 insumos. 2 repetidos y 1 con error."*, y la lista se actualiza.

<!-- [CAPTURA 360PX SUGERIDA: 01-carga-masiva-preview.webp | Modal de carga masiva en móvil mostrando las pestañas Válidas, Repetidas y Con error con sus contadores] -->

Si guardás la planilla como CSV, conviene que esté separada por punto y coma (`;`), que es lo que hace Excel en español. Si está separada por comas y el costo lleva coma decimal sin comillas, la fila se marca con error para no cargar un costo equivocado.

### 3. Con la lista de precios del proveedor (Actualización Automática)

Pensado para **actualizar periódicamente los costos** de insumos que ya tenés cargados; no crea materias primas nuevas.

1. Asociá previamente cada insumo a su proveedor y cargá el código de artículo (SKU) con el que figura en su catálogo mayorista.
2. Cuando el proveedor te envíe su lista por correo o WhatsApp, reenviá el archivo a la dirección de tu comercio: `precios-<tu-comercio>@margenx.tech`. La encontrás en **Proveedores**, con el botón **Copiar** (ver [Tu dirección para listas de precios](04-proveedores-y-listas.md#tu-dirección-para-listas-de-precios)).
3. MargenX lee la lista, actualiza los precios de los artículos que tenés asociados y deja el resto afuera, sin tocar tu catálogo.
4. Si un costo varía más de un 50 % respecto del valor anterior, queda retenido preventivamente en **Proveedores › Cuarentena** hasta que confirmes si se trata de un aumento legítimo o un error del mayorista.

---

## Modificar un insumo existente (Nombre, Unidad y Costo)

Si necesitás corregir un error tipográfico en el nombre, rectificar la unidad de medida o actualizar manualmente el costo:

1. En **Insumos**, tocá la tarjeta o fila del insumo para abrir la ficha **Editar insumo**.
2. Modificá el **Nombre del insumo**. Si ingresás un nombre que ya existe en otro insumo de tu comercio (sin importar mayúsculas o minúsculas), MargenX te avisará directamente debajo del campo impidiendo guardar duplicados.
3. Para cambiar la **Unidad de medida**, seleccioná la nueva opción (`kg`, `litro`, `unidad`).
4. **Protección preventiva de recetas:** Si el insumo ya forma parte de recetas de productos, al presionar **Guardar cambios** se abrirá un diálogo de confirmación explicando que las cantidades numéricas guardadas en las recetas no se convertirán automáticamente (se preservará el número cargado). Deberás confirmar la acción y revisar las fichas técnicas afectadas para asegurar que las proporciones continúen siendo correctas.
5. El campo **Costo unitario** se presenta con el formato monetario argentino oficial (`2.179,13`). Podés tipear el valor libremente y, al salir del campo, el sistema reacomodará los separadores de miles y decimales de forma automática.

<!-- [CAPTURA 360PX SUGERIDA: 01-modal-edicion-insumo.webp | Ficha de insumo en edición con nombre, unidad, costo es-AR y bloque Se usa en] -->

---

## Sección "Se usa en" (Productos vinculados)

Al abrir la ficha de cualquier insumo existente, encontrarás la sección **Se usa en**:

- Muestra la cantidad total de productos cuya receta técnica utiliza esa materia prima.
- Cada producto se visualiza en una tarjeta con su nombre comercial, la cantidad requerida en su receta (ej. *Usa: 250 gr*) y, rotulado como **Precio de venta**, el precio vigente al público del producto (no es un costo).
- Al tocar cualquier producto de la lista, navegarás directamente hacia su ficha técnica para revisar o ajustar su formulación.
- Si el insumo no forma parte de ninguna receta, la sección te informará claramente que no está siendo utilizado en productos activos.
- Si un insumo está en más de 100 productos, la sección muestra los primeros 100 y avisa cuántos son en total.
- Si la lista no se puede cargar (por ejemplo, sin conexión), la sección lo avisa y ofrece **Reintentar**. Mientras no se sepa dónde se usa el insumo, cambiar la unidad pide confirmación igual.
- La sección es solo para el Administrador: el Colaborador no la ve.

---

## Historial de variaciones de costo

Para auditar la evolución de precios de un insumo:

1. Abrí la ficha del insumo y tocá el ícono del reloj (**Historial de precios**) en la esquina superior derecha.
2. Se desplegará la línea de tiempo con cada variación registrada (costo anterior, costo nuevo, porcentaje de aumento o disminución y fecha exacta). Cada costo dice por qué unidad es (por ejemplo, *$900,00/kg*): es la unidad actual del insumo, porque el historial no guarda la de cada cambio. Si cambiaste la unidad, los costos anteriores a ese cambio son de la unidad vieja.
3. **Orden cronológico:** La lista muestra por defecto el cambio más reciente en primer lugar.
4. Con el botón **Más recientes / Más antiguos**, podés alternar el orden de visualización según tu preferencia de análisis.

---

## Tarjeta "Variaciones recientes"

Arriba de la lista, el Administrador ve cuántos precios de proveedores están retenidos en la cuarentena. Si esa consulta falla (por ejemplo, sin conexión), la tarjeta dice **No se pudo cargar** y ofrece **Reintentar**, en lugar de mostrar un 0 que parecería un dato. El Colaborador no ve esta tarjeta.

---

## Buscar y recorrer el catálogo

Insumos, Productos y la ficha de cada proveedor muestran el catálogo de a 20 filas, aunque tengas cientos cargados.

- **Contador:** la tarjeta "Insumos activos" y el texto "Mostrando 1–20 de 218 insumos" cuentan todo lo cargado, no solo lo que se ve en pantalla.
- **Buscar:** escribí parte del nombre en el buscador. La búsqueda recorre todo el catálogo, no solo la página visible, e ignora tildes y mayúsculas: "sesamo" encuentra "Semillas de sésamo La Molinera". Los resultados aparecen apenas dejás de escribir.
- **En la computadora:** debajo de la lista, elegí cuántas filas ver (20, 50 o 100) y pasá de página con las flechas "Página anterior" y "Página siguiente".
- **En el celular:** al final de la lista, tocá **Cargar más** para sumar las 20 filas siguientes sin perder las que ya veías.
- **En la receta:** al elegir un insumo para un producto (alta o edición), escribí en "Filtrar por nombre..." y el selector busca en todos tus insumos. Usá las flechas del teclado para recorrer las opciones y Enter para elegir; Escape cierra la lista sin cerrar la pantalla. Los insumos ya agregados muestran "Ya en la receta" y no se pueden volver a elegir.
- **Alta rápida desde la receta:** si no encontrás el insumo, elegí "+ Crear nuevo insumo" al final de la lista. Completá nombre, unidad y costo en el modal secundario; al crearlo queda seleccionado sin perder los datos de la receta.

---

## Cómo escribir importes y cantidades

Para facilitar la carga de datos y evitar errores, MargenX está adaptado al formato numérico de uso común en Argentina:

- **Decimales:** Utilizá la **coma (`,`)** para separar los centavos o cantidades fraccionarias. Ejemplo: `1234,56` o `12,5`.
- **Miles y millones:** Podés usar el **punto (`.`)** para separar los miles. Ejemplo: `1.234,56` o montos redondos como `1.500.000`.
- **Atajo para montos cerrados:** Si escribís un número con puntos que separan bloques de exactamente tres dígitos (por ejemplo: `1.234` o `1.500.000`), el sistema los interpretará automáticamente como miles y millones (`1234` y `1500000`), no como números decimales.
- **Cantidades en recetas:** Al armar una receta, podés ingresar las cantidades en la unidad que te resulte más cómoda (por ejemplo, gramos o mililitros). MargenX se encarga de convertirla automáticamente a la unidad base del insumo (kilos o litros) para calcular el costo. La cantidad se puede corregir directamente en la lista de la receta. La base guarda hasta 3 decimales en la unidad del insumo: si escribís 0,5 g de un insumo que se compra por kilo, MargenX te avisa que se guarda como 1 g; si la cantidad no llega a 1 g (o 1 ml), te avisa y conserva la cantidad anterior. Los cambios de la receta se guardan con "Guardar Cambios".
- **Formateo automático:** Al terminar de escribir y salir del campo, el sistema acomodará visualmente el número al formato oficial argentino (ej. `1.234,56` o `1.500.000`) para que puedas confirmar de un vistazo que se interpretó correctamente.

Si ingresás un formato ambiguo o texto con letras (como `1.2.3` o `abc`), el sistema te mostrará un mensaje de error debajo del campo y no te permitirá guardar hasta que lo corrijas.

---

## Presentación predeterminada

En la ficha del insumo, la sección **Proveedores y presentaciones** lista lo que te vende cada proveedor. Con **Asociar otra presentación** cargás una nueva: el proveedor, el tamaño del bulto, el **precio del bulto** y, si querés, el **código de artículo** con que figura en su lista de precios (por ejemplo, `MC-990`); con ese código, las listas del proveedor actualizan el precio solas. Tené en cuenta lo siguiente:
- Solo una presentación puede ser la **predeterminada** de cada insumo (la marca la **estrella llena**). Su costo por unidad es el que se usa para calcular tus recetas.
- Para cambiarla, tocá la **estrella vacía** (**Usar como predeterminada**) de otra presentación: MargenX te pide confirmación con el costo nuevo y, al confirmar, desmarca la anterior y recalcula tus productos.
- Para proteger tus costos, **no podés quitar la presentación predeterminada sin elegir otra**.