# Workflows de n8n (satélite)

n8n **nunca escribe en la base de datos**: solo lee/escribe a través de la API del backend (ADR-003).

| Archivo | Qué hace | Issues |
|---|---|---|
| `workflows/alertas-margen.json` | Recibe el webhook del backend y envía el correo de margen crítico. | #172 |
| `workflows/ingesta-listas.json` | Lee la casilla central por IMAP, convierte la planilla adjunta, la despacha al backend y envía el resumen al dueño. | #170, #171, #253 |
| `tests/ingesta-nodos.test.mjs` | Prueba los nodos Code de la ingesta sin necesitar n8n. | #170, #171 |

## Ingesta de listas de precios (`ingesta-listas.json`)

Flujo: `Correo Entrante (IMAP)` → `Extraer Slug y Adjunto` → (CSV: `Parsear CSV` / XLSX-XLS: `Extraer XLSX / XLS`) → `Normalizar Columnas` → `Despachar a API MargenX` (`POST /api/webhooks/supplier-prices`) → `¿Despacho OK?` → `Generar Resumen al Dueño` → `Enviar Resumen (Brevo)`. Cualquier error (sin slug, sin adjunto, planilla ilegible, API caída) termina en `Armar Correo de Error` → correo al remitente.

Política de despacho (`Despachar a API MargenX`): 2xx = éxito; 4xx = falla inmediata, sin reintentos (no se arregla reintentando); 5xx, timeout o error de red = hasta 3 reintentos con espera creciente (2 s, 5 s, 10 s). Si la API responde 413 (`PAYLOAD_TOO_LARGE`), el remitente recibe un correo que dice que la lista es demasiado grande (más de 5 MB) y que la divida en varios archivos. El detalle de error de la API nunca se reenvía al remitente. Si responde 401/403 se envía además una alerta a Discord (`DISCORD_WEBHOOK_URL`) y el remitente recibe un aviso genérico de problema interno.

Varios correos en una misma ejecución se procesan por separado: cada fila queda ligada a su correo (`mailId` + `pairedItem`), y cada correo genera su propio lote, su propio resumen al dueño y, si falla, su propio aviso de error al remitente correcto. Un CSV con solo encabezado se informa como planilla sin filas válidas.

**Comportamiento a tener en cuenta**

- El slug sale del destinatario. Formato recomendado: `precios-<slug>@margenx.tech` (ej. `precios-panaderia-central@margenx.tech`); también se aceptan `precios.<slug>@` y `precios+<slug>@` (Cloudflare Email Routing → Gmail).
- **Entornos:** un solo n8n y una sola casilla sirven a producción y a staging. Solo van a staging (`MARGENX_DEV_API_URL`) los correos a `precios-dev-<slug>@margenx.tech` (también `precios.dev-`, `precios+dev-` o el dominio `dev.margenx.tech`); el slug es lo que sigue a `dev-`. Todo lo demás, incluida la cuenta Demo de producción, va a `MARGENX_API_URL`. Ambas variables son la URL base **sin** `/api`. Si un correo de staging llega y `MARGENX_DEV_API_URL` no está definida, no se despacha y el remitente recibe el aviso de error.
- Columnas reconocidas (sin distinguir mayúsculas ni tildes): código (`Código`, `Cod`, `Art`, `SKU`…), descripción (`Descripción`, `Detalle`…) y precio (`Precio Final`, `Final`, `Precio`, `Costo`…, en ese orden de prioridad). CSV con coma, punto y coma o tabulación.
- Precios en formato argentino (`1.234,56`) o inglés (`1,234.56`); se descartan filas sin código o con precio no positivo. Más de 5.000 filas se envían en varios lotes.
- XLSX con varias hojas: se lee **la primera hoja**.
- Códigos con ceros a la izquierda (`001`): en Excel, formatear la columna de código como **Texto** antes de guardar. Si la celda es numérica, Excel guarda `1` y el cero se pierde antes de que n8n reciba el archivo (en CSV se conservan tal cual).
- El trigger IMAP usa IDLE (tiempo real) con reconexión forzada cada 60 minutos, en vez de sondeo cada 60 s.
- Si la API informa `discardedCodes` (contrato #208), el resumen lista los códigos descartados agrupados por motivo (máx. 20 por motivo, con "y N más") y avisa cuando la API no detalla todos (tope de 100).
- El resumen se envía solo al `account.ownerEmail` que devuelve la API (contrato de #200). Si la API no lo informa, no se envía nada: la lista nunca se responde a quien la mandó. Los correos propios, rebotes y respuestas automáticas se ignoran para evitar bucles.

**Puesta en marcha**

1. Variables en el `.env` de `/opt/margenx-infra`: `INTERNAL_WEBHOOK_SECRET`, `MARGENX_API_URL`, `MARGENX_DEV_API_URL`, `IMAP_USER`, `DISCORD_WEBHOOK_URL` (alertas 401/403; opcional, si falta solo se omite la alerta) (ver `infra/vps/.env.example`), y recrear n8n: `docker compose up -d --no-deps n8n`.
2. En n8n, crear la credencial **IMAP** llamada `Gmail IMAP MargenX` (host `imap.gmail.com`, puerto 993, SSL, usuario y contraseña de aplicación de Google). Las variables `IMAP_*` del `.env` no crean la credencial: se cargan a mano en la interfaz.
3. Verificar que exista la credencial SMTP `Brevo MargenX SMTP Relay`.
4. Importar `workflows/ingesta-listas.json`, reasignar las credenciales de los tres nodos que las usan (el exporte trae ids de ejemplo) y activarlo. El exporte del repositorio queda inactivo y sin ids reales: al reexportar, restaurarlos antes del commit (`node infra/n8n/tests/ingesta-nodos.test.mjs` lo verifica).
5. Probar en staging enviando un `.csv` a `precios-dev-<slug-de-prueba>@margenx.tech` y revisar el resumen recibido y que la ejecución no aparezca en producción.

Pruebas locales: `node infra/n8n/tests/ingesta-nodos.test.mjs`.
