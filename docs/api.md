# API — Límites, errores y seguridad

## Límites de cuerpo

- El parser global de Express usa `limit: '256kb'` para rutas no dedicadas a ingesta.
- El webhook de ingesta `POST /api/webhooks/supplier-prices` usa un parser específico con `limit: '5mb'`, montado antes del parser global.
- El límite de 5 MB está por encima de la capacidad real de la lista de precios que n8n envía y por debajo del límite de la VPS para evitar depender del valor por defecto de 20 MB.

## Código de error para payload demasiado grande

Cuando el cuerpo excede el límite permitido, la API responde con status `413` y un cuerpo estructurado:

```json
{
  "code": "PAYLOAD_TOO_LARGE",
  "error": "La lista es demasiado grande. Dividila en varios lotes más pequeños."
}
```

La propiedad `code` es estable para que `n8n` pueda detectar el caso y mostrar un mensaje amigable a la persona que envía la lista.

## Seguridad HTTP

- La API incorpora `helmet` con la configuración por defecto.
- Todavía no se habilita `Content-Security-Policy`; se deja en modo de reporte y se manejará en la tarea de DevOps correspondiente.

## Códigos HTTP relevantes

- `200`: operación exitosa.
- `400`: JSON inválido o payload de negocio inválido (por ejemplo, nombre vacío, valores negativos o una receta con un insumo de otra cuenta).
- `401`: secreto del webhook inválido o ausente.
- `404`: recurso inexistente o cuenta inactiva.
- `409`: conflicto de unicidad: nombre duplicado en la cuenta, sin distinguir mayúsculas (producto, insumo o proveedor), o asociación proveedor-insumo duplicada.
- `413`: cuerpo demasiado grande.
- `500`: error interno no controlado.

## Validaciones de productos e insumos

Aplican a `POST /api/products`, `PUT /api/products/:id`, `POST /api/ingredients` y `PUT /api/ingredients/:id`. La base las refuerza con índices únicos `(accountId, lower(name))` en `Product`, `Ingredient` y `Supplier`.

| Caso | Respuesta | Mensaje (`error`) |
|---|---|---|
| `salePrice` ≤ 0 con al menos un insumo en la receta (la del body o, si el body no la trae, la guardada) | `400` | `El precio de venta debe ser mayor a cero cuando el producto tiene ingredientes en su receta.` |
| `salePrice: 0` sin receta (borrador) | `201` / `200` | — (costo `0.00` y margen `0.00 %`) |
| El mismo `ingredientId` dos veces en `ingredients` | `400` | `No se puede repetir el mismo insumo en la receta.` |
| `salePrice` o `minMarginPercent` con más de 2 decimales | `400` | `El campo "salePrice" debe ser un valor decimal válido con hasta 2 decimales (ej: "1500.50").` |
| `quantity` con más de 3 decimales | `400` | `El campo "quantity" debe ser un valor decimal válido con hasta 3 decimales (ej: "0.250").` |
| `quantity` mayor a `9999999.999` (columna `Decimal(10,3)`) | `400` | `El campo "quantity" excede la capacidad máxima permitida.` |
| `currentCost` con más de 2 decimales o en notación científica | `400` | `El campo "currentCost" debe ser un valor decimal válido (ej: "742.98").` |
| Nombre de producto o insumo que ya existe en la cuenta con otro casing | `409` | `Ya existe un producto con ese nombre.` / `Ya existe un insumo con ese nombre.` |
