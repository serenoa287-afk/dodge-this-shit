#!/bin/bash
# Run Dodge This Shit game server inside OpenClaw container

echo "🎮 Starting Dodge This Shit Game Server..."

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: server.js not found. Are you in the game directory?"
    echo "Try: cd dodge-this-shit-game"
    exit 1
fi

# Check if port 3000 is already in use
if lsof -i :3000 > /dev/null 2>&1; then
    echo "⚠️  Port 3000 is already in use. Trying to find existing server..."
    ps aux | grep -E "node.*server\.js" | grep -v grep
    echo ""
    echo "If server is already running, you can access it at: http://localhost:3000"
    echo "If you want to restart, kill the existing process first."
    exit 0
fi

# Start the server in the background
echo "🚀 Starting server on port 3000..."
node server.js &
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

# Check if server started successfully
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Server started successfully! PID: $SERVER_PID"
    echo ""
    echo "🌐 Access the game at:"
    echo "   - Local: http://localhost:3000"
    echo "   - From host machine: http://[HOST_IP]:3000"
    echo ""
    echo "🔧 To stop the server: kill $SERVER_PID"
    echo ""
    echo "📝 Server logs will continue in background. To view logs:"
    echo "   tail -f /proc/$SERVER_PID/fd/1"
    
    # Save PID to file for easy management
    echo $SERVER_PID > .server.pid
    echo "📁 PID saved to .server.pid"
    
    # Wait for user to press Ctrl+C
    echo ""
    echo "Press Ctrl+C to stop watching (server will continue running)"
    wait $SERVER_PID
else
    echo "❌ Failed to start server!"
    exit 1
fi