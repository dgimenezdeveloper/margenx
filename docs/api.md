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
- `400`: JSON inválido o payload de negocio inválido.
- `401`: secreto del webhook inválido o ausente.
- `404`: recurso inexistente o cuenta inactiva.
- `413`: cuerpo demasiado grande o exceso de filas en carga masiva.
- `500`: error interno no controlado.
