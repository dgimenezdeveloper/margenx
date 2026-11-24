# Manual de Usuario — Rol Colaborador

Este documento describe la experiencia operativa y los límites de visibilidad para los usuarios con rol **Colaborador** (personal de mostrador, cajeros y encargados de salón).

El colaborador entra por invitación del administrador: cómo invitarlo y darlo de baja está en [Colaboradores](05-colaboradores.md).

## Propósito y Filosofía de Diseño

En los comercios gastronómicos y de manufactura, el personal de atención al público necesita consultar rápidamente los precios de venta actualizados para cobrar y atender a los clientes, pero **no debe tener acceso a la información financiera confidencial del negocio**: costos de materia prima, márgenes de rentabilidad, fórmulas técnicas ni acuerdos comerciales con distribuidores.

MargenX implementa un blindaje de doble capa:
1. **Server-Side (API):** El middleware de backend `sanitizeFinancialData` intercepta las respuestas JSON y purga de raíz los campos sensibles (`cost`, `marginAmount`, `marginPercent`, `minMarginPercent`, `quantity`, `suppliers`), configurando además cabeceras `Cache-Control: private, no-store`.
2. **Client-Side (UI):** La interfaz elimina por completo los componentes de margen (`MarginBadge`), simuladores financieros y accesos a rutas administrativas.

---

## Visibilidad y Accesibilidad por Rol

| Módulo o Vista | Administrador (Dueño) | Colaborador (Mostrador / Salón) |
|---|:---:|:---:|
| **Landing pública (`/`)** | Redirige al Dashboard | Redirige al Dashboard |
| **Dashboard (`/dashboard`)** | Métricas consolidadas, KPIs de riesgo e histograma | Solo catálogo monitoreado con precios de venta al público (solo productos a la venta) |
| **Catálogo (`/productos`)** | Acceso total, costos, márgenes y botón *Nuevo Producto*, borradores incluidos | Solo nombres y precios de venta finales cobrados al público, de los productos a la venta |
| **Ficha Técnica (`/productos/:id`)** | Ficha completa, desglose de recetas, cantidades y simulador | Ficha de lectura: nombre, precio de venta y lista conceptual de insumos (sin cantidades ni costos) |
| **Alta de producto (`/productos/nuevo`)** | Constructor de recetas con simulador | **Bloqueado:** vuelve a `/productos` con aviso |
| **Despensa (`/insumos`)** | Acceso total, costos unitarios, alta y edición | **Bloqueado:** vuelve a `/productos` con aviso |
| **Proveedores (`/proveedores` y `/proveedores/:id`)** | Lista de proveedores, presentaciones y contratos | **Bloqueado:** vuelve a `/productos` con aviso |
| **Cuarentena (`/proveedores/cuarentena`)**| Bandeja de resolución de anomalías | **Bloqueado:** vuelve a `/productos` con aviso |
| **Impacto en el margen (`/compras`)** | Proveedores más baratos y su efecto en el margen | **Bloqueado:** vuelve a `/productos` con aviso |
| **Ventas (`/ventas`, módulo opcional)** | Cobra, ve todas las ventas del comercio, anula cualquiera del turno abierto, y abre y cierra la caja | Cobra y ve sus ventas y sus tickets, sin costos ni márgenes; anula las suyas con el turno abierto; abre y cierra la caja y ve el arqueo de sus turnos ([Ventas, ticket y caja](09-ventas.md)) |
| **Perfil (`/perfil`)** | Configuración de margen, estado de las alertas automáticas y sección Colaboradores | Datos de usuario y comercio; sin umbrales, alertas ni Colaboradores |

### Solo productos a la venta

El colaborador ve únicamente los productos que se venden: los que tienen receta y un precio de venta mayor que $0. Los **borradores** (productos que el dueño todavía no terminó de cargar, que pueden tener precio $0) no aparecen ni en el panel ni en el catálogo, y su ficha no se abre, así nadie le dice a un cliente que algo cuesta $0. Si todavía no hay ningún producto a la venta, el catálogo dice **"Todavía no hay productos a la venta"** y el panel, "Todavía no hay productos a la venta.".

### Aviso al abrir una pantalla del administrador

Si el colaborador abre una pantalla bloqueada (por ejemplo, desde un enlace guardado o escribiendo `/insumos` en la barra de direcciones), la app lo lleva al catálogo de productos y muestra el aviso **"Esa pantalla es solo para el administrador"** con el texto "Te trajimos al catálogo de productos.". El aviso se cierra solo a los pocos segundos o con la **X** (en el celular, también deslizándolo). Recargar el catálogo no lo vuelve a mostrar. Ninguna pantalla bloqueada llega a mostrarse, ni siquiera por un instante.

<!-- [CAPTURA 360PX SUGERIDA: 03-colaborador-productos.webp | Pantalla /productos navegada por un COLLABORATOR mostrando únicamente nombres y precios de venta al público, sin costos ni porcentajes] -->

---

## Ficha de Producto para el Colaborador

Al abrir la ficha de un producto terminado (ej. *Medialunas de manteca*):
- Puede verificar la denominación oficial y el precio vigente de venta al público para atención de mostrador.
- En la sección **Composición**, visualiza únicamente qué materias primas componen el producto a título informativo (útil para responder consultas sobre alérgenos o composición básica a los clientes), **sin conocer los gramos utilizados, los costos unitarios ni los subtotales de la tanda**.
- No dispone de botones para agregar insumos, modificar cantidades, simular márgenes ni eliminar la ficha.

<!-- [CAPTURA 360PX SUGERIDA: 03-colaborador-detalle-producto.webp | Ficha técnica vista por un COLLABORATOR con inputs estáticos de precio y receta conceptual sin cantidades numéricas] -->

---

## Navegación Móvil Adaptada

En smartphones, la barra inferior fija de navegación (`BottomNav`) adapta sus accesos según el rol autenticado:
- Desaparecen los accesos a **Insumos**, **Proveedores** e **Impacto en el margen**.
- Quedan **Inicio** (`/dashboard`), **Productos** (`/productos`), **Ventas** (`/ventas`, solo con el módulo de ventas) y **Perfil** (`/perfil`). Son 4 o menos, así que entran todas con el nombre completo y no hace falta **Más**.
- Arrastrando el dedo hacia la derecha se abre el mismo panel del administrador, con sus pantallas, el **Modo oscuro** y **Salir** (ver [Rutas y roles](02-rutas-y-roles.md)).