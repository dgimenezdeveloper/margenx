# API REST — Contratos, Límites, Seguridad y Códigos HTTP

Esta guía narrativa constituye el contrato histórico de referencia para el Frontend, las automatizaciones de n8n y las suites automatizadas de Postman/Newman (`backend/tests/postman/`). Desde esta entrega, `backend/openapi/openapi.yaml` es la referencia OpenAPI 3.1 para esquemas y operaciones. Explorá la documentación interactiva Swagger UI en [`/api/docs`](https://api-dev.margenx.tech/api/docs) y obtené el contrato JSON en [`/api/docs/openapi.json`](https://api-dev.margenx.tech/api/docs/openapi.json). Las rutas de la aplicación requieren autenticación mediante cabecera `Authorization: Bearer <JWT>` emitido por Clerk; los endpoints satélite usan autenticación por secreto criptográfico.

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
- `422 Unprocessable Entity`: Violación de regla de negocio (ej. quitar la presentación predeterminada sin elegir otra).
- `500 Internal Server Error`: Excepción no controlada en servidor.
- `502 Bad Gateway`: Falló un servicio externo del que depende la operación (hoy, la Backend API de Clerk al invitar, revocar o dar de baja). La operación no se aplicó y se puede reintentar.
- `503 Service Unavailable`: Un servicio satélite necesario para completar la solicitud (como el generador de PDF en n8n) no respondió o está deshabilitado.

---

## 3. Módulo Autenticación y Cuenta (`/api/auth`)

### `GET /api/auth/me`
Retorna el perfil del usuario autenticado y su cuenta asociada.
- **Roles:** `ADMIN` o `COLLABORATOR`.
- **Sanitización RBAC:** Si el usuario es `COLLABORATOR`, el objeto `account` omite `slug` y `defaultMinMarginPercent`.
- **Módulos de la cuenta (ADR-010):** `user.features` trae un booleano por módulo (hoy, solo `sales`). Lo reciben los dos roles: el colaborador usa el módulo de ventas aunque no vea costos. Primero manda la excepción de la cuenta (`AccountFeature`) y después el plan; hoy ningún plan trae módulos. Ver §12.
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
      },
      "features": { "sales": false }
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

### Equipo de la cuenta: invitaciones y colaboradores

El ADMIN invita a su personal por mail y lo da de baja (ADR-008). Todas estas rutas son **solo `ADMIN`** (`403` a colaboradores con `"Acceso denegado. Se requiere rol ADMIN."`) y operan siempre sobre la cuenta de `req.user`: el cliente nunca manda la cuenta ni el rol. Si la Backend API de Clerk falla, responden `502` con `"No pudimos comunicarnos con el servicio de cuentas. Probá de nuevo en unos minutos."` y no aplican cambios.

**Primer inicio de sesión del invitado.** Al aceptar la invitación, Clerk copia sus metadatos (`{ accountId, role: "COLLABORATOR" }`) a `publicMetadata` del usuario. Cuando ese usuario llama a la API por primera vez y todavía no tiene fila en `User`, `authMiddleware` lee los metadatos con la clave secreta y crea el `User` con esa cuenta y ese rol. Responde `401` sin crear nada si no hay metadatos, si el rol no es `COLLABORATOR`, si la cuenta no existe o está inactiva, o si el correo ya pertenece a otro usuario.

#### `POST /api/auth/invitations`
Crea una invitación en Clerk **sin el mail de Clerk** (`notify: false`) y despacha el mail de MargenX a n8n (`N8N_INVITATION_WEBHOOK_URL`, workflow `infra/n8n/workflows/invitacion-colaborador.json`): en español, con la marca de MargenX, enviado por Brevo desde `alertas@margenx.tech`. El enlace de aceptación lleva a `<APP_BASE_URL>/login`, que con el ticket muestra el alta; si `APP_BASE_URL` no está definida, Clerk usa su portal. La invitación vence a los 30 días (valor por defecto de Clerk).

