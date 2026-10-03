
### 1. Backlog Completo de Sprints 2 y 3 (En una sola celda Markdown)

A continuación tienes **todas las issues de ambos sprints**, con las dependencias técnicas resueltas (migración de proveedores, eliminación de rutas mockeadas, conexión real de dashboard), formateadas en un único bloque de código listo para copiar y pegar:


# BACKLOG DETALLADO: SPRINT 2 Y SPRINT 3 — MARGENX

---
# ==============================================================================
# SPRINT 2: MVP Core — Recetas Compuestas y Cálculo en Vivo
# Período: 19/09/2026 al 02/10/2026 (14 días corridos)
# Hito Cátedra: Demo del MVP Core desplegado en Producción (https://margenx.tech)
# ==============================================================================

### [SPRINT2-BE-01] Endpoints CRUD de Productos y Recetas con soporte "Sin Costear" (#27)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** Backend (Mauricio Barreras)
* **Start Date:** 19/09/2026
* **Target Date:** 23/09/2026
* **Priority:** P1
* **Estimate:** 5
* **Size:** M

### Historia de Usuario
Como dueño de un comercio gastronómico, quiero crear, consultar, actualizar y eliminar productos con sus listas de ingredientes (recetas) o en estado borrador ("Sin Costear"), para reflejar el catálogo real de mi negocio y calcular automáticamente su costo de elaboración.

---
### Alcance Técnico
- Completar y fusionar el PR #65 sobre `backend/src/routes/products.ts`.
- Implementar `GET /api/products/:id`: devuelve el producto con sus ingredientes asociados (nombre, unidad y costo unitario de cada insumo).
- Implementar `PUT /api/products/:id`: actualiza nombre, precio de venta, margen mínimo y reemplaza atómicamente la lista de ingredientes usando `prisma.$transaction` (eliminación de vínculos viejos e inserción de nuevos).
- Implementar `DELETE /api/products/:id`: elimina el producto y sus relaciones en `ProductIngredient` (cascada relacional).
- Aislamiento estricto: toda operación debe validar `where: { id, accountId: req.user.accountId }`. Responder `404 Not Found` ante accesos a IDs ajenos.

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Creación atómica de producto con receta válida
  Dado que el usuario autenticado envía un POST a "/api/products" con 3 ingredientes válidos
  Cuando la base de datos procesa la transacción
  Entonces se debe crear el registro en la tabla "Product"
  Y se deben crear exactamente 3 registros vinculados en "ProductIngredient"
  Y el costo total debe ser la sumatoria exacta del costo proporcional de los insumos

Escenario: Actualización con reemplazo de receta
  Dado un producto existente con 2 ingredientes
  Cuando se envía un PUT a "/api/products/:id" con una lista nueva de 4 ingredientes
  Entonces la transacción debe eliminar los 2 vínculos anteriores y persistir los 4 nuevos
  Y debe recomputar el costo total y el porcentaje de margen en la misma operación

Escenario: Aislamiento multi-tenant al consultar producto ajeno
  Dado un producto perteneciente a la Cuenta A
  Cuando un usuario de la Cuenta B envía un GET a "/api/products/:id" con ese ID
  Entonces el backend debe responder HTTP 404 Not Found
  Y no debe revelar información sobre la existencia del recurso
```

### Estrategia de Pruebas (QA)
- [ ] Ejecutar colección Postman automatizada validando altas, consultas, modificaciones y bajas.
- [ ] Validar que el payload de `PUT` rechace cantidades menores o iguales a cero sin romper la consistencia de la base de datos.

### Definition of Done (DoD)
- [ ] Operaciones de mutación encapsuladas en `prisma.$transaction`.
- [ ] 0 errores de tipado TypeScript y linter superado.
- [ ] PR abierto hacia develop con CI en verde.

---

### [SPRINT2-BE-02] Motor de cálculo financiero con Prisma.Decimal y tests unitarios (#66)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** Backend (Mauricio Barreras)
* **Start Date:** 21/09/2026
* **Target Date:** 25/09/2026
* **Priority:** P1
* **Estimate:** 3
* **Size:** S

### Historia de Usuario
Como desarrollador y auditor financiero, quiero desacoplar las operaciones matemáticas de margen y costo en un servicio puro basado en `Prisma.Decimal`, para garantizar precisión aritmética absoluta, eliminar errores de punto flotante de JavaScript y prevenir divisiones por cero.

---
### Alcance Técnico
- Crear el servicio de dominio `backend/src/services/marginCalculator.ts`.
- Implementar funciones puras:
  - `calculateItemCost(quantity: Decimal, unitCost: Decimal): Decimal`
  - `calculateRecipeTotal(items: Array<{ quantity: Decimal, unitCost: Decimal }>): Decimal`
  - `calculateMarginAmount(salePrice: Decimal, totalCost: Decimal): Decimal`
  - `calculateMarginPercent(salePrice: Decimal, totalCost: Decimal): Decimal`
- Controlar casos límite: si `salePrice <= 0` o el producto no tiene ingredientes, retornar `0.00` sin arrojar excepción.
- Redondear a 2 decimales bancarios (`Decimal.ROUND_HALF_UP`).
- Crear suite de tests unitarios exhaustivos con Vitest en `backend/src/services/marginCalculator.test.ts`.

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Precisión sin pérdida de decimales en punto flotante
  Dado un insumo con costo unitario de $742.98 y una cantidad usada de 0.125 kg
  Cuando el motor calcula el costo del ítem
  Entonces el resultado debe ser exactamente $92.87 (redondeo estándar)
  Y no debe presentar artefactos de coma flotante como 92.87250000000001

Escenario: Manejo seguro de precio de venta en cero
  Dado un producto borrador con costo de $1,500.00 y precio de venta configurado en $0.00
  Cuando se calcula el porcentaje de margen
  Entonces la función debe devolver 0.00% y un margen nominal de -$1,500.00
  Y no debe disparar un error de división por cero (Infinity o NaN)
```

### Estrategia de Pruebas (QA)
- [ ] Ejecutar `npm test` en backend y verificar cobertura de ramas del 100% sobre `marginCalculator.ts`.
- [ ] Validar casos extremos: números periódicos (1/3), cantidades mínimas (0.001) y valores monetarios altos.

### Definition of Done (DoD)
- [ ] Lógica matemática desacoplada de los controladores Express.
- [ ] Tests unitarios en Vitest pasando en verde.
- [ ] PR abierto hacia develop con CI en verde.

---

