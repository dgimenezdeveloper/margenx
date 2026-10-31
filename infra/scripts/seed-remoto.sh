#!/usr/bin/env bash
# ==============================================================================
# MargenX — Sembrar o resembrar staging o producción desde la máquina del operador
#
# Uso:
#   infra/scripts/seed-remoto.sh <dev|prod> <piloto|demo|todo> --confirmar <base>
#
#   piloto  backend/prisma/seed.ts       (Panadería Central y Química GyJ)
#   demo    backend/prisma/seed-demo.ts  (Demo MargenX)
#   todo    los dos, en ese orden
#
# Variables:
#   SSH_HOST                  alias de ~/.ssh/config hacia la VPS (por defecto vps-donweb)
#   SEED_DEMO_ADMIN_AUTH_ID   user_id de Clerk del administrador Demo  } solo prod: obligatorias
#   SEED_DEMO_COLAB_AUTH_ID   user_id de Clerk del colaborador Demo    } para "demo" y "todo"; en dev se ignoran
#
# Qué hace (detalle en docs/runbook-operacion.md):
#   0. En prod exige estar en main y sin cambios sin commitear.
#   1. Compila los seeds de la rama actual en un directorio temporal local.
#   2. Compara las migraciones del repo con las aplicadas en la base destino.
#   3. pg_dump de la base destino en /opt/margenx-infra/backups/manual/.
#   4. Corre el seed en un contenedor temporal con la misma imagen que el
#      backend del entorno, en la red interna de Docker. El código compilado
#      entra por la entrada estándar: no se copia nada al contenedor en marcha
#      ni se instala nada en la VPS. DATABASE_URL se lee en la VPS y no sale de ahí.
# ==============================================================================
set -euo pipefail

usage() {
  echo "Uso: $0 <dev|prod> <piloto|demo|todo> --confirmar <base>" >&2
  exit 2
}

[[ $# -eq 4 && "$3" == "--confirmar" ]] || usage
ENTORNO="$1"; QUE="$2"; CONFIRMAR="$4"

case "$ENTORNO" in
  dev)  DB="margenx_dev";  BACKEND="margenx_backend_dev" ;;
  prod) DB="margenx_prod"; BACKEND="margenx_backend_prod" ;;
  *) usage ;;
esac
case "$QUE" in
  piloto) SEEDS=(seed) ;;
  demo)   SEEDS=(seed-demo) ;;
  todo)   SEEDS=(seed seed-demo) ;;
  *) usage ;;
esac

if [[ "$CONFIRMAR" != "$DB" ]]; then
  echo "La base confirmada ($CONFIRMAR) no coincide con la del entorno $ENTORNO ($DB). No se hizo nada." >&2
  exit 1
fi

SSH_HOST="${SSH_HOST:-vps-donweb}"
POSTGRES="margenx_postgres_prod"
NETWORK="margenx_network"
BACKUP_DIR="/opt/margenx-infra/backups/manual"
TARGET="postgres:5432/$DB"   # host:puerto/base que validan los seeds

ADMIN_ID="${SEED_DEMO_ADMIN_AUTH_ID:-}"
COLAB_ID="${SEED_DEMO_COLAB_AUTH_ID:-}"
# Los IDs de las variables son del Clerk de producción. Staging usa la instancia
# de desarrollo, cuyos IDs ya trae seed-demo.ts: pasarle los de producción deja
# a los usuarios Demo de staging sin acceso (401).
if [[ "$ENTORNO" == "dev" ]]; then
  if [[ -n "$ADMIN_ID" || -n "$COLAB_ID" ]]; then
    echo "Aviso: en dev se ignoran SEED_DEMO_ADMIN_AUTH_ID y SEED_DEMO_COLAB_AUTH_ID (se usan los IDs de desarrollo del seed)." >&2
  fi
  ADMIN_ID=""; COLAB_ID=""
fi
if [[ "$ENTORNO" == "prod" && "$QUE" != "piloto" && ( -z "$ADMIN_ID" || -z "$COLAB_ID" ) ]]; then
  echo "En prod, la Demo necesita SEED_DEMO_ADMIN_AUTH_ID y SEED_DEMO_COLAB_AUTH_ID (user_id del Clerk de producción)." >&2
  exit 1
