
# API REST — Contratos, Límites, Seguridad y Códigos HTTP

Esta especificación constituye la fuente única de verdad para el Frontend, las automatizaciones de n8n y las suites automatizadas de Postman/Newman (`backend/tests/postman/`). Toda ruta requiere autenticación mediante cabecera `Authorization: Bearer <JWT>` emitido por Clerk, salvo el webhook receptor que utiliza firma por secreto criptográfico.

---

## 1. Límites de Carga y Seguridad HTTP

- **Límite General:** `256 KB` para todas las rutas REST de la plataforma.
- **Webhook de Ingesta:** `5 MB` dedicados para `POST /api/webhooks/supplier-prices`.
- **Exceso de Payload:** Responde `413` con cuerpo estructurado:
  ```json
  {
    "code": "PAYLOAD_TOO_LARGE",
    "error": "La lista es demasiado grande. Dividila en varios lotes más pequeños."
  }
  ```
- **Seguridad Perimetral:** Incorporación de cabeceras HTTP de `helmet`.
- **Aislamiento Multi-Tenant:** Todas las consultas en base de datos se aíslan estrictamente por `accountId`, extraído del usuario autenticado en `req.user`.

---

## 2. Códigos de Estado HTTP Uniformes

- `200 OK`: Operación exitosa (lectura o actualización).
- `201 Created`: Recurso creado exitosamente.
- `400 Bad Request`: Error de validación semántica o sintáctica (cuerpo no numérico, cantidades negativas, JSON malformado).
- `401 Unauthorized`: Token JWT ausente, vencido o secreto de webhook inválido.
- `403 Forbidden`: Privilegios insuficientes (ej. rol `COLLABORATOR` intentando mutar datos o acceder a rutas de administración).
- `404 Not Found`: Recurso inexistente o perteneciente a otra cuenta comercial.
- `409 Conflict`: Violación de unicidad de nombre (case-insensitive) o de protección referencial.
- `413 Payload Too Large`: Cuerpo de solicitud superior a la cuota permitida o más de 500 filas en carga masiva.
- `422 Unprocessable Entity`: Violación de regla de negocio (ej. quitar el proveedor predeterminado sin asignar un reemplazo).
- `500 Internal Server Error`: Excepción no controlada en servidor.

---

## 3. Módulo Autenticación y Cuenta (`/api/auth`)

### `GET /api/auth/me`
Retorna el perfil del usuario autenticado y su cuenta asociada.
- **Roles:** `ADMIN` o `COLLABORATOR`.
- **Sanitización RBAC:** Si el usuario es `COLLABORATOR`, el objeto `account` omite `slug` y `defaultMinMarginPercent`.
- **Respuesta 200 (ADMIN):**
  ```json
  {
    "user": {
      "id": "uuid",
      "accountId": "uuid",
      "email": "admin@comercio.example",
      "role": "ADMIN",
      "account": {
        "id": "uuid",
        "businessName": "Panadería Central",
        "defaultMinMarginPercent": "30.00",
        "slug": "panaderia-central"
      }
    }
  }
  ```

### `PATCH /api/auth/account/margin`
Actualiza el margen objetivo global por defecto para la cuenta comercial.
- **Roles:** Solo `ADMIN` (responde `403` a colaboradores).
- **Body:** `{ "defaultMinMarginPercent": 35 }` (número entre 0 y 100).
- **Respuesta 200:**
  ```json
  {
    "message": "Margen global actualizado correctamente",
    "account": {
      "id": "uuid",
      "businessName": "Panadería Central",
      "defaultMinMarginPercent": "35.00"
    }
  }
  ```

---

## 4. Módulo Insumos (`/api/ingredients`)

