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

## "Mandé la lista y no pasó nada"

Si quien envió la lista no recibió ni el resumen (lo recibe el dueño de la cuenta) ni un correo de error en unos 3 minutos, revisar en este orden:

1. **Dirección de destino.** El comercio se identifica **solo por el destinatario (`To:`)**, nunca por el remitente.
   - Producción: `precios-<slug>@margenx.tech` (ej. `precios-panaderia-central@margenx.tech`).
   - Staging: `precios-dev-<slug>@margenx.tech` (ej. `precios-dev-demo-margenx@margenx.tech`). Cualquier otra dirección va a producción, incluida la cuenta Demo.
   - Sin slug reconocible, el remitente recibe un correo de error que explica el formato.

2. **Adjunto.**
   - Formatos admitidos: `.xlsx`, `.xls` o `.csv`, como **adjunto** (un enlace a Google Drive no sirve).
   - Si la API responde `413 PAYLOAD_TOO_LARGE` (más de 5 MB por lote), el remitente recibe un correo que le pide dividir la lista en varios archivos.

3. **"0 actualizados".** Si el resumen llegó con todo descartado, los códigos de artículo de la lista no están cargados en las presentaciones del proveedor. La lista nunca crea insumos.

4. **n8n en la VPS.**
   - El contenedor está activo: `docker ps --filter name=margenx_n8n_prod` y `docker logs --tail 50 margenx_n8n_prod`.
   - El workflow "MargenX - Ingesta de Listas de Precios" está **activo** y su última ejecución aparece en *Executions*. Las ejecuciones fallidas de otros proyectos no se tocan.
   - Si era una prueba de staging: `MARGENX_DEV_API_URL` está definida en el `.env` de `/opt/margenx-infra` y n8n fue recreado después (`docker compose up -d --no-deps n8n`). Sin esa variable, el correo no se despacha y el remitente recibe el aviso de error.
