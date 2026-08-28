# Definition of Done (DoD) — MargenX
**Materia:** Practicas Profesionales Supervisadas (PPS)  
**Vigencia:** Sprint 1 a Sprint 8  

Una Historia de Usuario, Tarea o Issue solo se considerara **DONE (Terminada)** cuando cumpla estrictamente con la totalidad de los siguientes criterios:

---

### 1. Control de Versiones y Flujo Git
- **Origen de la rama:** La rama de trabajo debe crearse siempre a partir de `develop`.
- **Nomenclatura de ramas:** La rama debe contener obligatoriamente el numero de issue (ej. `1-fe-setup-tailwind` o `feature/1-login`) para permitir la automatizacion del tablero.
- **Formato de Commits:** Los mensajes de commit deben seguir el estandar Conventional Commits en espanol o ingles (ej. `feat(insumos): agregar validacion de costo`, `fix(auth): corregir expiracion de token`, `docs: ...`).
- **Pull Request:** Debe estar abierto hacia `develop`, con descripcion clara y vinculando la issue correspondiente (ej. `Closes #1`).
- **Code Review:** Requiere la aprobacion obligatoria de al menos **1 companero de equipo** (Peer Review) antes de habilitar el merge.
- **Sin conflictos:** No debe presentar conflictos de fusion (merge conflicts) con la rama `develop`.

---

### 2. Calidad de Codigo y Tipado
- **TypeScript Estricto:** Codigo fuertemente tipado, sin uso injustificado del tipo `any`.
- **Linter & Formato:** 0 errores de compilacion y 0 advertencias (warnings) de ESLint o Prettier.
- **Limpieza de Consola:** No deben quedar sentencias `console.log` de depuracion, advertencias ni errores en la consola del navegador o terminal.

---

### 3. Integracion Continua (CI)
- **Pipeline en Verde:** El workflow de GitHub Actions (`ci.yml`) debe ejecutarse y finalizar en estado exitoso (Passed) en el Pull Request.

---

### 4. Criterios de Aceptacion y Testing (QA)
- **Criterios Gherkin:** Cumplimiento verificado de todos los escenarios (Dado/Cuando/Entonces) especificados en la issue.
- **Prueba en Local:** Funcionalidad probada y funcionando en el entorno estandarizado de DevContainers.
- **Datos Realistas:** Prohibido el uso de cadenas genericas ("test1", "asdasd", "1234"). Todo testing manual o semilla debe usar datos reales de Panaderia o Quimica.
- **Pruebas Automatizadas (segun sprint):** Tests unitarios o E2E con Playwright creados o actualizados si la tarea afecta el flujo critico.
- **Aprobacion de QA:** El responsable de QA debe verificar y aprobar el PR (disparando el estado QA Approved en el tablero).

---

### 5. Interfaz y Experiencia de Usuario (Frontend)
- **Mobile-First:** Diseno responsive verificado y navegable desde pantallas moviles de 360px de ancho sin scroll horizontal indeseado.
- **Manejo de Estados:** La interfaz debe manejar visualmente los tres estados basicos:
  - Estado de carga (Loading / Skeletons / Spinners).
  - Estado de error (Mensajes claros ante caidas de red o fallos del servidor).
  - Estado vacio (Empty state cuando una tabla o lista no tiene registros).

---

### 6. Documentacion de API (Backend)
- **Documentacion de Endpoints:** Todo nuevo endpoint debe tener documentado su metodo HTTP, ruta, cabeceras requeridas, payload esperado y respuestas HTTP posibles (200, 400, 401, 404, 500).

---

### 7. Despliegue en Produccion (A partir del Sprint 2)
- **Entorno Productivo:** Codigo desplegado y verificado en la URL publica de Microsoft Azure comunicandose con la base de datos de la VPS.