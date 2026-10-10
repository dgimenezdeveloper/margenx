

**Proyecto:** MargenX — Control de Márgenes en Tiempo Real  
**Documento:** Especificación Funcional y Técnica de Catálogo, Abastecimiento y Roles  
**Versión:** 1.0 (Consolidada)  

---

## 1. Introducción y Filosofía del Producto

El principal motivo de fracaso en los sistemas de gestión de costos (ERP tradicionales) para PyMEs gastronómicas y talleres artesanales es la **fricción en la carga de datos**:
* Los dueños no tienen tiempo de cargar listas de precios a mano.
* Los proveedores envían listas desordenadas en PDF, Excel o mensajes de WhatsApp con formatos y códigos dispares.
* Si el sistema exige configurar códigos de barra, proveedores y conversiones complejas desde el primer minuto, el usuario abandona la aplicación en menos de 48 horas.

Para resolver este problema de raíz, MargenX se rige bajo el principio de **Complejidad Progresiva**:
> *La aplicación debe ser ultra simple y funcional el Día 1 (sin exigir datos que el usuario no tiene a mano), y debe permitir activar capas avanzadas de automatización (multi-proveedor, lectura automática de archivos, sugerencia de compras) a medida que el negocio escala.*

```
                 [ DÍA 1: ARRANQUE ]
                 Carga simple (Manual o Plantilla básica)
                 Cálculo de recetas inmediato
                         │
                         ▼
                 [ DÍA 15: OPERACIÓN ]
                 Mapeo de Proveedores y Códigos
                 Actualizaciones de listas por correo
                         │
                         ▼
                 [ DÍA 30: ESCALABILIDAD ]
                 Automatización "Zero-Click" con n8n
                 Sugerencias de compras al menor costo
```

---

## 2. Día Cero: Onboarding y Carga Inicial de Insumos (Resolución del "Huevo y la Gallina")

### El Dilema
* Si un producto necesita insumos para calcular su costo, pero cargar insumos exige conocer proveedores, códigos de artículo y factores de empaque, el usuario se traba en un callejón sin salida antes de ver el primer margen de su negocio.

### La Solución: Desacoplar el Insumo del Proveedor
Un insumo en MargenX **puede vivir toda su vida sin un proveedor asignado**. El proveedor no es un requisito obligatorio del dato; es una **herramienta opcional de automatización**.

Para el Día Cero, el usuario tiene **3 caminos de entrada** según su tamaño y volumen de materias primas:

```
                              ┌──> CAMINO A: "Arranque Rápido" (Carga manual directa)
                              │
USUARIO NUEVO (Base limpia) ──┼──> CAMINO B: "Plantilla Oficial MargenX" (CSV/Excel simple)
                              │
                              └──> CAMINO C: "Starter Packs" por Rubro (Precarga guiada)
```

### Camino A: El "Arranque Rápido" (Para emprendedores o negocios chicos)
* El usuario ingresa a `/insumos` y da de alta únicamente lo que tiene en mente:
  * *Carne picada — $4.200 por kg*
  * *Pan brioche — $950 por unidad*
  * *Queso cheddar — $6.800 por kg*
* No se le exige CUIT del proveedor, código de barras ni listas externas.
* **Resultado:** En 3 minutos tiene 10 insumos cargados y puede armar su primera receta.

### Camino B: La "Plantilla Oficial MargenX" (Para negocios con inventario previo)
* Si el comercio maneja más de 40 insumos y no quiere escribirlos uno a uno, descarga un archivo modelo provisto por la plataforma con 3 columnas básicas:
  $$\text{Nombre del Insumo} \quad\mid\quad \text{Unidad de Medida} \quad\mid\quad \text{Costo Actual}$$
* Sube el archivo procesado en `/insumos` y el sistema inserta todo el catálogo limpio en un solo paso.

### Camino C: "Starter Packs" por Rubro (Onboarding Acelerado)
* Al registrarse por primera vez, el sistema ofrece un asistente de configuración:
  * *«¿A qué rubro pertenece tu comercio? [Panadería] [Hamburguesería] [Química de Limpieza]»*
* Si selecciona **Panadería**, el sistema ofrece precargar los insumos estándar del sector (*Harina 000, Levadura prensada, Grasa vacuna, Manteca, Azúcar, Sal fina*) con sus unidades base y costos de referencia de mercado.
* El usuario solo ajusta los precios a su realidad local y su despensa queda lista instantáneamente.

