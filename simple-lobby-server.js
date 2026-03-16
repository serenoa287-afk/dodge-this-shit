// Simple Lobby Server for Dodge This Shit
const WebSocket = require('ws');
const http = require('http');

class SimpleLobbyServer {
    constructor(port = 8080) {
        this.port = port;
        this.server = http.createServer();
        this.wss = new WebSocket.Server({ server: this.server });
        
        this.players = new Map(); // All connected players
        this.lobbyPlayers = new Set(); // Players in lobby
        this.nextPlayerId = 1;
        
        this.gameActive = false;
        this.gameState = null;
        this.gameLoop = null;
        
        // Game constants
        this.ROUND_DURATION = 10000; // 10 seconds per round (easier)
        this.ENEMY_SPAWN_INTERVAL = 1500; // Slower spawn rate (easier)
        
        this.setupWebSocket();
    }
    
    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            const playerId = `player${this.nextPlayerId++}`;
            console.log(`Player connected: ${playerId} (Total: ${this.players.size + 1})`);
            
            // Create player object
            const player = {
                id: playerId,
                ws: ws,
                name: `Player${this.nextPlayerId - 1}`,
                color: this.getRandomColor(),
                connected: true,
                inLobby: false,
                ready: false,
                score: 0,
                lives: 3,
                x: 400,
                y: 300
            };
            
            this.players.set(playerId, player);
            
            // Send welcome with total player count
            ws.send(JSON.stringify({
                type: 'welcome',
                playerId: playerId,
                name: player.name,
                color: player.color,
                totalPlayers: this.players.size,
                lobbyPlayers: this.lobbyPlayers.size,
                gameActive: this.gameActive
            }));
            
