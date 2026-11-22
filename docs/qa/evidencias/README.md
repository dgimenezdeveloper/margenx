# Evidencia de QA: qué se versiona y cómo

Reglas para la evidencia de los reportes de calidad (`docs/qa/reporte-calidad-sprint*.md`), de las descripciones de los PR y de esta carpeta. El repositorio es público: lo que se sube acá lo puede leer cualquiera.

## Dónde va

- Una carpeta por issue: `docs/qa/evidencias/<número de issue>/`, con archivos numerados y descriptivos (`01-panel-admin-boton-descarga.png`, `02-newman-productos.txt`).
- El reporte o el PR enlaza cada archivo y dice qué muestra.

## Salida real, no solo capturas

Un resultado automatizado se respalda con la salida de la herramienta, como texto, para que cualquiera la pueda comparar sin depender de una imagen:

- **Newman:** la tabla final de la salida de consola (`iterations`, `requests`, `test-scripts`, `prerequest-scripts`, `assertions`, con sus fallas) y, si hubo fallas, su detalle. Va pegada en el reporte o en un `.txt` de la carpeta de la issue.
- **Vitest:** el resumen (`Test Files`, `Tests`) y, si corresponde, la fila `All files` de la cobertura.
- **Playwright:** el resumen de la corrida (`passed`, `failed`, `skipped`).

Las capturas sirven para lo visual (360 px, modo claro y oscuro, un mail, un PDF) y para acompañar, no para reemplazar esa salida.

**No se versionan los reportes HTML de `newman-reporter-htmlextra`** ni la carpeta `backend/tests/postman/reports/`, que ya está en `.gitignore`. El HTML muestra las cabeceras de cada pedido, con el token de Clerk y el secreto del webhook. La salida de consola no los muestra.

## Correos en capturas y logs

Solo pueden aparecer correos **ficticios**:

- los del seed, con dominio `seed.example.test` (por ejemplo, `admin.panaderia@seed.example.test`);
- los de la cuenta demo, `demo-*@margenx.tech` (por ejemplo, `demo-admin@margenx.tech`).

Cualquier otro correo se tapa en la captura y se reemplaza por `[correo]` en un log: el personal, el de un compañero, el de un comercio piloto o el de una invitación real.

## Nunca se versionan

- Tokens de Clerk (JWT, empiezan con `eyJ`), el `INTERNAL_WEBHOOK_SECRET` ni otras claves.
- El contenido de un archivo `.env` o una cadena de conexión a la base.
- La IP de la VPS.
- Datos personales: nombres reales fuera del equipo, teléfonos o direcciones de personas.

Antes de subir una captura, revisala entera, incluidas la barra de direcciones, las notificaciones y las pestañas del navegador.
