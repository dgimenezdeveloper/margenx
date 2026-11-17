#!/usr/bin/env bash
# Prueba las migraciones automáticas de sync-dev-env.sh sin base ni Prisma reales: un `npx` falso
# registra con qué DATABASE_URL lo llamaron y si lo llamaron.
# Uso: bash .devcontainer/scripts/sync-dev-env.test.sh
set -uo pipefail

SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/sync-dev-env.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

LOCAL_URL='postgresql://margenx:margenx@localhost:5432/margenx_dev?schema=public'
OTRA_URL='postgresql://u:p@127.0.0.9:5999/otra_base'

mkdir -p "$WORK/bin" "$WORK/repo/backend"
cat > "$WORK/bin/npx" <<'FAKE'
#!/usr/bin/env bash
printf '%s|%s\n' "${DATABASE_URL-<sin definir>}" "$*" >> "$NPX_LOG"
echo "No pending migrations to apply."
FAKE
chmod +x "$WORK/bin/npx"

FALLAS=0
check() {
  if [ "$2" = "$3" ]; then echo "ok - $1"; else echo "FALLA - $1: esperaba [$3], obtuvo [$2]"; FALLAS=1; fi
}

# Corre sync_migrations en un repo de prueba. $1 = DATABASE_URL de backend/.env, $2 = la exportada.
run_migrations() {
  printf 'DATABASE_URL="%s"\n' "$1" > "$WORK/repo/backend/.env"
  : > "$WORK/npx.log"
  (
    # shellcheck disable=SC1090
    . "$SCRIPT"
    wait_for_database() { return 0; }
    cd "$WORK/repo" || exit 1
    export PATH="$WORK/bin:$PATH" NPX_LOG="$WORK/npx.log"
    if [ -n "$2" ]; then export DATABASE_URL="$2"; else unset DATABASE_URL; fi
    sync_migrations
  ) > "$WORK/salida.log" 2>&1
}

# 1 Con una DATABASE_URL exportada a otra base, Prisma no la recibe: migra la de backend/.env.
run_migrations "$LOCAL_URL" "$OTRA_URL"
check "la DATABASE_URL exportada no llega a prisma migrate deploy" "$(cat "$WORK/npx.log")" "<sin definir>|prisma migrate deploy"
check "avisa que ignora la variable exportada" "$(grep -c 'DATABASE_URL exportada' "$WORK/salida.log")" "1"
if grep -q '127.0.0.9' "$WORK/salida.log"; then check "no imprime la cadena de conexión" "impresa" "oculta"; fi

# 2 Sin variable exportada: migra la base local.
run_migrations "$LOCAL_URL" ""
check "migra la base local de backend/.env" "$(cat "$WORK/npx.log")" "<sin definir>|prisma migrate deploy"

# 3 backend/.env apunta a otra base: no llama a Prisma aunque la exportada sea la local.
run_migrations "$OTRA_URL" "$LOCAL_URL"
check "no migra si backend/.env no es la base local" "$(wc -c < "$WORK/npx.log" | tr -d ' ')" "0"

# 4 Cargar el script para probarlo no ejecuta la sincronización.
( . "$SCRIPT" ) > "$WORK/carga.log" 2>&1
check "cargar el script no sincroniza" "$(wc -c < "$WORK/carga.log" | tr -d ' ')" "0"

[ "$FALLAS" -eq 0 ] && echo "sync-dev-env: todas las pruebas pasaron"
exit "$FALLAS"
