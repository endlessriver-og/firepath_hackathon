#!/usr/bin/env bash
# Share FirePath publicly from this machine for a live demo: starts the server (keeping the Mac awake)
# and opens an HTTPS tunnel through localhost.run over SSH (works on networks that block other tunnels).
# The URL is printed below; it changes each time the tunnel restarts. Ctrl-C stops sharing.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node/bin:$PATH" GLENDALE_GIS_PYTHON="${GLENDALE_GIS_PYTHON:-.venv/bin/python}"
npm run build:demo >/dev/null
if ! curl -s -o /dev/null http://localhost:5173/app/; then
  nohup caffeinate -i node server.mjs > /tmp/firepath-server.log 2>&1 &
  sleep 2
fi
echo "FirePath server on http://localhost:5173 — opening public tunnel..."
exec ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes -R 80:localhost:5173 nokey@localhost.run
