#!/usr/bin/env bash

# ==============================================================================
# MargenX - VPS Memory Monitor & Discord Alert Sentinel
# Issue: #173 (Sprint 4 - DevOps)
#
# Descripción:
#   Supervisa el uso de memoria RAM en la VPS Donweb. Si supera el umbral (85%),
#   inspecciona los contenedores con mayor consumo y despacha un Embed a Discord.
#
# Uso:
#   /bin/bash monitor-memory.sh           # Modo normal (umbral 85% o MEMORY_THRESHOLD)
#   /bin/bash monitor-memory.sh 10        # Modo test con umbral al 10%
#   /bin/bash monitor-memory.sh --test    # Fuerza el envío inmediato de prueba
#
# Variables opcionales:
#   VPS_HOST   Host a mostrar en el embed (por defecto "N/D"; no se versiona).
# ==============================================================================

set -euo pipefail

# 1. Cargar variables de entorno desde .env de la VPS si existe
INFRA_DIR="/opt/margenx-infra"
ENV_FILE="$INFRA_DIR/.env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$ENV_FILE" ]; then
  # Carga limpia de variables sin exponer otros secretos
  DISCORD_WEBHOOK_URL_VAL=$(grep -E '^DISCORD_WEBHOOK_URL=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
  MEMORY_THRESHOLD_VAL=$(grep -E '^MEMORY_THRESHOLD=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
  
  if [ -n "$DISCORD_WEBHOOK_URL_VAL" ] && [ -z "${DISCORD_WEBHOOK_URL:-}" ]; then
    DISCORD_WEBHOOK_URL="$DISCORD_WEBHOOK_URL_VAL"
  fi
  if [ -n "$MEMORY_THRESHOLD_VAL" ] && [ -z "${MEMORY_THRESHOLD:-}" ]; then
    MEMORY_THRESHOLD="$MEMORY_THRESHOLD_VAL"
  fi
elif [ -f "$SCRIPT_DIR/../../.env" ]; then
  DISCORD_WEBHOOK_URL_VAL=$(grep -E '^DISCORD_WEBHOOK_URL=' "$SCRIPT_DIR/../../.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
  if [ -n "$DISCORD_WEBHOOK_URL_VAL" ] && [ -z "${DISCORD_WEBHOOK_URL:-}" ]; then
    DISCORD_WEBHOOK_URL="$DISCORD_WEBHOOK_URL_VAL"
  fi
fi

# 2. Configuración de Umbrales y Argumentos
DEFAULT_THRESHOLD=85
THRESHOLD="${MEMORY_THRESHOLD:-$DEFAULT_THRESHOLD}"
FORCE_TEST=false

if [ "${1:-}" = "--test" ] || [ "${1:-}" = "-t" ]; then
  FORCE_TEST=true
  echo "🧪 [MODO PRUEBA] Se forzará el envío de la alerta a Discord independientemente del consumo actual."
elif [ -n "${1:-}" ] && [[ "${1:-}" =~ ^[0-9]+$ ]]; then
  THRESHOLD="$1"
  echo "⚙️ Umbral de memoria configurado temporalmente en: ${THRESHOLD}%"
fi

WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"
if [ -z "$WEBHOOK_URL" ]; then
  echo "❌ Error: La variable DISCORD_WEBHOOK_URL no está definida en el entorno ni en $ENV_FILE." >&2
  exit 1
fi

COOLDOWN_FILE="/tmp/margenx_mem_alert.lock"
COOLDOWN_SECONDS=1800 # 30 minutos de silencio tras alertar para no saturar Discord

# 3. Medición del Consumo de Memoria en el Host
TOTAL_MB=$(free -m | awk '/^Mem:/ {print $2}')
USED_MB=$(free -m | awk '/^Mem:/ {print $3}')
AVAIL_MB=$(free -m | awk '/^Mem:/ {print $7}')

# Fórmula de cálculo establecida en el criterio técnico
USED_MEM_PERCENT=$(free | grep Mem | awk '{print int($3/$2 * 100)}')

TOTAL_GB=$(awk "BEGIN {printf \"%.2f\", $TOTAL_MB/1024}")
USED_GB=$(awk "BEGIN {printf \"%.2f\", $USED_MB/1024}")
AVAIL_GB=$(awk "BEGIN {printf \"%.2f\", $AVAIL_MB/1024}")

TIMESTAMP_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
HOSTNAME_TXT=$(hostname 2>/dev/null || echo "vps-5667104-x")

echo "📊 Estado de RAM: ${USED_MEM_PERCENT}% en uso (${USED_GB} GB / ${TOTAL_GB} GB) | Umbral: ${THRESHOLD}%"

# Si el consumo volvió a niveles seguros (< umbral), levantamos el bloqueo de cooldown
if [ "$USED_MEM_PERCENT" -lt "$THRESHOLD" ] && [ -f "$COOLDOWN_FILE" ]; then
  rm -f "$COOLDOWN_FILE"
  echo "✅ Consumo de RAM normalizado (<${THRESHOLD}%). Lock de cooldown eliminado."
fi

# 4. Evaluación de la Alerta
SHOULD_ALERT=false
if [ "$USED_MEM_PERCENT" -ge "$THRESHOLD" ]; then
  SHOULD_ALERT=true
fi

if [ "$FORCE_TEST" = true ]; then
  SHOULD_ALERT=true
fi

if [ "$SHOULD_ALERT" = false ]; then
  echo "🟢 Consumo dentro de límites operativos (${USED_MEM_PERCENT}% < ${THRESHOLD}%). Fin de ejecución."
  exit 0
fi

# Control de Cooldown (Anti-Spam cada 5 minutos de cron)
if [ "$FORCE_TEST" = false ] && [ -f "$COOLDOWN_FILE" ]; then
  LAST_ALERT=$(stat -c %Y "$COOLDOWN_FILE" 2>/dev/null || stat -f %m "$COOLDOWN_FILE" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  ELAPSED=$((NOW - LAST_ALERT))
  if [ "$ELAPSED" -lt "$COOLDOWN_SECONDS" ]; then
    MINUTES_LEFT=$(((COOLDOWN_SECONDS - ELAPSED) / 60))
    echo "⏳ Alerta silenciada por cooldown (última notificación hace ${ELAPSED}s). Próximo reporte permitido en ${MINUTES_LEFT} min."
    exit 0
  fi
fi

# 5. Obtener Top de Contenedores Docker por Consumo de RAM
TOP_CONTAINERS=$(docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}" 2>/dev/null | head -n 7 || true)

if [ -z "$TOP_CONTAINERS" ]; then
  TOP_CONTAINERS="No se pudo obtener estadísticas de Docker o no hay contenedores activos."
fi

# Escapar formato para compatibilidad con payload JSON de Discord
ESCAPED_CONTAINERS=$(echo "$TOP_CONTAINERS" | sed ':a;N;$!ba;s/\\/\\\\/g;s/"/\\"/g;s/\n/\\n/g')

# Color del Embed: Rojo (#E74C3C -> 15158332) para alertas reales / Naranja (#F59E0B -> 16098851) para test
EMBED_COLOR=15158332
EMBED_TITLE="⚠️ Alerta de Memoria RAM: ${USED_MEM_PERCENT}% en uso"
if [ "$FORCE_TEST" = true ]; then
  EMBED_COLOR=16098851
  EMBED_TITLE="🧪 [TEST SIMULADO] Alerta de Memoria RAM: ${USED_MEM_PERCENT}% en uso"
fi

# 6. Construir Payload JSON para el Webhook de Discord
JSON_PAYLOAD=$(cat << EOF
{
  "username": "MargenX Sentinel",
  "avatar_url": "https://raw.githubusercontent.com/dgimenezdeveloper/margenx/develop/frontend/public/logo-icon.png",
  "content": "🚨 **[ATENCIÓN DEVOPS]** Consumo de memoria RAM por encima del umbral de seguridad.",
  "embeds": [
    {
      "title": "${EMBED_TITLE}",
      "description": "El servidor Donweb (**${HOSTNAME_TXT}**) superó el límite de memoria configurado (**${THRESHOLD}%**).",
      "color": ${EMBED_COLOR},
      "fields": [
        {
          "name": "📊 Memoria Utilizada",
          "value": "**${USED_GB} GB** de ${TOTAL_GB} GB (**${USED_MEM_PERCENT}%**)",
          "inline": true
        },
        {
          "name": "🟢 Disponible",
          "value": "${AVAIL_GB} GB",
          "inline": true
        },
        {
          "name": "🖥️ Servidor Host",
          "value": "\`${VPS_HOST:-N/D}\`",
          "inline": true
        },
        {
          "name": "🐳 Top Contenedores por Consumo de RAM",
          "value": "\`\`\`text\\n${ESCAPED_CONTAINERS}\\n\`\`\`",
          "inline": false
        }
      ],
      "footer": {
        "text": "MargenX Sentinel Engine • Monitoreo Automático VPS Donweb"
      },
      "timestamp": "${TIMESTAMP_ISO}"
    }
  ]
}
EOF
)

# 7. Despachar petición HTTP POST a Discord
echo "📡 Despachando notificación al canal de Discord..."
HTTP_RESPONSE=$(curl -s -S -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD" \
  "$WEBHOOK_URL")

if [ "$HTTP_RESPONSE" -eq 204 ] || [ "$HTTP_RESPONSE" -eq 200 ]; then
  echo "✅ Alerta despachada con éxito a Discord (HTTP ${HTTP_RESPONSE})."
  touch "$COOLDOWN_FILE"
else
  echo "❌ Error al enviar notificación a Discord. Código HTTP: ${HTTP_RESPONSE}" >&2
  exit 1
fi
