const WebSocket = require('ws');
const http = require('http');

class MultiplayerServer {
    constructor(port = 8080) {
        this.port = port;
        this.server = http.createServer();
        this.wss = new WebSocket.Server({ server: this.server });
        
        // Game state
        this.players = new Map(); // playerId -> { ws, name, lobbyId, position }
        this.lobbies = new Map(); // lobbyId -> { players: [], gameState }
        
        this.setupWebSocket();
    }
    
    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            const playerId = this.generateId();
            console.log(`Player connected: ${playerId}`);
            
            // Create player object
            const player = {
                id: playerId,
                ws: ws,
                name: `Player${Math.floor(Math.random() * 1000)}`,
                lobbyId: null,
                position: { x: 400, y: 300 },
                ready: false
            };
            
            this.players.set(playerId, player);
            
            // Send welcome message
            this.sendToPlayer(playerId, {
                type: 'welcome',
                playerId: playerId,
                name: player.name,
                message: 'Welcome to Dodge This Shit Multiplayer!'
            });
            
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
            
            ws.on('error', (error) => {
                console.error(`WebSocket error for player ${playerId}:`, error);
                this.handleDisconnect(playerId);
            });
        });
    }
    
    handleMessage(playerId, message) {
        const player = this.players.get(playerId);
        if (!player) return;
        
        console.log(`Message from ${playerId} (${player.name}):`, message.type);
        
        switch (message.type) {
            case 'hello':
                // Update player name if provided
                if (message.name && message.name.trim()) {
                    player.name = message.name.trim().substring(0, 20);
                }
                this.sendToPlayer(playerId, {
                    type: 'welcome',
                    playerId: playerId,
                    name: player.name,
                    message: 'Hello ' + player.name + '!'
                });
                break;
                
            case 'playerMove':
                // Update player position
                if (message.x !== undefined && message.y !== undefined) {
                    player.position.x = message.x;
                    player.position.y = message.y;
                    
                    // Broadcast to other players in same lobby
                    if (player.lobbyId) {
                        this.broadcastToLobby(player.lobbyId, {
                            type: 'playerMoved',
                            playerId: playerId,
                            name: player.name,
                            x: message.x,
                            y: message.y
                        }, playerId);
                    }
                }
                break;
                
            case 'chat':
                // Handle chat messages
                if (message.text && message.text.trim()) {
                    const text = message.text.trim().substring(0, 200);
                    this.broadcastToLobby(player.lobbyId, {
                        type: 'chat',
                        playerId: playerId,
                        playerName: player.name,
                        text: text,
                        timestamp: Date.now()
                    });
                }
                break;
                
            case 'createLobby':
                this.createLobby(playerId, message.name);
                break;
                
            case 'joinLobby':
                this.joinLobby(playerId, message.lobbyId);
                break;
                
            case 'leaveLobby':
                this.leaveLobby(playerId);
                break;
                
            default:
                console.log(`Unknown message type from ${playerId}:`, message.type);
        }
    }
    
    createLobby(playerId, lobbyName = 'New Game') {
        const player = this.players.get(playerId);
        if (!player || player.lobbyId) return;
        
        const lobbyId = this.generateId();
        const lobby = {
            id: lobbyId,
            name: lobbyName.trim().substring(0, 30) || 'New Game',
            hostId: playerId,
            players: [playerId],
            gameState: 'waiting',
            maxPlayers: 4
        };
        
        this.lobbies.set(lobbyId, lobby);
        player.lobbyId = lobbyId;
        
        this.sendToPlayer(playerId, {
            type: 'lobbyCreated',
            lobbyId: lobbyId,
            lobbyName: lobby.name,
            isHost: true
        });
        
        console.log(`Lobby created: ${lobbyId} by ${playerId}`);
    }
    
    joinLobby(playerId, lobbyId) {
        const player = this.players.get(playerId);
        const lobby = this.lobbies.get(lobbyId);
        
        if (!player || !lobby || player.lobbyId) return;
        
        // Check if lobby is full
        if (lobby.players.length >= lobby.maxPlayers) {
            this.sendToPlayer(playerId, {
                type: 'error',
                message: 'Lobby is full'
            });
            return;
        }
        
        // Add player to lobby
        lobby.players.push(playerId);
        player.lobbyId = lobbyId;
        
        // Notify all players in lobby
        this.broadcastToLobby(lobbyId, {
            type: 'playerJoined',
            playerId: playerId,
            name: player.name
        });
        
        // Send lobby info to joining player
        this.sendLobbyInfo(playerId, lobbyId);
        
        console.log(`Player ${playerId} joined lobby ${lobbyId}`);
    }
    
    leaveLobby(playerId) {
        const player = this.players.get(playerId);
        if (!player || !player.lobbyId) return;
        
        const lobbyId = player.lobbyId;
        const lobby = this.lobbies.get(lobbyId);
        if (!lobby) return;
        
        // Remove player from lobby
        const playerIndex = lobby.players.indexOf(playerId);
        if (playerIndex > -1) {
            lobby.players.splice(playerIndex, 1);
        }
        
        // Notify other players
        this.broadcastToLobby(lobbyId, {
            type: 'playerLeft',
            playerId: playerId
        });
        
        // Reset player state
        player.lobbyId = null;
        
        // Handle empty lobby or host leaving
        if (lobby.players.length === 0) {
            this.lobbies.delete(lobbyId);
        } else if (lobby.hostId === playerId) {
            // Assign new host
            lobby.hostId = lobby.players[0];
            this.broadcastToLobby(lobbyId, {
                type: 'newHost',
                hostId: lobby.hostId
            });
        }
        
        console.log(`Player ${playerId} left lobby ${lobbyId}`);
    }
    
    handleDisconnect(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            if (player.lobbyId) {
                this.leaveLobby(playerId);
            }
            this.players.delete(playerId);
        }
    }
    
    // Helper methods
    sendToPlayer(playerId, message) {
        const player = this.players.get(playerId);
        if (player && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(message));
        }
    }
    
    broadcastToLobby(lobbyId, message, excludePlayerId = null) {
        const lobby = this.lobbies.get(lobbyId);
        if (!lobby) return;
        
        lobby.players.forEach(playerId => {
            if (playerId !== excludePlayerId) {
                this.sendToPlayer(playerId, message);
            }
        });
    }
    
    sendLobbyInfo(playerId, lobbyId) {
        const lobby = this.lobbies.get(lobbyId);
        if (!lobby) return;
        
        const players = lobby.players.map(pId => {
            const p = this.players.get(pId);
            return {
                id: pId,
                name: p?.name || 'Unknown',
                isHost: pId === lobby.hostId,
                ready: p?.ready || false
            };
        });
        
        this.sendToPlayer(playerId, {
            type: 'lobbyInfo',
            lobbyId: lobby.id,
            lobbyName: lobby.name,
            hostId: lobby.hostId,
            players: players,
            gameState: lobby.gameState,
            maxPlayers: lobby.maxPlayers
        });
    }
    
    generateId() {
        return Math.random().toString(36).substring(2, 15);
    }
    
    start() {
        this.server.listen(this.port, () => {
            console.log(`
            🎮 Dodge This Shit - Multiplayer Server
            ========================================
            Server running on port: ${this.port}
            
            WebSocket endpoint: ws://localhost:${this.port}
            
            Features:
            - Lobby system (create/join rooms)
            - Up to 4 players per game
            - Real-time player movement
            - Chat system
            
            Ready for connections!
            `);
        });
    }
    
    stop() {
        this.wss.close();
        this.server.close();
        console.log('Multiplayer server stopped');
    }
}

// Start server if run directly
if (require.main === module) {
    const port = process.env.PORT || 8080;
    const server = new MultiplayerServer(port);
    server.start();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n👋 Shutting down multiplayer server...');
        server.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        console.log('\n👋 Received SIGTERM, shutting down...');
        server.stop();
        process.exit(0);
    });
}

module.exports = MultiplayerServer;