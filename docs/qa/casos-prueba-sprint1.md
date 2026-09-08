# Matriz y Casos de Prueba — Sprint 1

**Proyecto:** MargenX

**Issue:** #6 — Matriz y casos de prueba del Sprint 1 · #39 — Vinculación de criterios HTTP para Insumos, Productos y Seguridad

**Responsable de QA:** Leandro Herrera

**Estado del documento:** En revisión

**Última actualización:** 2026-09-08

---

## 1. Objetivo

Definir una guía estandarizada para las pruebas manuales de los módulos de
Insumos, Productos y Recetas de MargenX. Estos casos también constituyen la
base funcional para la futura automatización end-to-end con Playwright.

## 2. Alcance

La ejecución contempla:

- altas y validaciones de Insumos;
- altas y validaciones de Productos y Recetas;
- cálculo y alerta de margen mínimo;
- aislamiento de datos entre empresas o cuentas.

No se incluyen en este documento los flujos de autenticación, recuperación de
contraseña ni administración de usuarios.

## 3. Datos y precondiciones generales

- Ambiente de QA disponible con frontend, backend y base de datos operativos.
- Usuario administrador autenticado en la cuenta **Panadería Central**.
- Usuario administrador autenticado en la cuenta **Química GyJ**.
- Cada cuenta debe disponer de una sesión independiente.
- El navegador debe tener habilitadas las herramientas de desarrollo para
  revisar consola y solicitudes de red.
- Cuando se compruebe el margen, se aplicará la fórmula:
  `((precio de venta - costo de receta) / precio de venta) * 100`.

### 3.1 Convenciones de verificación HTTP (issue #39)

A partir de esta actualización, cada escenario de Insumos, Productos y
Seguridad incluye un bloque **"Verificación HTTP esperada"** con el
endpoint, el código de estado y el cuerpo de respuesta esperado, para
servir de base a la automatización E2E.

- **Base URL local:** `http://localhost:3000/api`.
- **Autenticación:** header `Authorization: Bearer <token>` con un JWT
  de Clerk válido del usuario administrador de la cuenta correspondiente.
  Sin este header, cualquier endpoint de Insumos o Productos responde
  `401 Unauthorized` con `{"error": "No autorizado"}`.
- **IDs de referencia:** se usan los IDs fijos del seed documentado en
  `docs/qa/seed-data-comercios.md` (cuentas piloto Panadería Central
  `30a00000-0000-4000-8000-000000000001` y Química GyJ
  `30a00000-0000-4000-8000-000000000002`).
- **Formato de error de validación (400) vigente en `develop`:**
  `{"errors": ["mensaje 1", "mensaje 2", ...]}` (arreglo de strings),
  tal como responde hoy `backend/src/routes/ingredients.ts`. La issue
  #35 (middleware global de manejo de errores) unifica este formato a
  `{"error": "mensaje único"}` para 400/404/409/500; una vez que esa
  PR se mergee a `develop`, este documento debe actualizarse para
  reflejar el formato unificado.
- ⚠️ **Módulo Productos sin API implementada:** al momento de escribir
  este documento, `backend/src/index.ts` solo registra `/api/auth` y
  `/api/ingredients`. No existe todavía un endpoint `/api/products`.
  Los criterios HTTP de TC-PRD-01 y TC-PRD-02 documentan el **contrato
  esperado**, siguiendo la misma convención que Insumos, para que
  Backend lo implemente y QA lo valide contra este documento — no son
  respuestas verificadas contra un endpoint real todavía.

## 4. Matriz resumen de casos de prueba

| ID | Módulo | Tipo | Descripción breve | Precondición | Estado |
| --- | --- | --- | --- | --- | --- |
| TC-INS-01 | Insumos | Positivo — Happy path | Alta exitosa de un insumo con datos válidos | Usuario autenticado | Pendiente |
| TC-INS-02 | Insumos | Negativo — Validación | Bloqueo de un costo negativo | Formulario de alta abierto | Pendiente |
| TC-INS-03 | Insumos | Negativo — Validación | Bloqueo de un nombre obligatorio vacío | Formulario de alta abierto | Pendiente |
| TC-INS-04 | Insumos | Negativo — Validación | Bloqueo de un costo vacío o no numérico | Formulario de alta abierto | Pendiente |
| TC-PRD-01 | Productos y Recetas | Positivo — Happy path | Creación de producto con receta válida | Insumos previamente creados | Pendiente |
| TC-PRD-02 | Productos | Negativo — Validación | Bloqueo de precio de venta igual a cero | Formulario de producto abierto | Pendiente |
| TC-REC-01 | Recetas | Negativo — Validación | Bloqueo de cantidad usada igual o menor a cero | Producto e insumo existentes | Pendiente |
| TC-REC-02 | Recetas | Negativo — Integridad | Bloqueo de producto terminado sin componentes | Formulario de producto abierto | Pendiente |
| TC-MRG-01 | Productos y Recetas | Positivo — Regla de negocio | Recálculo de costo y alerta por margen bajo | Producto con receta existente | Pendiente |
| TC-SEC-01 | Multiempresa | Seguridad | Aislamiento de datos entre dos cuentas | Dos cuentas y sesiones creadas | Pendiente |