---

## 3. Ciclo de Vida de Productos y Recetas

### ¿Puede un producto crearse sin insumos?
**Sí.** Forzar la creación simultánea de producto y receta bloquea la carga comercial.
* **Estado Borrador ("Sin Costear / Sin Receta"):** Un comerciante puede cargar su menú o lista de precios de venta antes de pesar los ingredientes:
  * *Hamburguesa Simple — Precio de Venta: $3.800 — Margen Mínimo: 35%*
* Mientras no tenga receta asociada, el producto permanece visible con el estado **"Sin Receta"**; no calcula márgenes ficticios del 100% ni dispara alertas erróneas de rentabilidad. El motor de cálculo se activa en cuanto se asocia el primer componente.

### Creación de Insumos "En Caliente" (Inline Creation)
Si el usuario está diseñando una receta compleja en `/productos/nuevo` y advierte que olvidó cargar un insumo en la despensa:
* **Flujo deficiente:** Cancelar el formulario, perder los datos ingresados, navegar a `/insumos`, crear el insumo y volver a empezar la receta.
* **Flujo MargenX (Inline):** En el selector de ingredientes de la receta, la última opción del desplegable ofrece **`+ Crear nuevo insumo`**. Se abre un modal secundario, se define el insumo (*Nombre, Unidad, Costo*), se guarda y queda inmediatamente seleccionado en la receta sin abandonar la pantalla.

---

## 4. El Desafío Multi-Proveedor: Códigos y Empaques Dispares

### El Problema de la Realidad Comercial
En la práctica comercial B2B:
1. El comercio llama a la materia prima de una forma interna (*Harina 000*).
2. El Proveedor A la factura como `ART-9921 - HARINA TRIGO TIPO 000 BOLSA 50KG`.
3. El Proveedor B la factura como `B-44 - HAR. 000 INDUSTRIAL X 25KG`.
4. El proveedor **vende por bulto cerrado** (bolsa de 50 kg a $45.000), pero la receta del comercio **costea por peso unitario** (gramos o kilogramos).

### La Solución: Tabla de Equivalencias (SKU Cross-Reference) con Factor de Conversión
Se desacopla la entidad `Ingredient` de la compra física mediante una tabla intermedia denominada `SupplierIngredient`:

```
┌─────────────────────────┐               ┌───────────────────────────────┐
│       INGREDIENT        │               │           SUPPLIER            │
│  (Catálogo Interno)     │               │     (Distribuidor/Molino)     │
├─────────────────────────┤               ├───────────────────────────────┤
│ id: uuid                │               │ id: uuid                      │
│ name: "Harina 000"      │               │ name: "Distribuidora Sur"     │
│ unit: "kg"              │               └──────────────┬────────────────┘
│ currentCost: $900.00    │                              │
└───────────┬─────────────┘                              │
            │              ┌─────────────────────────────┴┐
            │              │      SUPPLIER_INGREDIENT     │
            │              │     (Tabla Equivalencia)     │
            │              ├──────────────────────────────┤
            └─────────────>│ id: uuid                     │
                           │ supplierCode: "ART-9921"     │
                           │ rawDesc: "HARINA 000 X 50KG" │
                           │ packagePrice: $45,000.00     │
                           │ conversionFactor: 50.000     │
                           │ unitCostCalculated: $900.00  │
                           └──────────────────────────────┘
```

#### El Rol del Factor de Conversión
El campo `conversionFactor` indica cuántas unidades base del negocio contiene el empaque cerrado del proveedor:
$$\text{Costo Unitario para Receta} = \frac{\text{Precio del Bulto del Proveedor}}{\text{Factor de Conversión}}$$

* *Ejemplo:* Si la bolsa de 50 kg (`Factor = 50`) de Distribuidora Sur cuesta `$45.000`, el sistema calcula:
  $$\text{Costo por kg} = \frac{45.000\text{ ARS}}{50\text{ kg}} = 900\text{ ARS/kg}$$
* Si la próxima semana la bolsa sube a `$50.000`, el costo se actualiza automáticamente a `$1.000 / kg`.

