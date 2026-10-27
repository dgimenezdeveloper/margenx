# Runbook de ingesta de listas de precios

## Límite operativo

- El webhook de ingesta acepta hasta `5 MB` de JSON por request.
- El parser general de la API está limitado a `256 KB` para todas las rutas no relacionadas con la ingesta.
- Si la lista supera el límite, la API devuelve `413` con el código `PAYLOAD_TOO_LARGE` y el texto:
  `La lista es demasiado grande. Dividila en varios lotes más pequeños.`

## Recomendación operativa para proveedores

Cuando una lista supera el límite, no se debe reintentar a la misma velocidad ni con la misma estructura. Se recomienda:

1. dividir la lista en lotes más chicos,
2. mandar por separado cada lote,
3. volver a ejecutar la ingesta con el mismo secreto compartido,
4. confirmar en n8n que cada lote fue aceptado antes de continuar con el siguiente.

## Observaciones de infraestructura

- Nginx en la VPS se configura con un límite propio mayor que Express para no heredar el valor global de 20 MB.
- El valor de backend queda en 5 MB para cerrar el contrato de ingesta sin riesgo de que el parser global termine ocultando el problema.
- La validación del cuerpo se hace antes de la lógica de negocio para evitar procesar listas que no pueden ser aceptadas de forma segura.
