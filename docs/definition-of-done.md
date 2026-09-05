# Definition of Done (DoD) — MargenX
**Materia:** Prácticas Profesionales Supervisadas (PPS)  
**Vigencia:** Sprint 0 a Sprint 6 (7 iteraciones de 2 semanas)  

Una Historia de Usuario, Tarea o Issue solo se considerará **DONE (Terminada)** cuando cumpla estrictamente con la totalidad de los siguientes criterios:

---

### 1. Control de Versiones y Flujo Git
- **Origen de la rama:** La rama de trabajo debe crearse siempre a partir de `develop`.
- **Nomenclatura de ramas:** La rama debe contener obligatoriamente el número de issue (ej. `31-fe-maquetado-insumos` o `feat/35-middleware-errores`) para permitir la automatización del tablero.
- **Formato de Commits:** Los mensajes de commit deben seguir el estándar Conventional Commits en español o inglés (ej. `feat(ingredients): agregar paginacion y ordenamiento`, `fix(auth): corregir expiracion de token jwt`, `docs: ...`).
- **Pull Request:** Debe estar abierto hacia `develop`, con descripción clara utilizando la plantilla estándar y vinculando la issue correspondiente (ej. `Closes #35`).
- **Code Review:** Requiere la aprobación obligatoria de al menos **1 compañero de equipo** (Peer Review) antes de habilitar el merge.
- **Sin conflictos:** No debe presentar conflictos de fusión (merge conflicts) con la rama `develop`.

---

### 2. Calidad de Código y Tipado
- **TypeScript Estricto:** Código fuertemente tipado, sin uso injustificado del tipo `any`.
- **Linter & Formato:** 0 errores de compilación y 0 advertencias (warnings) de ESLint o Prettier.
- **Limpieza de Consola:** No deben quedar sentencias `console.log` de depuración, advertencias ni errores en la consola del navegador o terminal.

---

### 3. Integración Continua (CI)
- **Pipeline en Verde:** El workflow de GitHub Actions (`ci.yml`) debe ejecutarse y finalizar en estado exitoso (Passed) en el Pull Request.

---

### 4. Criterios de Aceptación y Testing (QA)
- **Criterios Gherkin:** Cumplimiento verificado de todos los escenarios (Dado/Cuando/Entonces) especificados en la issue.
- **Prueba en Local:** Funcionalidad probada y funcionando en el entorno estandarizado de DevContainers.
- **Datos Realistas:** Prohibido el uso de cadenas genéricas ("test1", "asdasd", "1234"). Todo testing manual o semilla debe usar datos reales de Panadería Central o Química GyJ.
- **Pruebas Automatizadas (según sprint):** Tests unitarios, colecciones de Postman o suites E2E con Playwright creados o actualizados si la tarea afecta el flujo crítico.
- **Aprobación de QA:** El responsable de QA debe verificar y aprobar el PR (disparando el estado QA Approved en el tablero).

---

### 5. Interfaz y Experiencia de Usuario (Frontend)
- **Mobile-First:** Diseño responsive verificado y navegable desde pantallas móviles de 360px de ancho sin scroll horizontal indeseado en el viewport global.
- **Manejo de Estados:** La interfaz debe manejar visualmente los tres estados básicos:
  - Estado de carga (Loading / Skeletons / Spinners).
  - Estado de error (Mensajes claros y amigables ante caídas de red o fallos del servidor).
  - Estado vacío (Empty state con botón de acción cuando una tabla o lista no tiene registros).

---

### 6. Documentación de API (Backend)
- **Documentación de Endpoints:** Todo nuevo endpoint debe tener documentado su método HTTP, ruta, cabeceras requeridas, payload esperado, respuestas HTTP posibles (200, 400, 401, 403, 404, 500) y su colección de Postman asociada.
- **Aislamiento Multi-Tenant:** Toda consulta en base de datos debe filtrar de forma estricta e inviolable por `accountId`.

---

### 7. Despliegue en Producción (A partir del Sprint 1)
- **Entorno Productivo:** Código desplegado y verificado en la URL pública de Microsoft Azure comunicándose con la base de datos PostgreSQL de la VPS.