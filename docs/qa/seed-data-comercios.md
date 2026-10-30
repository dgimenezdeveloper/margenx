# QA - Seed Data de comercios

Issues relacionadas:

- #5: preparación del dataset de referencia.
- #30: implementación y validación del seed idempotente.
- #178: proveedores mayoristas reales y mapeo de SKU por `SupplierIngredient`.

## Objetivo

Disponer de un conjunto reproducible de datos para Panadería Central y
Química GyJ, cargado mediante `npx prisma db seed`, sin duplicar registros
en ejecuciones consecutivas.

## Alcance del Sprint 1

El archivo `backend/prisma/seed.ts` carga:

| Entidad | Panadería Central | Química GyJ | Total del seed |
|---|---:|---:|---:|
| Account | 1 | 1 | 2 |
| User | 2 | 2 | 4 |
| Ingredient | 10 | 10 | 20 |
| Product | 4 | 4 | 8 |

No se insertan, modifican ni eliminan registros de `ProductIngredient`.

Las recetas se incorporarán en el Sprint 2. Los campos calculados
`cost`, `marginAmount` y `marginPercent` mantienen sus valores existentes;
para productos nuevos se utilizan los valores predeterminados del esquema.
Estos valores no representan un cálculo de rentabilidad realizado por el seed.

Bizcochitos de grasa y esencia/desodorante de piso concentrado quedan fuera
de los ocho productos seleccionados.

## Fuentes y convenciones

### Planilla de referencia

