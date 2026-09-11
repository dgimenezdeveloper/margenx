#!/usr/bin/env bash
# =============================================================================
# test-discord-webhook.sh — MargenX
# Script CLI para probar y validar el renderizado de alertas en Discord.
# Uso:
#   export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
#   bash .github/scripts/test-discord-webhook.sh <ci-fail|qa-approved|deploy-staging|deploy-prod|all>
# =============================================================================

set -e

WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-$2}"

if [ -z "$WEBHOOK_URL" ]; then
  echo "❌ Error: Falta la variable DISCORD_WEBHOOK_URL."
  echo "Uso: export DISCORD_WEBHOOK_URL=\"https://discord.com/api/webhooks/...\""
  echo "     bash $0 <ci-fail|qa-approved|deploy-staging|deploy-prod|all>"
  exit 1
fi

ACTION="${1:-all}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

send_payload() {
  local payload="$1"
  local description="$2"
  echo "📤 Enviando alerta de prueba: $description..."
  local response
  response=$(curl -s -o /dev/null -w "%{http_code}" -H "Content-Type: application/json" -X POST -d "$payload" "$WEBHOOK_URL")
  if [ "$response" -ge 200 ] && [ "$response" -lt 300 ]; then
    echo "✅ Alerta enviada con éxito (HTTP $response)."
  else
    echo "❌ Error al enviar alerta a Discord (HTTP $response)."
    exit 1
  fi
}

# 1. CI FAIL (🚨 Rojo)
send_ci_fail() {
  local payload
  payload=$(jq -n \
    --arg content "🚨 **Fallo en Pipeline de CI — MargenX**" \
    --arg title "Falló la verificación de CI (Lint / Build / Tests)" \
    --arg url "https://github.com/dgimenezdeveloper/margenx/actions" \
    --arg branch "feat/42-notificaciones-discord" \
    --arg author "dgimenezdeveloper" \
    --arg commit "test: commit de prueba de fallo en CI" \
    --arg time "$TIMESTAMP" \
    '{
      content: $content,
      embeds: [
        {
          title: $title,
          url: $url,
          color: 15158332,
          fields: [
            { name: "Rama / Ref", value: $branch, inline: true },
            { name: "Disparado por", value: $author, inline: true },
            { name: "Mensaje de Commit", value: $commit, inline: false },
            { name: "Detalles del Error", value: ("[Ver Logs en GitHub Actions](" + $url + ")"), inline: false }
          ],
          timestamp: $time
        }
      ]
    }')
  send_payload "$payload" "CI Fail (Rojo)"
}

# 2. QA APPROVED (✅ Verde)
send_qa_approved() {
  local payload
  payload=$(jq -n \
    --arg content "✅ **PR #42 Aprobado por QA — Listo para Mergear**" \
    --arg title "PR #42: [DEVOPS] Configuración de notificaciones de CI/CD en Discord" \
    --arg url "https://github.com/dgimenezdeveloper/margenx/pull/42" \
    --arg reviewer "LeanHerrera97" \
    --arg time "$TIMESTAMP" \
    '{
      content: $content,
      embeds: [
        {
          title: $title,
          url: $url,
          description: ("El PR ha sido revisado y formalmente aprobado por @" + $reviewer + ". Está listo para fusión a `develop`."),
          color: 3066993,
          fields: [
            { name: "Aprobado por (QA)", value: ("@" + $reviewer), inline: true },
            { name: "Acción Requerida", value: "Merge a `develop` por Scrum Master", inline: true }
          ],
          timestamp: $time
        }
      ]
    }')
  send_payload "$payload" "QA Approved (Verde)"
}

# 3. DEPLOY STAGING (🚀 Verde / Cohete)
send_deploy_staging() {
  local payload
  payload=$(jq -n \
    --arg content "@everyone 🚀 **Deploy Exitoso en Staging (https://dev.margenx.tech)**" \
    --arg title "MargenX — Despliegue Exitoso en Staging" \
    --arg url "https://dev.margenx.tech" \
    --arg tag "dev" \
    --arg commit "feat(devops): notificaciones de ci/cd en discord (#42)" \
    --arg run_url "https://github.com/dgimenezdeveloper/margenx/actions" \
    --arg time "$TIMESTAMP" \
    '{
      content: $content,
      embeds: [
        {
          title: $title,
          url: $url,
          color: 3066993,
          fields: [
            { name: "Entorno", value: "Staging (`dev.margenx.tech`)", inline: true },
            { name: "Tag Docker", value: $tag, inline: true },
            { name: "Commit", value: $commit, inline: false },
            { name: "Ver Ejecución", value: ("[Logs de GitHub Actions](" + $run_url + ")"), inline: false }
          ],
          timestamp: $time
        }
      ]
    }')
  send_payload "$payload" "Deploy Staging (Cohete / @everyone)"
}

# 4. DEPLOY PROD (🚀 Producción)
send_deploy_prod() {
  local payload
  payload=$(jq -n \
    --arg content "@everyone 🚀 **Deploy Exitoso en Producción (https://margenx.tech)**" \
    --arg title "MargenX — Despliegue Exitoso en Producción" \
    --arg url "https://margenx.tech" \
    --arg tag "latest" \
    --arg commit "release: cierre sprint 1 v0.2.0" \
    --arg run_url "https://github.com/dgimenezdeveloper/margenx/actions" \
    --arg time "$TIMESTAMP" \
    '{
      content: $content,
      embeds: [
        {
          title: $title,
          url: $url,
          color: 3066993,
          fields: [
            { name: "Entorno", value: "Producción (`margenx.tech`)", inline: true },
            { name: "Tag Docker", value: $tag, inline: true },
            { name: "Commit", value: $commit, inline: false },
            { name: "Ver Ejecución", value: ("[Logs de GitHub Actions](" + $run_url + ")"), inline: false }
          ],
          timestamp: $time
        }
      ]
    }')
  send_payload "$payload" "Deploy Producción (Cohete / @everyone)"
}

case "$ACTION" in
  ci-fail)
    send_ci_fail
    ;;
  qa-approved)
    send_qa_approved
    ;;
  deploy-staging)
    send_deploy_staging
    ;;
  deploy-prod)
    send_deploy_prod
    ;;
  all)
    send_ci_fail
    sleep 1
    send_qa_approved
    sleep 1
    send_deploy_staging
    sleep 1
    send_deploy_prod
    ;;
  *)
    echo "❌ Acción desconocida: $ACTION"
    echo "Opciones válidas: ci-fail | qa-approved | deploy-staging | deploy-prod | all"
    exit 1
    ;;
esac

echo "🎉 Pruebas de Discord finalizadas."