#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

if [ -f "$BACKEND_DIR/venv/Scripts/activate" ]; then
  VENV_ACTIVATE="source \"$BACKEND_DIR/venv/Scripts/activate\""
elif [ -f "$BACKEND_DIR/venv/bin/activate" ]; then
  VENV_ACTIVATE="source \"$BACKEND_DIR/venv/bin/activate\""
else
  echo "Virtual environment not found. Create one in backend/ first:"
  echo "  cd backend && python -m venv venv"
  exit 1
fi

echo "Starting SHARE..."

bash -c "cd \"$BACKEND_DIR\" && $VENV_ACTIVATE && uvicorn app.main:app --reload --port 8000" &
BACKEND_PID=$!

sleep 2

bash -c "cd \"$FRONTEND_DIR\" && npm run dev" &
FRONTEND_PID=$!

echo ""
echo "SHARE is running!"
echo "    Frontend: http://localhost:3000"
echo "    Backend:  http://127.0.0.1:8000"
echo "    API Docs: http://127.0.0.1:8000/docs"
echo ""
echo "Press Ctrl+C to stop everything"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
