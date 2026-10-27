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
- `400`: JSON inválido o payload de negocio inválido.
- `401`: secreto del webhook inválido o ausente.
- `404`: recurso inexistente o cuenta inactiva.
- `413`: cuerpo demasiado grande.
- `500`: error interno no controlado.
