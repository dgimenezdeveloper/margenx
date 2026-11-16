#!/usr/bin/env bash
# Sincroniza el DevContainer con la rama actual: Node de .nvmrc, dependencias de backend/ y
# frontend/, cliente de Prisma y migraciones en la base LOCAL. Es idempotente: solo trabaja
# si algo cambió, así que se puede correr siempre.
#
# Lo llaman:
#   - devcontainer.json (postCreateCommand y postAttachCommand): al crear el contenedor y cada
#     vez que VS Code o Cursor se conectan.
#   - .githooks/post-checkout y .githooks/post-merge: al cambiar de rama y al traer cambios.
#
# Uso: bash .devcontainer/scripts/sync-dev-env.sh [--hook]
# Para saltearlo una vez: MARGENX_SKIP_SYNC=1 git switch <rama>
# Documentación: README.md, sección "Entorno sincronizado".

set -uo pipefail

MODE="${1:-}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT" || exit 0

log() { printf '[margenx-env] %s\n' "$*"; }
warn() { printf '[margenx-env] AVISO: %s\n' "$*" >&2; }

in_devcontainer() {
  [ -n "${MARGENX_DEVCONTAINER:-}" ] || [ -n "${REMOTE_CONTAINERS:-}" ] || [ -n "${CODESPACES:-}" ] || [ -f /.dockerenv ]
}

if [ -n "${MARGENX_SKIP_SYNC:-}" ]; then
  exit 0
fi

if ! in_devcontainer; then
  # Los hooks también existen en el clon del host: ahí no se instala ni se migra nada.
  [ "$MODE" = "--hook" ] || warn "Fuera del DevContainer: no se toca nada."
  exit 0
fi

FAILED=0

# 1. Hooks de git versionados (idempotente; vive en .git/config del clon).
configure_hooks() {
  if [ "$(git config --get core.hooksPath || true)" != ".githooks" ]; then
    git config core.hooksPath .githooks
    log "Hooks de git activados (.githooks): cambiar de rama sincroniza el entorno."
  fi
}

# 2. Node de .nvmrc. Un contenedor creado antes del cambio de imagen sigue con otra versión
#    hasta el "Rebuild Container"; nvm (incluido en la imagen) la corrige sin reconstruir.
node_major() { node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo "ninguna"; }

ensure_node() {
  local want want_major have
  want="$(tr -d '[:space:]v' < .nvmrc)"
  want_major="${want%%.*}"
  have="$(node_major)"
  [ "$have" = "$want_major" ] && return 0

  log "Node $have en el contenedor; el proyecto usa Node $want (.nvmrc). Instalando con nvm…"
  export NVM_DIR="${NVM_DIR:-/usr/local/share/nvm}"
  export NVM_SYMLINK_CURRENT=true
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    set +u
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    local nvm_output
    if ! nvm_output="$(nvm install "$want" 2>&1 && nvm alias default "$want" 2>&1 && nvm use default 2>&1)"; then
      printf '%s\n' "$nvm_output" | tail -n 5 >&2
    fi
    set -u
    hash -r
  fi

  have="$(node_major)"
  if [ "$have" != "$want_major" ]; then
    warn "No se pudo pasar a Node $want. Ejecutá \"Dev Containers: Rebuild Container\"."
    return 1
  fi
  log "Node $(node -v) listo. Las terminales nuevas ya lo usan; en las abiertas, ejecutá: hash -r"
}

lock_hash() { sha256sum "$1" | cut -c1-16; }

# 3. Dependencias: npm ci solo si cambió el lockfile o la versión mayor de Node.
sync_deps() {
  local pkg="$1" stamp expected
  stamp="$pkg/node_modules/.margenx-sync"
  expected="node$(node_major)-$(lock_hash "$pkg/package-lock.json")"
  if [ -d "$pkg/node_modules" ] && [ "$(cat "$stamp" 2>/dev/null)" = "$expected" ]; then
    return 0
  fi
  log "$pkg: dependencias nuevas o actualizadas, ejecutando npm ci…"
  if (cd "$pkg" && npm ci --no-audit --no-fund --loglevel=error); then
    echo "$expected" > "$stamp"
  else
    warn "$pkg: falló npm ci."
    return 1
  fi
}

# 4. Cliente de Prisma: se regenera si cambió el schema o se reinstalaron las dependencias.
sync_prisma_client() {
  local stamp expected
  stamp="backend/node_modules/.margenx-prisma"
  expected="$(cat backend/node_modules/.margenx-sync 2>/dev/null)-$(lock_hash backend/prisma/schema.prisma)"
  [ "$(cat "$stamp" 2>/dev/null)" = "$expected" ] && return 0
  log "backend: generando el cliente de Prisma…"
  local output
  if output="$(cd backend && npx prisma generate 2>&1)"; then
    echo "$expected" > "$stamp"
  else
    warn "backend: falló prisma generate:"
    printf '%s\n' "$output" | tail -n 5 >&2
    return 1
  fi
}

# 5. Migraciones: solo contra la base del DevContainer (localhost:5432/margenx_dev) y nunca el seed.
#    La cadena de conexión no se imprime.
database_url_is_local() {
  local url
  url="$(grep -E '^[[:space:]]*DATABASE_URL=' backend/.env | tail -n 1 | cut -d= -f2- | tr -d "\"' ")"
  case "$url" in
    *@localhost:5432/margenx_dev | *@localhost:5432/margenx_dev\?* | \
    *@127.0.0.1:5432/margenx_dev | *@127.0.0.1:5432/margenx_dev\?*) return 0 ;;
    *) return 1 ;;
  esac
}

wait_for_database() {
  local attempt
  for attempt in $(seq 1 30); do
    if node -e "require('net').connect(5432,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

sync_migrations() {
  if [ ! -f backend/.env ]; then
    warn "Falta backend/.env (copiá backend/.env.example): no se aplican migraciones."
    return 0
  fi
  if ! database_url_is_local; then
    warn "DATABASE_URL de backend/.env no apunta a la base local del DevContainer: no se aplican migraciones."
    return 0
  fi
  if ! wait_for_database; then
    warn "La base local no responde en el puerto 5432: no se aplican migraciones."
    return 1
  fi
  local output
  if output="$(cd backend && npx prisma migrate deploy 2>&1)"; then
    if printf '%s' "$output" | grep -q "No pending migrations"; then
      [ "$MODE" = "--hook" ] || log "Base local al día: sin migraciones pendientes."
    else
      printf '%s\n' "$output" | grep -E "^(Applying migration|The following migration|All migrations)" | sed 's/^/[margenx-env] /'
    fi
  else
    warn "Falló prisma migrate deploy en la base local:"
    printf '%s\n' "$output" | tail -n 5 >&2
    return 1
  fi
}

configure_hooks
if ensure_node; then
  sync_deps backend || FAILED=1
  sync_deps frontend || FAILED=1
  sync_prisma_client || FAILED=1
  sync_migrations || FAILED=1
else
  FAILED=1
fi

if [ "$FAILED" -ne 0 ]; then
  warn "El entorno quedó a medias. Revisá los avisos y volvé a correr: bash .devcontainer/scripts/sync-dev-env.sh"
fi

# Desde un hook nunca se corta la operación de git.
[ "$MODE" = "--hook" ] && exit 0
exit "$FAILED"
