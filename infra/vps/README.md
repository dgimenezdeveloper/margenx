# Infraestructura VPS - MargenX (Produccion, Staging y Automatizacion)

Este directorio contiene la definicion formal y reproducible de la infraestructura alojada en la VPS, bajo el modelo **100% VPS consolidado** (ver ADR-002 actualizado), reemplazando la arquitectura hibrida Azure + VPS evaluada inicialmente.

---

## 1. Vision General de la Arquitectura

    +--------------------------------------------------------------------+
    |                 VPS PRIVADA (<VPS_IP>)                           |
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
| **Ubicación** | Contenedor local de cada integrante | VPS (`<VPS_IP>`) | VPS (`<VPS_IP>`) |
| **Contenedor** | `postgres:16-alpine` (local) | `margenx_postgres_prod` (compartido) | `margenx_postgres_prod` (compartido) |
| **Base de datos** | `margenx_dev` (local) | `margenx_dev` (en VPS) | `margenx_prod` |
| **Uso principal** | Desarrollo diario individual, creación de migraciones (`npx prisma migrate dev`) | Validación de integración antes de producción, demos intermedias | Datos reales de comercios piloto y entrega final |

---

## 3. Acceso a la Base de Datos (DBeaver / TablePlus / Clientes SQL)

El contenedor de PostgreSQL publica su puerto solo en la interfaz de loopback del host (`127.0.0.1`, ver `docker-compose.prod.yml`). No es accesible desde internet: los backends lo usan por la red interna de Docker y, para inspección de datos desde clientes SQL, se accede mediante un túnel SSH hacia el loopback del servidor.

### Parámetros de Conexión (vía túnel SSH):
* **Host:** `127.0.0.1` (extremo local del túnel SSH)
* **Puerto:** `<DB_PORT>` (puerto local del túnel; el puerto publicado en el host se define en `docker-compose.prod.yml`)
* **Base de datos:** `margenx_dev` (Staging) o `margenx_prod` (Producción)
* **Usuario:** `<DB_USER>` (ver `POSTGRES_USER` en el canal seguro del equipo)
* **Contraseña:** *(Ver variable `POSTGRES_PASSWORD` en el canal seguro del equipo)*

> 🔒 **Aislamiento y Seguridad:** Las credenciales de la base corresponden exclusivamente al motor PostgreSQL dentro del contenedor. No otorgan permisos de administración, acceso a terminal ni lectura de archivos del sistema operativo de la VPS.

### Monitoreo de memoria (`scripts/monitor-memory.sh`)

El script de alertas a Discord muestra el host del servidor en el embed a partir de la variable de entorno opcional `VPS_HOST` (por ejemplo, definida en el crontab que lo invoca). Si no está definida, el campo muestra `N/D`. El valor real no se versiona en el repositorio.

### Aplicar Migraciones de Prisma manualmente (Lead Backend, caso excepcional)
En condiciones normales, el pipeline de CI/CD aplica las migraciones automáticamente en cada deploy. Si el Lead Backend necesita correrlas manualmente desde su máquina local:

```bash
DATABASE_URL='postgresql://<DB_USER>:<DB_PASSWORD>@<VPS_HOST>:<DB_PORT>/margenx_prod?schema=public' npx prisma migrate deploy
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

---

## 7. Verificación Perimetral y SSL de Producción (margenx.tech y api.margenx.tech)

Para asegurar la disponibilidad de la Demo de Producción del Sprint 2, se verifican la configuración de Nginx y los certificados SSL emitidos por Let's Encrypt:

### Puertos Internos de Producción
* **Frontend Prod:** `127.0.0.1:3010`
* **Backend Prod:** `127.0.0.1:3011`

### Verificación de Certificados Let's Encrypt
```bash
# Listar certificados instalados y vigencia
sudo certbot certificates

# Simular proceso de renovación automática
sudo certbot renew --dry-run
```

### Verificación de Sintaxis y Recarga de Nginx
```bash
# Comprobar sintaxis
sudo nginx -t

# Recargar configuración sin caída de servicio
sudo systemctl reload nginx
```

### Smoke Test de Conectividad HTTPS (TLS 1.2 / TLS 1.3)
```bash
# Frontend Producción
curl -I https://margenx.tech

