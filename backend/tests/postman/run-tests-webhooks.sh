#!/bin/bash
# Uso: ./run-tests-webhooks.sh [opciones de newman]
# No necesita tokens de Clerk: usa el INTERNAL_WEBHOOK_SECRET del backend.
set -euo pipefail

if [ -z "${INTERNAL_WEBHOOK_SECRET:-}" ]; then
  echo "Falta la variable de entorno INTERNAL_WEBHOOK_SECRET (la misma del .env del backend)."
  echo "Uso: INTERNAL_WEBHOOK_SECRET=<secreto> ./run-tests-webhooks.sh [opciones de newman]"
  exit 1
fi

cd "$(dirname "$0")"

newman run "MargenX - Webhooks API.postman_collection.json" \
  -e "MargenX - Webhooks QA.postman_environment.json" \
  --env-var "internalWebhookSecret=$INTERNAL_WEBHOOK_SECRET" \
  "$@"
