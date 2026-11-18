# Manual de Usuario — Compras Sugeridas (Smart Purchasing)

La sección **Compras Sugeridas** (`/compras`) es una herramienta de optimización de costos exclusiva para el Administrador. Analiza en tiempo real las presentaciones mayoristas de todos los distribuidores cargados en el sistema y te indica dónde conviene comprar cada materia prima para maximizar la rentabilidad de tus recetas.

El personal con rol Colaborador no tiene acceso a esta sección ni puede visualizarla en sus menús de navegación.

---

## 1. Dónde se encuentra y cómo ingresar

- **Desde la computadora:** en la barra de navegación superior, haciendo clic en el enlace **Compras** (ícono del changuito de supermercado).
- **Desde el celular:** en el menú de navegación inferior fijo (`BottomNav`), tocando el ícono **Compras**.

<!-- [CAPTURA 360PX SUGERIDA: 07-compras-sugeridas-mobile.webp | Pantalla /compras en vista móvil de 360px mostrando tarjetas KPI y lista de compras sugeridas] -->

---

## 2. Tarjetas de resumen del estado de compras

En la parte superior de la pantalla se despliegan cuatro indicadores esenciales:

| Indicador | Significado |
|---|---|
| **Con Ahorro Disponible** | Cantidad de materias primas que tienen al menos un proveedor activo con un costo unitario equivalente menor al de tu proveedor predeterminado actual. |
| **Al Mejor Precio** | Insumos cuya presentación predeterminada actual ya es la opción más barata disponible en el mercado. |
| **Proveedor Único** | Materias primas que solo tienen cargado un distribuidor. Para habilitar comparativas de ahorro en estos insumos, asociá proveedores adicionales desde la ficha del insumo en **Insumos**. |
| **Excluidos (Cuarentena)** | Presentaciones que tuvieron variaciones bruscas de precio (>50%) o valores anómalos. No compiten en las sugerencias hasta que las audites y liberes desde **Proveedores › Cuarentena**. |

Si existen presentaciones retenidas en cuarentena, un banner ámbar superior te avisará y te brindará un botón de acceso directo a la bandeja de resolución.

---

## 3. Lista de compras sugeridas agrupada por distribuidor

Las sugerencias se consolidan y agrupan por cada distribuidor mayorista recomendado:

- **Encabezado del proveedor:** Muestra la razón social o nombre de fantasía, teléfonos y correos de contacto directo para efectuar el pedido, y el **Ahorro potencial consolidado** si compras un bulto de cada insumo sugerido.
- **Detalle de cada insumo:**
  - Nombre del insumo y unidad de costeo base (`kg`, `l`, `u`).
  - Presentación comercial sugerida (bulto cerrado, factor de empaque y precio facturado).
  - Código de artículo mayorista (SKU) y descripción de lista si fueron provistos.
  - Comparativa de costo unitario: **Costo sugerido vs. Costo predeterminado actual**.
  - Ahorro diferencial resaltado en pesos y porcentaje de descuento.

> **Regla de oro de costos:** Consultar esta pantalla **no modifica tus costos vigentes ni altera las recetas de tus productos**. Solo identifica dónde comprar más barato.

<!-- [CAPTURA 360PX SUGERIDA: 07-compras-agrupadas-proveedor.webp | Desglose de insumos sugeridos agrupados por proveedor con botón Hacer predeterminada] -->

---

## 4. Establecer una sugerencia como proveedor predeterminado

Si decidís cambiar de proveedor habitual para un insumo aprovechando una mejor cotización:

1. Tocá el botón **Hacer predeterminada** ubicado junto al insumo sugerido.
2. Un diálogo de confirmación te advertirá el cambio, indicando el nuevo distribuidor, el nuevo costo unitario equivalente y recordando que las recetas que contienen este insumo se recalcularán de forma atómica.
3. Al pulsar **Confirmar cambio**, el costo activo de la materia prima se actualiza de inmediato en toda la plataforma.

---

## 5. Armado y cálculo de la orden de compra semanal

La pantalla permite armar el pedido de mercadería en minutos:

1. Indicá cuántos **Bultos** de cada presentación necesitás encargar utilizando el selector numérico de cada fila (podés ingresar entre 0 y 100.000 bultos por ítem).
2. Tocá el botón principal **Calcular pedido sugerido**.
3. Se desplegará la **Previsualización del Pedido Semanal**:
   - **Total Estimado:** Importe total en pesos sumando todos los proveedores.
   - **Ahorro Neto Estimado:** Dinero exacto que ahorrás con esta compra en comparación con haber adquirido esa misma cantidad a tus proveedores predeterminados anteriores.
   - **Desglose por Distribuidor:** Subtotal por proveedor y listado detallado de bultos y cantidades convertidas (ej. `2 bultos de 25 kg = 50 kg`).

---

## 6. Compartir por WhatsApp o Imprimir la orden

Una vez calculada la previsualización:

- **Copiar pedido:** Tocá el botón **Copiar pedido**. El sistema formateará automáticamente el detalle en texto plano estructurado con emojis y saltos de línea, listo para pegar directamente en un chat de WhatsApp o en un correo electrónico dirigido al vendedor.
- **Imprimir:** Tocá el botón **Imprimir**. La aplicación preparará una hoja de estilos de impresión limpia (`window.print`), ocultando barras de menú, botones y elementos visuales innecesarios, dejando únicamente la orden de compra lista para entregar a cocina o al personal de depósito.

<!-- [CAPTURA 360PX SUGERIDA: 07-previsualizacion-pedido.webp | Sección de orden de compra calculada con total estimado, ahorro y botones Copiar e Imprimir] -->

---

## 7. Preguntas frecuentes

### ¿Por qué un insumo más barato no se usa automáticamente en mis recetas?
Porque en la práctica comercial, comprarle a un distribuidor nuevo puede implicar condiciones de pago distintas, fletes mínimos o diferencias de calidad que el dueño debe evaluar. MargenX te muestra la oportunidad de ahorro, pero la decisión de cambiar el costo de tus recetas siempre queda bajo tu control explícito.

### ¿Qué pasa si cargo 0 bultos en un insumo?
Ese insumo simplemente se excluye de la orden de compra final. La previsualización solo calcula y agrupa aquellos ítems donde hayas ingresado al menos 1 bulto.