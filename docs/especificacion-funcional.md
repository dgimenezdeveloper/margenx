# Especificación funcional y diseño de dominio — MargenX

**Documento:** catálogo de insumos, recetas, proveedores, ingesta de listas de precios y roles.
**Versión:** 2.0 · **Fecha:** 26/10/2026 · **Responsable:** Darío Giménez (Tech Lead)
**Reemplaza a:** `especificacion-funcional-abastecimiento.md` y `Diseño-Dominio-Arquitectura-Gestion-Insumos-Multi‐Proveedor-Automatización-Operativa.md` (versión 1.0). Este documento los unifica y los corrige contra el código de `develop` al 26/10/2026.

## Cómo leer este documento

- **Qué describe:** el comportamiento del producto y las reglas de dominio. No repite lo que ya tiene una fuente propia:
  - el esquema de base de datos completo está en `backend/prisma/schema.prisma` (§9 solo resume las reglas);
  - la fórmula del margen y su justificación están en `docs/adr/0004-calculo-margen-ventas-vs-markup.md`;
  - la regla de costo vigente, retención en cuarentena y canal de ingesta están formalizadas en `docs/adr/0005-costo-vigente-cuarentena-e-ingesta.md`;
  - la regla de n8n y la arquitectura de despliegue están en `docs/adr/0003-automatizacion-satelite-n8n.md` y en `docs/Arquitectura-Software-(SAD).md`;
  - el cronograma vigente está en `CHANGELOG.md` y en las actas de `docs/retrospectivas/`.
- **Jerarquía:** los ADR aceptados y la Definition of Done mandan sobre el SAD, y el SAD manda sobre este documento. Si encontrás una contradicción, gana la fuente de mayor jerarquía y este documento se corrige.
- **Estado de cada funcionalidad:**

| Marca | Significado |
|---|---|
| **Disponible** | Implementado en `develop`. |
| **Planificado** | Comprometido en el backlog del sprint en curso; todavía no existe. |
| **Propuesta** | Idea de diseño sin sprint asignado. No se presenta como funcionalidad del producto. |

---

## 1. Propósito y principio rector

El motivo más común de abandono de los sistemas de costos en PyMEs gastronómicas, de manufactura artesanal y de química de limpieza es la **fricción en la carga de datos**: el dueño no tiene tiempo de cargar listas a mano, los proveedores mandan listas desordenadas (PDF, Excel, WhatsApp) con códigos dispares, y si el sistema exige proveedores, códigos y conversiones desde el primer minuto, el usuario abandona.

MargenX se rige por el principio de **complejidad progresiva**: la aplicación es simple y útil el primer día, sin pedir datos que el usuario no tiene a mano, y permite activar capas de automatización a medida que el comercio las necesita.

```
[ DÍA 1: ARRANQUE ]        Insumos cargados a mano · recetas y margen al instante
          │
          ▼
[ OPERACIÓN ]              Proveedores y presentaciones · proveedor predeterminado
          │
          ▼
[ AUTOMATIZACIÓN ]         Ingesta de listas por correo · cuarentena de precios anómalos
```

---

## 2. Día Cero: carga inicial de insumos

### El dilema

Un producto necesita insumos para calcular su costo. Si para cargar un insumo hiciera falta conocer de antemano el proveedor, el código de artículo y el tamaño del bulto, el comercio se trabaría antes de ver su primer margen.

### La solución: el insumo no depende del proveedor

Un insumo **puede existir sin proveedor**. Solo necesita tres datos: **nombre**, **unidad de costeo** (`kg`, `l` o `u`) y **costo actual por unidad**. Los proveedores, sus presentaciones y la ingesta automática son capas opcionales que se activan después (§4 y §5).

Hay tres caminos de entrada. Los tres terminan en el mismo lugar, insumos en la despensa (`/insumos`) listos para usar en recetas, y ninguno crea proveedores ni códigos de artículo.

| Camino | Para quién | Cómo funciona | Estado |
|---|---|---|---|
| **A. Arranque rápido** (carga manual) | Comercios con pocos insumos | En **Insumos**, "Nuevo insumo": nombre, unidad y costo por unidad (ej. *Harina 000 — kg — $736,25*). | **Disponible** |
| **B. Plantilla oficial** (CSV o Excel) | Comercios con muchos insumos ya en una planilla | Descargar la plantilla (Nombre, Unidad, Costo en formato `1.234,56` o `1234.56`), completarla y subirla desde **Insumos**. Una vista previa muestra filas válidas, filas con error y nombres duplicados; al confirmar se crean los insumos válidos en una sola operación. | **Planificado** |
| **C. Starter pack por rubro** | Comercios que arrancan de cero | Al primer ingreso se elige el rubro (panadería, hamburguesería, química de limpieza), se ve la lista sugerida con su unidad, se desmarca lo que no se usa, se ajusta el costo y se confirma. | **Propuesta** |

