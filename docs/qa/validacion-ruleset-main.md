# Validación del Ruleset de la rama main
## Objetivo

Validar que el Ruleset de `main` impida realizar el merge cuando un check obligatorio falla.

## Procedimiento de QA

- Se incorpora temporalmente un error de TypeScript.
- Se verifica que el check `Backend Lint & Typecheck` falle.
- Se comprueba que GitHub bloquee el merge.
- Luego se eliminará el error para comprobar que el CI en verde habilite el merge.