### [SPRINT2-FE-01] Editor interactivo de recetas con selector dinámico y Zustand (#67)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** Frontend (Federico Paal)
* **Start Date:** 19/09/2026
* **Target Date:** 24/09/2026
* **Priority:** P1
* **Estimate:** 5
* **Size:** M

### Historia de Usuario
Como chef o encargado de producción, quiero disponer de un constructor visual e interactivo de recetas en `/productos/nuevo`, donde pueda añadir, remover o ajustar cantidades de insumos y ver cómo el costo total y el margen proyectado se recalculan al instante mientras escribo.

---
### Alcance Técnico
- Instalar y configurar `zustand` en `frontend/package.json`.
- Crear el store `frontend/src/stores/useRecipeStore.ts`:
  - Estado: `items: Array<{ ingredientId: string, name: string, unit: string, unitCost: number, quantity: number }>`, `salePrice: number`, `minMarginPercent: number`.
  - Acciones: `addIngredient`, `removeIngredient`, `updateQuantity`, `setSalePrice`, `setMinMarginPercent`, `reset`.
  - Selectores calculados: `totalCost`, `marginAmount`, `marginPercent`, `isUnderMargin`.
- Conectar el store al componente de simulación en `/productos/nuevo`: actualización de métricas en $<50\text{ ms}$ sin peticiones de red intermedias.
- Integrar selector modal / dropdown con búsqueda reactiva de insumos disponibles (consumidos desde `ingredientService.getAll()`).

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Recálculo reactivo en vivo al variar la cantidad de un insumo
  Dado que el usuario está armando una receta con 100 gramos de carne a $4,200/kg (subtotal $420)
  Cuando cambia la cantidad a 200 gramos
  Entonces el subtotal del ítem debe actualizarse a $840 inmediatamente
  Y el costo total de la receta debe reflejar el incremento de $420 en pantalla sin recargar la página

Escenario: Activación visual del semáforo de margen crítico
  Dado un producto con costo total de $1,000 y un precio de venta de $1,200 (margen 16.6%)
  Y un umbral de margen mínimo configurado en 30%
  Cuando el usuario visualiza el simulador
  Entonces el indicador de margen debe mostrarse con badge rojo de alerta ("Margen Bajo")
```

### Estrategia de Pruebas (QA)
- [ ] Verificar fluidez en viewport móvil de 360px: adición y remoción de filas sin saltos de scroll.
- [ ] Validar coherencia numérica frente a los cálculos manuales de la planilla de seed gastronómico.

### Definition of Done (DoD)
- [ ] Store de Zustand tipado estrictamente con interfaces de TypeScript.
- [ ] Diseño 100% responsivo Mobile-First con Tailwind CSS.
- [ ] PR abierto hacia develop con CI en verde.

---

### [SPRINT2-FE-02] Vista dinámica de Detalle, Edición y Eliminación de Producto (/productos/:id) (#68)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** Frontend (Federico Paal)
* **Start Date:** 23/09/2026
* **Target Date:** 27/09/2026
* **Priority:** P1
* **Estimate:** 3
* **Size:** S

### Historia de Usuario
Como administrador del comercio, quiero hacer clic en cualquier producto de mi catálogo y acceder a su ficha técnica individual dinámica para consultar el desglose de su receta, modificar sus valores o darlo de baja del sistema, eliminando las rutas hardcodeadas de prototipo.

---
### Alcance Técnico
- Reemplazar la ruta fija `/productos/hamburguesa-doble` por la ruta dinámica `/productos/:id` en `frontend/src/routes.tsx`.
- En `frontend/src/app/productos/page.tsx`, actualizar la navegación para que viaje a `/productos/${product.id}`.
- Crear la pantalla `frontend/src/app/productos/[id]/page.tsx`:
  - Hook de carga inicial invocando `productService.getById(id)`.
  - Estados visuales: Skeleton durante la carga, Toast/Alerta roja ante 404/error de red.
  - Formulario de edición con React Hook Form + Zod pre-poblado con los valores del backend.
  - Botón "Eliminar Producto" con modal de confirmación (*Dialog*) que invoque `productService.delete(id)`.
- Sincronizar el nombre del comercio en el Navbar mediante el usuario autenticado (remover el texto fijo `"Hamburguesería"`).

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Carga exitosa de ficha técnica dinámica
  Dado que el usuario hace clic en el producto "Tarta de ricota" (ID: 30c00001...) desde el catálogo
  Cuando la aplicación navega a "/productos/30c00001..."
  Entonces la pantalla debe solicitar los datos a "/api/products/30c00001..."
  Y debe mostrar el nombre real, el desglose de sus insumos y el cálculo de rentabilidad del backend

Escenario: Eliminación de producto desde la ficha de detalle
  Dado un producto abierto en su vista de detalle
  Cuando el usuario presiona "Eliminar", confirma el diálogo de seguridad y el backend responde 200
  Entonces la aplicación debe mostrar una notificación toast de éxito
  Y debe redirigir al catálogo "/productos" donde el ítem ya no debe figurar
```

### Estrategia de Pruebas (QA)
- [ ] Probar navegación cruzada entre productos con receta y productos en estado "Sin Receta".
- [ ] Validar que un ID inexistente en la URL muestre un EmptyState informativo con botón para regresar al catálogo.

### Definition of Done (DoD)
- [ ] Eliminación total de rutas y textos hardcodeados a "Hamburguesa Doble" en el flujo de productos.
- [ ] Integración completa con `productService.getById` y `productService.delete`.
- [ ] PR abierto hacia develop con CI en verde.

---

### [SPRINT2-FE-03] Conexión de API para persistencia de productos y recetas compuestas (#69)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** Frontend (Federico Paal)
* **Start Date:** 25/09/2026
* **Target Date:** 28/09/2026
* **Priority:** P1
* **Estimate:** 3
* **Size:** S

### Historia de Usuario
Como usuario de la aplicación, quiero que al presionar "Guardar Producto" en el formulario de alta o edición, los datos se sincronicen de manera confiable con el backend y se manejen correctamente los bloqueos de red o errores de validación.

---
### Alcance Técnico
- Extender `frontend/src/services/productService.ts` implementando:
  - `getById(id: string, getToken: TokenGetter): Promise<Product>`
  - `update(id: string, payload: ProductInput, getToken: TokenGetter): Promise<Product>`
  - `delete(id: string, getToken: TokenGetter): Promise<void>`