[MargenX — Dataset QA Panadería y Química](https://docs.google.com/spreadsheets/d/1W8F57XGc-AW9aYCH1cFMp-yrhmfnKmankE1Zd2MCNYQ/edit?usp=sharing)

- Panadería: datos tomados de las capturas de la planilla de QA.
- Química: costos de insumos y precios de venta confirmados por el responsable
  de QA a partir de la información del comercio.
- Proveedor real de Química GyJ: **Limpikorn**, lista de precios en
  [Google Drive](https://docs.google.com/spreadsheets/d/1SMS808HLBco91-5RsFQN_WXSy9UHwPPHtt9jVzn-ZRA/edit?usp=sharing).
  Opacante y Colorante no figuran en esa planilla porque no están a la venta
  directa; sus precios fueron confirmados por mensaje directo del proveedor.
- Los precios nuevos de Química reemplazan los anteriores para este seed.
  Confirmados contra la lista de precios de Limpikorn (ver fuente arriba):
  los 10 insumos coinciden exactamente con los valores cargados en el seed.
- No se consultan precios ni cotizaciones durante la ejecución del script.

### Importes y unidades

- Todos los importes están expresados en ARS.
- Las tablas siguientes usan punto decimal y no usan separadores de miles.
- Los valores monetarios se construyen mediante `Prisma.Decimal` desde strings.
- Para los insumos originalmente cotizados en USD se utiliza una conversión
  fija de **1540.00 ARS por USD**, elegida por QA como referencia de dólar blue venta.
- Referencia de cotización: [LA NACION — Dólar hoy](https://www.lanacion.com.ar/dolar-hoy/).
  Es una referencia congelada del dataset, no una cotización actualizada automáticamente.
- Se conservan las unidades de la referencia: `kg`, `l` y `u`.
  En particular, el huevo utiliza `u`.
- Los precios de productos corresponden a la presentación indicada en el nombre.
  El esquema actual de Product no tiene un campo independiente de presentación.
- En Química no se incluyen envases ni descuentos por volumen.
- `minMarginPercent` representa el margen mínimo configurado, no el margen real.

## Cuentas piloto

| businessName | id |
|---|---|
| Panadería Central | `30a00000-0000-4000-8000-000000000001` |
| Química GyJ | `30a00000-0000-4000-8000-000000000002` |

Las cuentas nuevas utilizan los valores predeterminados del esquema.
El seed no sobrescribe el plan, el estado ni el vencimiento de prueba
de las cuentas existentes.

## Insumos de Panadería Central

El valor de `currentCost` que queda cargado tras ejecutar el seed es el que
indica la columna **costo activo (post-seed)**: el insumo con un proveedor
predeterminado (`isDefault: true` en la sección
[Proveedores y mapeo de SKU](#proveedores-y-mapeo-de-sku-issue-178) más abajo)
toma el costo de esa presentación mayorista (`packagePrice / packageSize`),
no el valor histórico declarado en el script. Ver issue #178.

| name | unit | currentCost declarado — ARS | costo activo (post-seed) — ARS |
|---|---|---:|---:|
| Harina de trigo 000 Olavarriense | kg | 736.25 † | **736.25** (MarJuanC) |
| Harina de trigo 0000 Olavarriense | kg | 868.77 | **845.05** (MarJuanC) |
| Azúcar común tipo A | kg | 1150.00 | **1140.00** (MarJuanC) |
| Manteca en bloque mayorista | kg | 12090.00 | **10050.94** (MarJuanC) |
| Grasa bovina refinada La Cordobesa | kg | 5990.00 | **3885.31** (MarJuanC) |
| Levadura fresca La Cordobesa | kg | 6000.00 | **6724.58** (MarJuanC) |
| Sal fina Aurora | kg | 484.24 | **472.26** (MarJuanC) |
| Leche entera larga vida Silvia | l | 1715.00 | 1715.00 (Don Roque, sin cambio) |
| Huevo grande | u | 176.17 | **193.33** (Don Roque) |
| Ricota Castelmar | kg | 4294.14 | **4615.00** (Don Roque) |

Notas de la referencia:

- Huevo: `5285 / 30`, redondeado a dos decimales. Ese era el cálculo original;
  el costo activo real (Don Roque, maple de 30 a $5.800) lo reemplaza.
- Ricota: precio mayorista estimado para una pieza aproximada de 3 kg. El
  costo activo real (Don Roque, Ricota Silvia x 5 kg) lo reemplaza.
- Azúcar y huevo figuraban con precio publicado y sin stock.
- La columna "currentCost declarado" es la referencia histórica del dataset
  (Sprint 1); se conserva en `backend/prisma/seed.ts` como valor de respaldo
  para insumos sin proveedor predeterminado.
- † Harina de trigo 000: el valor declarado se corrigió de `742.98` a `736.25`
  (issue #265) para que coincida con el costo activo, porque la cifra vieja
  no era un respaldo real en uso — este insumo siempre tuvo proveedor
  predeterminado — y el PR #217 mostró que generaba confusión real al
  aparecer sin explicación junto al costo vigente de la presentación. El
  resto de los insumos de esta tabla conserva su valor declarado histórico
  sin tocar, porque nadie reportó la misma confusión sobre ellos.

## Insumos de Química GyJ

| name | unit | currentCost — ARS |
|---|---|---:|
| Pasta suavi | kg | 15400.00 |
| Soda | l | 2300.00 |
| Etoxilado | kg | 4928.00 |
| Sulfonico | l | 6930.00 |
| Aceite | l | 36960.00 |
| Alcohol | l | 2400.00 |
| Nonil | l | 10010.00 |
| Sal | kg | 230.00 |
| Opacante | l | 10166.00 |
| Color | l | 2000.00 |

Los 10 valores ya coinciden exactamente con el precio del proveedor real
(Limpikorn, ver más abajo), por lo que el costo activo post-seed no cambia.

Conversiones utilizadas:

- Pasta suavi: USD 10/kg × 1540 = ARS 15400/kg.
- Etoxilado: USD 3.20/kg × 1540 = ARS 4928/kg.
- Sulfonico: USD 4.50/l × 1540 = ARS 6930/l.
- Aceite: USD 24/l × 1540 = ARS 36960/l.
- Nonil: USD 6.50/l × 1540 = ARS 10010/l.
- Alcohol: ARS 12000 por 5 l = ARS 2400/l.
- Sal: ARS 11500 por 50 kg = ARS 230/kg.
- Color: ARS 10000 por 5 l = ARS 2000/l.

## Proveedores y mapeo de SKU (issue #178)

El seed carga proveedores reales, con sus presentaciones mayoristas
(`SupplierIngredient`) y, cuando el proveedor publica un código de artículo,
su `supplierCode`. `rawDescription` conserva el nombre del producto tal como
figura en la lista de precios del proveedor.

### Panadería Central

**Distribuidora MarJuanC Alimentos** — harinas, azúcares, grasas, margarinas
y levaduras. Lista de precios en PDF (14/10/2026), precio bonificado por
volumen. Todas las presentaciones son el proveedor predeterminado (`isDefault:
true`) de su insumo.

| Insumo | SKU | Producto (lista bonificada) | Presentación | Costo/kg o /l |
|---|---|---|---:|---:|
| Harina de trigo 000 Olavarriense | HAR188 | HARINA SARITA 000 X 25 KG (×30 u) | 25 kg / $18.406,25 | 736.25 |
| Harina de trigo 0000 Olavarriense | HAR187 | HARINA SARITA 0000 X 25 KG (×30 u) | 25 kg / $21.126,22 | 845.05 |
| Azúcar común tipo A | AZU015 | AZUCAR TIPO A paquete 10x1kg (×200 u) | 10 kg / $11.400,00 | 1140.00 |
| Manteca en bloque mayorista | CRE101 | MANTECA COTAGU X 5 KG (×100 u) | 5 kg / $50.254,70 | 10050.94 |
| Grasa bovina refinada La Cordobesa | GRA013 | GRASA LA CORDOBESA X 20 KG (×100 u) | 20 kg / $77.706,20 | 3885.31 |
| Levadura fresca La Cordobesa | LEV201 | LEVADURA LA CORDOBESA X 10 KG (×100 u) | 10 kg / $67.245,80 | 6724.58 |
| Sal fina Aurora | SAL010 | SAL FINA DOBLE VÍA X 25 KG (×5 u) | 25 kg / $11.806,61 | 472.26 |

**Don Roque** — lácteos, huevos y dulces, lo que MarJuanC no comercializa.
Datos tomados de capturas puntuales de su catálogo web
(`https://www.donroqueonline.com.ar/catalogo/`); todavía no tiene una lista
de precios exportable para automatizar, por lo que **no publica un
`supplierCode` propio**. Los códigos `DR-*` de la tabla son códigos internos
de referencia asignados para las pruebas de ingesta masiva (issue #176) —
no son un SKU de Don Roque, reemplazar cuando llegue su lista real.
Todas las presentaciones son el proveedor predeterminado de su insumo.

| Insumo | Código (interno, issue #176) | Producto | Presentación | Costo/kg, /l o /u |
|---|---|---|---:|---:|
| Leche entera larga vida Silvia | DR-LECHE01 | Leche Entera Larga Vida Sachet Silvia x 1 Lt | 1 l / $1.715,00 | 1715.00 |
| Huevo grande | DR-HUEVO01 | Huevo x Maple B1 (grande) — maple de 30 u | 30 u / $5.800,00 | 193.33 |
| Ricota Castelmar | DR-RICOTA01 | Ricota Silvia x 5 Kg | 5 kg / $23.075,00 | 4615.00 |

**Distribuidora Mayorista Molinera** — proveedor ficticio original de la
issue #30. Se conserva únicamente como segunda presentación de Harina 000
(`isDefault: false`, 25 kg / $18.000,00 → $720,00/kg) para ejercitar la
selección del proveedor predeterminado cuando un insumo tiene más de un
proveedor cargado.

### Química GyJ

**Limpikorn** — proveedor único, cubre los 10 insumos. Lista de precios en
Google Drive más cotizaciones adicionales pasadas directamente para los
productos sin venta directa. Sin `supplierCode` publicado; todas las
presentaciones son el proveedor predeterminado de su insumo.

| Insumo | Cotización original | Presentación | Costo/kg o /l |
|---|---|---:|---:|
| Pasta suavi | USD 10/kg | 1 kg / $15.400,00 | 15400.00 |
| Soda | — | 1 l / $2.300,00 | 2300.00 |
| Etoxilado | USD 3,20/kg | 1 kg / $4.928,00 | 4928.00 |
| Sulfonico | USD 4,50/l | 1 l / $6.930,00 | 6930.00 |
| Aceite | USD 24/l | 1 l / $36.960,00 | 36960.00 |
| Alcohol | — | 5 l / $12.000,00 | 2400.00 |
| Nonil | USD 6,50/l | 1 l / $10.010,00 | 10010.00 |
| Sal | — | 50 kg / $11.500,00 | 230.00 |
| Opacante | — | 1 l / $10.166,00 | 10166.00 |
| Color | — | 1 l / $2.000,00 | 2000.00 |

### Sincronización de `currentCost` con el proveedor predeterminado

Antes de cargar los insumos, el seed recorre los proveedores de la cuenta y
calcula, para cada insumo con una presentación `isDefault: true`,
`packagePrice / packageSize` (la misma fórmula que `calculateUnitCost` en
`POST /api/suppliers/:id/ingredients`). Ese valor reemplaza al declarado en
`account.ingredients` al upsertear el insumo, y si cambia respecto del valor
ya persistido se registra en `PriceHistory` (igual que en producción). Un
insumo sin proveedor predeterminado conserva el valor declarado.

Esto es lo que permite que, tras ejecutar el seed, "Harina de trigo 000"
quede con el costo de MarJuanC ($736,25/kg) y no con el de Molinera
($720,00/kg) ni con el valor histórico declarado ($742,98/kg), al ser
MarJuanC su proveedor predeterminado.

### Pendientes

- Don Roque: conseguir una lista de precios exportable (Excel/PDF) para
  automatizar su carga, igual que MarJuanC y Limpikorn. Hasta entonces,
  `DR-LECHE01`/`DR-HUEVO01`/`DR-RICOTA01` son códigos internos de QA
  (issue #176), no su SKU real — reemplazarlos cuando llegue esa lista.
- No hay todavía un segundo proveedor **real** compartiendo el mismo insumo;
  Molinera se mantiene como proveedor ficticio solo para probar la lógica de
  `isDefault`.

## Productos de Panadería Central

| name | salePrice — ARS | minMarginPercent |
|---|---:|---:|
| Medialunas de manteca — docena (12 unidades) | 13500.00 | 65.00 |
| Medialunas de grasa — docena (12 unidades) | 13500.00 | 70.00 |
| Pan flauta — 1 kg | 4332.14 | 55.00 |
| Tarta de ricota — 24 cm | 28000.00 | 60.00 |

## Productos de Química GyJ

| name | salePrice — ARS | minMarginPercent |
|---|---:|---:|
| Jabón líquido (Ariel/Skip/Ace) — 1 L | 750.00 | 40.00 |
| Suavizante (Vivere/Johnson Bebé/Lavadero/Confort Lila) — 1 L | 750.00 | 40.00 |
| Detergente (Magistral) — 1 L | 650.00 | 35.00 |
| Perfumina (Vivere/Confort) — 250 ml | 2000.00 | 35.00 |

Los márgenes mínimos conservan la configuración de la planilla de referencia.
No se recalculan automáticamente a partir de los precios nuevos.

## Usuarios de prueba

| Comercio | email | role |
|---|---|---|
| Panadería Central | admin.panaderia@seed.example.test | ADMIN |
| Panadería Central | colab.panaderia@seed.example.test | COLLABORATOR |
| Química GyJ | admin.quimica@seed.example.test | ADMIN |
| Química GyJ | colab.quimica@seed.example.test | COLLABORATOR |

Los emails son ficticios (dominio `seed.example.test`, reservado para pruebas
por la RFC 2606 — issue #268). Sus `authProviderId` son los de las cuentas
reales de Clerk del equipo (ver `backend/prisma/seed.ts`), no identificadores
locales: el login E2E/manual contra estas cuentas funciona de verdad.

El script no crea usuarios en Clerk ni habilita el inicio de sesión
con estas identidades.

## Funcionamiento e idempotencia

- Se utilizan IDs fijos y operaciones `upsert` por ID.
- Los IDs no deben regenerarse ni modificarse entre ejecuciones.
- Las escrituras se realizan dentro de una transacción.
- Antes de cada upsert se comprueba que no existan conflictos de identidad.
- Ante una colisión, el script se detiene y revierte la transacción.
- No se adoptan ni eliminan automáticamente registros de otras pruebas.
- Los costos, unidades, precios, márgenes mínimos y roles del fixture
  se restauran a los valores definidos en el script.
- Los campos calculados de Product y las recetas existentes no se sobrescriben.
- `updatedAt` puede cambiar al actualizar registros; no se utiliza para
  determinar si existen duplicados.

Si una cuenta, usuario, insumo o producto del fixture fue renombrado o
reasignado manualmente, el control de identidad puede detener el seed.
En ese caso se debe revisar el conflicto, no borrar ni resetear la base
como solución automática.

## Preparación y ejecución

Ejecutar los comandos desde `backend`, con las dependencias instaladas.

Antes de cualquier escritura, comprobar que `DATABASE_URL` corresponde
a la base local o de pruebas autorizada. No utilizar producción.

Validar el esquema y generar el cliente:

```bash
npx prisma validate
npx prisma generate
npx prisma migrate status
```

Si hay migraciones pendientes, revisar su SQL y aplicar las migraciones
versionadas aprobadas sobre la base de pruebas:

```bash
npx prisma migrate deploy
```

El script requiere que `SEED_CONFIRM_TARGET` coincida exactamente con
el host, puerto y nombre de base obtenidos de `DATABASE_URL`.

Ejemplo de formato para el archivo local `.env`:

```dotenv
SEED_CONFIRM_TARGET=localhost:5432/NOMBRE_DE_TU_BASE_QA
```

Reemplazar el ejemplo por el destino verificado. No incluir usuario,
contraseña ni la URL completa en esta variable.

El script también bloquea la ejecución si `NODE_ENV=production`.
La confirmación del destino no reemplaza la revisión del ambiente.

No compartir ni versionar `.env`.

Ejecutar el seed:

```bash
npx prisma db seed
```

Para la prueba de idempotencia, repetir el mismo comando dos veces más,
sin limpiar la base ni modificar datos entre ejecuciones. Detenerse
ante cualquier error y conservar las salidas.

Abrir Prisma Studio para inspeccionar los registros:

```bash
npx prisma studio
```

Filtrar por los IDs de las cuentas piloto para distinguir el dataset
del seed de otros registros existentes.

## Verificación de TypeScript

El build principal incluye `src/**/*`, pero no `prisma/seed.ts`.

El seed dispone de una configuración independiente, sin emisión de archivos:

```bash
npx tsc --project tsconfig.seed.json
```

La compilación general del backend se ejecuta con:

```bash
npm run build
```

## Resultados de la sesión QA local

Base utilizada: `margenx_issue3_qa_20260831`, en `localhost:5432`.

La base ya contenía datos de otras pruebas, incluidas las cuentas
“Panadería Central QA” y “Química GyJ QA”, distintas de las cuentas piloto.

Se registraron tres ejecuciones exitosas consecutivas del seed,
sin errores P2002 y con los siguientes totales globales:

| Ejecución | Account | User | Ingredient | Product | ProductIngredient |
|---|---:|---:|---:|---:|---:|
| 1 | 4 | 6 | 25 | 9 | 0 |
| 2 | 4 | 6 | 25 | 9 | 0 |
| 3 | 4 | 6 | 25 | 9 | 0 |

Estos totales incluyen registros anteriores; no son exclusivamente
los registros del seed.

Comprobaciones realizadas mediante las salidas de terminal y capturas
de Prisma Studio:

- Nombres e IDs de las dos cuentas piloto.
- Diez insumos por comercio, con costos y unidades coincidentes
  con la referencia documentada.
- Cuatro productos por comercio, con nombres, presentaciones,
  precios y márgenes mínimos correctos.
- Dos usuarios por comercio, con emails, roles y cuenta asociada correctos.
- Ausencia de crecimiento en los conteos durante las tres ejecuciones.
- `ProductIngredient` permaneció en cero.
- Validación del esquema y generación del cliente exitosas.
- Migraciones existentes aplicadas y estado actualizado.
- Compilación general del backend finalizada sin errores.

El primer intento bloqueado por falta de confirmación del destino
no se cuenta entre las tres ejecuciones exitosas.

La advertencia sobre `package.json#prisma` corresponde a su deprecación
en versiones posteriores. Las pruebas se realizaron con Prisma 6.19.3;
no se actualizaron las dependencias para esta issue.

## Relación con el dataset original de la issue #5

El dataset original documentó recetas, costos calculados, márgenes
y casos de margen bajo para pruebas de alertas.

Esos antecedentes se conservan como referencia para el trabajo posterior.
No deben interpretarse como recetas cargadas ni como pruebas de alertas
realizadas por el seed del Sprint 1.

## Pendientes para cerrar la issue #30

- [ ] Verificar el escenario inicial en una base local vacía o recién migrada.
      La sesión documentada utilizó una base con datos anteriores.
- [x] Confirmar la actualización de Google Sheets con los valores nuevos
      de Química antes de declarar coincidencia del 100% con la planilla.
      Confirmado: los 10 valores de Química GyJ coinciden con la lista de
      precios real del proveedor Limpikorn (ver "Fuentes y convenciones").
- [ ] Adjuntar las evidencias de terminal y Prisma Studio al PR.
- [ ] Abrir un PR hacia `develop` que referencie la issue #30.
- [ ] Verificar el pipeline de CI en verde.

---

> **Nota de vigencia (28/10/2026).** La fuente de verdad de los datos sembrados es `backend/prisma/seed.ts`. Los correos de la tabla "Usuarios de prueba" no coinciden con los que usa hoy el seed, y el documento mezcla el alcance del Sprint 1 con datos agregados después. La cuenta para demostraciones es Demo MargenX (`backend/prisma/seed-demo.ts`). No uses estos datos sobre la cuenta real de un comercio (`docs/definition-of-done.md` §4).
