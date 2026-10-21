#!/bin/bash
# Uso: ./run-tests-ingesta-estres.sh
# Requiere: newman y newman-reporter-htmlextra instalados (npm install -g newman newman-reporter-htmlextra)
# y el backend corriendo localmente con INTERNAL_WEBHOOK_SECRET configurado (pisar el valor
# en "MargenX - Ingesta Estres QA.postman_environment.json" o pasarlo con --env-var).
set -euo pipefail

cd "$(dirname "$0")"
mkdir -p reports

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
CLI_LOG="reports/ingesta-estres-${TIMESTAMP}.cli.log"
HTML_REPORT="reports/ingesta-estres-${TIMESTAMP}.html"

newman run "ingesta-estres.json" \
  -e "ingesta-estres.postman_environment.json" \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export "$HTML_REPORT" \
  "$@" | tee "$CLI_LOG"

echo ""
echo "Evidencia guardada en:"
echo "  - $CLI_LOG"
echo "  - $HTML_REPORT"
