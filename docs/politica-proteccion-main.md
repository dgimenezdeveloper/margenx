# Política de Protección de la Rama Main

Este documento describe la configuración de seguridad, validación automática y gobernanza de despliegue aplicada sobre la rama `main` en GitHub.

---

## 1. Reglas de Protección Activas (Ruleset)

Para evitar despliegues accidentales o código defectuoso en producción, la rama `main` cuenta con las siguientes restricciones obligatorias:

1. **Pull Request Obligatorio:** Ningún usuario (incluidos administradores) puede realizar push directo a `main`. Todo cambio debe ingresar vía Pull Request desde `develop`.
2. **Bloqueo de Force Push y Deletion:** Protección contra sobreescritura del historial (`git push --force`) y eliminación accidental de la rama.
3. **Status Checks Requeridos (CI Verde):** El botón de merge permanece bloqueado hasta que los siguientes jobs de GitHub Actions finalicen en estado exitoso (Passed):
   - `Backend Lint & Typecheck` (Compilación TypeScript del backend).
   - `Frontend Lint & Build` (Linter y compilación de producción con Vite).
4. **Aprobación de Code Review Requerida:** Mínimo una aprobación formal de par y aprobación de QA.

---

## 2. Flujo y Método de Fusión para Liberación a Producción (Release)

1. Las funcionalidades y correcciones se integran diariamente en `develop` utilizando **Squash and Merge**.
2. Al finalizar un Sprint o ciclo de incremento, se abre el PR de Release formal: `develop` -> `main`.
3. El pipeline de CI ejecuta la suite completa de pruebas unitarias y validaciones de compilación.
4. **Método de Merge Obligatorio para Release:** Se debe seleccionar exclusivamente **"Create a merge commit"** (NO usar Squash and Merge ni Rebase). Esto preserva el árbol de commits de `develop` y garantiza que ambas ramas conserven paridad histórica en Git.
5. El merge exitoso en `main` dispara automáticamente el pipeline `deploy.yml`, desplegando la nueva versión inmutable en el stack productivo de la VPS Donweb (`margenx.tech`).