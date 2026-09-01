# Politica de Proteccion de la Rama Main

Este documento describe la configuracion de seguridad y validacion automatica aplicada sobre la rama `main` en GitHub.

---

## 1. Reglas de Proteccion Activas (Ruleset)

Para evitar despliegues accidentales o codigo defectuoso en produccion, la rama `main` cuenta con las siguientes restricciones obligatorias:

1. **Pull Request Obligatorio:** Ningun usuario (incluidos administradores) puede realizar push directo a `main`. Todo cambio debe ingresar via Pull Request desde `develop`.
2. **Bloqueo de Force Push y Deletion:** Proteccion contra sobreescritura del historial (`git push --force`) y eliminacion accidental de la rama.
3. **Status Checks Requeridos (CI Verde):** El boton de merge permanece bloqueado hasta que los siguientes jobs de GitHub Actions finalicen en estado exitoso (Passed):
   - `Backend Lint & Typecheck` (Compilacion TypeScript del backend).
   - `Frontend Lint & Build` (Linter y compilacion de produccion con Vite).

---

## 2. Flujo de Liberacion a Produccion (Release)

1. Las funcionalidades se integran diariamente en `develop`.
2. Al finalizar un Sprint, se abre un PR de Release: `develop` -> `main`.
3. El pipeline de CI ejecuta las pruebas y verificaciones en el PR.
4. Una vez aprobado por el equipo y con los checks en verde, se procesa la fusion.