- Conectar el botón de submit de `/productos/nuevo` y `/productos/:id`:
  - Deshabilitar el botón y mostrar spinner mientras la petición está en vuelo (prevención de doble submit).
  - Capturar errores de validación del backend (400) y mapearlos a los campos del formulario.
  - Redirigir a `/productos` con invalidación de caché local tras un guardado exitoso.

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Creación exitosa de producto borrador (Sin Receta)
  Dado que el usuario completa nombre "Café Americano" y precio "$2,500" sin agregar insumos
  Cuando presiona "Guardar Producto"
  Entonces el servicio debe enviar un POST con "ingredients: []"
  Y al completarse con éxito debe redirigir al catálogo mostrando el badge "Sin Receta"

Escenario: Manejo de error de validación del servidor
  Dado que la API devuelve un error 400 informando que el precio es obligatorio
  Cuando el servicio captura la excepción ApiError
  Entonces el formulario debe mantenerse en pantalla sin perder los insumos cargados
  Y debe mostrar un toast de alerta con el mensaje devuelto por el backend
```

### Estrategia de Pruebas (QA)
- [ ] Simular latencia de red (modo Slow 3G en DevTools) y constatar que el botón de guardar se bloquea evitando duplicaciones en BD.

### Definition of Done (DoD)
- [ ] Tipado estricto en inputs y outputs de `productService.ts`.
- [ ] Feedback visual de loading y errores en todos los formularios.
- [ ] PR abierto hacia develop con CI en verde.

---

### [SPRINT2-QA-01] Suite E2E de Recálculo de Margen y Aislamiento en Playwright (#47)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** QA (Leandro Herrera)
* **Start Date:** 19/09/2026
* **Target Date:** 26/09/2026
* **Priority:** P1
* **Estimate:** 5
* **Size:** M

### Historia de Usuario
Como QA Lead, quiero disponer de una suite automatizada End-to-End con Playwright que simule la navegación real de un usuario en Staging, para auditar que la modificación del costo de un insumo impacte en el margen visual del producto y que el aislamiento multi-tenant sea inviolable en el navegador.

---
### Alcance Técnico
- Configurar `frontend/playwright.config.ts` para ejecución cross-browser (Chromium y Mobile Chrome 360px).
- Crear `frontend/tests/e2e/auth.setup.ts`: autenticación automática reutilizable guardando sesión en `playwright/.auth/user.json`.
- Implementar caso **TC-MRG-01 (Recálculo E2E):**
  1. Iniciar sesión como Administrador de "Panadería Central".
  2. Ir a `/insumos`, editar "Harina de trigo 000" y elevar su costo a $4,500.00.
  3. Navegar a `/productos`, ingresar a "Pan flauta" y verificar que el costo total de la receta aumentó.
  4. Validar en el DOM la aparición del badge de alerta `"MARGEN BAJO"` / color rojo.
- Implementar caso **TC-SEC-01 (Aislamiento Multiempresa E2E):**
  1. Verificar que la sesión de "Panadería Central" no liste insumos de "Química GyJ" (ej. "Pasta suavi").
  2. Forzar navegación directa a la URL de un producto de Química GyJ y constatar redirección o pantalla 404.

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Verificación E2E de cambio de semáforo por suba de costos
  Dado que el test automatizado modifica el insumo clave de una receta en la UI
  Cuando consulta la ficha del producto vinculado
  Entonces el badge visual debe cambiar de verde ("Saludable") a rojo ("Margen Bajo")
  Y la prueba debe ejecutarse en menos de 10 segundos utilizando selectores de accesibilidad

Escenario: Verificación E2E de contención multi-tenant
  Dado un navegador autenticado en la cuenta de Panadería Central
  Cuando inspecciona la tabla de insumos y el catálogo de productos
  Entonces ningún registro perteneciente a Química GyJ debe estar presente en el árbol DOM
```

### Estrategia de Pruebas (QA)
- [ ] Ejecutar `npx playwright test --ui` en local verificando 0 fallos intermitentes (*flaky tests*).
- [ ] Probar en emulador móvil de 360px para certificar que ningún botón o modal quede fuera de la pantalla táctil.

### Definition of Done (DoD)
- [ ] Selectores basados exclusivamente en accesibilidad (`getByRole`, `getByText`, `getByLabel`).
- [ ] Reporte HTML generado y versionado en la carpeta de artefactos.
- [ ] PR abierto hacia develop con CI en verde.

---

### [SPRINT2-QA-02] Validación de precisión aritmética en fórmulas financieras y edge cases (#70)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** QA (Leandro Herrera)
* **Start Date:** 25/09/2026
* **Target Date:** 28/09/2026
* **Priority:** P2
* **Estimate:** 2
* **Size:** S

### Historia de Usuario
Como auditor de calidad y enlace con el cliente, quiero ejecutar una batería de pruebas de cálculo financiero sobre la API y la UI, para certificar que no existan discrepancias de redondeo entre lo que ve el comerciante y lo que liquida la base de datos.

---
### Alcance Técnico
- Crear la colección Postman / script de testing automatizado `backend/tests/postman/precision-aritmetica.test.ts`.
- Diseñar casos de prueba de frontera:
  - Insumos fraccionarios mínimos (ej. azafrán: 0.005 kg a $85,000/kg).
  - Recetas extensas (más de 15 ingredientes por producto).
  - Precios con decimales no exactos (ej. dividir $10,000 entre 3 unidades).
  - Márgenes negativos: cuando el costo total de la receta supera ampliamente el precio de venta.
- Comparar los resultados del frontend con las respuestas JSON del backend: tolerancia máxima admitida = $\pm \$0.01\text{ ARS}$.

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Tolerancia cero ante redondeos complejos
  Dado un producto con 5 ingredientes cuyas cantidades resultan en fracciones decimales
  Cuando se calcula el costo total en el frontend y en el backend
  Entonces la diferencia entre ambos cálculos debe ser exactamente $0.00
  Y el margen porcentual debe coincidir hasta el segundo decimal
```

### Estrategia de Pruebas (QA)
- [ ] Ejecutar la suite automatizada contra el entorno de Staging (`https://api-dev.margenx.tech`).
- [ ] Documentar la matriz de comparación en `docs/qa/reporte-precision-sprint2.md`.

### Definition of Done (DoD)
- [ ] Reporte de consistencia financiera firmado por QA.
- [ ] 0 discrepancias de redondeo detectadas.
- [ ] PR abierto hacia develop con CI en verde.

---

