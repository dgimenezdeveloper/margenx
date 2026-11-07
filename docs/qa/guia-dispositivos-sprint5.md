# Guía de recorrido en dispositivos reales — Android e iPhone

`dev.margenx.tech` es público, así que no hace falta túnel ni nada especial: desde el celular, se entra directo a la URL con datos móviles o wifi, como cualquier visitante real.

Esta guía cubre el "cómo" (instalar, inspeccionar, qué es distinto de probar en un celular de verdad); el checklist por pantalla (`checklist-roles-sprint5.md`) cubre el "qué" (Admin/Colaborador, pantalla por pantalla). Se recomienda una pasada completa en Android y otra en iPhone; si algo raro aparece en una plataforma, conviene confirmar si también pasa en la otra antes de anotarlo como específico de esa plataforma.

---

## Por qué conviene el dispositivo real (no solo el celular simulado de la compu)

Hay cosas que un navegador de escritorio con "vista móvil" no puede mostrar:

- El teclado real tapando el formulario (foco automático, `Enter`/`Espacio`, validación con `aria-invalid`).
- El flujo real de "Agregar a pantalla de inicio" / "Instalar app".
- Cómo se ve el ícono y el splash al abrir la app ya instalada, en modo standalone (sin barra de direcciones).
- El notch/isla dinámica del iPhone y si algún botón queda tapado o pegado al borde.
- Gestos propios del sistema (deslizar atrás en iPhone, botón atrás de Android) chocando con la navegación de la app.
- Comportamiento real sin conexión (modo avión).

## 1. Navegación normal (antes de instalar nada)