### Mapeo Asistido: "Aprender una sola vez y olvidar para siempre"
El usuario no necesita cargar códigos de artículos a mano:
1. Cuando llega una lista de un proveedor, el sistema procesa los artículos.
2. Si un código ya fue vinculado previamente, se actualiza en silencio en milisegundos.
3. Si aparece un código nuevo que el comerciante desea costear, el sistema lo deriva a una bandeja de **"Insumos Pendientes de Mapeo"**:
   * *El sistema muestra:* «El proveedor envió: `ART-9921 - HARINA 50KG` a `$45.000`».
   * *El usuario selecciona en un desplegable:* Insumo: `Harina 000` | Empaque: `50 kg`.
   * *Acción:* Clic en "Vincular".
4. La relación queda grabada permanentemente. Las listas futuras de ese proveedor se procesarán de forma automática.

---

## 5. Automatización "Zero-Click" con n8n y Prevención de "Basura en el Catálogo"

### 5.1. El Problema de la Polución de Datos (Catalog Pollution)
Si un distribuidor mayorista envía un archivo Excel con su catálogo completo de 5.000 artículos y el sistema ejecutara una importación masiva ciega, la base de datos se saturaría con 4.950 insumos innecesarios que degradan las búsquedas, ensucian los reportes y ralentizan las consultas.

### 5.2. Infraestructura Multi-Tenant de Ingesta a Costo $0
Para permitir que múltiples comercios utilicen el sistema sin incurrir en costos de casillas de correo corporativas dedicadas por cliente, se implementa una arquitectura basada en **Cloudflare Email Routing (Catch-All)**:

```
┌──────────────────────────────────────────────────────────┐
│  CONFIGURACIÓN ÚNICA DE INFRAESTRUCTURA (Costo: $0)      │
│                                                          │
│  1. Cloudflare DNS: MX records de margenx.tech           │
│  2. Cloudflare Email Routing: Regla Catch-All activada   │
│     → Reenvía TODO (*@margenx.tech) a:                   │
│       margenx.saas@gmail.com                             │
│  3. Gmail: 1 única casilla gratuita con IMAP habilitado  │
│  4. n8n: 1 trigger IMAP apuntando a esa cuenta de Gmail  │
└──────────────────────────────────────────────────────────┘
```

Cada cliente recibe una dirección virtual propia derivada de su slug comercial:
- `precios+panaderia-central@margenx.tech`
- `precios+quimica-gyj@margenx.tech`
- `precios+cafeteria-norte@margenx.tech`

No son casillas reales; son alias infinitos resueltos por la misma regla Catch-All. Todas las listas llegan a la misma cuenta central de Gmail, y n8n discrimina la cuenta destino leyendo el slug en la cabecera `To:`.

### 5.3. Identificación Implícita del Proveedor por `supplierCode`
**Decisión arquitectónica:** NO se identifica al proveedor mediante la cabecera `From:` ni por el nombre del archivo adjunto.
- **La cabecera `From:` se ignora:** El correo es reenviado por el dueño o encargado del comercio, no directamente por el proveedor mayorista.
- **Resolución implícita:** Cada fila del archivo contiene un código de artículo (`supplierCode`). En el modelo de datos, la tabla `SupplierIngredient` ya vincula de forma unívoca `(supplierId, supplierCode)` con un insumo interno (`ingredientId`). Por ende, el sistema sabe exactamente a qué proveedor y a qué insumo corresponde cada precio sin necesidad de que el remitente o el archivo lo aclaren.
- El campo `Supplier.contactEmail` permanece como informativo/contacto, sin impacto en la lógica de ingestión.

### 5.4. Flujo Completo de Ingesta Zero-Click (7 Pasos)

