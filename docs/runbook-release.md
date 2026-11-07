# Runbook — Publicar una versión en producción (release)

**Proyecto:** MargenX (VPS: staging `dev.margenx.tech` y producción `margenx.tech`)
**Última actualización:** 7 de noviembre de 2026 (primera aplicación: v0.6.0)
**Responsable:** DevOps

Cómo pasar `develop` a `main` sin perder datos y con una vuelta atrás ensayada. Cada release sigue estos pasos en orden. Los resultados de cada paso se dejan como comentario en la issue del release, sin credenciales, IP de la VPS ni datos personales (el repositorio es público).

Reglas que gobiernan este runbook:

- Método de merge a `main`: **"Create a merge commit"**, nunca squash ni rebase (`docs/politica-proteccion-main.md` §2.4, `CONTRIBUTING.md` §4).
- El merge a `main` despliega solo: `.github/workflows/deploy.yml` construye las imágenes `:latest`, corre `prisma migrate deploy` contra `margenx_prod` y reinicia `backend-prod` y `frontend-prod`. La etiqueta no despliega nada.
- Producción solo usa la etiqueta `:latest` de Docker Hub. La imagen anterior se pierde en el primer `docker compose pull` salvo que se conserve antes (§2.2, paso 2).

---

## 1. Antes de empezar

En los comandos, `VERSION` es la versión nueva y `ANTERIOR` la última publicada:

```bash
VERSION=0.6.0
ANTERIOR=0.5.0
SPRINT=5
```

Requisitos:

- Acceso SSH por clave a la VPS con un alias en `~/.ssh/config` (en este runbook, `vps-donweb`, igual que `docs/runbook-operacion.md`).
- `gh` autenticado con permiso para crear PRs, etiquetas y Releases.
- El CHANGELOG ya cortado en `develop`: `[Unreleased]` vacío y la sección `[VERSION] - fecha` con lo que se publica. El corte va en el PR de preparación del release, hacia `develop`, antes de abrir el PR a `main` (`docs/manual-scrum-master.md` §4, fase 3). Si el release se corre a otro día, se corrige la fecha en un PR a `develop` antes del paso 3.1.

## 2. Lista de verificación previa

### 2.1. En el repositorio (máquina local)

1. **Congelar `develop`.** Avisar en Discord que no se mergea nada a `develop` hasta terminar el release. Lo que entre después del paso 3.1 viaja en este release sin estar en sus notas.
2. **CHANGELOG cortado.** Debe imprimir solo el encabezado de `[Unreleased]`, sin entradas:
   ```bash
   git fetch origin --tags
   git show origin/develop:CHANGELOG.md | sed -n "/^## \[Unreleased\]/,/^## \[$VERSION\]/p"
   ```
3. **CI y despliegue de `develop` en verde sobre el último commit.** La imagen `:dev` que usa el ensayo del §2.2 sale de ese despliegue:
   ```bash
   timeout 30 gh run list --branch develop --limit 4 --json workflowName,headSha,conclusion
   git rev-parse origin/develop   # igual al headSha de "Continuous Integration (CI)" y de "CD Pipeline to VPS (Docker Hub)", los dos "success"
   curl -sS -o /dev/null -w '%{http_code}\n' https://api-dev.margenx.tech/api/health   # 200
   ```
4. **Recomendación de QA sin defectos graves abiertos** en el reporte de calidad del sprint (`docs/qa/reporte-calidad-sprint<N>.md`).
5. **Sin conflictos entre `main` y `develop`:**
   ```bash
   git merge-tree --write-tree origin/main origin/develop >/dev/null && echo "sin conflictos"
   ```
6. **Migraciones nuevas y qué hacen.** Listarlas y buscar sentencias que borren datos:
   ```bash
   git diff --name-only --diff-filter=A "v$ANTERIOR" origin/develop -- backend/prisma/migrations
   git diff "v$ANTERIOR" origin/develop -- backend/prisma/migrations | grep -nE '^\+.*(DROP|DELETE|TRUNCATE)' || echo "sin DROP/DELETE/TRUNCATE"
   ```
   Cada `DROP` se justifica en el comentario de la issue. En v0.6.0 la única migración nueva es `20261030224224_case_insensitive_unique_names`: borra los índices únicos exactos de `Product` y `Supplier` y los reemplaza por índices únicos que no distinguen mayúsculas. No borra filas, pero falla si la base tiene nombres repetidos que solo difieren en mayúsculas (por eso el paso 3 del §2.2).