            // Broadcast updated player count to all
            this.broadcastToAll({
                type: 'playerCountUpdate',
                totalPlayers: this.players.size,
                lobbyPlayers: this.lobbyPlayers.size
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
        });
    }
    
    handleMessage(playerId, message) {
        const player = this.players.get(playerId);
        if (!player) return;
        
        switch (message.type) {
            case 'joinLobby':
                this.joinLobby(playerId);
                break;
                
            case 'leaveLobby':
                this.leaveLobby(playerId);
                break;
                
            case 'setReady':
                player.ready = message.ready;
                console.log(`Player ${player.name} ready: ${player.ready}`);
                
                // Broadcast to lobby
                this.broadcastToLobby({
                    type: 'playerReady',
                    playerId: playerId,
                    ready: player.ready
                }, playerId);
                
                // Check if all lobby players are ready
                this.checkStartGame();
                break;
                
            case 'move':
                player.x = message.x;
                player.y = message.y;
                
                if (this.gameActive) {
                    this.broadcastToLobby({
                        type: 'playerMoved',
                        playerId: playerId,
                        x: message.x,
                        y: message.y
                    }, playerId);
                }
                break;
                
            case 'chat':
                this.broadcastToLobby({
                    type: 'chat',
                    playerId: playerId,
                    playerName: player.name,
                    message: message.text
                });
                break;
                
            case 'enemyKilled':
                this.handleEnemyKilled(playerId, message.enemyId);
                break;
        }
    }
    
    handleEnemyKilled(playerId, enemyId) {
        const player = this.players.get(playerId);
        if (!player || !player.inLobby) return;
        
        // Remove enemy if it exists
        this.gameState.enemies = this.gameState.enemies.filter(e => e.id !== enemyId);
        
        // Add score
        player.score += 100;
        
        // Broadcast score update
        this.broadcastToLobby({
            type: 'scoreUpdate',
            playerId: playerId,
            score: player.score,
            enemyId: enemyId
        });
    }
    
    joinLobby(playerId) {
        const player = this.players.get(playerId);
        if (!player) return;
        
        // Check if already in lobby
        if (player.inLobby) return;
        
        // Check if lobby is full (max 4)
        if (this.lobbyPlayers.size >= 4) {
            player.ws.send(JSON.stringify({
                type: 'error',
                message: 'Lobby is full (max 4 players)'
            }));
            return;
        }
        
        // Check if game is active
        if (this.gameActive) {
            player.ws.send(JSON.stringify({
                type: 'error',
                message: 'Game already in progress'
            }));
            return;
        }
        
        // Join lobby
        player.inLobby = true;
        player.ready = false;
        player.score = 0;
        player.lives = 3;
        this.lobbyPlayers.add(playerId);
        
        // Send lobby info
        player.ws.send(JSON.stringify({
            type: 'lobbyJoined',
            players: this.getLobbyPlayers(),
            totalPlayers: this.players.size,
            lobbyPlayers: this.lobbyPlayers.size
        }));
        
        // Notify lobby
        this.broadcastToLobby({
            type: 'playerJoinedLobby',
            playerId: playerId,
            playerName: player.name,
            playerColor: player.color
        }, playerId);
        
        // Update player counts
        this.broadcastToAll({
            type: 'playerCountUpdate',
            totalPlayers: this.players.size,
            lobbyPlayers: this.lobbyPlayers.size
        });
        
        console.log(`Player ${player.name} joined lobby (${this.lobbyPlayers.size}/4)`);
    }
    
    leaveLobby(playerId) {
        const player = this.players.get(playerId);
        if (!player || !player.inLobby) return;
        
        player.inLobby = false;
        player.ready = false;
        this.lobbyPlayers.delete(playerId);
        
        // Notify lobby
        this.broadcastToLobby({
            type: 'playerLeftLobby',
            playerId: playerId
        });
        
        // Update player counts
        this.broadcastToAll({
            type: 'playerCountUpdate',
            totalPlayers: this.players.size,
            lobbyPlayers: this.lobbyPlayers.size
        });
        
        console.log(`Player ${player.name} left lobby (${this.lobbyPlayers.size}/4)`);
    }
    
    checkStartGame() {
        // Need at least 1 player in lobby
        if (this.lobbyPlayers.size === 0) {
            console.log('Cannot start: No players in lobby');
            return;
        }
        
        // Check if all lobby players are ready
        const allReady = Array.from(this.lobbyPlayers).every(playerId => {
            const player = this.players.get(playerId);
            return player && player.ready;
        });
        
        console.log(`Check start: ${this.lobbyPlayers.size} in lobby, all ready: ${allReady}, game active: ${this.gameActive}`);
        
        // List players and their ready status for debugging
        console.log('Players in lobby:');
        Array.from(this.lobbyPlayers).forEach(playerId => {
            const player = this.players.get(playerId);
            console.log(`  ${player.name} (${playerId}): ready=${player.ready}`);
        });
        
        if (allReady && !this.gameActive) {
            console.log(`All ${this.lobbyPlayers.size} player(s) ready! Starting game in 3 seconds...`);
            
            // Start game after 3 seconds
            setTimeout(() => {
                this.startGame();
            }, 3000);
            
            // Notify countdown
            this.broadcastToLobby({
                type: 'gameStarting',
                countdown: 3
            });
        } else if (!allReady) {
            console.log(`Not all players ready. Need ${this.lobbyPlayers.size} ready, have ${Array.from(this.lobbyPlayers).filter(id => this.players.get(id).ready).length}`);
        }
    }
    
    startGame() {
        if (this.gameActive) return;
        
        console.log(`Starting game with ${this.lobbyPlayers.size} players`);
        
        this.gameActive = true;
        this.gameState = {
            round: 1,
            roundTimer: this.ROUND_DURATION,
            lastSpawnTime: Date.now(),
            enemies: [],
            enemyCount: 0,
            level: 1
        };
        
        // Reset player states
        this.lobbyPlayers.forEach(playerId => {
            const player = this.players.get(playerId);
            if (player) {
                player.score = 0;
                player.lives = 3;
                player.x = 400;
                player.y = 300;
            }
        });
        
        // Broadcast game start
        this.broadcastToLobby({
            type: 'gameStarted',
            round: 1,
            roundTimer: this.ROUND_DURATION,
            players: this.getLobbyPlayers(),
            initialGameState: {
                round: 1,
                roundTimer: this.ROUND_DURATION,
                enemies: [],
                level: 1
            }
        });
        
        // Start game loop
        this.startGameLoop();
    }
    
    startGameLoop() {
        if (this.gameLoop) clearInterval(this.gameLoop);
        
        const GAME_TICK = 1000 / 60;
        this.gameLoop = setInterval(() => {
            this.updateGame();
        }, GAME_TICK);
    }
    
    updateGame() {
        if (!this.gameActive || !this.gameState) return;
        
        const now = Date.now();
        const deltaTime = 16;
        const gameState = this.gameState;
        
        // Update round timer
        gameState.roundTimer -= deltaTime;
        
        // Check if round ended
        if (gameState.roundTimer <= 0) {
            this.endRound();
            return;
        }
        
        // Spawn enemies
        if (now - gameState.lastSpawnTime > this.ENEMY_SPAWN_INTERVAL) {
            this.spawnEnemy();
            gameState.lastSpawnTime = now;
        }
        
        // Update enemies
        this.updateEnemies(deltaTime);
        
        // Check collisions
        this.checkCollisions();
        
        // Broadcast game state
        this.broadcastGameState();
    }
    
    spawnEnemy() {
        const enemyId = `enemy${this.gameState.enemyCount++}`;
        const level = this.gameState.level;
        
        const enemy = {
            id: enemyId,
            x: Math.random() * 800,
            y: -50,
            velocityX: (Math.random() - 0.5) * 0.2,
            velocityY: 0.1 + (level * 0.02),
            radius: 10 + (level * 2),
            type: 'basic',
            color: '#ff0000',
            health: 1,
            damage: 1
        };
        
        this.gameState.enemies.push(enemy);
    }
    
    updateEnemies(deltaTime) {
        this.gameState.enemies = this.gameState.enemies.filter(enemy => {
            enemy.x += enemy.velocityX * deltaTime;
            enemy.y += enemy.velocityY * deltaTime;
            return enemy.y < 650 && enemy.x > -50 && enemy.x < 850;
        });
    }
    
    checkCollisions() {
        this.lobbyPlayers.forEach(playerId => {
            const player = this.players.get(playerId);
            if (!player || player.lives <= 0) return;
            
            this.gameState.enemies.forEach(enemy => {
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < (15 + enemy.radius)) {
                    // Player hit!
                    player.lives -= enemy.damage;
                    
                    // Remove enemy
                    this.gameState.enemies = this.gameState.enemies.filter(e => e.id !== enemy.id);
                    
                    // Notify player was hit
                    this.broadcastToLobby({
                        type: 'playerHit',
                        playerId: playerId,
                        enemyId: enemy.id,
                        lives: player.lives
                    });
                    
                    // Check if player died
                    if (player.lives <= 0) {
                        this.broadcastToLobby({
                            type: 'playerDied',
                            playerId: playerId
                        });
                    }
                }
            });
        });
    }
    
    endRound() {
        const currentRound = this.gameState.round;
        const nextRound = currentRound + 1;
        
        this.gameState.round = nextRound;
        this.gameState.level = nextRound;
        this.gameState.roundTimer = this.ROUND_DURATION;
        this.gameState.enemies = [];
        
        // Revive dead players
        this.lobbyPlayers.forEach(playerId => {
            const player = this.players.get(playerId);
            if (player && player.lives <= 0) {
                player.lives = 3;
                player.x = 400;
                player.y = 300;
            }
        });
        
        // Broadcast round end
        this.broadcastToLobby({
            type: 'roundEnded',
            round: currentRound,
            nextRound: nextRound,
            roundTimer: this.ROUND_DURATION
        });
        
        // Check if game over
        if (nextRound > 10) {
            this.endGame();
        }
    }
    
    endGame() {
        this.gameActive = false;
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
        
        // Calculate winner
        let winner = null;
        let highestScore = -1;
        
        this.lobbyPlayers.forEach(playerId => {
            const player = this.players.get(playerId);
            if (player && player.score > highestScore) {
                highestScore = player.score;
                winner = player;
            }
        });
        
        this.broadcastToLobby({
            type: 'gameEnded',
            winnerName: winner?.name,
            finalScores: Array.from(this.lobbyPlayers).map(playerId => {
                const player = this.players.get(playerId);
                return [playerId, player?.score || 0];
            })
        });
        
        // Clear lobby after game
        setTimeout(() => {
            this.lobbyPlayers.clear();
            this.players.forEach(player => {
                player.inLobby = false;
                player.ready = false;
            });
            
            this.broadcastToAll({
                type: 'playerCountUpdate',
                totalPlayers: this.players.size,
                lobbyPlayers: 0
            });
        }, 10000);
    }
    
    broadcastGameState() {
        if (!this.gameActive || !this.gameState) return;
        
        // Get current player positions
        const playerStates = this.getLobbyPlayers().map(player => ({
            id: player.id,
            x: player.x,
            y: player.y,
            lives: player.lives,
            score: player.score,
            color: player.color,
            name: player.name
        }));
        
        this.broadcastToLobby({
            type: 'gameStateUpdate',
            round: this.gameState.round,
            roundTimer: Math.max(0, this.gameState.roundTimer),
            enemies: this.gameState.enemies,
            level: this.gameState.level,
            players: playerStates
        });
    }
    
    getLobbyPlayers() {
        return Array.from(this.lobbyPlayers).map(playerId => {
            const player = this.players.get(playerId);
            return {
                id: player.id,
                name: player.name,
                color: player.color,
                x: player.x,
                y: player.y,
                ready: player.ready,
                score: player.score,
                lives: player.lives
            };
        });
    }
    
    broadcastToLobby(message, excludePlayerId = null) {
        this.lobbyPlayers.forEach(playerId => {
            if (playerId !== excludePlayerId) {
                const player = this.players.get(playerId);
                if (player && player.connected && player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify(message));
                }
            }
        });
    }
    
    broadcastToAll(message) {
        this.players.forEach((player, playerId) => {
            if (player.connected && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify(message));
            }
        });
    }
    
    handleDisconnect(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            player.connected = false;
            
            // Leave lobby if in one
            if (player.inLobby) {
                this.leaveLobby(playerId);
            }
            
            // Remove player
            this.players.delete(playerId);
            
            // Update player counts
            this.broadcastToAll({
                type: 'playerCountUpdate',
                totalPlayers: this.players.size,
                lobbyPlayers: this.lobbyPlayers.size
            });
        }
    }
    
    getRandomColor() {
        const colors = ['#00ffea', '#ff6b6b', '#ffa500', '#9400d3', '#0088ff', '#00ff00'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    start() {
        this.server.listen(this.port, () => {
            console.log(`
            🎮 Simple Lobby Server
            ======================
            Server running on port: ${this.port}
            WebSocket endpoint: ws://localhost:${this.port}
            
            Features:
            - Single lobby (max 4 players)
            - Shows player counts on front page
            - Game starts when all players ready
            - 10-round synchronized gameplay
            
            Player counts broadcast to all connected clients
            `);
        });
    }
}

// Start server if run directly
if (require.main === module) {
    const port = process.env.PORT || 8080;
    const server = new SimpleLobbyServer(port);
    server.start();
    
    process.on('SIGINT', () => {
        console.log('\n👋 Shutting down server...');
        process.exit(0);
    });
}

module.exports = SimpleLobbyServer;