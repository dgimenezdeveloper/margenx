# Runbook de Ingesta de Listas de Precios y Contingencia

**Documento:** Procedimiento de operación, diagnóstico de fallos y contingencia del canal de ingesta desatendida "Zero-Click".  
**Proyecto:** MargenX (Producción y Staging)  
**Referencia:** Issue #254 / ADR-003 / ADR-005 / S5-BE-06 (`#233`) / S5-DEVOPS-05 (`#253`)  
**Última actualización:** 06 de Noviembre de 2026  

---

## 1. Límites Operativos de la API y Perímetro

- **Webhook de Ingesta:** `POST /api/webhooks/supplier-prices` cuenta con un parser dedicado con límite de cuerpo de hasta **5 MB** de JSON (`backend/src/index.ts`).
- **Límite General de la API:** El resto de los endpoints de la plataforma están acotados a **256 KB** para prevenir saturación de memoria por payloads desmedidos.
- **Proxy Perimetral Nginx (VPS Host):** El bloque de servidor de la API (`infra/vps/nginx/margenx.conf`) define `client_max_body_size 6m;`. Si un archivo supera los 6 MB brutos en la red, Nginx lo descarta directamente con código `413 Request Entity Too Large` antes de alcanzar el proceso de Node.js.
- **Respuesta ante Exceso de Capacidad (HTTP 413):** Si el payload JSON enviado al webhook excede los 5 MB, Express responde:
  ```json
  {
    "code": "PAYLOAD_TOO_LARGE",
    "error": "La lista es demasiado grande. Dividila en varios lotes más pequeños."
  }
  ```
- **Tope de Registros por Lote:** El esquema Zod (`supplierPricesIngestSchema`) admite entre **1 y 5.000 artículos** por petición (`.min(1).max(5000)`). Si un archivo supera los 5.000 registros, el workflow satélite de n8n lo divide automáticamente en lotes (*batches*) de 5.000 filas.

---

## 2. Recomendación Operativa para Proveedores

Cuando una lista supera el límite, no se debe reintentar a la misma velocidad ni con la misma estructura. Se recomienda:

1. Dividir la lista en lotes más chicos (menores a 5.000 filas o 5 MB c/u).
2. Mandar por separado cada lote como adjunto por correo (`.xlsx`, `.xls` o `.csv`).
3. Volver a ejecutar la ingesta con el mismo secreto compartido.
4. Confirmar en n8n que cada lote fue aceptado antes de continuar con el siguiente.

---

## 3. Observaciones de Infraestructura

- Nginx en la VPS se configura con un límite propio (`6m`) mayor que Express (`5mb`) para no heredar el valor global de 20 MB y frenar sobrecargas en el perímetro.
- El valor de backend queda en 5 MB para cerrar el contrato de ingesta sin riesgo de que el parser global termine ocultando el problema.
- La validación del cuerpo se hace antes de la lógica de negocio para evitar procesar listas que no pueden ser aceptadas de forma segura.

---

## 4. "Mandé la lista y no pasó nada"

Si quien envió la lista no recibió ni el resumen (lo recibe el dueño de la cuenta) ni un correo de error en unos 3 minutos, revisar en este orden:

1. **Dirección de destino.** El comercio se identifica **solo por el destinatario (`To:`)**, nunca por el remitente.
   - Producción: `precios-<slug>@margenx.tech` (ej. `precios-panaderia-central@margenx.tech`).
   - Staging: `precios-dev-<slug>@margenx.tech` (ej. `precios-dev-demo-margenx@margenx.tech`). Cualquier otra dirección va a producción, incluida la cuenta Demo.
   - Sin slug reconocible, el remitente recibe un correo de error que explica el formato.

2. **Adjunto.**
   - Formatos admitidos: `.xlsx`, `.xls` o `.csv`, como **adjunto** (un enlace a Google Drive o OneDrive no sirve).
   - Si la API responde `413 PAYLOAD_TOO_LARGE` (más de 5 MB por lote), el remitente recibe un correo que le pide dividir la lista en varios archivos.