Reglas del camino A (vigentes):

- La unidad del insumo es la unidad de la receta: si la harina se carga en `kg`, la receta pide kilos (0,65 kg, no 650 g).
- El costo debe ser mayor a cero y como máximo $99.999.999,99.
- Si después se edita el costo, se registra el cambio en el historial de precios y se recalculan en cascada todos los productos que usan el insumo (§6).
- Un insumo que está en una receta no se puede borrar (§10).

Decisiones de diseño del camino B:

- El archivo se lee **en el navegador** y se envía a un endpoint autenticado de alta masiva, solo para ADMIN, con validación por fila, tope de filas, transacción y respuesta con creados, omitidos y errores.
- **No** usa el webhook de ingesta (§5): ese webhook está reservado a n8n, exige un secreto interno que no puede viajar al navegador y solo actualiza precios de artículos ya vinculados; no crea catálogo. La plantilla y la ingesta comparten solo las reglas de lectura (nombres de columna y formato de números), no el contrato.

Decisión de diseño del camino C: los costos "de referencia de mercado" envejecen rápido con la inflación. Si se implementa, los insumos sugeridos se precargan con su fecha de referencia o con el costo marcado "a confirmar", y la carga reutiliza el alta masiva del camino B.

---

## 3. Productos y recetas

### Producto en borrador ("Sin Receta") · *Disponible*

Un producto puede crearse **sin insumos**, para que el comercio cargue su lista de precios de venta antes de pesar ingredientes (ej. *Hamburguesa Simple — precio de venta $3.800 — margen mínimo 35 %*).

- Mientras no tenga receta, la interfaz lo muestra como **"Borrador (Sin Receta)"**.
- Su costo es 0 y su margen se informa como `0.00 %`: significa "sin costo cargado", no "rentabilidad nula" (ADR-004). No dispara alertas.
- El cálculo se activa en cuanto se asocia el primer insumo.

### Receta (ficha técnica) · *Disponible*

- Cada línea de la receta vincula un insumo con una cantidad expresada en la unidad del insumo (hasta 3 decimales). Un insumo aparece una sola vez por receta.
- Costo del producto = suma de `cantidad × costo actual del insumo`. Margen sobre el precio de venta, con `Prisma.Decimal` y redondeo a 2 decimales (ADR-004).
- Cada producto tiene su margen mínimo (`minMarginPercent`); la cuenta tiene un margen mínimo por defecto (`defaultMinMarginPercent`, 30 %).

### Alta de insumo desde la receta ("+ Crear nuevo insumo") · *Propuesta*

Mientras se arma una receta en `/productos/nuevo` o `/productos/:id`, la última opción del selector de insumos permitiría crear un insumo en un modal secundario (nombre, unidad, costo) y dejarlo seleccionado sin abandonar la pantalla. Hoy no existe: hay que crear el insumo en **Insumos** y volver a la receta.

---

## 4. Proveedores y presentaciones

### El problema

1. El comercio llama a la materia prima de una forma interna (*Harina 000*).
2. Cada proveedor la factura con su propio código y descripción (`MC-990 — HARINA TRIGO TIPO 000 50KG`).
3. El proveedor vende por **bulto cerrado** (bolsa de 50 kg), pero la receta costea por **unidad base** (kg).

### La solución: presentaciones de proveedor (`SupplierIngredient`) · *Disponible*

El insumo (`Ingredient`) se desacopla de la compra física mediante una **presentación**: la forma en que un proveedor vende ese insumo.

| Campo | Qué es |
|---|---|
| `packageSize` | Cantidad de unidades base que trae el bulto (ej. `50`). |
| `packageUnit` | Unidad del bulto. **Debe coincidir con la unidad del insumo** (`kg`, `l` o `u`); si no coincide, la API responde 400. |
| `packagePrice` | Precio del bulto cerrado. |
| `isDefault` | Marca la presentación **predeterminada** del insumo. |
| `supplierCode` | Código de artículo del proveedor. Opcional; único por proveedor. |
| `rawDescription` | Descripción del artículo tal como viene en la lista del proveedor. Opcional. |
| `pendingPackagePrice`, `isQuarantined`, `quarantinedAt`, `quarantineReason` | Estado de cuarentena (§5.4). |

