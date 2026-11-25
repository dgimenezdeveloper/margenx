#!/bin/bash
# Regresión de las 13 colecciones de Postman (issue #399).
#
# Uso, desde backend/tests/postman:
#   INTERNAL_WEBHOOK_SECRET=<el del .env del backend> ./run-regresion.sh <carpeta de evidencia>
#
# Para la regresión final, la carpeta es la de la issue:
#   INTERNAL_WEBHOOK_SECRET=<secreto> ./run-regresion.sh ../../../docs/qa/evidencias/399
#
# Para volver a correr solo algunas (por ejemplo, después de un arreglo), SOLO con sus números:
#   SOLO="03 11" INTERNAL_WEBHOOK_SECRET=<secreto> ./run-regresion.sh <carpeta>
#
# Requisitos: los de docs/qa/ejecutar-colecciones-postman.md (base local sembrada, backend en
# localhost:3000, newman instalado, CLERK_SECRET_KEY en backend/.env y los usuarios de Química
# GyJ en Clerk). Corre las 12 colecciones de esa guía y, al final, la de estrés, que cambia
# precios del seed. Pide un token de Clerk nuevo para cada colección, porque duran ~60 s.
#
# Deja, numerados en el orden de la corrida:
#   NN-newman-<colección>.txt  salida de consola sin colores, con un encabezado (fecha, commit,
#                              versiones y comando);
#   NN-newman-<colección>.xml  reporte JUnit;
#   00-resumen.md              tabla con pedidos, aserciones y resultado de cada colección
#                              (00-resumen-parcial.md si se usó SOLO).
# Los tokens de Clerk y el secreto del webhook se reemplazan por [TOKEN] y [SECRETO] en los
# tres. Sale con 1 si alguna colección falló o no se pudo correr.
set -uo pipefail

if [ "$#" -ne 1 ]; then
  echo "Uso: INTERNAL_WEBHOOK_SECRET=<secreto> ./run-regresion.sh <carpeta de evidencia>"
  exit 1
fi

if [ -z "${INTERNAL_WEBHOOK_SECRET:-}" ]; then
  echo "Falta la variable de entorno INTERNAL_WEBHOOK_SECRET (la misma del .env del backend)."
  exit 1
fi

if ! command -v newman >/dev/null 2>&1; then
  echo "Falta newman: npm install -g newman"
  exit 1
fi

POSTMAN_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$POSTMAN_DIR/../.." && pwd)"
mkdir -p "$1"
OUT_DIR="$(cd "$1" && pwd)"
cd "$POSTMAN_DIR"

COMMIT="$(git -C "$BACKEND_DIR" rev-parse --short HEAD 2>/dev/null || echo 'sin git')"
FECHA="$(date '+%d/%m/%Y %H:%M')"
VERSIONES="newman $(newman --version), Node $(node --version)"
RESUMEN="$OUT_DIR/00-resumen.md"
# Una corrida parcial no pisa el resumen de la completa.
if [ -n "${SOLO:-}" ]; then
  RESUMEN="$OUT_DIR/00-resumen-parcial.md"
fi
FALLAS=0
FILAS=()

# Reemplaza los JWT de Clerk y el secreto del webhook, y saca los códigos de color que Newman
# deja en la tabla de fallas aunque se pida --color off.
limpiar() {
  SECRETO="$INTERNAL_WEBHOOK_SECRET" perl -pe \
    's/\e\[[0-9;]*m//g; s/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/[TOKEN]/g; s/\Q$ENV{SECRETO}\E/[SECRETO]/g'
}

# Token nuevo de uno de los usuarios del seed (scripts/get-test-token.ts), o vacío si falla.
token() {
  (cd "$BACKEND_DIR" && npx tsx scripts/get-test-token.ts "$1" 2>/dev/null | grep -E '^eyJ' | head -n 1)
}

# Ejecutados y fallidos de una fila de la tabla final de Newman ("requests" o "assertions").
fila_newman() {
  local valores
  valores="$(grep -E "│ +$2 │" "$1" | grep -oE '[0-9]+' | head -n 2 | paste -sd ' ' -)"
  if [ -z "$valores" ]; then
    echo "—"
  else
    set -- $valores
    if [ "$2" = "1" ]; then
      echo "$1 (1 falla)"
    else
      echo "$1 ($2 fallas)"
    fi
  fi
}