fi
for id in "$ADMIN_ID" "$COLAB_ID"; do
  if [[ -n "$id" && ! "$id" =~ ^user_[A-Za-z0-9]+$ ]]; then
    echo "user_id de Clerk inválido: $id" >&2
    exit 1
  fi
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RAMA="$(git -C "$REPO_ROOT" branch --show-current)"
# En prod solo se siembra el código revisado: rama main y sin cambios locales.
if [[ "$ENTORNO" == "prod" ]]; then
  if [[ "$RAMA" != "main" ]]; then
    echo "En prod hay que sembrar desde main (rama actual: ${RAMA:-HEAD desacoplado}). No se hizo nada." >&2
    exit 1
  fi
  if [[ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]]; then
    echo "Hay cambios sin commitear en el repositorio. En prod se siembra solo código commiteado. No se hizo nada." >&2
    exit 1
  fi
fi

BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "$BUILD_DIR"' EXIT

echo "==> 1/4 Compilando los seeds de la rama $RAMA"
(cd "$REPO_ROOT/backend" && npx tsc -p tsconfig.seed.json --noEmit false --rootDir . --outDir "$BUILD_DIR")

echo "==> 2/4 Comparando migraciones del repo con $DB"
LOCAL_MIGRATIONS="$(cd "$REPO_ROOT/backend/prisma/migrations" && find . -mindepth 1 -maxdepth 1 -type d | sed 's|^\./||' | sort)"
REMOTE_MIGRATIONS="$(ssh "$SSH_HOST" "docker exec $POSTGRES sh -c 'psql -U \"\$POSTGRES_USER\" -d $DB -At -c \"SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY 1\"'")"
if [[ "$LOCAL_MIGRATIONS" != "$REMOTE_MIGRATIONS" ]]; then
  echo "Las migraciones de la rama no coinciden con las de $DB. Diferencias (< repo, > base):" >&2
  diff <(echo "$LOCAL_MIGRATIONS") <(echo "$REMOTE_MIGRATIONS") >&2 || true
  echo "Sembrá desde la rama desplegada en ese entorno (develop para dev, main para prod)." >&2
  exit 1
fi

echo "==> 3/4 Respaldo previo de $DB"
STAMP="$(date +%Y%m%d-%H%M%S)"
ssh "$SSH_HOST" bash -s -- "$DB" "$POSTGRES" "$BACKUP_DIR" "$STAMP" <<'REMOTE'
set -euo pipefail
DB="$1"; POSTGRES="$2"; BACKUP_DIR="$3"; STAMP="$4"
FILE="$BACKUP_DIR/$DB-$STAMP-pre-seed.dump"
mkdir -p "$BACKUP_DIR" && chmod 700 "$BACKUP_DIR"
docker exec "$POSTGRES" sh -c "pg_dump -U \"\$POSTGRES_USER\" -Fc $DB" > "$FILE"
chmod 600 "$FILE"
ENTRIES="$(docker exec -i "$POSTGRES" pg_restore --list < "$FILE" | grep -c 'TABLE DATA' || true)"
if [[ "$ENTRIES" -lt 1 ]]; then
  echo "El respaldo $FILE no tiene datos de tablas. No se siembra." >&2
  exit 1
fi
echo "Respaldo: $FILE ($(du -h "$FILE" | cut -f1), $ENTRIES tablas con datos)"
REMOTE

for SEED in "${SEEDS[@]}"; do
  echo "==> 4/4 Ejecutando $SEED.ts sobre $DB"
  # Todos los valores interpolados están validados arriba (entorno, seed y user_id).
  REMOTE_CMD="set -eu; IMAGE=\$(docker inspect -f '{{.Image}}' $BACKEND);"
  REMOTE_CMD+=" DATABASE_URL=\$(docker exec $BACKEND printenv DATABASE_URL); export DATABASE_URL;"
  REMOTE_CMD+=" docker run --rm -i --network $NETWORK -e DATABASE_URL -e NODE_PATH=/app/node_modules"
  REMOTE_CMD+=" -e SEED_CONFIRM_TARGET=$TARGET -e SEED_DEMO_CONFIRM=$TARGET -e ALLOW_PRODUCTION_SEED=true"
  REMOTE_CMD+=" -e SEED_DEMO_ADMIN_AUTH_ID=$ADMIN_ID -e SEED_DEMO_COLAB_AUTH_ID=$COLAB_ID"
  REMOTE_CMD+=" --entrypoint sh \"\$IMAGE\" -c 'mkdir -p /tmp/seed && tar xz -C /tmp/seed && node /tmp/seed/prisma/$SEED.js'"
  # El código compilado viaja por la entrada estándar; el comando, como argumento de sh.
  tar -C "$BUILD_DIR" -cz . | ssh "$SSH_HOST" "sh -c $(printf '%q' "$REMOTE_CMD")"
done

echo "Listo. Para volver atrás: docs/runbook-operacion.md, sección Restaurar."