### 2.2. En la VPS

El paso 1 se corre desde la máquina local. Los pasos 2 a 5 van en **una misma sesión SSH** (`ssh vps-donweb`), porque usan las variables de los anteriores: al entrar, volver a definir `VERSION` y `ANTERIOR`.

1. **Compose y variables al día.** El compose de la VPS es una copia de `infra/vps/docker-compose.prod.yml` (`infra/vps/README.md` §6). Desde la máquina local, sin imprimir valores:
   ```bash
   diff <(git show origin/develop:infra/vps/docker-compose.prod.yml) <(ssh vps-donweb cat /opt/margenx-infra/docker-compose.yml) && echo "compose igual"
   diff <(git show origin/develop:infra/vps/.env.example | grep -oE '^[A-Z_]+=' | sort) \
        <(ssh vps-donweb "grep -oE '^[A-Z_]+=' /opt/margenx-infra/.env | sort")
   ```
   El segundo `diff` compara solo los nombres. Una línea con `<` es una variable que falta en la VPS: agregarla antes de seguir. Una con `>` es una variable de la VPS que no está en la plantilla: anotarla en la issue.

2. **Conservar la imagen anterior.** Etiqueta local con el ID de la imagen que corre hoy en producción:
   ```bash
   cd /opt/margenx-infra
   for svc in backend frontend; do
     img=$(docker inspect -f '{{.Image}}' "margenx_${svc}_prod")
     docker tag "$img" "margenx-${svc}:rollback-pre-v${VERSION}"
     echo "$svc $img"
   done
   docker image ls 'margenx-*'
   ```
   Anotar los dos IDs (`sha256:...`) en la issue: son los que la vuelta atrás tiene que dejar corriendo.

3. **Auditoría de nombres repetidos** (solo si el release trae la migración de índices únicos o una que agregue otro índice único). Seguir `docs/runbook-operacion.md` §8 contra `margenx_prod`. Resultado esperado: `(0 rows)`.

4. **Copia puntual de producción.** El backup diario de las 03:00 no la reemplaza: hace falta el estado exacto previo al merge.
   ```bash
   COPIA=/opt/margenx-infra/backups/manual/margenx_prod-$(date +%Y%m%d-%H%M%S)-pre-v${VERSION}.dump
   mkdir -p /opt/margenx-infra/backups/manual && chmod 700 /opt/margenx-infra/backups/manual
   ( umask 077; docker exec margenx_postgres_prod sh -c 'pg_dump -U "$POSTGRES_USER" -Fc margenx_prod' > "$COPIA" )
   ls -l "$COPIA"   # permisos -rw------- y tamaño mayor a cero
   docker exec -i margenx_postgres_prod pg_restore --list < "$COPIA" | grep -c 'TABLE DATA'   # mayor a cero
   ```

5. **Ensayo de las migraciones sobre una copia.** Restaura la copia en una base temporal y le aplica las migraciones con la imagen `:dev`, que es la de `develop` (paso 3 del §2.1). No toca `margenx_prod` ni `margenx_dev`.
   ```bash
   cd /opt/margenx-infra
   docker exec -i margenx_postgres_prod sh -c 'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1' <<'SQL'
   DROP DATABASE IF EXISTS margenx_release_test WITH (FORCE);
   CREATE DATABASE margenx_release_test;
   SQL

   # Restauración: anotar el tiempo "real", es el que usa la vuelta atrás (§5.2)
   time docker exec -i margenx_postgres_prod sh -c 'pg_restore -U "$POSTGRES_USER" -d margenx_release_test --no-owner' < "$COPIA"

   # Migraciones con la imagen de develop. DATABASE_URL se arma dentro del contenedor y no se imprime.
   time docker compose run --rm --no-deps -T --entrypoint sh backend-dev -c \
     'DATABASE_URL="${DATABASE_URL%/*}/margenx_release_test?schema=public" npx prisma migrate deploy'

   docker exec -i margenx_postgres_prod sh -c 'psql -U "$POSTGRES_USER" -d margenx_release_test -v ON_ERROR_STOP=1' <<'SQL'
   SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 3;
   SELECT count(*) AS migraciones_sin_terminar FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL;
   SELECT indexname FROM pg_indexes WHERE indexname LIKE '%lower_name_key' ORDER BY 1;
   SQL

   docker exec -i margenx_postgres_prod sh -c 'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1' <<'SQL'
   DROP DATABASE margenx_release_test WITH (FORCE);
   SQL
   ```
   Resultado esperado:
   - `pg_restore` termina sin líneas `error:`.
   - `prisma migrate deploy` termina con `All migrations have been successfully applied.` y lista las migraciones nuevas del paso 6 del §2.1.
   - La primera consulta muestra la última migración nueva con `finished_at` completo y la segunda da `0`.
   - En v0.6.0, la tercera lista `Ingredient_accountId_lower_name_key`, `Product_accountId_lower_name_key` y `Supplier_accountId_lower_name_key`.

   Si algo falla, el release se detiene: se corrige en `develop` y se repite el §2 completo.