3. **"0 actualizados".** Si el resumen llegó con todo descartado, los códigos de artículo de la lista no están cargados en las presentaciones del proveedor (`SupplierIngredient.supplierCode`). La lista nunca crea insumos nuevos.

4. **n8n en la VPS.**
   - El contenedor está activo: `docker ps --filter name=margenx_n8n_prod` y `docker logs --tail 50 margenx_n8n_prod`.
   - El workflow "MargenX - Ingesta de Listas de Precios" está **activo** y su última ejecución aparece en *Executions*. Las ejecuciones fallidas de otros proyectos no se tocan.
   - Si era una prueba de staging: `MARGENX_DEV_API_URL` está definida en el `.env` de `/opt/margenx-infra` y n8n fue recreado después (`docker compose up -d --no-deps n8n`). Sin esa variable, el correo no se despacha y el remitente recibe el aviso de error.

---

## 5. Árbol de Decisión: Diagnóstico Paso a Paso

```
[ INICIO DIAGNÓSTICO ]
        │
        ▼
¿Hacia qué dirección exacta se envió el correo?
        ├── A una casilla ajena o sin prefijo "precios"
        │       └── Causa: Enrutamiento no activado.
        │           Acción: Explicar al dueño que debe usar precios-<slug>@margenx.tech.
        │
        ├── A precios-dev-<slug>@margenx.tech (Staging)
        │       └── ¿Está configurada MARGENX_DEV_API_URL en n8n?
        │               ├── NO: n8n descarta el envío para no tocar producción.
        │               └── SÍ: Despacha al backend de staging (:3021).
        │
        └── A precios-<slug>@margenx.tech (Producción)
                │
                ▼
        ¿Llegó el correo a la casilla central de Gmail (IMAP)?
                ├── NO: Falla en Cloudflare Email Routing (Catch-All *@margenx.tech).
                │       Revisar registros MX y reglas de reenvío en el panel de Cloudflare.
                │
                └── SÍ: El correo está en Gmail (UNSEEN).
                        │
                        ▼
                ¿Se disparó el workflow en n8n ("MargenX - Ingesta de Listas de Precios")?
                        ├── NO: El trigger IMAP IDLE se desconectó.
                        │       Comprobar reconexión forzada cada 5 min o reiniciar n8n:
                        │       docker compose restart n8n
                        │
                        └── SÍ: Hay una ejecución en el historial de n8n.
                                │
                                ▼
                        ¿Cuál fue el resultado del nodo "Despachar a API MargenX"?
                                ├── Error 401 / 403: Secreto inválido.
                                │       INTERNAL_WEBHOOK_SECRET desfasado entre n8n y backend.
                                │       n8n emite alerta automática a Discord.
                                │
                                ├── Error 404: Slug inexistente o cuenta inactiva.
                                │       El slug del destinatario no coincide con Account.slug en BD.
                                │
                                ├── Error 413: Lista > 5 MB.
                                │       El remitente recibe correo automático pidiendo dividir la lista.
                                │
                                └── HTTP 200 OK: La API procesó el lote correctamente.
                                        │
                                        ▼
                                ¿Qué reporta el JSON de respuesta de la API?
                                        ├── "discarded" = total recibido ("updated": 0)
                                        │       Causa: Filtro Anti-Pollution (NOT_FOUND).
                                        │       Los códigos SKU de la lista no están cargados
                                        │       en SupplierIngredient.supplierCode.
                                        │
                                        ├── "quarantined" > 0
                                        │       Causa: Variación > 50% o costo unitario <= $0.01.
                                        │       El precio está retenido en /proveedores/cuarentena.
                                        │       El costo del insumo NO cambia hasta que el dueño lo libere.
                                        │
                                        └── "updated" > 0
                                                Los insumos predeterminados se actualizaron y
                                                las recetas se recalcularon en cascada.
```