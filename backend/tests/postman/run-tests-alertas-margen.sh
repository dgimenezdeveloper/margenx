#!/bin/bash
# Uso: ./run-tests-alertas-margen.sh <token_admin> <token_colaborador>
# Ambos tokens son de la cuenta Panadería Central (uno con rol ADMIN, otro COLLABORATOR).
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Uso: ./run-tests-alertas-margen.sh <token_admin> <token_colaborador>"
  exit 1
fi

cd "$(dirname "$0")"

newman run "MargenX - Alertas de margen (Insumos).postman_collection.json" \
  --env-var "adminToken=$1" \
  --env-var "collaboratorToken=$2"
