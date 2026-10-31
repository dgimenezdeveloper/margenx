# Runbook — Sembrar y resembrar staging y producción

**Proyecto:** MargenX (VPS: staging `dev.margenx.tech` y producción `margenx.tech`)
**Última actualización:** 30 de octubre de 2026
**Responsable:** DevOps

Cómo cargar o volver a cargar los datos de los comercios piloto y de la cuenta Demo en las bases de la VPS. Las cuentas piloto (Panadería Central y Química GyJ) y la Demo son datos de prueba: se pueden resembrar, y el estado de la presentación es el que deja el seed.

Este documento no contiene credenciales. Las contraseñas de los usuarios Demo viven solo en Bitwarden.

---

## 1. Qué se siembra

| Seed | Archivo | Cuentas |
|---|---|---|
| `piloto` | `backend/prisma/seed.ts` | Panadería Central y Química GyJ: insumos, proveedores con sus presentaciones mayoristas (MarJuanC, Molinera, Don Roque, Limpikorn), productos y recetas. |
| `demo` | `backend/prisma/seed-demo.ts` | Demo MargenX: 8 insumos, 2 proveedores (uno con códigos y otro sin códigos), 9 presentaciones, 1 en cuarentena y 3 productos con receta. |

Reglas al resembrar:

- Se identifica cada registro por su ID fijo. Volver a correr no duplica nada.
- Restaura nombres, costos, precios y recetas del seed, aunque los hayan editado o renombrado. En la Demo, también la cuarentena pendiente.
- No borra lo que se cargó a mano fuera del seed (por ejemplo, un proveedor nuevo). Si otro registro de la cuenta usa el nombre de uno del seed (sin distinguir mayúsculas), el seed se detiene sin cambiar nada.
- Los usuarios existentes conservan su email y su `authProviderId` en el seed `piloto`. En el seed `demo`, el `authProviderId` se toma de las variables del punto 3 y se actualiza.
- Cada seed corre en una sola transacción: si falla, la base queda como estaba.

## 2. Requisitos

- Acceso SSH por clave a la VPS con un alias en `~/.ssh/config` (por defecto `vps-donweb`; otro alias se indica con `SSH_HOST`).
- El repositorio con `npm ci` hecho en `backend/` (el script compila con el `tsc` local).
- Estar en la rama desplegada en ese entorno: `develop` para staging, `main` para producción. El script compara las migraciones de la rama con las aplicadas en la base y se detiene si no coinciden.

## 3. IDs de Clerk de la Demo

Cada instancia de Clerk asigna sus propios `user_id`. `seed-demo.ts` trae los de la instancia de desarrollo. Para producción:

1. Crear (una sola vez) `demo-admin@margenx.tech` y `demo-colab@margenx.tech` en la instancia de **producción** de Clerk. Las contraseñas se guardan en Bitwarden.
2. Copiar el `user_id` de cada uno (Clerk Dashboard → instancia de producción → Users → el usuario → `user_...`).
3. Pasarlos al script como variables de entorno:

```bash
export SEED_DEMO_ADMIN_AUTH_ID=user_...   # administrador Demo (producción)
export SEED_DEMO_COLAB_AUTH_ID=user_...   # colaborador Demo (producción)
```

Van las dos o ninguna. En staging el script las ignora aunque estén exportadas: usa los IDs de la instancia de desarrollo que trae `seed-demo.ts`.

## 4. Sembrar

Desde la raíz del repositorio:

```bash
# Staging
infra/scripts/seed-remoto.sh dev todo --confirmar margenx_dev

# Producción: piloto y Demo
git switch main && git pull
infra/scripts/seed-remoto.sh prod todo --confirmar margenx_prod

# Solo una parte
infra/scripts/seed-remoto.sh prod piloto --confirmar margenx_prod
infra/scripts/seed-remoto.sh prod demo --confirmar margenx_prod
```

`--confirmar` debe repetir el nombre de la base del entorno; si no coincide, el script no hace nada.

El script:

1. Compila los seeds de la rama actual en un directorio temporal local.
2. Compara las migraciones de la rama con las de la base destino.
3. Hace `pg_dump -Fc` de la base en `/opt/margenx-infra/backups/manual/<base>-<fecha>-pre-seed.dump` (permisos `600`) y comprueba que tenga datos. Sin respaldo válido, no siembra.
4. Corre cada seed en un contenedor temporal (`docker run --rm`) con la misma imagen que el backend del entorno, en la red `margenx_network`. El código compilado entra por la entrada estándar: no se copian archivos al contenedor en marcha ni se instala nada en la VPS. `DATABASE_URL` se lee del backend dentro de la VPS y no sale del servidor.

