# Tabla unificada del recorrido de cliente (21/11/2026)

> **Versión de trabajo del 21/11/2026, reemplazada.** La clasificación aprobada el 22/11 (responsables, fechas, números de issue y R-03 reemplazado por el ADR-010, #447) está en `docs/retrospectivas/acta-cierre-sprint-6.md` §5 y en `docs/qa/reporte-calidad-sprint7.md` §1.

Copia de trabajo de la tabla del Google Doc "MargenX · Recorrido de cliente en staging (21/11/2026) · Reporte de hallazgos". El detalle de cada RC (pasos, archivo:línea, tipo) está en `hallazgos-borrador.md`; las capturas, en esta misma carpeta.

Origen: RC (recorrido), U (revisión de usabilidad del equipo, ítem del tablero 312846421), RV (hallazgos I del Sprint 6), H2 (`docs/qa/reporte-calidad-sprint6.md` §1.7).

| ID | Origen | Descripción | Sev. | Prio. | Size · Estimate | Responsable | Blocked by | Decisión |
|---|---|---|---|---|---|---|---|---|
| QA7-01 | RC-27, U | Bloquear el cambio de unidad de un insumo con recetas o presentaciones (409 en `PUT /api/ingredients/:id`, `ingredients.ts:536-566`, y campo deshabilitado en la ficha) | Grave | P1 | S · 4 h | Mauricio + Federico | — | Entra antes del 28/11 |
| QA7-02 | RC-28, U | Costo manual con proveedor predeterminado: avisar y ofrecer actualizar la presentación o quitar el predeterminado; que las tarjetas de proveedores no desaparezcan hasta recargar | Importante | P1 | M · 5 h | Federico + Mauricio | QA7-01 | Entra |
| QA7-03 | RC-24 | No mostrar al colaborador productos en borrador a $0,00 (`products.ts:128`, `MonitoredCatalogGrid.tsx:208`, `productos/page.tsx:202`) | Importante | P1 | S · 2 h | Mauricio | — | Entra |
| QA7-04 | RC-20, U ×2 | Perfil: corregir el texto del margen global (`perfil/page.tsx:163`), quitar "(n8n)" (`:202`) y los botones Cerrar sesión, Política de privacidad y Guía de instalación | Importante | P1 | S · 2 h | Federico | — | Entra |
| QA7-05 | RV419-I1, RC-03, RC-23, RC-26 | Nombres de estado viejos: portada (`app/page.tsx:335, 386`), mail de alerta (`alertas-margen.json`), "Alerta de Margen Crítico" (`perfil/page.tsx:207`), toast "críticos" (`QuarantineList.tsx:42`); "Margen promedio" que es mediana (`DashboardKpiCards.tsx:130-135`); rótulos cortos (`healthBucket.ts:64, 77`) | Menor | P2 | S · 3 h | Federico + Darío | — | Entra |
| QA7-06 | H2, RC-12, RC-21 | Simulador: "Ganancia: $0" (`ProductFinancialCockpit.tsx:30`, `ProductMobileSimulatorSheet.tsx:43`), "+5%"/"+10%" sin espacio (`ProductSimulatorPanel.tsx`, `productos/nuevo/page.tsx:740`), centavo de diferencia (`useRecipeStore.ts:124-129` contra `marginCalculator.ts:51-53`), "margen global de ." vacío (`productos/nuevo/page.tsx:430-431`) | Menor | P2 | S · 3 h | Federico | — | Entra |
| QA7-07 | RC-10, RC-11, U ×4 | Productos: ↓+Enter antes de los resultados abre "Crear nuevo insumo" (`recipe-ingredient-combobox.tsx:60-64, 103-111, 149`), "+ +" (`:277-278`), cursor en la cruz del buscador, hovers en oscuro (Agregar insumo, select Unidad), toast de crear y eliminar que se pierde al redirigir | Menor | P2 | M · 4 h | Federico | — | Entra |
| QA7-08 | RV385-I1, RC-08, RC-09, U ×6 | Insumos: modo oscuro (hover de Cargar desde planilla y Cuarentena, input de nombre, desplegable de proveedor, paginación), "Se usa en" sin rótulo de precio (`IngredientUpsertSheet.tsx:317-319`), título "Actualizar Costo", historial sin unidad, sin aviso al cargar planilla, "Variaciones recientes" en 0 si falla la consulta (`SuppliesPageContent.tsx:128-139, 547`) | Menor | P2 | M · 5 h | Federico | — | Entra |
| QA7-09 | RC-14, RC-15, U ×4 | Proveedores: tabla con columnas corridas y columna Acciones, estrella con tooltip para "Hacer predeterminada", confirmación al hacer predeterminado (también desde la ficha del insumo), modal de quitar presentación (hover y datos de más), texto de baja más corto, nombres unificados (empaque/presentación), código de artículo en el alta desde el insumo | Menor | P2 | M · 6 h | Federico | — | Entra |
| QA7-10 | RC-05, RC-06 | PDF y mails: columna Estado cortada (`reporte-semanal.json`, nodo "Generar Reporte HTML", línea 272 del código) y soporte en contacto@ en lugar de soporte@ (`mail-margenx.js:96, 151`) | Menor | P2 | XS · 2 h | Darío | — | Entra |
| QA7-11 | RC-01, RC-02, RC-04, U | Textos para el dueño: jerga en portada y privacidad (`privacidad/page.tsx:11, 17`), tú y vos, Clerk en inglés o con "Regístrese" | Menor | P2 | S · 4 h | Federico | — | Entra |
| QA7-12 | RC-22, RC-25 | "Proveedo…" cortado a 360 px (`bottom-nav.tsx:17, 40`) y mensaje del 409 de invitación (`collaborators.ts:65-72`) | Menor | P3 | XS · 2 h | Federico + Mauricio | — | Entra |
| QA7-13 | RV371-I2, RV374-I1 | CI del backend: cobertura en `Backend Build & Tests` (`ci.yml:45`) y pruebas de integración con PostgreSQL | Menor | P2 | S · 3 h | Darío | — | Entra |
| QA7-14 | RV422-I1 | Webhook: comparar el precio redondeado a 2 decimales (`webhooks.ts:216, 242`) | Menor | P2 | XS · 2 h | Mauricio | — | Entra |
| QA7-15 | RV386-I1 | Prueba del estado de margen con mínimo distinto de 30 % (`ingredients.test.ts`) | Menor | P3 | XS · 1 h | Mauricio | — | Entra |
| QA7-16 | RV410-I1 | Prueba de respuestas fuera de orden (`hooks/__tests__/usePaginatedList.test.ts`) | Menor | P3 | XS · 1 h | Federico | — | Entra |
| QA7-17 | RV387-I1 | Pruebas automáticas de accesibilidad con axe | Menor | P2 | S · 4 h | Leandro + Federico | #398 | Entra |
| QA7-18 | RV381-I1, RV415-I1 | Especificación funcional (`especificacion-funcional.md:299`, fuente "ADR-004 / POS") y cuerpo del reporte semanal en `docs/api.md` §11 | Menor | P3 | XS · 2 h | Mauricio (revisa Leandro) | — | Entra |
| QA7-19 | RV375-I1 | Medir la mediana de respuesta con y sin `search` en staging | Menor | P3 | XS · 1 h | Leandro | — | Entra |
| — | RV371-I3 | Verificar unidades y PUT de costo en staging | — | — | — | Leandro | — | Not planned: se suma como caso a #399 |
| — | RV376-I1 | Pantalla completa en los bottom sheets | — | — | — | — | — | Not planned: el diálogo ya se adaptó y es riesgo después del congelamiento |
| — | U | Impedir la baja de un proveedor con insumos predeterminados | — | — | — | — | — | Not planned: el diálogo actual informa y conserva el costo; el texto se simplifica en QA7-09 |
| — | RC-13 | "Superávit" con mínimo ≥ 60 % | — | — | — | — | — | Not planned: regla acordada en #367; se aclara en el manual |
| — | RC-07 | "Documentación" lleva a GitHub | — | — | — | — | — | Not planned: el manual se entrega en #401 |
| — | Datos | Restos de pruebas en staging | — | — | — | Darío | — | Not planned: se suma a #400 como reseed |

## Propuesta aparte: reenfoque de Compras sugeridas

| ID | Tipo | Descripción | Prio. | Size · Estimate | Responsable | Blocked by | Decisión |
|---|---|---|---|---|---|---|---|
| R-03 | ADR | "MargenX no gestiona stock ni compras", con la evidencia del recorrido (RC-16 a RC-19) | P1 | XS · 2 h | Darío | — | Entra |
| R-01 | Backend | Impacto en el margen por insumo: productos afectados, margen actual contra margen con la alternativa y cuántos salen de "En riesgo" o "Pérdida" | P1 | M · 8 h | Mauricio | R-03 | Entra si la ADR se aprueba el 22/11 |
| R-02 | Frontend | Compras como "Impacto en el margen", sin calculadora de bultos ni pedido semanal, botón "Ya le compro a este proveedor" con confirmación que muestre el impacto; absorbe RC-16 a RC-19 y los puntos de usabilidad de Compras | P1 | M · 8 h | Federico | R-01 | Entra si la ADR se aprueba el 22/11 |
