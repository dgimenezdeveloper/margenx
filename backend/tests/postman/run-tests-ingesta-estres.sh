#!/bin/bash
# Uso: ./run-tests-ingesta-estres.sh <token_panaderia_admin> [opciones de newman]
# Requiere: newman y newman-reporter-htmlextra instalados (npm install -g newman newman-reporter-htmlextra)
# y el backend corriendo localmente con INTERNAL_WEBHOOK_SECRET configurado (pisar el valor
# en "ingesta-estres.postman_environment.json" o pasarlo con --env-var).
# El token de ADMIN de Panadería Central lee el costo de Harina 000 después de los casos
# de muchos decimales y de código con espacios (#313). Dura ~60 s: generarlo justo antes,
# desde backend/, con: npx tsx scripts/get-test-token.ts panaderia-admin
set -euo pipefail

if [ $# -lt 1 ] || [[ "$1" == --* ]]; then
  echo "Falta el token de ADMIN de Panadería Central (panaderia-admin)."
  echo "Uso: ./run-tests-ingesta-estres.sh <token_panaderia_admin> [opciones de newman]"
  exit 1
fi
ADMIN_TOKEN="$1"
shift

cd "$(dirname "$0")"
mkdir -p reports

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
CLI_LOG="reports/ingesta-estres-${TIMESTAMP}.cli.log"
HTML_REPORT="reports/ingesta-estres-${TIMESTAMP}.html"

# Si quien llama elige sus reporters (por ejemplo, run-regresion.sh con cli,junit),
# no se agrega htmlextra: no hace falta el plugin ni queda un HTML con los tokens.
REPORTER_ARGS=(--reporters cli,htmlextra --reporter-htmlextra-export "$HTML_REPORT")
for arg in "$@"; do
  if [ "$arg" = "--reporters" ] || [ "$arg" = "-r" ] || [[ "$arg" == --reporters=* ]]; then
    REPORTER_ARGS=()
    HTML_REPORT=""
  fi
done

newman run "ingesta-estres.json" \
  -e "ingesta-estres.postman_environment.json" \
  --env-var "adminToken=$ADMIN_TOKEN" \
  ${REPORTER_ARGS[@]+"${REPORTER_ARGS[@]}"} \
  "$@" | tee "$CLI_LOG"

echo ""
echo "Evidencia guardada en:"
echo "  - $CLI_LOG"
if [ -n "$HTML_REPORT" ]; then
  echo "  - $HTML_REPORT"
fi
