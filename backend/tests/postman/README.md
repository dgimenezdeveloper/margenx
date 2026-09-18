# QA — Colección Postman/Newman: API de Insumos

Issue #37. Colección automatizada de pruebas de API para `POST/GET/PUT/DELETE /api/ingredients`: alta exitosa, validaciones negativas, consulta y aislamiento multi-tenant entre dos cuentas.

## Archivos

- `MargenX - Insumos API.postman_collection.json` — la colección (Postman Collection v2.1).
- `MargenX - Insumos QA.postman_environment.json` — environment con variables de conexión. Se versiona con valores placeholder (sin secretos reales) — los tokens se pisan en tiempo de ejecución, ver más abajo.

## ⚠️ Nota importante: alcance vs. estado actual del backend

El criterio técnico original de la issue #37 pide validar una respuesta **paginada** en el `GET` (`array data` + `objeto meta`). Al momento de escribir esta colección, la **issue #36 (paginación) todavía no está implementada** en `develop` — el endpoint devuelve un array plano bajo la clave `ingredients`, sin paginar.

La colección valida el **contrato real vigente hoy** (ver el test `GET Listar insumos (200)`, con un comentario explícito en el script). Cuando la issue #36 se mergee, hay que actualizar ese schema a `{ data: [...], meta: {...} }` antes de dar por cerrada la cobertura completa de la issue #37.

## Requisitos previos

1. Backend corriendo localmente (`npm run dev` en `backend/`), con la base de datos migrada.
2. **Dos usuarios de dos cuentas distintas**, cada uno vinculado a un `User ID` real de Clerk (mismo mecanismo que usamos para QA manual con `scripts/get-test-token.ts` — ver más abajo). No sirven los usuarios ficticios del seed (`seed_local_...`), porque no tienen un usuario real en Clerk para generarles un JWT.
3. Newman instalado: `npm install -g newman` (o usar `npx newman` sin instalar global).

## 1. Preparar las dos cuentas de prueba

Si no las tenés ya armadas, en Prisma Studio (`npx prisma studio`, desde `backend/`):

1. Confirmá o creá **Cuenta A** y un `User` con `role: ADMIN` y `authProviderId` = un User ID real de Clerk (Cuenta A).
2. Confirmá o creá **Cuenta B** (otro `Account`, distinto `businessName`) y un `User` con `authProviderId` = **otro** User ID real de Clerk, distinto al de Cuenta A.
3. Anotá el `id` de la Cuenta A (lo vas a necesitar como `accountId_cuentaA`).

## 2. Generar los tokens (duran ~60s cada uno)

En `backend/scripts/get-test-token.ts`, cambiá la constante `userId` por el de Cuenta A, corré:

```bash
npx tsx scripts/get-test-token.ts
```

Copiá el token. Repetí cambiando `userId` al de Cuenta B para el segundo token.

Como duran poco, no los guardes en el archivo de environment — pasalos como overrides al correr Newman (ver el paso siguiente), generándolos justo antes de correr la colección.

## 3. Correr la colección con Newman

Desde `backend/tests/postman/`:

```bash
newman run "MargenX - Insumos API.postman_collection.json" \
  -e "MargenX - Insumos QA.postman_environment.json" \
  --env-var "accountId_cuentaA=<id de la Cuenta A>" \
  --env-var "token_cuenta_A=<token recién generado de Cuenta A>" \
  --env-var "token_cuenta_B=<token recién generado de Cuenta B>"
```

Salida esperada: **0 failures**, con el detalle de cada assertion (`pm.test`) en verde.

## 4. Reproducibilidad

- El nombre del insumo de prueba incluye `{{$timestamp}}`, así que no colisiona entre corridas.
- La carpeta **"03 - Limpieza"** borra el insumo creado al final del run, para que la base quede como estaba y la colección se pueda correr repetidamente sin acumular datos de prueba.
- Si un run se corta a mitad de camino (ej. por token vencido) y el insumo de prueba queda huérfano, borralo a mano desde Prisma Studio antes del próximo run.

## También desde la app de Postman (opcional, para debug manual)

1. Importá ambos archivos (`File → Import`).
2. Seleccioná el environment "MargenX - Insumos QA" arriba a la derecha.
3. Editá a mano `accountId_cuentaA`, `token_cuenta_A` y `token_cuenta_B` con los valores del paso 1-2.
4. Corré la colección completa con el botón **Run** (Collection Runner), o request por request.