### `GET /api/ingredients`
Lista paginada de insumos de la cuenta.
- **Query Params:** `page` (default 1), `limit` (default 20, max 100), `sortBy` (`name`, `currentCost`, `updatedAt`), `order` (`asc`, `desc`), `search` (opcional, hasta 100 caracteres; búsqueda parcial insensible a mayúsculas y tildes).
- **Sanitización RBAC:** Para `COLLABORATOR`, se purga `currentCost` y la lista de `suppliers`. `sortBy=currentCost` se fuerza a `name`.
- **Respuesta 200:**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "name": "Harina de trigo 000 Olavarriense",
        "unit": "kg",
        "currentCost": "736.25",
        "updatedAt": "2026-10-14T12:00:00.000Z",
        "suppliers": []
      }
    ],
    "meta": { "total": 20, "page": 1, "limit": 20, "totalPages": 1 }
  }
  ```

### `GET /api/ingredients/:id`
Detalle de insumo con sus presentaciones comerciales asociadas.
- **Respuesta 200 (ADMIN):**
  ```json
  {
    "ingredient": {
      "id": "uuid",
      "accountId": "uuid",
      "name": "Harina de trigo 000 Olavarriense",
      "unit": "kg",
      "currentCost": "736.25",
      "suppliers": [
        {
          "id": "uuid",
          "supplierId": "uuid",
          "packageSize": "25.000",
          "packagePrice": "18406.25",
          "packageUnit": "kg",
          "isDefault": true,
          "supplier": { "id": "uuid", "name": "Distribuidora MarJuanC Alimentos" }
        }
      ]
    }
  }
  ```

### `GET /api/ingredients/:id/history`
Auditoría cronológica inmutable de variaciones de costos.
- **Roles:** Solo `ADMIN` (`403` a colaboradores).
- **Respuesta 200:**
  ```json
  {
    "history": [
      {
        "id": "uuid",
        "ingredientId": "uuid",
        "oldCost": "700.00",
        "newCost": "736.25",
        "changedAt": "2026-10-14T12:00:00.000Z"
      }
    ]
  }
  ```

### `POST /api/ingredients`
Alta de nuevo insumo en la despensa.
- **Roles:** Solo `ADMIN`.
- **Body:** `{ "name": "Azúcar común", "unit": "kg", "currentCost": "1140.00" }`
- **Reglas:** `unit` debe ser `kg`, `l` o `u`. `currentCost` > 0 y $\le \$99.999.999,99$. Formato numérico argentino soportado (`1.140,00`).
- **Respuesta 201 Created** | `409 Conflict` si ya existe un insumo con ese nombre en la cuenta (case-insensitive).

### `POST /api/ingredients/bulk`
Carga masiva de insumos por planilla en una única transacción.
- **Roles:** Solo `ADMIN`.
- **Body:** Array de objetos `[{ "name": "Harina 000", "unit": "kg", "cost": "736,25" }]` (máx. 500 filas).
- **Respuesta 200:**
  ```json
  {
    "created": 18,
    "skipped": 1,
    "errors": [
      { "row": 21, "reason": "El costo no es un número válido. Escribilo como 1.234,56." }
    ]
  }
  ```

### `PUT /api/ingredients/:id`
Actualización de costo o datos del insumo con recálculo en cascada y alertas.
- **Roles:** Solo `ADMIN`.
- **Body:** `{ "name": "Harina 000", "unit": "kg", "currentCost": "9500.00" }`
- **Guarda Zero-Variation:** Si `currentCost` no varía, retorna inmediatamente con `affectedProductsCount: 0`.
- **Respuesta 200:**
  ```json
  {
    "ingredient": { "id": "uuid", "currentCost": "9500.00" },
    "affectedProductsCount": 2,
    "affectedProducts": [
      { "productId": "uuid", "productName": "Pan flauta — 1 kg", "newCost": "9510.00", "currentMarginPercent": "-119.52" }
    ],
    "criticalProducts": [
      { "productId": "uuid", "productName": "Pan flauta — 1 kg", "currentMarginPercent": "-119.52", "minMarginPercent": "55.00" }
    ]
  }
  ```

### `DELETE /api/ingredients/:id`
Baja de insumo con protección referencial de recetas.
- **Roles:** Solo `ADMIN`.
- **Regla:** Si el insumo forma parte de recetas activas, responde `409 Conflict`:
  ```json
  {
    "error": "No se puede eliminar el insumo porque forma parte de una o más recetas activas.",
    "productsAffected": [{ "id": "uuid", "name": "Medialunas de manteca" }]
  }
  ```
- **Respuesta 200:** `{ "message": "Insumo eliminado correctamente." }`

---

## 5. Módulo Productos y Fichas Técnicas (`/api/products`)

### `GET /api/products`
Catálogo general paginado de productos terminados.
- **Query Params:** `page` (default 1), `limit` (default 20, max 100), `sortBy` (`name`, `salePrice`, `cost`, `marginPercent`, `updatedAt`; para `COLLABORATOR` solo `name`, `salePrice` o `updatedAt`), `order` (`asc`, `desc`), `search` (opcional, hasta 100 caracteres; búsqueda parcial insensible a mayúsculas y tildes).
- **Sanitización RBAC:** Si el usuario es `COLLABORATOR`, se purgan recursivamente `cost`, `marginAmount`, `marginPercent`, `minMarginPercent` y `quantity` de la receta. Solo se retorna el nombre y `salePrice`.
- **Respuesta 200 (ADMIN):**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "name": "Medialunas de manteca — docena",
        "salePrice": "13500.00",
        "cost": "3616.25",
        "marginAmount": "9883.75",
        "marginPercent": "73.21",
        "minMarginPercent": "65.00",
        "ingredients": [{ "ingredientId": "uuid", "quantity": "0.500" }]
      }
    ],
    "meta": { "total": 10, "page": 1, "limit": 20, "totalPages": 1 }
  }
  ```

