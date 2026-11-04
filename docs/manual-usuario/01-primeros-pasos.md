# Manual de Usuario - Primeros Pasos

Bienvenido a MargenX. Esta guía te ayudará a dar tus primeros pasos en la plataforma.

## Tres formas de cargar tus insumos

MargenX se adapta al tamaño de tu negocio y al momento de tu comercio ofreciendo tres caminos para incorporar materias primas:

1. **Carga manual uno a uno (Arranque Rápido):**
   - Entrá a **Insumos** y presioná **"Nuevo Insumo"**.
   - Ingresá el nombre, la unidad de costeo (`kg`, `litro` o `unidad`) y el costo por unidad vigente.
   - Ideal si manejás pocas materias primas o querés dar de alta un insumo puntual de forma inmediata.

2. **Carga masiva por planilla (Plantilla Oficial):**
   - Si tenés tu despensa en una hoja de cálculo, ingresá a **Insumos** y hacé clic en **"Cargar desde planilla"**.
   - Descargá la **plantilla oficial** en formato Excel (.xlsx).
   - Completá las tres columnas requeridas: **Nombre**, **Unidad** (`kg`, `l` o `u`) y **Costo** (con formato argentino habitual, ej. `1.234,56`).
   - Subí el archivo: el sistema lo analizará en tu navegador de forma privada y te mostrará una **vista previa defensiva** dividida en tres pestañas:
     - **Válidas:** filas listas para ser incorporadas.
     - **Repetidas:** nombres que ya tenías cargados o duplicados en el archivo (se omitirán para no alterar tus costos sin tu autorización).
     - **Con error:** filas que tengan importes inválidos (como letras o negativos) o unidades incorrectas, indicando el número exacto de fila y el motivo.
   - Al presionar **Confirmar**, se crean todos los insumos válidos en una sola operación sin que los errores bloqueen el resto.

3. **Ingesta desatendida por correo ("Zero-Click"):**
   - Cuando tu distribuidor o mayorista te envíe su lista por correo o WhatsApp, simplemente reenviá el archivo a la casilla virtual de tu negocio: `precios-<slug>@margenx.tech`.
   - Nuestro satélite leerá la lista en segundo plano, actualizará únicamente los artículos que tengas vinculados a tus proveedores y descartará el resto sin ensuciar tu catálogo.

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