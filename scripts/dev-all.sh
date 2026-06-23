#!/usr/bin/env bash
# Bring the whole HomeHero stack up locally: monolith + auth-service + gateway + frontend + ai-services.
# Layout: backend/ (Node services), ai-services/ (Python FastAPI) and frontend/ (React app).
# Usage: bash scripts/dev-all.sh   (Ctrl-C stops everything)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p /tmp/homehero-logs

echo "▸ Stopping any previous instances…"
pkill -f "server/api.js" 2>/dev/null || true
pkill -f "services/auth-service/server.js" 2>/dev/null || true
pkill -f "services/payment-service/server.js" 2>/dev/null || true
pkill -f "services/booking-service/server.js" 2>/dev/null || true
pkill -f "services/gateway/server.js" 2>/dev/null || true
pkill -f "uvicorn" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

echo "▸ Starting monolith (:4001)…"
( cd "$ROOT/backend" && node server/api.js ) > /tmp/homehero-logs/monolith.log 2>&1 &
echo "▸ Starting auth-service (:4101)…"
( cd "$ROOT/backend" && node services/auth-service/server.js ) > /tmp/homehero-logs/auth.log 2>&1 &
echo "▸ Starting payment-service (:4102)…"
( cd "$ROOT/backend" && node services/payment-service/server.js ) > /tmp/homehero-logs/payment.log 2>&1 &
echo "▸ Starting booking-service (:4103)…"
( cd "$ROOT/backend" && node services/booking-service/server.js ) > /tmp/homehero-logs/booking.log 2>&1 &
echo "▸ Starting Python AI Service (:8000)…"
( cd "$ROOT/ai-services" && ./venv/bin/uvicorn app.main:app --port 8000 ) > /tmp/homehero-logs/ai.log 2>&1 &
sleep 2
echo "▸ Starting API gateway (:4000)…"
( cd "$ROOT/backend" && node services/gateway/server.js ) > /tmp/homehero-logs/gateway.log 2>&1 &
sleep 1
echo "▸ Starting frontend (:8080)…"
( cd "$ROOT/frontend" && npm run dev -- --port 8080 ) > /tmp/homehero-logs/frontend.log 2>&1 &

sleep 5
echo ""
echo "──────────────────────────────────────────────"
for pair in "Gateway:4000/gateway/health" "auth-service:4101/api/v1/health" "payment-service:4102/api/v1/health" "booking-service:4103/api/v1/health" "monolith:4001/api/v1/health" "ai-services:8000/health"; do
  name=${pair%%:*}; url=${pair#*:}
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 localhost:$url || echo 000)
  echo "  $name … HTTP $code"
done
echo "  Frontend  … http://localhost:8080"
echo "──────────────────────────────────────────────"
echo "Logs: /tmp/homehero-logs/   ·   Ctrl-C to stop all"
wait