### `POST /api/products`
Creación de ficha técnica de producto.
- **Roles:** Solo `ADMIN`.
- **Body:**
  ```json
  {
    "name": "Pan de Campo",
    "salePrice": "4500.00",
    "minMarginPercent": "50.00",
    "ingredients": [
      { "ingredientId": "uuid", "quantity": "0.700" }
    ]
  }
  ```
- **Reglas:**
  - `salePrice` = 0 solo se permite si `ingredients: []` (modo borrador). Si tiene receta, `salePrice` debe ser estrictamente > 0 (`400 Bad Request`).
  - `quantity` admite hasta 3 decimales y un máximo de `9999999.999`.
  - No se permiten insumos repetidos en la receta (`400`).
  - Nombre único por cuenta case-insensitive (`409`).
- **Respuesta 201 Created.**

### `GET /api/products/:id`
Detalle completo de la ficha técnica.
- **Sanitización RBAC:** Colaboradores acceden a la vista pero la respuesta no contiene `cost`, `marginAmount`, `marginPercent` ni las cantidades numéricas de los ingredientes.
- **Respuesta 200.**

### `PUT /api/products/:id`
Actualización de datos comerciales o líneas de receta.
- **Roles:** Solo `ADMIN`.
- **Respuesta 200.**

### `DELETE /api/products/:id`
Elimina el producto y sus líneas de receta asociadas.
- **Roles:** Solo `ADMIN`.
- **Respuesta 200:** `{ "success": true }`.

---

## 6. Módulo Proveedores y Empaques (`/api/suppliers`)

Todas las rutas de este módulo son exclusivas para `ADMIN` (responden `403` a colaboradores).

### `GET /api/suppliers`
Lista de distribuidores con contadores de presentaciones y precios en cuarentena.
- **Respuesta 200:**
  ```json
  {
    "suppliers": [
      {
        "id": "uuid",
        "name": "Distribuidora MarJuanC Alimentos",
        "contactPhone": "+54 11 3758-0195",
        "email": null,
        "address": "Grito de Asencio 3632",
        "isActive": true,
        "ingredientCount": 7,
        "quarantineCount": 0
      }
    ]
  }
  ```

### `POST /api/suppliers`
Alta de proveedor mayorista.
- **Body:** `{ "name": "Molino Olavarriense", "contactPhone": "+54 2284 415566", "email": "ventas@molino.test", "address": null, "isActive": true }`
- **Respuesta 201 Created** | `409 Conflict` si el nombre ya existe en la cuenta.

