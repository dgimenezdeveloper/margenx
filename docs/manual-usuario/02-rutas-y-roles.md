# Manual de Usuario — Rutas, Control de Acceso y Roles

A continuación se detalla la matriz de navegación de MargenX según el estado de la sesión y el rol del usuario asignado en la organización (`ADMIN` o `COLLABORATOR`).

Las rutas protegidas exigen sesión activa. Si un usuario no autenticado intenta ingresar a cualquier ruta interna, es redirigido hacia `/login?redirect_url=<ruta>`, preservando el destino original para retornar tras iniciar sesión (ADR-006).

| Ruta | Descripción funcional | Sin sesión | Rol ADMIN | Rol COLLABORATOR |
|---|---|:---:|:---:|:---:|
| `/` | Landing Page informativa e institucional | Acceso público | Redirige a `/dashboard` sin mostrar la landing | Redirige a `/dashboard` sin mostrar la landing |
| `/login` | Pantalla de inicio de sesión (Clerk) | Acceso público | Redirige al destino / dashboard | Redirige al destino / dashboard |
| `/privacidad` | Política de privacidad y tratamiento de datos | Acceso público, con "Volver a la web" | Acceso, con "Ir al panel" | Acceso, con "Ir al panel" |
| `/instalar` | Guía de instalación de la app (PWA) | Acceso público, con "Ingresar" | Acceso, con "Ir al panel" | Acceso, con "Ir al panel" |
| `/dashboard` | Panel principal de control y catálogo | Redirige a `/login` | Acceso total con KPIs financieros | Acceso sin métricas de costo ni margen |
| `/insumos` | Despensa de insumos y costos unitarios | Redirige a `/login` | Acceso total, alta, edición y baja | **Bloqueado:** Redirige a `/productos` |
| `/proveedores` | Directorio de proveedores mayoristas | Redirige a `/login` | Acceso total, alta, edición y baja | **Bloqueado:** Redirige a `/productos` |
| `/proveedores/:id` | Ficha y presentaciones de proveedor | Redirige a `/login` | Acceso total, SKU y empaques | **Bloqueado:** Redirige a `/productos` |
| `/proveedores/cuarentena` | Bandeja de precios retenidos | Redirige a `/login` | Acceso total, liberar y rechazar | **Bloqueado:** Redirige a `/productos` |
| `/productos` | Catálogo de productos terminados | Redirige a `/login` | Acceso total con semáforos | Acceso a precios de venta de salón |
| `/productos/nuevo` | Constructor de recetas (BOM) | Redirige a `/login` | Acceso total con simulador | **Bloqueado:** Redirige a `/productos` |
| `/productos/:id` | Ficha técnica y simulador de precio | Redirige a `/login` | Acceso total con simulador | Solo lectura de precio de salón |
| `/perfil` | Perfil y configuración comercial | Redirige a `/login` | Margen objetivo global y estado de alertas | Consulta de cuenta (sin alertas) |
| `/*` (Cualquier otra) | Página 404 (No encontrada) | Redirige a `/login` | Acceso con botón al Dashboard | Acceso con botón al Dashboard |

**Pantallas públicas con la sesión iniciada.** Las pantallas públicas reconocen la sesión: `/instalar` y `/privacidad` ofrecen **Ir al panel** en lugar de **Ingresar** o **Volver a la web**. Al abrir `/` con la sesión iniciada (por ejemplo, escribiendo el dominio a mano), la app va directo al dashboard sin mostrar antes la landing. Mientras se verifica la sesión, la pantalla queda con el fondo vacío; si la verificación tarda más de 1,5 s (red lenta o un bloqueador), se muestra la versión sin sesión.

En `/login`, los enlaces **Política de privacidad** y **Guía de instalación** están al pie, debajo del formulario.

<!-- [CAPTURA 360PX SUGERIDA: 02-rutas-bottom-nav-comparativa.webp | Comparativa visual de la barra de navegación inferior móvil: 5 pestañas para ADMIN vs 3 pestañas para COLLABORATOR] -->