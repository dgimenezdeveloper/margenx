# Protocolo de Pruebas In-Situ en Dispositivos Móviles (360px) — Sprint 3

**Proyecto:** MargenX

**Issue:** #126 — [SPRINT3-QA-01] Protocolo de Pruebas In-Situ en Dispositivos Móviles (360px) con Comercios Piloto (#83)

**Responsable de QA:** Leandro Herrera

**Estado del documento:** En preparación — protocolo redactado, pendiente de ejecución presencial

**Última actualización:** 2026-10-09

---

## 1. Objetivo

Validar, con teléfonos reales y en las condiciones operativas reales del
mostrador, la ergonomía de la interfaz de MargenX en una resolución de
**360px de ancho** — la que ya se usa como base mobile-first en el resto del
proyecto, pero que hasta ahora solo se verificó en emuladores de navegador y
en la suite E2E de Playwright (viewport simulado, sin dispositivo físico ni
red móvil real).

Este protocolo es el **complemento humano** de dos suites automatizadas ya
existentes, no un reemplazo:

- `frontend/tests/e2e/rbac-security.spec.ts` (issue #127) audita por código
  que un colaborador nunca reciba datos financieros en la red ni en el DOM.
  Este protocolo confirma, con un colaborador real operando el teléfono real,
  que la experiencia visual resultante además **se siente** correcta — sin
  parpadeos, sin elementos cortados, sin ambigüedad para alguien sin contexto
  técnico.
- Los demás specs de `tests/e2e/` verifican funcionalidad en un viewport
  emulado de Chromium. Ninguno reproduce teclados táctiles reales, redes
  móviles reales ni la presión de atender a un cliente parado enfrente.

## 2. Alcance

### Comercios piloto

| Comercio | Rol a probar | Credenciales |
| --- | --- | --- |
| Panadería Central | ADMIN (dueño/encargado) | `admin.panaderia@hotmail.com` |
| Panadería Central | COLLABORATOR (empleado de mostrador) | `colab.panaderia@hotmail.com` |
| Química GyJ | ADMIN (dueño/encargado) | a confirmar con el responsable del comercio el día de la visita |

Mismas cuentas reales de Clerk que usa el resto de la suite E2E del
proyecto (ver `frontend/tests/e2e/README.md`) — **no** los usuarios
ficticios `*@seed.example.test` de `docs/qa/seed-data-comercios.md`, que no
tienen sesión real y no sirven para loguearse en la app desplegada.

### Entorno

Se prueba contra el **entorno productivo real** (`https://margenx.tech`),
no contra `localhost`. El objetivo es la experiencia que el comercio piloto
va a usar de verdad, con su propia conexión (wifi del local o datos
móviles), no un servidor de desarrollo en la red del equipo.

### Dispositivos

Como mínimo un teléfono Android y uno iOS, ambos con un ancho de pantalla
en modo retrato de **360px CSS** o el más cercano disponible (la mayoría de
los Android de gama media rondan 360-412px; iPhone SE/mini rondan 375px).
Registrar en la bitácora (sección 7) el modelo exacto, el ancho real en
píxeles CSS (`window.innerWidth` desde la consola remota, o el dato del
fabricante) y el navegador usado (Chrome, Safari, o el navegador del
sistema).

### Fuera de alcance

- Pruebas de carga, performance de red o stress testing.
- Validación de endpoints de API directamente (cubierto por las colecciones
  de `backend/tests/postman/`).
- Cualquier escenario que ya esté cubierto 1:1 por un spec de Playwright
  existente y que no dependa de un dispositivo físico real.

## 3. Precondiciones y materiales

- [ ] Coordinar fecha y horario con el dueño/encargado de Panadería Central,
      en un momento real de atención al público (no una demo vacía — el
      Gherkin pide validar "mientras se atiende en mostrador").
- [ ] Conseguir el consentimiento explícito del dueño para registrar fotos
      y, si es posible, un video corto de cada caso (necesario para el DoD
      "evidencia fotográfica" y para el acta de conformidad).
- [ ] Confirmar que el comercio tiene conectividad (wifi propio o datos
      móviles) — no depender de la red del equipo de desarrollo.
- [ ] Llevar al menos dos teléfonos distintos (ver sección 2) cargados o con
      cargador a mano.
- [ ] Tener a mano las credenciales de la tabla de la sección 2 (no
      escribirlas en ningún documento compartido públicamente).
- [ ] Llevar este documento impreso o accesible offline, más una plantilla
      de bitácora (puede ser la tabla de la sección 7 en papel o en el celular
      del encargado de QA) para anotar resultados sin depender de que el
      celular de prueba tenga batería o conexión en ese momento.
- [ ] Revisar que no haya un PR abierto con cambios de UI sin mergear a
      `develop`/producción que puedan alterar lo que se está probando a mitad
      de la sesión.

## 4. Casos a validar en caliente

Los tres casos del Alcance Técnico de la issue #126, en formato Gherkin
para mantener la misma convención que `docs/qa/casos-prueba-sprint1.md`.
A diferencia de ese documento, acá el "Cuando"/"Entonces" describe una
interacción física, no una llamada HTTP — por eso cada caso incluye además
una guía paso a paso y qué fotografiar.

### TC-INSITU-01: Carga rápida de nuevo costo de harina mientras se atiende en mostrador

```gherkin
Escenario: Actualizar el costo de un insumo bajo presión de atención real
  Dado un encargado de Panadería Central autenticado como ADMIN en su teléfono
  Y un cliente real esperando a ser atendido en el mostrador
  Cuando el encargado navega a "/insumos" con una sola mano
  Y busca "Harina de trigo 000 Olavarriense" con el buscador
  Y toca la tarjeta del insumo para abrir el modal de edición
  Y actualiza el campo de costo con el nuevo valor
  Y guarda el cambio
  Entonces el modal debe cerrarse y el listado debe reflejar el nuevo costo
  Y la operación completa no debe demandar más de 2 interacciones de scroll
  Y el encargado no debe necesitar usar la segunda mano en ningún momento
```

**Guía de ejecución:**
1. Parado frente al mostrador, sin apoyar el teléfono en ninguna superficie.
2. Cronometrar desde que se abre `/insumos` hasta que el nuevo costo queda
   guardado y visible en el listado.
3. Repetir una vez más con un insumo distinto, para descartar que el primer
   intento haya sido favorecido por la práctica.
4. Fotografiar: el listado de `/insumos` en el teléfono real, el modal de
   edición abierto, y el toast de confirmación tras guardar.
5. Preguntarle al encargado, con sus propias palabras, si el flujo le
   resultó más lento o más incómodo que anotarlo en un papel — registrar la
   respuesta textual en la bitácora (sección 7), no solo "sí/no".

**Qué registrar como Fail:** cualquier toque que no responda de inmediato,
cualquier texto cortado o botón fuera de la pantalla visible sin hacer
scroll horizontal, o si el encargado necesita usar las dos manos para
completar el flujo.

### TC-INSITU-02: Consulta de precio de venta por un colaborador sin filtración de márgenes

```gherkin
Escenario: Un colaborador de mostrador consulta precios en su propio teléfono
  Dado un colaborador de Panadería Central autenticado como COLLABORATOR
  Cuando navega a "/productos" y luego a "/dashboard" en su teléfono real
  Entonces en ningún momento debe ver un número seguido de "%"
  Y en ningún momento debe ver la palabra "Costo" junto a un valor monetario
  Y el precio de venta al público debe ser siempre legible sin hacer zoom
  Y no debe notar ningún parpadeo de datos que luego desaparecen
```

**Guía de ejecución:**
1. Loguearse con `colab.panaderia@hotmail.com` directamente en el teléfono
   del colaborador (no en el del encargado de QA), para que la prueba
   refleje su uso real.
2. Navegar lentamente por `/productos` (lista completa) y `/dashboard`,
   dejando que la página cargue por completo antes de scrollear.
3. Prestar atención especial al instante inicial de carga (antes de que
   lleguen los datos): un "parpadeo" donde brevemente se vea `NaN%` o un
   campo de costo y después desaparezca es un Fail, aunque el estado final
   sea correcto — este es justo el síntoma que corrige la issue #149, y este
   protocolo es la forma de confirmar en un dispositivo real que no quedó
   ningún caso sin cubrir.
4. Fotografiar: `/productos` y `/dashboard` completos, scrolleando para
   cubrir toda la pantalla si el contenido no entra en una sola captura.

**Qué registrar como Fail:** cualquier aparición, aunque sea momentánea, de
`NaN%`, un campo de costo, o un margen — y cualquier mensaje de error
visible en pantalla.

### TC-INSITU-03: El teclado táctil virtual no tapa los botones de acción en modales bottom-sheet

```gherkin
Escenario: Completar un formulario en un modal bottom-sheet con el teclado abierto
  Dado un usuario ADMIN autenticado en su teléfono real
  Cuando abre un modal de tipo bottom-sheet con campos de texto o numéricos
  Y toca un campo de entrada, haciendo que el teclado táctil se despliegue
  Entonces los botones de acción del modal (ej. "Guardar", "Cancelar")
    deben seguir siendo visibles o alcanzables con scroll dentro del modal
  Y ningún campo obligatorio debe quedar oculto detrás del teclado
  Y el usuario no debe necesitar cerrar el teclado para encontrar el botón de guardar
```

**Modales a cubrir como mínimo** (todos son bottom-sheet en viewport mobile):
- `/insumos`: alta y edición de insumo (campo de costo numérico).
- `/insumos`: modal de "Asociar empaque de proveedor" (tamaño de bulto y
  precio, dos campos numéricos seguidos — es el que más área de teclado
  ocupa).
- `/productos/nuevo` y `/productos/:id`: formulario de producto y el
  simulador financiero (solo rol ADMIN).

**Guía de ejecución:**
1. Para cada modal de la lista, tocar el último campo de texto/numérico del
   formulario (el más abajo en la pantalla) para forzar el peor caso.
2. Con el teclado desplegado, verificar sin cerrar el teclado si el botón
   de guardar es visible o accesible con un scroll corto dentro del modal.
3. Probarlo en los dos teléfonos (Android/iOS): el comportamiento del
   teclado y el `viewport` con teclado abierto difiere entre plataformas.
4. Fotografiar o grabar un video corto de cada modal con el teclado abierto.

**Qué registrar como Fail:** el botón de guardar queda completamente fuera
de la pantalla sin ninguna señal de que hay que scrollear, o el usuario
necesita cerrar el teclado como único modo de acceder al botón.

## 5. Criterio de aceptación general (Gherkin de la issue)

```gherkin
Escenario: Validación de usabilidad en teléfono de 360px de ancho
  Dado un dispositivo móvil real en el comercio piloto
  Cuando el usuario opera la aplicación con una sola mano
  Entonces la barra inferior de navegación debe ser fácilmente alcanzable con el pulgar
  Y ningún modal debe presentar desbordamiento horizontal ni elementos inaccesibles
```

Verificar explícitamente, en cada caso de la sección 4 y de forma
transversal al resto de la navegación:

- La `BottomNav` se alcanza con el pulgar sosteniendo el teléfono con una
  sola mano, sin tener que reacomodar el agarre.
- Ningún modal ni página genera scroll horizontal (deslizar hacia los
  costados no debe revelar contenido cortado).
- Ningún texto queda truncado de forma que pierda significado (distinto de
  un `...` intencional con el texto completo disponible al tocar).

## 6. Registro de incidencias

Cada Fail detectado durante la sesión se carga como una GitHub Issue
individual, siguiendo la misma convención que el resto del proyecto:

- Título con el prefijo `[SPRINT3-QA-01-FIX]` seguido de una descripción
  breve del problema.
- Referenciar esta issue (#126) y el caso de prueba (`TC-INSITU-0X`) que lo
  detectó.
- Adjuntar la foto o el video tomado en el momento, el modelo de teléfono y
  el navegador.
- Etiqueta `Frontend` (o la que corresponda) + `needs-triage` para que el
  equipo la priorice en el siguiente sprint planning.
- Estas incidencias son las que alimentan el ítem del DoD "Tareas de ajuste
  visual cargadas al backlog si se detectaron fricciones" — no corregirlas
  en el momento ni como parte de esta misma issue.

## 7. Evidencia a recolectar (bitácora de sesión)

Completar esta tabla durante la ejecución presencial. Sirve como insumo
directo para el acta de conformidad (sección 8).

| Caso | Comercio | Dispositivo | Resultado (Pass/Fail) | Tiempo / Observación | Foto/Video adjunto |
| --- | --- | --- | --- | --- | --- |
| TC-INSITU-01 | | | | | |
| TC-INSITU-02 | | | | | |
| TC-INSITU-03 | | | | | |
| Criterio general (sección 5) | | | | | |

Agregar una fila por cada dispositivo adicional probado. Para cada Fail,
anotar también el número de la issue de GitHub creada en la sección 6.

## 8. Acta de conformidad

La Estrategia de Pruebas de la issue #126 pide un acta firmada y
versionada en `docs/retrospectivas/`. Ese documento se redacta **después**
de la sesión presencial, a partir de los resultados de la bitácora
(sección 7) y siguiendo el formato ya establecido en
`docs/retrospectivas/acta-cierre-sprint-2.md` (encabezado con proyecto,
fecha, hora, participantes; cuerpo con hitos y conclusiones). No se incluye
en este documento porque todavía no existe la sesión que debe describir —
este protocolo es la guía previa a la ejecución, no el registro posterior.

## 9. Checklist de cierre de la issue #126

- [ ] Sesión presencial ejecutada con el dueño/encargado de Panadería
      Central, en horario real de atención.
- [ ] Sesión equivalente coordinada con Química GyJ (confirmar alcance con
      el responsable del comercio: puede no tener mostrador de atención
      directa al público, ajustar el caso TC-INSITU-01 si corresponde).
- [ ] Bitácora de la sección 7 completa, con foto o video por cada caso.
- [ ] Toda incidencia detectada cargada como GitHub Issue individual
      (sección 6), vinculada a la issue #126.
- [ ] Acta de conformidad redactada, firmada y versionada en
      `docs/retrospectivas/` (sección 8).
- [ ] Este documento actualizado con el estado final ("Ejecutado") y la
      fecha real de la sesión en el encabezado.
- [ ] PR abierto hacia `develop` con este documento y, si corresponde, el
      acta de conformidad, con CI en verde.