# Backend Producción Healthcheck
curl -I https://api.margenx.tech/api/health
```

---

## 8. Compresión gzip en el Nginx del host

Hasta el 26/10/2026, `margenx.tech` servía el JS (808 KB) y el CSS (81 KB) **sin comprimir**, aunque el navegador pidiera gzip. Había dos causas:

1. En `/etc/nginx/nginx.conf` del host solo estaba `gzip on`, con `gzip_types`, `gzip_vary` y `gzip_comp_level` comentados, así que solo se comprimía HTML.
2. Nginx habla con los contenedores en HTTP/1.0 por defecto. El `gzip on` de `frontend/nginx.conf` no comprime respuestas a HTTP/1.0 (`gzip_http_version` vale `1.1` por defecto), por eso cada bloque `location` de MargenX necesita `proxy_http_version 1.1` (ver `nginx/margenx-prod.conf.example` y `nginx/margenx-dev.conf.example`).

### Bloque a activar en `/etc/nginx/nginx.conf` (contexto `http`)

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml image/svg+xml;
```

`text/html` no se lista porque Nginx siempre lo comprime cuando `gzip` está activo. El archivo es compartido con otros sitios de la VPS: el cambio también los afecta.

### Cómo aplicarlo sin cortar el servicio

```bash
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak-$(date +%Y%m%d)
sudoedit /etc/nginx/nginx.conf          # descomentar o agregar el bloque de arriba
sudoedit /etc/nginx/sites-available/<archivo-de-margenx>   # proxy_http_version 1.1 en cada location
sudo nginx -t && sudo systemctl reload nginx
```

### Verificación

```bash
# Debe responder content-encoding: gzip
curl -sI -H 'Accept-Encoding: gzip' https://margenx.tech/assets/<archivo>.js | grep -i content-encoding
curl -sI -H 'Accept-Encoding: gzip' https://margenx.tech/assets/<archivo>.css | grep -i content-encoding

# Comparar el peso transferido con y sin compresión
curl -s https://margenx.tech/assets/<archivo>.js | wc -c
curl -s -H 'Accept-Encoding: gzip' https://margenx.tech/assets/<archivo>.js | wc -c
```

Confirmar además que los otros sitios de la VPS siguen respondiendo.

### Cómo revertirlo

```bash
sudo cp /etc/nginx/nginx.conf.bak-<fecha> /etc/nginx/nginx.conf
sudo nginx -t && sudo systemctl reload nginx
```

Si solo hay que quitar `proxy_http_version 1.1`, borrar esa línea de cada `location`, volver a correr `sudo nginx -t` y recargar.

---

## 9. Acceso SSH y hallazgos fuera de alcance

Estado al 28/10/2026, después del endurecimiento de la issue #266. Alcance: solo el acceso por SSH y los puertos de MargenX. Los servicios de los otros proyectos de la VPS se registran como hallazgos, sin modificarlos.

### Configuración aplicada

Los cambios están en un archivo propio, `/etc/ssh/sshd_config.d/00-margenx-hardening.conf`. `sshd` usa el **primer** valor que lee para cada opción, y el `Include` de `sshd_config.d/*.conf` está al principio de `/etc/ssh/sshd_config`. Por eso el prefijo `00-` hace que estas líneas ganen sobre `custom.conf` (que trae `PermitRootLogin yes`) y sobre el `X11Forwarding yes` del archivo principal.

```text
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
AllowAgentForwarding no
X11Forwarding no
```

Rige para los dos puertos (22 y 5371). Se mantienen activos:

- `AllowTcpForwarding yes`: lo necesitan los túneles `ssh -L` hacia la base (sección 3).
- `80-step.conf` (`TrustedUserCAKeys` y `AuthorizedPrincipalsFile`): es el acceso por certificado del soporte de Donweb. Sigue funcionando porque es autenticación por clave.

El puerto 22 escucha en la VPS, pero no responde desde internet (lo filtra el perímetro del proveedor). El acceso externo y el deploy de CI usan el 5371.

### Cómo aplicar o repetir el cambio sin quedar afuera

```bash
# 1. Dejar abierta una segunda sesión SSH durante todo el procedimiento.
# 2. Copia previa
TS=$(date +%Y%m%d-%H%M%S)
cp -a /etc/ssh /root/backup-etc-ssh-$TS
cp -p /root/.ssh/authorized_keys /root/.ssh/authorized_keys.$TS
# 3. Crear o editar /etc/ssh/sshd_config.d/00-margenx-hardening.conf
# 4. Validar y ver la configuración efectiva
sshd -t
sshd -T | grep -E '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication|allowagentforwarding|x11forwarding) '
# 5. Recargar (no reinicia las sesiones abiertas)
systemctl reload ssh
```

