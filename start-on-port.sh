#!/bin/bash
# Start game server on a specific port

PORT=${1:-3001}  # Default to 3001 if not specified

echo "🎮 Starting Dodge This Shit Game Server on port $PORT..."

# Check if port is already in use
if ss -tulpn 2>/dev/null | grep -q ":$PORT "; then
    echo "❌ Port $PORT is already in use!"
    echo "   Try a different port: ./start-on-port.sh 3002"
    exit 1
fi

# Start server with custom port
PORT=$PORT node server.js &
SERVER_PID=$!

sleep 2

if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Server started on port $PORT! PID: $SERVER_PID"
    echo ""
    echo "🌐 Access at: http://localhost:$PORT"
    echo ""
    echo "🔧 To stop: kill $SERVER_PID"
    echo ""
    echo "📝 Server logs:"
    tail -f /proc/$SERVER_PID/fd/1
else
    echo "❌ Failed to start server!"
    exit 1
fi