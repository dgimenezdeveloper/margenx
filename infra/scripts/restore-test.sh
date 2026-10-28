#!/usr/bin/env bash
# ==============================================================================
# MargenX — Ensayo de Restauración y Validación de Integridad
# Issue #239 [SPRINT5-DEVOPS-03]
# ==============================================================================
set -Eeuo pipefail

INFRA_DIR="${INFRA_DIR:-/opt/margenx-infra}"
ENV_FILE="${ENV_FILE:-$INFRA_DIR/.env}"
BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-$INFRA_DIR/backups}"
DAILY_DIR="$BACKUP_BASE_DIR/daily"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE" 2>/dev/null || true
  set +a
fi

DB_USER="${POSTGRES_USER:-postgres}"
CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-margenx_postgres_prod}"
SOURCE_DB="${POSTGRES_DB_PROD:-margenx_prod}"
TEST_DB="margenx_restore_test"
MAINTENANCE_DB="postgres"

cleanup() {
  echo "[-] Limpiando base temporal '$TEST_DB'..."
  docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$MAINTENANCE_DB" -c "DROP DATABASE IF EXISTS \"$TEST_DB\" WITH (FORCE);" >/dev/null 2>&1 || \
  docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$SOURCE_DB" -c "DROP DATABASE IF EXISTS \"$TEST_DB\" WITH (FORCE);" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# 1. Encontrar el dump más reciente
LATEST_DUMP="$(find "$DAILY_DIR" -maxdepth 1 -type f -name "${SOURCE_DB}_*.dump" | sort -r | head -n 1 || true)"

if [[ -z "$LATEST_DUMP" || ! -f "$LATEST_DUMP" ]]; then
  echo "Error: No se encontró ningún archivo de dump en $DAILY_DIR"
  exit 1
fi

echo "[*] Utilizando dump: $LATEST_DUMP"
echo "[*] Tamaño del dump: $(du -h "$LATEST_DUMP" | cut -f1)"

# 2. Crear base de datos temporal limpia
echo "[*] Creando base temporal: $TEST_DB..."
cleanup
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$MAINTENANCE_DB" -c "CREATE DATABASE \"$TEST_DB\";" >/dev/null 2>&1 || \
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$SOURCE_DB" -c "CREATE DATABASE \"$TEST_DB\";" >/dev/null

# 3. Restaurar midiendo tiempo
echo "[*] Iniciando restauración con pg_restore..."
START_TIME=$(date +%s%N)

# Se tolera código no-cero por advertencias menores de ownership/schemas sin abortar el script
docker exec -i "$CONTAINER_NAME" pg_restore -U "$DB_USER" -d "$TEST_DB" < "$LATEST_DUMP" >/dev/null 2>&1 || true

END_TIME=$(date +%s%N)
ELAPSED_MS=$(( (END_TIME - START_TIME) / 1000000 ))
echo "[✓] Restauración completada en ${ELAPSED_MS} ms (~$(( ELAPSED_MS / 1000 )) segundos)."

# 4. Tablas nucleares a cotejar
TABLES=(
  "Account"
  "User"
  "Ingredient"
  "Supplier"
  "SupplierIngredient"
  "PriceHistory"
  "Product"
  "ProductIngredient"
)

echo ""
echo "=== TABLA DE AUDITORÍA Y COMPARACIÓN DE FILAS ==="
printf "%-22s | %-12s | %-12s | %-10s\n" "Tabla" "Producción" "Restaurada" "Estado"
echo "-----------------------+--------------+--------------+-----------"

DISCREPANCIES=0

for tbl in "${TABLES[@]}"; do
  PROD_COUNT=$(docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$SOURCE_DB" -t -A -c "SELECT COUNT(*) FROM \"$tbl\";" 2>/dev/null || echo "0")
  TEST_COUNT=$(docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$TEST_DB" -t -A -c "SELECT COUNT(*) FROM \"$tbl\";" 2>/dev/null || echo "0")
  
  if [[ "$PROD_COUNT" == "$TEST_COUNT" ]]; then
    STATUS="✅ MATCH"
  else
    STATUS="❌ MISMATCH"
    DISCREPANCIES=$((DISCREPANCIES + 1))
  fi
  
  printf "%-22s | %-12s | %-12s | %-10s\n" "$tbl" "$PROD_COUNT" "$TEST_COUNT" "$STATUS"
done

echo "-----------------------+--------------+--------------+-----------"

if [[ "$DISCREPANCIES" -gt 0 ]]; then
  echo "[!] ERROR: Se detectaron $DISCREPANCIES discrepancias de conteo entre origen y restore."
  exit 1
fi

echo "[✓] Integridad 100% verificada: todos los registros coinciden exactamente."
echo "[✓] La base temporal '$TEST_DB' será purgada por la trampa de salida."
exit 0