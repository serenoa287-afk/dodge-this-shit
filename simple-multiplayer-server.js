// Simple Multiplayer Server for Dodge This Shit
const WebSocket = require('ws');
const http = require('http');

class SimpleMultiplayerServer {
    constructor(port = 8080) {
        this.port = port;
        this.server = http.createServer();
        this.wss = new WebSocket.Server({ server: this.server });
        
        this.players = new Map();
        this.nextPlayerId = 1;
        
        this.setupWebSocket();
    }
    
    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            const playerId = `player${this.nextPlayerId++}`;
            console.log(`Player connected: ${playerId}`);
            
            // Create player object
            const player = {
                id: playerId,
                ws: ws,
                name: `Player${this.nextPlayerId - 1}`,
                x: 400,
                y: 300,
                color: this.getRandomColor(),
                connected: true
            };
            
            this.players.set(playerId, player);
            
            // Send welcome message
            ws.send(JSON.stringify({
                type: 'welcome',
                playerId: playerId,
                name: player.name,
                color: player.color
            }));
            
            // Send list of existing players
            this.sendPlayerList(playerId);
            
            // Notify other players
            this.broadcast({
                type: 'playerJoined',
                playerId: playerId,
                name: player.name,
                color: player.color,
                x: player.x,
                y: player.y
            }, playerId);
            
            // Handle messages
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(playerId, message);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            });
            
            // Handle disconnection
            ws.on('close', () => {
                console.log(`Player disconnected: ${playerId}`);
                this.handleDisconnect(playerId);
            });
        });
    }
    
    handleMessage(playerId, message) {
        const player = this.players.get(playerId);
        if (!player) return;
        
        switch (message.type) {
            case 'move':
                // Update player position
                player.x = message.x;
                player.y = message.y;
                
                // Broadcast to other players
                this.broadcast({
                    type: 'playerMoved',
                    playerId: playerId,
                    x: message.x,
                    y: message.y
                }, playerId);
                break;
                
            case 'chat':
                // Broadcast chat message
                this.broadcast({
                    type: 'chat',
                    playerId: playerId,
                    playerName: player.name,
                    message: message.text
                });
                break;
                
            case 'action':
                // Broadcast player action (dash, etc.)
                this.broadcast({
                    type: 'playerAction',
                    playerId: playerId,
                    action: message.action
                }, playerId);
                break;
        }
    }
    
    handleDisconnect(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            player.connected = false;
            
            // Notify other players
            this.broadcast({
                type: 'playerLeft',
                playerId: playerId
            });
            
            // Remove after delay
            setTimeout(() => {
                this.players.delete(playerId);
            }, 5000);
        }
    }
    
    sendPlayerList(toPlayerId) {
        const player = this.players.get(toPlayerId);
        if (!player) return;
        
        const otherPlayers = Array.from(this.players.values())
            .filter(p => p.id !== toPlayerId && p.connected)
            .map(p => ({
                id: p.id,
                name: p.name,
                color: p.color,
                x: p.x,
                y: p.y
            }));
        
        player.ws.send(JSON.stringify({
            type: 'playerList',
            players: otherPlayers
        }));
    }
    
    broadcast(message, excludePlayerId = null) {
        this.players.forEach((player, playerId) => {
            if (player.connected && playerId !== excludePlayerId) {
                if (player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify(message));
                }
            }
        });
    }
    
    getRandomColor() {
        const colors = ['#00ffea', '#ff6b6b', '#ffa500', '#9400d3', '#0088ff', '#00ff00'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    start() {
        this.server.listen(this.port, () => {
            console.log(`
            🎮 Simple Multiplayer Server
            =============================
            Server running on port: ${this.port}
            WebSocket endpoint: ws://localhost:${this.port}
            
            Features:
            - Player connection/disconnection
            - Position synchronization
            - Basic chat
            - Player actions
            
            To test:
            1. Open game in browser
            2. Click "Online Multiplayer"
            3. Connect to ws://localhost:${this.port}
            `);
        });
    }
    
    stop() {
        this.wss.close();
        this.server.close();
        console.log('Server stopped');
    }
}

// Start server if run directly
if (require.main === module) {
    const port = process.env.PORT || 8080;
    const server = new SimpleMultiplayerServer(port);
    server.start();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n👋 Shutting down server...');
        server.stop();
        process.exit(0);
    });
}

module.exports = SimpleMultiplayerServer;