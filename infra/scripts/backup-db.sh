#!/usr/bin/env bash
# ==============================================================================
# MargenX — Script de Backup Automatizado de PostgreSQL (Producción)
# Issue #239 [SPRINT5-DEVOPS-03]
# ==============================================================================
set -Eeuo pipefail

# 1. Configuración de Rutas y Entorno
INFRA_DIR="${INFRA_DIR:-/opt/margenx-infra}"
ENV_FILE="${ENV_FILE:-$INFRA_DIR/.env}"
BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-$INFRA_DIR/backups}"
LOG_DIR="${LOG_DIR:-$BACKUP_BASE_DIR/logs}"
DAILY_DIR="$BACKUP_BASE_DIR/daily"
WEEKLY_DIR="$BACKUP_BASE_DIR/weekly"

TIMESTAMP="$(date +'%Y-%m-%d_%H%M%S')"
DATE_ISO="$(date +'%Y-%m-%d')"
DAY_OF_WEEK="$(date +'%u')" # 1 = Lunes, 7 = Domingo
LOG_FILE="$LOG_DIR/backup_${DATE_ISO}.log"

# Cargar variables de entorno de la VPS de forma segura si existen
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE" 2>/dev/null || true
  set +a
fi

DB_NAME="${POSTGRES_DB_PROD:-margenx_prod}"
DB_USER="${POSTGRES_USER:-postgres}"
CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-margenx_postgres_prod}"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK_URL:-${INFRA_DISCORD_WEBHOOK_URL:-}}"

# 2. Asegurar estructura de directorios y permisos estrictos (700)
mkdir -p "$DAILY_DIR" "$WEEKLY_DIR" "$LOG_DIR"
chmod 700 "$BACKUP_BASE_DIR" "$DAILY_DIR" "$WEEKLY_DIR" "$LOG_DIR"

log() {
  local msg="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
  echo "$msg"
  echo "$msg" >> "$LOG_FILE"
}

notify_discord_failure() {
  local raw_error="$1"
  if [[ -n "$DISCORD_WEBHOOK" ]]; then
    # Escapar comillas y saltos de línea para garantizar un JSON válido
    local clean_error
    clean_error="$(echo "$raw_error" | tr -d '"' | tr '\r\n' ' ')"

    local payload
    payload=$(cat <<EOF
{
  "username": "MargenX Backup Sentinel",
  "avatar_url": "https://raw.githubusercontent.com/dgimenezdeveloper/margenx/develop/frontend/public/logo.png",
  "embeds": [
    {
      "title": "🚨 Falla Crítica en Backup Diario de Base de Datos",
      "description": "**Servidor:** VPS Donweb (Producción)\\\\n**Base afectada:** \`$DB_NAME\`\\\\n**Contenedor:** \`$CONTAINER_NAME\`\\\\n**Timestamp:** \`$TIMESTAMP\`\\\\n\\\\n**Detalle del Error:**\\\\n\`\`\`$clean_error\`\`\`",
      "color": 15158332,
      "footer": {
        "text": "MargenX Infrastructure Alerting • Issue #239"
      }
    }
  ]
}
EOF
    )
    curl -sS -X POST -H "Content-Type: application/json" -d "$payload" "$DISCORD_WEBHOOK" >/dev/null 2>&1 || true
  fi
}

handle_error() {
  local exit_code=$?
  local line_no=$1
  local err_msg="Error en línea $line_no (Código de salida: $exit_code). Revisar log: $LOG_FILE"
  log "CRÍTICO: $err_msg"
  notify_discord_failure "$err_msg"
  exit "$exit_code"
}

trap 'handle_error $LINENO' ERR

log "=== INICIO DE BACKUP: $DB_NAME ==="

# 3. Comprobar que el contenedor de PostgreSQL esté activo
if ! docker ps --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}\$"; then
  log "ERROR: El contenedor de base de datos '$CONTAINER_NAME' no está en ejecución."
  notify_discord_failure "El contenedor '$CONTAINER_NAME' se encuentra detenido o no existe."
  exit 1
fi

BACKUP_FILENAME="${DB_NAME}_${TIMESTAMP}.dump"
DAILY_FILEPATH="$DAILY_DIR/$BACKUP_FILENAME"
TEMP_FILEPATH="${DAILY_FILEPATH}.tmp"

# 4. Ejecución del pg_dump en formato Custom comprimido (-Fc) hacia archivo temporal
log "Generando dump en: $DAILY_FILEPATH"
if ! docker exec -i "$CONTAINER_NAME" pg_dump -U "$DB_USER" -Fc "$DB_NAME" > "$TEMP_FILEPATH"; then
  rm -f "$TEMP_FILEPATH"
  log "ERROR: Falló el comando pg_dump dentro del contenedor '$CONTAINER_NAME'."
  notify_discord_failure "Fallo de ejecución de pg_dump en $CONTAINER_NAME."
  exit 1
fi

# Verificar que el archivo no esté vacío
if [[ ! -s "$TEMP_FILEPATH" ]]; then
  rm -f "$TEMP_FILEPATH"
  log "ERROR: El archivo de backup generado está vacío."
  notify_discord_failure "El dump generado en $DAILY_FILEPATH tiene tamaño 0 bytes."
  exit 1
fi

# Mover archivo temporal al destino definitivo y asignar permisos estrictos 600
mv "$TEMP_FILEPATH" "$DAILY_FILEPATH"
chmod 600 "$DAILY_FILEPATH"
DUMP_SIZE="$(du -h "$DAILY_FILEPATH" | cut -f1)"
log "Dump diario completado con éxito. Tamaño: $DUMP_SIZE"

# 5. Promoción a Backup Semanal (Domingos = 7)
if [[ "$DAY_OF_WEEK" -eq 7 ]]; then
  WEEKLY_FILEPATH="$WEEKLY_DIR/$BACKUP_FILENAME"
  cp -p "$DAILY_FILEPATH" "$WEEKLY_FILEPATH"
  chmod 600 "$WEEKLY_FILEPATH"
  log "Copia semanal creada en: $WEEKLY_FILEPATH"
fi

# 6. Rotación: Mantener últimos 7 días diarios y últimas 4 semanas
log "Ejecutando política de rotación..."

# Retención diaria: conservar los últimos 7 dumps diarios y eliminar excedentes
find "$DAILY_DIR" -maxdepth 1 -type f -name "${DB_NAME}_*.dump" | sort -r | tail -n +8 | while read -r old_daily; do
  log "Rotación: eliminando dump diario antiguo: $(basename "$old_daily")"
  rm -f "$old_daily"
done
DAILY_COUNT="$(find "$DAILY_DIR" -maxdepth 1 -type f -name "${DB_NAME}_*.dump" | wc -l)"
log "Backups diarios conservados: $DAILY_COUNT / 7 permitidos."

# Retención semanal: conservar los últimos 4 dumps semanales y eliminar excedentes
find "$WEEKLY_DIR" -maxdepth 1 -type f -name "${DB_NAME}_*.dump" | sort -r | tail -n +5 | while read -r old_weekly; do
  log "Rotación: eliminando dump semanal antiguo: $(basename "$old_weekly")"
  rm -f "$old_weekly"
done
WEEKLY_COUNT="$(find "$WEEKLY_DIR" -maxdepth 1 -type f -name "${DB_NAME}_*.dump" | wc -l)"
log "Backups semanales conservados: $WEEKLY_COUNT / 4 permitidos."

log "=== BACKUP FINALIZADO EXITOSAMENTE ==="
exit 0