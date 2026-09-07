# QA - Seed Data de comercios

Issues relacionadas:

- #5: preparación del dataset de referencia.
- #30: implementación y validación del seed idempotente.

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
- Los precios nuevos de Química reemplazan los anteriores para este seed.
  Queda pendiente confirmar su actualización en Google Sheets.
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

| name | unit | currentCost — ARS |
|---|---|---:|
| Harina de trigo 000 Olavarriense | kg | 742.98 |
| Harina de trigo 0000 Olavarriense | kg | 868.77 |
| Azúcar común tipo A | kg | 1150.00 |
| Manteca en bloque mayorista | kg | 12090.00 |
| Grasa bovina refinada La Cordobesa | kg | 5990.00 |
| Levadura fresca La Cordobesa | kg | 6000.00 |
| Sal fina Aurora | kg | 484.24 |
| Leche entera larga vida Silvia | l | 1715.00 |
| Huevo grande | u | 176.17 |
| Ricota Castelmar | kg | 4294.14 |

Notas de la referencia:

- Huevo: `5285 / 30`, redondeado a dos decimales.
- Ricota: precio mayorista estimado para una pieza aproximada de 3 kg.
- Azúcar y huevo figuraban con precio publicado y sin stock.
- Estos valores son referencias del dataset, no precios actuales verificados
  directamente con una panadería.

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

Conversiones utilizadas:

- Pasta suavi: USD 10/kg × 1540 = ARS 15400/kg.
- Etoxilado: USD 3.20/kg × 1540 = ARS 4928/kg.
- Sulfonico: USD 4.50/l × 1540 = ARS 6930/l.
- Aceite: USD 24/l × 1540 = ARS 36960/l.
- Nonil: USD 6.50/l × 1540 = ARS 10010/l.
- Alcohol: ARS 12000 por 5 l = ARS 2400/l.
- Sal: ARS 11500 por 50 kg = ARS 230/kg.
- Color: ARS 10000 por 5 l = ARS 2000/l.

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
| Panadería Central | colaborador.panaderia@seed.example.test | COLLABORATOR |
| Química GyJ | admin.quimica@seed.example.test | ADMIN |
| Química GyJ | colaborador.quimica@seed.example.test | COLLABORATOR |

Son usuarios ficticios de base de datos. Sus `authProviderId` utilizan
identificadores locales con prefijo `seed_local_`.

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
- [ ] Confirmar la actualización de Google Sheets con los valores nuevos
      de Química antes de declarar coincidencia del 100% con la planilla.
- [ ] Adjuntar las evidencias de terminal y Prisma Studio al PR.
- [ ] Abrir un PR hacia `develop` que referencie la issue #30.
- [ ] Verificar el pipeline de CI en verde.