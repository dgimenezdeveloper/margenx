# Manual de Usuario — Cómo leer el panel

El panel (**Inicio**, `/dashboard`) resume la salud de **todo tu catálogo**, no solo de los productos que se ven en pantalla. Las tarjetas, el histograma y el total del catálogo salen de la misma cuenta, así que sus números coinciden entre sí. Esta guía es para el Administrador; el Colaborador ve solo el catálogo con los precios de venta (`03-colaborador.md`).

<!-- [CAPTURA 360PX SUGERIDA: 06-panel-mobile.webp | Panel a 360 px con la tarjeta de productos en riesgo, el histograma de cuatro columnas y la grilla] -->

## Las tarjetas

- **Productos en Riesgo:** cuántos productos con receta quedaron por debajo de su margen mínimo, incluidos los que se venden a pérdida.
- **Insumos Activos:** cuántos insumos tenés cargados.
- **Margen Promedio:** la **mediana** del margen de los productos con receta: la mitad de tus productos gana más que ese valor y la otra mitad, menos. Se usa la mediana y no un promedio simple para que un solo precio mal cargado (por ejemplo, un producto de $13 que cuesta $3.854) no arrastre el número. El color sigue el signo: verde si es positivo, rojo si es negativo y neutro si es 0 %.

En el celular se ve la tarjeta de productos en riesgo; las de insumos y margen promedio aparecen desde la tableta.

## El histograma de salud

Agrupa los productos que tienen receta en cuatro columnas. **Cada producto se compara con su propio margen mínimo**, el que le pusiste en su ficha, y no con un valor fijo para todo el catálogo:

| Columna | Qué productos cuenta |
|---|---|
| **Venta a Pérdida** | Margen menor a 0 %: el precio no cubre el costo. |
| **En Riesgo** | Margen de 0 % o más, pero por debajo del mínimo de ese producto. |
| **En Objetivo** | Margen entre el mínimo del producto y 60 %. |
| **Superávit** | Margen mayor a 60 % y por encima del mínimo del producto. |

Debajo de cada número está el porcentaje sobre los productos con receta. Al pie se informan los productos **en borrador** (sin receta, que no tienen margen) y el **total del catálogo**: las cuatro columnas más los borradores dan ese total.

Ejemplo: con 339 productos, 50 en borrador y columnas de 12, 107, 130 y 40, la suma es 12 + 107 + 130 + 40 + 50 = 339, y el enlace dice **Ver catálogo completo (339)**.

## Filtrar la grilla desde el histograma

1. Tocá una columna del histograma (por ejemplo, **En Riesgo**).
2. La grilla de abajo muestra solo esos productos, buscando en todo el catálogo, y el título indica cuántos son sobre el total (`107 de 339`).
3. Para volver a ver todo, tocá **Restablecer** (o **Ver catálogo completo** en la computadora), o tocá de nuevo la misma columna.

Una columna sin productos aparece atenuada y no se puede tocar.

## Recorrer el catálogo

La grilla ordena los productos de menor a mayor margen, con los borradores al final, y muestra 20 por vez:

- **En la computadora:** debajo de la grilla está el paginador, con **Filas por página** (20, 50 o 100) y los botones de página anterior y siguiente.
- **En el celular:** el botón **Cargar más** suma los 20 siguientes debajo de los que ya ves.

Al cambiar de columna en el histograma, la grilla vuelve a la primera página.

## Descargar el reporte en PDF

Arriba, junto al saludo, el botón **Descargar reporte (PDF)** baja el reporte semanal con los números de este panel, sin esperar al mail del lunes. Qué trae y qué hacer si falla: [Reporte semanal en PDF](08-reporte-semanal.md).
