---

# PROPUESTA DE PROYECTO: MargenX — Control de Márgenes en Tiempo Real

---

## 1\. Resumen

MargenX es una aplicación web multiempresa para comercios gastronómicos y emprendimientos de producción artesanal que calcula el margen de ganancia real de cada producto en base al costo actual de sus insumos, y alerta automáticamente cuando ese margen cae por debajo de lo esperado ante la suba de precios.

## 2\. Problema real

Los dueños de locales gastronómicos chicos (cafeterías, panaderías, food trucks) y emprendedores de producción artesanal (repostería, indumentaria, cosmética) fijan precios de venta a partir de una estimación inicial de costos que rara vez actualizan. Cuando sube el precio de un insumo, el precio de venta del producto final no se ajusta al mismo ritmo, y el producto puede terminar vendiéndose con margen mínimo o directamente a pérdida sin que el dueño lo note. Hoy esto se gestiona con planillas armadas una vez y no actualizadas, o a cálculo mental — sin revisión sistemática.

## 3\. Usuarios y modelo de cuentas

**El sistema es multiempresa y multiusuario:** cada comercio tiene su propia cuenta, con su login independiente, sus insumos y sus productos, completamente separados de los demás comercios que usen la plataforma.

**Dentro de una misma cuenta, se definieron dos roles:**

- **Administrador (dueño):** acceso completo — carga y edita insumos, crea y edita fichas de producto, ve el margen y el precio de venta de todo el negocio, define el margen mínimo esperado.  
- **Colaborador (empleado):** puede cargar y actualizar el costo de los insumos, pero **no** tiene visibilidad del margen ni del precio de venta de los productos. Pensado para el caso en que quien recibe la mercadería y actualiza precios no es necesariamente el dueño.

Este segundo rol se incorpora dentro del alcance del proyecto, ya que reutiliza el mismo sistema de autenticación con control de roles que se construye desde el arranque (Supabase Auth o Clerk).

**Cómo se cargan los datos — ejemplo concreto:** el proveedor de carne avisa al dueño o al colaborador (por WhatsApp, factura o remito en papel — esto queda fuera del sistema) que la carne picada subió a $4.200/kg. La persona con acceso al sistema entra a "Insumos" y actualiza ese único valor manualmente. **El sistema no lee ni procesa remitos, facturas o imágenes** — la carga es siempre manual y directa; automatizar esa lectura (OCR) queda fuera del alcance del MVP por la complejidad adicional que implicaría.

## 4\. Flujo Principal (MVP)

1. El usuario (admin o colaborador) actualiza el costo de un insumo en la sección "Insumos".  
2. El sistema recalcula automáticamente el costo y el margen de todos los productos que usan ese insumo en su receta, sin que haya que tocar cada producto uno por uno.  
3. El Dashboard principal muestra la tabla de todos los productos ordenada de menor a mayor margen, marcando visualmente en rojo los que quedaron por debajo del margen mínimo definido.  
4. Al entrar al detalle de un producto, se ve el desglose completo: insumos que lo componen, costo total, precio de venta y margen resultante en pesos y porcentaje.  
5. El dueño decide si ajusta el precio de venta o reformula la receta del producto en alerta.

## 5\. La Automatización (Excluyente — n8n)

- **Alerta automática** (email, y WhatsApp como mejora en sprints avanzados) cuando un producto cruza el umbral de margen mínimo tras la actualización de un insumo.  
- **Reporte semanal en PDF** con el estado de rentabilidad de todos los productos del comercio, generado y enviado automáticamente por n8n.  
- (Stretch goal) Aviso cuando un insumo no actualiza su costo hace más de X días, como recordatorio de revisión de precios.

## 6\. Funcionalidades del MVP

**Esenciales:**

- ABM de insumos (nombre, unidad de medida, costo por unidad).  
- ABM de productos/fichas (nombre, precio de venta, lista de insumos con cantidad usada).  
- Cálculo automático de costo y margen (absoluto y porcentual) por producto.  
- Definición de margen mínimo esperado.  
- Alertas visuales de productos por debajo del margen mínimo.  
- Recálculo automático de márgenes al actualizar el costo de un insumo.  
- Dashboard de productos ordenado por margen.  
- Roles de Administrador y Colaborador dentro de una misma cuenta.  
- Multiempresa: cuentas y datos completamente separados por comercio.

**Secundarias:**

- Historial de cambios de costo por insumo.  
- Simulador "¿qué pasaría si subo el precio de venta X%?".  
- Exportación de fichas de costo a PDF.

## 7\. Requerimientos funcionales

