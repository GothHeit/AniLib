#!/usr/bin/env bash
# Sobe MongoDB (Docker), backend (FastAPI) e frontend (estático).
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
LOGS="$ROOT/.logs"
mkdir -p "$LOGS"

echo "==> MongoDB (Docker)"
(cd "$BACKEND" && docker compose up -d)

echo "==> Backend (FastAPI, porta 8000)"
(cd "$BACKEND" && nohup .venv/bin/uvicorn main:app --reload --port 8000 > "$LOGS/backend.log" 2>&1 & disown)

echo "==> Frontend (porta 5500)"
(cd "$FRONTEND" && nohup python3 -m http.server 5500 > "$LOGS/frontend.log" 2>&1 & disown)

sleep 2
echo ""
echo "Backend:  http://localhost:8000/docs"
echo "Frontend: http://localhost:5500"
echo ""
echo "Logs em: $LOGS/backend.log e $LOGS/frontend.log"
echo "Pra derrubar tudo: ./stop.sh"
