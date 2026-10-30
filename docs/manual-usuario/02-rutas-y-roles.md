# Manual de Usuario - Rutas y Roles

A continuación se detalla el acceso a las distintas rutas de MargenX según el rol del usuario. Las rutas del panel exigen sesión iniciada: sin sesión, redirigen a `/login`.

| Ruta | Descripción | Sin sesión | ADMIN | COLLABORATOR |
|---|---|:---:|:---:|:---:|
| `/` | Landing Page (Pública) | Acceso | Redirige a `/dashboard` | Redirige a `/dashboard` |
| `/login` | Inicio de sesión | Acceso | Acceso | Acceso |
| `/privacidad` | Política de datos (Pública) | Acceso | Acceso | Acceso |
| `/instalar` | Guía de instalación de la app (Pública) | Acceso | Acceso | Acceso |
| `/dashboard` | Panel principal y métricas | Redirige a `/login` | Acceso total | Acceso (sin métricas financieras) |
| `/insumos` | Catálogo de materias primas | Redirige a `/login` | Acceso total | Redirige a `/productos` |
| `/proveedores/cuarentena` | Bandeja de precios anómalos | Redirige a `/login` | Acceso total | Redirige a `/productos` |
| `/productos` | Catálogo de productos | Redirige a `/login` | Acceso total | Acceso (sin costos ni márgenes) |
| `/productos/nuevo` | Alta de producto y receta | Redirige a `/login` | Acceso total | Redirige a `/productos` |
| `/productos/:id` | Ficha técnica y simulador | Redirige a `/login` | Acceso total | Acceso (solo precio de venta) |
| `/perfil` | Configuración de la cuenta | Redirige a `/login` | Acceso total | Acceso limitado |
| `/*` (Cualquier otra) | Página 404 (No encontrada) con el menú del panel y botón al dashboard | Redirige a `/login` | Acceso | Acceso |
