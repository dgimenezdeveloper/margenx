# 3. Orquestador de Eventos Satélite n8n Desacoplado vía Webhooks

* **Estado:** Aceptado
* **Fecha:** 2026-08-30
* **Decisores:** Dario Gimenez (DevOps/SM)

## Contexto y Planteamiento del Problema
MargenX necesita notificar por correo electrónico a los dueños de los comercios cuando un producto cae por debajo del margen mínimo esperado, además de generar y despachar un reporte semanal en formato PDF con la rentabilidad consolidada de su catálogo. Incorporar librerías pesadas de renderizado de PDFs (ej. Puppeteer / Chromium) o colas de envío de emails (BullMQ + Redis) dentro del monolito de Node/Express sobrecarga la memoria RAM de los contenedores de Azure y aumenta la complejidad del código.

## Opciones Consideradas
1. **Lógica pesada dentro del monolito:** Generar PDFs con Puppeteer y despachar emails con Nodemailer en el proceso principal de Node.js.
2. **Microservicio dedicado en Node:** Crear un segundo backend para PDFs y correos.
3. **Motor de orquestación Low-Code (n8n self-hosted):** Desplegar n8n en la VPS y comunicarlo con el backend mediante Webhooks asíncronos.

## Decisión
Se decide adoptar **n8n self-hosted** (`https://n8n.margenx.tech:5678`) como servicio satélite desacoplado:
* El Backend monolítico únicamente ejecuta la lógica de cálculo financiero y, si detecta un margen en riesgo, dispara una petición HTTP POST asíncrona hacia el Webhook de n8n (`margin.alert.triggered`).
* n8n recibe el evento, procesa la plantilla HTML y realiza el envío del correo SMTP.
* Para el reporte semanal, n8n ejecuta un disparador Cron los lunes a las 08:00 hs, consulta la API pública del backend (`GET /api/reports/margin-summary`), compila el PDF y lo envía al administrador.

## Consecuencias
* **Positivas:**
  * El backend monolítico de Express se mantiene 100% enfocado en reglas de negocio y transacciones de base de datos.
  * Modificaciones en el diseño del correo o del PDF se realizan visualmente en n8n sin requerir un nuevo deploy del backend.
  * Aislamiento de consumo de recursos: si la generación de un PDF consume CPU, no afecta la disponibilidad de la API REST.
* **Regla Inviolable de Arquitectura:**
  * **n8n nunca escribe directamente en la base de datos PostgreSQL de producción.** n8n solo lee a través de endpoints autorizados de la API y consume webhooks para orquestar notificaciones.