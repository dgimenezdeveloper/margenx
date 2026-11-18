# 9. Reporte Semanal en PDF Generado en n8n con Gotenberg

* **Estado:** Aceptado
* **Fecha:** 2026-11-18
* **Decisores:** Darío Giménez (Tech Lead / DevOps). El reporte semanal en PDF se comprometió con el PO en la Entrega 6 y el equipo confirmó el alcance el 14/11/2026 para el Sprint 6.
* **Issue:** #391 (SPRINT6-DEVOPS-02). Endpoints del backend: #390.
* **Relacionado con:** ADR-002 (VPS), ADR-003 (n8n satélite, al que enmienda en el punto del reporte semanal), ADR-004 (cálculo de margen), `docs/api.md` §11, `infra/n8n/README.md`, `infra/vps/README.md` §10

---

## Contexto y Planteamiento del Problema

Cada lunes a las 08:00 (hora de Argentina), el ADMIN de cada comercio tiene que recibir un mail con el reporte de márgenes de la semana en PDF, para leerlo sin entrar a la app, reenviarlo o imprimirlo. Desde la app, el ADMIN también puede descargar el mismo PDF a pedido (`GET /api/reports/weekly.pdf`).

ADR-003 ya había decidido que el PDF lo genera n8n, pero con un endpoint público (`GET /api/reports/margin-summary`) que nunca existió y sin definir cómo se convierte el HTML a PDF. Restricciones:

* **n8n no tiene un nodo nativo para pasar de HTML a PDF**, y un nodo Code no puede importar librerías.
* **La memoria de la VPS es acotada** (SAD §4: techo del stack de ~3.3 GB sobre 8 GB). El backend tiene 512 MB por entorno y n8n 1024 MB con 768 MB de heap.
* **Los números tienen que ser los mismos que ve el panel:** el cálculo (con `Prisma.Decimal`) vive solo en el backend (ADR-003, ADR-004).
* **Un solo diseño:** el PDF del mail y el de la descarga tienen que ser idénticos.

## Opciones Consideradas

1. **PDF en el backend con `pdfkit`.** Sin dependencias del sistema, pero el diseño se dibuja con coordenadas, a mano, y no reutiliza la plantilla HTML de los mails. Cada cambio de diseño requiere un deploy del backend.
2. **PDF en el backend con Puppeteer.** HTML a PDF fiel, pero mete Chromium (~300 MB de imagen y cientos de MB de RAM por conversión) en el contenedor de 512 MB que atiende la API, dos veces (producción y staging). Una conversión pesada compite con los pedidos de los usuarios.
3. **Chromium dentro de la imagen de n8n, o un nodo de la comunidad.** Obliga a mantener una imagen propia de n8n o a confiar en un paquete de terceros con acceso a la instancia que guarda todas las credenciales.
4. **Gotenberg, un contenedor aparte que solo convierte.** API HTTP (`POST /forms/chromium/convert/html`) con Chromium adentro, mantenida y con imagen oficial. n8n le manda el HTML y recibe el PDF.

## Decisión

Se adopta la **opción 4**.

* **El backend calcula, n8n presenta.** `GET /api/internal/reports/accounts` y `GET /api/internal/reports/weekly/:slug` devuelven el reporte ya calculado. Las protege el secreto `x-margenx-webhook-secret` y Nginx las niega desde Internet (`location ^~ /api/internal/ { deny all; }`). n8n las llama **por la red interna de Docker** (`MARGENX_INTERNAL_API_URL`, `MARGENX_INTERNAL_DEV_API_URL`). n8n no lee la base ni recalcula márgenes (ADR-003).
* **Un solo generador.** El workflow `infra/n8n/workflows/reporte-semanal.json` tiene un único nodo Code (`Generar Reporte HTML`) y un único nodo de Gotenberg para los dos caminos: el disparador de los lunes y el webhook `report-pdf` que llama el backend para la descarga. El HTML usa la plantilla compartida de los mails (`infra/n8n/plantillas/mail-margenx.js`), extendida con una versión A4 (`mxDocumentoA4`: `@page`, encabezados de tabla que se repiten y filas que no se cortan).
* **Gotenberg** (`gotenberg/gotenberg:8.40.0`, versión fija) corre solo en `margenx_network`, sin puertos publicados, con 512 MB de límite y 128 MB de reserva. Chromium arranca con la primera conversión (`--chromium-auto-start=false`), se apaga tras 60 s sin uso (`--chromium-idle-shutdown-timeout=60s`) y convierte de a dos como máximo (`--chromium-max-concurrency=2`). n8n, además, le pide los PDF de a uno. Sin JavaScript (`--chromium-disable-javascript`) y solo puede leer el HTML recibido (`--chromium-allow-list=^file:///tmp/.*`): el HTML no puede descargar nada de la red.
* **Una cuenta que falla no frena a las demás.** Los pedidos al backend, la conversión y el envío continúan por su salida de error hacia un aviso a Discord (`DISCORD_WEBHOOK_URL`) con el slug, el paso y el código HTTP, sin correos ni datos personales.
* **Solo producción en el cron.** Staging se prueba con el disparador manual, que puede limitarse a un slug y a una casilla de prueba. El webhook `report-pdf` atiende a los dos backends, porque recibe el JSON ya calculado y no llama a la API.

## Consecuencias

### Positivas
* El backend no suma dependencias ni memoria: sigue respondiendo JSON.
* El diseño del PDF se cambia en el repositorio (plantilla y nodo Code) sin redeploy del backend, y la prueba `infra/n8n/tests/reporte-nodos.test.mjs` verifica en CI las secciones, el formato es-AR, los escapes y la plantilla.
* El PDF del mail y el de la descarga salen del mismo código y tienen el mismo contenido.

### Costos Asumidos
* **Memoria:** medido con la imagen 8.40.0 y un reporte de 3 páginas A4 (20 productos bajo el mínimo y 10 cambios de costo): 9 a 25 MB en reposo, un pico de 257 MB en la primera conversión y ~160 MB con Chromium encendido entre conversiones. A los 10 s de inactividad (en la prueba) Chromium se apagó y el contenedor volvió a 24 MB. La conversión tardó 0,6 s en frío y 0,26 s en caliente. Con el límite, el techo del stack sube de ~3.3 GB a ~3.8 GB (SAD §4). La medición en la VPS, con `docker stats` y `monitor-memory.sh`, se registra en el PR.
* **Un contenedor más que mantener.** La versión está fija: actualizarla es cambiar la etiqueta, probar una conversión y medir de nuevo.
* **n8n es un punto único:** si n8n o Gotenberg están caídos, el mail del lunes no sale (queda el aviso en Discord si n8n responde) y la descarga desde la app responde 503 con un mensaje genérico.
* **El webhook `report-pdf` es sincrónico:** el backend espera hasta 20 s. Con Chromium en frío la conversión tardó menos de 1 s en la prueba local.

### Alternativa descartada
Generar el PDF en el backend (opciones 1 y 2) se descarta por la memoria del contenedor de la API y porque obligaría a mantener dos diseños: el de los mails en n8n y el del PDF en el backend.