## 5. Detalle de escenarios en formato Gherkin

### Módulo: Insumos

#### TC-INS-01: Alta exitosa de un insumo con datos válidos

```gherkin
Escenario: Registrar un insumo con datos válidos
  Dado que el administrador de "Panadería Central" está autenticado
  Y se encuentra en la pantalla de alta de Insumos
  Cuando ingresa el nombre "Harina de trigo 000"
  Y selecciona la unidad "kg"
  Y establece un costo unitario de "742.98"
  Y presiona el botón "Guardar"
  Entonces el sistema debe registrar el insumo correctamente
  Y debe mostrar "Harina de trigo 000" en el listado de Insumos
  Y debe mostrar su costo con formato monetario
```

**Verificación HTTP esperada**

| | |
| --- | --- |
| Endpoint | `POST /api/ingredients` |
| Request body | `{"name": "Harina de trigo 000", "unit": "kg", "currentCost": "742.98"}` |
| Status esperado | `201 Created` |
| Body esperado | `{"ingredient": {"id": "<uuid>", "accountId": "30a00000-0000-4000-8000-000000000001", "name": "Harina de trigo 000", "unit": "kg", "currentCost": "742.98", "updatedAt": "<iso-datetime>"}}` |

#### TC-INS-02: Bloqueo de un costo negativo

```gherkin
Escenario: Rechazar un insumo con costo negativo
  Dado que el administrador se encuentra en el formulario de alta de Insumos
  Cuando ingresa el nombre "Levadura fresca"
  Y selecciona la unidad "kg"
  Y establece un costo unitario de "-500"
  Y presiona el botón "Guardar"
  Entonces el sistema no debe persistir el insumo
  Y debe señalar el campo costo como inválido
  Y debe informar que el costo debe ser mayor a cero
```

**Verificación HTTP esperada**

| | |
| --- | --- |
| Endpoint | `POST /api/ingredients` |
| Request body | `{"name": "Levadura fresca", "unit": "kg", "currentCost": "-500"}` |
| Status esperado | `400 Bad Request` |
| Body esperado | `{"errors": ["El campo \"currentCost\" debe ser mayor a cero."]}` |

#### TC-INS-03: Bloqueo de un nombre vacío

```gherkin
Escenario: Rechazar un insumo sin nombre
  Dado que el administrador se encuentra en el formulario de alta de Insumos
  Cuando deja vacío el campo nombre
  Y selecciona la unidad "L"
  Y establece un costo unitario de "2000"
  Y presiona el botón "Guardar"
  Entonces el sistema no debe persistir el insumo
  Y debe señalar el campo nombre como obligatorio
  Y debe conservar los demás datos ingresados para su corrección
```

**Verificación HTTP esperada**

| | |
| --- | --- |
| Endpoint | `POST /api/ingredients` |
| Request body | `{"name": "", "unit": "l", "currentCost": "2000"}` |
| Status esperado | `400 Bad Request` |
| Body esperado | `{"errors": ["El campo \"name\" es obligatorio y debe ser un texto no vacío."]}` |

#### TC-INS-04: Bloqueo de un costo vacío o no numérico

```gherkin
Esquema del escenario: Rechazar un costo que no sea numérico y positivo
  Dado que el administrador se encuentra en el formulario de alta de Insumos
  Cuando ingresa el nombre "Azúcar"
  Y selecciona la unidad "kg"
  Y completa el costo con "<costo_invalido>"
  Y presiona el botón "Guardar"
  Entonces el sistema no debe persistir el insumo
  Y debe informar que el costo es obligatorio y debe ser un número mayor a cero

  Ejemplos:
    | costo_invalido |
    |                |
    | texto          |
    | 0              |
```

**Verificación HTTP esperada**

Endpoint: `POST /api/ingredients` con `{"name": "Azúcar", "unit": "kg", "currentCost": "<costo_invalido>"}`. Status esperado en los tres casos: `400 Bad Request`.

