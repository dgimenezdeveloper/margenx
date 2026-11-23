# Hallazgos recorrido cliente (borrador)

> **Notas de trabajo del 21/11/2026, reemplazadas.** La versión revisada, con severidad, evidencia e issue de cada hallazgo, está en `docs/qa/reporte-calidad-sprint7.md` §1.

RC-01 /privacidad — jerga técnica (ADMIN/COLLABORATOR, slug, tenant). privacidad/page.tsx:11,17. Menor, usabilidad.
RC-02 Landing — jerga para dueño (RBAC estricto, multi-tenant, Mobile-First 360px, Zero-Click n8n, Anti-Polución). page.tsx (verificar líneas). Menor, usabilidad.
RC-03 Panel — "Margen promedio" muestra mediana. DashboardKpiCards.tsx:130-135; también PDF "Margen promedio: ... (la mediana)". Menor, usabilidad.
RC-04 Voseo/tuteo mezclado: dashboard/page.tsx:125 "Aquí tienes", HealthDistributionHistogram.tsx:230 "Haz clic"; Clerk login "Has olvidado", "¿No tienes cuenta? Regístrese". Menor, usabilidad.
RC-05 PDF — columna ESTADO corta "Pérdid/a". reporte-semanal.json nodo Generar Reporte HTML jsCode l.272. Menor, defecto.
RC-06 PDF/mails — "Soporte: contacto@margenx.tech" vs app soporte@margenx.tech. mail-margenx.js:96,151; reporte-semanal.json jsCode l.100,155,440. Menor, defecto.
Nota datos demo: Medialunas rellenas precio $13 → -84.768 %; Champinión 12↔12.000 (residuos de pruebas).
RC-07 Insumos/Documentación del pie lleva a GitHub (repo) — userManual.ts. Menor usabilidad.
RC-08 Insumo "Se usa en" muestra precio de venta del producto sin rótulo. IngredientUpsertSheet.tsx:317-319. Menor usabilidad.
RC-09 Modal insumo se titula "Actualizar Costo"/"Guardar Costo" aunque edita nombre y unidad; historial compara kg vs litro sin unidad tras cambio de unidad. Menor usabilidad.
RC-10 Selector de insumos: si se tipea y se pulsa ↓+Enter antes de que llegue la búsqueda remota, abre "Crear nuevo insumo" en vez de elegir. recipe-ingredient-combobox.tsx:60-64,103-111,149. Menor defecto.
RC-11 "+ + Crear nuevo insumo" signo duplicado. recipe-ingredient-combobox.tsx:277-278. Menor defecto.
RC-12 Costo: simulador $2.086,54 vs lista $2.086,55 (front suma sin redondear por renglón; back redondea por renglón). useRecipeStore.ts:124-129 vs marginCalculator.ts:51-53. Menor defecto.
RC-13 Estado: producto con mínimo 70 % y margen 70 % se ve "Superávit" ("supera el umbral mínimo (70 %) y el 60 %"): con mínimos ≥60 % la banda "En objetivo" no existe. marginCalculator.ts:120-139. Menor usabilidad.
RC-14 Proveedor: el detalle no permite crear presentaciones (manda a Insumos) y el alta desde el insumo no tiene código de artículo (solo se edita en el detalle del proveedor): flujo partido en dos pantallas; nombres distintos (empaque/presentación, precio total del bulto/precio cerrado, proveedor predeterminado/presentación predeterminada). proveedores/[id]/page.tsx:248, PresentationEditDialog.tsx:196, IngredientUpsertSheet (asociar). Menor usabilidad.
RC-15 Insumo: "Hacer Predeterminado" en la ficha cambia el costo sin confirmar; en /compras sí pide confirmación. Menor usabilidad.
RC-16 Compras: "Hacer predeterminada" confirma "se recalcularán todas las recetas asociadas" sin decir cuántos productos ni el efecto en el margen; el toast dice "Costos y recetas actualizados". Evidencia a favor del reenfoque.
RC-17 Compras: calculadora arranca con 1 bulto en cada insumo → "Pedido Semanal" de $1.501.131,23 con 28 "producto(s)" (son insumos). Sin stock, la cantidad es adivinada. compras/page.tsx:515-518. Evidencia a favor del reenfoque.
RC-18 Compras: "Ahorro potencial por bulto" suma ahorros de 1 bulto de insumos distintos (cifra sin sentido de negocio). compras/page.tsx:383. Evidencia a favor.
RC-19 Compras: botones "Hacer predeterminada" sin nombre accesible distinto por insumo (a11y). compras/page.tsx:~460-467. Menor.
Cuarentena: 1 solo ítem (Cacao amargo Primavera +80 %). Pendiente decisión del usuario.
RC-20 Perfil: "Margen Objetivo Global ... determinará el umbral de alerta" — falso: alertas usan minMargin de cada producto (marginAlertDispatcher.ts:111; auth.ts:45 solo cambia el default). perfil/page.tsx:163. Importante, defecto (texto engañoso). + "Alertas Automáticas (n8n)" jerga, perfil/page.tsx:202; alertas no se pueden apagar (solo estado).
RC-21 Nuevo producto: "tu margen global de ." vacío mientras carga. productos/nuevo/page.tsx:430-431. Menor defecto.
RC-22 360px: "Proveedo…" truncado en menú inferior. bottom-nav.tsx:17,40. Menor.
RC-23 Histograma a 360: "Riesgo/Objetivo" vs "En riesgo/En objetivo". healthBucket.ts:64,77. Menor.
RC-24 Colaborador ve 14 productos en borrador con "Precio: $0,00" (atención al público). products.ts:128 permite 0 en borrador; MonitoredCatalogGrid.tsx:~208, productos/page.tsx:~202 no filtran. Importante.
RC-25 Invitación: 409 de Clerk "Ese correo ya tiene una cuenta o una invitación pendiente" sin invitación listada; mensaje ambiguo, sin próximo paso. collaborators.ts:65-72. Menor usabilidad.
RC-26 Cuarentena: confirmación de Liberar no dice costo nuevo, productos ni margen; toast "2 afectados, 2 críticos" usa "críticos" (término viejo). QuarantineList.tsx:42. Menor.
OK: login/privacidad/instalar, 360 sin scroll horizontal, planilla, 409 borrar, repetidos, alta rápida (y nombre duplicado bloqueado), simulador, aviso cambios sin guardar, recálculo al hacer predeterminada, baja proveedor con detalle, invitar/revocar, colaborador sin costos (UI y API), redirección con aviso.
No cubierto: sin red real (no se puede cortar la red desde la extensión; offline.html OK), aviso de versión nueva (requiere deploy), /api/docs no desplegado (#393).
RC-27 Insumo: se puede cambiar la unidad de un insumo usado en recetas y con presentaciones; el PUT no lo bloquea (ingredients.ts:536-566). Las cantidades de receta y los bultos quedan en la unidad vieja. Verificado en código, no reproducido sobre un insumo usado. Grave (corrompe el significado de los datos). = usabilidad "editar unidad".
RC-28 Insumo: guardar un costo manual con proveedor predeterminado deja la presentación predeterminada con otro precio (el PUT no toca SupplierIngredient) y, según usabilidad, las tarjetas de proveedores desaparecen hasta recargar. Importante.
Datos de staging: residuos de pruebas (Medialunas a $13, Champinión 12↔12.000, CAJADEBONOBON). Sugerencia: reseed antes de la defensa (#400).
