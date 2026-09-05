# 2. Adopción de Arquitectura Híbrida (Cómputo en Azure + Persistencia en VPS)

* **Estado:** Aceptado
* **Fecha:** 2026-08-29
* **Decisores:** Dario Giménez (DevOps/SM)

## Contexto y Planteamiento del Problema
El proyecto requiere demostrar despliegue en una nube pública corporativa (Microsoft Azure) según los requisitos de la cátedra de Prácticas Profesionales Supervisadas. Sin embargo, mantener una base de datos PostgreSQL administrada (Azure Database for PostgreSQL Flexible Server) durante todo el semestre excede el presupuesto disponible de créditos estudiantiles.

## Opciones Consideradas
1. **100% en Microsoft Azure:** Frontend, Backend y Azure Flexible Server en la nube. (Descartado por alto costo mensual de la base de datos).
2. **100% en VPS Privada On-Premise:** Todo dockerizado en un solo servidor. (Descartado porque no cumplía el hito pedagógico de despliegue en Azure).
3. **Arquitectura Híbrida:** Capa de computación en Azure y capa de persistencia en VPS propia.

## Decisión
Se adopta una **Arquitectura Híbrida**:
* **Capa de Cómputo (Cloud):** Frontend (SPA Nginx) y Backend (API REST Node/Express) se empaquetan en contenedores Docker y se despliegan en **Microsoft Azure App Service** mediante GitHub Actions (CD).
* **Capa de Datos y Automatización (VPS Privada):** **PostgreSQL 16** y **n8n** residen en una VPS propia (IP `168.197.49.120`), con volúmenes persistentes montados en disco local y la base de datos expuesta de forma segura a través del puerto host `5435`.

## Consecuencias
* **Positivas:**
  * Cumplimiento total de los requisitos de la cátedra desplegando en Azure vía CI/CD.
  * Costo $0 adicional en bases de datos administradas y retención total de la información en disco persistente.
  * Colocación de PostgreSQL y n8n en la misma red interna de la VPS (`margenx_network`), reduciendo latencia.
* **Compromisos (Trade-offs):**
  * La responsabilidad de seguridad de red (firewall UFW), monitoreo y backups automáticos de PostgreSQL recae en el equipo de DevOps.
  * Requiere conexión segura por internet entre Azure y el puerto 5435 de la VPS mediante TLS/SSL.