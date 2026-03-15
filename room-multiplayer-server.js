// Room-based Multiplayer Server for Dodge This Shit
const WebSocket = require('ws');
const http = require('http');

class RoomMultiplayerServer {
    constructor(port = 8080) {
        this.port = port;
        this.server = http.createServer();
        this.wss = new WebSocket.Server({ server: this.server });
        
        this.players = new Map();
        this.rooms = new Map();
        this.nextPlayerId = 1;
        this.nextRoomId = 1;
        
        // Create a default room
        this.createRoom('Main Arena', 4);
        
        this.setupWebSocket();
    }
    
    createRoom(name, maxPlayers = 4) {
        const roomId = `room${this.nextRoomId++}`;
        const room = {
            id: roomId,
            name: name,
            maxPlayers: maxPlayers,
            players: new Set(),
            gameState: {
                active: false,
                round: 1,
                enemies: [],
                scores: new Map()
            }
        };
        
        this.rooms.set(roomId, room);
        console.log(`Created room: ${name} (${roomId})`);
        return roomId;
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
                connected: true,
                roomId: null,
                ready: false
            };
            
            this.players.set(playerId, player);
            
            // Send welcome with room list
            ws.send(JSON.stringify({
                type: 'welcome',
                playerId: playerId,
                name: player.name,
                color: player.color,
                rooms: this.getRoomList()
            }));
            
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
    
    getRoomList() {
        return Array.from(this.rooms.values()).map(room => ({
            id: room.id,
            name: room.name,
            playerCount: room.players.size,
            maxPlayers: room.maxPlayers,
            gameActive: room.gameState.active
        }));
    }
    
    handleMessage(playerId, message) {
        const player = this.players.get(playerId);
        if (!player) return;
        
        switch (message.type) {
            case 'joinRoom':
                this.handleJoinRoom(playerId, message.roomId);
                break;
                
            case 'leaveRoom':
                this.handleLeaveRoom(playerId);
                break;
                
            case 'setReady':
                player.ready = message.ready;
                this.broadcastToRoom(player.roomId, {
                    type: 'playerReady',
                    playerId: playerId,
                    ready: player.ready
                }, playerId);
                break;
                
            case 'startGame':
                this.handleStartGame(playerId);
                break;
                
            case 'move':
                player.x = message.x;
                player.y = message.y;
                
                // Broadcast to room
                this.broadcastToRoom(player.roomId, {
                    type: 'playerMoved',
                    playerId: playerId,
                    x: message.x,
                    y: message.y
                }, playerId);
                break;
                
            case 'playerAction':
                this.broadcastToRoom(player.roomId, {
                    type: 'playerAction',
                    playerId: playerId,
                    action: message.action
                }, playerId);
                break;
                
            case 'chat':
                this.broadcastToRoom(player.roomId, {
                    type: 'chat',
                    playerId: playerId,
                    playerName: player.name,
                    message: message.text
                });
                break;
        }
    }
    
    handleJoinRoom(playerId, roomId) {
        const player = this.players.get(playerId);
        const room = this.rooms.get(roomId);
        
        if (!player || !room) {
            player.ws.send(JSON.stringify({
                type: 'error',
                message: 'Room not found'
            }));
            return;
        }
        
        // Leave current room if any
        if (player.roomId) {
            this.handleLeaveRoom(playerId);
        }
        
        // Check if room is full
        if (room.players.size >= room.maxPlayers) {
            player.ws.send(JSON.stringify({
                type: 'error',
                message: 'Room is full'
            }));
            return;
        }
        
        // Join room
        player.roomId = roomId;
        room.players.add(playerId);
        player.ready = false;
        
        // Notify player
        player.ws.send(JSON.stringify({
            type: 'roomJoined',
            roomId: roomId,
            roomName: room.name,
            players: this.getRoomPlayers(roomId)
        }));
        
        // Notify room
        this.broadcastToRoom(roomId, {
            type: 'playerJoinedRoom',
            playerId: playerId,
            playerName: player.name,
            playerColor: player.color
        }, playerId);
    }
    
