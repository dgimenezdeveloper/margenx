### Resumen de Cambios
<!-- Describa brevemente el problema que resuelve este Pull Request y la solucion tecnica implementada. -->

### Issue Vinculada
<!-- Referencie el numero de la issue que este PR resuelve. Ej: Closes #12 -->
<!-- PR de release (develop -> main): use "Refs #N" por cada issue incluida, una por linea, en vez de "Closes #N" (ya estan cerradas desde que se mergearon a develop). Ver CONTRIBUTING.md seccion 3. -->
Closes #

### Tipo de Cambio
<!-- Marque con una [x] las opciones que apliquen a este PR -->
- [ ] Bug fix (correccion de un error)
- [ ] New feature (nueva funcionalidad)
- [ ] Refactor (mejora de codigo sin anadir funcionalidad)
- [ ] Chore (actualizacion de dependencias, configuracion, infraestructura)
- [ ] Docs (cambios en la documentacion)

### Pasos para Validar (QA / Peer Review)
<!-- Explique paso a paso como el revisor puede probar su codigo. -->
1. 
2. 
3. 

### Evidencia (Capturas de pantalla / Logs)
<!-- Si es un cambio visual (Frontend) o de consola (Backend/DevOps), adjunte una captura de pantalla o bloque de codigo que demuestre el funcionamiento. -->

### Checklist de Definition of Done (DoD)
<!-- El autor del PR debe marcar con una [x] todos los items antes de solicitar la revision. -->
- [ ] El codigo respeta el tipado estricto de TypeScript (sin uso injustificado de 'any').
- [ ] El linter y el formateador de codigo no arrojan errores ni advertencias.
- [ ] No hay sentencias 'console.log' de depuracion olvidadas en el codigo.
- [ ] El diseno es Mobile-First y se visualiza correctamente desde 360px (Solo Frontend).
- [ ] La documentación afectada por este cambio quedó actualizada en este mismo PR (CHANGELOG `[Unreleased]` y la que corresponda según la tabla de `CONTRIBUTING.md` §1). No aplica si el cambio no vuelve inexacta ninguna documentación existente.
- [ ] Se han documentado los nuevos endpoints o variables de entorno (Solo Backend/DevOps).
- [ ] Si este PR cambia el contrato de un endpoint existente, la colección de Postman que lo cubre quedó actualizada en este mismo PR (Solo Backend). No aplica si no se tocó ningún contrato.
- [ ] Si este PR corrige observaciones de una revisión anterior, cita acá el/los ID exactos (`[RV<PR>-<S><n>]`) que resuelve. No aplica si es la primera revisión de este PR.
- [ ] El pipeline de Integracion Continua (CI) se ejecuta sin errores.
- [ ] He revisado mi propio codigo antes de abrir este PR.
