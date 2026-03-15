#!/bin/bash
# Start both game server and multiplayer server

echo "🎮 Starting Dodge This Shit Game Servers..."

# Start game server (port 3000)
echo "🚀 Starting game server on port 3000..."
node server.js &
GAME_PID=$!
sleep 2

# Start multiplayer server (port 8080) 
echo "🎮 Starting multiplayer server on port 8080..."
node simple-multiplayer-server.js &
MP_PID=$!
sleep 2

# Check if both started
if ps -p $GAME_PID > /dev/null && ps -p $MP_PID > /dev/null; then
    echo ""
    echo "✅ Both servers started successfully!"
    echo "   Game server PID: $GAME_PID"
    echo "   Multiplayer server PID: $MP_PID"
    echo ""
    echo "🌐 Access URLs:"
    echo "   - Game: http://localhost:3000"
    echo "   - Multiplayer WebSocket: ws://localhost:8080"
    echo ""
    echo "🔧 To stop both servers:"
    echo "   kill $GAME_PID $MP_PID"
    echo ""
    echo "📝 Watching logs (Ctrl+C to stop watching, servers continue)..."
    
    # Save PIDs
    echo $GAME_PID > .game.pid
    echo $MP_PID > .mp.pid
    
    # Tail logs
    tail -f /proc/$GAME_PID/fd/1 /proc/$MP_PID/fd/1
else
    echo "❌ Failed to start one or both servers!"
    kill $GAME_PID $MP_PID 2>/dev/null
    exit 1
fi