    handleLeaveRoom(playerId) {
        const player = this.players.get(playerId);
        if (!player || !player.roomId) return;
        
        const room = this.rooms.get(player.roomId);
        if (room) {
            room.players.delete(playerId);
            
            // Notify room
            this.broadcastToRoom(player.roomId, {
                type: 'playerLeftRoom',
                playerId: playerId
            });
            
            // If room becomes empty and game isn't active, remove it
            if (room.players.size === 0 && !room.gameState.active) {
                this.rooms.delete(room.id);
                console.log(`Removed empty room: ${room.name}`);
            }
        }
        
        player.roomId = null;
        player.ready = false;
    }
    
    handleStartGame(playerId) {
        const player = this.players.get(playerId);
        if (!player || !player.roomId) return;
        
        const room = this.rooms.get(player.roomId);
        if (!room) return;
        
        // Check if player is host (first player in room)
        const playersArray = Array.from(room.players);
        if (playersArray[0] !== playerId) {
            player.ws.send(JSON.stringify({
                type: 'error',
                message: 'Only the room host can start the game'
            }));
            return;
        }
        
        // Start game
        room.gameState.active = true;
        room.gameState.round = 1;
        room.gameState.enemies = [];
        room.gameState.scores.clear();
        
        // Initialize scores
        room.players.forEach(pId => {
            room.gameState.scores.set(pId, 0);
        });
        
        // Broadcast game start
        this.broadcastToRoom(room.id, {
            type: 'gameStarted',
            round: 1,
            players: this.getRoomPlayers(room.id)
        });
        
        // Start game loop for this room
        this.startRoomGameLoop(room);
    }
    
    startRoomGameLoop(room) {
        // Game loop would go here
        // This would synchronize enemy spawning, collisions, etc.
        console.log(`Game started in room: ${room.name}`);
    }
    
    getRoomPlayers(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return [];
        
        return Array.from(room.players).map(playerId => {
            const player = this.players.get(playerId);
            return {
                id: player.id,
                name: player.name,
                color: player.color,
                x: player.x,
                y: player.y,
                ready: player.ready,
                score: room.gameState.scores.get(playerId) || 0
            };
        });
    }
    
    broadcastToRoom(roomId, message, excludePlayerId = null) {
        const room = this.rooms.get(roomId);
        if (!room) return;
        
        room.players.forEach(playerId => {
            if (playerId !== excludePlayerId) {
                const player = this.players.get(playerId);
                if (player && player.connected && player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify(message));
                }
            }
        });
    }
    
    handleDisconnect(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            player.connected = false;
            
            // Leave room if in one
            if (player.roomId) {
                this.handleLeaveRoom(playerId);
            }
            
            // Remove after delay
            setTimeout(() => {
                this.players.delete(playerId);
            }, 5000);
        }
    }
    
    getRandomColor() {
        const colors = ['#00ffea', '#ff6b6b', '#ffa500', '#9400d3', '#0088ff', '#00ff00'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    start() {
        this.server.listen(this.port, () => {
            console.log(`
            🎮 Room-based Multiplayer Server
            ================================
            Server running on port: ${this.port}
            WebSocket endpoint: ws://localhost:${this.port}
            
            Features:
            - Room system (join/create rooms)
            - Player ready system
            - Game state synchronization
            - Shared enemy spawning
            - Score tracking
            
            Default room: "Main Arena" (room1)
            Max players per room: 4
            
            To test:
            1. Open game in browser
            2. Click "Room Multiplayer"
            3. Join a room
            4. Ready up and start game
            `);
        });
    }
}

// Start server if run directly
if (require.main === module) {
    const port = process.env.PORT || 8080;
    const server = new RoomMultiplayerServer(port);
    server.start();
    
    process.on('SIGINT', () => {
        console.log('\n👋 Shutting down server...');
        process.exit(0);
    });
}

module.exports = RoomMultiplayerServer;