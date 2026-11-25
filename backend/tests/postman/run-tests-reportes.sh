#!/bin/bash
# Uso: INTERNAL_WEBHOOK_SECRET=<secreto> ./run-tests-reportes.sh <token_admin> <token_colaborador> [opciones de newman]
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Uso: INTERNAL_WEBHOOK_SECRET=<secreto> ./run-tests-reportes.sh <token_admin> <token_colaborador> [opciones de newman]"
  exit 1
fi

if [ -z "${INTERNAL_WEBHOOK_SECRET:-}" ]; then
  echo "Falta la variable de entorno INTERNAL_WEBHOOK_SECRET (la misma del .env del backend)."
  echo "Uso: INTERNAL_WEBHOOK_SECRET=<secreto> ./run-tests-reportes.sh <token_admin> <token_colaborador> [opciones de newman]"
  exit 1
fi

cd "$(dirname "$0")"

newman run "MargenX - Reportes API.postman_collection.json" \
  --env-var "adminToken=$1" \
  --env-var "collaboratorToken=$2" \
  --env-var "internalWebhookSecret=$INTERNAL_WEBHOOK_SECRET" \
  "${@:3}"