Dejar en la issue un comentario con: el nombre del archivo de la copia, su tamaño, la cantidad de `TABLE DATA`, los dos IDs de imagen, la salida de las tres consultas y los dos tiempos medidos.

## 3. Publicar

### 3.1. PR de `develop` a `main`

1. Armar la lista de issues del release. Las issues cerradas por los PR mergeados a `develop` después del release anterior:
   ```bash
   DESDE=$(git log -1 --format=%cI "v$ANTERIOR")
   timeout 60 gh pr list --base develop --state merged --search "merged:>$DESDE" --limit 200 \
     --json closingIssuesReferences --jq '[.[].closingIssuesReferences[].number] | unique | map("Refs #\(.)") | .[]'
   # PRs sin palabra de cierre: revisar a mano si corresponde sumar su issue
   timeout 60 gh pr list --base develop --state merged --search "merged:>$DESDE" --limit 200 \
     --json number,title,closingIssuesReferences --jq '.[] | select(.closingIssuesReferences | length == 0) | "#\(.number) \(.title)"'
   ```
2. Abrir el PR en `https://github.com/dgimenezdeveloper/margenx/compare/main...develop` con la plantilla del repositorio:
   - Título: `release: vX.Y.Z - Cierre Sprint N (<hito>)`.
   - "Resumen de Cambios": el resumen de la sección `[VERSION]` del CHANGELOG.
   - "Issue Vinculada": `Refs #N` por cada issue, una por línea, más la issue del release. Nunca `Closes` (`CONTRIBUTING.md` §3).
   - "Pasos para Validar": enlace a este runbook y al comentario con los resultados del §2.
3. Esperar el CI en verde y la aprobación de un compañero y de QA (`docs/politica-proteccion-main.md` §1).

### 3.2. Merge con merge commit

En el PR, abrir el menú del botón de merge, elegir **Create a merge commit** y confirmar. Si el botón dice "Squash and merge" o "Rebase and merge", cambiarlo antes de hacer clic.

Comprobar que `develop` no quedó desfasada (las dos salidas tienen que estar vacías):

```bash
git fetch origin
git diff --stat origin/main origin/develop
git log --oneline --no-merges origin/develop..origin/main
git log -1 --format='%H %P%n%s' origin/main   # dos padres y asunto "Merge pull request #<PR> from .../develop"
```

### 3.3. Despliegue

El merge dispara `deploy.yml`. Seguirlo hasta el final:

```bash
timeout 30 gh run list --branch main --workflow deploy.yml --limit 1 --json databaseId,headSha,status,conclusion
timeout 900 gh run watch <databaseId> --exit-status
```

`headSha` tiene que ser el merge commit del paso anterior. Si el workflow falla en las migraciones, producción sigue con la imagen anterior (el reinicio es el último paso): no hace falta vuelta atrás, pero sí revisar el log y la tabla `_prisma_migrations` (§4, paso 2) antes de reintentar.

### 3.4. Etiqueta y Release

Etiqueta anotada sobre el merge commit, igual que `v0.5.0` (SAD §7.4). No hay ruleset sobre etiquetas: el `push` de la etiqueta funciona.

