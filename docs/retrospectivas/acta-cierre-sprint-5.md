# Acta de Cierre de Sprint y Retrospectiva — Sprint 5 (Proveedores, PWA instalable y operación en producción)

**Proyecto:** MargenX — Control de Márgenes en Tiempo Real
**Materia:** Prácticas Profesionales Supervisadas (PPS) / Metodologías Ágiles
**Período del sprint:** 25/10/2026 al 07/11/2026
**Fecha de sesión:** 07/11/2026
**Hora:** 17:36 hs
**Facilitador / Scrum Master:** Darío Giménez (continúa en el Sprint 6, sin rotación: ver el acta del Sprint 4, §5)
**Participantes:** Darío Giménez (Scrum Master y DevOps), Federico Paal (Lead Frontend), Mauricio Barreras (Lead Backend), Leandro Herrera (QA y enlace con los comercios piloto)

---

## 1. Incremento logrado

El Sprint 5 se dedicó a la deuda técnica señalada en la devolución de la Entrega 5 y a dejar MargenX usable en el celular por los comercios piloto:

1. **Proveedores completos:** lista, alta, detalle con presentaciones mayoristas, código de artículo, dirección de ingesta para copiar y cuarentena integrada en la misma pantalla.
2. **App instalable:** PWA con service worker, página sin conexión y sesión persistente en el modo instalado.
3. **Integridad y calidad:** nombres únicos sin distinguir mayúsculas en la base, recálculo en cascada en lote, límites de carga con `413`, cobertura de pruebas del 90 % en backend y frontend, y Node 22 LTS en todo el CI.
4. **Operación en producción:** backup diario con ensayo de restauración, endurecimiento de la VPS y de Nginx, cuenta Demo en producción, ingesta automática separada por entorno y release v0.6.0 publicado con copia previa, ensayo de migraciones y vuelta atrás preparada.

## 2. Métricas

