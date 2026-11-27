# Evidencia de la #497: recorrida del 26 y 27/11

Capturas de antes y después, lado a lado, tomadas con Playwright y Chromium a 360 px y a 1280 px, con `deviceScaleFactor` 2.

- **Antes:** `develop` en `a8e2fe8`.
- **Después:** la rama de la #497.
- **Datos:** locales de ejemplo de Panadería Central, con los correos ficticios `@seed.example.test` (`docs/qa/evidencias/README.md`).
- **Sesión:** backend real y Clerk simulado, como administrador o como colaborador según la pantalla.

El número al final de cada archivo es el draft del tablero (244 a 266).

| Archivo | Pantalla · rol · tamaño · tema | Hallazgos |
|---|---|---|
| `01-perfil-margen-y-textos-grises-oscuro-245-246-259.png` | Perfil · administrador · escritorio · oscuro | 245, 246, 259 |
| `02-perfil-porcentaje-claro-262.png` | Perfil · administrador · escritorio · claro | 262 |
| `03-perfil-nombre-y-correo-360-248.png` | Perfil · administrador · 360 · claro | 248 |
| `04-colaboradores-correos-360-249.png` | Perfil, Colaboradores · administrador · 360 · claro | 249 |
| `05-panel-colaborador-atencion-y-voseo-360-250-252-259.png` | Panel · colaborador · 360 · claro | 250, 252, 259 |
| `06-productos-colaborador-subtitulo-oscuro-251.png` | Productos · colaborador · 360 · oscuro | 251 |
| `07-ventas-medio-de-pago-y-cantidad-360-257.png` | Ventas · administrador · 360 · claro | 257 |
| `08-turnos-fecha-y-hora-360-263.png` | Turnos de caja · administrador · 360 · claro | 263 |
| `09-ficha-nombre-del-insumo-360-264.png` | Ficha del producto · colaborador · 360 · oscuro | 264, 259 |
| `10-nueva-venta-1-kg-360-256.png` | Nueva venta · colaborador · 360 · claro | 256 |
| `11-compras-filas-y-color-por-estado-360-253-261.png` | Compras · administrador · 360 · claro | 253, 261 |
| `12-compras-cajas-y-color-por-estado-escritorio-258-261.png` | Compras · administrador · escritorio · oscuro | 258, 261 |
| `13-ficha-barra-de-arriba-escritorio-265.png` | Ficha del producto · colaborador · escritorio · claro | 265 |
| `14-ventas-barra-de-arriba-escritorio-referencia-265.png` | Ventas · colaborador · escritorio · claro (referencia para el 265) | 265 |
| `15-perfil-colaborador-una-columna-escritorio-266.png` | Perfil · colaborador · escritorio · claro | 266 |
| `16-ventas-colaborador-del-turno-360-260.png` | Ventas, "Del turno" · colaborador · 360 · claro | 260 |
| `17-panel-admin-estilo-oracion-escritorio-259.png` | Panel · administrador · escritorio · claro | 259 |

Medido en el navegador con estos datos:
- **265:** la barra de la ficha va de 105 a 1161 px a 1280, igual que en Ventas y Turnos. Antes iba de 57 a 1209.
- **axe:** en Perfil (administrador y colaborador), Panel, Productos, ficha, Ventas, Turnos y Compras, a 360 y 1280 px, en claro y oscuro, había 13 combinaciones con violaciones serias o críticas (`color-contrast` y `label-content-name-mismatch`). Ahora no hay ninguna.