```bash
git fetch origin --tags
MERGE=$(git rev-parse origin/main)
if [ "$(git rev-parse "$MERGE^2")" = "$(git rev-parse origin/develop)" ]; then echo "OK: el merge commit trae develop completo"; else echo "DETENERSE: develop cambió después del merge"; fi
git tag -a "v$VERSION" "$MERGE" -m "Release v$VERSION"
git push origin "v$VERSION"

NOTAS=$(mktemp)
awk -v v="$VERSION" '$0 ~ "^## \\[" v "\\]" {f=1; next} /^## \[/ {f=0} /^---$/ {next} f' CHANGELOG.md > "$NOTAS"
printf '\n**Comparación:** https://github.com/dgimenezdeveloper/margenx/compare/v%s...v%s\n' "$ANTERIOR" "$VERSION" >> "$NOTAS"
timeout 60 gh release create "v$VERSION" --verify-tag --title "MargenX Release v$VERSION - Sprint $SPRINT" --notes-file "$NOTAS"
git rev-parse "v$VERSION^{commit}"   # tiene que ser igual a $MERGE
```

El `awk` lee el `CHANGELOG.md` local: correrlo con `main` actualizada (`git switch main && git pull`).

## 4. Prueba rápida en producción

Con la cuenta Demo MargenX, nunca con la cuenta de un comercio (DoD §4).

1. **Salud y versión nueva servida:**
   ```bash
   curl -sS -o /dev/null -w '%{http_code}\n' https://api.margenx.tech/api/health   # 200
   curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' https://margenx.tech/manifest.webmanifest   # 200 application/manifest+json (nuevo en v0.6.0)
   ```
2. **Migraciones aplicadas e imagen nueva** (en la VPS):
   ```bash
   docker exec -i margenx_postgres_prod sh -c 'psql -U "$POSTGRES_USER" -d margenx_prod' <<'SQL'
   SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 1;
   SQL
   docker inspect -f '{{.Image}}' margenx_backend_prod margenx_frontend_prod   # distintos de los IDs del §2.2, paso 2
   ```
3. **Inicio de sesión y productos:** en `https://margenx.tech`, desde un celular o a 360 px, entrar con el administrador Demo: el listado de productos carga y muestra costos y márgenes. Entrar con el colaborador Demo: ve productos y precios de venta, sin costos ni márgenes. Las contraseñas están en Bitwarden.
4. **Ingesta de prueba:** los dos `curl` del webhook `supplier-prices` de `docs/runbook-operacion.md` §5: `401` sin secreto y, con el secreto y el mismo precio del seed, `"unchanged": 1`.
5. **Envío de una alerta:** el recorrido "Alerta de margen crítico" de `docs/runbook-operacion.md` §5 (subir "Manteca (demo)" un 10 %, verificar el mail y que "Ajustar" abra `https://margenx.tech`). Al terminar, resembrar la Demo para dejarla como estaba: `infra/scripts/seed-remoto.sh prod demo --confirmar margenx_prod`, desde `main` y con las variables del §3 de ese runbook.

Si falla cualquiera de los pasos, aplicar el §5. La excepción es un fallo fuera de la versión publicada (por ejemplo, n8n o el reenvío de correo de Cloudflare): se trata como incidente aparte y se anota en la issue.

## 5. Vuelta atrás

Se aplica ante un fallo grave después del despliegue: `/api/health` distinto de 200, nadie puede iniciar sesión, los listados principales responden 5xx o hay datos dañados. Se decide en Discord y se anota la hora de inicio para medir el tiempo real.

### 5.1. Volver a la imagen anterior (no pierde datos)

En la VPS:

```bash
cd /opt/margenx-infra
VERSION=0.6.0
for svc in backend frontend; do
  ref=$(docker inspect -f '{{.Config.Image}}' "margenx_${svc}_prod")   # <usuario>/margenx-<svc>:latest
  docker tag "margenx-${svc}:rollback-pre-v${VERSION}" "$ref"
done
time docker compose up -d --no-deps --force-recreate backend-prod frontend-prod
docker inspect -f '{{.Image}}' margenx_backend_prod margenx_frontend_prod   # iguales a los IDs del §2.2, paso 2
curl -sS -o /dev/null -w '%{http_code}\n' https://api.margenx.tech/api/health   # 200
```

No correr `docker compose pull` de `backend-prod` ni `frontend-prod` hasta publicar la corrección: Docker Hub sigue teniendo la versión con el fallo como `:latest`.

