# 6. Sesión persistente en la app instalada (PWA standalone) y URL de retorno tras el login

* **Estado:** Aceptado
* **Fecha:** 2026-11-02
* **Decisores:** Darío Giménez (Tech Lead / DevOps)
* **Issue:** #241 (SPRINT5-FE-04)
* **Relacionado con:** ADR-001 (Clerk), `frontend/src/lib/displayMode.ts`, `frontend/src/lib/returnUrl.ts`, `frontend/src/components/protected-route.tsx`, `frontend/src/hooks/useSessionSecurity.ts`, `frontend/src/app/login/page.tsx`, `infra/n8n/workflows/alertas-margen.json`

---

## Contexto y Planteamiento del Problema

Desde el Sprint 2 el frontend agrega dos cierres de sesión propios, además de los de Clerk:

1. **Cierre por inactividad de 30 minutos** (`useSessionSecurity`), medido con la última actividad guardada en `localStorage`.
2. **Cierre al cerrar el navegador:** si no existe la marca de sesión de la pestaña (`sessionStorage`) ni la cookie de sesión del navegador, la sesión de Clerk se considera huérfana y se cierra.

En el navegador común los dos tienen sentido: protegen una computadora compartida. En la app instalada en el celular (PWA en modo standalone) rompen el uso previsto. Cerrar la app equivale a cerrar el navegador, así que cada vez que el dueño del comercio toca **"Ajustar"** en el mail de alerta de margen tiene que volver a iniciar sesión y, como Clerk lo ve como un acceso nuevo, a pasar de nuevo la verificación. Además, el login siempre llevaba a `/dashboard` y se perdía el producto al que apuntaba el enlace.

## Decisión

### 1. Detección del modo instalado
La app se considera instalada si `matchMedia('(display-mode: standalone)')` coincide o si `navigator.standalone === true` (Safari de iOS). La detección vive en `isStandaloneMode()` (`frontend/src/lib/displayMode.ts`).

### 2. En la app instalada manda solo Clerk
En modo standalone **no corren** ni el cierre por cierre de navegador ni el cierre propio por 30 minutos de inactividad. La sesión dura lo que configure la instancia de Clerk. En el **navegador común** el comportamiento no cambia: siguen los dos cierres propios.

### 3. Configuración de sesión en el Clerk de producción
Valores configurados en la instancia de producción (cuenta empresarial, issue #238):

| Parámetro | Valor |
|---|---|
| Vida máxima de la sesión | **7 días**, el máximo que permite el plan Hobby de Clerk |
| Tiempo de inactividad en Clerk | Sin límite de inactividad configurado |
| Verificación por dispositivo nuevo | *No confirmada*: revisar en el dashboard de Clerk y completar esta fila |

Consecuencia práctica: en la app instalada, la sesión se mantiene hasta 7 días desde el inicio de sesión, aunque no se use. Pasado ese plazo, Clerk pide iniciar sesión de nuevo.

### 4. URL de retorno tras el login (navegador e instalada)
Cuando una pantalla protegida pide login, el destino viaja en `/login?redirect_url=<ruta>` (`buildLoginUrl`, `frontend/src/lib/returnUrl.ts`). La página de login lo usa en `SignIn` (`forceRedirectUrl`) y en su propia navegación. El destino también se guarda en `sessionStorage` porque los pasos internos de Clerk (por ejemplo, `/login/factor-one`) no conservan la query, y se borra al llegar a una pantalla protegida.

Solo se aceptan rutas internas del mismo origen: se rechazan URLs absolutas a otro dominio, `//dominio`, `/\dominio`, esquemas como `javascript:` y el propio `/login`. Un destino rechazado vuelve a `/dashboard`. Esto evita usar el login como redirección abierta.

### Alternativas descartadas
* **Quitar los cierres propios también en el navegador:** se descartó porque deja expuesta una sesión de 7 días en computadoras compartidas del comercio.
* **Mantener el cierre de 30 minutos en la app instalada:** se descartó porque quien toca "Ajustar" al día siguiente tendría que iniciar sesión igual, y el objetivo de la issue no se cumpliría.
* **Detectar la app instalada solo por el `start_url` del manifiesto:** se descartó porque depende de cómo se abrió la app y no cubre los enlaces externos, como el del mail.

## Consecuencias y Trade-offs

* **Positivas:**
  * El enlace "Ajustar" lleva directo al producto mientras la sesión de Clerk siga viva.
  * Con la sesión vencida, después del login (y de la verificación, si Clerk la pide) se vuelve al producto.
  * En el navegador común no cambia la duración de la sesión.
* **Costos y riesgos asumidos:**
  * Un celular con la app instalada y desbloqueado da acceso al comercio durante hasta 7 días. La protección pasa a ser el bloqueo del propio celular.
  * La duración real depende del plan de Clerk: si el plan cambia, hay que revisar este ADR.
  * Si el sistema operativo abre el enlace del mail en el navegador y no en la app instalada, rigen las reglas del navegador común. Ese comportamiento depende del sistema operativo y no del código.
  * La detección necesita que la app se instale con un manifiesto `display: standalone`. El manifiesto llega con la issue de PWA instalable; mientras tanto, la app agregada al inicio en iOS ya expone `navigator.standalone`.
