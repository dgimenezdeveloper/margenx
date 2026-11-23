# Evidencia de #398: Lighthouse a 360 px

Reportes HTML de Lighthouse 13.6.0: modo móvil, 360 × 640 px, 4G lenta y CPU 4× simuladas. La excepción son las 4 páginas públicas de `antes-staging/`, medidas con la emulación por defecto de Lighthouse (412 × 823 px; la red y el CPU son los mismos). Se abren en cualquier navegador. Los resultados y los desvíos están en [`reporte-calidad-sprint7.md` §3](../../reporte-calidad-sprint7.md#3-lighthouse-a-360-px-issue-398).

Para bajar su peso, los reportes no incluyen las capturas embebidas. El identificador del navegador de desarrollo de Clerk (`dvb_…`) está reemplazado por `[REDACTADO]`.

| Carpeta | Qué es |
|---|---|
| `antes-staging/` | `dev.margenx.tech` el 23/11/2026 (`develop` en `cfae5fe`). Las páginas con sesión son del administrador de la cuenta Demo. Las públicas (`publica-*.html`) son a 412 × 823 px; las de sesión, a 360 × 640 px. |
| `despues-local/` | Build de la rama de #398 servido con `vite preview`. Las páginas públicas son la corrida representativa de LHCI (mediana de 3); las páginas con sesión, contra el backend local con la cuenta Demo. |

Archivos: `publica-<página>.html` (`/`, `/login`, `/instalar` y `/privacidad`) y `sesion-<página>.html` (`/dashboard`, `/insumos`, `/productos`, `/productos/:id`, `/proveedores` y `/compras`).