Si el mail no sale (n8n no responde 2xx, no hay `N8N_INVITATION_WEBHOOK_URL`, como en local, o falta `INTERNAL_WEBHOOK_SECRET`), la invitación **igual queda creada** y la respuesta trae `emailSent: false`: el ADMIN copia el enlace (`url`) y lo manda por otro medio. `url` es el enlace de aceptación; lo recibe solo el ADMIN de la cuenta y el backend no lo registra en los logs.
- **Body:** `{ "email": "cajera.quimica@seed.example.test" }`. Solo se acepta `email` (se recorta y se pasa a minúsculas, hasta 254 caracteres); cualquier otro campo, como `accountId` o `role`, da `400`.
- **Respuesta 201:**
  ```json
  {
    "invitation": {
      "id": "inv_2abc",
      "email": "cajera.quimica@seed.example.test",
      "createdAt": "2026-11-16T12:00:00.000Z",
      "url": "https://<instancia>.clerk.accounts.dev/v1/tickets/accept?ticket=<ticket>"
    },
    "emailSent": true
  }
  ```
  `url` es `null` si Clerk no devolvió el enlace; en ese caso no se intenta mandar el mail.
- **Errores:** `400` `"Ingresá un correo electrónico válido."` (también si Clerk rechaza el formato del correo) · `409` `"Ese correo ya tiene un usuario en MargenX."` · `409` `"Ya hay una invitación pendiente para ese correo."` · `409` `"Ese correo ya tiene una cuenta o una invitación pendiente."` (lo informa Clerk) · `502`.

#### `GET /api/auth/invitations`
Invitaciones pendientes de la cuenta, de la más nueva a la más vieja.
- **Respuesta 200:** `{ "invitations": [ { "id": "inv_2abc", "email": "cajera.quimica@seed.example.test", "createdAt": "2026-11-16T12:00:00.000Z", "url": "https://<instancia>.clerk.accounts.dev/v1/tickets/accept?ticket=<ticket>" } ] }` (`url` puede ser `null`).
- **Errores:** `502`.

#### `DELETE /api/auth/invitations/:id`
Revoca una invitación pendiente: el enlace del mail deja de funcionar.
- **Respuesta 200:** `{ "message": "Invitación revocada correctamente." }`
- **Errores:** `404` `"La invitación no existe o ya no está pendiente."` (también si es de otra cuenta) · `502`.

#### `GET /api/auth/users`
Usuarios activos de la cuenta, primero los administradores y después por fecha de alta. No expone `authProviderId`.
- **Respuesta 200:**
  ```json
  {
    "users": [
      { "id": "uuid", "email": "admin@comercio.example", "role": "ADMIN", "createdAt": "2026-08-30T10:00:00.000Z" },
      { "id": "uuid", "email": "colab.quimica@seed.example.test", "role": "COLLABORATOR", "createdAt": "2026-10-02T10:00:00.000Z" }
    ]
  }
  ```

#### `DELETE /api/auth/users/:id`
Da de baja a un colaborador: borra su usuario en Clerk (cierra sus sesiones e impide que vuelva a entrar con la invitación) y después su fila en `User`. Si el usuario ya no existía en Clerk, completa la baja en la base.
- **Respuesta 200:** `{ "message": "Colaborador dado de baja correctamente." }`
- **Errores:** `404` `"El usuario no existe."` (también si es de otra cuenta) · `422` `"No podés darte de baja a vos mismo."` · `422` `"Solo se pueden dar de baja colaboradores."` · `502` (no borra la fila: se puede reintentar).

Colección de Postman: `backend/tests/postman/MargenX - Colaboradores API.postman_collection.json` (`README-Colaboradores.md`).

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

