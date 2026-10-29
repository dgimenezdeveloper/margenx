# Manual de Usuario - Rutas y Roles

A continuación se detalla el acceso a las distintas rutas de MargenX según el rol del usuario:

| Ruta | Descripción | ADMIN | COLLABORATOR |
|---|---|:---:|:---:|
| `/` | Landing Page (Pública) | Redirige a `/dashboard` | Redirige a `/dashboard` |
| `/login` | Inicio de sesión | Acceso | Acceso |
| `/dashboard` | Panel principal y métricas | Acceso total | Acceso (sin métricas financieras) |
| `/insumos` | Catálogo de materias primas | Acceso total | Redirige a `/productos` |
| `/proveedores/cuarentena` | Bandeja de precios anómalos | Acceso total | Redirige a `/productos` |
| `/productos` | Catálogo de productos | Acceso total | Acceso (sin costos ni márgenes) |
| `/productos/nuevo` | Alta de producto y receta | Acceso total | Redirige a `/productos` |
| `/productos/:id` | Ficha técnica y simulador | Acceso total | Acceso (solo precio de venta) |
| `/perfil` | Configuración de la cuenta | Acceso total | Acceso limitado |
| `/*` (Cualquier otra) | Página 404 (No encontrada) | Acceso | Acceso |