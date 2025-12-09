#!/bin/bash

# Cross-Domain Tracking Test - Server Startup Script
# This script starts both servers without Node.js dependencies

echo ""
echo "========================================"
echo "  Adobe Analytics Cross-Domain Test"
echo "========================================"
echo ""

# Change to script directory
cd "$(dirname "$0")"

# Start Site A in background
echo "Starting Site A on port 3001..."
PORT=3001 node site-a/server.js &
PID_A=$!

# Start Site B in background
echo "Starting Site B on port 3002..."
PORT=3002 node site-b/server.js &
PID_B=$!

echo ""
echo "Servers started successfully!"
echo ""
echo "Access the test sites at:"
echo "  Site A: http://localhost:3001/"
echo "  Site B: http://localhost:3002/"
echo ""
echo "Press Ctrl+C to stop all servers."
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $PID_A 2>/dev/null
    kill $PID_B 2>/dev/null
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