| costo_invalido | Body esperado |
| --- | --- |
| *(vacío)* | `{"errors": ["El campo \"currentCost\" es obligatorio."]}` |
| `texto` | `{"errors": ["El campo \"currentCost\" debe ser un valor decimal válido (ej: \"742.98\")."]}` |
| `0` | `{"errors": ["El campo \"currentCost\" debe ser mayor a cero."]}` |

### Módulo: Productos y Recetas

#### TC-PRD-01: Creación de un producto con receta válida

```gherkin
Escenario: Registrar un producto terminado con una receta válida
  Dado que existen los insumos "Harina de trigo 000", "Levadura fresca" y "Sal"
  Y el administrador se encuentra en el formulario de alta de Productos
  Cuando ingresa el producto "Pan común"
  Y establece un precio de venta de "4332.14"
  Y establece un margen mínimo de "55"
  Y agrega "0.65" kg de "Harina de trigo 000" a la receta
  Y agrega "0.015" kg de "Levadura fresca" a la receta
  Y agrega "0.013" kg de "Sal" a la receta
  Y presiona el botón "Guardar"
  Entonces el sistema debe registrar el producto y sus componentes
  Y debe calcular el costo total como la suma de los costos de cada componente
  Y debe mostrar el margen real calculado para "Pan común"
```

**Verificación HTTP esperada** (contrato propuesto — ver nota 3.1: `/api/products` no está implementado aún)

| | |
| --- | --- |
| Endpoint | `POST /api/products` |
| Request body | `{"name": "Pan flauta — 1 kg", "salePrice": "4332.14", "minMarginPercent": "55.00"}` |
| Status esperado | `201 Created` |
| Body esperado | `{"product": {"id": "<uuid>", "accountId": "30a00000-0000-4000-8000-000000000001", "name": "Pan flauta — 1 kg", "salePrice": "4332.14", "minMarginPercent": "55.00", "cost": "0.00", "marginAmount": "0.00", "marginPercent": "0.00", "updatedAt": "<iso-datetime>"}}` |

La carga de componentes de receta (`ProductIngredient`, con el consecuente
recálculo de `cost`/`marginAmount`/`marginPercent`) corresponde a un
endpoint separado, aún no definido ni implementado — queda fuera del
alcance de este contrato y debe documentarse en una issue de Backend
específica antes de automatizarlo.

#### TC-PRD-02: Bloqueo de precio de venta igual a cero

```gherkin
Escenario: Rechazar un producto con precio de venta igual a cero
  Dado que el administrador se encuentra en el formulario de alta de Productos
  Cuando ingresa el nombre "Medialunas de manteca"
  Y establece un precio de venta de "0"
  Y completa una receta válida
  Y presiona el botón "Guardar"
  Entonces el sistema no debe persistir el producto
  Y debe señalar el campo precio de venta como inválido
  Y debe informar que el precio de venta debe ser mayor a cero
```

**Verificación HTTP esperada** (contrato propuesto — ver nota 3.1: `/api/products` no está implementado aún)

| | |
| --- | --- |
| Endpoint | `POST /api/products` |
| Request body | `{"name": "Medialunas de manteca", "salePrice": "0", "minMarginPercent": "65.00"}` |
| Status esperado | `400 Bad Request` |
| Body esperado | `{"errors": ["El campo \"salePrice\" debe ser mayor a cero."]}` (mismo formato y convención de `validateIngredientInput`, a confirmar con Backend Lead al implementar el endpoint) |

#### TC-REC-01: Bloqueo de una cantidad usada igual o menor a cero

```gherkin
Esquema del escenario: Rechazar cantidades inválidas en una receta
  Dado que existe el producto "Tarta de ricota"
  Y existe el insumo "Ricota"
  Cuando el administrador agrega "Ricota" con una cantidad de "<cantidad_invalida>" kg
  Y guarda la receta
  Entonces el sistema no debe persistir ese componente
  Y debe informar que la cantidad usada debe ser mayor a cero

  Ejemplos:
    | cantidad_invalida |
    | 0                 |
    | -0.5              |
```

#### TC-REC-02: Bloqueo de un producto terminado sin componentes

```gherkin
Escenario: Rechazar un producto terminado sin receta
  Dado que el administrador se encuentra en el formulario de alta de Productos
  Cuando ingresa el nombre "Bizcochitos de grasa"
  Y establece un precio de venta válido
  Y establece un margen mínimo válido
  Pero no agrega ningún insumo a la receta
  Y presiona el botón "Guardar"
  Entonces el sistema no debe persistir el producto como terminado
  Y debe informar que la receta debe contener al menos un componente
```

