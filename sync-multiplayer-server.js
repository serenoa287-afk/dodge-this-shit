// Synchronized Multiplayer Server for Dodge This Shit
const WebSocket = require('ws');
const http = require('http');

class SyncMultiplayerServer {
    constructor(port = 8080) {
        this.port = port;
        this.server = http.createServer();
        this.wss = new WebSocket.Server({ server: this.server });
        
        this.players = new Map();
        this.rooms = new Map();
        this.nextPlayerId = 1;
        this.nextRoomId = 1;
        
        // Game constants
        this.ROUND_DURATION = 30000; // 30 seconds
        this.ENEMY_SPAWN_INTERVAL = 1000; // 1 second
        
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
                roundTimer: this.ROUND_DURATION,
                lastSpawnTime: 0,
                enemies: [],
                scores: new Map(),
                lives: new Map(),
                level: 1,
                enemyCount: 0
            },
            gameLoop: null
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
                ready: false,
                score: 0,
                lives: 3
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
            gameActive: room.gameState.active,
            round: room.gameState.round
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
                
            case 'playerHit':
                this.handlePlayerHit(playerId, message.enemyId);
                break;
                
            case 'enemyKilled':
                this.handleEnemyKilled(playerId, message.enemyId);
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
        
        // Check if game is active
        if (room.gameState.active) {
            player.ws.send(JSON.stringify({
                type: 'error',
                message: 'Game already in progress'
            }));
            return;
        }
        
        // Join room
        player.roomId = roomId;
        room.players.add(playerId);
        player.ready = false;
        player.score = 0;
        player.lives = 3;
        
        // Initialize player in game state
        room.gameState.scores.set(playerId, 0);
        room.gameState.lives.set(playerId, 3);
        
