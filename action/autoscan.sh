#!/usr/bin/env bash
# Roda uma varredura do SkunkScan e falha se a nota ficar abaixo da minima.
# Uso: DOMAIN=site.com.br MIN_GRADE=B API_URL=https://... ./autoscan.sh
# Precisa de bash, curl e node (todos ja vem nos runners do GitHub).
set -euo pipefail

DOMAIN="${DOMAIN:?informe o dominio}"
MIN_GRADE="${MIN_GRADE:-B}"
API_URL="${API_URL:-https://skunkscan-api.aruanapedro.workers.dev}"

case "$MIN_GRADE" in A | B | C | D) ;; *)
  echo "::error::min-grade deve ser A, B, C ou D (recebi: $MIN_GRADE)"
  exit 2
  ;;
esac

# so letras, numeros, ponto e hifen: o valor vai para um JSON e para o log
if ! [[ "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo "::error::dominio invalido: $DOMAIN"
  exit 2
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

status="$(curl -sS -N --max-time 120 -o "$tmp" -w '%{http_code}' \
  -X POST "$API_URL/api/scan" \
  -H 'content-type: application/json' \
  -d "{\"domain\":\"$DOMAIN\"}" || true)"

if [ "$status" != "200" ]; then
  echo "::error::a API respondeu $status: $(head -c 300 "$tmp")"
  [ "$status" = "429" ] && exit 3
  exit 2
fi

# le o stream SSE e imprime os problemas; a ultima linha e "nota graves medios id" do evento done
summary="$(node -e '
const text = require("fs").readFileSync(process.argv[1], "utf8")
let done = null
for (const block of text.split("\n\n")) {
  const ev = /^event: (.*)$/m.exec(block)?.[1]
  const raw = /^data: (.*)$/m.exec(block)?.[1]
  if (!ev || !raw) continue
  const data = JSON.parse(raw)
  if (ev === "finding" && (data.severity === "grave" || data.severity === "medio")) console.log("- [" + data.severity + "] " + data.title)
  if (ev === "done") done = data
}
if (!done) process.exit(4)
console.log("@@ " + [done.grade || "-", done.grave || 0, done.medio || 0, done.id || "-"].join(" "))
' "$tmp")" || {
  echo "::error::a varredura terminou sem resultado"
  exit 2
}

printf '%s\n' "$summary" | grep -v '^@@ ' || true
read -r _ grade grave medio report_id <<<"$(printf '%s\n' "$summary" | grep '^@@ ')"

if [ "$grade" = "-" ]; then
  echo "::error::sem nota: o site nao respondeu a requisicao web"
  exit 2
fi

echo "nota $grade: $grave graves, $medio medios"
[ "$report_id" != "-" ] && echo "relatorio: $API_URL/api/r/$report_id"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "grade=$grade"
    echo "grave=$grave"
    echo "medio=$medio"
    [ "$report_id" != "-" ] && echo "report-id=$report_id"
  } >> "$GITHUB_OUTPUT"
fi

# A < B < C < D: nota pior que a minima derruba o job
if [[ "$grade" > "$MIN_GRADE" ]]; then
  echo "::error::nota $grade abaixo da minima $MIN_GRADE"
  exit 1
fi