Costo unitario de una presentación:

```
costo unitario = packagePrice / packageSize     (2 decimales, redondeo ROUND_HALF_UP)
```

Ejemplo: bolsa de 25 kg a $18.406,25 → $736,25 por kg.

### Reglas vigentes

- **Costo vigente del insumo = costo unitario de la presentación predeterminada.** El administrador elige a mano qué presentación es la predeterminada ("Hacer predeterminado" en la ficha del insumo). Al cambiarla, el costo del insumo pasa a ser el de la nueva presentación y se recalculan las recetas en cascada (§6). La justificación y el comportamiento ante ediciones manuales están formalizados en **ADR-005** (`docs/adr/0005-costo-vigente-cuarentena-e-ingesta.md`). El sistema **no** toma automáticamente el proveedor más barato: el mínimo entre proveedores es información para decidir (§7), no una regla de costo.
- Si el administrador edita a mano el costo de un insumo que tiene presentación predeterminada, la próxima actualización de precio de esa presentación lo reemplaza (ADR-005).
- **Una sola presentación por par proveedor-insumo.** El modelo no admite, por ejemplo, un pack de 10 × 1 kg y una bolsa de 50 kg del mismo mayorista para el mismo insumo (restricción `@@unique([supplierId, ingredientId])`).
- Asociar una presentación a un par que ya existe la actualiza (upsert), no la duplica.
- Borrar un proveedor borra sus presentaciones; el costo actual de los insumos no cambia.
- Todas las operaciones de proveedores son solo para ADMIN.

### Ejemplo: un insumo, cuatro proveedores

| Proveedor | Código | Bulto | Precio del bulto | Costo por kg | Predeterminado |
|---|---|---|---:|---:|:---:|
| Molino Cañuelas | `MC-990` | 50 kg | $45.000 | $900 | ✅ |
| Distribuidora San Cayetano | `ART-012` | 25 kg | $23.000 | $920 | |
| Mayorista Makro | `MK-PACK-10` | 10 kg | $9.500 | $950 | |
| Distribuidora del Centro | `5521` | 50 kg | $44.000 | $880 | |

El costo de la *Harina 000* en las recetas es **$900/kg**, el de la presentación predeterminada, aunque Distribuidora del Centro sea más barata. Si el administrador marca a Distribuidora del Centro como predeterminada, el costo pasa a $880/kg y se recalculan todos los productos que usan harina.

La receta solo conoce el insumo, la cantidad y el costo actual. Quién vendió la harina, en qué bulto y con qué código queda aislado en las presentaciones.

### Código de artículo del proveedor

- La ingesta por correo (§5) identifica cada fila de la lista por su `supplierCode`. Sin código cargado, la presentación no se actualiza sola.
- El alta de presentaciones desde la app acepta `supplierCode` y `rawDescription`; si el código no se completa, la asociación se conserva y el backend avisa explícitamente que ese insumo no recibirá precios por ingesta hasta que se complete el mapping.
- **Bandeja de códigos no mapeados** · *Propuesta*: guardar los códigos recibidos sin vínculo para que el administrador los asocie a un insumo ("aprender una sola vez"). Hoy esos códigos se descartan y solo se informan en el resumen por correo.

---

## 5. Ingesta automática de listas de precios por correo

### 5.1. El problema: la polución del catálogo

Un mayorista manda su catálogo completo (miles de artículos). Si el sistema lo importara a ciegas, la base se llenaría de insumos que el comercio no usa. Por eso rige la **regla de descarte estricto**:

> La lista de un proveedor **nunca** crea insumos. **Solo** actualiza precios de presentaciones cuyo `supplierCode` ya está vinculado en la cuenta.

### 5.2. Canal de entrada · *Disponible (activación en producción: Planificado)*

El canal de ingesta desatendida y su filtro de descarte están formalizados en **ADR-005** §3 (`docs/adr/0005-costo-vigente-cuarentena-e-ingesta.md`).

