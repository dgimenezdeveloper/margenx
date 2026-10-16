# Bitácora de sesión — Pruebas In-Situ 360px (Química GyJ)

> Comercio: Química GyJ (sustituye a "Panadería Central" en la issue #174 —
> Panadería Central no es un local real con el que haya relación directa;
> Química GyJ sí lo es). Ver nota de cambio de alcance al final.

**Fecha de la sesión:** 16/10/2026
**Hora de inicio / fin:** 21:35 a 21:51 hs (aprox.)
**Lugar:** Química GyJ
**Responsable de QA presente:** Leandro Herrera
**Encargado/dueño de Química GyJ presente:** Leandro Herrera
**Estado del documento:** Para revisión

## Dispositivos usados

| # | Modelo | SO / Navegador | Ancho real (CSS px) |
|---|---|---|---|
| 1 | Motorola Edge 50 Pro | Android | — |
| 2 | iPhone (modelo a confirmar) | iOS | — |

## Casos ejecutados

### TC-INSITU-01 — Carga rápida de costo de insumo con una sola mano
Insumo probado: **Pasta suavi** (de $15.400 → $16.000).

| Intento | Tiempo total | ¿Usó 2 manos? | Scrolls necesarios | Comentario textual del encargado |
|---|---|---|---|---|
| 1 | No cronometrado — "fluido, sin trabarse", respuesta automática/instantánea | No, una sola mano | — | "Tardé lo que tardaría en buscar el insumo y modificar el precio" |

**Resultado (Pass/Fail):** Pass
**Fotos/video adjuntos:** Captura de `/insumos` (ADMIN) con toast "✓ Costo de Pasta suavi actualizado a $16.000" y el listado mostrando el nuevo valor.

### TC-INSITU-02 — Consulta de precio por un colaborador sin fuga de márgenes
Usuario: credencial COLLABORATOR real de Química GyJ.

| Pantalla | ¿Apareció algún "%"? | ¿Apareció "Costo" + valor? | ¿Parpadeo de datos al cargar? |
|---|---|---|---|
| /productos | No | No — solo "Precio: $X" de atención al público | No |
| /dashboard | No | No — solo "Precio: $X" de atención al público | No |

**Resultado (Pass/Fail):** Pass
**Comentario textual del colaborador:** "Nada raro, todo súper bien y agradable."
**Fotos adjuntos:** Capturas de `/dashboard` y `/productos` logueado como "Colaborador" — en ambas se ve el catálogo con precios de atención al público únicamente, sin "%" ni "Costo". Bonus: el bottom nav de colaborador no muestra la pestaña "Insumos" (solo Inicio/Productos/Perfil), a diferencia del admin.

### TC-INSITU-03 — Teclado virtual no tapa botones en bottom-sheet
| Modal | Botón "Guardar" visible/alcanzable con teclado abierto | Plataforma (Android/iOS) |
|---|---|---|
| /insumos — alta/edición de insumo | Sí (ver caso 1) | Android |
| /insumos — asociar empaque de proveedor | Sí — "Cancelar" y "Asociar Empaque" quedan visibles arriba del teclado, sin cerrarlo ni scrollear | Android |
| /insumos — asociar empaque de proveedor | Sí — mismo resultado, botones visibles arriba del teclado | iOS (iPhone) |

**Resultado (Pass/Fail):** Pass (teclado no tapa botones, en ambas plataformas)
**Fotos/video adjuntos:** Captura Android del modal "Asociar otro empaque" con botones visibles sobre el teclado. Captura iOS del mismo modal con el mismo resultado.

**🔴 Hallazgo adicional (fuera del Gherkin de este caso, pero relevante al criterio general): scroll de fondo NO bloqueado en iOS Safari.**
Al scrollear dentro de un modal en el iPhone, el fondo de la página (detrás del overlay) se mueve junto con el modal. Confirmado en **dos modales distintos**: "Asociar otro empaque" y la ficha de edición de insumo — por lo que afecta al hook compartido `useBodyScrollLock`, no a un componente aislado.

Patrón observado: el fondo se mueve **solo si el contenido del modal tiene scroll propio** (es decir, si el modal es más alto que la pantalla). Si el modal entra completo sin necesitar scroll, el fondo se desplaza una sola vez (al tocar/arrastrar) y después queda congelado — no sigue moviéndose. En Android esto no pasa en ningún caso.

Causa probable: la app usa `document.body.style.overflow = 'hidden'` para bloquear el scroll de fondo, técnica conocida por no ser suficiente en iOS Safari cuando el scroll ocurre dentro de un contenedor con su propio scroll interno (necesita además `position: fixed` en el body como workaround). No se detecta con la suite E2E de Playwright porque corre en Chromium, no en Safari real — es justo el tipo de cosa que este protocolo in-situ existe para atrapar.

**Reportado verbalmente al Scrum Master (Darío Giménez).** Queda a su criterio la carga y el seguimiento en el tablero.

## Criterio general (BottomNav + sin overflow horizontal)

**Resultado (Pass/Fail):** Pass
**Observaciones:** La barra de navegación inferior se alcanza cómoda con el pulgar en una sola mano; no se observó scroll horizontal en ningún momento de la sesión.

## Nota de cambio de alcance respecto a la issue #174

La issue #174 nombra "Panadería Central" como comercio piloto, heredado del
protocolo de Sprint 3 (issue #126). Panadería Central es un registro del
seed con datos reales de precios tomados de internet, pero sin un local
físico ni un responsable real con el que coordinar una visita y obtener
una firma de conformidad genuina. Química GyJ es un comercio real del
equipo, por lo que la sesión in-situ se ejecutó ahí en su lugar. El
protocolo de Sprint 3 (`docs/qa/protocolo-pruebas-insitu-sprint3.md`,
sección 9) ya contemplaba una sesión equivalente en Química GyJ como sitio
piloto adicional.
