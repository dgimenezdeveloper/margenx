# Manual de Usuario — Rutas, Control de Acceso y Roles

A continuación se detalla la matriz de navegación de MargenX según el estado de la sesión y el rol del usuario asignado en la organización (`ADMIN` o `COLLABORATOR`).

Las rutas protegidas exigen sesión activa. Si un usuario no autenticado intenta ingresar a cualquier ruta interna, es redirigido hacia `/login?redirect_url=<ruta>`, preservando el destino original para retornar tras iniciar sesión (ADR-006).

| Ruta | Descripción funcional | Sin sesión | Rol ADMIN | Rol COLLABORATOR |
|---|---|:---:|:---:|:---:|
| `/` | Landing Page informativa e institucional | Acceso público | Redirige a `/dashboard` sin mostrar la landing | Redirige a `/dashboard` sin mostrar la landing |
| `/login` | Pantalla de inicio de sesión (Clerk); con el enlace de una invitación, alta del colaborador | Acceso público | Redirige al destino / dashboard | Redirige al destino / dashboard |
| `/privacidad` | Política de privacidad y tratamiento de datos | Acceso público, con "Volver a la web" | Acceso, con "Ir al panel" | Acceso, con "Ir al panel" |
| `/instalar` | Guía de instalación de la app (PWA) | Acceso público, con "Ingresar" | Acceso, con "Ir al panel" | Acceso, con "Ir al panel" |
| `/dashboard` | Panel principal de control y catálogo | Redirige a `/login` | Acceso total con KPIs financieros y descarga del reporte semanal en PDF | Acceso sin métricas de costo ni margen ni reporte |
| `/insumos` | Despensa de insumos y costos unitarios | Redirige a `/login` | Acceso total, alta, edición y baja | **Bloqueado:** Redirige a `/productos` |
| `/proveedores` | Directorio de proveedores mayoristas | Redirige a `/login` | Acceso total, alta, edición y baja | **Bloqueado:** Redirige a `/productos` |
| `/proveedores/:id` | Ficha y presentaciones de proveedor | Redirige a `/login` | Acceso total, SKU y empaques | **Bloqueado:** Redirige a `/productos` |
| `/proveedores/cuarentena` | Bandeja de precios retenidos | Redirige a `/login` | Acceso total, liberar y rechazar | **Bloqueado:** Redirige a `/productos` |
| `/compras` | Impacto en el margen: a qué proveedor conviene comprarle cada insumo y cuánto mejora el margen | Redirige a `/login` | Acceso total | **Bloqueado:** Redirige a `/productos` |
| `/productos` | Catálogo de productos terminados | Redirige a `/login` | Acceso total con semáforos | Acceso a precios de venta de salón |
| `/productos/nuevo` | Constructor de recetas (BOM) | Redirige a `/login` | Acceso total con simulador | **Bloqueado:** Redirige a `/productos` |
| `/productos/:id` | Ficha técnica y simulador de precio | Redirige a `/login` | Acceso total con simulador | Solo lectura de precio de salón |
| `/ventas` | Turno de caja (abrir o ir al cierre) e historial de ventas (módulo opcional) | Redirige a `/login` | Todas las ventas del comercio; abre el turno | Solo sus ventas; abre el turno |
| `/ventas/nueva` | Venta rápida: productos, total, medio de pago y Cobrar (módulo opcional) | Redirige a `/login` | Acceso | Acceso |
| `/ventas/:id/ticket` | Ticket no fiscal: imprimir, PDF, WhatsApp y anulación (módulo opcional) | Redirige a `/login` | Cualquier venta; anula con el turno abierto | Solo sus ventas; anula las suyas con el turno abierto |
| `/ventas/turnos` | Historial de turnos de caja con la diferencia de cada cierre (módulo opcional) | Redirige a `/login` | Todos los turnos | El abierto y los que abrió, cerró o en los que vendió |
| `/ventas/turnos/:id` | Resumen imprimible del turno y del cierre (módulo opcional) | Redirige a `/login` | Cualquier turno | El abierto y los que abrió, cerró o en los que vendió |
| `/ventas/turnos/:id/cerrar` | Cierre de caja: lo esperado, lo contado y la diferencia (módulo opcional) | Redirige a `/login` | Cierra el turno abierto | Cierra el turno abierto |
| `/ventas/ganancia` | Ganancia real: ventas, costo, ganancia y margen del día, la semana o el mes (módulo opcional) | Redirige a `/login` | Acceso | Sin acceso (vuelve a Productos) |
| `/perfil` | Perfil y configuración comercial | Redirige a `/login` | Margen objetivo global, estado de alertas y del reporte semanal (con su descarga) y Colaboradores | Consulta de cuenta (sin alertas, reporte ni Colaboradores) |
| `/*` (Cualquier otra) | Página 404 (No encontrada) | Redirige a `/login` | Acceso con botón al Dashboard | Acceso con botón al Dashboard |

**Módulo de ventas.** Las rutas `/ventas` existen solo si la cuenta tiene el módulo prendido: si no, muestran la página 404 y el menú no tiene **Ventas**. Detalle en [Ventas, ticket y caja](09-ventas.md).

**Colaborador en una pantalla del administrador.** Las rutas marcadas como **Bloqueado** devuelven al colaborador a `/productos` y el catálogo muestra el aviso "Esa pantalla es solo para el administrador", que se cierra solo o con la X. Recargar `/productos` no lo repite. Detalle en [Rol Colaborador](03-colaborador.md).

**Pantallas públicas con la sesión iniciada.** Las pantallas públicas reconocen la sesión: `/instalar` y `/privacidad` ofrecen **Ir al panel** en lugar de **Ingresar** o **Volver a la web**. Al abrir `/` con la sesión iniciada (por ejemplo, escribiendo el dominio a mano), la app va directo al dashboard sin mostrar antes la landing. Mientras se verifica la sesión, la pantalla queda con el fondo vacío; si la verificación tarda más de 1,5 s (red lenta o un bloqueador), se muestra la versión sin sesión.

En `/login`, los enlaces **Política de privacidad** y **Guía de instalación** están al pie, debajo del formulario.

En **Perfil**:

- El **margen objetivo global** es el margen que MargenX te sugiere al crear un producto nuevo. Cada producto tiene su propio margen mínimo, y las alertas usan el mínimo de cada producto, no el global.
- **Cerrar sesión:** en el celular, con el botón **Cerrar Sesión** al final de Perfil. En la computadora, con **Salir**, arriba a la derecha en todas las pantallas.
- **Política de privacidad e instalación:** en el pie, con **Política** e **Instalar**. En la computadora están en el pie de todas las pantallas con sesión; en el celular, en el pie de Perfil.

<!-- [CAPTURA 360PX SUGERIDA: 02-rutas-bottom-nav-comparativa.webp | Comparativa visual de la barra de navegación inferior móvil: 6 pestañas para ADMIN vs 3 pestañas para COLLABORATOR] -->