Al terminar, cada seed imprime una tabla con los totales de la cuenta.

## 5. Verificar

```bash
# En la VPS: totales por cuenta
docker exec margenx_postgres_prod sh -c 'psql -U "$POSTGRES_USER" -d margenx_prod -c "
SELECT a.slug,
  (SELECT count(*) FROM \"Supplier\" s WHERE s.\"accountId\" = a.id) AS proveedores,
  (SELECT count(*) FROM \"Ingredient\" i WHERE i.\"accountId\" = a.id) AS insumos,
  (SELECT count(*) FROM \"Product\" p WHERE p.\"accountId\" = a.id) AS productos
FROM \"Account\" a ORDER BY 1;"'
```

Valores esperados después del seed: Panadería Central 3 proveedores, 10 insumos y 10 productos; Química GyJ 1, 10 y 10; Demo MargenX 2, 8 y 3. Si alguien cargó datos a mano, puede haber más.

Recorrido manual:

- Login del administrador Demo en `https://margenx.tech`: ve costos, márgenes y la cuarentena del cacao.
- Login del colaborador Demo: ve productos y precios de venta, sin costos, márgenes ni cantidades de receta.

Webhook `supplier-prices` (sin secreto debe responder 401; con el secreto, 200):

```bash
# Desde cualquier máquina: sin secreto
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://api.margenx.tech/api/webhooks/supplier-prices \
  -H 'content-type: application/json' \
  -d '{"accountSlug":"demo-margenx","items":[{"code":"DEMO-HAR-25","price":21000}]}'

# En la VPS: con el secreto, sin que salga del servidor. Mismo precio que el seed => "unchanged": 1
S=$(docker exec margenx_backend_prod printenv INTERNAL_WEBHOOK_SECRET)
curl -s -X POST http://127.0.0.1:3011/api/webhooks/supplier-prices \
  -H 'content-type: application/json' -H "x-margenx-webhook-secret: $S" \
  -d '{"accountSlug":"demo-margenx","items":[{"code":"DEMO-HAR-25","price":21000}]}'
```

Alerta de margen crítico: en la Demo, "Alfajores de dulce de leche — docena" queda con 29,21 % sobre un mínimo de 28 %. Con el administrador Demo, editar el insumo "Manteca (demo)" y subir su costo un 10 % (de 9500 a 10450 por kg): cruza el mínimo y el backend envía el aviso a n8n, que manda el mail a `demo-admin@margenx.tech` (Cloudflare lo reenvía a la casilla configurada en Email Routing). El botón "Ajustar" debe apuntar a `https://margenx.tech`. Después, resembrar con `prod demo` para volver al estado inicial.

El mail de alerta sale cuando el costo cambia desde la app (editar un insumo o liberar una cuarentena). El webhook `supplier-prices` no lo envía: devuelve las alertas en `criticalProductsAlerts` y el workflow de ingesta de n8n las incluye en el resumen al dueño. Un `curl` directo al webhook actualiza el precio y muestra la alerta en la respuesta, pero no manda ningún mail.

## 6. Restaurar

Si hay que volver al estado anterior al seed:

```bash
# En la VPS
FILE=/opt/margenx-infra/backups/manual/margenx_prod-<fecha>-pre-seed.dump
docker exec -i margenx_postgres_prod sh -c 'pg_restore -U "$POSTGRES_USER" -d margenx_prod --clean --if-exists --no-owner' < "$FILE"
```

Para el procedimiento completo de recuperación y los respaldos diarios, ver `docs/runbook-backup.md`.

## 7. Problemas frecuentes

| Mensaje | Causa | Qué hacer |
|---|---|---|
| `Las migraciones de la rama no coinciden` | La rama no es la desplegada en ese entorno. | Cambiar a `develop` (staging) o `main` (producción), o esperar al deploy. |
| `Conflicto de identidad en el producto ...` | Otro registro de la cuenta usa ese nombre. | Renombrar o borrar ese registro desde la app y volver a correr. |
| `Conflicto de identidad del usuario ...` | El email o el `user_id` de Clerk ya está en otro usuario. | Revisar los IDs del punto 3. |
| `Configurá las dos variables ...` | Se pasó una sola variable de Clerk. | Exportar las dos. |
| Login correcto en Clerk pero `401` en la app | El `authProviderId` de la base no coincide con el `user_id` de esa instancia de Clerk. | Resembrar la Demo con los IDs correctos (punto 3). |
