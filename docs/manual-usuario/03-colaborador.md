# Manual de Usuario — Rol Colaborador

Este documento describe la experiencia operativa y los límites de visibilidad para los usuarios con rol **Colaborador** (personal de mostrador, cajeros y encargados de salón).

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
| **Dashboard (`/dashboard`)** | Métricas consolidadas, KPIs de riesgo e histograma | Solo catálogo monitoreado con precios de venta al público |
| **Catálogo (`/productos`)** | Acceso total, costos, márgenes y botón *Nuevo Producto* | Solo nombres y precios de venta finales cobrados al público |
| **Ficha Técnica (`/productos/:id`)** | Ficha completa, desglose de recetas, cantidades y simulador | Ficha de lectura: nombre, precio de venta y lista conceptual de insumos (sin cantidades ni costos) |
| **Despensa (`/insumos`)** | Acceso total, costos unitarios, alta y edición | **Bloqueado:** Redirige forzosamente a `/productos` |
| **Proveedores (`/proveedores`)** | Lista de proveedores, presentaciones y contratos | **Bloqueado:** Redirige forzosamente a `/productos` |
| **Cuarentena (`/proveedores/cuarentena`)**| Bandeja de resolución de anomalías | **Bloqueado:** Redirige forzosamente a `/productos` |
| **Perfil (`/perfil`)** | Configuración de margen y estado de alertas n8n | Datos de usuario y comercio; sin umbrales ni alertas |

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
- Desaparecen los accesos a **Insumos** y **Proveedores**.
- Se mantienen accesibles únicamente **Inicio** (`/dashboard`), **Productos** (`/productos`) y **Perfil** (`/perfil`).