#!/bin/bash
# Uso: ./run-tests.sh <token_cuenta_A> <token_cuenta_B>
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Uso: ./run-tests.sh <token_cuenta_A> <token_cuenta_B>"
  exit 1
fi

cd "$(dirname "$0")"

newman run "MargenX - Insumos API.postman_collection.json" \
  -e "MargenX - Insumos QA.postman_environment.json" \
  --env-var "accountId_cuentaA=d45e2fab-df12-4baa-b597-6f2da538cef5" \
  --env-var "token_cuenta_A=$1" \
  --env-var "token_cuenta_B=$2"