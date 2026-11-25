#!/bin/bash
# Uso: ./run-tests-productos.sh <token_cuenta_A> <token_cuenta_B> [opciones de newman]
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Uso: ./run-tests-productos.sh <token_cuenta_A> <token_cuenta_B> [opciones de newman]"
  exit 1
fi

cd "$(dirname "$0")"

newman run "MargenX - Productos API.postman_collection.json" \
  -e "MargenX - Productos QA.postman_environment.json" \
  --env-var "accountId_cuentaA=30a00000-0000-4000-8000-000000000001" \
  --env-var "token_cuenta_A=$1" \
  --env-var "token_cuenta_B=$2" \
  "${@:3}"
