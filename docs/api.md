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

## Carga masiva de insumos (`POST /api/ingredients/bulk`)

La carga inicial por plantilla se realiza desde el navegador como una lista de filas. El endpoint es administrativo y requiere rol `ADMIN`.

### Contrato

- `POST /api/ingredients/bulk`
- Body: array de objetos con `name`, `unit` y `cost` (también acepta `nombre`, `unidad`, `costo` o `currentCost` por compatibilidad con la plantilla).
- Unidades válidas: `kg`, `l` y `u`.
- Límite: `500` filas por lote. Si se supera, responde `413` con `code: "PAYLOAD_TOO_LARGE"` y mensaje claro.
- Validación por fila: una fila inválida no bloquea el resto.
- Omisión de duplicados: si el nombre ya existe en la cuenta, la fila no pisa el costo activo y se cuenta en `skipped`.
- Transacción: toda la operación se ejecuta dentro de una única transacción de Prisma.

### Respuesta exitosa

```json
{
  "created": 20,
  "skipped": 1,
  "errors": [
    { "row": 5, "reason": "El campo \"cost\" debe ser mayor a cero." }
  ]
}
```

La propiedad `errors` vuelve `[]` cuando todas las filas son válidas. Cada error incluye el número de fila y el motivo de rechazo.

### Números argentinos

El backend acepta tanto `1234.56` como `1.234,56` y `1.234.567,89` para los costos, normalizando el formato antes de persistirlo. La lógica se reutiliza para la carga manual y la carga masiva para evitar inconsistencias en la interpretación de precios.

## Códigos HTTP relevantes

- `200`: operación exitosa.
- `400`: JSON inválido o payload de negocio inválido (por ejemplo, nombre vacío, valores negativos o una receta con un insumo de otra cuenta).
- `401`: secreto del webhook inválido o ausente.
- `403`: el usuario autenticado no tiene el rol requerido (por ejemplo, un colaborador en los endpoints de proveedores).
- `404`: recurso inexistente o cuenta inactiva.
- `409`: conflicto de unicidad: nombre duplicado en la cuenta, sin distinguir mayúsculas (producto, insumo o proveedor), o asociación proveedor-insumo duplicada.
- `413`: cuerpo demasiado grande o exceso de filas en carga masiva.
- `500`: error interno no controlado.

## POST /api/suppliers/:id/ingredients

Contrato de alta/update de presentaciones de proveedor para un insumo.

### Campos soportados

```json
{
  "ingredientId": "ing-123",
  "packageSize": "50",
  "packageUnit": "kg",
  "packagePrice": "35000",
  "isDefault": true,
  "supplierCode": "HAR-000",
  "rawDescription": "Harina 000 bolsa 50kg"
}
```

- `supplierCode`: opcional, se recorta el contenido a los extremos y se valida con un máximo conservador de 64 caracteres.
- `rawDescription`: opcional, se recorta y se guarda como descripción tal cual la lista del proveedor la enviará.
- La comparación de `supplierCode` es insensible a mayúsculas/minúsculas tanto en PostgreSQL como durante la ingesta de precios; esto evita desalineaciones de casing entre la lista del proveedor y la base de datos.
- Si el código ya existe para ese proveedor, la API responde `409 Conflict` indicando qué insumo lo está usando.
- Si no se envía `supplierCode`, la asociación se guarda igual, pero la respuesta incluye un `message` avisando que ese insumo no recibirá precios por ingesta hasta que el administrador cargue el código.

### Respuesta exitosa

```json
{
  "supplierIngredient": {
    "id": "si-123",
    "supplierId": "s-1",
    "ingredientId": "ing-123",
    "supplierCode": "HAR-000",
    "rawDescription": "Harina 000 bolsa 50kg",
    "isDefault": true
  },
  "unitCost": "700",
  "ingredient": { "id": "ing-123", "name": "Harina 000" },
  "ingestEnabled": true
}
```

### Respuesta con advertencia de ingesta deshabilitada

```json
{
  "supplierIngredient": { "id": "si-456", "isDefault": false },
  "unitCost": "700",
  "ingredient": { "id": "ing-456", "name": "Manteca" },
  "ingestEnabled": false,
  "message": "La asociación se guardó, pero este insumo no recibirá precios por ingesta porque no tiene código de proveedor."
}
```

## GET /api/suppliers

Lista los proveedores de la cuenta, ordenados por nombre. Solo `ADMIN`.

Cada proveedor suma dos contadores, que valen `0` si no hay ninguna presentación:

- `ingredientCount`: la cantidad de presentaciones del proveedor, es decir, cuántos insumos le compra la cuenta (hay una sola presentación por par proveedor-insumo).
- `quarantineCount`: cuántas de esas presentaciones tienen un precio retenido en cuarentena, pendiente de decisión del administrador.

```json
{
  "suppliers": [
    {
      "id": "s-1",
      "accountId": "account-1",
      "name": "Molino Sur",
      "contactPhone": "+54 9 2284 41-5566",
      "email": "ventas@molinosur.example.test",
      "address": null,
      "isActive": true,
      "ingredientCount": 5,
      "quarantineCount": 2
    },
    {
      "id": "s-2",
      "accountId": "account-1",
      "name": "Distribuidora Norte",
      "contactPhone": null,
      "email": null,
      "address": null,
      "isActive": false,
      "ingredientCount": 0,
      "quarantineCount": 0
    }
  ]
}
```

Códigos: `200`, `401`, `403`.

## GET /api/suppliers/:id

Detalle de un proveedor de la cuenta, con sus presentaciones. Cada presentación trae el insumo asociado, el código de artículo y el precio. Solo `ADMIN`.

