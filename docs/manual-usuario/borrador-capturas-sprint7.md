# Borrador: capturas para el manual de usuario

> **Borrador de trabajo (21/11/2026). No es parte del manual publicado.**
> Reúne las capturas del recorrido de cliente en staging (`docs/qa/evidencias/recorrido-cliente/`) y dice en qué capítulo y sección del manual va cada una, qué texto alternativo lleva y qué falta capturar.
> Antes de pasarlas al manual: convertirlas a `.webp`, guardarlas en la carpeta de imágenes del manual con el nombre del marcador `CAPTURA SUGERIDA` que reemplazan, y rehacer las que muestran un defecto todavía abierto (columna "Rehacer después de").
> Ninguna captura tiene correos, fotos de perfil ni datos personales. Las direcciones `.example` de los proveedores son ficticias.

## Cómo usar este borrador

1. Elegí el capítulo.
2. Para cada fila con estado **Lista**, copiá la imagen, reemplazá el marcador `<!-- [CAPTURA 360PX SUGERIDA: …] -->` del capítulo por `![texto alternativo](ruta)` y borrá el marcador.
3. Las filas **Rehacer** esperan a que se cierre la issue indicada. Las filas **Falta** son capturas que todavía no existen.

---

## 01 · Primeros pasos (`01-primeros-pasos.md`)

