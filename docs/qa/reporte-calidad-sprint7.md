# Reporte de Calidad — Sprint 7

Este documento empieza con el recorrido de cliente en staging del 21/11/2026,
que dio origen a las issues de arreglos del Sprint 7 (`[SPRINT7-QA7-nn]`) y al
reenfoque de Compras sugeridas (`[SPRINT7-R-0n]`). Las demás issues de QA del
Sprint 7 suman sus propias secciones más abajo cuando se ejecuten: axe (#442),
tiempos de búsqueda (#444), Lighthouse (#398) y la regresión final (#399).

## 1. Recorrido de cliente en staging (21/11/2026)

**Estado de esta sección: completa.** Los 28 hallazgos (RC-01 a RC-28) tienen
issue o una decisión de not planned con su motivo (§1.8).

### 1.1 Objetivo

Usar MargenX como lo usaría el dueño de un comercio y como lo usaría su
empleado, de la portada al reporte semanal, para encontrar lo que las pruebas
automáticas y las revisiones de PR no ven: textos que confunden, flujos
partidos y datos que se contradicen. Es la última revisión antes del
congelamiento del 28/11.

### 1.2 Método

- **Ambiente:** `dev.margenx.tech`, con `develop` al 21/11/2026 (Sprint 6
  completo), cuenta **Demo MargenX**, con los roles Administrador y Colaborador.
- **Vistas:** escritorio y emulación a 360 px, en modo claro y oscuro.
- **Contraste con el código:** cada hallazgo se verificó leyendo el componente
  o la ruta responsable en `develop` y se registra con su archivo y línea.
  RC-27 se verificó en el código y no se reprodujo sobre un insumo usado: su
  issue (#426) lo reproduce primero con datos de prueba creados para eso.
- **Fuentes unificadas en la clasificación:**
  - **RC:** este recorrido.
  - **U:** la revisión de usabilidad del equipo del 20/11, en las
    "NOTAS DE REVISION" del tablero.
  - **RV:** los hallazgos importantes (I) de las revisiones de PR del Sprint 6
    que quedaron como condición.
  - **H2:** el defecto del simulador del reporte del Sprint 6
    ([§1.7](reporte-calidad-sprint6.md#17-matriz-de-defectos-fechada)).
- **Capturas:** en [`evidencias/recorrido-cliente/`](evidencias/recorrido-cliente/),
  con el criterio de la issue #365: sin barra de estado, sin fotos de perfil,
  sin correos ni otros datos personales. Las direcciones `.example` de los
  proveedores son ficticias.
- **Reproducciones posteriores:** toda reproducción en staging que pidan las
  issues se hace con datos creados y borrados en la misma prueba, sin modificar
  los datos existentes de la cuenta Demo.

### 1.3 Qué funcionó

Sin hallazgos en:

- ingreso, política de privacidad e instalación;
- 360 px sin scroll horizontal en todas las pantallas recorridas
  ([insumos](evidencias/recorrido-cliente/16-insumos-360.jpg),
  [producto](evidencias/recorrido-cliente/17-producto-360.jpg));
- carga por planilla con válidas, repetidas y con error
  ([captura](evidencias/recorrido-cliente/07-planilla-revision.jpg));
- 409 al borrar un insumo que está en recetas
  ([captura](evidencias/recorrido-cliente/08-insumo-borrar-en-receta-409.jpg));
- alta rápida de insumo desde la receta, con el nombre duplicado bloqueado
  ([captura](evidencias/recorrido-cliente/09-alta-rapida-insumo.jpg));
- simulador de precio (salvo el formato de H2 y el centavo de RC-12);
- aviso de cambios sin guardar;
- recálculo al hacer predeterminada una presentación;
- baja de proveedor con el detalle de lo afectado;
- invitar y revocar colaboradores;
- colaborador sin costos, en la interfaz y en la API;
- redirección del colaborador con aviso cuando abre una pantalla del
  administrador ([captura](evidencias/recorrido-cliente/19-colaborador-redirigido.jpg)).

### 1.4 No cubierto

| Qué | Por qué | Dónde se cubre |
|---|---|---|
| Uso sin red real | No se pudo cortar la red desde el navegador usado. `offline.html` respondió bien | Regresión final (#399), en dispositivo |
| Aviso de versión nueva de la PWA | Requiere un despliegue durante la prueba | Regresión final (#399) |
| `/api/docs` | No estaba desplegado (#393) | #393 y regresión final |

### 1.5 Matriz de hallazgos del recorrido

Severidad: la escala del
[reporte del Sprint 5, §2.6](reporte-calidad-sprint5.md#26-matriz-de-defectos-fechada).
Tipo: **D** defecto, **U** usabilidad.

| ID | Hallazgo | Tipo | Sev. | Dónde | Evidencia | Issue |
|---|---|---|---|---|---|---|
| RC-01 | Jerga técnica en la política de privacidad (ADMIN/COLLABORATOR, slug, tenant) | U | Menor | `privacidad/page.tsx:11, 17` | [captura](evidencias/recorrido-cliente/02-privacidad-jerga.jpg) | #436 |
| RC-02 | Jerga en la portada (RBAC estricto, multi-tenant, Mobile-First 360px, Zero-Click n8n, Anti-Polución) | U | Menor | `app/page.tsx` | [captura](evidencias/recorrido-cliente/01-landing-escritorio.jpg) | #436 |
| RC-03 | "Margen promedio" muestra la mediana; el PDF dice "Margen promedio: … (la mediana)" | U | Menor | `DashboardKpiCards.tsx:130-135` | [captura](evidencias/recorrido-cliente/03-panel-margen-promedio-mediana.jpg) | #430 |
| RC-04 | Tú y vos mezclados ("Aquí tienes", "Haz clic"); Clerk con "¿Has olvidado…?" y "Regístrese" | U | Menor | `dashboard/page.tsx:125`, `HealthDistributionHistogram.tsx:230`, Clerk | [captura](evidencias/recorrido-cliente/15-panel-360-nav-truncada.jpg) | #436 |
| RC-05 | La columna Estado del PDF corta "Pérdid/a" | D | Menor | `reporte-semanal.json`, nodo "Generar Reporte HTML", línea 272 | [captura](evidencias/recorrido-cliente/04-pdf-estado-cortado.png) | #435 |
| RC-06 | Soporte en `contacto@` en mails y PDF; la app dice `soporte@` | D | Menor | `mail-margenx.js:96, 151` y copias en los workflows | — | #435 |
| RC-07 | "Documentación" del pie lleva al repositorio de GitHub | U | Menor | `userManual.ts` | — | Not planned (§1.8) |
| RC-08 | "Se usa en" muestra el precio de venta sin rótulo | U | Menor | `IngredientUpsertSheet.tsx:317-319` | [captura](evidencias/recorrido-cliente/06-insumo-se-usa-en.jpg): muestra la ficha con "Se usa en" plegado, no el precio sin rótulo; verificado en el código | #433 |
| RC-09 | El modal se titula "Actualizar Costo" aunque edita nombre y unidad; el historial compara kg contra litro sin la unidad | U | Menor | `IngredientUpsertSheet.tsx` | [captura](evidencias/recorrido-cliente/05-insumo-historial-kg-a-litro.jpg) | #433 |
| RC-10 | ↓ + Enter antes de que lleguen los resultados abre "Crear nuevo insumo" | D | Menor | `recipe-ingredient-combobox.tsx:60-64, 103-111, 149` | — | #432 |
| RC-11 | "+ + Crear nuevo insumo" | D | Menor | `recipe-ingredient-combobox.tsx:277-278` | [captura](evidencias/recorrido-cliente/09b-crear-nuevo-insumo-doble-mas.png) | #432 |
| RC-12 | Simulador $2.086,54 contra lista $2.086,55 (el frontend no redondea por renglón) | D | Menor | `useRecipeStore.ts:124-129` contra `marginCalculator.ts:51-53` | — | #431 |
| RC-13 | Con mínimo ≥ 60 %, un producto en su mínimo se ve "Superávit" | U | Menor | `marginCalculator.ts:120-139` | [captura](evidencias/recorrido-cliente/10-producto-superavit-en-minimo.jpg) | Not planned (§1.8) |
| RC-14 | Flujo de presentaciones partido en dos pantallas, sin código de artículo en el alta desde el insumo y con nombres distintos para lo mismo | U | Menor | `proveedores/[id]/page.tsx:248`, `PresentationEditDialog.tsx:196` | [captura](evidencias/recorrido-cliente/11-proveedor-detalle-sin-alta.jpg) | #434 |
| RC-15 | "Hacer predeterminado" en la ficha del insumo cambia el costo sin confirmar; en Compras sí confirma | U | Menor | ficha del insumo | — | #434 |
| RC-16 | La confirmación de Compras no dice cuántos productos cambian ni cómo queda el margen | U | Menor | `compras/page.tsx` | [captura](evidencias/recorrido-cliente/13-compras-confirmar-predeterminada.jpg) | #445, #446 |
| RC-17 | La calculadora arranca con 1 bulto por insumo: "Pedido Semanal" de $1.501.131,23 con 28 "producto(s)" que son insumos | U | Menor | `compras/page.tsx:515-518` | [captura](evidencias/recorrido-cliente/14-compras-pedido-1-bulto-c-u.jpg) | #446 |
| RC-18 | "Ahorro potencial por bulto" suma bultos de insumos distintos | U | Menor | `compras/page.tsx:383` | [captura](evidencias/recorrido-cliente/14-compras-pedido-1-bulto-c-u.jpg) | #446 |
| RC-19 | Los botones "Hacer predeterminada" no tienen un nombre accesible distinto por insumo | D | Menor | `compras/page.tsx:~460-467` | — | #446 |
| RC-20 | Perfil dice que el margen global "determinará el umbral de alerta", y las alertas usan el mínimo de cada producto; "Alertas Automáticas (n8n)" | D | Importante | `perfil/page.tsx:163, 202` | — | #429 |
| RC-21 | "tu margen global de ." vacío mientras carga | D | Menor | `productos/nuevo/page.tsx:430-431` | — | #431 |
| RC-22 | "Proveedo…" cortado en el menú inferior a 360 px | U | Menor | `bottom-nav.tsx:17, 40` | [captura](evidencias/recorrido-cliente/15-panel-360-nav-truncada.jpg) | #437 |
| RC-23 | El histograma a 360 px dice "Riesgo" y "Objetivo" | U | Menor | `healthBucket.ts:64, 77` | [captura](evidencias/recorrido-cliente/18-panel-360-claro-histograma.jpg) | #430 |
| RC-24 | El colaborador ve 14 productos en borrador con "Precio: $0,00" | D | Importante | `products.ts:128`, `MonitoredCatalogGrid.tsx:~208`, `productos/page.tsx:~202` | [captura](evidencias/recorrido-cliente/20-colaborador-panel.jpg): muestra el panel del colaborador, no los borradores a $0,00 (quedan más abajo en la lista); verificado en el código | #428 |
| RC-25 | El 409 de invitación no distingue invitación pendiente de cuenta existente | U | Menor | `collaborators.ts:65-72` | — | #437 |
| RC-26 | La confirmación de Liberar de cuarentena no dice costo ni margen; el aviso dice "críticos" | U | Menor | `QuarantineList.tsx:42` | [captura](evidencias/recorrido-cliente/21-cuarentena-liberar.jpg) | #430 |
| RC-27 | Se puede cambiar la unidad de un insumo con recetas y presentaciones: las cantidades y los bultos quedan en la unidad vieja | D | **Grave** | `ingredients.ts:516-566` | Sin captura del defecto: verificado en el código y no reproducido (§1.2). [Historial sin unidad](evidencias/recorrido-cliente/05-insumo-historial-kg-a-litro.jpg), relacionado | #426 |
| RC-28 | Un costo manual deja la presentación predeterminada con otro precio; las tarjetas de proveedores desaparecen hasta recargar | D | Importante | `ingredients.ts:516-566`, `IngredientUpsertSheet.tsx` | — | #427 |

**Resumen:** 1 grave, 3 importantes y 24 menores. 11 defectos y 17 de
usabilidad. Ningún hallazgo de pérdida de datos en lo que ya está guardado.
RC-27 es grave porque cambia el significado de datos existentes sin aviso.

### 1.6 Revisión de usabilidad del equipo (U)

Fuente: "NOTAS DE REVISION" del tablero (20/11/2026). Cada punto quedó dentro
de una issue:

| Sección de las notas | Puntos | Issue |
|---|---|---|
| Insumos: editar la unidad de medida | 1 | #426 |
| Insumos: costo manual con proveedor y tarjetas que desaparecen | 1 | #427 |
| Insumos: modo oscuro (hovers, input de nombre, desplegable de proveedor, paginación) y aviso de la planilla | 6 | #433 |
| Productos: cursor de la cruz, hovers en oscuro y aviso de crear o eliminar | 4 | #432 |
| Proveedores: tabla, columna Acciones, estrella con tooltip, confirmación, modal de quitar presentación y texto de baja | 5 | #434 |
| Proveedores: impedir la baja con insumos predeterminados | 1 | Not planned (§1.8) |
| Compras: tabla, información poco entendible y hover de "Ver cuarentena" | 3 | #446 |
| Perfil: botones duplicados y "(n8n)" | 2 | #429 |
| Login: error en inglés de Clerk | 1 | #436 |

### 1.7 Hallazgos de revisión de PR y del Sprint 6 (RV y H2)

| ID | Qué falta | Issue |
|---|---|---|
| `[RV371-I2]` | La prueba de integración de unidades no corre en el CI | #438 |
| `[RV374-I1]` | La cobertura del backend no se mide en el CI | #438 |
| `[RV375-I1]` | Tiempo de respuesta con y sin búsqueda en staging | #444 |
| `[RV381-I1]` | Fuente equivocada del margen ponderado en la especificación | #443 |
| `[RV385-I1]` | "Variaciones recientes" en 0 para el colaborador y ante un error | #433 |
| `[RV386-I1]` | Prueba del estado de margen con mínimo distinto de 30 % | #440 |
| `[RV387-I1]` | Pruebas automáticas de accesibilidad con axe | #442 |
| `[RV410-I1]` | Prueba de respuestas fuera de orden en la lista paginada | #441 |
| `[RV415-I1]` | Cuerpo del JSON del reporte semanal en `docs/api.md` | #443 |
| `[RV419-I1]` | Nombres de estado viejos fuera de los componentes del PR | #430 |
| `[RV422-I1]` | El webhook compara el precio sin redondear | #439 |
| `[RV371-I3]` | Unidades y `PUT` de costo verificados en staging | Caso nuevo de #399 |
| `[RV376-I1]` | Pantalla completa en los bottom sheets | Not planned (§1.8) |
| H2 | Simulador fuera del formato es-AR | #431 |

### 1.8 Not planned, con su motivo

| Origen | Tema | Motivo |
|---|---|---|
| `[RV376-I1]` | Pantalla completa en los bottom sheets | El diálogo ya se adaptó, y cambiarlo es riesgo antes del congelamiento |
| U | Impedir la baja de un proveedor con insumos predeterminados | El diálogo actual informa y el insumo conserva su costo. El texto se simplifica en #434 |
| RC-13 | "Superávit" con mínimo ≥ 60 % | Es la regla acordada en #367. Se aclara en el manual |
| RC-07 | "Documentación" lleva a GitHub | El manual se entrega en #401 y el enlace apunta a esa versión |
| `[RV371-I3]` | Verificación en staging | Sin issue propia: es un caso nuevo de la regresión final (#399) |
| Datos | Restos de pruebas en la cuenta Demo de staging | Sin issue propia: el reseed se suma a #400, antes de la defensa |

### 1.9 Datos de staging

La cuenta Demo de `dev.margenx.tech` tiene restos de pruebas anteriores:
"Medialunas rellenas" a $13 (margen −84.768 %), "Champinión" con 12 y 12.000 y
"CAJADEBONOBON". No son defectos de la app. Se vuelve a cargar la cuenta antes
de la defensa (#400), y desde ahora las reproducciones usan datos propios que se
borran al terminar (§1.2).

### 1.10 Reenfoque de Compras sugeridas

RC-16 a RC-19 muestran que Compras calcula cantidades que MargenX no puede
saber sin stock: el pedido semanal sale de suponer 1 bulto por insumo y el
ahorro suma bultos que no se comparan. El equipo decidió el 22/11 que Compras
mida **el impacto en el margen** de cambiar de proveedor (#445 en el backend,
#446 en el frontend), y que la reposición con cantidades llegue en la Fase 2,
con el stock. La regla queda escrita en el ADR-010 (#447).

## 2. Colecciones Newman sin datos mutados (issue #312)

**Estado de esta sección: completa, con una limitación del entorno.** Productos
y Alertas de margen dejan la base como estaba. La prueba de aislamiento de
Productos no se pudo correr, porque Química GyJ no tiene usuarios en Clerk
(§2.4).

### 2.1 Objetivo

Comprobar con la salida real de Newman que las colecciones que dejaban datos
mutados (NB-4 de la revisión del PR #218, cosechado en #265) ya no lo hacen:
Productos dejaba un producto a $0 y Alertas de margen dejaba la Harina en
9500. La evidencia sigue las reglas de
[`evidencias/README.md`](evidencias/README.md): salida de consola como texto,
sin reportes HTML.

### 2.2 Método

- **Fecha y entorno:** 22/11/2026, en el devcontainer local. Backend de la
  rama de #312 en `localhost:3000`, con la base local sembrada con los
  comercios piloto.
- **Productos:** dos corridas seguidas, sin volver a sembrar entre una y otra.
  Usa el token de `panaderia-admin` (Cuenta A) y ninguno de Cuenta B (§2.4).
  El script se corrió con `bash` porque no tenía permiso de ejecución; quedó
  corregido en esta misma issue, junto con otros seis scripts `run-tests*.sh`
  que tampoco lo tenían.
- **Alertas de margen:** una corrida, con los tokens de `panaderia-admin` y
  `panaderia-colab`.
- **Base local:** el colaborador de Panadería Central tenía el usuario de
  Clerk anterior a #276. Se actualizó al actual del seed solo en la base
  local, como se había hecho con el administrador en #313.
- **Comandos:** van en el encabezado de cada archivo de evidencia.

### 2.3 Resultados

| Colección | Corrida | Pedidos | Aserciones | Fallas | Evidencia |
|---|---|---|---|---|---|
| Productos API | 1 | 15 | 36 | 1 (Cuenta B, §2.4) | [01-newman-productos-corrida-1.txt](evidencias/312/01-newman-productos-corrida-1.txt) |
| Productos API | 2, sin volver a sembrar | 15 | 36 | 1 (Cuenta B, §2.4) | [02-newman-productos-corrida-2.txt](evidencias/312/02-newman-productos-corrida-2.txt) |
| Alertas de margen (Insumos) | 1 | 6 | 17 | 0 | [03-newman-alertas-margen.txt](evidencias/312/03-newman-alertas-margen.txt) |

Qué demuestra cada una:

- **Productos:**
  - La carpeta "03 - Limpieza" borra "Producto QA" y "Producto Precio Cero"
    (`DELETE` 200) y comprueba que ya no existen (`GET` 404).
  - En la segunda corrida, "Crear producto válido" vuelve a dar 201. Si la
    primera hubiera dejado el producto, daría 409 por el nombre repetido.
- **Alertas de margen:** el pedido "00" guarda el nombre, la unidad y el costo
  de "Harina de trigo 000 Olavarriense", y el "05" comprueba que quedan
  iguales después de los cambios de "01" y "04". El costo de partida no era el
  9500 que fija "01", así que los cambios fueron reales.

### 2.4 Lo no cubierto

- **Aislamiento multiempresa de Productos** (carpeta "02"): necesita un token
  de `quimica-admin`, y los usuarios de Química GyJ no existen en la instancia
  de Clerk. Es el mismo bloqueo del reporte del Sprint 5 (§3.5), que sigue
  pendiente del equipo. El pedido da 401 y falla en las dos corridas. Las
  colecciones de Insumos y de Proveedores tienen el mismo bloqueo. Esta
  corrida no verifica el aislamiento: no es una falla de la API ni de los
  cambios de #312.
- **El script de esa prueba tiraba un `TypeError`** cuando la respuesta no era
  200, porque buscaba `data` en el cuerpo (se ve en los archivos 01 y 02).
  Quedó corregido en la revisión del PR: sin 200 falla solo el control del
  status.
- **Staging:** las corridas fueron locales. No se corrieron contra
  `dev.margenx.tech`.

### 2.5 Definition of Done de #312

- [x] `run-tests-productos.sh` y su colección no dejan el producto a $0: lo
  borran y lo comprueban (§2.3, archivos 01 y 02).
- [x] `run-tests-alertas-margen.sh` y su colección dejan el costo de la Harina
  como estaba (§2.3, archivo 03).
- [x] Decisión escrita sobre los correos de cuentas de prueba en los reportes
  de QA: solo correos ficticios ([`evidencias/README.md`](evidencias/README.md)).
- [x] Un reporte de QA adjunta la salida real de Newman en lugar de solo
  capturas (esta sección).

## 3. Lighthouse a 360 px (issue #398)

**Estado de esta sección: mediciones de antes y de después en local completas.
La medición de después en staging se hace después del merge (§3.6).**

### 3.1 Objetivo

Medir y mejorar los puntajes de Lighthouse en el celular (RNF-01 y RNF-02).
La meta es 90 o más en Performance, Accessibility, Best Practices y SEO en las
páginas públicas, y 90 o más en Accessibility y Best Practices en las páginas
con sesión. La Performance con sesión se registra y se mejora lo posible.

### 3.2 Método

- **Emulación:** Lighthouse 13.6.0 en modo móvil, pantalla de 360 × 640 px
  (DPR 2), 4G lenta y CPU 4× simuladas. Es la configuración de
  `frontend/lighthouserc.json`; la de Lighthouse por defecto es de 412 px.
  **Excepción:** las 4 páginas públicas de "antes" (staging) se midieron con la
  emulación por defecto, 412 × 823 px (DPR 1,75); la red y el CPU son los
  mismos. Sus comparaciones con "después" (§3.3) mezclan los dos tamaños de
  pantalla. Las 6 páginas con sesión de "antes" y las 10 de "después" son a
  360 × 640.
- **Antes (23/11/2026):** `dev.margenx.tech` con `develop` en `cfae5fe`. Las
  páginas con sesión se midieron con el administrador de la cuenta Demo, con
  el mismo inicio de sesión de Clerk que usa la E2E (`@clerk/testing`). Las
  páginas públicas se midieron también en `margenx.tech` (producción, `main`),
  para separar lo que depende del entorno.
- **Después:** el build de la rama servido con `vite preview` en el puerto
  4173. Las páginas públicas se midieron con LHCI (mediana de tres corridas).
  Las páginas con sesión, contra el backend local con la cuenta Demo, que en
  local tiene el módulo de ventas prendido y precios en cuarentena.
- **Evidencia:** los 20 reportes HTML están en
  [`evidencias/398/`](evidencias/398/README.md). Se generaron sin las capturas
  embebidas, para bajar su peso, y con el identificador del navegador de
  desarrollo de Clerk tapado.

### 3.3 Páginas públicas

Puntajes en orden Performance / Accessibility / Best Practices / SEO.
"Después" muestra las dos corridas completas de LHCI en local. "Antes" es a
412 × 823 px y "Después", a 360 × 640 px (§3.2): las cifras de Performance,
LCP y CLS no son del mismo tamaño de pantalla. La columna de producción no
tiene sus reportes en `evidencias/398/`; producción se vuelve a medir con el
release (§3.6).

| Página | Antes, staging | Producción (`main`) | Después, local | LCP (staging → local) | CLS (staging → local) |
|---|---|---|---|---|---|
| `/` | 92 / 95 / 77 / 66 | 93 / 95 / 96 / 100 | 87–96 / 100 / 77 / 100 | 1,0 s → 0,9 s | 0 → 0 |
| `/login` | 71 / 100 / 77 / 66 | 74 / 100 / 96 / 100 | 88–92 / 100 / 77 / 100 | 3,1 s → 2,6–2,8 s | 0,248 → 0 |
| `/instalar` | 70 / 100 / 77 / 66 | 94 / 100 / 96 / 100 | 92–93 / 100 / 77 / 100 | 5,5 s → 0,9 s | 0,104 → 0 |
| `/privacidad` | 93 / 100 / 77 / 63 | 93 / 100 / 96 / 100 | 79–96 / 100 / 77 / 100 | 0,9 s → 0,9 s | 0 → 0 |

### 3.4 Páginas con sesión (administrador de la cuenta Demo)

Puntajes en orden Performance / Accessibility / Best Practices. SEO no aplica
en las páginas con sesión.

| Página | Antes, staging | Después, local | LCP | CLS |
|---|---|---|---|---|
| `/dashboard` | 87 / 96 / 77 | 90 / 100 / 77 | 3,4 s → 3,3 s | 0,064 → 0,061 |
| `/insumos` | 87 / 95 / 77 | 90 / 100 / 77 | 3,5 s → 3,3 s | 0 → 0,069 (§3.5) |
| `/productos` | 89 / 95 / 77 | 98 / 100 / 77 | 3,5 s → 2,2 s | 0,008 → 0,008 |
| `/productos/:id` | 88 / 95 / 77 | 95 / 100 / 77 | 3,5 s → 2,4 s | 0 → 0 |
| `/proveedores` | 89 / 95 / 77 | 83 / 100 / 77 | 3,5 s → 3,5 s | 0,001 → 0,013 |
| `/compras` | 88 / 96 / 77 | 97 / 100 / 77 | 3,5 s → 2,3 s | 0 → 0 |

### 3.5 Correcciones y desvíos

**Correcciones:**

- **Contraste AA (Accessibility):**
  - el menú inferior (las pestañas inactivas, en todas las páginas con sesión);
  - la receta de la ficha del producto y de `/productos/nuevo`;
  - el aviso de borrado de la ficha del producto;
  - el número "En riesgo" del panel;
  - la landing.
  - Los números grandes de "Cómo funciona" son una marca de agua: pasan a un
    pseudo-elemento oculto para el lector de pantalla.
- **`/login` sin corrimientos:** el espacio del formulario de Clerk queda
  reservado mientras carga (402 px en el celular, 384 px en escritorio, medidos
  en staging), y el logo declara su tamaño.
- **Bundle inicial:**
  - cada pantalla con sesión se baja al abrirla (`frontend/src/lib/lazyPage.tsx`);
  - el JavaScript inicial pasa de 346 KB a unos 200 KB con gzip (42 % menos):
    el bundle principal (103 KB) y el chunk compartido con React (97 KB), que
    `index.html` precarga (tamaños del build de Vite);
  - si una pantalla no baja (red caída o versión nueva publicada), se ve "No
    se pudo cargar la pantalla" con **Reintentar**, que recarga la app;
  - las páginas públicas siguen en el bundle principal, porque se abren por
    enlace directo.
- **`/instalar`:** las capturas de la guía declaran su ancho y alto reales.
- **Panel:** el esqueleto de "Ganancia real" reserva el alto de los bloques ya
  cargados.
- **CSP de la VPS** (`infra/vps/nginx/margenx.conf`): habilita lo que usa Clerk
  (su dominio, el script y las sondas de su protección antibots y sus
  workers). En producción, esa era la única falla de Best Practices.
- **Caché de los assets con hash:** ya estaba bien. Se sirven con un año de
  vigencia, `immutable` y gzip; se verificó con `curl` en staging.

**Desvíos de la meta, con su causa:**

- **SEO de 63 a 66 en staging:** `dev.margenx.tech` responde a propósito
  `X-Robots-Tag: noindex` para que no lo indexen los buscadores
  (`infra/vps/README.md` §10). En producción y en local da 100.
- **Best Practices 77 en staging y en local:** es la instancia de desarrollo de
  Clerk. Sus scripts vienen de `*.clerk.accounts.dev` y dejan una cookie de
  terceros (`_cfuvid`), y Chrome lo marca dos veces ("third-party cookies" y
  "Issues"). En producción Clerk usa `clerk.margenx.tech`, que es de primera
  parte, y Best Practices da 96: lo único que le faltaba era la CSP corregida
  en este PR.
- **Performance de las páginas públicas en local, entre 79 y 96:** el TBT de una
  misma página varió entre 320 y 1.110 ms de una corrida a otra, con la máquina
  cargada (carga promedio de 5,6). Lighthouse escala el CPU medido en la
  máquina, así que la medición que cuenta es la de staging después del merge
  (§3.6) y la del job del CI. LCP y CLS, que no dependen de esa carga, mejoraron
  en todas las páginas.
- **CLS de `/insumos` en local (0,069):** en el celular, el aviso "Precios en
  Cuarentena" aparece arriba de la lista recién cuando llega la cantidad. En la
  Demo de staging no había precios en cuarentena al medir. Evitarlo implica
  cambiar dónde va el aviso, que es una decisión de diseño fuera del alcance de
  #398, y Performance con sesión no es meta. Queda registrado.
- **Performance de `/proveedores` (83) y de `/dashboard`:** el LCP depende de la
  respuesta de la API y de Clerk. Se registra y no se maquilla.

### 3.6 Pendiente después del merge

- **Aplicar la CSP en la VPS:** copiar `infra/vps/nginx/margenx.conf`, correr
  `sudo nginx -t` y `sudo systemctl reload nginx`. El archivo no se despliega
  con el CI.
- **Medir de nuevo en `dev.margenx.tech`,** con el mismo método, las 10 páginas.
  Los reportes se suman a `evidencias/398/despues-staging/`.
- **Producción:** se mide con el release v1.0.0 (#400).

### 3.7 Definition of Done de #398

- [x] Puntajes medidos y documentados con evidencia (§3.3, §3.4 y
  `evidencias/398/`).
- [ ] Correcciones mergeadas, con el CI en verde (en el PR).
- [x] Desvíos de la meta explicados con su causa (§3.5).

## 4. Tiempo de respuesta con y sin búsqueda (issue #444)

**Estado de esta sección: medición en staging completa (23/11/2026).**

### 4.1 Objetivo

Saber cuánto tarda la búsqueda por nombre con el catálogo grande, para
decidir con datos si hace falta un índice (`[RV375-I1]`). Regla de la issue:
si la mediana con búsqueda supera 300 ms, queda como candidata a un índice
trigram en la Fase 2, sin cambiar código antes del release.

### 4.2 Método

- **Dónde:** `dev.margenx.tech`, con la sesión del administrador de la cuenta
  Demo, el 23/11/2026 a las 16:38 (hora de Argentina). Solo lectura.
- **Cómo:** el script `backend/tests/rendimiento/medir-busqueda.js`, pegado en
  la consola del navegador de escritorio, sin limitación de red. Su prueba
  está en `medir-busqueda.test.ts` y corre con el `npm test` del backend.
- **Pedidos:** los mismos que hace la app, la primera página de 20 de
  `GET /api/ingredients` y de `GET /api/products`:
  - sin búsqueda y con `search=harina` (insumos) o `search=budin` (productos,
    sin tilde, para que pase por la búsqueda sin acentos);
  - las dos variantes alternadas, con 2 pedidos de calentamiento que no
    cuentan y 20 medidos por variante.
- **Qué se mide:** "respuesta" es hasta que llegan las cabeceras; "total",
  hasta tener el cuerpo leído. Los dos incluyen la consulta previa de CORS que
  el navegador hace antes de cada pedido con token, igual que en la app, y la
  red de quien mide. Como pesan lo mismo con y sin búsqueda, la diferencia
  entre las dos medianas es el costo de la búsqueda.
- **Catálogo al medir:** 225 insumos y 343 productos (la issue preveía 218 y
  339: la Demo creció desde entonces). La búsqueda encontró 23 insumos con
  "harina" y 24 productos con "budin".
- **Consulta medida:** cada búsqueda filtra por la cuenta y arma 2 condiciones
  con `OR`: el nombre normalizado (`searchName`) o el nombre, las dos con
  `contains` sin distinguir mayúsculas. El índice `(accountId, searchName)`
  acota la cuenta pero no sirve para buscar texto en el medio del nombre. La
  issue cita "hasta 12 condiciones", de una versión anterior del PR #375; la
  que se mergeó (`eefd698`) ya arma 2.

### 4.3 Resultados

| Endpoint | Variante | Encontrados | Mediana hasta la respuesta | Mediana total | p90 total | Mínimo y máximo total |
|---|---|---|---|---|---|---|
| `/api/ingredients` | sin búsqueda | 225 | 52,9 ms | 54,1 ms | 58,1 ms | 51,9 y 63,1 ms |
| `/api/ingredients` | `search=harina` | 23 | 56,1 ms | **57,1 ms** | 83,4 ms | 51,6 y 88,4 ms |
| `/api/products` | sin búsqueda | 343 | 51,7 ms | 53,0 ms | 57,5 ms | 48,3 y 64,4 ms |
| `/api/products` | `search=budin` | 24 | 54,9 ms | **55,9 ms** | 59,4 ms | 48,8 y 87,2 ms |

La búsqueda suma 3,0 ms a la mediana total de insumos y 2,9 ms a la de
productos.

### 4.4 Conclusión

- **Las dos medianas con búsqueda (57,1 y 55,9 ms) quedan muy por debajo de
  300 ms:** la búsqueda no es candidata a índice trigram y no se cambia código.
- El tiempo lo explica la base que comparten las dos variantes (red, CORS y
  Express, unos 50 ms), no la búsqueda.
- Hubo respuestas sueltas más lentas con búsqueda (máximos de 88,4 y 87,2 ms,
  y p90 de 83,4 ms en insumos), también lejos del umbral.
- **Límite de la medición:** es una sola corrida, desde una sola red y con
  el catálogo de la Demo. Si un comercio llega a miles de insumos o
  productos, conviene repetirla con el mismo script antes de decidir un
  índice.

### 4.5 Evidencia

- Salida real del script: [`evidencias/444/01-medicion-staging-2026-11-23.json`](evidencias/444/01-medicion-staging-2026-11-23.json),
  solo con tiempos y cantidades (sin el token ni datos de la cuenta).
- El script: `backend/tests/rendimiento/medir-busqueda.js`.

### 4.6 Definition of Done de #444

- [x] Medición publicada en el reporte de calidad con su evidencia (§4.3 y
  `evidencias/444/`).

## 5. Pruebas automáticas de accesibilidad con axe (issue #442)

**Estado de esta sección: suite verificada en local y en el CI, con las
violaciones corregidas. Queda el recorrido manual con teclado y lector de
pantalla (§5.6).**

### 5.1 Objetivo

Que el CI detecte en cada PR los problemas de accesibilidad de las pantallas
con sesión, sin depender solo de una auditoría manual antes de la entrega
(`[RV387-I1]`). La suite falla con violaciones `serious` o `critical`; las
`moderate` y `minor` se informan en el reporte del job.

### 5.2 Método

- **Herramienta:** axe-core 4.14.1, con `@axe-core/playwright` 4.14.0. Se usan
  las reglas por defecto: WCAG 2.0 a 2.2, niveles A y AA, más buenas prácticas.
  Las reglas experimentales quedan afuera.
- **Prueba:** `frontend/tests/e2e/accessibility-axe.spec.ts`, en el proyecto
  `chromium`. En el CI corre con la sesión del administrador de Panadería
  Central del seed. Es de solo lectura.
- **Pantallas:**
  - la ficha de Pan flauta — 1 kg;
  - `/productos/nuevo`;
  - `/insumos`;
  - la carga desde planilla;
  - `/dashboard`.
- **Variantes:** claro y oscuro, a 360 × 800 y 1280 × 800. Son 20 casos.
- **Espera:** cada caso espera a que la pantalla cargue y a que terminen las
  transiciones, como la apertura del diálogo. Las animaciones infinitas no
  cuentan.
- **Reporte:**
  - por caso, un JSON y un resumen en Markdown en `frontend/test-results/axe/`;
  - el job de E2E pasa los resúmenes a su reporte (*Summary*);
  - la carpeta se sube siempre como artefacto `axe-accesibilidad`.
- **Verificación local (24/11/2026):**
  - En el entorno de desarrollo no hay Clerk ni base con seed. Por eso la
    prueba real se corrió contra un entorno descartable, que no se commitea.
  - Ese entorno tenía:
    - el backend real con PostgreSQL 16 efímero y solo el inicio de sesión
      simulado;
    - el frontend con Clerk reemplazado por una sesión de ADMIN fija;
    - datos de panadería cargados por la API: 7 insumos, 2 proveedores,
      5 productos (uno en borrador) y un precio en cuarentena.

### 5.3 Resultados

**Antes de corregir fallaban 12 de los 20 casos**, con estas violaciones (todas
`serious`):

| Regla | Dónde | Medida | Corrección |
|---|---|---|---|
| `color-contrast` | Pestaña activa del menú inferior, en oscuro (360 px) | 2,74:1 (indigo-600 sobre gray-900) | `dark:text-indigo-400` |
| `color-contrast` | "Sistemas en línea", en el pie de escritorio, en claro | 4,39:1 (gray-500 heredado sobre gray-100) | gray-600 |
| `color-contrast` | "Simulador Financiero" de la ficha, en escritorio y en claro | 2,6:1 (gray-400 sobre blanco) | gray-500, y gray-400 en oscuro |
| `color-contrast` | `/productos/nuevo`: "Información comercial", ayudas de precio y margen y receta vacía | 2,6:1 en claro y 3,66:1 en oscuro | gray-500, y gray-400 en oscuro |
| `label-content-name-mismatch` (WCAG 2.5.3) | Columnas del histograma del panel | El nombre ("En riesgo: 2 productos, bajo su mínimo") no incluía el porcentaje que se ve | Sin `aria-label`: el nombre sale del texto visible |
| `label-content-name-mismatch` (WCAG 2.5.3) | Filas de la tabla de insumos, en escritorio | El nombre ("Ver y editar insumo …") no incluía la unidad ni el costo | Sin `aria-label`: "Ver y editar insumo" queda como texto oculto, seguido del texto de la fila |

- **Panel:**
  - el lector de pantalla sigue diciendo primero el estado: "En riesgo:
    2 productos, 50 % del catálogo, Bajo su mínimo";
  - el orden del código es el de lectura y las clases `order-*` mantienen el
    diseño;
  - las capturas de antes y de después a 360 px y en escritorio se ven iguales.
- **Lighthouse (#398)** dio 100 en Accessibility en `/dashboard` a 360 px y no
  marcó el histograma. El resto de las violaciones está en oscuro, en escritorio
  o en pantallas que no midió: `/productos/nuevo` y la planilla.
- **Fuera de los 20 casos, en la misma pantalla:**
  - **Ficha de un producto en borrador:** el aviso "Estado del producto" daba
    4,39:1 en claro y 3,66:1 en oscuro, y la ganancia del simulador usaba
    gray-400. El seed del CI no tiene productos en borrador, así que la suite no
    pasa por ese estado. Quedó corregido y cubierto con pruebas de Vitest.
  - **Botón Cuarentena de `/insumos`:** axe dejó el número para revisar a mano
    porque es un solo carácter. Blanco sobre amber-500 da 2,1:1. Pasa a
    amber-950, como el contador de `SuppliersTabs` (7:1), con su prueba de
    Vitest.

**Después de corregir pasan los 20 casos, sin violaciones de ningún impacto**
(tampoco `moderate` ni `minor`).

axe deja para revisar a mano lo que no puede decidir solo, y el resumen de
cada caso lo lista:

- **`color-contrast`, en textos tapados en parte por otra capa:** la barra
  fija de abajo a 360 px (`/insumos` y `/productos/nuevo`) y el fondo del
  diálogo de la planilla. axe no puede medir el fondo. Se revisa a ojo en el
  recorrido manual.
- **`aria-hidden-focus`, con la planilla abierta:** el diálogo oculta el resto
  de la página para el lector, y axe no puede confirmar que esos controles
  queden fuera del Tab. Lo cubre la prueba de foco atrapado de `Dialog`
  (`dialog.test.tsx`), y se vuelve a mirar con teclado.
- **`aria-valid-attr-value`, en el selector de insumos de la receta de
  `/productos/nuevo`:** su `aria-controls` apunta a la lista, que solo existe
  cuando está abierta (con `aria-expanded="false"`). ARIA lo admite.
- **`aria-prohibited-attr`, en la ficha a 360 px:** el indicador de margen de
  la barra de abajo es un `span` con `aria-label` y sin rol. Algunos lectores
  no leen ese nombre, pero repite el texto visible ("Superávit: 82,1 %"), así
  que se anuncia lo mismo. Se confirma con el lector.

### 5.4 Exclusiones

Ninguna: `EXCLUDED_RULES` de la prueba está vacía. Si en adelante una violación
no se puede corregir a tiempo, se excluye ahí con la regla y el motivo, y se
anota en esta sección.

### 5.5 Límite con #398

Nada de lo que corrigió #398 se volvió a tocar:

- #398 corrigió las pestañas **inactivas** del menú inferior en claro. Esta
  issue corrige la **activa** en oscuro.
- La receta y el número "En riesgo" quedaron como los dejó #398, y axe no los
  marca. El aviso de borrado no se tocó, y esta suite no lo abre.

**Corrida en el CI (24/11/2026):** el job **E2E Tests Suite (Playwright)** del
PR #488 (corrida 45385106055) pasó con Clerk y el seed real. El artefacto
`axe-accesibilidad` trae los 40 archivos (JSON y Markdown) de los 20 casos, y
ninguno registra violaciones de ningún impacto.

### 5.6 Pendiente

- **Recorrido manual (QA), en las mismas pantallas:**
  - con teclado: orden de Tab, foco visible, y Escape para cerrar la planilla;
  - con lector de pantalla: TalkBack en Android y VoiceOver en iPhone.
  - Comprobar que las columnas del panel y las filas de insumos se anuncian con
    el estado o "Ver y editar insumo" primero.
  - Revisar también lo que axe dejó para mirar a mano (§5.3).
- **Corregido en la revisión (`[RV488-I1]`):** axe también las vio en el
  entorno local, fuera de las pantallas de la suite:
  - en escritorio, las filas de `/productos` tenían la misma violación
    `label-content-name-mismatch` (`aria-label` con solo el nombre). Ahora
    siguen el patrón de las filas de insumos: "Ver detalle del producto" como
    texto oculto, seguido del texto de la fila;
  - en `/perfil`, el aviso de las alertas por mail y el pie "© MargenX" usaban
    gray-400 en claro (2,6:1) y gray-500 en oscuro. Pasan a gray-500 y
    gray-400.
  - La suite de axe no abre `/productos` ni `/perfil`: las dos correcciones
    quedan cubiertas con pruebas de Vitest (`productos/page.test.tsx` y
    `perfil/page.test.tsx`).

### 5.7 Definition of Done de #442

- [x] Revisado y CI en verde con las pruebas de axe (PR #488, corrida
  45385106055).
- [x] Exclusiones, si las hay, justificadas (no hay, §5.4).
- [x] Documentación actualizada en el mismo PR (`frontend/README.md`,
  `frontend/tests/e2e/README.md`, este reporte y el CHANGELOG).