```
┌─────────────────────────────────────────────────────────────────┐
│  PASO 1: El proveedor envía lista de precios                   │
│  (por email O por WhatsApp — al dueño, no a MargenX)           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 2: El dueño reenvía a su dirección MargenX               │
│  → precios+<slug-de-su-comercio>@margenx.tech                  │
│                                                                 │
│  El dueño solo necesita recordar SU slug de comercio.           │
│  No requiere especificar de qué proveedor se trata.             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 3: Cloudflare → Gmail → n8n (IMAP Trigger)               │
│                                                                 │
│  n8n extrae del header "To:":                                   │
│    precios+panaderia-central@margenx.tech                       │
│              └──────────────┘                                   │
│              accountSlug = "panaderia-central"                  │
│                                                                 │
│  ⚠ El header "From:" se IGNORA (es el remitente del reenvío).  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 4: n8n parsea el adjunto (Excel/CSV) a JSON              │
│                                                                 │
│  Resultado: [                                                   │
│    { code: "MC-990", description: "HARINA 000 50KG", price: 48000 },
│    { code: "MC-115", description: "AZUCAR 25KG", price: 22000 },
│    ... (3.000 filas)                                            │
│  ]                                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 5: n8n → POST /api/webhooks/supplier-prices               │
│                                                                 │
│  Body: {                                                        │
│    accountSlug: "panaderia-central",                            │
│    items: [ { code, description, price }, ... ]                 │
│  }                                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 6: Backend — Filtro Anti-Pollution                        │
│                                                                 │
│  Para cada item del payload:                                    │
│                                                                 │
│  SELECT si FROM SupplierIngredient si                           │
│  JOIN Ingredient i ON si.ingredientId = i.id                    │
│  WHERE si.supplierCode = item.code                              │
│  AND i.accountId = :accountId                                   │
│                                                                 │
│  ┌── Match encontrado ──────────────────────────────────────┐   │
│  │ → UPDATE si.packagePrice = item.price                    │   │
│  │ → Recalcular unitCost = packagePrice / conversionFactor  │   │
│  │ → Si es el mínimo → UPDATE Ingredient.currentCost        │   │
│  │ → Disparar recálculo en cascada de productos afectados   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌── Sin match ─────────────────────────────────────────────┐   │
│  │ → DESCARTAR silenciosamente (no contamina la BD)         │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 7: n8n envía resumen por email al dueño                   │
│                                                                 │
│  "Se actualizaron 3 insumos de 3.000 filas.                     │
│   2.997 filas descartadas (sin mapeo previo).                   │
│   1 producto quedó con margen bajo: Hamburguesa Doble (18%)."   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.5. Manejo de Errores y Notificaciones
Para garantizar robustez operativa sin intervención de soporte técnico, n8n gestiona los siguientes casos de excepción:

| Escenario | Acción de n8n |
|:----------|:-------------|
| **Email sin adjunto procesable** | Responde al remitente: *"No se encontró un archivo Excel (.xlsx, .xls) o CSV adjunto en el correo."* |
| **Slug no registrado** | Responde: *"La dirección no corresponde a ningún comercio registrado en MargenX."* |
| **Archivo con 0 matches de código** | Notifica: *"Ningún artículo del archivo coincide con los códigos mapeados en tu cuenta. Podés vincular nuevos insumos desde la bandeja de mapeo."* |
| **Archivo corrupto o ilegible** | Notifica: *"No fue posible leer el archivo adjunto. Asegurate de enviar un archivo Excel o CSV válido."* |

### 5.6. Soporte para Listas Recibidas por WhatsApp
Los comerciantes reciben frecuentemente listas de precios en formato Excel por WhatsApp. En lugar de contratar la costosa API oficial de Meta (costo por conversación):
- El comerciante abre el archivo en su teléfono celular, selecciona **"Compartir archivo" → "Correo"**.
- Elige su dirección virtual `precios+<slug>@margenx.tech` y envía.
- El sistema lo procesa a través del mismo pipeline IMAP/Cloudflare sin requerir adaptaciones de software ni infraestructura adicional.

### 5.7. Carga Masiva sin Microservicios: Arquitectura Convergente
Para evitar el uso de librerías pesadas de subida y procesamiento binario (`multer`, streams multiparte) en el backend de Node.js/Express, se diseñó una arquitectura donde tanto la carga manual como la automática convergen en un único contrato JSON:

| Camino | Quién parsea el archivo | Momento de uso |
|:-------|:-----------------------|:--------------|
| **Carga Manual (Plantilla Oficial)** | **Frontend** (Navegador con `SheetJS`) | Onboarding asistido (Camino B) o carga batch desde la UI. El usuario previsualiza y valida antes de enviar. |
| **Ingesta Automática por Correo** | **n8n** (Nodo Spreadsheet File) | Actualización periódica desatendida vía reenvío de listas de mayoristas. |

Ambos canales envían un JSON homogéneo al endpoint:
```typescript
POST /api/webhooks/supplier-prices
{
  accountSlug: string,
  items: Array<{
    code: string,
    description?: string,
    price: number
  }>
}
```
El backend actúa exclusivamente como validador de negocio y ejecutor de la transacción de actualización y recálculo en cascada.

---

## 6. Motor de Compras Inteligente (Smart Purchasing)

Al disponer de un catálogo donde un mismo insumo puede estar vinculado a múltiples proveedores, el sistema adquiere capacidad analítica de optimización de compras:

$$\text{Costo Vigente del Insumo} = \min \left( \frac{\text{Precio Proveedor}_1}{\text{Factor}_1}, \frac{\text{Precio Proveedor}_2}{\text{Factor}_2}, \dots \right)$$

### Funcionalidades de la Vista `/compras`
1. **Detección Automática de Oportunidades:** Si el Molino A subió la harina a `$1.000/kg` pero el Distribuidor B la mantiene a `$920/kg`, el sistema destaca el ahorro potencial.
2. **Sugerencia Consolidada de Pedido:** La plataforma agrupa las materias primas por proveedor óptimo para emitir órdenes de compra eficientes:
   * *Pedido Proveedor A:* Comprar Insumos X, Y (Ahorro estimado: $12.400).
   * *Pedido Proveedor B:* Comprar Insumos Z, W (Ahorro estimado: $8.200).

---

## 7. Evolución del Modelo de Roles: El Colaborador Operativo

### Redefinición del Perfil de Acceso
Con la automatización de la lectura de precios mediante n8n, el rol de **Colaborador** deja de ser un mero transcriptor de facturas (data entry) y pasa a funcionar como un **operador de salón / mostrador**:
* **Información Restringida (Oculta por RBAC en Backend):**
  * Costo individual de materias primas.
  * Costo total de elaboración de recetas.
  * Margen bruto porcentual y nominal.
  * Datos y listas de proveedores mayoristas.
* **Información Operativa Visible:**
  * Nombre del producto terminado.
  * **Precio de Venta al Público actualizado.**

### El Tablero de Precios Vigentes y Notificación de Cambios
Cuando la suba de un insumo provoca que el Administrador incremente el precio de venta de la *Hamburguesa Doble* de `$4.000` a `$4.500`:
* El Colaborador en el local debe enterarse inmediatamente para modificar la cartelera, el pizarrón exterior o actualizar el sistema de comandas/caja.
* El Colaborador dispone de una vista limpia (`/precios-vigentes`) con un indicador de **"Precios Modificados Recientemente"** para facilitar su actualización física en el punto de venta.

---

## 8. Estrategia de Notificaciones a Costo $0

Para garantizar la viabilidad del MVP sin incurrir en costos operativos de mensajería (descartando la API oficial de WhatsApp de Meta debido a su esquema tarifario por conversación de servicio comercial), la arquitectura implementa tres canales alternativos gratuitos:

| Canal | Destinatario | Mecanismo Técnico | Caso de Uso Principal |
| :--- | :--- | :--- | :--- |
| **In-App Notification (Campana)** | Administrador y Colaborador | Componente de UI en el Navbar conectado a base de datos | Aviso de cambio de precios de venta para actualizar pizarra en el local |
| **Telegram Bot** | Administrador | Nodo nativo de Telegram en n8n (100% gratuito e ilimitado) | Alertas críticas inmediatas: *"Producto X cayó por debajo del 20% de margen"* |
| **PWA Web Push** | Administrador y Colaborador | Service Worker + Web Push API (`display: standalone`) | Notificaciones nativas al teléfono móvil sin requerir publicar en App Stores |
| **Correo Electrónico (SMTP)** | Administrador | Nodo de Email en n8n contra servidor de correo estándar | Resúmenes semanales consolidados y reportes PDF de rentabilidad |

---

## 9. Esquema Relacional de Persistencia (Prisma Data Model)

El modelo relacional evoluciona limpiamente para incorporar proveedores, códigos de equivalencia y enrutamiento multi-tenant por correo sin romper los datos existentes:

```prisma
// Entidad del Comercio (Aislamiento Multi-Tenant)
model Account {
  id               String       @id @default(uuid())
  businessName     String
  slug             String       @unique // Slug URL-safe ("panaderia-central") para ingesta por email
  subscriptionPlan String       @default("FREE")
  trialEndsAt      DateTime?
  isActive         Boolean      @default(true)
  createdAt        DateTime     @default(now())
  users            User[]
  ingredients      Ingredient[]
  products         Product[]
  suppliers        Supplier[]
}

