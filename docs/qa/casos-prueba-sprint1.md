# Matriz y Casos de Prueba — Sprint 1

**Proyecto:** MargenX

**Issue:** #6 — Matriz y casos de prueba del Sprint 1

**Responsable de QA:** Leandro Herrera

**Estado del documento:** En revisión

**Última actualización:** 2026-08-30

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
