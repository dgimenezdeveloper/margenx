# 1. Adopción de Clerk para Gestión de Identidad y Autenticación Delegada

* **Estado:** Aceptado
* **Fecha:** 2026-08-28
* **Decisores:** Dario Gimenez (DevOps/SM), Mauro Barreras (Backend), Federico Paal (Frontend)

## Contexto y Planteamiento del Problema
MargenX es un SaaS multiempresa con roles diferenciados (`ADMIN` y `COLLABORATOR`). Desarrollar un sistema de autenticación propio desde cero (tablas de passwords, hashing con bcrypt, rotación de refresh tokens y recuperación de contraseña) introduce riesgos de seguridad innecesarios y consume semanas de desarrollo que deben enfocarse en el núcleo de negocio (cálculo de márgenes).

## Opciones Consideradas
1. **Autenticación propia con JWT + Bcrypt en PostgreSQL:** Control total pero alta responsabilidad de seguridad y costo de mantenimiento.
2. **Supabase Auth:** Buena integración con PostgreSQL pero requería acoplar la base de datos a su ecosistema o lidiar con latencias de red en contenedores locales.
3. **Clerk:** Servicio especializado en identidad, SDK nativo para React 19 y Node/Express con verificación asimétrica de JWT.

## Decisión
Se decide adoptar **Clerk** como proveedor de identidad delegada (IdP).
* En el **Backend**, se utiliza `@clerk/backend` para verificar la firma del JWT en el middleware `authMiddleware.ts` y extraer el `sub` para vincularlo con el `authProviderId` del modelo `User` de Prisma.
* En el **Frontend**, se adopta `@clerk/clerk-react` para la gestión de sesiones y protección de rutas.

## Consecuencias
* **Positivas:**
  * Cero riesgo de filtración de contraseñas (no se almacenan hashes en PostgreSQL).
  * Soporte nativo para sesiones móviles y autenticación social sin código adicional.
  * Fácil extracción del rol y del `accountId` para el aislamiento multi-tenant.
* **Compromisos (Trade-offs):**
  * Dependencia de un servicio SaaS externo de terceros.
  * Obligatoriedad de sincronizar variables de entorno (`CLERK_SECRET_KEY` y `VITE_CLERK_PUBLISHABLE_KEY`) en todos los entornos (local, CI y Azure).