### `GET /api/suppliers/:id`
Ficha técnica del proveedor con sus presentaciones e insumos mapeados. Soporta paginación opcional de presentaciones.
- **Query Params (opcionales):** `page` (default 1), `limit` (default 20, max 100), `search` (opcional, filtra presentaciones por coincidencia parcial en nombre de insumo, código SKU o descripción de lista mayorista).
- **Compatibilidad retroactiva:** Si no se envían parámetros de paginación (`page`, `limit`, `search`), devuelve el objeto del proveedor con la totalidad de sus presentaciones sin el bloque `meta`.
- **Respuesta 200 (Con paginación):**
  ```json
  {
    "supplier": {
      "id": "uuid",
      "accountId": "uuid",
      "name": "Distribuidora MarJuanC Alimentos",
      "contactPhone": "+54 11 3758-0195",
      "email": null,
      "address": "Grito de Asencio 3632",
      "isActive": true,
      "ingredients": [
        {
          "id": "uuid",
          "supplierId": "uuid",
          "ingredientId": "uuid",
          "supplierCode": "HAR188",
          "rawDescription": "HARINA SARITA 000 X 25 KG",
          "packageSize": "25.000",
          "packagePrice": "18406.25",
          "packageUnit": "kg",
          "isDefault": true,
          "isQuarantined": false,
          "ingredient": {
            "id": "uuid",
            "name": "Harina de trigo 000 Olavarriense",
            "unit": "kg",
            "currentCost": "736.25"
          }
        }
      ]
    },
    "meta": {
      "total": 67,
      "page": 1,
      "limit": 20,
      "totalPages": 4
    }
  }
  ```

### `PUT /api/suppliers/:id`
Actualización de datos de contacto o estado activo/inactivo.
- **Respuesta 200.**

### `DELETE /api/suppliers/:id`
Baja del proveedor. Sus presentaciones se eliminan en cascada; los insumos conservan su costo actual.
- **Respuesta 200:** `{ "message": "Proveedor eliminado correctamente." }`.

### `POST /api/suppliers/:id/ingredients`
Asocia o actualiza (Upsert) una presentación comercial cerrada para un insumo.
- **Body:**
  ```json
  {
    "ingredientId": "uuid",
    "packageSize": "25.000",
    "packageUnit": "kg",
    "packagePrice": "18406.25",
    "isDefault": true,
    "supplierCode": "HAR188",
    "rawDescription": "HARINA 000 X 25 KG"
  }
  ```
- **Reglas:**
  - `packageUnit` debe coincidir con `Ingredient.unit` (`400`).
  - `supplierCode` único por proveedor (`409 Conflict` si otro insumo del mismo proveedor ya lo tiene).
  - Si `isDefault: true`, recalcula el costo unitario ($18406,25 / 25 = 736,25$), desmarca a los demás proveedores de ese insumo, actualiza `Ingredient.currentCost` y dispara el recálculo en cascada de los productos.
- **Respuesta 200 (actualizado) / 201 (creado):**
  ```json
  {
    "supplierIngredient": { "id": "uuid", "supplierCode": "HAR188", "isDefault": true },
    "unitCost": "736.25",
    "ingredient": { "id": "uuid", "currentCost": "736.25" },
    "ingestEnabled": true
  }
  ```

### `DELETE /api/suppliers/:id/ingredients/:ingredientId`
Elimina la presentación comercial de un insumo.
- **Protección de Referencia (409):** Si es la presentación predeterminada y el insumo cuenta con otras presentaciones alternativas, la API rechaza el borrado:
  ```json
  {
    "error": "No puedes eliminar la presentación predeterminada mientras existan otras. Selecciona otra como predeterminada primero."
  }
  ```
- **Respuesta 200:** `{ "message": "Presentación eliminada correctamente." }`.

---

## 7. Módulo Bandeja de Cuarentena (`/api/suppliers/quarantine`)

