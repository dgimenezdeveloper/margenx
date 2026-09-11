# Infraestructura VPS - MargenX (Produccion, Staging y Automatizacion)

Este directorio contiene la definicion formal y reproducible de la infraestructura alojada en la VPS, bajo el modelo **100% VPS consolidado** (ver ADR-002 actualizado), reemplazando la arquitectura hibrida Azure + VPS evaluada inicialmente.

---

## 1. Vision General de la Arquitectura

    +--------------------------------------------------------------------+
    |                 VPS PRIVADA (168.197.49.120)                       |
    |                                                                    |
    |  +--------------------------------------------------------------+  |
    |  | Nginx (reverse proxy nativo del host, SSL Let's Encrypt)     |  |
    |  +--------------------------------------------------------------+  |
    |                                                                    |
    |  +----------------------------+  +-------------------------------+ |
    |  | STAGING / DEV              |  | PRODUCCION                    | |
    |  | dev.margenx.tech           |  | margenx.tech                  | |
    |  | api-dev.margenx.tech       |  | api.margenx.tech              | |
    |  | frontend-dev / backend-dev |  | frontend-prod / backend-prod  | |
    |  +----------------------------+  +-------------------------------+ |
    |                                                                    |
    |  +--------------------------------------------------------------+  |
    |  | Red Aislada: margenx_network                                 |  |
    |  |                                                              |  |
    |  |  * PostgreSQL 16 (margenx_postgres_prod)                     |  |
    |  |    Bases: margenx_dev y margenx_prod                         |  |
    |  |                                                              |  |
    |  |  * n8n Engine (margenx_n8n_prod)                             |  |
    |  |    n8n.margenx.tech                                          |  |
    |  +--------------------------------------------------------------+  |
    +--------------------------------------------------------------------+

**Principio de diseño:** ningún contenedor clona código fuente ni corre `npm install` en la VPS. GitHub Actions compila en sus runners, publica las imágenes en Docker Hub, y la VPS solo ejecuta `docker compose pull` + `up -d --no-deps` por SSH.

---

## 2. Estrategia de Entornos de Base de Datos (Dev local vs. Staging VPS vs. Prod VPS)

> ⚠️ **Aclaración de nomenclatura (evitar confusión de equipo):** existen DOS conceptos distintos que comparten el nombre "dev", y conviene que el equipo los distinga siempre explícitamente:
> 1. **Dev local de cada integrante:** el Postgres efímero que corre dentro del propio DevContainer (`.devcontainer/docker-compose.yml`), en `localhost:5432`, con datos descartables.
> 2. **Staging en la VPS:** el entorno persistente ligado a la rama `develop`, con su propia base `margenx_dev` **dentro de la VPS**, accesible en `dev.margenx.tech` / `api-dev.margenx.tech`.
>
> Ambos usan el nombre de base `margenx_dev`, pero son bases de datos físicamente distintas en servidores distintos.

| Característica | Dev Local (DevContainer) | Staging - VPS (`develop`) | Producción - VPS (`main`) |
| :--- | :--- | :--- | :--- |
| **Ubicación** | Contenedor local de cada integrante | VPS (`168.197.49.120`) | VPS (`168.197.49.120`) |
| **Contenedor** | `postgres:16-alpine` (local) | `margenx_postgres_prod` (compartido) | `margenx_postgres_prod` (compartido) |
| **Base de datos** | `margenx_dev` (local) | `margenx_dev` (en VPS) | `margenx_prod` |
| **Uso principal** | Desarrollo diario individual, creación de migraciones (`npx prisma migrate dev`) | Validación de integración antes de producción, demos intermedias | Datos reales de comercios piloto y entrega final |

---

## 3. Acceso a la Base de Datos (DBeaver / TablePlus / Clientes SQL)

El contenedor de PostgreSQL publica el puerto `5435` en el host (`5435:5432` en el Docker Compose). Esto permite la conexión directa de los integrantes del equipo para inspección de datos y tareas de desarrollo sin requerir acceso SSH ni credenciales del sistema operativo del servidor.

### Parámetros de Conexión Directa:
* **Host:** `168.197.49.120`
* **Puerto:** `5435`
* **Base de datos:** `margenx_dev` (Staging) o `margenx_prod` (Producción)
* **Usuario:** `margenx_admin`
* **Contraseña:** *(Ver variable `POSTGRES_PASSWORD` en el canal seguro del equipo)*

> 🔒 **Aislamiento y Seguridad:** Las credenciales `margenx_admin` corresponden exclusivamente al motor PostgreSQL dentro del contenedor. No otorgan permisos de administración, acceso a terminal ni lectura de archivos del sistema operativo de la VPS.

### Aplicar Migraciones de Prisma manualmente (Lead Backend, caso excepcional)
En condiciones normales, el pipeline de CI/CD aplica las migraciones automáticamente en cada deploy. Si el Lead Backend necesita correrlas manualmente desde su máquina local:

```bash
DATABASE_URL="postgresql://margenx_admin:PASSWORD@168.197.49.120:5435/margenx_prod?schema=public" npx prisma migrate deploy
```

---

## 4. Rol y Flujo de n8n (Motor de Eventos)

* **Principio de Diseño:** n8n nunca escribe directamente en la base de datos ni contiene lógica de cálculo financiero (el cálculo de margen reside exclusivamente en el backend).
* **Flujo de Notificación:**
  1. El Backend recalcula costos y detecta que un producto cayó por debajo del margen mínimo.
  2. El Backend dispara un webhook asíncrono hacia el endpoint expuesto de n8n.
  3. n8n recibe el payload JSON, formatea la alerta y envía el correo electrónico al Administrador del comercio.

---

## 5. Acceso y Administración de n8n

* **Autenticación:** cada miembro del equipo recibe un enlace de invitación generado por el Administrador (DevOps) para crear su propio usuario y contraseña dentro de n8n.
* **Seguridad:** en ningún momento se requiere acceso SSH ni credenciales del sistema operativo del servidor para gestionar flujos o credenciales en n8n.

---

## 6. Recuperación ante Desastres (Disaster Recovery)

Para re-desplegar la infraestructura completa en un nuevo servidor:

```bash
mkdir -p /opt/margenx-infra/data/{postgres,n8n}
chown -R 1000:1000 /opt/margenx-infra/data/n8n
cp docker-compose.prod.yml /opt/margenx-infra/docker-compose.yml
cp .env.example /opt/margenx-infra/.env # Configurar variables
docker compose up -d
```