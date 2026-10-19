# Workflows de n8n (satélite)

n8n **nunca escribe en la base de datos**: solo lee/escribe a través de la API del backend (ADR-003).

| Archivo | Qué hace | Issues |
|---|---|---|
| `workflows/alertas-margen.json` | Recibe el webhook del backend y envía el correo de margen crítico. | #172 |
| `workflows/ingesta-listas.json` | Lee la casilla central por IMAP, convierte la planilla adjunta, la despacha al backend y envía el resumen al dueño. | #170, #171 |
| `tests/ingesta-nodos.test.mjs` | Prueba los nodos Code de la ingesta sin necesitar n8n. | #170, #171 |

## Ingesta de listas de precios (`ingesta-listas.json`)

Flujo: `Correo Entrante (IMAP)` → `Extraer Slug y Adjunto` → (CSV: `Parsear CSV` / XLSX-XLS: `Extraer XLSX / XLS`) → `Normalizar Columnas` → `Despachar a API MargenX` (`POST /api/webhooks/supplier-prices`, 3 reintentos) → `Generar Resumen al Dueño` → `Enviar Resumen (Brevo)`. Cualquier error (sin slug, sin adjunto, planilla ilegible, API caída) termina en `Armar Correo de Error` → correo al remitente.

**Comportamiento a tener en cuenta**

- El slug sale del destinatario `precios+<slug>@margenx.tech` (Cloudflare Email Routing → Gmail).
- Columnas reconocidas (sin distinguir mayúsculas ni tildes): código (`Código`, `Cod`, `Art`, `SKU`…), descripción (`Descripción`, `Detalle`…) y precio (`Precio Final`, `Final`, `Precio`, `Costo`…, en ese orden de prioridad). CSV con coma, punto y coma o tabulación.
- Precios en formato argentino (`1.234,56`) o inglés (`1,234.56`); se descartan filas sin código o con precio no positivo. Más de 5.000 filas se envían en varios lotes.
- XLSX con varias hojas: se lee **la primera hoja**.
- El trigger IMAP usa IDLE (tiempo real) con reconexión forzada cada 60 minutos, en vez de sondeo cada 60 s.
- El resumen se envía solo al `account.ownerEmail` que devuelve la API (contrato de #200). Si la API no lo informa, no se envía nada: la lista nunca se responde a quien la mandó. Los correos propios, rebotes y respuestas automáticas se ignoran para evitar bucles.
- Un solo n8n apunta a un solo backend (`MARGENX_API_URL`).

**Puesta en marcha**

1. Variables en el `.env` de `/opt/margenx-infra`: `INTERNAL_WEBHOOK_SECRET`, `MARGENX_API_URL`, `IMAP_USER` (ver `infra/vps/.env.example`), y recrear n8n: `docker compose up -d --no-deps n8n`.
2. En n8n, crear la credencial **IMAP** llamada `Gmail IMAP MargenX` (host `imap.gmail.com`, puerto 993, SSL, usuario y contraseña de aplicación de Google). Las variables `IMAP_*` del `.env` no crean la credencial: se cargan a mano en la interfaz.
3. Verificar que exista la credencial SMTP `Brevo MargenX SMTP Relay`.
4. Importar `workflows/ingesta-listas.json` y activarlo.
5. Probar enviando un `.csv` a `precios+<slug-de-prueba>@margenx.tech` y revisar el resumen recibido.

Pruebas locales: `node infra/n8n/tests/ingesta-nodos.test.mjs`.
