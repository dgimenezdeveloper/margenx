# Manual de Usuario - Rol Colaborador

Este manual describe qué información y acciones pueden ver y realizar los usuarios con el rol de colaborador dentro de MargenX.

## Visibilidad por rol

| Área | Administrador | Colaborador |
| --- | --- | --- |
| Receta de producto | Puede ver cantidades, costos, subtotales y acciones de edición | No ve cantidades ni costos, ni botones de edición o eliminación |
| Perfil | Puede ver margen objetivo global, alertas automáticas y configuraciones del comercio | No ve margen objetivo global ni alertas automáticas |
| Acciones de administración | Puede crear, editar y eliminar elementos del catálogo | No puede realizar mutaciones de administración |

## Receta de producto

Para un colaborador, la receta del producto queda visible solo como composición conceptual del producto, sin exponer:

- cantidades por ingrediente
- costo base unitario
- subtotal por insumo
- acciones de eliminación o edición de la receta

Esto evita que información financiera sensible quede expuesta a un rol que solo necesita operar con la operación comercial day by day.

## Perfil y configuración

En el perfil del colaborador se ocultan los elementos de administración:

- margen objetivo global
- alertas automáticas (n8n)
- ajustes del comercio reservados al dueño o administrador

## Reglas de acceso

- Los colaboradores solo pueden consultar información permitida por su rol.
- Las mutaciones de administración quedan bloqueadas en la API y en la UI.
- La información sensible sigue protegida incluso si un usuario intenta inspeccionar la respuesta JSON o la navegación del producto.

## Resultado esperado

La experiencia de un colaborador queda enfocada en:

- consultar el catálogo de productos
- revisar la composición sin datos financieros
- operar sin acceso a configuración interna o de margen del negocio
