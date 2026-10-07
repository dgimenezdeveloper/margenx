#!/bin/bash
# Uso: ./run-tests-rbac-colaborador.sh <COLLAB_TOKEN>
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Uso: ./run-tests-rbac-colaborador.sh <COLLAB_TOKEN>"
  exit 1
fi

cd "$(dirname "$0")"

npx newman run "MargenX - Colaborador RBAC API.postman_collection.json" \
  --env-var "baseUrl=http://localhost:3021" \
  --env-var "COLLAB_TOKEN=$1"