- **RF-01:** El sistema debe permitir crear, editar y eliminar insumos con nombre, unidad de medida y costo actual.  
- **RF-02:** El sistema debe permitir crear productos con nombre y precio de venta.  
- **RF-03:** El sistema debe permitir asociar a un producto una lista de insumos con la cantidad utilizada de cada uno.  
- **RF-04:** El sistema debe calcular el costo total de un producto sumando el costo proporcional de cada insumo según la cantidad usada.  
- **RF-05:** El sistema debe calcular el margen de cada producto en pesos y en porcentaje respecto al precio de venta.  
- **RF-06:** El sistema debe permitir definir un margen mínimo esperado, general o por producto.  
- **RF-07:** El sistema debe marcar visualmente los productos cuyo margen actual está por debajo del margen mínimo definido.  
- **RF-08:** Al editar el costo de un insumo, el sistema debe recalcular automáticamente el margen de todos los productos que lo utilizan.  
- **RF-09:** El sistema debe mostrar un listado de productos ordenable por margen, costo o precio de venta.  
- **RF-10:** El sistema debe permitir registrar cada cuenta como una empresa/comercio independiente, con sus datos aislados del resto.  
- **RF-11:** El sistema debe permitir asignar el rol de Administrador o Colaborador a cada usuario dentro de una cuenta.  
- **RF-12:** Un usuario con rol Colaborador debe poder editar el costo de insumos, pero no debe poder visualizar el margen ni el precio de venta de los productos.

## 8\. Requerimientos no funcionales

- **RNF-01:** El 90% de las vistas principales debe mostrar su contenido inicial en menos de 2 segundos bajo conexión de 20 Mbps en dispositivo de gama media.  
- **RNF-02:** La interfaz debe ser responsive, utilizable desde 360px de ancho, priorizando la tabla de márgenes en la vista mobile.  
- **RNF-03:** El sistema debe requerir autenticación mediante librería externa (Supabase Auth / Clerk / Firebase); los datos de una cuenta no deben ser accesibles por otra.  
- **RNF-04:** El recálculo de márgenes tras editar un insumo debe reflejarse en la interfaz sin recargar la página, en menos de 1 segundo para hasta 50 productos.  
- **RNF-05:** Los formularios deben validar que costos, cantidades y precios sean valores numéricos positivos antes de guardar.  
- **RNF-06:** El sistema debe mostrar mensajes de error comprensibles ante fallos de red o del servidor, sin exponer detalles técnicos.  
- **RNF-07:** El sistema debe ser compatible con las últimas dos versiones estables de Chrome, Firefox y Edge.  
- **RNF-08:** Los datos deben persistir en base de datos relacional, manteniendo integridad referencial (no permitir borrar un insumo usado en una ficha activa sin advertencia).  
- **RNF-09:** Un usuario con rol Colaborador no debe poder acceder, ni siquiera por URL directa, a las vistas o datos de margen y precio de venta.

## 9\. Stack tecnológico

- **Frontend:** React \+ TypeScript, Vite, Tailwind CSS, Recharts (gráfico comparativo de márgenes), React Hook Form \+ Zod (formularios con cálculos dependientes), Zustand (estado compartido para recálculo en vivo).  
- **Backend:** Node.js \+ Express \+ Prisma \+ PostgreSQL (modelo relacional natural: insumos, productos, relación producto-insumo con cantidad).  
- **Autenticación:** Supabase Auth o Clerk, con control de roles (Administrador / Colaborador).  
- **Entorno de desarrollo:** Docker \+ VS Code DevContainers (frontend, backend y base de datos efímera local).  
- **Infraestructura de producción:** aplicación (frontend/backend) dockerizada y desplegada en Azure (App Service / Container Apps) vía CI/CD con GitHub Actions; base de datos PostgreSQL en VPS propia con Docker y volúmenes persistentes.  
- **Automatización:** n8n self-hosted en la VPS, disparado por webhooks desde la aplicación.

## 10\. Alcance y Cronograma de Entregas (Sprint 0 \+ 6 Sprints)

Para mitigar riesgos técnicos y asegurar la calidad del MVP exigido para el 03/10, el equipo adoptó un enfoque proactivo, iniciando el desarrollo técnico desde el día 1 mediante un **Sprint 0**. El ciclo de vida consta de 7 iteraciones exactas de 2 semanas, alineadas a los hitos de la cátedra.

- **Sprint 0: Setup Técnico y Arquitectura (22/08 al 05/09)** *Foco:* Infraestructura base, DevContainers, despliegue de VPS (PostgreSQL \+ n8n), esquema Prisma y middleware de autenticación. *Hito Cátedra:* Requerimientos, backlog, diseño y arquitectura (Clase 05/09).  
    
- **Sprint 1: Gestión de Insumos y Productos (05/09 al 19/09)** *Foco:* CRUD completo de Insumos y Productos (sin receta), maquetado de vistas base y pipeline de CI/CD hacia Azure. *Hito Cátedra:* Repositorio, ramas, PRs y CI configurado (Clase 19/09).  
    
- **Sprint 2: MVP Core — Recetas y Cálculo (19/09 al 03/10)** *Foco:* Lógica transaccional de recetas (`ProductIngredient`), motor matemático de cálculo de costo/margen y primer test E2E en Playwright. *Hito Cátedra:* **Sprint Review: Demo del MVP y Deploy en URL pública (Clase 03/10).**  
    