| Métrica | Valor |
|---|---|
| Issues del sprint | 46 (4 incorporadas durante el sprint: `#276`, `#305`, `#310` y `#322`) |
| Story Points comprometidos | 140 |
| Story Points completados | 137 al momento de la sesión; los 3 restantes son de `#273` (esta acta), que se completa con su PR |
| PRs mergeados a `develop` | 52 desde v0.5.0 (incluye 7 de Dependabot) |
| Commits del período | 60 sin contar merges ([v0.5.0...v0.6.0](https://github.com/dgimenezdeveloper/margenx/compare/v0.5.0...v0.6.0)) |
| Defectos graves abiertos al cierre | 0 (`docs/qa/reporte-calidad-sprint5.md` §3.7) |
| Release | [v0.6.0](https://github.com/dgimenezdeveloper/margenx/releases/tag/v0.6.0), merge commit `0f43a99` en `main` (PR #346) |

## 3. Hitos por rol

El detalle por issue, con su PR y su commit, está en `docs/entregables/entrega-pps-sprint-5.md` §2.

### A. DevOps, infraestructura y Scrum Master (Darío Giménez)
- Infraestructura y CI: quick wins (`#233`), Node 22 LTS y CI completo (`#260`), Dependabot (`#305`), cobertura del frontend (`#276`) y del backend por encima del 90 % (`#277`).
- Producción: instancia de Clerk de producción (`#238`), backup diario y ensayo de restauración (`#239`), cuenta Demo en producción (`#240`), ingesta automática por entorno (`#253`), Nginx (`#261`), endurecimiento de la VPS (`#266`) y release v0.6.0 (`#271`).
- Frontend: sesión persistente (`#241`), PWA (`#243`, con Federico Paal), service worker (`#248`), vista de proveedores (`#249`) y cuarentena integrada (`#251`).
- Documentación: ADR-005 (`#234`), documento de diseño e históricos (`#269`), formato de revisión de PRs (`#274`) y este cierre (`#273`).

### B. Backend y arquitectura de datos (Mauricio Barreras)
- Integridad de datos en la base (`#242`), código de artículo en las presentaciones (`#245`), presentaciones y detalle de proveedor (`#246`), carga masiva de insumos (`#247`), límites de cuerpo y `helmet` (`#256`) y recálculo en cascada en lote (`#259`).
- Frontend: receta oculta para el colaborador (`#258`) y accesibilidad de formularios (`#263`).
- Documentación: runbook y manual de usuario (`#272`).

### C. Frontend (Federico Paal)
- Entrada numérica es-AR (`#235`), guards y rutas (`#236`), empaques sin pisar el predeterminado (`#237`), PWA (`#243`), detalle de proveedor (`#250`), carga desde planilla (`#252`), errores con reintento (`#257`), diálogos accesibles (`#262`) y ajustes de feedback de la Entrega 5 (`#322`).

### D. QA y enlace con los comercios piloto (Leandro Herrera)
- Recorrido por rol en dispositivos reales (`#255`), colecciones Postman al contrato vigente (`#264`), cosecha de comentarios no bloqueantes (`#265`), limpieza de specs E2E (`#310`) y regresión con matriz de defectos (`#270`).
- Frontend y documentación: privacidad y guía de instalación (`#244`), convención de docs como código (`#267`) y READMEs sin datos sensibles (`#268`).

## 4. Retrospectiva (Start / Stop / Continue)

**Sesión:** 21/11/2026, en la clase presencial, con los cuatro integrantes. Se hace fuera de término: el recorte previsto en `#273` la dejó para el Planning del Sprint 6 y no se hizo ahí (ver "Dejar de hacer", punto 4). El borrador lo preparó el Scrum Master con la evidencia del repositorio; queda pendiente de validación del equipo en la clase del 21/11.

### Cumplimiento de los compromisos del Sprint 4 (acta del Sprint 4, §4)

| Compromiso | Resultado en el Sprint 5 |
|---|---|
| Backups diarios y ensayo de restauración | Cumplido (`#239`) |
| Separar las instancias de Clerk | Cumplido (`#238`). La rotación de credenciales queda para el cierre de la cursada, como estaba previsto |
| Colecciones de Postman al contrato vigente | Cumplido (`#264`). En la regresión corrieron 3 de 6 colecciones (`#270`, ver "Dejar de hacer", punto 3) |
| Sugerencias de las revisiones en issues `review-followup` | Cumplido (`#265` → `#311` a `#314`) |
| Pendientes del release v0.5.0 | Cumplido (`#240`, `#268`) |
| Smart Purchasing (RF-15) | **No cumplido**: pasó al Sprint 6 |
| Reporte semanal en PDF | **No cumplido**: pasó al Sprint 6 |
| Lighthouse > 90 | **No cumplido**: pasó al Sprint 6 y después al 7 |

### 🟢 Continuar

1. **Revisión de PRs con formato normalizado** (`#274`, `/revisar-pr`), con hallazgos B, I y M y la cosecha de sugerencias como issues. El sprint cerró con 0 defectos graves abiertos (`docs/qa/reporte-calidad-sprint5.md` §3.7).
2. **Pruebas por rol en dispositivos reales** (`#255`): aparecieron 3 defectos menores que las pruebas automáticas no mostraban: el `%` duplicado en Perfil, la terminología del estado de margen y las capturas faltantes en `/instalar`. Los tres se corrigieron en el Sprint 6 (`#356`, `#358` y `#365`).
3. **Operar producción con red de seguridad:** backup diario con restauración ensayada (`#239`) y el primer release con copia previa, ensayo de migraciones y vuelta atrás preparada (`#271`).
4. **Cobertura del 90 %** en backend y frontend (`#276`, `#277`). El CI la exige en el frontend (job `Frontend Unit Tests`); en el backend se mide con `npm run test:coverage` y se adjunta en el PR (`docs/process/revision-de-prs.md` §5).

### 🔴 Dejar de hacer

1. **Volver a postergar el core.** Smart Purchasing, el reporte PDF y Lighthouse estaban comprometidos en el acta del Sprint 4 y se postergaron por segunda vez. La deuda de la Entrega 5 y la PWA ocuparon el sprint, y el Planning del 25/10 no reservó capacidad para el core.
2. **Títulos de PR fuera de Conventional Commits:** 24 de los 44 PRs mergeados a `develop` en el sprint, sin contar Dependabot (por ejemplo, `pwa instalable`, `250 sprint5 fe 09 detalle de proveedor` y `Título: ci(devops): …`). Además hubo un merge a `develop` sin PR (`Merge 238-sprint5-devops-02-clerk-de-produccion into develop`) y un commit `fix:ci`. Fuente: `git log --first-parent` sobre `develop` del 25/10 al 07/11.
3. **Depender de una sola instancia de Clerk para QA:** no tenía los usuarios de Química GyJ y dejó 3 de 6 colecciones sin correr en la regresión (`docs/qa/reporte-calidad-sprint5.md` §3.4 y §3.7).
4. **Recortar la retrospectiva al cierre:** quedó pendiente dos semanas y perdió inmediatez.

### 🟡 Empezar

| Acción | Responsable | Cómo se mide | Seguimiento en el Sprint 6 |
|---|---|---|---|
| Planificar primero el core y después la deuda | Darío Giménez (SM) | El core del sprint cierra dentro del sprint | Cumplido: compras (`#388`, `#389`), reporte PDF (`#390`, `#391`, `#392`) e invitaciones (`#395`) |
| Título de PR en Conventional Commits, corregido antes de mergear: el squash usa el título | Cada autor de PR; el revisor lo marca | PRs fuera de la convención por sprint | Mejoró: de 24 de 44 a 7 de 35 |
| Crear en Clerk de QA los usuarios de Química GyJ | Leandro Herrera | Todas las colecciones de `backend/tests/postman/` corridas en la regresión | Pasa como precondición de la regresión final (`#399`) |
| Repartir mejor la carga: horas del Sprint 5 de 68 / 44 / 42 / 27 h (Darío, Leandro, Mauricio y Federico, `docs/entregables/entrega-pps-sprint-5.md` §6) | Darío Giménez (SM) | Core asignado a los cuatro roles | En el Sprint 6 el core se repartió entre los cuatro (pantalla de compras: Federico; APIs de compras y reporte: Mauricio; workflow del reporte e invitaciones: Darío; QA en dispositivos: Leandro) |
| Probar la usabilidad con un catálogo grande antes de cerrar funcionalidades | Leandro Herrera | Recorrido con el seed de volumen | Cumplido del 06 al 10/11 (seed `f0f16c8`): salieron las issues `#350` a `#364` |

## 5. Lo que pasa al Sprint 6

| Issue | Motivo |
|---|---|
| `#254` Rediseño del mail de resumen de ingesta | Desborde previsto desde el Sprint 5: depende de la ingesta automática (`#253`), que cerró al final del sprint. |
| `#328` Vencimiento de sesión de Clerk en staging | Seguimiento de la revisión del PR #326: monitorear en staging la sesión de Clerk después de la actualización a 3.26.4. |
| `#329` Enlace de respaldo del mail de alerta | Hallado durante `#241`; sin estimar en el tablero. |
| `#307`, `#311` a `#314` | Seguimientos de revisiones (`review-followup`). |
| Colecciones Postman de Insumos, Productos y Proveedores | No se pudieron correr en la regresión por la instancia de Clerk de Química GyJ (`docs/qa/reporte-calidad-sprint5.md` §3.7). |

Además, del release v0.6.0 surgieron correcciones para `docs/runbook-release.md` y `docs/politica-proteccion-main.md`, registradas en el comentario de cierre de `#271`, que se cargan como issue en el Planning.

Smart Purchasing (RF-15), el reporte semanal en PDF y la meta de Lighthouse por encima de 90 se replanificaron al Sprint 6 en el Planning del 25/10; la moneda y la cotización ARS/USD, a la fase 2.

## 6. Traspaso al Sprint 6

Darío Giménez sigue como Scrum Master hasta la entrega final (acta del Sprint 4, §5).

- [ ] **Tablero limpio:** 45 de 46 issues del Sprint 5 en `Done`; `#273` pasa a `Done` al mergear su PR.
- [x] **Release v0.6.0 publicado:** etiqueta anotada sobre el merge commit `0f43a99`, [Release](https://github.com/dgimenezdeveloper/margenx/releases/tag/v0.6.0), despliegue verificado en producción y vuelta atrás preparada (comentarios de `#271`).
- [x] **Ambientes operativos:** `https://margenx.tech` y `https://dev.margenx.tech` con healthcheck en HTTP 200 el 07/11.
- [ ] **Backlog del Sprint 6 refinado:** hoy solo `#254` y `#328` tienen el Sprint 6 asignado en el tablero; el resto se planifica en el Planning.
