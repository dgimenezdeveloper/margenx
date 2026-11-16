# 8. Alta de Colaboradores por Invitación de Clerk con Alta en el Primer Inicio de Sesión

* **Estado:** Aceptado
* **Fecha:** 2026-11-16
* **Decisores:** Darío Giménez (Tech Lead). El alcance lo confirmó el equipo el 14/11/2026 para el Sprint 6.
* **Issue:** #395 (SPRINT6-BE-08)
* **Relacionado con:** ADR-001 (Clerk), ADR-003 (n8n satélite), ADR-007 (roles fijos), `docs/propuesta-proyecto.md` §13.1 (Concierge MVP), `docs/api.md` §3

---

## Contexto y Planteamiento del Problema

Hasta el Sprint 6, el alta de usuarios seguía el criterio *Concierge MVP* de la propuesta (§13.1): el equipo de MargenX creaba el usuario en Clerk y su fila en `User` (cuenta y rol) a mano. Para el dueño de un comercio, sumar a un empleado nuevo dependía del equipo.

Se necesita que el ADMIN invite a su personal desde la app sin abrir dos agujeros:

1. Que el cliente elija la cuenta o el rol del invitado (DoD §6: el `accountId` sale siempre del usuario autenticado).
2. Que un usuario dado de baja vuelva a entrar.

## Opciones Consideradas

1. **Tabla propia de invitaciones con tokens y mail desde n8n.** Control total, pero suma un modelo, una migración, el vencimiento de tokens y un flujo de mail propio en plena semana de congelamiento.
2. **Organizaciones de Clerk.** Resuelven invitaciones y membresías, pero duplican en Clerk el modelo de cuentas y roles que ya vive en PostgreSQL (`Account`, `User.role`), y obligan a migrar los usuarios existentes.
3. **Invitaciones de aplicación de Clerk con metadatos públicos, y alta en el primer inicio de sesión.** Clerk genera el enlace con ticket y verifica el correo; el backend fija la cuenta y el rol en `publicMetadata`, que solo se escribe con la clave secreta.

Para el mail se evaluaron dos variantes de la opción 3:

* **Mail de Clerk** (`notify: true`): sin código, pero en la instancia de desarrollo sale desde un dominio compartido (`accounts.dev`) con el prefijo "[Development]", en inglés y sin marca. En la prueba local llegó a spam.
* **Mail propio por n8n** (`notify: false`): el mismo canal de las alertas de margen (ADR-003): Brevo desde la casilla verificada de margenx.tech, en español y con la plantilla de MargenX.

## Decisión

Se adopta la **opción 3**.

* `POST /api/auth/invitations` (solo ADMIN) crea la invitación con `publicMetadata: { accountId, role: 'COLLABORATOR' }`, donde `accountId` sale de `req.user`, y `notify: false`. El cuerpo solo acepta `email`. El enlace lleva a `<APP_BASE_URL>/login`, que con el parámetro `__clerk_ticket` muestra el componente `<SignUp>` de Clerk, el que procesa el ticket.
* **El mail lo manda MargenX:** el backend despacha el enlace al webhook `collaborator-invitation` de n8n con el secreto compartido, y n8n lo envía por Brevo con la plantilla de MargenX. n8n solo acepta enlaces `https` de aceptación de Clerk y no toca la base (ADR-003).
* **Si el mail no sale, la invitación igual queda:** el backend responde `emailSent: false` y el ADMIN copia el enlace desde Perfil ("Copiar enlace") para mandarlo por WhatsApp u otro medio. El enlace se muestra solo al ADMIN de la cuenta y nunca se registra en los logs.
* Al aceptar, Clerk copia los metadatos al usuario. En su primera llamada a la API, `authMiddleware` no encuentra fila en `User`, lee los metadatos con la clave secreta (`services/invitedUserProvisioning.ts`) y crea el `User`. Solo lo crea si el rol es `COLLABORATOR` y la cuenta existe y está activa. En cualquier otro caso responde 401 como antes.
* `DELETE /api/auth/users/:id` borra el usuario **también en Clerk**. Si solo se borrara la fila, sus `publicMetadata` lo volverían a dar de alta en el siguiente inicio de sesión. Borrarlo en Clerk además cierra sus sesiones y elimina sus datos personales del proveedor.
* El único rol invitable es `COLLABORATOR`. Invitar a otro ADMIN y cambiar roles siguen en la Fase 2 (ADR-007).

## Consecuencias

### Positivas
* El dueño suma y quita empleados sin depender del equipo de MargenX.
* Sin migraciones ni tablas nuevas: la invitación vive en Clerk y la membresía sigue siendo la fila `User`.
* La cuenta y el rol nunca viajan desde el navegador: `publicMetadata` no se puede modificar desde el cliente de Clerk (a diferencia de `unsafeMetadata`).

### Costos Asumidos
* El primer inicio de sesión de un invitado suma una llamada a la Backend API de Clerk (`users.getUser`). Solo pasa una vez por usuario.
* Las invitaciones pendientes se listan desde Clerk y se filtran por `accountId` en el backend, porque la API de Clerk no filtra por metadatos. Con una sola instancia de Clerk por entorno, el listado recorre todas las pendientes de ese entorno (páginas de 500).
* Si Clerk no responde, invitar, revocar y dar de baja devuelven 502 y no aplican cambios.
* El mail depende de que el workflow `invitacion-colaborador.json` esté publicado en n8n y de `N8N_INVITATION_WEBHOOK_URL` en cada backend. Sin eso, las invitaciones funcionan solo con "Copiar enlace".
* El enlace de aceptación es una credencial de alta: quien lo tenga entra como colaborador de esa cuenta hasta que se acepte, se revoque o venza. Por eso solo lo ve el ADMIN y no se registra.
* La instancia de Clerk tiene que permitir el alta por invitación (modo público o *Restricted*).

### Alcance que sigue en Concierge MVP
La creación de **cuentas** (comercios) y de su primer ADMIN no cambia: la sigue haciendo el equipo, como indica la propuesta §13.1.
