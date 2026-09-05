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


## Diseño UI/UX

Para garantizar una experiencia visual clara y validar el flujo de carga de recetas antes de la programación, hemos diseñado los wireframes del MVP siguiendo un enfoque **Mobile First (360px)**.

🔗 **[Ver Prototipo Interactivo en Figma](https://www.figma.com/proto/VP7NOtPGVwSCPZex5wYpmZ/Margen-X?node-id=0-1&t=AkoTRJ9OMR8ePuRU-1)**

A continuación, se detalla la estructura y funcionalidad de cada uno de los módulos diseñados:

### 1. Login / Registro
Pantalla inicial de autenticación orientada a la conversión y fácil acceso del usuario a la plataforma.

### 2. Dashboard Principal
Vista general que presenta la tabla de productos de forma rápida y accesible desde dispositivos móviles.
* **Semáforo de rentabilidad (Criterio de Aceptación):** Implementa un sistema de *badges* visuales. Si el margen de un producto cae por debajo del margen mínimo establecido, se destaca con una alerta (rojo/naranja) que cumple con los estándares de contraste (WCAG AA).

### 3. Insumos
Módulo para la gestión de la materia prima. Incluye el listado actual y un formulario de alta ágil que mapea directamente con la base de datos, solicitando:
* Nombre del Insumo
* Unidad de medida
* Costo

### 4. Productos y Recetas
Es el núcleo de la aplicación, donde se cruza la información comercial con los costos.
* Contempla los campos clave del negocio: **Precio de Venta** y **Margen Mínimo %**.
* **Carga de Receta (Criterio de Aceptación):** Cuenta con un selector dinámico y un botón claro ("Agregar Insumo") que permite al usuario añadir múltiples filas de materias primas con sus cantidades para componer la receta final del producto.
