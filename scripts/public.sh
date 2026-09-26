#!/usr/bin/env bash
# Share FirePath publicly from this machine for a live demo: starts the server (keeping the Mac awake)
# and opens an HTTPS tunnel through localhost.run over SSH (works on networks that block other tunnels).
# Reconnects if the tunnel drops and pings the public URL every 2 minutes so it is never idle.
# The current URL is printed and written to /tmp/firepath-public-url. Ctrl-C stops sharing.
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node/bin:$PATH" GLENDALE_GIS_PYTHON="${GLENDALE_GIS_PYTHON:-.venv/bin/python}"
npm run build:demo >/dev/null
if ! curl -s -o /dev/null http://localhost:5173/app/; then
  nohup caffeinate -i node server.mjs > /tmp/firepath-server.log 2>&1 &
  sleep 2
fi
LOG=/tmp/firepath-tunnel.log
( while true; do  # keepalive: localhost.run closes idle tunnels
    url=$(cat /tmp/firepath-public-url 2>/dev/null || true)
    [ -n "$url" ] && curl -s -o /dev/null "$url/app/"
    sleep 120
  done ) &
KEEPALIVE=$!
trap 'kill $KEEPALIVE 2>/dev/null' EXIT
while true; do
  : > "$LOG"
  ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes -R 80:localhost:5173 nokey@localhost.run > "$LOG" 2>&1 &
  SSH=$!
  for _ in $(seq 1 30); do url=$(grep -oE 'https://[a-z0-9]+\.lhr\.life' "$LOG" | head -1); [ -n "$url" ] && break; sleep 1; done
  if [ -n "${url:-}" ]; then echo "$url" > /tmp/firepath-public-url; echo "$(date +%H:%M) FirePath is public at: $url"; fi
  wait $SSH
  echo "$(date +%H:%M) tunnel closed; reconnecting in 5s..."
  sleep 5
done
