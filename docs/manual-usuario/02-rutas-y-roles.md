# Manual de Usuario — Rutas, Control de Acceso y Roles

A continuación se detalla la matriz de navegación de MargenX según el estado de la sesión y el rol del usuario asignado en la organización (`ADMIN` o `COLLABORATOR`).

Las rutas protegidas exigen sesión activa. Si un usuario no autenticado intenta ingresar a cualquier ruta interna, es redirigido hacia `/login?redirect_url=<ruta>`, preservando el destino original para retornar tras iniciar sesión (ADR-006).

| Ruta | Descripción funcional | Sin sesión | Rol ADMIN | Rol COLLABORATOR |
|---|---|:---:|:---:|:---:|
| `/` | Landing Page informativa e institucional | Acceso público | Redirige a `/dashboard` | Redirige a `/dashboard` |
| `/login` | Pantalla de inicio de sesión (Clerk) | Acceso público | Redirige al destino / dashboard | Redirige al destino / dashboard |
| `/privacidad` | Política de privacidad y tratamiento de datos | Acceso público | Acceso | Acceso |
| `/instalar` | Guía de instalación de la app (PWA) | Acceso público | Acceso | Acceso |
| `/dashboard` | Panel principal de control y catálogo | Redirige a `/login` | Acceso total con KPIs financieros | Acceso sin métricas de costo ni margen |
| `/insumos` | Despensa de insumos y costos unitarios | Redirige a `/login` | Acceso total, alta, edición y baja | **Bloqueado:** Redirige a `/productos` |
| `/proveedores` | Directorio de proveedores mayoristas | Redirige a `/login` | Acceso total, alta, edición y baja | **Bloqueado:** Redirige a `/productos` |
| `/proveedores/:id` | Ficha y presentaciones de proveedor | Redirige a `/login` | Acceso total, SKU y empaques | **Bloqueado:** Redirige a `/productos` |
| `/proveedores/cuarentena` | Bandeja de precios retenidos | Redirige a `/login` | Acceso total, liberar y rechazar | **Bloqueado:** Redirige a `/productos` |
| `/productos` | Catálogo de productos terminados | Redirige a `/login` | Acceso total con semáforos | Acceso a precios de venta de salón |
| `/productos/nuevo` | Constructor de recetas (BOM) | Redirige a `/login` | Acceso total con simulador | **Bloqueado:** Redirige a `/productos` |
| `/productos/:id` | Ficha técnica y simulador de precio | Redirige a `/login` | Acceso total con simulador | Solo lectura de precio de salón |
| `/perfil` | Perfil y configuración comercial | Redirige a `/login` | Configuración de margen y alertas | Consulta de cuenta (sin alertas) |
| `/*` (Cualquier otra) | Página 404 (No encontrada) | Redirige a `/login` | Acceso con botón al Dashboard | Acceso con botón al Dashboard |

<!-- [CAPTURA 360PX SUGERIDA: 02-rutas-bottom-nav-comparativa.webp | Comparativa visual de la barra de navegación inferior móvil: 5 pestañas para ADMIN vs 3 pestañas para COLLABORATOR] -->