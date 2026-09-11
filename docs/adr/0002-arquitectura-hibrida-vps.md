# 2. Despliegue Consolidado 100% en VPS
* **Estado:** Aceptado (reemplaza al ADR-002 original: "Arquitectura Híbrida — Cómputo en Azure y Base de Datos en VPS")
* **Fecha:** 2026-09 (confirmar fecha exacta de la decisión con el equipo)
* **Decisores:** Darío Giménez (DevOps/SM)

## Contexto y Planteamiento del Problema

La arquitectura híbrida original (ver ADR-002 previo) contemplaba el cómputo — Frontend y Backend — desplegado en Microsoft Azure App Service, y la persistencia — PostgreSQL y n8n — en una VPS propia. Tras avanzar con la implementación, el equipo evaluó que mantener dos proveedores de infraestructura distintos introducía complejidad operativa (dos paneles de administración, dos superficies de configuración de red) y latencia entre la capa de cómputo en la nube pública y la base de datos en la VPS, sin un beneficio claro que compensara ese costo dentro del alcance de la materia.

## Opciones Consideradas

1. **Mantener la arquitectura híbrida original (Azure + VPS).** Descartada por la complejidad operativa de administrar dos proveedores y la latencia entre capas.
2. **Migrar completamente a Azure (cómputo + base de datos administrada).** Descartada por el costo de una base de datos administrada (Azure Database for PostgreSQL Flexible Server) sostenido durante todo el semestre.
3. **Consolidar toda la infraestructura en la VPS propia, con doble entorno interno (staging/producción) diferenciado por subdominio.** ✅ Adoptada.

## Decisión

Se adopta el despliegue **100% consolidado en una única VPS propia**  Ubuntu 22.04 LTS, IP `168.197.49.120`):

* **Persistencia y automatización:** PostgreSQL 16 y n8n corren en contenedores dentro de la red interna `margenx_network`.
* **Cómputo:** el frontend y el backend se dockerizan y se publican como imágenes inmutables en Docker Hub (`dgimenezdeveloper/margenx-backend` / `margenx-frontend`) mediante GitHub Actions. La VPS solo descarga (`docker compose pull`) y levanta (`up -d --no-deps`) esas imágenes — nunca clona código fuente ni corre `npm install`.
* **Doble entorno en el mismo servidor:** STAGING/DEV (rama `develop`, dominios `dev.margenx.tech` / `api-dev.margenx.tech`, base `margenx_dev`) y PRODUCCIÓN (rama `main`, dominios `margenx.tech` / `api.margenx.tech`, base `margenx_prod`).
* **Nginx** corre como reverse proxy nativo en el host de la VPS (no dockerizado), con certificados SSL de Let's Encrypt vía Certbot para los cuatro subdominios de la app más el de n8n.

## Consecuencias

**Positivas:**
* Costo de infraestructura adicional $0 (se preservan los créditos educativos de Azure para otros usos).
* Menor latencia entre la API y la base de datos, al compartir la misma red interna de contenedores.
* Entorno de staging real (`dev.margenx.tech`) para validar cambios de forma aislada antes de que lleguen a producción o se muestren en una demo de cátedra.
* Un solo proveedor de infraestructura que administrar, reduciendo la carga operativa del rol DevOps.

**Compromisos (Trade-offs):**
* Toda la responsabilidad de seguridad perimetral (firewall, gestión de certificados SSL, backups) recae exclusivamente en el equipo de DevOps, sin la red gestionada de un proveedor cloud.
* Un único punto de fallo físico (un solo servidor) sostiene ambos entornos — mitigado con backups automáticos diarios de PostgreSQL (ver Issue de backup en el backlog de DevOps).