### [SPRINT2-DEVOPS-01] Integración de Playwright en GitHub Actions con reportes HTML (#71)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** DevOps (Darío Giménez)
* **Start Date:** 22/09/2026
* **Target Date:** 26/09/2026
* **Priority:** P2
* **Estimate:** 3
* **Size:** S

### Historia de Usuario
Como DevOps y Scrum Master, quiero que la suite E2E de Playwright se ejecute automáticamente dentro del pipeline de CI en cada Pull Request, para evitar que cambios de código introduzcan regresiones visuales o funcionales antes de fusionar a `develop`.

---
### Alcance Técnico
- Actualizar `.github/workflows/ci.yml`.
- Crear el job `e2e-tests` con las siguientes etapas:
  1. `actions/checkout` y setup de Node 20 con caché de npm.
  2. Instalación de navegadores de Playwright: `npx playwright install --with-deps chromium`.
  3. Inyección de variables de entorno para tests (`CI=true`, claves de Clerk de pruebas).
  4. Ejecución del test runner: `npx playwright test`.
  5. Publicación de artefactos: usar `actions/upload-artifact@v4` para guardar el reporte `playwright-report/` y los videos/trazas si una prueba falla.
- Configurar regla de status check obligatoria: el PR no se puede mergear si los tests E2E fallan.

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Ejecución exitosa de CI con suite E2E
  Dado que un desarrollador abre un PR hacia "develop"
  Cuando el workflow de GitHub Actions finaliza
  Entonces el job "e2e-tests" debe figurar en verde (Passed)
  Y el tiempo total de ejecución no debe superar los 4 minutos

Escenario: Bloqueo de PR ante regresión visual o funcional
  Dado un cambio de código que rompe el cálculo en la pantalla de productos
  Cuando el job de Playwright detecta la aserción fallida
  Entonces el pipeline debe marcarse en rojo (Failed)
  Y debe adjuntar el reporte HTML y el video del fallo en la pestaña de artefactos
```

### Estrategia de Pruebas (QA)
- [ ] Provocar una falla intencional en una rama de prueba y verificar que GitHub Actions bloquee el botón de Merge.
- [ ] Descargar el artefacto zip desde Actions y comprobar que el reporte interactivo se visualice correctamente.

### Definition of Done (DoD)
- [ ] Workflow integrado y testeado en ramas de feature.
- [ ] Reporte HTML generado como artefacto descargable.
- [ ] PR abierto hacia develop con CI en verde.

---

### [SPRINT2-DEVOPS-02] Puesta a punto y despliegue del entorno de Producción (margenx.tech) para Demo (#72)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** DevOps (Darío Giménez)
* **Start Date:** 28/09/2026
* **Target Date:** 01/10/2026
* **Priority:** P1
* **Estimate:** 3
* **Size:** S

### Historia de Usuario
Como Scrum Master y responsable de Infraestructura, quiero poner a punto el entorno productivo bajo el dominio oficial `margenx.tech`, para que la demo del cierre de Sprint 2 ante los docentes y el cliente se realice sobre infraestructura final, con SSL activo y sin depender de Staging.

---
### Alcance Técnico
- Verificar la configuración del bloque Nginx host en la VPS para `margenx.tech` y `api.margenx.tech`.
- Comprobar la vigencia y renovación de certificados Let's Encrypt para los dominios de producción.
- Validar que el archivo `/opt/margenx-infra/.env` en la VPS contenga las variables productivas:
  `POSTGRES_DB_PROD=margenx_prod`, `CLERK_SECRET_KEY` de producción (provista por Mauri).
- Ejecutar la migración inicial de producción:
  `docker compose run --rm backend-prod npx prisma migrate deploy`.
- Probar el pipeline de release: merge de `develop` a `main` disparando la compilación con tag `:latest` y despliegue a los puertos de producción (3010 y 3011).

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Despliegue inmutable a Producción tras merge en main
  Dado que el Scrum Master aprueba y fusiona el PR de Release a "main"
  Cuando el pipeline "deploy.yml" se ejecuta
  Entonces debe compilar las imágenes con tag ":latest"
  Y debe actualizar los contenedores "margenx_backend_prod" y "margenx_frontend_prod"
  Y "https://margenx.tech" debe cargar la interfaz estable con certificado SSL válido

Escenario: Aislamiento total de base de datos productiva
  Dado el entorno productivo en funcionamiento
  Cuando un usuario opera en "https://margenx.tech"
  Entonces todas las operaciones deben persistir exclusivamente en la base "margenx_prod"
  Y no debe existir cruce de datos con la base de staging "margenx_dev"
```

### Estrategia de Pruebas (QA)
- [ ] Ejecutar smoke test en `https://margenx.tech`: alta de cuenta, login, creación de insumo y producto.
- [ ] Validar respuesta 200 en `https://api.margenx.tech/api/health`.

### Definition of Done (DoD)
- [ ] Entorno productivo 100% operativo bajo HTTPS.
- [ ] Pipeline de CD verificado en la rama `main`.
- [ ] Notificación verde en Discord con tag `@everyone`.

---
# ==============================================================================
# SPRINT 3: Dashboard, RBAC y Dominio Multi-Proveedor
# Período: 03/10/2026 al 16/10/2026 (14 días corridos)
# Hito Cátedra: Pruebas con Usuarios Reales (Comercios Piloto) y Validación de Roles
# ==============================================================================

### [SPRINT3-BE-01] Migración de Prisma: Modelos Supplier, SupplierIngredient y PriceHistory (#73)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** Backend (Mauricio Barreras)
* **Start Date:** 03/10/2026
* **Target Date:** 06/10/2026
* **Priority:** P1
* **Estimate:** 3
* **Size:** S

### Historia de Usuario
Como desarrollador de base de datos, quiero extender el esquema de Prisma con los modelos de Proveedores, Presentaciones de Empaque e Historial de Precios, para soportar la compra mayorista y la trazabilidad de costos inflacionarios.

---
### Alcance Técnico
- Editar `backend/prisma/schema.prisma` incorporando los modelos según el SAD:
  - `model Supplier`: id, accountId, name, contactPhone, email, address, isActive.
  - `model SupplierIngredient`: id, supplierId, ingredientId, packageSize (Decimal), packageUnit (String), packagePrice (Decimal), isDefault (Boolean).
  - `model PriceHistory`: id, ingredientId, oldCost (Decimal), newCost (Decimal), changedAt (DateTime).