- **Android:** Chrome. **iPhone:** Safari — son las combinaciones que la propia guía de instalación de MargenX recomienda; si hay tiempo, conviene probar también con otro navegador (Firefox/Edge en Android, Chrome en iPhone), aunque no es obligatorio.
- Entrar a `https://dev.margenx.tech` y recorrer el checklist por pantalla con la cuenta Demo (Admin primero, Colaborador después).
- Prestar atención especial a los formularios (alta de proveedor, alta de insumo/producto, editar presentación): tocar un campo, confirmar que el teclado no tape el campo ni el botón de guardar, que el tipo de teclado sea el que corresponde (numérico para teléfono/precio, el normal para texto), y que al enviar con un error el foco salte solo al primer campo con problema.
- **Scroll del fondo en modales largos:** en `/insumos`, hacer scroll en la lista y abrir el modal de editar un insumo o "Asociar otro empaque" (son modales largos). Con el modal abierto, intentar arrastrar el fondo: el catálogo de atrás tiene que quedar completamente congelado, solo se mueve el contenido interno del modal. Al cerrar el modal con "Cancelar" o la "X", la pantalla no debe saltar arriba del todo: tiene que quedar en el mismo punto de scroll de antes de abrirlo. Esta regresión fue específica de iOS Safari en su momento (PR #195); conviene confirmarla en ambas plataformas.

## 2. Instalar la PWA

Seguir los pasos de `/instalar` (es la misma guía que vería cualquier visitante) y confirmar que coinciden con lo que se ve en el dispositivo real:

**Android · Chrome:**
1. Abrir MargenX en Chrome, tocar el menú (⋮) arriba a la derecha.
2. Elegir "Instalar app" o "Agregar a pantalla de inicio".
3. Confirmar la instalación.
- [ ] ¿Aparece la opción con ese nombre o similar? ¿En el mismo lugar que describe la guía?
- [ ] ¿Queda el ícono correcto en la pantalla de inicio (no un ícono genérico roto)?

**iPhone · Safari:**
1. Abrir la web en Safari, tocar el botón de compartir (abajo).
2. Elegir "Agregar a Inicio" (puede estar más abajo en la lista).
3. Confirmar el nombre y tocar "Agregar".
- [ ] ¿Coincide con las capturas reales que ya tiene la guía para iPhone?
- [ ] ¿Queda el ícono correcto?

## 3. Abrir la app ya instalada (modo standalone)

- [ ] Abrir la app desde el ícono de la pantalla de inicio, no desde el navegador.
- [ ] Confirmar que abre **sin** la barra de direcciones del navegador (modo app).
- [ ] iPhone: confirmar que ningún botón o texto queda tapado por el notch/isla dinámica o por la barra inferior del sistema.
- [ ] Iniciar sesión, cerrar la app completamente (no solo minimizarla) y volver a abrirla: en la app instalada, cerrar la app no cierra la sesión (la duración la maneja Clerk) — confirmar que entra directo sin pedir login de nuevo.
- [ ] Probar cambiar el tema claro/oscuro del sistema operativo y volver a abrir la app: que el color de fondo/tema acompañe sin parpadeo blanco feo al abrir.

### 3.1 El enlace "Ajustar" del mail de alerta

Escenario de aceptación de la issue: con la app instalada, cerrar y volver a abrir mantiene la sesión, y el enlace "Ajustar" del mail de alerta de margen lleva directo al producto (`/productos/:id`). Según ADR-0006, esto depende de que la app esté en modo standalone con sesión viva de Clerk; en el navegador común (pestaña normal, no instalada) rigen las reglas de cierre por inactividad de 30 minutos y por cierre del navegador.

- Si llega una alerta real de margen bajo durante la prueba: abrir el mail en el celular, cerrar la app instalada si estaba abierta, y tocar "Ajustar". En Android, si la app está instalada, puede abrir directo en ella; en iOS, las apps "Agregadas a Inicio" no pueden capturar enlaces del sistema (limitación de la plataforma), así que el enlace abre en el navegador predeterminado.
- Si no llega ninguna alerta a tiempo, se puede aproximar el mecanismo (no el flujo completo) abriendo manualmente un link a `/productos/:id` desde fuera del navegador (una nota, un mensaje a uno mismo) con la app cerrada, y registrando exactamente qué pasa: qué se abre, si pide login, a qué pantalla llega. Esta aproximación no sustituye la prueba con un mail real — solo confirma el mecanismo de sesión y redirección del lado del navegador/app.

## 4. Sin conexión (modo avión)

- [ ] Con la app ya instalada y usada al menos una vez online, activar modo avión (confirmar que no quede wifi reconectado dentro del modo avión).
- [ ] Abrir la app: una navegación que falle por falta de red debería mostrar la pantalla "Sin conexión" de MargenX (texto en español, prolijo), no un error crudo del navegador.
- [ ] Con la app ya abierta, una acción que falle por falta de red (por ejemplo cargar un listado) debería mostrar un aviso en pantalla con botón de reintentar, también en español.
- [ ] Desactivar el modo avión y confirmar que al reconectar se puede seguir usando la app con normalidad.

## 5. Mirar la consola de verdad (opcional pero valioso si es posible)

Esto requiere conectar el celular a una computadora una vez, pero después queda andando:

**Android (con cualquier compu con Chrome):**
1. En el celular: Ajustes → Acerca del teléfono → tocar 7 veces "Número de compilación" para activar Opciones de desarrollador.
2. Ajustes → Opciones de desarrollador → activar "Depuración USB".
3. Conectar el celular a la compu por cable, aceptar el permiso que aparece en el celular.
4. En la compu, abrir Chrome y entrar a `chrome://inspect#devices`.
5. El celular aparece listado con las pestañas abiertas de Chrome — "inspect" sobre la pestaña de MargenX abre las devtools apuntando al celular.

**iPhone (necesita una Mac con Safari):**
1. En el iPhone: Ajustes → Safari → Avanzado → activar "Inspector web".
2. Conectar el iPhone a la Mac por cable.
3. En Safari de la Mac: menú Desarrollo → elegir el iPhone → la pestaña de MargenX.

Sin esto, igual se puede detectar la mayoría de los problemas a simple vista (pantalla en blanco, texto cortado, botón que no responde); conviene registrar el hallazgo aunque no se vea el error técnico exacto.

## Registro de hallazgos

Por cada hallazgo: fecha, pantalla, Android o iPhone, rol (Admin/Colaborador), qué se esperaba vs. qué pasó, y de ser posible una captura o video corto. Pasa a la matriz de defectos del reporte de calidad del sprint correspondiente.