| Marcador | Captura del recorrido | Estado | Texto alternativo propuesto |
|---|---|---|---|
| `01-landing-mobile` | — (hay `01-landing-escritorio.jpg`, en escritorio) | Falta a 360 px | Portada de MargenX en el celular con los botones "Ingresar al sistema" y "Ver innovaciones" |
| `01-modal-nuevo-insumo` | `09-alta-rapida-insumo.jpg` | Rehacer desde Insumos (esta es el alta rápida dentro de una receta) | Formulario "Nuevo insumo" con nombre, unidad (kg, litro, unidad) y costo unitario |
| `01-carga-masiva-preview` | `07-planilla-revision.jpg` | Lista (escritorio; sumar una a 360 px) | Revisión de la planilla con las pestañas Válidas (3), Repetidas (1) y Con error (1) |
| `01-modal-edicion-insumo` | `06-insumo-se-usa-en.jpg` | Rehacer después de QA7-08 (#433) (rótulo del precio en "Se usa en") y QA7-01 (#426) (unidad bloqueada) | Ficha de un insumo con sus proveedores, nombre, unidad, costo y la lista "Se usa en" |
| (sin marcador) Historial de variaciones | `05-insumo-historial-kg-a-litro.jpg` | Rehacer después de QA7-08 (#433) (el historial no muestra la unidad) | Historial de costos de un insumo con el precio anterior tachado, el nuevo y la variación |
| (sin marcador) Borrar un insumo usado | `08-insumo-borrar-en-receta-409.jpg` | Lista | Aviso "No se puede eliminar el insumo porque forma parte de una o más recetas activas" |
| (sin marcador) Insumos en el celular | `16-insumos-360.jpg` | Lista | Lista de insumos a 360 px con el buscador, el aviso de cuarentena y el botón "+ Nuevo Insumo" |

Texto sugerido para "Borrar un insumo usado": *Si el insumo está en alguna receta, MargenX no te deja borrarlo y te avisa. Primero sacalo de las recetas que lo usan (las ves en "Se usa en").*

## 03 · Rol colaborador (`03-colaborador.md`)

| Marcador | Captura del recorrido | Estado | Texto alternativo propuesto |
|---|---|---|---|
| `03-colaborador-productos` | `20-colaborador-panel.jpg` | Rehacer después de QA7-03 (#428) (hoy muestra productos en borrador a $0,00) | Panel del colaborador con el catálogo y solo el precio de venta de cada producto |
| `03-colaborador-detalle-producto` | — | Falta | Ficha de producto vista por el colaborador, con el precio de venta y la receta sin cantidades |
| (sección "Aviso al abrir una pantalla del administrador") | `19-colaborador-redirigido.jpg` | Lista | Catálogo de productos con el aviso "Esa pantalla es solo para el administrador. Te trajimos al catálogo de productos." |

## 02 · Rutas y roles (`02-rutas-y-roles.md`)

| Marcador | Captura del recorrido | Estado | Texto alternativo propuesto |
|---|---|---|---|
| `02-rutas-bottom-nav-comparativa` | `15-panel-360-nav-truncada.jpg` (solo admin) | Rehacer después de QA7-12 (#437) ("Proveedo…" cortado) y sumar la del colaborador | Menú inferior del administrador con seis pestañas y el del colaborador con tres |

## 04 · Proveedores y listas (`04-proveedores-y-listas.md`)

| Marcador | Captura del recorrido | Estado | Texto alternativo propuesto |
|---|---|---|---|
| `02-proveedores-lista-mobile` | — | Falta a 360 px | Lista de proveedores en el celular con cantidad de insumos y estado |
| `02-modal-alta-proveedor` | — | Falta | Formulario "Nuevo proveedor": solo el nombre es obligatorio |
| `02-dialogo-baja-proveedor` | `12-proveedor-baja-confirmacion.jpg` | Rehacer después de QA7-09 (#434) (texto más corto) | Confirmación de baja con las presentaciones afectadas y el aviso de que el insumo conserva su costo |
| `02-detalle-proveedor-presentaciones` | `11-proveedor-detalle-sin-alta.jpg` (sin presentaciones) | Rehacer después de QA7-09 (#434), con un proveedor que tenga presentaciones | Ficha del proveedor con sus presentaciones, código de artículo y la marca de predeterminada |
| `02-bandeja-cuarentena` | `21-cuarentena-liberar.jpg` (confirmación de Liberar) | Rehacer con un precio retenido visible en la bandeja (hoy está vacía) | Bandeja de cuarentena con el precio actual tachado, el propuesto, la variación y los botones Liberar y Rechazar |

## 06 · Panel (`06-panel.md`)

| Marcador | Captura del recorrido | Estado | Texto alternativo propuesto |
|---|---|---|---|
| `06-panel-mobile` | `15-panel-360-nav-truncada.jpg` | Rehacer después de QA7-05 (#430) ("Margen promedio") y QA7-12 (#437) | Panel a 360 px con las tres tarjetas y el histograma de cuatro columnas |
| (sección "El histograma de salud", tema claro) | `18-panel-360-claro-histograma.jpg` | Rehacer después de QA7-05 (#430) (rótulos "Riesgo" y "Objetivo") | Histograma en tema claro con Pérdida, En riesgo, En objetivo y Superávit |
| (sección "Las tarjetas", escritorio) | `03-panel-margen-promedio-mediana.jpg` | Rehacer después de QA7-05 (#430) | Panel en escritorio con las tarjetas de productos debajo de su mínimo, insumos activos y margen |

## 07 · Compras sugeridas (`07-compras-sugeridas.md`)

> El reenfoque se aprobó el 22/11/2026: Compras pasa a medir el impacto en el margen (#445 y #446) y se quitan la calculadora y el pedido semanal (ADR-010, #447). Las capturas de este capítulo esperan a que se cierre #446.

| Marcador | Captura del recorrido | Estado | Texto alternativo propuesto |
|---|---|---|---|
| `07-compras-sugeridas-mobile` | — | Esperar #446 | — |
| `07-compras-agrupadas-proveedor` | `13-compras-confirmar-predeterminada.jpg` | Esperar #446 | Confirmación para cambiar el proveedor predeterminado de un insumo |
| `07-previsualizacion-pedido` | `14-compras-pedido-1-bulto-c-u.jpg` | No usar: la calculadora se quita en #446 | — |

## 08 · Reporte semanal (`08-reporte-semanal.md`)

| Marcador | Captura del recorrido | Estado | Texto alternativo propuesto |
|---|---|---|---|
| `08-reporte-descarga` | — | Falta | Panel a 360 px con el botón "Descargar reporte (PDF)" |
| (sección "Qué trae el PDF") | `04-pdf-estado-cortado.png` | Rehacer después de QA7-10 (#435) (columna Estado cortada) | Primera página del reporte semanal con los productos debajo de su margen mínimo y el precio sugerido |

## Capítulo nuevo propuesto: crear un producto y su receta

Hoy el manual no tiene un capítulo para el flujo más usado. Borrador de texto, con las capturas que ya existen:

### Crear un producto

1. En **Productos**, tocá **Nuevo Producto**.
2. Escribí el nombre (por ejemplo, *Pan de campo — 1 kg*) y el precio de venta con coma decimal (*1.500,00*).
3. El margen mínimo arranca con el que definiste en Perfil. Podés cambiarlo solo para este producto.
4. Si guardás sin receta, el producto queda en **Borrador** y no tiene margen todavía.

### Armar la receta

1. En **Composición / Receta**, elegí el insumo. Podés escribir parte del nombre y moverte con las flechas.
2. Escribí la cantidad y elegí la unidad: gramos o kilos para los insumos en kg, mililitros o litros para los insumos en litro.
3. Tocá **Agregar Insumo a la Receta**. Un mismo insumo no se puede agregar dos veces.
4. Si el insumo no existe, tocá **Crear nuevo insumo** sin salir de la receta.

### Probar precios con el simulador

- **+5 %** y **+10 %** suben el precio de venta para ver cómo cambia el margen.
- **Sugerir** pone el precio que alcanza tu margen mínimo.
- Nada se guarda hasta que tocás **Guardar Producto**. Si te vas con cambios sin guardar, MargenX te pregunta antes.

| Captura | Estado | Texto alternativo propuesto |
|---|---|---|
| `10-producto-superavit-en-minimo.jpg` | Rehacer después de QA7-06 (#431) (formato del simulador) | Ficha de producto con el estado de margen arriba, los datos del producto y la receta |
| `17-producto-360.jpg` | Rehacer después de QA7-06 (#431) | Ficha de producto a 360 px con la barra inferior de precio, costo, ganancia y los botones Ajustar y Guardar |
| `09-alta-rapida-insumo.jpg` | Lista | Alta rápida de un insumo desde la receta, con el nombre ya completado |
| `09b-crear-nuevo-insumo-doble-mas.png` | No usar (muestra el defecto RC-11) | — |

## Capturas que no van al manual

| Captura | Motivo |
|---|---|
| `02-privacidad-jerga.jpg` | Evidencia de RC-01 para el reporte de QA |
| `09b-crear-nuevo-insumo-doble-mas.png` | Evidencia de RC-11 |
| `14-compras-pedido-1-bulto-c-u.jpg` | Evidencia para el reenfoque de Compras |

## Pendientes para completar el manual

- [ ] Capturas a 360 px que faltan: portada, alta de insumo desde Insumos, lista y alta de proveedores, ficha del producto para el colaborador, botón de descarga del reporte.
- [ ] Rehacer las capturas marcadas cuando se cierren QA7-01 (#426), QA7-03 (#428), QA7-05 (#430), QA7-06 (#431), QA7-08 (#433), QA7-09 (#434), QA7-10 (#435) y QA7-12 (#437).
- [ ] Decidir el capítulo 07 cuando se resuelva la ADR "MargenX no gestiona stock ni compras".
- [ ] Unificar el trato en vos en todo el manual (hoy mezcla "te ayudará" con "Entrá" y "Tocá").
