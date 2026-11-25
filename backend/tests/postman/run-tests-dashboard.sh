#!/bin/bash
# Uso: ./run-tests-dashboard.sh <token_admin> <token_colaborador> [opciones de newman]
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Uso: ./run-tests-dashboard.sh <token_admin> <token_colaborador> [opciones de newman]"
  exit 1
fi

cd "$(dirname "$0")"

newman run "MargenX - Dashboard API.postman_collection.json" \
  --env-var "adminToken=$1" \
  --env-var "collaboratorToken=$2" \
  "${@:3}"