- Configurar relaciones con onDelete: Cascade para integridad referencial.
- Crear y validar la migración con `npx prisma migrate dev --name add_suppliers_and_packaging`.
- Actualizar `prisma/seed.ts` con proveedores de prueba (ej. "Distribuidora Mayorista Molinera").

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Migración relacional exitosa sin pérdida de datos
  Dado el esquema relacional con cuentas e insumos existentes
  Cuando se aplica la nueva migración en la base de datos
  Entonces se deben crear las tablas "Supplier", "SupplierIngredient" y "PriceHistory"
  Y los datos existentes de insumos y productos deben conservarse intactos
```

### Estrategia de Pruebas (QA)
- [ ] Validar migración reversible y verificar que `npx prisma migrate status` responda sin advertencias de deriva de esquema (*schema drift*).

### Definition of Done (DoD)
- [ ] Migración generada y versionada en `backend/prisma/migrations/`.
- [ ] Seed actualizado con proveedores y presentaciones mayoristas.
- [ ] PR abierto hacia develop con CI en verde.

---

### [SPRINT3-BE-02] CRUD de Proveedores y Registro Automático de Historial de Precios (#74)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** Backend (Mauricio Barreras)
* **Start Date:** 06/10/2026
* **Target Date:** 09/10/2026
* **Priority:** P1
* **Estimate:** 5
* **Size:** M

### Historia de Usuario
Como comerciante, quiero registrar mis proveedores habituales y que el sistema registre una auditoría histórica cada vez que un insumo cambie de precio, para analizar la evolución de mis costos a lo largo del tiempo.

---
### Alcance Técnico
- Crear el router `backend/src/routes/suppliers.ts` montado en `/api/suppliers`.
- Implementar endpoints: `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id` filtrados por `accountId`.
- Modificar `PUT /api/ingredients/:id`: si el campo `currentCost` varía respecto al valor en base de datos, insertar automáticamente un registro en `PriceHistory` dentro de la misma transacción.
- Crear endpoint `GET /api/ingredients/:id/history` para consultar las variaciones cronológicas de un insumo.

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Registro automático en el historial de precios al editar costo
  Dado un insumo "Manteca" cuyo costo actual es $8,000
  Cuando el usuario envía un PUT actualizando el costo a $9,500
  Entonces el insumo debe actualizarse a $9,500
  Y se debe generar una fila en "PriceHistory" con oldCost: $8,000, newCost: $9,500 y timestamp actual
```

### Estrategia de Pruebas (QA)
- [ ] Enviar una actualización donde el costo no cambia y verificar que no se creen filas espurias en `PriceHistory`.

### Definition of Done (DoD)
- [ ] Transacción atómica en actualización de costo e inserción de historial.
- [ ] Rutas protegidas bajo `authMiddleware`.
- [ ] PR abierto hacia develop con CI en verde.

---

### [SPRINT3-BE-03] Lógica de Conversión de Empaques Mayoristas y Proveedor Predeterminado (#75)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** Backend (Mauricio Barreras)
* **Start Date:** 08/10/2026
* **Target Date:** 11/10/2026
* **Priority:** P2
* **Estimate:** 3
* **Size:** S

### Historia de Usuario
Como comprador, quiero registrar compras en formatos mayoristas (ej. bolsa de 25 kg a $18,500) y que el sistema calcule el costo unitario por kilo base ($740/kg) y actualice el insumo automáticamente si el proveedor es el predeterminado.

---
### Alcance Técnico
- Endpoints en `backend/src/routes/suppliers.ts`:
  - `POST /api/suppliers/:id/ingredients`: asocia un insumo a un proveedor con presentación mayorista (`packageSize`, `packageUnit`, `packagePrice`, `isDefault`).
- Regla de negocio en backend:
  $$\text{unitCost} = \frac{\text{packagePrice}}{\text{packageSize}}$$
- Si `isDefault === true`, actualizar inmediatamente el `currentCost` en la tabla `Ingredient` y disparar el registro de historial.

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Cálculo de costo unitario desde empaque mayorista
  Dado que se asocia un proveedor al insumo "Harina" con presentación Bolsa de 50 kg por $35,000
  Cuando se envía el formulario marcando "Proveedor Predeterminado"
  Entonces el sistema debe computar el costo unitario en $700.00 por kilo
  Y debe actualizar el "currentCost" del insumo principal a $700.00
```

### Estrategia de Pruebas (QA)
- [ ] Pruebas unitarias sobre factores de conversión con números no divisibles enteros (ej. 3 bolsas por $10,000).

### Definition of Done (DoD)
- [ ] Operaciones de cálculo validadas con `Prisma.Decimal`.
- [ ] PR abierto hacia develop con CI en verde.

---

### [SPRINT3-BE-04] Middleware RBAC y Sanitización Financiera para Rol COLLABORATOR (#76)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** Backend (Mauricio Barreras)
* **Start Date:** 09/10/2026
* **Target Date:** 12/10/2026
* **Priority:** P1
* **Estimate:** 3
* **Size:** S

### Historia de Usuario
Como dueño del comercio, quiero que mis empleados (rol `COLLABORATOR`) puedan consultar la lista de productos y precios de venta para atender al público, pero que el backend jamás les exponga los costos de insumos, márgenes de ganancia ni información de proveedores.

---
### Alcance Técnico
- Crear el middleware de autorización `backend/src/middlewares/rbac.ts`:
  - Función `requireRole(allowedRoles: Role[])`.
  - Función `sanitizeFinancialData(req, res, next)`: intercepta la respuesta JSON si `req.user.role === 'COLLABORATOR'`.
- En respuestas de productos e insumos para colaboradores:
  - Eliminar campos: `cost`, `marginAmount`, `marginPercent`, `minMarginPercent`, `currentCost`.
  - Reemplazar por `null` o filtrar la propiedad en el serializador.
- Bloquear mutaciones críticas: colaboradores no pueden ejecutar `POST/PUT/DELETE` en `/api/products` ni `/api/ingredients` (responder `403 Forbidden`).

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Colaborador consulta el catálogo de productos
  Dado un usuario autenticado con rol "COLLABORATOR"
  Cuando envía un GET a "/api/products"
  Entonces el backend debe responder status 200 con la lista de productos
  Y los campos "cost", "marginAmount" y "marginPercent" deben estar ausentes del JSON retornado

Escenario: Colaborador intenta modificar un precio o insumo
  Dado un usuario con rol "COLLABORATOR"
  Cuando intenta enviar un POST o PUT a "/api/ingredients"
  Entonces el backend debe rechazar la solicitud con status 403 Forbidden
```

### Estrategia de Pruebas (QA)
- [ ] Test automatizado en Newman con token de Colaborador verificando que ningún regex encuentre datos de márgenes en el payload de respuesta.

