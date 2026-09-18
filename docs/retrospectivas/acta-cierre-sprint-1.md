# Acta de Cierre de Sprint y Retrospectiva — Sprint 1 (MVP Base & Hardening)

**Proyecto:** MargenX — Control de Márgenes en Tiempo Real  
**Materia:** Prácticas Profesionales Supervisadas (PPS)  
**Fecha de Sesión:** 18/09/2026  
**Hora:** 18:00 hs  
**Facilitador / Scrum Master:** Darío Giménez  
**Participantes:** Darío Giménez (DevOps/SM), Mauricio Barreras (Lead Backend), Federico Paal (Lead Frontend), Leandro Herrera (QA Engineer)  

---

## 1. Objetivo del Sprint 1
Consolidar el MVP base de MargenX dotando al sistema de persistencia robusta, flujos de autenticación seguros con Clerk, validaciones estrictas de formularios, paginación y ordenamiento en backend, automatización completa de pruebas (Postman y Playwright) y un pipeline de Despliegue Continuo (CD) inmutable hacia la infraestructura de producción en la VPS Donweb.

---

## 2. Hitos Técnicos y Entregables Completados por Rol

### A. DevOps, Automatización e Infraestructura (Darío Giménez)
- **Pipeline de Despliegue Continuo (CD) a VPS:** Configuración y puesta en marcha del workflow en GitHub Actions (`deploy.yml`) que compila imágenes Docker inmutables en Docker Hub y se conecta por SSH a la VPS Donweb (`168.197.49.120`) para actualizar los servicios sin tiempo de inactividad (Issue #40 / PR #58).
- **Migraciones Automatizadas en Despliegue:** Integración de la ejecución atómica de `prisma migrate deploy` mediante un contenedor efímero previo al reinicio de los contenedores de aplicación (Issue #41 / PR #59).
- **Notificaciones de CI/CD en Discord:** Implementación de alertas automatizadas vía webhooks para reportar en tiempo real el éxito de los deploys y los fallos en pipelines (Issue #42 / PR #63).
- **Hardening de Staging y Producción:** Configuración perimetral de Nginx reverse proxy con certificados SSL de Let's Encrypt para `dev.margenx.tech` y preconfiguración del entorno productivo `margenx.tech` (Issue #68).

### B. Arquitectura de Datos y Backend (Mauricio Barreras)
- **Middleware Global de Errores:** Implementación de un manejador centralizado de excepciones que intercepta errores de sintaxis JSON, fallos de dominio y códigos conocidos de Prisma (P2025, P2002, P2003), normalizando las respuestas a un formato JSON uniforme (`{"error": "..."}`) (Issue #35 / PR #51).
- **Paginación y Ordenamiento Server-Side:** Desarrollo de lógica de paginación robusta con cálculo de metadatos (`total`, `page`, `limit`, `totalPages`) y ordenamiento seguro por campos permitidos en `/api/ingredients` (Issue #36 / PR #57).
- **CRUD de Productos y Recetas (Soporte Borrador):** Implementación de endpoints transaccionales con `prisma.$transaction` para la creación y gestión de productos con soporte para el estado comercial "Sin Costear" (Issue #27 / PR #65).

### C. Frontend y Experiencia de Usuario Mobile-First (Federico Paal)
- **Maquetado Responsivo Table-to-Cards (360px):** Adaptación visual de las vistas de Insumos y Productos para garantizar una experiencia táctil fluida en dispositivos móviles con pantallas estrechas, incorporando componentes de Empty State (Issue #31 / PR #53).
- **Formularios Validados con Zod y React Hook Form:** Incorporación de esquemas de validación estricta para impedir ingresos de costos negativos, nulos o formatos no numéricos en tiempo real antes de golpear la API (Issue #32 / PR #55).
- **Integración Frontend ↔ Backend:** Conectividad completa mediante el proveedor de autenticación `<ClerkProvider>`, inyección dinámica de tokens JWT en los headers de Axios/Fetch y protección de rutas con redirección automática (Issue #29 & #33 / PR #60).

### D. Calidad, Testing y Enlace con Dominio Real (Leandro Herrera)
- **Script de Seed Idempotente (`prisma/seed.ts`):** Creación del script de población de datos con validaciones estrictas de entorno, control de colisiones y el dataset verídico correspondiente a los comercios piloto (*Panadería Central* y *Química GyJ*) (Issue #30 / PR #52).
- **Matriz de Pruebas Gherkin y Contratos HTTP:** Documentación formal de casos de prueba funcionales, de seguridad multi-tenant y de validación de códigos de estado HTTP en `docs/qa/casos-prueba-sprint1.md` (Issue #39 / PR #54).
- **Pruebas Automatizadas de API (Postman/Newman):** Confección de colecciones de prueba automatizadas para el módulo de Insumos y Productos, validadas contra entornos locales y de staging (Issue #37 & #38 / PR #56 & #64).
- **Scaffolding E2E con Playwright:** Configuración de la suite de pruebas de extremo a extremo con autenticación global automatizada (`auth.setup.ts`) para persistir la sesión de Clerk sin re-autenticar en cada test (Issue #67 & #69).

---

## 3. Dinámica de Retrospectiva (Start / Stop / Continue)

### 🟢 Qué funcionó bien y debemos MANTENER (Continue)
1. **Disciplina en el Flujo GitFlow y PRs:** La obligatoriedad de los Pull Requests con *Squash and Merge* y la revisión por pares mantuvo la rama `develop` sumamente limpia y estable.
2. **Sincronización Temprana de Contratos (API Contracts):** Definir los payloads y schemas de Zod de antemano permitió que Frontend y Backend trabajaran en paralelo sin desacoples graves de integración.
3. **Visibilidad Automatizada en Discord:** Las alertas de CI/CD en el canal del equipo permitieron detectar y corregir errores de compilación en minutos.

### 🔴 Qué nos generó fricción y debemos ELIMINAR (Stop)
1. **Omisión temporal de variables de entorno en compilación:** Al principio de la integración con Docker, algunas variables `VITE_*` no se inyectaban correctamente en el build estático de Vite, lo cual obligó a refactorizar los Dockerfiles para usar `ARG`. Debemos mantener la regla de documentar siempre las variables en los archivos `.env.example`.
2. **Pruebas manuales repetitivas:** Consumía tiempo verificar casos negativos uno por uno en la interfaz; la consolidación de Postman y Playwright en este sprint resolvió este cuello de botella.

### 🟡 Qué acciones y acuerdos IMPLEMENTAREMOS en el Sprint 2 (Start)
1. **Diseño previo del Motor Financiero con `Prisma.Decimal`:** Consensuar las funciones puras de cálculo matemático antes de escribir los controladores Express para evitar discrepancias de punto flotante.
2. **Uso Intensivo de Zustand:** Adoptar el patrón de store global en el frontend para soportar el editor interactivo de recetas con recálculo instantáneo en $<50\text{ ms}$.

---

## 4. Compromisos y Acuerdos de Equipo para el Sprint 2

| Acuerdo / Acción de Mejora | Responsable | Criterio de Medición |
|---|---|---|
| Implementar el servicio puro de dominio `marginCalculator.ts` con Vitest | Mauricio Barreras | 100% de cobertura en tests unitarios de precisión aritmética |
| Construir el editor interactivo de recetas con Zustand en `/productos/nuevo` | Federico Paal | Recálculo fluído en vivo en viewport de 360px sin retardo perceptible |
| Automatizar la suite E2E de recálculo de margen en Playwright y CI | Leandro Herrera / Darío Giménez | Jobs de Playwright ejecutándose en verde dentro de `ci.yml` |
| Puesta a punto y despliegue del entorno de producción oficial (`margenx.tech`) | Darío Giménez | Dominio accesible bajo HTTPS con base `margenx_prod` aislada |

---

**Firma y Aprobación del Equipo:**  
- Darío Giménez *(Scrum Master & DevOps)*  
- Mauricio Barreras *(Lead Backend & Data Architect)*  
- Federico Paal *(Lead Frontend & UX/UI)*  
- Leandro Herrera *(QA Engineer & Enlace Cliente)*