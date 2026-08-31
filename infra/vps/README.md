# Infraestructura VPS - MargenX (Produccion y Automatizacion)

Este directorio contiene la definicion formal y reproducible de la infraestructura alojada en la VPS de produccion, configurada bajo el modelo de Arquitectura Hibrida para el proyecto MargenX.

---

## 1. Vision General de la Arquitectura

    +----------------------------------------------+
    |             MICROSOFT AZURE (Cloud)          |
    |  * Frontend (React 19 + Vite en Docker)      |
    |  * Backend REST (Node/Express/Prisma Docker) |
    +----------------------+-----------------------+
                           |
                           | Conexion Prisma (Puerto 5435) / Webhooks HTTP
                           v
    +----------------------------------------------+
    |             VPS PRIVADA (168.197.49.120)     |
    |  +----------------------------------------+  |
    |  | Red Aislada: margenx_network           |  |
    |  |                                        |  |
    |  |  * PostgreSQL 16 (margenx_postgres_prod|  |
    |  |    Puerto Host: 5435 -> Interno: 5432  |  |
    |  |    Base de datos: margenx_prod         |  |
    |  |                                        |  |
    |  |  * n8n Engine (margenx_n8n_prod)       |  |
    |  |    Puerto Host: 5678                   |  |
    |  |    Orquestador de alertas y reportes   |  |
    |  +----------------------------------------+  |
    +----------------------------------------------+

---

## 2. Estrategia de Entornos de Base de Datos (Dev vs. Prod)

| Caracteristica | Entorno Local / Desarrollo (Dev) | Entorno Produccion (VPS) |
| :--- | :--- | :--- |
| **Ubicacion** | DevContainer local (`.devcontainer/docker-compose.yml`) | Servidor Remoto (`168.197.49.120`) |
| **Contenedor** | `postgres:16-alpine` | `margenx_postgres_prod` |
| **Host / Puerto** | `localhost:5432` | `168.197.49.120:5435` |
| **Base de datos** | `margenx_dev` | `margenx_prod` |
| **Usuario / Pass** | `postgres` / `devpassword123` | `margenx_admin` / *(Canal seguro interno)* |
| **Uso principal** | Desarrollo diario, pruebas unitarias y creacion de migraciones (`npx prisma migrate dev`). | Base de datos persistente alojada en la VPS. Es consumida por el backend desplegado en Azure y recibe las migraciones de produccion (`npx prisma migrate deploy`). |

---

## 3. Rol y Flujo de n8n (Motor de Eventos)

* **Principio de Diseno:** n8n nunca escribe directamente en la base de datos ni contiene logica de calculo financiero (el calculo de margen reside exclusivamente en el backend).
* **Flujo de Notificacion:**
  1. El Backend recalcula costos y detecta que un producto cayo por debajo del margen minimo.
  2. El Backend dispara un webhook asincrono hacia el endpoint expuesto de n8n.
  3. n8n recibe el payload JSON, formatea la alerta y envia el correo electronico al Administrador del comercio.

---

## 4. Guia de Conexion y Verificacion para el Equipo

### A. Conectar DBeaver / TablePlus / DataGrip a la BD de Produccion
El acceso a la base de datos se realiza de forma directa por el puerto 5435 sin necesidad de tuneles ni accesos a nivel de servidor:
* **Host:** `168.197.49.120`
* **Puerto:** `5435`
* **Base de datos:** `margenx_prod`
* **Usuario:** `margenx_admin`
* **Contrasena:** *(Ver canal seguro de comunicacion del equipo)*

### B. Aplicar Migraciones de Prisma a Produccion (Lead Backend)
Desde la carpeta `backend/`:

    DATABASE_URL="postgresql://margenx_admin:PASSWORD@168.197.49.120:5435/margenx_prod?schema=public" npx prisma migrate deploy


### C. Acceso y Administracion de n8n
El acceso a n8n se realiza de forma independiente mediante la plataforma web:
* **Autenticacion:** Cada miembro del equipo recibe un enlace de invitacion generado por el Administrador (DevOps) para crear su propio usuario y contrasena dentro de n8n.
* **Seguridad:** En ningun momento se requiere acceso SSH ni credenciales del sistema operativo del servidor para gestionar flujos o credenciales en n8n.

---

## 5. Recuperacion ante Desastres (Disaster Recovery)

Para re-desplegar la infraestructura completa en un nuevo servidor:

    mkdir -p /opt/margenx-infra/data/{postgres,n8n}
    chown -R 1000:1000 /opt/margenx-infra/data/n8n
    cp docker-compose.prod.yml /opt/margenx-infra/docker-compose.yml
    cp .env.example /opt/margenx-infra/.env # Configurar variables
    docker compose up -d