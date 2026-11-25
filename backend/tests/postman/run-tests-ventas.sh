#!/bin/bash
# Uso: ./run-tests-ventas.sh <token_admin> <token_colaborador> [opciones de newman]
# Requiere el módulo de ventas prendido para la cuenta de los tokens (ver README-Ventas.md).
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Uso: ./run-tests-ventas.sh <token_admin> <token_colaborador> [opciones de newman]"
  exit 1
fi

cd "$(dirname "$0")"

newman run "MargenX - Ventas API.postman_collection.json" \
  --env-var "adminToken=$1" \
  --env-var "collaboratorToken=$2" \
  "${@:3}"