#### TC-MRG-01: Recálculo de costo y alerta por margen bajo

```gherkin
Escenario: Mostrar una alerta cuando el margen real queda por debajo del mínimo
  Dado que existe un producto con precio de venta de "50000"
  Y su margen mínimo configurado es "35"
  Y su receta tiene un costo total inicial inferior al precio de venta
  Cuando aumenta el costo de uno de los insumos de la receta
  Y el costo total del producto se recalcula a "46967.70"
  Entonces el margen real debe calcularse como "6.06"
  Y el sistema debe identificar el producto con el estado "MARGEN BAJO"
  Y debe mostrar la alerta visual definida para márgenes inferiores al mínimo
```

### Módulo: Seguridad multiempresa

#### TC-SEC-01: Aislamiento de datos entre cuentas

```gherkin
Escenario: Impedir que una cuenta consulte los insumos de otra empresa
  Dado que existe el insumo "Etoxilado" en la cuenta "Química GyJ"
  Y el usuario de "Panadería Central" está autenticado en una sesión independiente
  Cuando el usuario lista los insumos disponibles para "Panadería Central"
  Y solicita directamente el identificador del insumo perteneciente a "Química GyJ"
  Entonces la respuesta no debe contener el insumo "Etoxilado"
  Y no debe exponer identificadores ni costos pertenecientes a "Química GyJ"
  Y el sistema debe rechazar la consulta directa sin revelar los datos del insumo
```

**Verificación HTTP esperada** (verificado manualmente contra `backend/src/routes/ingredients.ts`)

Paso 1 — listado propio:

| | |
| --- | --- |
| Endpoint | `GET /api/ingredients` |
| Auth | Bearer token del admin de **Panadería Central** |
| Status esperado | `200 OK` |
| Body esperado | `{"ingredients": [...]}` — únicamente insumos con `accountId = "30a00000-0000-4000-8000-000000000001"`; no debe incluir "Etoxilado" ni ningún insumo de Química GyJ. |

Paso 2 — acceso directo al insumo ajeno:

| | |
| --- | --- |
| Endpoint | `GET /api/ingredients/30b00002-0000-4000-8000-000000000003` (id de "Etoxilado", perteneciente a Química GyJ) |
| Auth | Bearer token del admin de **Panadería Central** |
| Status esperado | `404 Not Found` — **no** `403 Forbidden` (decisión de diseño intencional: no debe revelarse si el recurso existe en otra cuenta) |
| Body esperado | `{"error": "Insumo no encontrado."}` |

El mismo criterio aplica a `PUT` y `DELETE /api/ingredients/:id` sobre un id
ajeno: ambos deben responder `404` con el mismo body, nunca `200` ni `403`.

## 6. Checklist de ejecución manual de QA

- [ ] Ejecutar los casos con una base de datos controlada y registrar la evidencia.
- [ ] Verificar que no existan errores ni *warnings* inesperados en la consola del navegador.
- [ ] Revisar en la pestaña Network que las respuestas HTTP coincidan con el resultado esperado.
- [ ] Confirmar que los casos negativos no generen registros parciales en la base de datos.
- [ ] Verificar que los mensajes de validación sean visibles, específicos y comprensibles.
- [ ] Comprobar que costos, precios y márgenes utilicen el formato numérico esperado.
- [ ] Repetir el caso multiempresa con ambas cuentas intercambiando los roles.
- [ ] Validar el flujo principal en resolución móvil de 360 px.
- [ ] Adjuntar capturas o videos y registrar el resultado como Pass o Fail.

## 7. Criterios de aprobación

- La matriz contiene todos los casos detallados en este documento.
- Los bloques Gherkin están correctamente indentados y renderizan como código Markdown.
- Se cubren caminos felices, validaciones de campos obligatorios y valores numéricos.
- Se verifica el aislamiento de datos entre empresas.
- Todo resultado Fail queda asociado a un defecto reproducible antes del merge a
  `develop`.
- Los casos de Insumos, Productos y Seguridad (TC-INS-01 a 04, TC-PRD-01,
  TC-PRD-02 y TC-SEC-01) especifican su endpoint, código de estado HTTP y
  cuerpo de respuesta esperado (issue #39).
- Los criterios HTTP de Insumos y Seguridad están verificados contra el
  comportamiento real de `backend/src/routes/ingredients.ts` en `develop`;
  los de Productos documentan el contrato esperado, pendiente de
  implementación del endpoint `/api/products`.