- **Sprint 3: Dashboard, Roles y Testing (03/10 al 17/10)** *Foco:* Semáforo de rentabilidad visual, implementación de rol Colaborador (RBAC) para ocultar datos financieros, y pruebas de usabilidad. *Hito Cátedra:* **Pruebas en clase con usuarios reales y QA (Clase 17/10).**  
    
- **Sprint 4: Recálculo en Cascada y Automatización (17/10 al 31/10)** *Foco:* Motor de recálculo automático al modificar costos e integración de webhooks con n8n para alertas de margen bajo por email. *Hito Cátedra:* Presentación para el Product Owner y Pitch de venta (Clase 31/10).  
    
- **Sprint 5: Reportes y Endurecimiento (31/10 al 14/11)** *Foco:* Reporte PDF semanal vía n8n, optimización de base de datos, auditoría de accesibilidad/responsive (360px) y corrección de bugs de UI. *Hito Cátedra:* Revisión integral y ensayo de defensa (Clase 14/11).  
    
- **Sprint 6: Cierre y Entrega Final (14/11 al 28/11)** *Foco:* Congelamiento de código (Release v1.0), redacción del manual de usuario, grabación del video demo y preparación final. *Hito Cátedra:* **ENTREGA FINAL (Clase 28/11).**

## 11\. Riesgos y mitigaciones

- **Carga de recetas tediosa:** mitigar permitiendo duplicar fichas de producto similares y autocompletar insumos ya cargados.  
- **Errores de unidad de medida (gramos vs kilogramos):** forzar una unidad base por insumo y hacer explícita la conversión en el formulario de receta.  
- **Recálculo en cascada lento con muchos productos:** mantener el cálculo en el frontend con los datos ya cargados en memoria para el alcance del MVP.  
- **Rol Colaborador mal restringido (fuga de datos de margen):** cubrir con tests específicos de control de acceso, no solo ocultar visualmente el dato en el frontend sino validarlo también en el backend.

## 12\. Métricas de éxito

- Cantidad de productos que un usuario logra fichar completamente en su primera sesión (objetivo: al menos 5 en menos de 15 minutos).  
- Porcentaje de productos de una prueba piloto con margen menor al esperado por el usuario antes de usar la herramienta.  
- Tiempo que tarda el sistema en reflejar el recálculo de márgenes tras editar un insumo usado en múltiples productos.

## 13\. Potencial de ampliación (fuera del alcance del proyecto)

Sugerencia automática de precio de venta ideal según margen objetivo, integración con proveedores para actualización automática de costos (incluyendo eventual lectura de remitos/facturas), reportes de rentabilidad por categoría de producto, soporte multi-sucursal dentro de una misma cuenta, recordatorios automáticos por WhatsApp Business API.

## 13.1. Backoffice interno — Fase 2 (fuera del alcance de los sprints comprometidos)

Durante la planificación se identificó la necesidad de una vista de administración interna, de uso exclusivo del equipo de MargenX (no de los comercios clientes), para gestionar el ciclo de vida comercial de las cuentas:

- Alta, edición y deshabilitación de cuentas de clientes.  
- Asignación y cambio de plan de suscripción.  
- Gestión del período de prueba gratuita (freemium).  
- Visualización del estado general de cuentas activas.

**Decisión de alcance:** esta funcionalidad no se incluye en los sprints comprometidos del MVP académico. Se adopta la práctica estándar de la industria SaaS en etapas tempranas conocida como *"Concierge MVP"*: mientras el volumen de cuentas es bajo, la gestión se realiza de forma manual mediante Prisma Studio o consultas directas, evitando construir una UI dedicada antes de validar el producto principal.

**Preparación realizada:** el modelo de datos `Account` fue extendido preventivamente con los campos `trialEndsAt` (DateTime, nulo) e `isActive` (Boolean, default `true`) durante el Sprint 0, para que la futura construcción del backoffice no requiera una migración de datos sobre cuentas ya existentes.

Si el cronograma lo permite hacia el final del proyecto (Sprint 5-6), se evaluará construir una versión mínima de esta vista como ampliación; de lo contrario, queda registrada como línea de trabajo futura post-entrega académica.

## 14\. Viabilidad

- Problema/dolor real: 9/10.  
- Innovación/diferenciación: 7/10.  
- Viabilidad en 3 meses: 8/10.  
- Complejidad técnica: 6/10.  
- Potencial de demo: 8/10.  
- Potencial de uso real: 9/10.

---

## Nota de infraestructura — WhatsApp Business API

El equipo ya cuenta con una cuenta de Meta Developers previamente verificada (usada en un proyecto anterior de chatbot), lo que reduce el riesgo de demoras por aprobación de negocio. A partir de octubre de 2026, Meta comienza a cobrar por mensajes de utilidad y servicio en WhatsApp Business API, por lo que el canal de email queda garantizado en el MVP, con WhatsApp como mejora incorporable una vez validado el costo por mensaje.