// Catálogo Base de Insumos (Unidad de medida de costeo)
model Ingredient {
  id                  String               @id @default(uuid())
  accountId           String
  name                String
  unit                String               // Unidad interna de costeo: kg, l, u
  currentCost         Decimal              @db.Decimal(10, 2) // Precio mínimo de referencia
  updatedAt           DateTime             @updatedAt
  account             Account              @relation(fields: [accountId], references: [id], onDelete: Cascade)
  products            ProductIngredient[]
  supplierConnections SupplierIngredient[] // Múltiples proveedores vinculados
}

// Proveedores del Comercio
model Supplier {
  id                  String               @id @default(uuid())
  accountId           String
  name                String
  contactEmail        String?              // Informativo/contacto (no functional para ingesta)
  account             Account              @relation(fields: [accountId], references: [id], onDelete: Cascade)
  catalogItems        SupplierIngredient[]
}

// Tabla de Equivalencias y Mapeo de Códigos de Proveedor (SKU Mapping)
model SupplierIngredient {
  id                  String               @id @default(uuid())
  ingredientId        String
  supplierId          String
  supplierCode        String               // Código interno del proveedor (ej. ART-9921)
  rawDescription      String?              // Descripción original del proveedor
  packagePrice        Decimal              @db.Decimal(10, 2) // Precio del bulto cerrado
  conversionFactor    Decimal              @db.Decimal(10, 3) @default(1) // Cantidad de unidades base por bulto
  updatedAt           DateTime             @updatedAt
  ingredient          Ingredient           @relation(fields: [ingredientId], references: [id], onDelete: Cascade)
  supplier            Supplier             @relation(fields: [supplierId], references: [id], onDelete: Cascade)

  @@unique([supplierId, supplierCode])    // Un código es único por proveedor
}