### `GET /api/suppliers/quarantine`
Lista los precios retenidos por el filtro anti-pollution en la cuenta del administrador.
- **Respuesta 200:**
  ```json
  {
    "quarantined": [
      {
        "id": "uuid",
        "packageSize": "25.000",
        "currentPrice": "18406.25",
        "proposedPrice": "50000.00",
        "variationPercent": "171.64",
        "quarantineReason": "VARIACION_MAYOR_50_POR_CIENTO",
        "isDefault": true,
        "ingredient": { "id": "uuid", "name": "Harina 000", "currentCost": "736.25" },
        "supplier": { "id": "uuid", "name": "Distribuidora MarJuanC" }
      }
    ]
  }
  ```

### `POST /api/suppliers/quarantine/:id/release`
Aprueba el precio retenido y consolida el cambio.
- **Efecto:** `packagePrice = pendingPackagePrice`, limpia la cuarentena y, si `isDefault = true`, actualiza `Ingredient.currentCost` y dispara recálculo en cascada y alertas de margen.
- **Respuesta 200:**
  ```json
  {
    "supplierIngredient": { "id": "uuid", "packagePrice": "50000.00", "isQuarantined": false },
    "unitCost": "2000.00",
    "affectedProductsCount": 2,
    "criticalProducts": []
  }
  ```

### `POST /api/suppliers/quarantine/:id/reject`
Descarta el precio propuesto por anomalía.
- **Efecto:** Pone `pendingPackagePrice = null` y limpia la cuarentena. El insumo conserva intacto su costo anterior.
- **Respuesta 200:**
  ```json
  {
    "supplierIngredient": { "id": "uuid", "isQuarantined": false },
    "message": "Precio anómalo rechazado y mantenido en el costo anterior."
  }
  ```

---

## 8. Módulo Métricas del Dashboard (`/api/dashboard`)

### `GET /api/dashboard/metrics`
Métricas consolidadas de rentabilidad y riesgo para el panel principal.
- **Roles:** Solo `ADMIN` (`403 Forbidden` a colaboradores).
- **Reglas:** Excluye productos en borrador ("Sin Receta") del cálculo de márgenes y productos en riesgo.
- **Respuesta 200:**
  ```json
  {
    "activeIngredientsCount": 10,
    "criticalProductsCount": 2,
    "healthyProductsCount": 8,
    "averageMarginPercent": 60.6,
    "recentCostVariationsCount": 1
  }
  ```

---

## 9. Módulo Ingesta Desatendida Satélite (`/api/webhooks`)

### `POST /api/webhooks/supplier-prices`
Endpoint de recepción en lote para el orquestador satélite n8n.
- **Autenticación:** Requiere cabecera `x-margenx-webhook-secret` evaluada con `crypto.timingSafeEqual` (`401` si falta o no coincide).
- **Parser de Cuerpo:** Límite dedicado de `5 MB`.
- **Body:**
  ```json
  {
    "accountSlug": "panaderia-central",
    "items": [
      { "code": "HAR188", "description": "Harina Sarita", "price": 18406.25 },
      { "code": "SKU-AJENO", "price": 999.00 }
    ]
  }
  ```
- **Lógica de Procesamiento:**
  1. Deduplica ítems por código dentro del lote.
  2. Búsqueda implícita de `supplierCode` en `SupplierIngredient` de la cuenta.
  3. Descarte estricto (Anti-Pollution): Códigos no vinculados se descartan con motivo `NOT_FOUND`; proveedores inactivos con `INACTIVE_SUPPLIER`; códigos duplicados entre múltiples proveedores con `AMBIGUOUS`.
  4. Retención en Cuarentena si $|\Delta\%| > 50\%$ o costo unitario $\le \$0.01$.
  5. Actualiza precios válidos y ejecuta recálculo en cascada para presentaciones con `isDefault = true`.
- **Respuesta 200:**
  ```json
  {
    "received": 2,
    "updated": 1,
    "unchanged": 0,
    "quarantined": 0,
    "duplicates": 0,
    "discarded": 1,
    "discardedCodes": [{ "code": "SKU-AJENO", "reason": "NOT_FOUND" }],
    "account": { "tradeName": "Panadería Central", "ownerEmail": "admin@panaderia.example" },
    "criticalProductsAlerts": []
  }
  ```
