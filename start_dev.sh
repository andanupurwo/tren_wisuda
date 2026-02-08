#!/bin/bash

# Function to kill background processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $(jobs -p)
}
trap cleanup EXIT

echo "Starting Backend on http://localhost:8000..."
python3 -m uvicorn backend.main:app --reload &

echo "Starting Frontend on http://localhost:3000..."
cd frontend
npm run dev &

# Wait for any process to exit
# Wait for both processes
wait