```
Proveedor ──(email o WhatsApp)──> Dueño del comercio
                                       │ reenvía la lista
                                       ▼
                       precios-<slug>@margenx.tech
                                       │ Cloudflare Email Routing (catch-all)
                                       ▼
                          Casilla central (IMAP)
                                       │
                                       ▼
          n8n: extrae el slug y el adjunto, lee CSV/XLSX/XLS, normaliza columnas
                                       │ POST /api/webhooks/supplier-prices
                                       ▼            (cabecera x-margenx-webhook-secret)
          Backend: valida, filtra, aplica cuarentena y recalcula (§5.3)
                                       │ respuesta con el resultado
                                       ▼
          n8n: correo de resumen al dueño (Brevo)
```

- **Dirección de ingesta:** `precios-<slug>@margenx.tech`, donde `slug` es el identificador único de la cuenta (`Account.slug`). Es el formato oficial. El flujo de n8n también acepta `precios.<slug>@` y `precios+<slug>@`.
- No hay una casilla real por comercio: la regla catch-all de Cloudflare envía todo `*@margenx.tech` a una casilla central, y n8n identifica la cuenta por el slug del destinatario.
- **Se ignora el remitente (`From:`)**: el correo lo reenvía el dueño, no el proveedor. El proveedor se identifica de forma implícita por el `supplierCode` de cada fila.
- **WhatsApp:** el dueño comparte el archivo recibido por WhatsApp por correo a su dirección de ingesta. No se usa la API de WhatsApp de Meta por su costo por conversación.
- Columnas reconocidas, formatos de número, límites (más de 5.000 filas se envían en varios lotes), reintentos y manejo de errores del lado de n8n: ver `infra/n8n/README.md`.
- n8n nunca escribe directamente en la base de datos: todo cambio pasa por la API (ADR-003).

### 5.3. Procesamiento en el backend · *Disponible*

Contrato:

```typescript
POST /api/webhooks/supplier-prices
// Cabecera: x-margenx-webhook-secret (comparación en tiempo constante; si falta o no coincide, 401)
{
  accountSlug: string,                        // mínimo 2 caracteres
  items: Array<{                              // entre 1 y 5.000 por solicitud
    code: string,
    description?: string,
    price: number                             // precio del bulto, mayor a cero
  }>
}
// 200 OK | 400 payload inválido | 401 no autorizado | 404 slug inexistente o cuenta inactiva
// 413 cuerpo mayor a 5 MB (código PAYLOAD_TOO_LARGE): n8n debe dividir la lista en lotes más chicos
```

El límite de 5 MB es propio de esta ruta; el resto de la API acepta hasta 256 KB (`backend/src/index.ts`, detalle en `docs/api.md`).

Reglas, en orden:

1. **Cuenta:** el slug debe corresponder a una cuenta activa; si no, 404.
2. **Duplicados en el lote:** si un código aparece más de una vez, vale la última fila y se cuenta como duplicado.
3. **Búsqueda:** cada código se busca entre las presentaciones de la cuenta.
4. **Descartes** (no modifican nada y se informan con su motivo):
   - `NOT_FOUND`: el código no está vinculado en la cuenta;
   - `INACTIVE_SUPPLIER`: el código solo existe en proveedores inactivos;
   - `AMBIGUOUS`: el mismo código está vinculado en más de un proveedor activo.
5. **Sin cambios:** si el precio es igual al vigente, no se modifica nada (y si la presentación estaba en cuarentena, sale de ella).
6. **Cuarentena:** si corresponde (§5.4), el precio nuevo queda retenido y el vigente no cambia.
7. **Actualización:** se guarda el nuevo precio del bulto. Si la presentación es la **predeterminada**, se actualiza el costo del insumo y se recalculan en cascada sus productos (§6). Si no lo es, solo cambia el precio de esa presentación.

Todo el lote se procesa en una única transacción. La respuesta informa recibidos, actualizados, sin cambios, en cuarentena, duplicados y descartados, hasta 100 códigos descartados con su motivo, el correo del administrador de la cuenta y los productos que cruzaron su margen mínimo. Con esa respuesta n8n arma el resumen al dueño.

### 5.4. Cuarentena de precios anómalos · *Disponible*

Un precio queda **retenido** (no se aplica) bajo las reglas formalizadas en **ADR-005** (`docs/adr/0005-costo-vigente-cuarentena-e-ingesta.md`):

| Motivo (`quarantineReason`) | Condición |
|---|---|
| `VARIACION_MAYOR_50_POR_CIENTO` | El costo unitario nuevo varía más de un 50 %, en más o en menos, respecto del vigente. |
| `COSTO_UNITARIO_INSUFICIENTE` | El costo unitario nuevo es menor o igual a $0,01, o no se puede calcular. |

