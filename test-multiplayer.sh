#!/bin/bash
echo "🔍 Multiplayer Debug Test"
echo "========================"

# Start servers in background
echo "1. Starting servers..."
node server.js &
SERVER_PID=$!
sleep 2

node simple-lobby-server.js &
LOBBY_PID=$!
sleep 2

echo "✅ Servers started (HTTP: $SERVER_PID, WebSocket: $LOBBY_PID)"
echo ""
echo "2. Testing WebSocket connection..."
echo "   Open browser to: http://localhost:3000"
echo "   Click 'Multiplayer Lobby' button"
echo "   Check browser console for messages"
echo ""
echo "3. Expected flow:"
echo "   ✅ Connect to WebSocket server"
echo "   ✅ Show waiting room"
echo "   ✅ Click 'Ready Up'"
echo "   ✅ Game starts after 3 seconds (even with 1 player)"
echo ""
echo "4. Debug commands:"
echo "   - Check server logs: tail -f /dev/null (servers running)"
echo "   - Check ports: netstat -tulpn | grep -E '3000|8080'"
echo "   - Kill servers: kill $SERVER_PID $LOBBY_PID"
echo ""
echo "📝 Server should show:"
echo "   'All 1 player(s) ready! Starting game in 3 seconds...'"
echo ""
echo "Press Ctrl+C to stop servers"

# Wait for user to test
wait $SERVER_PID $LOBBY_PID