### Definition of Done (DoD)
- [ ] Middleware RBAC testeado unitariamente con Supertest en Vitest.
- [ ] PR abierto hacia develop con CI en verde.

---

### [SPRINT3-BE-05] Endpoints de Métricas Financieras para el Dashboard (/api/dashboard/metrics) (#77)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** Backend (Mauricio Barreras)
* **Start Date:** 11/10/2026
* **Target Date:** 14/10/2026
* **Priority:** P2
* **Estimate:** 3
* **Size:** S

### Historia de Usuario
Como administrador, quiero un endpoint centralizado de métricas en el backend para alimentar las tarjetas del Dashboard en tiempo real con datos consolidados de mi negocio.

---
### Alcance Técnico
- Crear el router `backend/src/routes/dashboard.ts` montado en `/api/dashboard/metrics`.
- Calcular bajo `req.user.accountId`:
  - `activeIngredientsCount`: cantidad total de insumos activos.
  - `criticalProductsCount`: productos donde `marginPercent < minMarginPercent`.
  - `healthyProductsCount`: productos donde `marginPercent >= minMarginPercent`.
  - `averageMarginPercent`: promedio ponderado de margen de todo el catálogo.
  - `recentCostVariationsCount`: cantidad de insumos con variaciones en `PriceHistory` en los últimos 7 días.
- Proteger bajo `authMiddleware` y `requireRole(['ADMIN'])`.

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Consolidación precisa de métricas de cuenta
  Dado un comercio con 10 insumos y 4 productos (2 saludables y 2 con margen bajo)
  Cuando el administrador consulta GET a "/api/dashboard/metrics"
  Entonces el backend debe responder un JSON con activeIngredientsCount: 10, criticalProductsCount: 2
  Y el tiempo de resolución debe ser menor a 150 ms en base de datos
```

### Estrategia de Pruebas (QA)
- [ ] Validar que un usuario de otra cuenta reciba métricas calculadas estrictamente sobre sus propios datos.

### Definition of Done (DoD)
- [ ] Consultas optimizadas con agregaciones de Prisma (`count`, `aggregate`).
- [ ] PR abierto hacia develop con CI en verde.

---

### [SPRINT3-FE-01] Integración del Dashboard con Métricas Reales de la API (#78)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** Frontend (Federico Paal)
* **Start Date:** 03/10/2026
* **Target Date:** 07/10/2026
* **Priority:** P1
* **Estimate:** 3
* **Size:** S

### Historia de Usuario
Como usuario que inicia sesión, quiero que el Dashboard principal muestre los números reales de mi cuenta (eliminando todos los datos falsos de "Hamburguesería"), para tener un panorama verídico de la salud de mi negocio apenas ingreso.

---
### Alcance Técnico
- Crear `frontend/src/services/dashboardService.ts` consumiendo `GET /api/dashboard/metrics`.
- En `frontend/src/app/dashboard/page.tsx`:
  - Reemplazar constantes hardcodeadas por llamadas a la API.
  - Conectar los componentes `StatCard`: Insumos Activos, Productos en Riesgo, Margen Promedio y Variaciones Recientes.
  - Enlazar la lista de "Catálogo Monitoreado" con los productos reales del backend obtenidos vía `productService.getAll()`.
  - Incorporar estados de Skeleton mientras se resuelven las métricas.

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Dashboard renderiza datos reales de Panadería Central
  Dado que el usuario inicia sesión como Panadería Central
  Cuando ingresa a "/dashboard"
  Entonces la tarjeta de insumos debe mostrar exactamente 20 insumos
  Y el catálogo debe listar los 8 productos reales (Medialunas, Pan flauta, etc.)
  Y no debe figurar ninguna mención a productos ficticios como "Hamburguesa Doble"
```

### Estrategia de Pruebas (QA)
- [ ] Verificar comportamiento cuando la cuenta es nueva y tiene 0 insumos (EmptyState limpio en Dashboard).

### Definition of Done (DoD)
- [ ] Eliminación total de datos mockeados en `dashboard/page.tsx`.
- [ ] PR abierto hacia develop con CI en verde.

---

### [SPRINT3-FE-02] Semáforo de Margen Visual con Badges Condicionales y Gráficos Recharts (#79)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** Frontend (Federico Paal)
* **Start Date:** 07/10/2026
* **Target Date:** 10/10/2026
* **Priority:** P2
* **Estimate:** 3
* **Size:** S

### Historia de Usuario
Como comerciante, quiero identificar visualmente de un vistazo qué productos están por debajo de su rentabilidad esperada mediante códigos de color universales (verde y rojo) y gráficos comparativos, para tomar decisiones urgentes de fijación de precios.

---
### Alcance Técnico
- Crear el componente reutilizable `frontend/src/components/MarginBadge.tsx`:
  - Props: `marginPercent: number`, `minMarginPercent: number`, `hasRecipe: boolean`.
  - Si `!hasRecipe`: renderizar badge gris `"Sin Receta"`.
  - Si `marginPercent < minMarginPercent`: badge rojo con ícono de advertencia (`AlertTriangle`) y texto `"Crítico"`.
  - Si `marginPercent >= minMarginPercent`: badge verde esmeralda con texto `"Saludable"`.
- Reemplazar badges manuales en `/productos`, `/productos/:id` y `/dashboard` por el nuevo componente estandarizado.
- Integrar gráfico de barras de dispersión de márgenes con `recharts` en el Dashboard.

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Representación visual de producto crítico
  Dado un producto cuyo margen actual es 18% y su mínimo requerido es 30%
  Cuando se renderiza en cualquier vista de la plataforma
  Entonces debe mostrar un badge de fondo rojo suave con texto en carmesí "Crítico (18%)"
  Y debe cumplir contraste accesible WCAG AA
