#!/bin/bash

# 1. Make the script executable (Run this once in terminal)
# chmod +x /d/final/SHARE/SHARE_v2/start.sh

echo "Starting SHARE..."

# Start backend
# Navigates to the backend folder, activates venv, and starts Uvicorn
bash -c "cd /d/code/Projects/final/SHARE/SHARE_v2/backend && source venv/Scripts/activate && uvicorn app.main:app --reload --port 8000" &
BACKEND_PID=$!

# Wait for backend to stabilize
sleep 2

# Start frontend
# Navigates to the frontend folder and starts the dev server
bash -c "cd /d/code/Projects/final/SHARE/SHARE_v2/frontend && npm run dev" &
FRONTEND_PID=$!

echo ""
echo "SHARE is running!"
echo "    Frontend: http://localhost:3000"
echo "    Backend:  http://127.0.0.1:8000"
echo "    API Docs: http://127.0.0.1:8000/docs"
echo ""
echo "Press Ctrl+C to stop everything"

# Trap to kill both processes on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait