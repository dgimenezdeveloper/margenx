# Hoja de ruta de MargenX después de la cursada

**Fuente:** plan del Sprint 7 aprobado por el equipo el 22/11/2026 (sección 6), ADR-010 y la tabla de alcance del SAD (`docs/Arquitectura-Software-(SAD).md` §1). Las fechas son **estimadas**: se revisan en cada Sprint Review con los comercios piloto.

Cada versión tiene un milestone en GitHub con una issue épica. Las épicas se refinan en historias chicas, una por rol, antes de entrar a un sprint.

| Versión | Fecha estimada | Milestone y épica |
|---|---|---|
| **v1.0.0** | 05/12/2026 | Release de la cursada (#400) |
| **v1.1** | Diciembre de 2026 | [v1.1](https://github.com/dgimenezdeveloper/margenx/milestone/1) · #481 |
| **v1.2** | Diciembre de 2026 a enero de 2027 | [v1.2](https://github.com/dgimenezdeveloper/margenx/milestone/2) · #484 |
| **Lanzamiento Android** | Enero de 2027 | [Lanzamiento Android](https://github.com/dgimenezdeveloper/margenx/milestone/3) · #482 |
| **v1.3 en adelante** | 2027 | [v1.3](https://github.com/dgimenezdeveloper/margenx/milestone/4) · #483 |

---

## v1.0.0: entrega de la cursada (05/12/2026)

Control de márgenes completo: insumos, recetas, margen en vivo, proveedores, ingesta de listas con cuarentena, recálculo en cascada y alertas. Compras sugeridas por **impacto en el margen**, reporte semanal en PDF, invitación de colaboradores y **módulo de ventas** (ticket no fiscal, caja por turnos y ganancia real) detrás del control de módulos por plan y por cuenta (ADR-010). Se publica con el release #400.

## v1.1: stock y reposición (diciembre de 2026)

Épica #481.

- **Stock de insumos descontado por receta** desde las ventas.
- **Carga inicial** de stock por comercio e **ingreso de mercadería**.
- **Reposición en Compras con cantidades reales**: vuelve el pedido sugerido, ahora con el consumo real. `POST /api/purchasing/order-preview`, deprecado en la v1.0.0, se reutiliza para esto o se elimina en esta versión (`docs/api.md` §10).
- Ya asignadas al milestone: monitor de disponibilidad con aviso a Discord (#394), compartir el ticket como imagen por WhatsApp (#459) y movimientos de caja con el fondo del turno siguiente (#461).

## v1.2: backoffice y planes (diciembre de 2026 a enero de 2027)

Épica #484 (era el borrador "[EPIC] Backoffice interno…" del tablero; `docs/propuesta-proyecto.md` §13.1).

- **Backoffice** para el equipo de MargenX: alta y suspensión de comercios, con un rol de plataforma aislado de `ADMIN` y `COLLABORATOR`.
- **Planes Basic, Pro y Business** sobre el control de módulos (`PLAN_FEATURES`, ADR-010), **período de prueba** y **límites** por plan. Qué plan trae el módulo de ventas se decide acá.
- **Borrado de cuenta**, requisito de Google Play para el lanzamiento en Android (ver abajo).

## Lanzamiento Android (enero de 2027)

Épica #482, bloqueada por el borrado de cuenta de #484.

- Publicación en **Google Play como Trusted Web Activity**: la PWA actual envuelta con Bubblewrap o PWABuilder, sin reescribir la app.
- Antes, la **prueba cerrada** que exige Google a las cuentas personales nuevas (ver abajo).

## v1.3 en adelante (2027)

Épica #483. Sin orden decidido: cada línea se prioriza con los comercios.

- Cobro de suscripciones.
- **Envío de pedidos a proveedores** por mail con n8n, sobre la reposición con cantidades de la v1.1.
- Facturación electrónica de **ARCA** (hoy el ticket es no fiscal, ADR-010).
- **iOS** con Capacitor y funciones nativas.
- Avisos **push**.
- **Moneda en dólares** y cotización ARS/USD.
- **Multi-sucursal** dentro de una misma cuenta.

### Fase 2 sin versión asignada

Siguen en la tabla de alcance del SAD §1 como Fase 2 y se asignan a una versión cuando el equipo las priorice: permisos granulares y roles intermedios (invitar a otro `ADMIN` y cambiar roles, ADR-007 y ADR-008) y el aviso al rechazar un precio en cuarentena (*propuesta*, ADR-005).

---

## Requisitos de Play Store

Verificados en la documentación oficial de Google el **23/11/2026**. Las reglas de Google Play cambian: se vuelven a verificar antes de enviar la app a revisión.

| Requisito | Qué pide Google | Qué implica para MargenX |
|---|---|---|
| **Prueba cerrada** ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/14151465)) | Las cuentas de desarrollador **personales creadas después del 13/11/2023** tienen que hacer una prueba cerrada con **al menos 12 testers inscriptos durante 14 días seguidos** antes de pedir el acceso a producción. Si un tester se sale y vuelve, su cuenta de días empieza de cero. | Suma al menos 14 días al calendario y necesita 12 testers reales (comercios piloto, familia, compañeros). Conviene arrancarla apenas esté el borrado de cuenta. No aplica si se publica con una cuenta de organización. |
| **Formulario de seguridad de los datos** ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/10787469)) | Obligatorio para toda app publicada en Google Play, también en las pistas de prueba cerrada, abierta y de producción. Solo están exentas las apps que están únicamente en la prueba interna. | Declarar lo que hoy se guarda: correo y nombre (Clerk), datos del comercio, insumos, recetas, ventas y caja. |
| **Política de privacidad** ([Política de datos del usuario](https://support.google.com/googleplay/android-developer/answer/10144311)) | Obligatoria aunque la app no junte datos. Va en el campo de Play Console **y** dentro de la app, en una URL **pública, activa, sin restricción geográfica y que no sea PDF**. Tiene que nombrar al desarrollador, dar un contacto de privacidad, decir qué datos usa y comparte, cómo los protege y cuánto tiempo los guarda y cómo los borra. | Hoy existe `/privacidad` (pública). Hay que revisar que cubra todos los puntos, sobre todo la conservación y el borrado. |
| **Borrado de cuenta** ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/13327111)) | Si la app permite crear cuentas, tiene que ofrecer **dentro de la app** un camino visible para borrar la cuenta y sus datos, y además una **página web** para pedirlo sin abrir la app. Al borrar la cuenta se borran sus datos; lo que se conserve (seguridad, fraude, obligaciones legales) se informa. | Va en la v1.2 (#484). Definir qué pasa con los colaboradores y las ventas al borrar la cuenta de un comercio. |
| **Nivel de API objetivo** ([Android Developers](https://developer.android.com/google/play/requirements/target-sdk)) | Desde el **31/08/2026**, las apps nuevas y sus actualizaciones tienen que apuntar a **Android 16 (API 36)** o superior. | Configurar el `targetSdkVersion` del proyecto que genera Bubblewrap o PWABuilder en 36 o más, según la regla vigente al publicar. |

---

## Riesgos y dependencias

| Riesgo o dependencia | Afecta a | Mitigación |
|---|---|---|
| La carga inicial de stock es trabajo para cada comercio: sin ella, el stock no sirve | v1.1 | Validarla con los comercios piloto antes de construirla; ofrecer carga por planilla como en los insumos |
| El stock cambia el dominio de insumos y recetas (migraciones sobre tablas existentes) | v1.1 | Ensayo de las migraciones sobre una copia de producción (`docs/runbook-release.md`) |
| El rol de plataforma del backoffice abre una vía de escalada de privilegios | v1.2 | Revisión de seguridad del middleware antes del merge (#484) |
| Borrado de cuenta antes de publicar en Android | Lanzamiento Android | #482 bloqueada por #484 |
| 14 días de prueba cerrada con 12 testers | Lanzamiento Android | Reclutar testers durante la v1.2 |
| Reglas de Google Play que cambian | Lanzamiento Android | Volver a verificar esta tabla antes de enviar la app a revisión |
| ARCA depende de certificados y puntos de venta de cada comercio | v1.3 | Se prioriza solo si los comercios lo piden; mientras tanto, ticket no fiscal |
| El cobro de suscripciones necesita los planes y límites | v1.3 | Va después de la v1.2 |

---

## Lámina para la presentación final

Texto para la lámina "Hoja de ruta" de la presentación de la entrega final (#401):

> **Hacia dónde va MargenX**
>
> - **v1.0.0 · 05/12/2026:** control de márgenes, compras por impacto en el margen, reporte semanal y ventas con ticket.
> - **v1.1 · diciembre:** stock descontado por receta y reposición con cantidades reales.
> - **v1.2 · diciembre a enero:** backoffice, planes Basic, Pro y Business, período de prueba y borrado de cuenta.
> - **Android · enero de 2027:** MargenX en Google Play.
> - **2027:** suscripciones, pedidos a proveedores, facturación de ARCA, iOS y multi-sucursal.
