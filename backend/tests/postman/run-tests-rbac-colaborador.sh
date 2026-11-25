#!/bin/bash
# Uso: ./run-tests-rbac-colaborador.sh <COLLAB_TOKEN> [opciones de newman]
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Uso: ./run-tests-rbac-colaborador.sh <COLLAB_TOKEN> [opciones de newman]"
  exit 1
fi

cd "$(dirname "$0")"

npx newman run "MargenX - Colaborador RBAC API.postman_collection.json" \
  --env-var "baseUrl=http://localhost:3000" \
  --env-var "COLLAB_TOKEN=$1" \
  "${@:2}"