        // Notify player
        player.ws.send(JSON.stringify({
            type: 'roomJoined',
            roomId: roomId,
            roomName: room.name,
            players: this.getRoomPlayers(roomId),
            gameState: room.gameState.active ? {
                round: room.gameState.round,
                roundTimer: room.gameState.roundTimer,
                enemies: room.gameState.enemies,
                scores: Array.from(room.gameState.scores.entries()),
                lives: Array.from(room.gameState.lives.entries())
            } : null
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
            room.gameState.scores.delete(playerId);
            room.gameState.lives.delete(playerId);
            
            // Notify room
            this.broadcastToRoom(player.roomId, {
                type: 'playerLeftRoom',
                playerId: playerId
            });
            
            // If room becomes empty, stop game and remove room
            if (room.players.size === 0) {
                if (room.gameLoop) {
                    clearInterval(room.gameLoop);
                    room.gameLoop = null;
                }
                room.gameState.active = false;
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
        
        // Check if all players are ready
        const allReady = playersArray.every(pId => {
            const p = this.players.get(pId);
            return p && p.ready;
        });
        
        if (!allReady) {
            player.ws.send(JSON.stringify({
                type: 'error',
                message: 'All players must be ready'
            }));
            return;
        }
        
        // Start game
        room.gameState.active = true;
        room.gameState.round = 1;
        room.gameState.roundTimer = this.ROUND_DURATION;
        room.gameState.enemies = [];
        room.gameState.enemyCount = 0;
        room.gameState.lastSpawnTime = Date.now();
        room.gameState.level = 1;
        
        // Reset scores and lives
        room.players.forEach(pId => {
            const p = this.players.get(pId);
            if (p) {
                p.score = 0;
                p.lives = 3;
                room.gameState.scores.set(pId, 0);
                room.gameState.lives.set(pId, 3);
            }
        });
        
        // Broadcast game start
        this.broadcastToRoom(room.id, {
            type: 'gameStarted',
            round: 1,
            roundTimer: this.ROUND_DURATION,
            players: this.getRoomPlayers(room.id),
            initialGameState: {
                round: 1,
                roundTimer: this.ROUND_DURATION,
                enemies: [],
                scores: Array.from(room.gameState.scores.entries()),
                lives: Array.from(room.gameState.lives.entries()),
                level: 1
            }
        });
        
        // Start game loop for this room
        this.startRoomGameLoop(room);
    }
    
    startRoomGameLoop(room) {
        if (room.gameLoop) {
            clearInterval(room.gameLoop);
        }
        
        const GAME_TICK = 1000 / 60; // 60 FPS
        room.gameLoop = setInterval(() => {
            this.updateRoomGame(room);
        }, GAME_TICK);
        
        console.log(`Game started in room: ${room.name}`);
    }
    
    updateRoomGame(room) {
        if (!room.gameState.active) return;
        
        const now = Date.now();
        const deltaTime = 16; // Approximate 60 FPS
        
        // Update round timer
        room.gameState.roundTimer -= deltaTime;
        
        // Check if round ended
        if (room.gameState.roundTimer <= 0) {
            this.endRound(room);
            return;
        }
        
        // Spawn enemies
        if (now - room.gameState.lastSpawnTime > this.ENEMY_SPAWN_INTERVAL) {
            this.spawnEnemyForRoom(room);
            room.gameState.lastSpawnTime = now;
        }
        
        // Update enemies
        this.updateEnemiesForRoom(room, deltaTime);
        
        // Check collisions
        this.checkCollisionsForRoom(room);
        
        // Broadcast game state update
        this.broadcastGameState(room);
    }
    
    spawnEnemyForRoom(room) {
        const enemyId = `enemy${room.gameState.enemyCount++}`;
        const level = room.gameState.level;
        
        // Simple enemy spawning logic
        const enemy = {
            id: enemyId,
            x: Math.random() * 800,
            y: -50,
            velocityX: (Math.random() - 0.5) * 0.2,
            velocityY: 0.1 + (level * 0.02),
            radius: 10 + (level * 2),
            type: this.getEnemyTypeForLevel(level),
            color: this.getEnemyColor(level),
            health: 1,
            damage: 1
        };
        
        room.gameState.enemies.push(enemy);
    }
    
    getEnemyTypeForLevel(level) {
        const types = ['basic', 'fast', 'tank', 'splitter', 'chaser', 'stalker'];
        const maxTypeIndex = Math.min(level - 1, types.length - 1);
        const typeIndex = Math.floor(Math.random() * (maxTypeIndex + 1));
        return types[typeIndex];
    }
    
    getEnemyColor(level) {
        const colors = ['#ff0000', '#ff6b6b', '#ffa500', '#ffff00', '#00ff00', '#00ffff', '#9400d3'];
        return colors[Math.min(level - 1, colors.length - 1)];
    }
    
    updateEnemiesForRoom(room, deltaTime) {
        room.gameState.enemies = room.gameState.enemies.filter(enemy => {
            // Update position
            enemy.x += enemy.velocityX * deltaTime;
            enemy.y += enemy.velocityY * deltaTime;
            
            // Remove if off screen
            return enemy.y < 650 && enemy.x > -50 && enemy.x < 850;
        });
    }
    
    checkCollisionsForRoom(room) {
        room.players.forEach(playerId => {
            const player = this.players.get(playerId);
            if (!player || player.lives <= 0) return;
            
            room.gameState.enemies.forEach(enemy => {
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < (15 + enemy.radius)) { // Player radius + enemy radius
                    // Player hit!
                    player.lives -= enemy.damage;
                    room.gameState.lives.set(playerId, player.lives);
                    
                    // Remove enemy
                    room.gameState.enemies = room.gameState.enemies.filter(e => e.id !== enemy.id);
                    
                    // Notify player was hit
                    this.broadcastToRoom(room.id, {
                        type: 'playerHit',
                        playerId: playerId,
                        enemyId: enemy.id,
                        lives: player.lives
                    });
                    
                    // Check if player died
                    if (player.lives <= 0) {
                        this.broadcastToRoom(room.id, {
                            type: 'playerDied',
                            playerId: playerId
                        });
                    }
                }
            });
        });
    }
    
    handlePlayerHit(playerId, enemyId) {
        const player = this.players.get(playerId);
        const room = this.rooms.get(player?.roomId);
        
        if (!player || !room) return;
        
        // This is handled in checkCollisionsForRoom
        // This method is for client-reported hits (if needed)
    }
    
    handleEnemyKilled(playerId, enemyId) {
        const player = this.players.get(playerId);
        const room = this.rooms.get(player?.roomId);
        
        if (!player || !room) return;
        
        // Remove enemy
        room.gameState.enemies = room.gameState.enemies.filter(e => e.id !== enemyId);
        
        // Add score
        player.score += 100;
        room.gameState.scores.set(playerId, player.score);
        
        // Broadcast score update
        this.broadcastToRoom(room.id, {
            type: 'scoreUpdate',
            playerId: playerId,
            score: player.score,
            enemyId: enemyId
        });
    }
    
    endRound(room) {
        room.gameState.round++;
        room.gameState.level = room.gameState.round;
        room.gameState.roundTimer = this.ROUND_DURATION;
        room.gameState.enemies = [];
        
        // Add round bonus to all alive players
        room.players.forEach(playerId => {
            const player = this.players.get(playerId);
            if (player && player.lives > 0) {
                const roundBonus = 500 * room.gameState.round;
                player.score += roundBonus;
                room.gameState.scores.set(playerId, player.score);
            }
        });
        
        // Broadcast round end
        this.broadcastToRoom(room.id, {
            type: 'roundEnded',
            round: room.gameState.round - 1,
            nextRound: room.gameState.round,
            roundTimer: this.ROUND_DURATION,
            scores: Array.from(room.gameState.scores.entries())
        });
        
        // Check if game over (10 rounds)
        if (room.gameState.round > 10) {
            this.endGame(room);
        }
    }
    
    endGame(room) {
        room.gameState.active = false;
        if (room.gameLoop) {
            clearInterval(room.gameLoop);
            room.gameLoop = null;
        }
        
        // Calculate winner
        let winnerId = null;
        let highestScore = -1;
        
        room.players.forEach(playerId => {
            const player = this.players.get(playerId);
            if (player && player.score > highestScore) {
                highestScore = player.score;
                winnerId = playerId;
            }
        });
        
        const winner = winnerId ? this.players.get(winnerId) : null;
        
        this.broadcastToRoom(room.id, {
            type: 'gameEnded',
            winnerId: winnerId,
            winnerName: winner?.name,
            finalScores: Array.from(room.gameState.scores.entries())
        });
        
        console.log(`Game ended in room: ${room.name}. Winner: ${winner?.name}`);
    }
    
    broadcastGameState(room) {
        if (!room.gameState.active) return;
        
        this.broadcastToRoom(room.id, {
            type: 'gameStateUpdate',
            round: room.gameState.round,
            roundTimer: Math.max(0, room.gameState.roundTimer),
            enemies: room.gameState.enemies,
            scores: Array.from(room.gameState.scores.entries()),
            lives: Array.from(room.gameState.lives.entries()),
            level: room.gameState.level
        });
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
                score: room.gameState.scores.get(playerId) || 0,
                lives: room.gameState.lives.get(playerId) || 3
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
            🎮 Synchronized Multiplayer Server
            ==================================
            Server running on port: ${this.port}
            WebSocket endpoint: ws://localhost:${this.port}
            
            Features:
            - Full game state synchronization
            - Shared enemy spawning and movement
            - Individual player scores
            - Round progression (10 rounds)
            - Collision detection server-side
            - Lives system
            - Level progression
            
            Default room: "Main Arena" (room1)
            Max players per room: 4
            Rounds: 10
            Round duration: 30 seconds
            
            To test:
            1. Open game in browser
            2. Click "Sync Multiplayer"
            3. Join a room, ready up, start game
            4. Play together with synchronized enemies!
            `);
        });
    }
}

// Start server if run directly
if (require.main === module) {
    const port = process.env.PORT || 8080;
    const server = new SyncMultiplayerServer(port);
    server.start();
    
    process.on('SIGINT', () => {
        console.log('\n👋 Shutting down server...');
        process.exit(0);
    });
}

module.exports = SyncMultiplayerServer;