# correr <NN> <archivo> <colección> <script> [usuario del seed para cada token, en orden]
correr() {
  local nn="$1" archivo="$2" coleccion="$3" script="$4"
  shift 4

  if [ -n "${SOLO:-}" ] && [[ " $SOLO " != *" $nn "* ]]; then
    return
  fi

  echo "== $nn $coleccion"
  local tokens=() usuario valor
  for usuario in "$@"; do
    valor="$(token "$usuario")"
    if [ -z "$valor" ]; then
      echo "   No se pudo generar el token de $usuario: la colección no se corrió."
      FILAS+=("| $nn | $coleccion | — | — | ❌ Sin token de \`$usuario\` | — |")
      FALLAS=$((FALLAS + 1))
      return
    fi
    tokens+=("$valor")
  done

  local txt="$OUT_DIR/$nn-newman-$archivo.txt"
  local xml="$OUT_DIR/$nn-newman-$archivo.xml"
  local xml_crudo
  xml_crudo="$(mktemp)"
  local placeholders=""
  for usuario in "$@"; do
    placeholders+="<token de $usuario> "
  done

  {
    echo "# Issue #399 — MargenX - $coleccion"
    echo "# Fecha: $FECHA. Commit: $COMMIT. $VERSIONES."
    echo "# Comando, desde backend/tests/postman (generado por run-regresion.sh):"
    echo "#   ./$script ${placeholders}--color off --reporters cli,junit --reporter-junit-export $nn-newman-$archivo.xml"
    echo "# Salida de consola de Newman. Tokens y secreto reemplazados por [TOKEN] y [SECRETO]."
    echo
  } > "$txt"

  "./$script" ${tokens[@]+"${tokens[@]}"} \
    --color off --reporters cli,junit --reporter-junit-export "$xml_crudo" 2>&1 | limpiar >> "$txt"
  local codigo="${PIPESTATUS[0]}"

  if [ -s "$xml_crudo" ]; then
    limpiar < "$xml_crudo" > "$xml"
  fi
  rm -f "$xml_crudo"

  local resultado="✅ 0 fallas"
  if [ "$codigo" -ne 0 ]; then
    resultado="❌ Falló (código $codigo)"
    FALLAS=$((FALLAS + 1))
  fi
  echo "   $resultado"

  FILAS+=("| $nn | $coleccion | $(fila_newman "$txt" requests) | $(fila_newman "$txt" assertions) | $resultado | [$nn-newman-$archivo.txt]($nn-newman-$archivo.txt) |")
}

correr 01 insumos             "Insumos API"                  run-tests.sh                  panaderia-admin quimica-admin
correr 02 productos           "Productos API"                run-tests-productos.sh        panaderia-admin quimica-admin
correr 03 proveedores         "Proveedores y Conversiones"   run-tests-proveedores.sh      panaderia-admin quimica-admin
correr 04 webhooks            "Webhooks API"                 run-tests-webhooks.sh
correr 05 rbac-colaborador    "Colaborador RBAC API"         run-tests-rbac-colaborador.sh panaderia-colab
correr 06 alertas-margen      "Alertas de margen (Insumos)"  run-tests-alertas-margen.sh   panaderia-admin panaderia-colab
correr 07 cuarentena          "Cuarentena API"               run-tests-cuarentena.sh       panaderia-admin
correr 08 dashboard           "Dashboard API"                run-tests-dashboard.sh        panaderia-admin panaderia-colab
correr 09 colaboradores       "Colaboradores API"            run-tests-colaboradores.sh    panaderia-admin panaderia-colab
correr 10 compras             "Compras API"                  run-tests-compras.sh          panaderia-admin panaderia-colab
correr 11 reportes            "Reportes API"                 run-tests-reportes.sh         panaderia-admin panaderia-colab
correr 12 ventas              "Ventas API"                   run-tests-ventas.sh           panaderia-admin panaderia-colab
# Última: cambia precios del seed (README-IngestaEstres.md).
correr 13 ingesta-estres      "Estrés de ingesta"            run-tests-ingesta-estres.sh   panaderia-admin

{
  echo "# Regresión de colecciones de Postman — resumen"
  echo
  echo "Fecha: $FECHA. Commit: \`$COMMIT\`. $VERSIONES."
  if [ -n "${SOLO:-}" ]; then
    echo
    echo "Corrida parcial: colecciones $SOLO."
  fi
  echo
  echo "| # | Colección | Pedidos | Aserciones | Resultado | Evidencia |"
  echo "|---|---|---|---|---|---|"
  printf '%s\n' ${FILAS[@]+"${FILAS[@]}"}
} | limpiar > "$RESUMEN"

echo
cat "$RESUMEN"
echo
echo "Evidencia en: $OUT_DIR"

if [ "$FALLAS" -gt 0 ]; then
  echo "$FALLAS colección(es) con fallas o sin correr."
  exit 1
fi
