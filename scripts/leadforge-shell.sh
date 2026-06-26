#!/usr/bin/env sh
set -eu

COMMAND="${1:-help}"

case "$COMMAND" in
  dev)
    npm run dev
    ;;
  build)
    npm run build
    ;;
  start)
    npm run start
    ;;
  lint)
    npm run lint
    ;;
  run-queue)
    curl -X POST "${APP_URL:-http://localhost:3000}/api/outreach/run-pending"
    ;;
  help|*)
    echo "LeadForge shell"
    echo "Usage: ./scripts/leadforge-shell.sh [dev|build|start|lint|run-queue]"
    ;;
esac
