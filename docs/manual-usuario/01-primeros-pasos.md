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
2. Presioná **Descargar plantilla**. Se descargará un archivo Excel (`.xlsx`) listo para usar con dos hojas: *Insumos* (con ejemplos de panadería y química) e *Instrucciones*.
3. Completá tus materias primas respetando las 3 columnas obligatorias:
   - **Nombre:** denominación de la materia prima (ej. *Harina 000 Olavarriense*).
   - **Unidad:** unidad de medida (`kg`, `l` o `u`).
   - **Costo:** valor numérico positivo (por kilo, litro o unidad), en formato argentino con hasta dos decimales (ej. `1.234,56`).
4. Guardá el archivo como Excel o CSV y subilo tocando en **Elegí tu planilla** (o arrastralo desde tu computadora). La lectura se procesa de forma segura en tu propio dispositivo sin viajar por internet.
5. Revisá la vista previa organizada en tres pestañas:
   - **Válidas:** filas listas para ser importadas al catálogo.
   - **Repetidas:** insumos que ya existen en tu despensa o que se repiten dentro de la misma planilla. El sistema los omite para no alterar los costos vigentes.
   - **Con error:** filas que presentan problemas de formato (ej. unidades inexistentes o costos no numéricos), indicando el número exacto de fila para que puedas corregirlas.
6. Tocá **Importar insumos**. El sistema confirmará cuántos insumos se crearon y cuántos fueron omitidos.

<!-- [CAPTURA 360PX SUGERIDA: 01-carga-masiva-preview.webp | Modal de carga masiva en móvil mostrando las pestañas Válidas, Repetidas y Con error con sus contadores] -->

Si guardás la planilla como CSV, conviene que esté separada por punto y coma (`;`), que es lo que hace Excel en español. Si está separada por comas y el costo lleva coma decimal sin comillas, la fila se marca con error para no cargar un costo equivocado.

### 3. Con la lista de precios del proveedor (Actualización Automática)

Pensado para **actualizar periódicamente los costos** de insumos que ya tenés cargados; no crea materias primas nuevas.

1. Asociá previamente cada insumo a su proveedor y cargá el código de artículo (SKU) con el que figura en su catálogo mayorista.
2. Cuando el proveedor te envíe su lista por correo o WhatsApp, reenviá el archivo a la dirección virtual de tu comercio: `precios-<slug>@margenx.tech`. La encontrás en **Proveedores**, con el botón **Copiar** (ver [Tu dirección para listas de precios](02-proveedores-y-listas.md#tu-dirección-para-listas-de-precios)).
3. MargenX lee la lista, actualiza los precios de los artículos mapeados y descarta el resto mediante el Filtro Anti-Polución.
4. Si un costo varía más de un 50 % respecto del valor anterior, queda retenido preventivamente en **Proveedores › Cuarentena** hasta que confirmes si se trata de un aumento legítimo o un error del mayorista.

---

## Cómo escribir importes y cantidades

Para facilitar la carga de datos y evitar errores, MargenX está adaptado al formato numérico de uso común en Argentina:

- **Decimales:** Utilizá la **coma (`,`)** para separar los centavos o cantidades fraccionarias. Ejemplo: `1234,56` o `12,5`.
- **Miles y millones:** Podés usar el **punto (`.`)** para separar los miles. Ejemplo: `1.234,56` o montos redondos como `1.500.000`.
- **Atajo para montos cerrados:** Si escribís un número con puntos que separan bloques de exactamente tres dígitos (por ejemplo: `1.234` o `1.500.000`), el sistema los interpretará automáticamente como miles y millones (`1234` y `1500000`), no como números decimales.
- **Formateo automático:** Al terminar de escribir y salir del campo, el sistema acomodará visualmente el número al formato oficial argentino (ej. `1.234,56` o `1.500.000`) para que puedas confirmar de un vistazo que se interpretó correctamente.

Si ingresás un formato ambiguo o texto con letras (como `1.2.3` o `abc`), el sistema te mostrará un mensaje de error debajo del campo y no te permitirá guardar hasta que lo corrijas.

---

## Proveedor Predeterminado

Cuando asocies empaques de proveedores a tus insumos, tené en cuenta lo siguiente:
- Solo un proveedor puede ser el **predeterminado** para cada insumo. El costo de este proveedor es el que se usará para calcular tus recetas.
- Para proteger tus costos, **no podés quitar el proveedor predeterminado sin elegir otro**. Si querés cambiar de proveedor, simplemente marcá el nuevo como predeterminado y el sistema se encargará de desmarcar el anterior y recalcular tus productos automáticamente.