### Verificación

```bash
# Con clave: debe entrar por los dos puertos (el 22 se prueba con salto por el 5371)
ssh -p 5371 root@<VPS_HOST> 'echo ok'
ssh -J root@<VPS_HOST>:5371 -p 22 root@127.0.0.1 'echo ok'

# Con contraseña: debe responder "Permission denied (publickey)", sin ofrecer password
ssh -v -p 5371 -o PubkeyAuthentication=no -o PreferredAuthentications=password root@<VPS_HOST> true 2>&1 | grep -E 'can continue|denied'
```

Resultado del 28/10/2026: antes del cambio ambos puertos ofrecían `publickey,password`; después, solo `publickey`. La clave del equipo entra por los dos.

### Cómo revertirlo

```bash
rm /etc/ssh/sshd_config.d/00-margenx-hardening.conf
sshd -t && systemctl reload ssh
# Para volver a la configuración anterior completa: restaurar /root/backup-etc-ssh-<fecha>
```

Si nadie puede entrar por SSH, se accede por la consola del panel de Donweb.

### Dueños de las claves de `authorized_keys`

`/root/.ssh/authorized_keys`, después de la revisión:

| Clave (comentario) | Dueño | Uso |
|---|---|---|
| Bloques `## DonWeb - ...` (47 claves RSA) | Personal de soporte de Donweb, agrupado por área (CS, ITI, NOC, Soporte L2, Cloud IaaS, etc.) | Soporte del proveedor. Donweb administra este bloque y lo actualiza (hay copias fechadas en `/root/.ssh/`). No se toca. |
| `dgimenez.developer@...` (dos claves ed25519) | Darío (DevOps) | Acceso administrativo. |
| `github-actions-margenx` | GitHub Actions de MargenX | Deploy (`.github/workflows/deploy.yml`). |
| `github-actions-ignisec` | CI del proyecto IgniSec | Deploy de otro proyecto. También está en `/home/deploy/.ssh/authorized_keys`. No se toca. |

Se quitaron el 28/10/2026, con copia en `authorized_keys.20261028-132854`:

- `tu_email@dominio.com`: clave RSA con comentario de plantilla y sin dueño identificado; no aparece en ningún ingreso de los logs.
- `allmart-cicd-deploy`: CI del proyecto Allmart, que se da de baja.

El usuario `deploy` tiene la contraseña bloqueada y solo la clave de IgniSec.

### Puertos de MargenX

`docker ps` del 28/10/2026: todos los contenedores de MargenX publican solo en `127.0.0.1` (frontend 3010/3020, backend 3011/3021, Postgres 5435, n8n 5678). Ninguno está en `0.0.0.0`. Para repetir el control:

```bash
docker ps --format '{{.Names}}\t{{.Ports}}' | grep '^margenx_'
```

### Hallazgos fuera de alcance

Quedan registrados para decidirlos con los dueños de cada proyecto:

- **`ufw` inactivo** y la cadena `INPUT` de `iptables` con política `ACCEPT`. Activar `ufw` no cierra los puertos de Docker, porque Docker publica sus puertos con reglas propias que se evalúan antes. Para restringirlos hay que publicar en `127.0.0.1` en cada `docker-compose` o usar la cadena `DOCKER-USER`.
- **Puertos de otros proyectos publicados en `0.0.0.0`:** el 8080 de otro proyecto. El 28/10/2026 se cerraron (pasaron a `127.0.0.1` o se dieron de baja) los que antes estaban expuestos: 3002, 4000, 4173, 8082 y las bases PostgreSQL en 5433 y 5434.
- **Postfix escuchando en el puerto 25** en todas las interfaces (cola vacía y sin envíos registrados).

Puertos públicos al 28/10/2026: 22 y 5371 (SSH), 25 (Postfix), 80 y 443 (Nginx) y 8080.

Nginx tiene un sitio por defecto (`000-default-reject`) que responde `444` a los dominios sin `server_name` propio. Sin él, un dominio dado de baja que todavía apunte a la VPS recibe el primer sitio HTTPS que encuentre Nginx, que es el de otro proyecto.