// Catálogo de Productos Terminados
model Product {
  id                  String               @id @default(uuid())
  accountId           String
  name                String
  salePrice           Decimal              @db.Decimal(10, 2)
  minMarginPercent    Decimal              @db.Decimal(5, 2)  @default(30)
  targetMarginPercent Decimal?             @db.Decimal(5, 2)  // Margen objetivo para cálculo sugerido
  cost                Decimal              @db.Decimal(10, 2) @default(0) // Costo total calculado
  marginAmount        Decimal              @db.Decimal(10, 2) @default(0)
  marginPercent       Decimal              @db.Decimal(5, 2)  @default(0)
  updatedAt           DateTime             @updatedAt
  account             Account              @relation(fields: [accountId], references: [id], onDelete: Cascade)
  ingredients         ProductIngredient[]
}

// Ficha Técnica / Receta del Producto
model ProductIngredient {
  id                  String               @id @default(uuid())
  productId           String
  ingredientId        String
  quantity            Decimal              @db.Decimal(10, 3) // Cantidad en la unidad del Insumo
  product             Product              @relation(fields: [productId], references: [id], onDelete: Cascade)
  ingredient          Ingredient           @relation(fields: [ingredientId], references: [id], onDelete: Cascade)

  @@unique([productId, ingredientId])
}
```

### Decisión de Arquitectura: Integridad Referencial en `ProductIngredient → Ingredient`

A nivel de base de datos relacional, la relación `ProductIngredient → Ingredient` se declara explícitamente con **`onDelete: Cascade`**.

#### Justificación Técnica
Si se configurase `onDelete: Restrict` en la base de datos, se impediría la eliminación completa de una cuenta (`Account`) debido a cómo PostgreSQL resuelve los árboles de eliminación en cascada. El motor no garantiza el orden de evaluación entre ramas hermanas:

```
Account (DELETE CASCADE)
  ├── Ingredient (CASCADE)  ← BLOQUEADO si ProductIngredient tiene Restrict hacia Ingredient
  └── Product (CASCADE)
       └── ProductIngredient (CASCADE)
