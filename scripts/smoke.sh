#!/usr/bin/env bash
# Smoke-test a FirePath deployment end to end: static app and maps, the Python GIS function, the
# address check and its separate City records call, tap-to-inspect, and an account that must
# persist across requests (the Blob store). Usage: scripts/smoke.sh [base-url]
set -uo pipefail
BASE="${1:-https://firepath-ruddy.vercel.app}"
fail=0
ok() { printf '  ok    %s\n' "$1"; }
bad() { printf '  FAIL  %s\n' "$1"; fail=1; }
code() { curl -s -o /dev/null -w '%{http_code}' -m 30 "$@"; }

echo "Smoke test: $BASE"
health=$(curl -s -m 30 "$BASE/api/health")
echo "$health" | grep -q '"ok":true' && ok "health: $(echo "$health" | python3 -c 'import json,sys; print(json.load(sys.stdin)["version"])' 2>/dev/null)" || bad "health: ${health:0:120}"
for p in /app/ /map.html /map3d.html /map-layers/combined.json /map-layers/zoning.geojson; do
  [ "$(code "$BASE$p")" = 200 ] && ok "GET $p" || bad "GET $p"
done

# Security headers set in vercel.json (the local server does not send them).
if [[ "$BASE" != *localhost* && "$BASE" != *127.0.0.1* ]]; then
  hdrs=$(curl -s -m 30 -D - -o /dev/null "$BASE/app/" | tr 'A-Z' 'a-z')
  missing=""
  for h in "x-content-type-options: nosniff" "x-frame-options: sameorigin" "referrer-policy: strict-origin-when-cross-origin" "permissions-policy: camera=()"; do echo "$hdrs" | grep -q "$h" || missing="$missing [$h]"; done
  [ -z "$missing" ] && ok "security headers" || bad "security headers missing:$missing"
  [ "$(curl -s -m 30 -D - -o /dev/null "$BASE/api/health" | tr 'A-Z' 'a-z' | grep -c 'cache-control: no-store')" = 1 ] && ok "API responses are no-store" || bad "API responses are cacheable"
fi

# /api/gis is the Vercel Python function; a local server runs the lookup as a Python process instead.
if [[ "$BASE" != *localhost* && "$BASE" != *127.0.0.1* ]]; then
  gis=$(curl -s -m 60 "$BASE/api/gis")
  echo "$gis" | grep -q '"ok": true' && ok "GIS function warm (GET)" || bad "GIS warm-up: ${gis:0:120}"
  [ "$(code -X POST "$BASE/api/gis" -H 'content-type: application/json' -d '{"lat":34.2,"lon":-118.23}')" = 403 ] && ok "GIS lookups refused without the internal key" || bad "GIS POST is open to the public"
fi

check=$(curl -s -m 60 -X POST "$BASE/api/public/check" -H 'content-type: application/json' -d '{"address":"1613 Glencoe Way"}')
echo "$check" | grep -q '"layers"' && ok "address check returns hazard layers" || bad "address check: ${check:0:120}"
echo "$check" | grep -q '"records"' && bad "address check still waits on City records" || ok "address check does not wait on City records"

records=$(curl -s -m 60 "$BASE/api/public/records?address=1613%20GLENCOE%20WAY")
echo "$records" | grep -q '"totals"' && ok "City records route" || bad "City records: ${records:0:120}"

point=$(curl -s -m 60 "$BASE/api/public/point?lat=34.19912&lon=-118.2311")
echo "$point" | grep -q '"apn"' && ok "tap-to-inspect parcel" || bad "tap-to-inspect: ${point:0:120}"
echo "$point" | grep -q '"zoning"' && ok "tap-to-inspect neighborhood" || bad "tap-to-inspect neighborhood missing"

token=$(curl -s -m 60 -X POST "$BASE/api/demo/start" -H 'content-type: application/json' -d '{}' | python3 -c 'import json,sys; print(json.load(sys.stdin).get("token",""))' 2>/dev/null)
if [ -n "$token" ]; then
  ok "demo household created"
  for i in 1 2 3; do
    name=$(curl -s -m 30 "$BASE/api/me" -H "authorization: Bearer $token" | python3 -c 'import json,sys; print(json.load(sys.stdin)["user"]["name"])' 2>/dev/null)
    [ "$name" = "Dana Rivera" ] && ok "account persists (read $i)" || bad "account read $i: '$name'"
  done
else
  bad "demo household could not be created"
fi

[ $fail = 0 ] && echo "All checks passed." || echo "Some checks FAILED."
exit $fail