```

### Estrategia de Pruebas (QA)
- [ ] Validar accesibilidad visual en modo claro y modo oscuro.

### Definition of Done (DoD)
- [ ] Componente testeado en Vitest con múltiples combinaciones de margen.
- [ ] PR abierto hacia develop con CI en verde.

---

### [SPRINT3-FE-03] Adaptación de UI por Rol: Ocultamiento Financiero a Colaboradores (#80)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** Frontend (Federico Paal)
* **Start Date:** 09/10/2026
* **Target Date:** 12/10/2026
* **Priority:** P1
* **Estimate:** 3
* **Size:** S

### Historia de Usuario
Como dueño de negocio, quiero que la interfaz de mis empleados en salón oculte los botones de configuración, edición de costos y porcentajes de ganancia, para que solo puedan consultar el catálogo de venta al público sin acceder a información financiera confidencial.

---
### Alcance Técnico
- Crear el hook `useUserRole()` consumiendo los datos del usuario autenticado (/api/auth/me).
- En la interfaz de usuario:
  - Si `role === 'COLLABORATOR'`:
    - Ocultar columna "Costo" y columna "Margen" en `/productos`.
    - Deshabilitar y ocultar el botón `+ Nuevo Insumo` y `+ Nuevo Producto`.
    - Ocultar acceso a la vista `/insumos` en el Navbar y en el BottomNav.
    - Ocultar pestañas de proveedores y costos de recetas en la vista de detalle.
  - Proteger rutas a nivel cliente en `routes.tsx`: si un colaborador ingresa por URL directa a `/insumos`, redirigir a `/productos`.

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Empleado de salón navega el catálogo de productos
  Dado que un usuario inicia sesión con rol "COLLABORATOR"
  Cuando visualiza la pantalla de productos
  Entonces debe ver el nombre y el precio de venta de cada producto
  Y las columnas de costo de receta y margen comercial no deben mostrarse ni existir en el DOM

Escenario: Empleado intenta forzar navegación a insumos
  Dado un colaborador que escribe en el navegador "/insumos"
  Cuando React Router procesa la ruta
  Entonces debe interceptar la solicitud y redirigir inmediatamente a "/productos"
```

### Estrategia de Pruebas (QA)
- [ ] Probar sesión con `colab.panaderia@hotmail.com` y verificar que ningún elemento de administración financiera sea visible.

### Definition of Done (DoD)
- [ ] Doble barrera implementada: control visual en React y rechazo 403 en API.
- [ ] PR abierto hacia develop con CI en verde.

---

### [SPRINT3-FE-04] Gestión de Proveedores por Insumo y Calculadora de Empaques (#81)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** Frontend (Federico Paal)
* **Start Date:** 11/10/2026
* **Target Date:** 14/10/2026
* **Priority:** P2
* **Estimate:** 5
* **Size:** M

### Historia de Usuario
Como encargado de compras, quiero asignar proveedores a mis insumos con sus formatos de venta mayorista y contar con una calculadora que me indique el costo unitario equivalente, para elegir la opción más conveniente antes de reponer stock.

---
### Alcance Técnico
- Crear la pestaña o modal "Proveedores" dentro de la vista de insumos.
- Formulario de asociación de empaque mayorista:
  - Campos: Selector de Proveedor, Tamaño de Empaque (ej. 25), Unidad (kg/l/u), Precio Total del Empaque.
  - Checkbox: "Marcar como proveedor predeterminado".
- Calculadora reactiva en vivo: muestra automáticamente `"Costo equivalente por kilo/litro: $X.XX"`.
- Consumir los servicios de `/api/suppliers`.

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Cálculo visual de empaque mayorista en el cliente
  Dado que el usuario carga un empaque de "Caja 12 botellas de 1 L" a un precio de $18,000
  Cuando ingresa los valores en el formulario
  Entonces la interfaz debe calcular en tiempo real que el costo por litro es $1,500.00
  Y al guardar debe asociar la presentación al insumo correspondiente
```

### Estrategia de Pruebas (QA)
- [ ] Validar que no se puedan ingresar tamaños de empaque iguales a cero ni precios negativos.

### Definition of Done (DoD)
- [ ] Validaciones de formulario con Zod y React Hook Form.
- [ ] Responsive verificado en 360px.
- [ ] PR abierto hacia develop con CI en verde.

---

### [SPRINT3-FE-05] Visualización del Historial de Variaciones de Costo en Insumos (#82)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** Frontend (Federico Paal)
* **Start Date:** 13/10/2026
* **Target Date:** 15/10/2026
* **Priority:** P3
* **Estimate:** 2
* **Size:** S

### Historia de Usuario
Como dueño del negocio, quiero consultar una línea de tiempo con las variaciones de precio históricas de cada materia prima, para evaluar el impacto inflacionario en mis compras.

---
### Alcance Técnico
- Crear el componente `frontend/src/components/PriceHistoryModal.tsx`.
- Consumir el endpoint `GET /api/ingredients/:id/history`.
- Renderizar una lista vertical cronológica:
  - Fecha formateada (`DD/MM/YYYY HH:mm`).
  - Costo anterior vs. Costo nuevo.
  - Porcentaje de incremento en rojo (ej. `+12.5%`) o decremento en verde.
- Si no hay variaciones previas, renderizar EmptyState: `"Sin variaciones registradas"`.

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Consulta de historial inflacionario de un insumo
  Dado un insumo cuyo costo varió de $6,000 a $6,900 el día de ayer
  Cuando el usuario hace clic en el botón de historial del insumo
  Entonces debe desplegarse la línea de tiempo indicando el salto de $6,000 a $6,900
  Y debe destacar una etiqueta con el aumento porcentual "+15.0%"
```

### Estrategia de Pruebas (QA)
- [ ] Validar formato de fechas localizado a la zona horaria argentina (`America/Argentina/Buenos_Aires`).

### Definition of Done (DoD)
- [ ] Componente modal accesible y responsive.
- [ ] PR abierto hacia develop con CI en verde.

---

### [SPRINT3-QA-01] Protocolo de Pruebas In-Situ en Dispositivos Móviles (360px) con Comercios Piloto (#83)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** QA (Leandro Herrera)
* **Start Date:** 10/10/2026
* **Target Date:** 14/10/2026
* **Priority:** P2
* **Estimate:** 3
* **Size:** S

### Historia de Usuario
Como Product Owner de apoyo y QA Lead, quiero ejecutar un protocolo formal de pruebas funcionales en teléfonos reales sobre el mostrador de Panadería Central y Química GyJ, para validar la ergonomía de la interfaz en resolución de 360px bajo condiciones operativas reales.

---
### Alcance Técnico
- Redactar la guía de pruebas de campo `docs/qa/protocolo-pruebas-insitu-sprint3.md`.
- Casos a validar en caliente (sobre dispositivos reales con pantalla angosta):
  1. Carga rápida de nuevo costo de harina mientras se atiende en mostrador.
  2. Consulta de precio de venta por parte de un colaborador sin filtración de márgenes.
  3. Comprobación de que el teclado táctil virtual no tape los botones de acción en modales *bottom-sheet*.
