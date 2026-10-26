#!/usr/bin/env bash
# Derruba backend, frontend e MongoDB (Docker).
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"

echo "==> Parando backend"
pkill -f "uvicorn main:app" 2>/dev/null && echo "backend parado" || echo "backend já estava parado"

echo "==> Parando frontend"
pkill -f "http.server 5500" 2>/dev/null && echo "frontend parado" || echo "frontend já estava parado"

echo "==> Parando MongoDB (Docker)"
(cd "$BACKEND" && docker compose stop)

echo "Tudo parado."
