#!/bin/bash
# Uso: ./run-tests-colaboradores.sh <ADMIN_TOKEN> <COLLAB_TOKEN> [overrides de Newman]
# Los dos tokens deben ser de la misma cuenta (ver README-Colaboradores.md).
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Uso: ./run-tests-colaboradores.sh <ADMIN_TOKEN> <COLLAB_TOKEN> [overrides de Newman]"
  exit 1
fi

cd "$(dirname "$0")"

ADMIN_TOKEN="$1"
COLLAB_TOKEN="$2"
shift 2

npx newman run "MargenX - Colaboradores API.postman_collection.json" \
  --env-var "baseUrl=http://localhost:3000" \
  --env-var "ADMIN_TOKEN=$ADMIN_TOKEN" \
  --env-var "COLLAB_TOKEN=$COLLAB_TOKEN" \
  "$@"