- Recopilar feedback cualitativo del cliente real y registrar incidencias en GitHub Issues.

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Validación de usabilidad en teléfono de 360px de ancho
  Dado un dispositivo móvil real en el comercio piloto
  Cuando el usuario opera la aplicación con una sola mano
  Entonces la barra inferior de navegación debe ser fácilmente alcanzable con el pulgar
  Y ningún modal debe presentar desbordamiento horizontal ni elementos inaccesibles
```

### Estrategia de Pruebas (QA)
- [ ] Ejecución presencial con el dueño de Panadería Central.
- [ ] Acta de conformidad firmada y versionada en `docs/retrospectivas/`.

### Definition of Done (DoD)
- [ ] Protocolo ejecutado y documentado con evidencia fotográfica.
- [ ] Tareas de ajuste visual cargadas al backlog si se detectaron fricciones.

---

### [SPRINT3-QA-02] Tests E2E para Verificación de Seguridad y Permisos RBAC (#84)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** QA (Leandro Herrera)
* **Start Date:** 12/10/2026
* **Target Date:** 15/10/2026
* **Priority:** P1
* **Estimate:** 3
* **Size:** S

### Historia de Usuario
Como QA Engineer, quiero automatizar pruebas E2E en Playwright ejecutadas con credenciales de Colaborador, para auditar que la barrera de seguridad RBAC impida totalmente la visualización de datos sensibles y el acceso a rutas administrativas.

---
### Alcance Técnico
- Crear el archivo de prueba E2E `frontend/tests/e2e/rbac-security.spec.ts`.
- Automatizar escenarios con la sesión de `colab.panaderia@hotmail.com`:
  1. Verificar que en la URL `/productos` no exista ningún selector que contenga texto de costo o margen.
  2. Forzar navegación hacia `/insumos` y verificar intercepción con redirección inmediata.
  3. Interceptar las respuestas de red (`page.on('response')`) y verificar que los payloads JSON de la API no contengan las propiedades `marginAmount` ni `cost`.

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Detección automatizada de fuga de datos en sesión de colaborador
  Dado que el test de Playwright navega la aplicación como "colab.panaderia@hotmail.com"
  Cuando inspecciona el tráfico de red de la API
  Entonces ninguna respuesta JSON debe incluir las claves "cost", "marginAmount" o "marginPercent"
  Y la consola del navegador no debe emitir errores no controlados
```

### Estrategia de Pruebas (QA)
- [ ] Correr la suite en CI y verificar que pase en verde al 100% sin reintentos.

### Definition of Done (DoD)
- [ ] Suite integrada en el pipeline de GitHub Actions.
- [ ] PR abierto hacia develop con CI en verde.

---

### [SPRINT3-QA-03] Pruebas Automatizadas de Precisión en Factores de Conversión de Empaque (#85)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** QA (Leandro Herrera)
* **Start Date:** 13/10/2026
* **Target Date:** 15/10/2026
* **Priority:** P3
* **Estimate:** 2
* **Size:** S

### Historia de Usuario
Como QA Engineer, quiero incorporar pruebas de integración en Newman/Postman para los endpoints de proveedores y factores de conversión de empaque, certificando la exactitud de la fórmula matemática en base de datos.

---
### Alcance Técnico
- Crear la colección Postman `MargenX - Proveedores y Conversiones`.
- Casos de prueba:
  - Creación de proveedor válida (201).
  - Asociación de insumo con cálculo exacto de costo unitario.
  - Aislamiento multi-tenant: Cuenta A no puede listar ni asociar proveedores de Cuenta B.
  - Verificación de inserción en `PriceHistory` tras cambio de proveedor predeterminado.
- Integrar la colección al script de ejecución continua de QA (`run-tests.sh`).

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Auditoría de conversión mayorista en API
  Dado un empaque registrado de 20 litros por $15,000
  Cuando se consulta el insumo vinculado en la API
  Entonces el campo "currentCost" debe reflejar exactamente $750.00
  Y la colección de Postman debe finalizar con 0 assertions fallidas
```

### Estrategia de Pruebas (QA)
- [ ] Ejecutar la colección completa vía Newman en local y sobre Staging.

### Definition of Done (DoD)
- [ ] Colección JSON exportada en `backend/tests/postman/`.
- [ ] PR abierto hacia develop con CI en verde.

---

### [SPRINT3-DEVOPS-01] Optimización de Imágenes Docker y Monitoreo de Recursos en VPS (#86)
**[Metadatos del Tablero]**
* **Assignee Sugerido:** DevOps (Darío Giménez)
* **Start Date:** 10/10/2026
* **Target Date:** 15/10/2026
* **Priority:** P2
* **Estimate:** 3
* **Size:** S

### Historia de Usuario
Como DevOps, quiero optimizar el peso de las imágenes de Docker y configurar límites de memoria y monitoreo en los contenedores de la VPS, para asegurar que los 6 contenedores de la plataforma coexistan de manera estable en los 4 GB de RAM del servidor Donweb.

---
### Alcance Técnico
- Auditar y optimizar `backend/Dockerfile` y `frontend/Dockerfile`:
  - Implementar multi-stage builds avanzados con stripping de paquetes innecesarios.
  - Reducir la imagen de backend a $<180\text{ MB}$ y frontend a $<35\text{ MB}$.
- Actualizar `infra/vps/docker-compose.prod.yml`:
  - Configurar límites estrictos de recursos por contenedor:
    `deploy.resources.limits.memory` (Backend: 512 MB, Frontend: 128 MB, Postgres: 1024 MB, n8n: 512 MB).
  - Configurar políticas de logging con rotación automática (`max-size: "10m"`, `max-file: "3"`) para evitar saturación de disco.
- Configurar script o webhook en n8n que alerte a Discord si el uso de memoria de la VPS supera el 85%.

---
### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Protección de memoria en la VPS ante picos de tráfico
  Dado que los 6 contenedores de Staging y Producción están activos en la VPS
  Cuando se ejecutan pruebas de carga concurrentes
  Entonces el consumo total de RAM no debe exceder los 3.2 GB
  Y ningún contenedor debe ser terminado por el OOM Killer del sistema operativo
```

### Estrategia de Pruebas (QA)
- [ ] Inspeccionar salida de `docker stats` en la VPS durante la ejecución de las colecciones de Newman.

### Definition of Done (DoD)
- [ ] Límites de memoria y rotación de logs aplicados en la VPS y sincronizados en el repositorio.
- [ ] Alerta de saturación de recursos probada en Discord.
- [ ] PR abierto hacia develop con CI en verde.