### `GET /api/ingredients/:id/products`
Lista paginada de productos cuya receta incluye al insumo indicado, con la cantidad utilizada y su estado de margen.
- **Roles:** Solo `ADMIN` (`403 Forbidden` a colaboradores; `404 Not Found` si el insumo no existe o pertenece a otra cuenta).
- **Query Params:** `page` (default 1), `limit` (default 20, max 100), `sortBy` (`name`, `quantity`, `salePrice`, `cost`, `marginPercent`; default `name`), `order` (`asc`, `desc`; default `asc`), `search` (opcional, hasta 100 caracteres; búsqueda parcial insensible a mayúsculas y tildes sobre el nombre del producto).
- **Respuesta 200:**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "name": "Pan flauta — 1 kg",
        "quantity": "1.000",
        "salePrice": "4332.14",
        "cost": "749.30",
        "marginAmount": "3582.84",
        "marginPercent": "82.70",
        "minMarginPercent": "55.00",
        "marginStatus": "surplus",
        "updatedAt": "2026-10-14T12:00:00.000Z"
      }
    ],
    "meta": { "total": 4, "page": 1, "limit": 20, "totalPages": 1 }
  }
  ```
  - `marginStatus` adopta los mismos estados que el tablero (`loss`, `risk`, `target`, `surplus`).

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
- **Reglas:**
  - **Unidad fija con uso (`409 Conflict`):** Si cambia `unit` y el insumo tiene al menos una receta (`ProductIngredient`) o presentación de proveedor (`SupplierIngredient`), responde `409 Conflict` sin modificar datos ni historial: `"No se puede cambiar la unidad: el insumo está en N receta(s) y M presentación(es) de proveedor. Sacalo de las recetas y de los proveedores, o creá un insumo nuevo con la otra unidad."`. Si no tiene recetas ni presentaciones, permite cambiar la unidad. Nombre y costo siguen siendo editables cuando la unidad no cambia.
  - **Nombre único (`409 Conflict`):** Si el nuevo nombre ya existe en la cuenta (case-insensitive).
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
    "error": "No podés eliminar la presentación predeterminada mientras haya otras. Elegí otra como predeterminada primero."
  }
  ```
- **Respuesta 200:** `{ "message": "Presentación eliminada correctamente." }`.

---

## 7. Módulo Bandeja de Cuarentena (`/api/suppliers/quarantine`)

### `GET /api/suppliers/quarantine`
Lista los precios retenidos por el filtro anti-pollution en la cuenta del administrador.
- **Tipos:** los importes (`packageSize`, `packagePrice`, `currentPrice`, `proposedPrice`, `variationPercent` e `ingredient.currentCost`) llegan como texto decimal, porque Prisma serializa así los `Decimal`. `variationPercent` es el valor absoluto de la variación: el sentido (aumento o caída) se obtiene comparando `currentPrice` con `proposedPrice`. El frontend los convierte a número en `supplierService`.
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
Métricas consolidadas de rentabilidad, riesgo y distribución completa del catálogo para el panel principal, calculadas sobre toda la base de la cuenta autenticada.
- **Roles:** Solo `ADMIN` (`403 Forbidden` a colaboradores).
- **Reglas:**
  - Los cinco buckets suman el total de productos de la cuenta (`lossCount + riskCount + targetCount + surplusCount + draftCount`):
    - `draftCount`: productos sin receta (`0` ingredientes).
    - `lossCount`: productos con receta y `marginPercent < 0`.
    - `riskCount`: productos con receta y `0 <= marginPercent < minMarginPercent` (evaluado contra el `minMarginPercent` propio de cada producto).
    - `targetCount`: productos con receta y `minMarginPercent <= marginPercent <= 60`.
    - `surplusCount`: productos con receta y `marginPercent >= minMarginPercent` con `marginPercent > 60`.
  - `criticalProductsCount = lossCount + riskCount` y `healthyProductsCount = targetCount + surplusCount`.
  - `averageMarginPercent`: **mediana** de `marginPercent` de los productos con receta (excluye borradores), redondeada a 2 decimales con `ROUND_HALF_UP` (robusta frente a precios extremos mal cargados).