```

Al intentar eliminar la cuenta del cliente, la eliminación de `Ingredient` fallaría si PostgreSQL la procesa antes de haber purgado los `ProductIngredient`.

#### Mecanismo de Protección a Nivel de Aplicación
Para garantizar que un usuario no elimine accidentalmente un insumo que esté siendo utilizado en recetas activas, la protección se ejecuta en el **controlador del backend (`DELETE /api/ingredients/:id`)**:
1. Antes de proceder con la eliminación, el backend consulta si existen registros en `ProductIngredient` vinculados a dicho `ingredientId`.
2. Si existen recetas asociadas, la petición es rechazada de inmediato con código **`409 Conflict`** y un mensaje descriptivo:  
   *"Este insumo está en uso en N recetas activas. Eliminá o desvinculá las recetas primero para poder borrarlo."*
3. De esta manera, el usuario individual queda 100% protegido contra pérdidas accidentales de recetas, mientras la base de datos conserva la capacidad de purgar cuentas completas sin bloqueos relacionales.

---

## 10. Hoja de Ruta y Despliegue en Sprints

Para preservar la estabilidad del equipo y evitar la saturación del alcance, esta arquitectura se incorpora de forma gradual en el cronograma:

```
[ SPRINT 1 ] ──> Cierre del CRUD base de Insumos y Productos (Sin recetas).
                 Deploy productivo en Azure y Seed inicial de BD.