- El precio retenido se guarda en `pendingPackagePrice`; el vigente sigue en uso.
- El administrador resuelve la cuarentena en **`/proveedores/cuarentena`**:
  - **Liberar** aplica el precio retenido; si la presentación es la predeterminada, actualiza el costo del insumo, recalcula en cascada y, si algún producto cruza su margen mínimo, dispara la alerta (§6).
  - **Rechazar** descarta el precio retenido y conserva el vigente. Hoy no avisa a nadie (ADR-005).
- Si una lista posterior trae otra vez el precio vigente, la presentación sale de la cuarentena.

---

## 6. Recálculo en cascada y alertas de margen

### Recálculo · *Disponible*

Cuando cambia el costo de un insumo (edición manual, cambio de presentación predeterminada, liberación de cuarentena o ingesta), en una sola transacción se:

1. actualiza el costo del insumo;
2. registra el cambio en el historial de precios (`PriceHistory`);
3. recalculan costo y margen de todos los productos que lo usan;
4. detectan los productos que **cruzaron** su margen mínimo.

En la edición manual de un insumo, si el costo no cambió, no se abre la transacción ni se recalcula nada.

### Alertas

- Un producto genera alerta **solo cuando cruza** el umbral: pasa de un margen mayor o igual al mínimo a uno menor. Un producto que ya estaba por debajo no vuelve a alertar.
- **Correo al dueño** · *Disponible*: ante la edición manual del costo, el alta o cambio de la presentación predeterminada y la liberación de un precio en cuarentena, el backend envía el evento `margin.alert.triggered` a n8n, que manda el correo vía Brevo. En la ingesta por correo, los productos críticos van dentro del resumen.
- **Indicador visual** · *Disponible*: el semáforo de margen en el panel y en los productos.
- **Otros canales** · *Propuesta*: notificación dentro de la app, bot de Telegram y notificaciones push de la PWA. Todos deben ser de costo $0.

---

## 7. Compras inteligentes (Smart Purchasing) · *Propuesta*

Con varios proveedores por insumo, el sistema puede sugerir dónde comprar:

- **Oportunidades de ahorro:** para cada insumo, comparar el costo unitario de la presentación predeterminada con el menor costo unitario entre sus presentaciones (en el ejemplo de §4: $900 contra $880, ahorro de $20/kg).
- **Pedido sugerido:** agrupar los insumos por el proveedor más conveniente, con el ahorro estimado por pedido.

La sugerencia **no cambia** el costo vigente: el administrador decide si cambia el proveedor predeterminado (§4). Así el costo de las recetas solo cambia por una decisión explícita y queda registrado en el historial.

---

## 8. Roles y visibilidad

MargenX tiene dos roles por cuenta, gestionados con Clerk (ADR-001). El control se aplica en el backend y se repite en la interfaz como segunda capa.

| | ADMIN (dueño) | COLLABORATOR (salón o mostrador) |
|---|---|---|
| Productos: nombre y precio de venta | Ve y edita | **Ve** |
| Costos de insumos y recetas, márgenes, umbrales | Ve y edita | **No ve**: la API los quita de las respuestas |
| Insumos (`/insumos`), proveedores y cuarentena | Accede | **No accede** (la ruta lo redirige; la API de proveedores responde 403) |
| Métricas del panel | Ve | **No ve** |
| Altas, ediciones y bajas | Puede | **No puede**: la API rechaza toda mutación |

- Implementación: `backend/src/middlewares/rbac.ts` (`requireRole`, `blockCollaboratorMutations`, `sanitizeFinancialData`) y, en la interfaz, `AdminOnlyRoute` y `useUserRole`.
- El colaborador **no edita costos**. Este documento reemplaza en ese punto al RF-12 y al RNF-09 de `docs/propuesta-proyecto.md`, que decían que el colaborador podía editar costos y que no veía el precio de venta.
- **Receta para el colaborador** · *Disponible*: ve qué insumos lleva cada producto, pero no las cantidades, los costos ni los subtotales, y no tiene acciones de edición. La API quita `quantity` de las respuestas para este rol (`FINANCIAL_FIELDS` en `rbac.ts`). En el perfil no ve el margen objetivo global ni la configuración de alertas. Detalle para el usuario: `docs/manual-usuario/03-colaborador.md`.
- **Vista de precios vigentes para el colaborador** · *Propuesta*: una vista simple con los precios de venta y un indicador de "modificados recientemente", para actualizar la pizarra o la caja.

