#!/bin/bash
# Uso: ./run-tests-cuarentena.sh <token_cuenta_A>
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Uso: ./run-tests-cuarentena.sh <token_cuenta_A>"
  exit 1
fi

if [ -z "${INTERNAL_WEBHOOK_SECRET:-}" ]; then
  echo "Falta la variable de entorno INTERNAL_WEBHOOK_SECRET (la misma del .env del backend)."
  echo "Uso: INTERNAL_WEBHOOK_SECRET=<secreto> ./run-tests-cuarentena.sh <token_cuenta_A>"
  exit 1
fi

cd "$(dirname "$0")"

newman run "MargenX - Cuarentena API.postman_collection.json" \
  -e "MargenX - Proveedores y Conversiones QA.postman_environment.json" \
  --env-var "token_cuenta_A=$1" \
  --env-var "internalWebhookSecret=$INTERNAL_WEBHOOK_SECRET"