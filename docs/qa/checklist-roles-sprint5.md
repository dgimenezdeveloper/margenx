# Checklist de recorrido por pantalla — Admin y Colaborador

Checklist para recorrer `dev.margenx.tech` con la cuenta Demo, primero como **Administrador** y después como **Colaborador**, y detectar fallas de UX/UI, de funcionalidad o de diseño que las pruebas automáticas no cubren. Pensado para usarse desde un dispositivo real (Android o iPhone); la guía de dispositivos (`guia-dispositivos-sprint5.md`) cubre el "cómo" de instalar y probar en cada plataforma.

Por cada hallazgo, registrar: fecha, pantalla, rol/dispositivo, qué se esperaba vs. qué pasó, y una severidad estimada (crítico / importante / menor). Los hallazgos pasan a la matriz de defectos del reporte de calidad del sprint correspondiente (`reporte-calidad-sprintN.md`) para que el equipo decida su seguimiento.

---

## 0. Login y landing ya autenticado

- [ ] Con sesión abierta, entrar a `/` a mano (escribiendo la URL) → tiene que mandar directo a `/dashboard` **sin** mostrar un instante la landing pública de visitante.
- [ ] Probar el login con el Demo admin y, por separado, con el Demo colaborador.

## 1. Dashboard (`/dashboard`)

| | Admin | Colaborador |
|---|---|---|
| Acceso | Total, con métricas financieras | Acceso, **sin** métricas financieras |

- [ ] Como Admin, anotar qué widgets/números financieros aparecen.
- [ ] Como Colaborador, confirmar que esos mismos widgets **no** aparecen (no que estén vacíos — que directamente no se rendericen, o se reemplacen por algo apropiado al rol).
- [ ] 360px: nada se corta, sin scroll horizontal.
- [ ] Consola del navegador sin errores rojos.

## 2. Insumos (`/insumos`) — Solo Admin

- [ ] Como Colaborador, escribir `/insumos` a mano en la barra → redirige a `/productos` (no error, no pantalla en blanco, no saca a `/login`).
- [ ] Como Colaborador, confirmar que el link a "Insumos" **no** aparece en el menú (ni compu ni celu).
- [ ] Como Admin, recorrido normal: catálogo, alta/edición de insumo, proveedores y empaques vinculados.

## 3. Proveedores (`/proveedores`, `/proveedores/:id`, `/proveedores/cuarentena`) — Solo Admin

- [ ] Como Colaborador, las tres rutas a mano → todas redirigen a `/productos`.
- [ ] Como Colaborador, el link "Proveedores" no aparece en el menú.
- [ ] Como Admin: lista de proveedores, ficha de detalle de uno (`/proveedores/:id`). Ahí probar puntualmente:
  - [ ] Tocar **Hacer predeterminada** en una presentación de un insumo con varios proveedores → confirmar que **solo** esa presentación queda marcada "Predeterminada" y las de los demás insumos de ese proveedor (si tenía varios) **no pierden** su propia marca.
  - [ ] Editar el código/descripción de una presentación y guardar → mismo chequeo: no debería tocar el estado "Predeterminada" de las otras presentaciones del proveedor.
  - [ ] Cuarentena: liberar y rechazar un precio retenido, confirmar que el diálogo de error (si se simula un fallo cortando la conexión) se muestra adentro del diálogo, no se tapa.

## 4. Productos (`/productos`, `/productos/:id`, `/productos/nuevo`)

| | Admin | Colaborador |
|---|---|---|
| Catálogo | Total | Acceso, sin costos ni márgenes |
| Ficha técnica (`/productos/:id`) | Total | Solo precio de venta |
| Alta (`/productos/nuevo`) | Total | Redirige a `/productos` |

- [ ] Como Colaborador, `/productos/nuevo` a mano → redirige a `/productos`.
- [ ] Como Colaborador, abrir la ficha de un producto y mirar la receta: **no** debe mostrar cantidades por ingrediente, costo unitario ni subtotal, y **no** debe haber botones de editar/eliminar en la receta — solo la composición conceptual y el precio de venta.
- [ ] Como Admin, la misma receta: cantidades, costos, subtotales y acciones de editar/eliminar, todo visible.
- [ ] Confirmar que un Colaborador no puede disparar ninguna mutación (ni por UI ni, si se sabe mirar la pestaña Red del navegador, por la API) — debería estar bloqueado en ambos lados.

## 5. Perfil (`/perfil`)

| | Admin | Colaborador |
|---|---|---|
| Acceso | Total (margen objetivo global, alertas automáticas, config del comercio) | Limitado |

- [ ] Como Colaborador, confirmar que **no** aparecen: margen objetivo global, alertas automáticas (n8n), ni los ajustes del comercio reservados al admin.
- [ ] Comparar ambas pantallas lado a lado (o una después de otra) para que la diferencia quede clara en el registro del hallazgo.

## 6. Navegación general / menú

- [ ] Colaborador: el menú (arriba en compu, abajo en celu) nunca muestra Insumos, Proveedores ni "Nuevo producto", en ninguna de las dos plataformas.
- [ ] Con sesión iniciada, entrar a una ruta inventada → página 404 **con el menú del panel** y botón para volver al dashboard (a diferencia de un Visitante, que en esa misma URL termina en `/login`).

## 7. Transversal, repetir en cada pantalla de arriba

- [ ] 360px de ancho: sin cortes, sin scroll horizontal.
- [ ] Consola del navegador sin errores en rojo (en el celu, si no se puede inspeccionar, al menos confirmar que la pantalla no se queda en blanco ni trabada).
- [ ] Todos los textos en español; ningún mensaje técnico crudo del navegador si algo falla (por ejemplo cortando el wifi a mitad de una acción).
- [ ] Si el celu está en modo oscuro, que no haya texto o botones con mal contraste.
