# Workflows de n8n (satélite)

n8n **nunca escribe en la base de datos**: solo lee/escribe a través de la API del backend (ADR-003).

| Archivo | Qué hace | Issues |
|---|---|---|
| `workflows/alertas-margen.json` | Recibe el webhook del backend y envía el correo de los productos que quedaron debajo de su margen mínimo. | #172, #254 |
| `workflows/ingesta-listas.json` | Lee la casilla central por IMAP, convierte la planilla adjunta, la despacha al backend y envía el resumen al dueño. | #170, #171, #253, #254 |
| `workflows/invitacion-colaborador.json` | Recibe el webhook del backend y envía el mail de invitación de un colaborador. | #395 |
| `workflows/reporte-semanal.json` | Los lunes a las 08:00 manda a cada cuenta su reporte de márgenes en PDF (Gotenberg), y genera el mismo PDF a pedido para la descarga desde la app (webhook `report-pdf`). | #391 |
| `plantillas/mail-margenx.js` | Plantilla compartida de los mails (encabezado, avisos, botones, tabla de productos, pie) y su versión A4 para el PDF. Fuente única: se copia a los nodos Code. | #254, #391 |
| `plantillas/sincronizar.mjs` | Copia la plantilla a los workflows (`--check` solo verifica). | #254 |
| `tests/ingesta-nodos.test.mjs` | Prueba los nodos Code de la ingesta sin necesitar n8n. | #170, #171, #254 |
| `tests/invitacion-nodos.test.mjs` | Prueba el workflow de invitación: mail válido, enlaces que no son de Clerk, escapes, remitente, control del secreto y respuestas al backend. | #395 |
| `tests/alertas-nodos.test.mjs` | Prueba el nodo `Generar Plantilla Dinámica` de las alertas: enlaces "Ajustar" y botón principal, con y sin ID de producto, en producción y en staging; remitente y plantilla. | #329, #254 |
| `tests/reporte-nodos.test.mjs` | Prueba el reporte semanal: secciones del PDF en orden, formato es-AR, nombres de estado, escapes, CSS de impresión, mail, aviso a Discord, conexiones, secreto del webhook y el servicio de Gotenberg del compose. | #391 |

## Ingesta de listas de precios (`ingesta-listas.json`)

Flujo: `Correo Entrante (IMAP)` → `Extraer Slug y Adjunto` → (CSV: `Parsear CSV` / XLSX-XLS: `Extraer XLSX / XLS`) → `Normalizar Columnas` → `Despachar a API MargenX` (`POST /api/webhooks/supplier-prices`) → `¿Despacho OK?` → `Generar Resumen al Dueño` → `Enviar Resumen (Brevo)`. Cualquier error (sin slug, sin adjunto, planilla ilegible, API caída) termina en `Armar Correo de Error` → correo al remitente.

Política de despacho (`Despachar a API MargenX`): 2xx = éxito; 4xx = falla inmediata, sin reintentos (no se arregla reintentando); 5xx, timeout o error de red = hasta 3 reintentos con espera creciente (2 s, 5 s, 10 s). Si la API responde 413 (`PAYLOAD_TOO_LARGE`), el remitente recibe un correo que dice que la lista es demasiado grande (más de 5 MB) y que la divida en varios archivos. El detalle de error de la API nunca se reenvía al remitente. Si responde 401/403 se envía además una alerta a Discord (`DISCORD_WEBHOOK_URL`) y el remitente recibe un aviso genérico de problema interno.

Varios correos en una misma ejecución se procesan por separado: cada fila queda ligada a su correo (`mailId` + `pairedItem`), y cada correo genera su propio lote, su propio resumen al dueño y, si falla, su propio aviso de error al remitente correcto. Un CSV con solo encabezado se informa como planilla sin filas válidas.

**Comportamiento a tener en cuenta**