---

## 9. Modelo de datos (resumen)

La fuente de verdad es `backend/prisma/schema.prisma`. Esta sección resume solo las reglas de dominio.

| Entidad | Rol | Reglas clave |
|---|---|---|
| `Account` | Comercio (tenant) | `slug` único (dirección de ingesta); `defaultMinMarginPercent` (30 % por defecto); `isActive`. |
| `User` | Persona de la cuenta | `role` `ADMIN` o `COLLABORATOR`; `authProviderId` vincula con Clerk. |
| `Ingredient` | Insumo del catálogo interno | `unit` `kg`, `l` o `u`; `currentCost` = costo vigente. |
| `Supplier` | Proveedor de la cuenta | Nombre único por cuenta; `isActive`; contacto opcional (`contactPhone`, `email`, `address`). |
| `SupplierIngredient` | Presentación de un proveedor para un insumo | Única por par proveedor-insumo; `supplierCode` opcional y único por proveedor; ver §4. |
| `PriceHistory` | Historial de cambios de costo de un insumo | Costo anterior, costo nuevo y fecha. |
| `Product` | Producto terminado | Nombre único por cuenta; `salePrice`, `minMarginPercent`; `cost`, `marginAmount` y `marginPercent` calculados (`marginPercent` admite valores negativos). |
| `ProductIngredient` | Línea de receta | Única por par producto-insumo; `quantity` en la unidad del insumo. |

**Aislamiento entre cuentas:** toda consulta se filtra por el `accountId` del usuario autenticado, que sale del JWT de Clerk y nunca del cliente (`docs/definition-of-done.md` §6). Los proveedores y las presentaciones heredan la cuenta de su insumo.

---

## 10. Integridad referencial: cascada en la base y 409 en la API

En la base, la relación receta → insumo (`ProductIngredient → Ingredient`) se declara con **`onDelete: Cascade`**, igual que el resto de las relaciones que cuelgan de la cuenta.

**Por qué no `Restrict`:** al borrar una cuenta, PostgreSQL no garantiza el orden entre ramas hermanas de la cascada. Con `Restrict`, el borrado de `Ingredient` podría ejecutarse antes que el de los `ProductIngredient` y bloquear la eliminación de la cuenta.

```
Account (CASCADE)
  ├── Ingredient (CASCADE)   ← se bloquearía con Restrict hacia ProductIngredient
  └── Product (CASCADE)
       └── ProductIngredient (CASCADE)
```

**Protección en la API:** `DELETE /api/ingredients/:id` revisa antes si el insumo está en alguna receta. Si lo está, responde **409 Conflict** con la lista de productos afectados (`productsAffected`) y no borra nada. Así el usuario no pierde recetas por accidente y la base conserva la capacidad de purgar cuentas completas.

---

## 11. Estado de implementación

| Capacidad | Estado |
|---|---|
| Carga manual de insumos (camino A) | Disponible |
| Plantilla oficial CSV/Excel (camino B) | Planificado |
| Starter pack por rubro (camino C) | Propuesta |
| Productos en borrador y recetas | Disponible |
| Alta de insumo desde la receta | Propuesta |
| Proveedores y presentaciones desde la ficha del insumo, proveedor predeterminado | Disponible |
| Vista y detalle de proveedores | Planificado |
| Código de artículo cargado desde la app | Planificado |
| Bandeja de códigos no mapeados | Propuesta |
| Ingesta por correo, filtro de descarte y resumen | Disponible (activación en producción: Planificado) |
| Cuarentena de precios y bandeja `/proveedores/cuarentena` | Disponible |
| Recálculo en cascada y alerta por correo al cruzar el margen mínimo | Disponible |
| Notificación en la app, Telegram y push | Propuesta |
| Compras inteligentes | Propuesta |
| Receta sin cantidades ni costos para el colaborador | Disponible |
| Vista de precios vigentes para el colaborador | Propuesta |

## 12. Decisiones pendientes

1. ¿Se permiten varias presentaciones del mismo proveedor para un insumo (por ejemplo, pack chico y bolsa)? Hoy el modelo lo impide.
2. ¿Rechazar un precio en cuarentena debe avisar al dueño? Hoy no avisa.
3. ¿Qué pasa al quitar la presentación predeterminada de un insumo? Hoy no existe un endpoint para borrar una presentación.
4. ¿Entra el camino C (starter packs) en el alcance del proyecto?
