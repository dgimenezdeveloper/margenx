# QA — Colección Postman/Newman: Colaboradores (issue #395)

Colección `MargenX - Colaboradores API.postman_collection.json`. Cubre el equipo de la cuenta (ADR-008): `POST/GET/DELETE /api/auth/invitations` y `GET/DELETE /api/auth/users`. El contrato está en `docs/api.md` §3.

## Qué verifica

| Carpeta | Casos |
|---|---|
| 01 - Preparación | `GET /api/auth/me` con el token del ADMIN y guarda su id. |
| 02 - El colaborador no gestiona el equipo | Los cinco endpoints responden **403** al COLLABORATOR. |
| 03 - Validaciones del ADMIN | Correo inválido (400); el cliente no puede mandar `accountId` ni `role` (400); lista de usuarios sin `authProviderId`; lista de invitaciones; revocar una invitación inexistente (404); auto-baja (422); baja de un usuario inexistente (404). |

**No crea invitaciones reales:** cada alta manda un mail desde Clerk. El alta de punta a punta se prueba a mano en staging (ver abajo). La lógica completa, incluidos los metadatos manipulados, la baja en Clerk y los errores de Clerk, la cubren las pruebas de Vitest con Clerk simulado: `backend/src/routes/collaborators.test.ts`, `backend/src/services/invitedUserProvisioning.test.ts` y `backend/src/middlewares/auth.test.ts`.

## Requisitos previos

1. Backend corriendo (`npm run dev` en `backend/`) con la base migrada y el seed cargado.
2. Newman: `npm install -g newman` (o `npx newman`).
3. Dos tokens **de la misma cuenta**, uno de ADMIN y uno de COLLABORATOR. Duran unos 60 segundos; generalos justo antes de correr, desde `backend/`:

   ```bash
   npx tsx scripts/get-test-token.ts panaderia-admin
   npx tsx scripts/get-test-token.ts panaderia-colab
   ```

## Ejecutar

Desde `backend/tests/postman/`:

```bash
./run-tests-colaboradores.sh <token ADMIN> <token COLLABORATOR>
```

Salida esperada: **0 failures**. La colección no modifica datos: se puede repetir sin limpiar nada.

## Prueba manual en staging (`dev.margenx.tech`)

La pide la estrategia de pruebas de la issue. Usá una casilla de prueba del equipo, nunca la de un comercio real.

1. Entrá como ADMIN de Química GyJ y abrí **Perfil → Colaboradores**.
2. Invitá a la casilla de prueba. Debe aparecer en **Invitaciones pendientes** y llegar el mail de Clerk.
3. Abrí el enlace del mail: `/login` muestra **Creá tu acceso a MargenX**. Completá el alta.
4. Al entrar, el invitado es COLLABORATOR de Química GyJ: ve productos y precios de venta, y no ve costos, márgenes, insumos ni proveedores. En Perfil no aparece la sección Colaboradores.
5. Como ADMIN, la persona pasa a **Colaboradores activos** y la invitación deja de estar pendiente.
6. Dale de baja con confirmación. Al intentar entrar de nuevo, no puede (su usuario de Clerk se borró).
7. Invitá otra vez y revocá la invitación antes de aceptarla: el enlace del mail deja de funcionar.

Requisito en Clerk: el alta por invitación tiene que estar habilitada en la instancia (vale tanto el modo público como el restringido, *Restricted*, que solo admite invitados). `APP_BASE_URL` del backend define a dónde lleva el enlace (`infra/vps/docker-compose.prod.yml`).
