# 7. Adopción de Modelo RBAC con Roles Fijos (ADMIN y COLLABORATOR) frente a Permisos Granulares

* **Estado:** Aceptado
* **Fecha:** 2026-11-06
* **Decisores:** Darío Giménez (Tech Lead / DevOps), Mauricio Barreras (Lead Backend), Federico Paal (Lead Frontend), Leandro Herrera (QA Engineer)
* **Issue:** #254 (S5-DOCS-02)
* **Relacionado con:** ADR-001 (Clerk Authentication), `docs/especificacion-funcional.md` (§8), `backend/src/middlewares/rbac.ts`, `frontend/src/components/admin-only-route.tsx`

---

## Contexto y Planteamiento del Problema

MargenX opera como un SaaS multi-tenant destinado a PyMEs gastronómicas, fábricas de pastas y elaboradores químicos. En estos comercios conviven dos perfiles claramente diferenciados:
1. **El Dueño / Administrador:** Toma decisiones comerciales, negocia con proveedores, fija el margen objetivo de ganancia y absorbe las variaciones de materias primas.
2. **El Empleado de Salón / Cajero:** Atiende el mostrador, cobra al público y necesita conocer con exactitud el precio de venta actualizado de cada producto para no cobrar importes desfasados, pero **bajo ninguna circunstancia debe tener visibilidad sobre el costo real de elaboración, las fórmulas de las recetas ni el margen de ganancia neta del negocio**.

Durante el diseño de la plataforma se evaluaron dos alternativas para resolver el control de acceso:
- **Alternativa A (Permisos Granulares Configurables / Matriz IAM):** Crear tablas relacionales de roles personalizados, permisos por pantalla y asignación granular de banderas (`can_view_margins`, `can_edit_costs`, `can_manage_suppliers`) administradas por el dueño en una pantalla de configuración.
- **Alternativa B (Modelo de Roles Fijos Nativos: ADMIN y COLLABORATOR):** Establecer dos roles inmutables a nivel de dominio y delegar en el backend la sanitización estricta de datos financieros.

---

## Decisión

Se decide adoptar la **Alternativa B: Modelo RBAC con Dos Roles Fijos Nativos (`ADMIN` y `COLLABORATOR`)** para el alcance del MVP y la versión 1.0 de MargenX.

### Fundamentos Técnicos y de Dominio

1. **Simplicidad de Onboarding (Cero Fricción para la PyME):**
   Los comercios gastronómicos no disponen de personal de TI. Configurar una matriz de permisos de 20 casillas antes de incorporar a un empleado resulta en abandono de la herramienta. Con dos roles fijos, el dueño solo selecciona "Colaborador" al invitar al empleado y el sistema queda configurado de forma segura al instante.

2. **Blindaje Financiero de Doble Capa:**
   - **Capa 1 — Server-Side Obligatoria (Express):** El middleware `sanitizeFinancialData` intercepta toda respuesta saliente cuando el token JWT corresponde a `COLLABORATOR`, purga recursivamente los campos prohibidos (`cost`, `marginAmount`, `marginPercent`, `minMarginPercent`, `defaultMinMarginPercent`, `packagePrice`, `packageSize`, `quantity`, `suppliers`) y adjunta la cabecera `Cache-Control: private, no-store`. Por su parte, `blockCollaboratorMutations` rechaza cualquier método no seguro (`POST`, `PUT`, `DELETE`) con código `403 Forbidden`.
   - **Capa 2 — Client-Side React (SPA):** El componente `AdminOnlyRoute` redirige las rutas de administración (`/insumos`, `/proveedores`, `/proveedores/cuarentena`, `/productos/nuevo`) hacia `/productos`. El componente `MarginBadge` no monta nodos en el DOM si el usuario es colaborador, evitando fugas visuales o parpadeos.

3. **Postergación a Fase 2:**
   La matriz de permisos granulares por usuario (roles intermedios como *Encargado de Compras* con edición de insumos pero sin visibilidad de precios de venta) se difiere formalmente para la Fase 2 (versión comercial post-defensa académica).

---

## Consecuencias y Compensaciones (Trade-offs)

### Positivas
* **Seguridad Robusta:** Cero riesgo de fuga de datos en la red. Un colaborador malicioso que inspeccione la pestaña Network o el DOM del navegador solo encontrará nombres y precios finales de venta.
* **Mantenibilidad del Código:** La lógica de autorización está centralizada en un middleware unificado (`backend/src/middlewares/rbac.ts`) con 100% de cobertura de pruebas unitarias y validación continua en la suite E2E de Playwright (`rbac-security.spec.ts`).
* **Eficiencia de Persistencia:** El rol se almacena como un `ENUM ('ADMIN', 'COLLABORATOR')` en la tabla `User` de PostgreSQL y viaja en el JWT firmado asimétricamente por Clerk, sin requerir joins adicionales a tablas de permisos en cada solicitud.

### Costos Asumidos
* **Rigidez de Asignación:** Un empleado de confianza que reciba mercadería no puede actualizar costos por sí mismo sin ser promovido a `ADMIN` (lo que le otorgaría visibilidad total de los márgenes). Para este caso de uso, el comercio utiliza la ingesta desatendida por correo (`precios-<slug>@margenx.tech`), que no requiere intervención del colaborador.