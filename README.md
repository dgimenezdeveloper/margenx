# 📊 MargenX — Control de Márgenes en Tiempo Real

> Aplicación web multiempresa para comercios gastronómicos y producción artesanal. Permite calcular el margen de ganancia real por producto ante la variación de costos de insumos, con recálculo en cascada y alertas automáticas vía n8n.

---

## 🛠️ Stack Tecnológico

* **Frontend:** React + TypeScript, Vite, Tailwind CSS, Recharts, Zustand.
* **Backend:** Node.js, Express, TypeScript, Prisma ORM.
* **Base de Datos:** PostgreSQL 16 (Dockerizado local y en VPS).
* **Autenticación:** Supabase Auth / Clerk con control de roles (Admin / Colaborador).
* **Automatización:** n8n (Self-hosted vía Webhooks).
* **Testing:** Playwright (E2E) & Vitest (Unit tests).
* **Infraestructura:**
  * *Entorno Local:* Docker + VS Code DevContainers.
  * *Producción:* Microsoft Azure (App Service) + VPS Propia (PostgreSQL + n8n).
  * *CI/CD:* GitHub Actions.

---

## 💻 Guía de Inicio Rápido (Windows + VS Code DevContainers)

El proyecto está 100% dockerizado. **No necesitás instalar Node.js, TypeScript ni PostgreSQL en tu computadora de Windows.** Todo corre dentro de un contenedor aislado con las versiones exactas.

### 1. Requisitos Previos en Windows (Se hace una sola vez)

1. **Instalar Docker Desktop para Windows:**
   * Descargar de [docker.com](https://www.docker.com/products/docker-desktop/).
   * Asegurarse de tener habilitado el motor **WSL 2** durante la instalación.
   * Abrir Docker Desktop y verificar que esté en verde (**Engine running**).
2. **Instalar VS Code:**
   * Descargar de [code.visualstudio.com](https://code.visualstudio.com/).
3. **Instalar la extensión oficial en VS Code:**
   * Abrir VS Code, ir a Extensiones (`Ctrl + Shift + X`) y buscar:
   * **Dev Containers** (Identificador: `ms-vscode-remote.remote-containers`).

---

### 2. Cómo levantar el proyecto

1. **Clonar el repositorio desde la terminal (Git Bash o PowerShell):**
   ```bash
   git clone https://github.com/dgimenezdeveloper/margenx.git
   cd margenx