- El slug sale del destinatario. Formato recomendado: `precios-<slug>@margenx.tech` (ej. `precios-panaderia-central@margenx.tech`); también se aceptan `precios.<slug>@` y `precios+<slug>@` (Cloudflare Email Routing → Gmail).
- **Entornos:** un solo n8n y una sola casilla sirven a producción y a staging. Solo van a staging (`MARGENX_DEV_API_URL`) los correos a `precios-dev-<slug>@margenx.tech` (también `precios.dev-`, `precios+dev-` o el dominio `dev.margenx.tech`); el slug es lo que sigue a `dev-`. Todo lo demás, incluida la cuenta Demo de producción, va a `MARGENX_API_URL`. Ambas variables son la URL base, con o sin `/api` (ej. `https://api.margenx.tech`). Si un correo de staging llega y `MARGENX_DEV_API_URL` no está definida, no se despacha y el remitente recibe el aviso de error.
- Columnas reconocidas (sin distinguir mayúsculas ni tildes): código (`Código`, `Cod`, `Art`, `SKU`…), descripción (`Descripción`, `Detalle`…) y precio (`Precio Final`, `Final`, `Precio`, `Costo`…, en ese orden de prioridad). CSV con coma, punto y coma o tabulación.
- Precios en formato argentino (`1.234,56`) o inglés (`1,234.56`); se descartan filas sin código o con precio no positivo. Más de 5.000 filas se envían en varios lotes.
- XLSX con varias hojas: se lee **la primera hoja**.
- Códigos con ceros a la izquierda (`001`): en Excel, formatear la columna de código como **Texto** antes de guardar. Si la celda es numérica, Excel guarda `1` y el cero se pierde antes de que n8n reciba el archivo (en CSV se conservan tal cual).
- El trigger IMAP usa IDLE (tiempo real) con reconexión forzada cada 5 minutos: Gmail corta las sesiones IDLE en silencio y, con 60 minutos, los correos quedaban sin leer hasta la reconexión o una ejecución manual.
- **Orden del resumen:** primero "Para revisar", con lo que pide una decisión y su enlace: precios en cuarentena (`<app>/proveedores/cuarentena`), códigos sin mapear (`<app>/proveedores`) y productos debajo de su margen mínimo (botón "Ajustar" a `<app>/productos/<id>`). Después, el resumen en números. Si no hay nada para revisar, lo dice. `<app>` es `https://dev.margenx.tech` si la lista entró por staging y `https://margenx.tech` si no.
- Si la API informa `discardedCodes` (contrato #208), los `NOT_FOUND` se informan como **códigos sin mapear** (todavía no están vinculados a una presentación; no son errores) y el resto (`AMBIGUOUS`, `INACTIVE_SUPPLIER`) como "No se aplicaron por…", con su motivo. Se listan hasta 20 códigos por grupo, con "y N más", y se avisa cuando la API no detalla todos (tope de 100). Sin detalle, solo se dice cuántas filas no se aplicaron.
- Singular y plural según la cantidad ("1 fila", "2 filas", "1 precio quedó en cuarentena"). El asunto cuenta los productos como "1 producto debajo de su mínimo", igual que la tarjeta del panel.
- El resumen se envía solo al `account.ownerEmail` que devuelve la API (contrato de #200). Si la API no lo informa, no se envía nada: la lista nunca se responde a quien la mandó. Los correos propios, rebotes y respuestas automáticas se ignoran para evitar bucles.

**Puesta en marcha**

1. Variables en el `.env` de `/opt/margenx-infra`: `INTERNAL_WEBHOOK_SECRET`, `MARGENX_API_URL`, `MARGENX_DEV_API_URL`, `IMAP_USER`, `DISCORD_WEBHOOK_URL` (alertas 401/403; opcional, si falta solo se omite la alerta) (ver `infra/vps/.env.example`), y recrear n8n: `docker compose up -d --no-deps n8n`.
2. En n8n, crear la credencial **IMAP** llamada `Gmail IMAP MargenX` (host `imap.gmail.com`, puerto 993, SSL, usuario y contraseña de aplicación de Google). Las variables `IMAP_*` del `.env` no crean la credencial: se cargan a mano en la interfaz.
3. Verificar que exista la credencial SMTP `Brevo MargenX SMTP Relay`.
4. Importar `workflows/ingesta-listas.json`, reasignar las credenciales de los tres nodos que las usan (el exporte trae ids de ejemplo) y activarlo. El exporte del repositorio queda inactivo, sin ids reales de credenciales ni metadatos de la instancia, y los correos usan `emailFormat: both` (HTML + texto plano), remitente `MargenX <alertas@margenx.tech>` y `appendAttribution: false`: al reexportar desde n8n, restaurarlo antes del commit (`node infra/n8n/tests/ingesta-nodos.test.mjs` lo verifica).
5. Probar en staging enviando un `.csv` a `precios-dev-<slug-de-prueba>@margenx.tech` y revisar el resumen recibido y que la ejecución no aparezca en producción.

Pruebas locales: `node infra/n8n/tests/ingesta-nodos.test.mjs`, `node infra/n8n/tests/alertas-nodos.test.mjs`, `node infra/n8n/tests/invitacion-nodos.test.mjs` y `node infra/n8n/tests/reporte-nodos.test.mjs` (CI corre las cuatro).

## Alertas de margen (`alertas-margen.json`)

El backend llama al webhook `margin-alert` con el secreto `x-margenx-webhook-secret` y `appBaseUrl` (`APP_BASE_URL` de cada backend). Un solo n8n atiende a producción y a staging: los enlaces del mail usan `appBaseUrl` si es `https://margenx.tech` o `https://dev.margenx.tech`, y si no, producción. El asunto es "[MargenX ALERTA] Productos debajo de su margen mínimo - <Comercio>" (en singular con un solo producto), el título "Alerta de margen mínimo" y la etiqueta "Para revisar": los mails no usan "crítico" ni "margen bajo", que no son nombres de estado (especificación funcional §6). Cada producto lleva un botón "Ajustar" a `<appBase>/productos/<productId>`; si la alerta no trae el ID (o no queda nada al sanearlo), el enlace va al listado `<appBase>/productos`. El botón principal sigue la misma regla con el primer producto.

Para publicar un cambio: importar `workflows/alertas-margen.json` en n8n sobre el workflow existente (desde el cambio de nombres de estado se llama "MargenX - Alertas de Margen Mínimo"), reasignar la credencial SMTP `Brevo MargenX SMTP Relay` del nodo `Despachar Alerta SMTP (Brevo)` y activarlo. Como es la misma instancia, se importa una sola vez para los dos entornos.

## Invitación de colaboradores (`invitacion-colaborador.json`)

El backend crea la invitación en Clerk sin el mail de Clerk y llama al webhook `collaborator-invitation` con el secreto `x-margenx-webhook-secret` y `{ email, tradeName, inviterEmail, invitationUrl, expiresInDays }` (ADR-008).

Flujo: `Webhook Invitación Colaborador` → `Validar Secreto Webhook` (el mismo control que las alertas; sin secreto, 401) → `Generar Mail de Invitación` → `¿Invitación válida?` → `Enviar Invitación (Brevo)` → `Responder 200 Enviado`. Si los datos no sirven, responde 422 sin enviar nada.

- **Solo enlaces de Clerk:** `invitationUrl` tiene que ser `https`, con ruta `/v1/tickets/accept`, parámetro `ticket` y dominio `*.clerk.accounts.dev` (instancia de desarrollo) o `margenx.tech` y sus subdominios (producción). Cualquier otro enlace se rechaza.
- **El 200 llega después del envío:** si Brevo falla, la ejecución falla y n8n responde 5xx. El backend lo informa como `emailSent: false` y el ADMIN copia el enlace desde Perfil.
- El asunto es "<Comercio> te invitó a MargenX", sin saltos de línea. El mail menciona quién invita solo si su correo es válido.
- Remitente `MargenX <alertas@margenx.tech>`, HTML + texto plano y `appendAttribution: false`, igual que las alertas.

**Puesta en marcha (después del merge):**

1. Agregar `N8N_INVITATION_WEBHOOK_URL=https://n8n.margenx.tech/webhook/collaborator-invitation` al `.env` de `/opt/margenx-infra` (lo leen los dos backends; ver `infra/vps/.env.example`) y recrear los backends.
2. Importar `workflows/invitacion-colaborador.json` como workflow nuevo, reasignar la credencial SMTP `Brevo MargenX SMTP Relay` del nodo `Enviar Invitación (Brevo)` y activarlo. El exporte del repositorio queda inactivo y sin ids reales: al reexportar, restaurarlo antes del commit (`node infra/n8n/tests/invitacion-nodos.test.mjs` lo verifica).
3. Probar en staging invitando a una casilla de prueba: el mail tiene que llegar en español, con la marca de MargenX y desde `alertas@margenx.tech`.

**Evidencia antes de la revisión, sin tocar producción** (`docs/process/revision-de-prs.md` §5): importar el workflow como copia inactiva y ejecutarlo a mano con datos fijados en el webhook, y adjuntar al PR el ID de la ejecución y una captura del mail recortada, sin el destinatario.

## Reporte semanal en PDF (`reporte-semanal.json`)

Por qué en n8n y con Gotenberg: ADR-009. El backend calcula todo (`docs/api.md` §11); el workflow solo arma el HTML, lo convierte y lo envía.

**Envío de los lunes:** `Lunes 08:00` (cron `0 8 * * 1`, zona `America/Argentina/Buenos_Aires` en la configuración del workflow) → `Entorno Producción` → `Pedir Cuentas Activas` (`GET /api/internal/reports/accounts`) → `Separar Cuentas` → `Pedir Reporte Semanal` (`GET /api/internal/reports/weekly/:slug`, de a una cuenta) → `Generar Reporte HTML` → `¿Reporte válido?` → `Convertir a PDF (Gotenberg)` (de a un PDF) → `¿Descarga a pedido?` (no) → `Preparar Mail del Reporte` → `Enviar Reporte (Brevo)`.

**Descarga a pedido:** `Webhook Reporte PDF` (`POST /webhook/report-pdf`) → `Validar Secreto Webhook` (el mismo control que las alertas; sin secreto, 401) → `Generar Reporte HTML` → `Convertir a PDF (Gotenberg)` → `Responder PDF` (`application/pdf`). El backend manda el reporte ya calculado y espera hasta 20 s; si algo falla, responde 503 a la app con un mensaje genérico.

- **Un solo generador:** los dos caminos pasan por el mismo nodo `Generar Reporte HTML` y el mismo nodo de Gotenberg, así que el PDF del mail y el de la descarga son iguales.
- **Backend por la red interna:** Nginx niega `/api/internal/` desde Internet (403), así que n8n usa `MARGENX_INTERNAL_API_URL` (`http://backend-prod:3000`) y `MARGENX_INTERNAL_DEV_API_URL` (`http://backend-dev:3000`), nunca `MARGENX_API_URL`. Si faltan, el workflow usa esos mismos valores. Gotenberg: `GOTENBERG_URL` (`http://gotenberg:3000`).
- **El PDF, en el orden en que se lee:** encabezado con el comercio y el período; "Para revisar" (productos debajo de su margen mínimo con el precio sugerido, precios en cuarentena y costos sin actualizar); salud del catálogo; cambios de costo de la semana; oportunidades de ahorro; y un pie con la fecha de generación y "Montos calculados por MargenX al <fecha>". Montos y fechas en es-AR (`$ 1.234,56`, `23/11/2026`), estados con los nombres de la especificación funcional §6 (Pérdida, En riesgo, En objetivo, Superávit, Borrador), unidades como en la app (`u` → "unidad") y motivos de cuarentena como en la bandeja ("Aumento > 50%", "Costo casi nulo"). Si el backend manda solo una parte de una lista (por ejemplo, 20 de 23 productos), el PDF lo aclara.
- **El mail:** asunto "MargenX · Reporte semanal · <comercio>", los números clave, el botón "Abrir MargenX" (`<app>/dashboard` del entorno) y el PDF adjunto como `margenx-reporte-AAAA-MM-DD.pdf` (fecha de Argentina). Va al `ownerEmail` que devuelve la API (el ADMIN más antiguo de la cuenta). Remitente `MargenX <alertas@margenx.tech>`, HTML + texto plano y `appendAttribution: false`, igual que los otros mails.
- **Una cuenta que falla no frena a las demás:** un 4xx/5xx del backend, un reporte inválido, una cuenta sin correo de ADMIN, un error de Gotenberg o un rechazo de Brevo van por la salida de error a `Armar Aviso de Falla` → `Avisar a Discord` (`DISCORD_WEBHOOK_URL`; si falta, solo se omite el aviso) y las otras cuentas siguen. El aviso dice el entorno, el slug, el paso y el código HTTP, sin correos ni datos personales. Si falla la lista de cuentas, el aviso dice que no salió ningún reporte (y, con 401/403, que se revise `INTERNAL_WEBHOOK_SECRET`).
- **Staging:** el cron solo corre para producción. Para staging, abrir el workflow y ejecutar `Prueba Manual (Staging)`, que usa `backend-dev`. En el nodo `Entorno Staging` se puede completar `soloSlug` (una sola cuenta) y `destinatarioPrueba` (todos los mails van a esa casilla). En producción esos dos campos no existen.

**Puesta en marcha (después del merge):**

1. En la VPS, sumar el servicio `gotenberg` y las tres variables nuevas del servicio `n8n` de `infra/vps/docker-compose.prod.yml` al `docker-compose.yml` de `/opt/margenx-infra` (ver `infra/vps/README.md` §10) y levantar: `docker compose up -d gotenberg n8n`. `N8N_REPORT_PDF_WEBHOOK_URL` ya está en el `.env` de los backends desde #390.
2. Importar `workflows/reporte-semanal.json` como workflow nuevo y reasignar la credencial SMTP `Brevo MargenX SMTP Relay` del nodo `Enviar Reporte (Brevo)`. El exporte del repositorio queda inactivo y sin ids reales: al reexportar, restaurarlo antes del commit (`node infra/n8n/tests/reporte-nodos.test.mjs` lo verifica).
3. Probar staging con `Prueba Manual (Staging)`, con `soloSlug` y `destinatarioPrueba` completos, y la descarga desde `dev.margenx.tech` (el webhook responde solo con el workflow activo).
4. Activarlo. Desde ese momento corre el cron de los lunes y responde el webhook `report-pdf` para los dos backends.

**Evidencia antes de la revisión, sin tocar producción** (`docs/process/revision-de-prs.md` §5): importar el workflow como copia inactiva, ejecutar `Prueba Manual (Staging)` con `soloSlug` y `destinatarioPrueba`, y adjuntar al PR el ID de la ejecución, la captura del mail y el PDF recortados sin el destinatario, y `docker stats margenx_gotenberg` durante la generación. Después se borra la copia.

## Plantilla compartida de mails (`plantillas/mail-margenx.js`)

El resumen de ingesta (`Generar Resumen al Dueño`), la alerta de margen (`Generar Plantilla Dinámica`), la invitación de colaboradores (`Generar Mail de Invitación`) y el reporte semanal (`Generar Reporte HTML`) usan la misma plantilla: encabezado de marca (fondo `#0f172a`, "MARGEN**X**" con la X en índigo), etiqueta de estado, avisos por tono (peligro, aviso, info, ok), botones en el índigo de MargenX (`#4f46e5`, el `theme_color` de la PWA), tabla de productos de tres columnas pensada para 360 px y pie con el soporte (`soporte@margenx.tech`, el mismo correo que muestra la app). `mxDocumentoA4` es la versión para imprimir del reporte semanal: mismo encabezado de marca, página A4 con `@page`, encabezados de tabla que se repiten en cada hoja y filas que no se cortan. Sus tablas usan tres clases: `mx-num` (montos a la derecha), `mx-sub` (segunda línea de una celda) y `mx-nowrap` (texto corto que no se parte, como la columna Estado, para que "Pérdida" no quede en dos líneas).

El texto plano de cada mail (`emailText`) no sale de la plantilla: su pie con el soporte está en el propio nodo, y las pruebas de `tests/` verifican que use el mismo correo.

Un nodo Code de n8n no puede importar archivos, así que la plantilla se **copia** dentro de cada nodo, entre los marcadores `// <plantilla-mail-margenx>` y `// </plantilla-mail-margenx>`. Para cambiarla:

1. Editar `plantillas/mail-margenx.js` (nunca el bloque dentro de n8n o del JSON).
2. `node infra/n8n/plantillas/sincronizar.mjs` (reemplaza solo el bloque en los cuatro workflows, sin reformatear el JSON).
3. Las cuatro pruebas de `infra/n8n/tests/`: fallan si algún workflow quedó con otra versión de la plantilla.
4. Importar los cuatro workflows en n8n (ver cada sección).

**Remitente:** el nodo `emailSend` 2.1 ignora la opción `senderName`, así que el nombre va dentro de `fromEmail`: `MargenX <alertas@margenx.tech>` en los cinco nodos de envío. Con `appendAttribution: false` n8n no agrega su pie "This email was sent automatically with n8n". El alias `alertas@margenx.tech` tiene que estar verificado como remitente en Brevo.