- **Respuesta 200:**
  ```json
  {
    "activeIngredientsCount": 10,
    "criticalProductsCount": 2,
    "healthyProductsCount": 8,
    "averageMarginPercent": 58.25,
    "recentCostVariationsCount": 1,
    "lossCount": 0,
    "riskCount": 2,
    "targetCount": 4,
    "surplusCount": 4,
    "draftCount": 0
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

---

## 10. Módulo Compras Sugeridas — Smart Purchasing (`/api/purchasing`)

Todas las rutas de este módulo son exclusivas para `ADMIN` (responden `403 Forbidden` a colaboradores), están acotadas por `accountId` y son de **solo lectura**: las sugerencias no modifican `Ingredient.currentCost` (ADR-005).

### `GET /api/purchasing/suggestions`
Compara las presentaciones activas y no en cuarentena de cada insumo contra su presentación predeterminada, calculando el ahorro por unidad (`$` y `%`) y por bulto mediante `calculateUnitCost` (`Prisma.Decimal`, `ROUND_HALF_UP`).
- **Exclusiones:** las presentaciones de proveedores inactivos no participan; las presentaciones en cuarentena no compiten como más baratas y se informan aparte en `quarantinedExcluded`.
- **Decisión de alcance:** MargenX no registra stock ni consumo, por lo que el ahorro se informa por unidad y por bulto (nunca como ahorro mensual).
- **Respuesta 200:**
  ```json
  {
    "summary": {
      "withSavingsCount": 1,
      "alreadyBestPriceCount": 2,
      "singleSupplierCount": 7,
      "withoutEligibleSupplierCount": 0,
      "withoutActiveDefaultCount": 0,
      "quarantinedExcludedCount": 0
    },
    "byIngredient": [
      {
        "ingredientId": "uuid",
        "ingredientName": "Harina 000",
        "unit": "kg",
        "currentCost": "900.00",
        "defaultPresentation": {
          "supplierIngredientId": "uuid",
          "supplierId": "uuid",
          "supplierName": "Molino Cañuelas",
          "supplierCode": "MC-990",
          "rawDescription": null,
          "packageSize": "50",
          "packageUnit": "kg",
          "packagePrice": "45000.00",
          "unitCost": "900.00"
        },
        "cheapestPresentation": {
          "supplierIngredientId": "uuid",
          "supplierId": "uuid",
          "supplierName": "Distribuidora del Centro",
          "supplierCode": "5521",
          "rawDescription": null,
          "packageSize": "25",
          "packageUnit": "kg",
          "packagePrice": "22000.00",
          "unitCost": "880.00"
        },
        "savingsPerUnit": "20.00",
        "savingsPercent": "2.22",
        "packageSavings": "500.00"
      }
    ],
    "bySupplier": [
      {
        "supplierId": "uuid",
        "supplierName": "Distribuidora del Centro",
        "contactPhone": null,
        "email": null,
        "address": null,
        "itemsCount": 1,
        "totalPackageSavings": "500.00",
        "items": []
      }
    ],
    "alreadyBestPrice": [],
    "singleSupplier": [],
    "quarantinedExcluded": []
  }
  ```

### `POST /api/purchasing/order-preview`
Calcula el pedido agrupado por proveedor con subtotales, total y ahorro respecto a comprar todo a la presentación predeterminada. No persiste nada en base de datos.
- **Body:**
  ```json
  {
    "items": [
      { "supplierIngredientId": "uuid", "packages": 2 }
    ]
  }
  ```
- **Reglas de validación:** `items` entre 1 y 500 elementos, sin repetir `supplierIngredientId` (400 Bad Request). `packages` entero entre `1` y `100.000` (400 Bad Request).
- **Cálculo de ahorro (`savings` / `totalSavings`):** representa el ahorro neto respecto a comprar la misma cantidad total a la presentación predeterminada activa de cada insumo (`baseline - subtotal`). Si se selecciona una presentación más cara que la predeterminada, el valor será negativo (sobrecosto); si el insumo no tiene presentación predeterminada activa, `defaultUnitCost` es `null` y el ahorro de esa línea es `"0.00"`.
- **Errores de dominio:** si alguna presentación no existe o pertenece a otra cuenta → `404 Not Found`; si el proveedor está inactivo o la presentación está en cuarentena → `422 Unprocessable Entity`.
- **Respuesta 200:**
  ```json
  {
    "groups": [
      {
        "supplierId": "uuid",
        "supplierName": "Distribuidora del Centro",
        "contactPhone": null,
        "email": null,
        "address": null,
        "subtotal": "44000.00",
        "savings": "1000.00",
        "items": [
          {
            "supplierIngredientId": "uuid",
            "ingredientId": "uuid",
            "ingredientName": "Harina 000",
            "unit": "kg",
            "supplierCode": "5521",
            "rawDescription": null,
            "packageSize": "25",
            "packageUnit": "kg",
            "packagePrice": "22000.00",
            "unitCost": "880.00",
            "packages": 2,
            "totalQuantity": "50",
            "subtotal": "44000.00",
            "defaultUnitCost": "900.00",
            "savings": "1000.00"
          }
        ]
      }
    ],
    "total": "44000.00",
    "totalSavings": "1000.00",
    "totalPackages": 2,
    "itemsCount": 1
  }
  ```

---

## 11. Módulo Reportes Semanales (`/api/reports` y `/api/internal/reports`)

### Rutas internas para n8n

Estas rutas requieren la cabecera `x-margenx-webhook-secret`, comparada en tiempo constante. Si falta la cabecera o `INTERNAL_WEBHOOK_SECRET` no está configurado, responden `401 Unauthorized`. Nginx bloquea `/api/internal/` desde el exterior con `403`; n8n las consume por la red interna de Docker.

- `GET /api/internal/reports/accounts`: lista las cuentas activas con `id`, `slug`, `businessName` y el correo del ADMIN más antiguo (`ownerEmail`, o `null`).
- `GET /api/internal/reports/weekly/:slug`: devuelve el reporte semanal calculado para una cuenta activa. Acepta `from` y `to` opcionales como fechas ISO; si no se indican, usa los últimos siete días. Un slug inexistente o inactivo responde `404`.

### Rutas de la aplicación

Ambas rutas requieren JWT de Clerk y rol `ADMIN`; `COLLABORATOR` recibe `403 Forbidden`. El reporte se limita a la cuenta del usuario autenticado. `from` y `to` son parámetros opcionales de fecha ISO.

- `GET /api/reports/weekly`: devuelve el reporte como JSON.
- `GET /api/reports/weekly.pdf`: envía el mismo reporte al webhook `N8N_REPORT_PDF_WEBHOOK_URL` con un timeout de 20 segundos y devuelve el PDF con `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="margenx-reporte-AAAA-MM-DD.pdf"`. La fecha del nombre corresponde al día en `America/Argentina/Buenos_Aires`. También envía `Cache-Control: private, no-store` y `Access-Control-Expose-Headers: Content-Disposition`: la app y la API se publican en orígenes distintos, y sin esa cabecera el navegador no deja que la app lea el nombre del archivo. Si n8n no está configurado, falla, expira o devuelve un PDF vacío, responde `503` con un mensaje genérico, sin detalles internos.

El reporte incluye la salud completa del catálogo (con los mismos buckets y mediana que `/api/dashboard/metrics`), hasta 20 productos bajo el mínimo, 10 cambios de costo, 5 presentaciones en cuarentena más antiguas, 5 oportunidades de ahorro de compras y hasta 20 costos desactualizados. **Ventas de la semana:** si la cuenta tiene el módulo de ventas (ADR-010), el reporte suma `sales` con la ganancia real del mismo período (`salesCount`, `salesTotal`, `costTotal`, `profit`, `marginPercent` y los rankings `topSold` y `topProfit`, con la forma de `GET /api/sales/summary` de §12). Sin el módulo, el campo no viene y el PDF no tiene la sección. `staleCosts` considera desactualizado un insumo cuyo último `PriceHistory.changedAt` hasta la fecha `to` (o, si nunca cambió de costo, `Ingredient.updatedAt`, lo que refleja también ediciones de nombre o unidad) supera los 30 días al cierre del período.

## 12. Módulo de Ventas y Caja (`/api/sales` y `/api/cash-shifts`)

Módulo opcional por cuenta (ADR-010, `docs/especificacion-funcional.md` §13). Todas las rutas exigen `Authorization: Bearer <JWT de Clerk>` y el módulo prendido para la cuenta del usuario autenticado.

- **Módulo apagado:** cualquier ruta de `/api/sales` o `/api/cash-shifts` responde `404 Not Found` con `{ "error": "Recurso no encontrado." }`, para los dos roles, como si no existiera. La cuenta sale de `req.user`, nunca del cliente.
- **Sin sesión:** `401 Unauthorized`, antes de consultar el módulo.
- **Cómo saber si está prendido:** `GET /api/auth/me` → `user.features.sales` (§3).
- **Turnos y cierre de caja (`/api/cash-shifts`):** más abajo, en esta misma sección. ADMIN y COLLABORATOR abren y cierran el turno.
- **Montos:** todos los importes van como texto con dos decimales (`"3300.00"`), calculados con `Prisma.Decimal` y `ROUND_HALF_UP`. Las fechas, en ISO 8601 (UTC).
- **Colaborador:** vende, ve sus ventas y su ticket, pero **nunca** recibe `unitCost`, `lineCost`, `marginPercent` ni `totalCost`. La respuesta se arma por rol en el servicio de ventas (no con `sanitizeFinancialData`, que también quitaría la `quantity` de cada renglón). Todas las respuestas llevan `Cache-Control: private, no-store`.

### `POST /api/sales` — Registrar una venta (ADMIN y COLLABORATOR)

- **Body:**
  ```json
  {
    "paymentMethod": "CASH",
    "items": [
      { "productId": "<uuid>", "quantity": 2 },
      { "productId": "<uuid>", "quantity": 1 }
    ]
  }
  ```
  - `paymentMethod`: `CASH` (efectivo), `TRANSFER` (transferencia) o `MERCADO_PAGO`. Solo se registra: no hay integración de cobro.
  - `items`: de 1 a 50 productos distintos; `quantity` entera de 1 a 999. Un producto repetido suma sus cantidades. Cualquier otro campo (precio, costo, total, `accountId`) se ignora: el precio y el costo salen de la base.
- **Regla:** en **una transacción**: exige un turno de caja abierto en la cuenta, toma el precio de venta y el costo vigentes de cada producto, calcula el margen de cada renglón (misma fórmula que el producto, ADR-004) y asigna el **número de ticket correlativo por cuenta** (el siguiente al mayor; si dos ventas toman el mismo número a la vez, el índice único rechaza una y se reintenta con el siguiente, hasta 3 veces). Precio, costo y margen quedan **congelados** en cada renglón: si mañana cambia un costo, la venta no cambia (ADR-005, ADR-010).
- **Respuesta 201 Created:**
  ```json
  {
    "id": "<uuid>",
    "ticketNumber": 8,
    "businessName": "Panadería Central",
    "soldAt": "2026-11-24T12:30:00.000Z",
    "paymentMethod": "CASH",
    "total": "3300.00",
    "totalCost": "1015.20",
    "status": "COMPLETED",
    "cashShiftId": "<uuid>",
    "voidedAt": null,
    "voidReason": null,
    "items": [
      { "productId": "<uuid>", "productName": "Medialuna de manteca", "quantity": 2, "unitPrice": "900.00", "lineTotal": "1800.00", "unitCost": "301.35", "lineCost": "602.70", "marginPercent": "66.52" }
    ]
  }
  ```
  Para el colaborador, sin `totalCost` y sin `unitCost`, `lineCost` ni `marginPercent` en los renglones.
- **Errores:** `400` (medio de pago, productos o cantidades inválidos) · `404` `"Uno de los productos de la venta no existe."` (también si es de otra cuenta) · `409` `"No hay un turno de caja abierto. Abrí el turno para empezar a cobrar."` · `422` si un producto está en borrador (sin receta) o no tiene precio de venta.

### `GET /api/sales` — Historial de ventas

- **Query:** `page` (por defecto 1), `limit` (por defecto 20, máximo 100), `date` (`AAAA-MM-DD`, día calendario de Argentina: de 00:00 a 24:00 en UTC−3) y `cashShiftId` (uuid del turno). Orden: la más reciente primero.
- **Alcance:** el ADMIN ve las ventas de toda la cuenta; el colaborador, solo las que registró él.
- **Respuesta 200 OK:** `{ "data": [{ "id", "ticketNumber", "soldAt", "paymentMethod", "total", "status", "cashShiftId", "itemsCount" }], "meta": { "total", "page", "limit", "totalPages" } }`. Sin costos para ningún rol.
- **Errores:** `400` `"La fecha tiene que tener el formato AAAA-MM-DD."` · `400` `"El turno indicado no es válido."`

### `GET /api/sales/summary` — Ganancia real (solo ADMIN)

- **Query:** `period` = `day` (hoy), `week` (hoy y los 6 días anteriores, la misma ventana del reporte semanal) o `month` (hoy y los 29 anteriores). Por defecto, `week`. Días calendario de Argentina (UTC−3).
- **Regla:** ventas menos el **costo congelado** de cada renglón, y el **margen ponderado por lo vendido** (ganancia / ventas × 100, sobre la venta como en ADR-004), con `Prisma.Decimal` y `ROUND_HALF_UP`. **Sin las ventas anuladas.** El período anterior tiene el mismo largo y termina donde empieza el actual.
- **Respuesta 200 OK:**
  ```json
  {
    "period": "week",
    "from": "2026-11-18",
    "to": "2026-11-24",
    "salesCount": 41,
    "salesTotal": "100000.00",
    "costTotal": "62000.00",
    "profit": "38000.00",
    "marginPercent": "38.00",
    "previous": { "from": "2026-11-11", "to": "2026-11-17", "salesCount": 35, "salesTotal": "80000.00", "costTotal": "52000.00", "profit": "28000.00", "marginPercent": "35.00" },
    "change": { "salesTotal": "25.00", "profit": "35.71" },
    "topSold": [{ "productId": "<uuid>", "productName": "Pan flauta — 1 kg", "quantity": 80, "salesTotal": "346571.20", "profit": "145571.20", "marginPercent": "42.00" }],
    "topProfit": [{ "productId": "<uuid>", "productName": "Medialunas de manteca — docena (12 unidades)", "quantity": 30, "salesTotal": "405000.00", "profit": "273000.00", "marginPercent": "67.41" }]
  }
  ```
  - `marginPercent`: `null` si no hubo ventas (nunca divide por cero).
  - `change`: variación porcentual de las ventas y de la ganancia contra el período anterior; `null` si el anterior fue 0.
  - `topSold` (por unidades) y `topProfit` (por ganancia): 5 productos cada uno. Un producto dado de baja aparece con `productId: null` y el nombre guardado en la venta.
- **Errores:** `400` `"El período tiene que ser day, week o month."` · `403` para el colaborador.
- **Pruebas:** colección `MargenX - Ventas API`, `backend/src/routes/salesSummaryRoutes.test.ts` y `backend/src/services/salesSummaryService.test.ts`.

### `GET /api/sales/:id` — Detalle y ticket

- Mismo cuerpo que la respuesta de `POST /api/sales`, con los renglones ordenados por nombre. El colaborador solo puede ver sus ventas.
- **Errores:** `404` `"La venta no existe."` (también si es de otra cuenta, de otro colaborador o el id no es válido).

### `POST /api/sales/:id/void` — Anular una venta

- **Body:** `{ "reason": "Cobré dos veces la misma venta" }` (de 3 a 200 caracteres).
- **Regla:** no se borra nada: la venta pasa a `VOIDED` con la fecha, quién la anuló y el motivo, y sigue en el historial. **Solo mientras el turno de la venta siga abierto**, también para el ADMIN: así el arqueo de un turno cerrado no cambia nunca. El ADMIN anula cualquier venta del turno; el colaborador, solo las suyas. La anulación toma el mismo bloqueo compartido que la venta (ver el cierre).
- **Respuesta 200 OK:** la venta anulada, con el mismo cuerpo que el detalle.
- **Errores:** `400` `"Escribí el motivo de la anulación."` · `403` `"Solo se pueden anular ventas del turno abierto. El turno de esta venta ya se cerró y su arqueo no cambia."` (los dos roles) · `404` `"La venta no existe."` (también la venta de otro colaborador) · `409` `"La venta ya está anulada."`
- **Pruebas:** colección `MargenX - Ventas API` (`backend/tests/postman/README-Ventas.md`) y `backend/src/routes/salesRoutes.test.ts`.

### Turnos de caja (`/api/cash-shifts`)

Un solo turno abierto por cuenta (índice parcial único `CashShift_accountId_open_key`). Para vender hace falta un turno abierto. **ADMIN y COLLABORATOR** abren y cierran. El arqueo no tiene costos ni márgenes, así que la respuesta es la misma para los dos roles.

**Resumen del turno** (respuesta de todas las rutas de turnos):

```json
{
  "id": "<uuid>",
  "status": "CLOSED",
  "openedAt": "2026-11-24T10:00:00.000Z",
  "openedBy": "cajera.panaderia@seed.example.test",
  "closedAt": "2026-11-24T18:00:00.000Z",
  "closedBy": "cajera.panaderia@seed.example.test",
  "openingAmount": "10000.00",
  "salesCount": 11,
  "voidedCount": 1,
  "salesTotal": "33400.00",
  "methods": [
    { "paymentMethod": "CASH", "salesTotal": "25000.00", "expected": "35000.00", "counted": "34500.00", "difference": "-500.00" },
    { "paymentMethod": "TRANSFER", "salesTotal": "8400.00", "expected": "8400.00", "counted": "8400.00", "difference": "0.00" },
    { "paymentMethod": "MERCADO_PAGO", "salesTotal": "0.00", "expected": "0.00", "counted": "0.00", "difference": "0.00" }
  ],
  "expectedTotal": "43400.00",
  "countedTotal": "42900.00",
  "difference": "-500.00"
}
```

- `salesCount` y `salesTotal`: solo las ventas completadas. Las anuladas no suman en lo esperado y se cuentan en `voidedCount`.
- **Esperado:** en efectivo, el monto inicial más las ventas en efectivo; en transferencia y Mercado Pago, solo sus ventas.
- **Diferencia:** contado − esperado, por medio de pago y total. Negativa = falta plata; positiva = sobra.
- **Turno abierto:** lo esperado se calcula con las ventas hasta ahora, y `counted`, `difference`, `countedTotal`, `closedAt` y `closedBy` van en `null`.
- **Turno cerrado:** lo esperado y lo contado son los guardados al cierre.
- `openedBy` y `closedBy`: el email del usuario, o `null` si se dio de baja (ADR-008).
- **Montos de entrada** (`openingAmount` y lo contado): número o texto, de 0 a 99.999.999,99, con hasta 2 decimales. Si no, `400` `"Indicá <qué>: un monto de 0 a $99.999.999,99, con hasta 2 decimales."`

#### `POST /api/cash-shifts/open` — Abrir el turno

- **Body:** `{ "openingAmount": 10000 }`.
- **Respuesta 201 Created:** el resumen del turno abierto.
- **Errores:** `400` (monto inválido) · `409` `"Ya hay un turno de caja abierto. Cerralo antes de abrir otro."` (también si dos personas abren a la vez: el índice único deja pasar una).

#### `GET /api/cash-shifts/current` — Turno abierto

- **Respuesta 200 OK:** `{ "shift": <resumen> }`, o `{ "shift": null }` si no hay turno abierto. No responde 404: el 404 queda para el módulo apagado.

#### `POST /api/cash-shifts/:id/close` — Cerrar el turno con el arqueo

- **Body:** lo contado en los **tres** medios de pago (obligatorios): `{ "countedCash": 34500, "countedTransfer": 8400, "countedMercadoPago": 0 }`.
- **Regla:** en **una transacción**:
  1. pasa el turno a `CLOSED`;
  2. suma las ventas del turno;
  3. guarda lo esperado, lo contado y la diferencia total.

  La venta y la anulación toman un bloqueo compartido (`FOR SHARE`) sobre la fila del turno, así que el paso 1 espera a las que están en curso. Una venta que llega durante el cierre espera y responde 409: ninguna venta queda afuera de un arqueo ya calculado.
- **Respuesta 200 OK:** el resumen del turno cerrado.
- **Errores:** `400` (falta lo contado de algún medio o es inválido) · `404` `"El turno no existe."` (también de otra cuenta o, para el colaborador, un turno cerrado en el que no trabajó) · `409` `"El turno ya está cerrado."` (también si otra persona lo cerró a la vez).

#### `GET /api/cash-shifts` — Historial de turnos

- **Query:** `page` (por defecto 1) y `limit` (por defecto 20, máximo 100). Orden: el más reciente primero.
- **Alcance:** el ADMIN ve todos los turnos de la cuenta; el colaborador, el abierto y los que abrió, cerró o en los que vendió.
- **Respuesta 200 OK:** `{ "data": [<resumen>], "meta": { "total", "page", "limit", "totalPages" } }`.

#### `GET /api/cash-shifts/:id` — Resumen del turno

- **Respuesta 200 OK:** el resumen, más `businessName` (el nombre del comercio, para imprimirlo). Mismo alcance que el historial.
- **Errores:** `404` `"El turno no existe."`
- **Pruebas:** colección `MargenX - Ventas API`, `backend/src/routes/cashShiftRoutes.test.ts` y `backend/src/services/cashShiftService.test.ts`.