La base queda con las migraciones nuevas aplicadas. En v0.6.0 eso es compatible con la imagen anterior: la migración solo cambia índices y el backend no corre migraciones al arrancar (`backend/Dockerfile`). La diferencia visible es que un nombre repetido con otras mayúsculas puede responder con otro código de error. Si un release futuro trae migraciones que la imagen anterior no soporta (por ejemplo, una columna renombrada), hay que aplicar también el §5.2.

### 5.2. Restaurar la copia de la base (pierde lo escrito después de la copia)

Solo si hay datos dañados o si la imagen anterior no funciona con la base migrada. Primero el §5.1. Después, en la VPS:

```bash
cd /opt/margenx-infra
COPIA=$(ls -t /opt/margenx-infra/backups/manual/margenx_prod-*-pre-v${VERSION}.dump | head -n 1)
echo "$COPIA"
docker compose stop backend-prod
docker exec -i margenx_postgres_prod sh -c 'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1' <<'SQL'
DROP DATABASE margenx_prod WITH (FORCE);
CREATE DATABASE margenx_prod;
SQL
time docker exec -i margenx_postgres_prod sh -c 'pg_restore -U "$POSTGRES_USER" -d margenx_prod --no-owner' < "$COPIA"
docker compose start backend-prod
curl -sS -o /dev/null -w '%{http_code}\n' https://api.margenx.tech/api/health   # 200
```

Después, repetir los pasos 3 y 4 del §4. Todo lo que los comercios cargaron entre la copia y la restauración se pierde (precios ingeridos, cambios de costo): avisarles y volver a mandar las listas de precios de ese período.

### 5.3. Tiempo estimado

| Paso | Estimación | Base |
|---|---|---|
| §5.1 imagen anterior y verificación | 5 minutos | Dos `docker tag` y un reinicio de dos contenedores, sin descargas. Reemplazar por el tiempo real si se ensaya en staging. |
| §5.2 restauración de la copia | 10 minutos | Detener, recrear la base, restaurar y arrancar. La restauración sola tardó 981 ms con un dump de 24 KB (`docs/runbook-backup.md` §3); reemplazar por el tiempo del ensayo del §2.2, paso 5. |
| Prueba rápida posterior (§4, pasos 3 y 4) | 10 minutos | Recorrido manual. |
| **Total con base** | **25 minutos** | |

Las estimaciones se corrigen con lo medido en cada release y se anotan en la issue.

### 5.4. Después de la vuelta atrás

- No mergear nada a `main` hasta tener la corrección: cualquier merge vuelve a desplegar.
- La corrección entra por `develop` y se publica como versión de parche (por ejemplo `v0.6.1`) con este mismo runbook.
- Editar la Release de GitHub para indicar que se volvió atrás y por qué. La etiqueta no se borra.

## 6. Aviso del lanzamiento

`deploy.yml` ya publica en Discord el resultado del despliegue. Además, con la prueba rápida en verde, publicar el aviso del lanzamiento en el canal del equipo:

```text
MargenX vX.Y.Z publicada en producción: https://margenx.tech
Novedades principales:
- <3 a 5 puntos del CHANGELOG, en lenguaje de usuario>
Cambios completos: https://github.com/dgimenezdeveloper/margenx/blob/vX.Y.Z/CHANGELOG.md
Release: https://github.com/dgimenezdeveloper/margenx/releases/tag/vX.Y.Z
Si ven algo raro, avisen en este canal.
```

## 7. Cierre

1. Comentario final en la issue del release con: enlace al PR, merge commit, enlace a la Release, resultado de cada paso del §4 y enlace al aviso.
2. Cerrar la issue a mano. El PR de preparación hacia `develop` usa `Refs` y no `Closes`, porque la rama por defecto es `develop` y la cerraría antes de publicar.
3. Avisar en Discord que `develop` se descongela.
4. Sincronizar la copia local:
   ```bash
   git switch develop && git pull
   git fetch --tags
   ```

## 8. Procedimiento mínimo (si hay atraso)

Si no alcanza el tiempo, se publica solo con: copia (§2.2, paso 4), conservar la imagen anterior (§2.2, paso 2), merge commit (§3.2), despliegue (§3.3), etiqueta (§3.4) y prueba rápida (§4). El aviso del §6 y el comentario de cierre se completan después, y se deja constancia en la issue de qué pasos se omitieron.
