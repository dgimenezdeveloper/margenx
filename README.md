# 📊 MargenX — Control de Márgenes en Tiempo Real

> Sistema web multiempresa para comercios gastronómicos y producción artesanal. Permite calcular el margen de ganancia real por producto ante la variación de costos de insumos, con recálculo en cascada y alertas automáticas vía n8n.

---

## 🚀 Propuesta de Valor & MVP
Los comercios fijan precios de venta en base a costos iniciales que rara vez actualizan. MargenX resuelve esto permitiendo:
1. **ABM de Insumos y Recetas:** Carga ágil de costos unitarios y composición de productos.
2. **Recálculo en Cascada:** Al actualizar el costo de un insumo, el sistema recalcula en tiempo real el margen y costo de todos los productos asociados.
3. **Semáforo de Rentabilidad:** Visualización clara de productos que caen por debajo del margen mínimo esperado.
4. **Automatización (n8n):** Alertas por email ante márgenes críticos y reportes periódicos de rentabilidad.
5. **Control de Acceso (RBAC):** Rol Administrador (visión total) y Rol Colaborador (actualización de costos sin acceso a márgenes ni precios).

---

## 🛠️ Stack Tecnológico

* **Frontend:** React + TypeScript, Vite, Tailwind CSS, Recharts, Zustand.
* **Backend:** Node.js, Express, TypeScript, Prisma ORM.
* **Base de Datos:** PostgreSQL (Dockerizado).
* **Autenticación:** Supabase Auth / Clerk (Control de roles).
* **Automatización:** n8n (Self-hosted vía Webhooks).
* **Testing:** Playwright (E2E) & Vitest/Jest (Unit testing).
* **Infraestructura:**
  * *Entorno Local:* Docker + VS Code DevContainers.
  * *Producción:* Microsoft Azure (App Service) + VPS Propia (PostgreSQL + n8n).
  * *CI/CD:* GitHub Actions.

---

## 📦 Entorno de Desarrollo (DevContainers)

Este proyecto está 100% dockerizado para garantizar que todo el equipo trabaje en el mismo entorno.

### Requisitos previos:
* [Docker Desktop](https://www.docker.com/) instalado y corriendo.
* [VS Code](https://code.visualstudio.com/) con la extensión **Dev Containers** (`ms-vscode-remote.remote-containers`).

### Cómo iniciar:
1. Clonar el repositorio:
   ```bash
   git clone https://github.com/dgimenezdeveloper/margenx.git