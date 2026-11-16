# Reporte de Calidad — Sprint 6

Este documento lo inicia la issue #383. Las demás issues de QA del Sprint 6
suman sus propias secciones más abajo cuando se ejecuten.

## 1. Pruebas en iPhone y Android pendientes de los PR #376, #378 y #379 (issue #383)

**Estado de esta sección: completa, con dos hallazgos menores informados al
SM.** Las partes A y B tienen capturas en todos los casos. La parte C se
probó en un iPhone con datos móviles, sin captura ni video (ver §1.8).

### 1.1 Objetivo

Cerrar con evidencia en dispositivos reales lo que las revisiones de los PR
#376 (modales y barras fijas, issue #355), #378 (Perfil, issue #356) y #379
(pantallas públicas con sesión, issue #360, condición `[RV379-I1]`) solo
pudieron probar en Chromium a 360 px. Esas revisiones dejaron la prueba en
iPhone a cargo de QA (acuerdo con el Tech Lead del 13/11/2026).

### 1.2 Método

- **Ambiente:** `dev.margenx.tech`, con #376, #378 y #379 mergeados en
  `develop` (14/11/2026) y #377 (formato es-AR, issue #359) mergeado el
  15/11/2026. Cuenta Demo Panadería Central, rol Admin.
- **Dispositivos:**
  - iPhone con zona segura inferior (pantalla de 1290×2796), en Safari y en
    la app instalada en la pantalla de inicio. Partes A y B, en modo claro y
    oscuro.
  - Android, en Chrome. Parte A, en modo claro.
  - Un segundo iPhone con datos móviles, sin Wi-Fi, para la parte C.
- **Fecha:** 16/11/2026. Las pruebas las hizo Leandro Herrera (QA).
- **Capturas:** en `docs/qa/evidencias/383/`, con el criterio de la issue
  #365:
  - sin barra de estado, sin foto de perfil, sin correos ni otros datos
    personales;
  - reducidas a 720 px de ancho;
  - en Android queda la barra de direcciones de Chrome, que muestra
    `dev.margenx.tech`.
- **Tanda descartada:** la primera tanda de Android se sacó en producción
  (`margenx.tech`, versión 0.6.0, sin los cambios del Sprint 6). Se descartó
  y se repitió en `dev.margenx.tech`.
- **Contraste con el código:** cada hallazgo de §1.7 se verificó leyendo el
  componente responsable en `develop` antes de registrarlo.

### 1.3 Resultados por dispositivo

| Prueba | iPhone, claro | iPhone, oscuro | Android, claro |
|---|---|---|---|
| A1. Ficha del insumo con varios proveedores (`IngredientUpsertSheet` + `IngredientSupplierList`) | ✅ [captura](evidencias/383/iphone-claro-a1-ficha-insumo.png) | ✅ [captura](evidencias/383/iphone-oscuro-a1-ficha-insumo.png) | ✅ [captura](evidencias/383/android-claro-a1-ficha-insumo.png) |
| A2. Asociar otro empaque (`supplier-packaging-modal`) | ✅ [captura](evidencias/383/iphone-claro-a2-asociar-empaque.png) | ✅ [captura](evidencias/383/iphone-oscuro-a2-asociar-empaque.png) | ✅ [captura](evidencias/383/android-claro-a2-asociar-empaque.png) |
| A3. Nuevo proveedor (`SupplierFormDialog`) | ✅ [captura](evidencias/383/iphone-claro-a3-nuevo-proveedor.png) | ✅ [captura](evidencias/383/iphone-oscuro-a3-nuevo-proveedor.png) | ✅ [captura](evidencias/383/android-claro-a3-nuevo-proveedor.png) |
| A4. Editar presentación (`PresentationEditDialog`) | ✅ [captura](evidencias/383/iphone-claro-a4-editar-presentacion.png) | ✅ [captura](evidencias/383/iphone-oscuro-a4-editar-presentacion.png) | ✅ [captura](evidencias/383/android-claro-a4-editar-presentacion.png) |
| A5. Sumar insumo a la receta (`ProductAddIngredientModal`) | ✅ [captura](evidencias/383/iphone-claro-a5-sumar-insumo.png) | ✅ [captura](evidencias/383/iphone-oscuro-a5-sumar-insumo.png) | ✅ [captura](evidencias/383/android-claro-a5-sumar-insumo.png) |
| A6. Simulador de precio (`ProductMobileSimulatorSheet`) | ✅ con hallazgo H2 [captura](evidencias/383/iphone-claro-a6-simulador.png) | ✅ con hallazgo H2 [captura](evidencias/383/iphone-oscuro-a6-simulador.png) | ✅ con hallazgo H2 [captura](evidencias/383/android-claro-a6-simulador.png) |
| A7. Barra del producto sobre la BottomNav (`ProductMobileFooter`), en Safari | ✅ [borrador](evidencias/383/iphone-claro-a7-barra-producto-borrador.png) / [con receta](evidencias/383/iphone-claro-a7-barra-producto-con-receta.png) | ✅ [con receta](evidencias/383/iphone-oscuro-a7-barra-producto-con-receta.png) | ✅ [con receta](evidencias/383/android-claro-a7-barra-producto-con-receta.png) |
| A7. Barra del producto en la app instalada | ✅ con hallazgo H1 [captura](evidencias/383/iphone-claro-a7-barra-producto-app-instalada.png) | No se probó | No se probó |
| B1. Perfil: "Margen Mínimo Sugerido" | ✅ [captura](evidencias/383/iphone-claro-b1-perfil-margen.png) | ✅ [captura](evidencias/383/iphone-oscuro-b1-perfil-margen.png) | No aplica |
| B2. Perfil: "Alertas Automáticas" | ✅ [captura](evidencias/383/iphone-claro-b2-perfil-alertas.png) | ✅ [captura](evidencias/383/iphone-oscuro-b2-perfil-alertas.png) | No aplica |
| C. Sin pantallazo de la landing, con datos móviles | ✅ en un segundo iPhone, sin captura ni video | — | No se probó |

### 1.4 Parte A: diálogos y barra del producto (#355, PR #376)

- **Diálogos (A1 a A6):** en los tres casos se ven completos el título, el
  botón de cerrar y las acciones, y el contenido largo scrollea dentro del
  diálogo. En A1 se usó un insumo con varios proveedores.
- **Barra del producto (A7):** la barra de dos filas (Precio, Costo,
  Ganancia y el badge de rentabilidad arriba; "Ajustar" y "Guardar" abajo)
  queda apoyada sobre la BottomNav, sin superponerse. El badge se ve
  completo: "Saludable (33,6 %)" con receta y "Sin Receta" en el borrador.
- **El hueco de unos 6 px que calculó la review de #376 no aparece** en
  Safari, en la app instalada ni en Android. Esa cuenta suponía una zona
  segura inferior mayor que 0. Hoy `frontend/index.html` no declara
  `viewport-fit=cover`, así que `env(safe-area-inset-bottom)` vale 0 en el
  iPhone y la cuenta no se aplica. Si se arregla H1 agregando
  `viewport-fit=cover`, hay que volver a mirar ese hueco.

### 1.5 Parte B: Perfil (#356, PR #378)

En iPhone, en claro y en oscuro:

- "Margen Mínimo Sugerido" muestra **un solo `%`** ("30 %").
- **No hay interruptores** en "Alertas Automáticas (n8n)".
- "Alerta de Margen Crítico" tiene el badge **"Activa"** (verde, con
  escudo) y "Reporte Semanal en PDF" tiene **"Próximamente"** (gris, con
  reloj).
- Los textos se leen completos y nada sale del ancho de la pantalla.

### 1.6 Parte C: sin pantallazo de la landing (#360, PR #379)

- **Resultado:** QA probó en un segundo iPhone con datos móviles y sin
  Wi-Fi: con la sesión iniciada, al escribir el dominio a mano se pasó al
  panel sin ver la landing.
- **Contexto:** `usePublicSession` espera a Clerk como máximo 1,5 s
  (`PUBLIC_SESSION_TIMEOUT_MS = 1500` en
  `frontend/src/hooks/usePublicSession.ts`). Si Clerk tarda más, se muestra
  la versión sin sesión. Con esa red móvil, Clerk respondió antes del
  límite.
- **Respaldo automático:** las pruebas de
  `frontend/src/hooks/__tests__/usePublicSession.test.ts` y
  `frontend/src/app/page.test.tsx` cubren las dos ramas: fondo vacío
  mientras Clerk verifica y landing si Clerk no responde a tiempo.
- No hace falta ajustar `PUBLIC_SESSION_TIMEOUT_MS` (la issue lo proponía
  solo si se veía la landing).

### 1.7 Matriz de defectos (fechada)

Escala de severidad: la misma del
[reporte del Sprint 5, §2.6](reporte-calidad-sprint5.md#26-matriz-de-defectos-fechada).

| ID | Fecha | Defecto | Severidad | Pantalla | Cómo reproducirlo | Evidencia | Estado |
|---|---|---|---|---|---|---|---|
| H1 | 2026-11-16 | En la app instalada en iPhone, la línea de inicio de iOS queda encima de las etiquetas de la BottomNav ("Productos" queda cruzada). Causa probable: el viewport de `frontend/index.html:5` no declara `viewport-fit=cover`, así que `env(safe-area-inset-bottom)` vale 0 y el `pb-[max(.75rem,env(safe-area-inset-bottom))]` de `bottom-nav.tsx:22` queda en 0,75 rem. En Safari no se ve porque la barra del navegador ocupa esa franja | Menor | Toda pantalla con BottomNav, en la app instalada | Instalar la app en un iPhone con Face ID ("Agregar a Inicio"), abrirla desde el ícono y mirar la BottomNav | [app instalada](evidencias/383/iphone-claro-a7-barra-producto-app-instalada.png) / [Safari, sin el problema](evidencias/383/iphone-claro-a7-barra-producto-con-receta.png) | Informado al SM el 16/11/2026. La issue la abre el SM. Al arreglarlo, revisar también `ProductMobileFooter.tsx`, que usa la misma zona segura, y el hueco de §1.4 |
| H2 | 2026-11-16 | El simulador de precio tiene textos fuera del formato es-AR que dejó #359 (PR #377): "Ganancia: $0" sin decimales (`ProductMobileSimulatorSheet.tsx:43`), mientras la barra del producto muestra "$0,00"; "Proyección: 0.0% (Sin Receta)", con punto decimal y sin espacio antes del `%` (`ProductSimulatorPanel.tsx:122`), mientras con receta dice "Margen 33,6 % Saludable"; y "+5%" / "+10%" sin espacio (`ProductSimulatorPanel.tsx:65` y `:76`), al lado de "Sugerir 30 %" | Menor / cosmético | `/productos/:id`, simulador | Abrir un producto sin receta, tocar "Ajustar" y mirar la cabecera, la proyección y los ajustes rápidos. Los botones "+5%" y "+10%" se ven también con receta | [iPhone, sin receta](evidencias/383/iphone-claro-a6-simulador.png) / [Android, con receta](evidencias/383/android-claro-a6-simulador.png) | Informado al SM el 16/11/2026. La issue la abre el SM |

No se encontraron defectos graves ni importantes.

### 1.8 Lo no cubierto

- **Parte C sin captura ni video:** la DoD de la issue pide "captura o
  video". El resultado lo informó QA después de probar, y no quedó
  registrado cuántos intentos se hicieron.
- **Deslizamiento horizontal en Perfil:** no quedó registrado como prueba
  aparte. Las capturas de B1 y B2 no muestran nada fuera del ancho.
- **Android:** solo modo claro y solo Chrome, sin la app instalada. La issue
  pide la parte A en Android sin exigir el modo oscuro.
- **Parte C en Android:** la estrategia de QA de #360 la pedía, pero el
  alcance de #383 la limita al iPhone.
- **Pantallas nuevas del Sprint 6** (compras y descarga del reporte): no
  entraron en este recorrido. Pasan a la regresión final (issue #399), como
  prevé la issue.

### 1.9 Verificación

- Todas las pruebas se hicieron contra `dev.margenx.tech`, no contra un
  build local. La primera tanda de Android, sacada por error en
  producción, se descartó.
- Cada captura se revisó contra el criterio del Gherkin de la issue antes
  de sumarla a la evidencia.
- H1 y H2 se verificaron leyendo en `develop` los archivos y las líneas
  citados en §1.7.
- Las pruebas automáticas citadas en §1.6 no se volvieron a correr para
  este reporte: su evidencia es el CI de #379.

### 1.10 Definition of Done

- [x] Parte A verificada en iPhone y Android, con capturas de cada diálogo y
  de la barra del producto.
- [x] Parte B verificada en iPhone, con capturas en claro y oscuro.
- [ ] Parte C verificada en iPhone con datos móviles, con #379 desplegado en
  `dev.margenx.tech`, y captura o video. *(Verificada en un segundo iPhone
  con datos móviles; falta la captura o el video, ver §1.8.)*
- [ ] Un comentario en #355, #356 y #360 enlaza la evidencia. *(Pendiente:
  se publica con el PR de esta issue.)*
- [ ] Defectos encontrados en issues propias. *(H1 y H2 se informaron al SM
  el 16/11/2026, que es quien abre las issues.)*
- [x] Reporte de calidad del Sprint 6 en `docs/qa/`, con la tabla de
  resultados por dispositivo y los enlaces a las capturas (este documento).