[ SPRINT 2 ] ──> MVP Core: Lógica de Recetas y cálculo matemático de margen.
                 Soporte de productos "Sin Costear" (PR #55). Insumos inline.
                 Carga masiva via Plantilla Oficial MargenX (SheetJS en frontend).
                 Demo obligatoria del MVP en Azure (Hito 03/10).

[ SPRINT 3 ] ──> Multi-Proveedor: Creación de tablas Supplier, SupplierIngredient y Account.slug.
                 Mapeo SKU con Factor de Conversión y cálculo de min(unitCost).
                 Sugerencia de Precios de venta en base a margen objetivo en Frontend.
                 Rol Colaborador operativo (RBAC y vista /precios-vigentes).

[ SPRINT 4 ] ──> Ingesta Zero-Click por correo: Cloudflare Catch-All + Gmail + n8n.
                 Filtro Anti-Pollution en webhook y descarte estricto de ítems no mapeados.
                 Validación 409 Conflict al intentar borrar insumo en uso.
                 Recálculo transaccional en cascada (#28) y Bandeja de Mapeo Asistido.

[ SPRINT 5 ] ──> Inteligencia de Abastecimiento: Sugerencia de Compras óptimas (Smart Purchasing).
                 Alerta de insumos estancados (14 días sin actualizar) y vista /compras.
                 Reporte PDF semanal consolidado de pérdidas vía n8n.

[ SPRINT 6 ] ──> PWA Mobile: Instalabilidad con Service Workers y Bot de Telegram para alertas críticas.
                 Documentación OpenAPI/Swagger, Release v1.0 y defensa final.
```

---

## 11. Conclusión y Valor Diferencial

Este diseño transforma a MargenX de una calculadora estática de planillas en un **ecosistema de protección financiera en tiempo real**:
1. **Es accesible desde el minuto uno:** Permite operar a un microemprendedor cargando 5 insumos a mano.
2. **Resuelve el dolor de la inflación:** El dueño no pasa horas pasando facturas; reenvía el archivo mayorista y el sistema actualiza su estructura de costos en segundo plano.
3. **Mantiene la higiene de datos:** No importa si la lista del proveedor trae 10.000 líneas; el sistema solo procesa los insumos que afectan la rentabilidad real del negocio.
4. **Protege la información confidencial:** El personal operativo sabe qué precios cobrar en salón, pero la rentabilidad y los acuerdos comerciales permanecen exclusivamente en manos del dueño.

---

### 1. ¿Qué se necesita tener cargado ANTES en la base de datos?

Para que `SupplierIngredient` pueda existir, **es obligatorio que el Insumo y los Proveedores ya existan previamente** (porque necesita sus IDs para unirlos).

#### En la tabla `Ingredient` (Tu catálogo interno):
Tienes **1 solo registro**:
*   `id`: `insumo-101` (un UUID generado por la base de datos).
*   `name`: `"Harina 000"` (como le dice tu panadero).
*   `unit`: `"kg"` (la unidad que usas para pesar en las recetas).
*   `currentCost`: `$880.00` (el costo activo que usa la receta para calcular el pan).

#### En la tabla `Supplier` (Tus contactos de compra):
Tienes **4 registros independientes**:
*   Proveedor 1: `id: prov-1` | `name: "Molino Cañuelas"`
*   Proveedor 2: `id: prov-2` | `name: "Distribuidora San Cayetano"`
*   Proveedor 3: `id: prov-3` | `name: "Mayorista Makro"`
*   Proveedor 4: `id: prov-4` | `name: "Distribuidora del Centro"`

---

### 2. ¿Cómo se vinculan los 4 proveedores al mismo insumo?

Se vinculan creando **4 filas separadas en la tabla `SupplierIngredient`**. 

Todas las filas apuntan al mismo `ingredientId` (`insumo-101`), pero cada una tiene su propio código, su propia descripción, su precio de bulto y su **factor de empaque**:

| id (Fila) | `ingredientId` (Insumo) | `supplierId` (Proveedor) | `supplierCode` (Código del proveedor) | `rawDescription` (Cómo viene en su lista) | `packagePrice` (Precio de compra) | `conversionFactor` (Kilos por bulto) | **Costo por kg calculado** |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | `insumo-101` | `prov-1` (Cañuelas) | `MC-990` | `"HARINA TRIGO TIPO 000 50KG"` | $45.000 | 50 | **$900 / kg** |
| **2** | `insumo-101` | `prov-2` (San Cayetano) | `ART-012` | `"HAR. 000 BOLSA X 25 KGS"` | $23.000 | 25 | **$920 / kg** |
| **3** | `insumo-101` | `prov-3` (Makro) | `MK-PACK-10` | `"PACK 10X1KG HARINA TRIGO"` | $9.500 | 10 | **$950 / kg** |
| **4** | `insumo-101` | `prov-4` (Del Centro) | `5521` | `"HARINA 000 COMUN 50K"` | $44.000 | 50 | **$880 / kg** ⭐ *(El más barato)* |

---

### 3. ¿Cómo se ve esto en la pantalla del usuario (UI)?

El usuario no ve tablas de base de datos. En la pantalla es súper intuitivo:

1.  Entra a `/insumos` y hace clic en **"Harina 000"**.
2.  Ve una pestaña llamada **"Proveedores vinculados (4)"**.
3.  Si quiere agregar al cuarto proveedor, hace clic en **`+ Agregar Proveedor`**:
    *   *Elige del desplegable:* `Distribuidora del Centro`.
    *   *Código que figura en su factura:* `5521`.
    *   *Descripción:* `HARINA 000 COMUN 50K`.
    *   *Precio que pagó:* `$44.000`.
    *   *¿Cuánto trae el paquete?:* `50 kg`.
4.  El sistema calcula solo: `$44.000 / 50 = $880/kg`.
5.  **El sistema detecta:** *$880 es menor que los $900 que pagaba antes*. Actualiza automáticamente el `currentCost` de la "Harina 000" a **$880**.

---

### 4. ¿Qué pasa cuando un proveedor manda su Excel? (Por qué esto elimina el problema)

Imagina que **Molino Cañuelas** manda un Excel de 3.000 filas por mail:

1.  **n8n** lee el archivo y busca la fila donde el código del artículo sea `MC-990` con precio nuevo `$48.000`.
2.  El backend de MargenX busca en `SupplierIngredient`:
    *   *«¿Tengo un registro de Molino Cañuelas con código `MC-990`?»* ➔ **SÍ, la Fila 1.**
3.  El backend no tiene que adivinar nombres raros. Ya sabe que la Fila 1 corresponde a `insumo-101` (Harina 000) y que trae `50 kg`.
4.  Hace la cuenta:  
    $$\text{Nuevo precio Cañuelas} = \frac{48.000\text{ ARS}}{50\text{ kg}} = 960\text{ ARS/kg}$$
5.  Actualiza la Fila 1.
6.  Luego el sistema compara:  
    *«A Cañuelas le subió a $960, pero Distribuidora del Centro me la sigue vendiendo a $880. Mi costo de receta sigue siendo $880, no toco el precio del pan»*.
7.  Le llega un aviso al dueño:  
    *«Molino Cañuelas aumentó la harina a $960/kg. Tu mejor opción sigue siendo Distribuidora del Centro ($880/kg)»*.

---

### 5. ¿Por qué esto protege tu receta?

Tu receta de **Pan Común** solo conoce esto:
*   Insumo: `insumo-101` ("Harina 000").
*   Cantidad: `0.65 kg`.
*   Costo: `$880`.

**A la receta le da exactamente igual quién te vendió la harina, en qué empaque vino o qué código tenía la bolsa.** La receta solo consume el resultado final (`currentCost`). 

Toda la complejidad de los 4 proveedores, sus códigos raros y sus empaques cerrados queda atrapada y aislada dentro de **`SupplierIngredient`**.