```json
{
  "supplier": {
    "id": "s-1",
    "accountId": "account-1",
    "name": "Molino Sur",
    "ingredients": [
      {
        "id": "si-1",
        "supplierCode": "HAR-000",
        "packagePrice": "35000",
        "packageSize": "50",
        "ingredient": { "id": "ing-1", "name": "Harina 000", "unit": "kg", "currentCost": "700" }
      }
    ]
  }
}
```

Los montos y tamaños (`packagePrice`, `packageSize`, `currentCost`) viajan como `string` para no perder precisión decimal.

Códigos: `200`, `401`, `403`, `404` (`Proveedor no encontrado.`, también si pertenece a otra cuenta).

## DELETE /api/suppliers/:id/ingredients/:ingredientId

Quita la presentación de un insumo en un proveedor. Solo `ADMIN`.

- Si la presentación **no** es la predeterminada, se elimina y el costo vigente del insumo no cambia.
- Si es la **predeterminada** (la que fija el costo vigente) y existen otras presentaciones del mismo insumo en la cuenta, responde `409` y pide elegir antes otra como predeterminada.

```json
{ "message": "Presentación eliminada correctamente." }
```

| Caso | Respuesta | Mensaje (`error`) |
|---|---|---|
| Presentación común | `200` | — (`message`: `Presentación eliminada correctamente.`) |
| Predeterminada con otras presentaciones del insumo | `409` | `No puedes eliminar la presentación predeterminada mientras existan otras. Selecciona otra como predeterminada primero.` |
| Proveedor inexistente o de otra cuenta | `404` | `Proveedor no encontrado.` |
| El insumo no tiene presentación en ese proveedor | `404` | `Presentación no encontrada.` |
| Usuario con rol `COLLABORATOR` | `403` | — (no se elimina nada) |

La regla para la última presentación de un insumo está en el ADR-005.

## POST /api/suppliers/quarantine/:id/reject

Rechaza un precio retenido en cuarentena. El costo vigente del insumo no cambia: se limpian `pendingPackagePrice`, `isQuarantined`, `quarantinedAt` y `quarantineReason`. Solo `ADMIN`.

```json
{
  "supplierIngredient": { "id": "sq-1", "pendingPackagePrice": null, "isQuarantined": false },
  "message": "Precio anómalo rechazado y mantenido en el costo anterior."
}
```

Códigos: `200`, `401`, `403`, `404` (`Precio en cuarentena no encontrado.`, también si es de otra cuenta).

## GET /api/auth/me

Devuelve el usuario autenticado y los datos básicos de su cuenta.

- **`ADMIN`:** `account` incluye `slug`, que es la base de la dirección de ingesta `precios-<slug>@margenx.tech`.
- **`COLLABORATOR`:** `account` trae solo `id` y `businessName`. No recibe `slug` ni `defaultMinMarginPercent`.

```json
{
  "user": {
    "id": "user-1",
    "accountId": "account-1",
    "email": "admin@comercio.example",
    "role": "ADMIN",
    "account": {
      "id": "account-1",
      "businessName": "Panadería Central",
      "defaultMinMarginPercent": "30",
      "slug": "panaderia-central"
    }
  }
}
```

Para un colaborador, `account` es `{ "id": "account-1", "businessName": "Panadería Central" }`.

Códigos: `200`, `401`.

## Validaciones de productos e insumos

Aplican a `POST /api/products`, `PUT /api/products/:id`, `POST /api/ingredients`, `PUT /api/ingredients/:id` y `POST /api/suppliers/:id/ingredients`. La base las refuerza con índices únicos `(accountId, lower(name))` en `Product`, `Ingredient` y `Supplier`.

| Caso | Respuesta | Mensaje (`error`) |
|---|---|---|
| `salePrice` ≤ 0 con al menos un insumo en la receta (la del body o, si el body no la trae, la guardada) | `400` | `El precio de venta debe ser mayor a cero cuando el producto tiene ingredientes en su receta.` |
| `salePrice: 0` sin receta (borrador) | `201` / `200` | — (costo `0.00` y margen `0.00 %`) |
| El mismo `ingredientId` dos veces en `ingredients` | `400` | `No se puede repetir el mismo insumo en la receta.` |
| `salePrice` o `minMarginPercent` con más de 2 decimales | `400` | `El campo "salePrice" debe ser un valor decimal válido con hasta 2 decimales (ej: "1500.50").` |
| `quantity` con más de 3 decimales | `400` | `El campo "quantity" debe ser un valor decimal válido con hasta 3 decimales (ej: "0.250").` |
| `quantity` mayor a `9999999.999` (columna `Decimal(10,3)`) | `400` | `El campo "quantity" excede la capacidad máxima permitida.` |
| `packageSize` (presentación de proveedor) con más de 3 decimales o mayor a `9999999.999` (`Decimal(10,3)`) | `400` | `El campo "packageSize" debe ser un valor decimal válido con hasta 3 decimales (ej: "25.500").` / `El campo "packageSize" no puede superar 9.999.999,999.` |
| `packagePrice` con más de 2 decimales o mayor a `99999999.99` | `400` | `El campo "packagePrice" debe ser un valor decimal válido con hasta 2 decimales (ej: "35000.50").` / `El campo "packagePrice" no puede superar $99.999.999,99.` |
| `currentCost` con más de 2 decimales o en notación científica | `400` | `El campo "currentCost" debe ser un valor decimal válido (ej: "742.98").` |
| Nombre de producto o insumo que ya existe en la cuenta con otro casing | `409` | `Ya existe un producto con ese nombre.` / `Ya existe un insumo con ese nombre.` |
