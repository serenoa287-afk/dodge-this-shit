// Unified Multiplayer Server for Dodge This Shit
const WebSocket = require('ws');
const http = require('http');

class UnifiedMultiplayerServer {
    constructor(port = 8080) {
        this.port = port;
        this.server = http.createServer();
        this.wss = new WebSocket.Server({ server: this.server });
        
        this.players = new Map();
        this.lobby = {
            players: new Set(),
            maxPlayers: 4,
            gameActive: false,
            gameState: null,
            gameLoop: null
        };
        
        this.nextPlayerId = 1;
        
        // Game constants
        this.ROUND_DURATION = 30000; // 30 seconds
        this.ENEMY_SPAWN_INTERVAL = 1000; // 1 second
        
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
                connected: true,
                ready: false,
                score: 0,
                lives: 3,
                inLobby: false
            };
            
            this.players.set(playerId, player);
            
            // Send welcome
            ws.send(JSON.stringify({
                type: 'welcome',
                playerId: playerId,
                name: player.name,
                color: player.color
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
    
    handleMessage(playerId, message) {
        const player = this.players.get(playerId);
        if (!player) return;
        
        switch (message.type) {
            case 'joinLobby':
                this.handleJoinLobby(playerId);
                break;
                
            case 'leaveLobby':
                this.handleLeaveLobby(playerId);
                break;
                
            case 'setReady':
                player.ready = message.ready;
                console.log(`Player ${player.name} ready: ${player.ready}`);
                this.broadcastToLobby({
                    type: 'playerReady',
                    playerId: playerId,
                    ready: player.ready
                }, playerId);
                
                // Check if all players are ready to start game
                this.checkStartGame();
                break;
                
            case 'startGame':
                this.handleStartGame(playerId);
                break;
                
            case 'move':
                player.x = message.x;
                player.y = message.y;
                
                // Broadcast to lobby if game is active
                if (this.lobby.gameActive) {
                    this.broadcastToLobby({
                        type: 'playerMoved',
                        playerId: playerId,
                        x: message.x,
                        y: message.y
                    }, playerId);
                }
                break;
                
            case 'playerAction':
                if (this.lobby.gameActive) {
                    this.broadcastToLobby({
                        type: 'playerAction',
                        playerId: playerId,
                        action: message.action
                    }, playerId);
                }
                break;
                
            case 'playerHit':
                this.handlePlayerHit(playerId, message.enemyId);
                break;
                
            case 'enemyKilled':
                this.handleEnemyKilled(playerId, message.enemyId);
                break;
                
            case 'chat':
                this.broadcastToLobby({
                    type: 'chat',
                    playerId: playerId,
                    playerName: player.name,
                    message: message.text
                });
                break;
        }
    }
    
    handleJoinLobby(playerId) {
        const player = this.players.get(playerId);
        if (!player) return;
        
        // Check if player is already in lobby
        if (player.inLobby) {
            player.ws.send(JSON.stringify({
                type: 'error',
                message: 'You are already in the lobby'
            }));
            return;
        }
        
        // Check if lobby is full
        if (this.lobby.players.size >= this.lobby.maxPlayers) {
            player.ws.send(JSON.stringify({
                type: 'error',
                message: 'Lobby is full (max 4 players)'
            }));
            return;
        }
        
        // Check if game is already active
        if (this.lobby.gameActive) {
            player.ws.send(JSON.stringify({
                type: 'error',
                message: 'Game already in progress. Please wait for current game to finish.'
            }));
            return;
        }
        
        // Join lobby
        player.inLobby = true;
        player.ready = false;
        player.score = 0;
        player.lives = 3;
        player.x = 400;
        player.y = 300;
        this.lobby.players.add(playerId);
        
        // Send lobby info to player
        player.ws.send(JSON.stringify({
            type: 'lobbyJoined',
            players: this.getLobbyPlayers(),
            maxPlayers: this.lobby.maxPlayers,
            gameActive: this.lobby.gameActive,
            onlinePlayers: this.getOnlinePlayerCount()
        }));
        
        // Notify other players
        this.broadcastToLobby({
            type: 'playerJoined',
            playerId: playerId,
            playerName: player.name,
            playerColor: player.color,
            onlinePlayers: this.getOnlinePlayerCount()
        }, playerId);
        
        console.log(`Player ${player.name} joined lobby (${this.lobby.players.size}/${this.lobby.maxPlayers})`);
    }
    
    handleLeaveLobby(playerId) {
        const player = this.players.get(playerId);
        if (!player || !player.inLobby) return;
        
        player.inLobby = false;
        player.ready = false;
        this.lobby.players.delete(playerId);
        
        // Notify other players
        this.broadcastToLobby({
            type: 'playerLeft',
            playerId: playerId,
            onlinePlayers: this.getOnlinePlayerCount()
        });
        
        console.log(`Player ${player.name} left lobby (${this.lobby.players.size}/${this.lobby.maxPlayers})`);
        
        // If lobby becomes empty and game isn't active, reset
        if (this.lobby.players.size === 0 && !this.lobby.gameActive) {
            this.resetLobby();
        }
    }
    
    checkStartGame() {
        // Check if all players are ready (minimum 1 player, maximum 4)
        if (this.lobby.players.size < 1 || this.lobby.players.size > 4) return;
        
        const allReady = Array.from(this.lobby.players).every(playerId => {
            const player = this.players.get(playerId);
            return player && player.ready;
        });
        
        console.log(`Check start game: ${this.lobby.players.size} players, all ready: ${allReady}`);
        
        if (allReady && !this.lobby.gameActive) {
            console.log('All players ready! Starting game countdown...');
            
            // Auto-start game after 3 seconds
            setTimeout(() => {
                console.log('Countdown finished, starting game...');
                this.handleStartGame(Array.from(this.lobby.players)[0]); // First player as host
            }, 3000);
            
            // Notify players game will start soon
            this.broadcastToLobby({
                type: 'gameStarting',
                countdown: 3
            });
        }
    }
    
    handleStartGame(playerId) {
        const player = this.players.get(playerId);
        if (!player || !player.inLobby) return;
        
        // Check if game is already active
        if (this.lobby.gameActive) {
            player.ws.send(JSON.stringify({
                type: 'error',
                message: 'Game already in progress'
            }));
            return;
        }
        
        // Check if at least 1 player is in lobby and all are ready
        if (this.lobby.players.size === 0) {
            player.ws.send(JSON.stringify({
                type: 'error',
                message: 'No players in lobby'
            }));
            return;
        }
        
        // Verify all players are ready
        const allReady = Array.from(this.lobby.players).every(pId => {
            const p = this.players.get(pId);
            return p && p.ready;
        });
        
        if (!allReady) {
            player.ws.send(JSON.stringify({
                type: 'error',
                message: 'Not all players are ready'
            }));
            return;
        }
        
        // Start game
        this.lobby.gameActive = true;
        this.lobby.gameState = {
            round: 1,
            roundTimer: this.ROUND_DURATION,
            lastSpawnTime: Date.now(),
            enemies: [],
            enemyCount: 0,
            level: 1
        };
        
        // Reset all player scores and lives
        this.lobby.players.forEach(pId => {
            const p = this.players.get(pId);
            if (p) {
                p.score = 0;
                p.lives = 3;
                p.x = 400;
                p.y = 300;
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
        
        console.log(`Game started with ${this.lobby.players.size} player(s)`);
    }
    
    startGameLoop() {
        if (this.lobby.gameLoop) {
            clearInterval(this.lobby.gameLoop);
        }
        
        const GAME_TICK = 1000 / 60; // 60 FPS
        this.lobby.gameLoop = setInterval(() => {
            this.updateGame();
        }, GAME_TICK);
    }
    
    updateGame() {
        if (!this.lobby.gameActive || !this.lobby.gameState) return;
        
        const now = Date.now();
        const deltaTime = 16; // Approximate 60 FPS
        const gameState = this.lobby.gameState;
        
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
        
        // Broadcast game state update
        this.broadcastGameState();
    }
    
    spawnEnemy() {
        const enemyId = `enemy${this.lobby.gameState.enemyCount++}`;
        const level = this.lobby.gameState.level;
        
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
        
        this.lobby.gameState.enemies.push(enemy);
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
    
    updateEnemies(deltaTime) {
        this.lobby.gameState.enemies = this.lobby.gameState.enemies.filter(enemy => {
            enemy.x += enemy.velocityX * deltaTime;
            enemy.y += enemy.velocityY * deltaTime;
            return enemy.y < 650 && enemy.x > -50 && enemy.x < 850;
        });
    }
    
    checkCollisions() {
        this.lobby.players.forEach(playerId => {
            const player = this.players.get(playerId);
            if (!player || player.lives <= 0) return;
            
            this.lobby.gameState.enemies.forEach(enemy => {
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < (15 + enemy.radius)) {
                    // Player hit!
                    player.lives -= enemy.damage;
                    
                    // Remove enemy
                    this.lobby.gameState.enemies = this.lobby.gameState.enemies.filter(e => e.id !== enemy.id);
                    
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
                            playerId: playerId,
                            canRevive: this.lobby.gameState.round < 10
                        });
                    }
                }
            });
        });
    }
    
    handlePlayerHit(playerId, enemyId) {
        // Handled in checkCollisions
    }
    
    handleEnemyKilled(playerId, enemyId) {
        const player = this.players.get(playerId);
        if (!player || !player.inLobby) return;
        
        // Remove enemy
        this.lobby.gameState.enemies = this.lobby.gameState.enemies.filter(e => e.id !== enemyId);
        
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
    
    endRound() {
        const currentRound = this.lobby.gameState.round;
        const nextRound = currentRound + 1;
        
        this.lobby.gameState.round = nextRound;
        this.lobby.gameState.level = nextRound;
        this.lobby.gameState.roundTimer = this.ROUND_DURATION;
        this.lobby.gameState.enemies = [];
        
        // Add round bonus to all players
        this.lobby.players.forEach(playerId => {
            const player = this.players.get(playerId);
            if (player) {
                const roundBonus = 500 * currentRound;
                player.score += roundBonus;
            }
        });
        
        // Revive dead players for next round
        const revivedPlayers = [];
        this.lobby.players.forEach(playerId => {
            const player = this.players.get(playerId);
            if (player && player.lives <= 0) {
                player.lives = 3;
                player.x = 400;
                player.y = 300;
                revivedPlayers.push(playerId);
            }
        });
        
        // Broadcast round end
        this.broadcastToLobby({
            type: 'roundEnded',
            round: currentRound,
            nextRound: nextRound,
            roundTimer: this.ROUND_DURATION,
            revivedPlayers: revivedPlayers,
            revivalMessage: revivedPlayers.length > 0 ? 
                `${revivedPlayers.length} player(s) revived!` : null
        });
        
        // Check if game over (10 rounds)
        if (nextRound > 10) {
            this.endGame();
        }
    }
    
    endGame() {
        this.lobby.gameActive = false;
        if (this.lobby.gameLoop) {
            clearInterval(this.lobby.gameLoop);
            this.lobby.gameLoop = null;
        }
        
        // Calculate winner
        let winnerId = null;
        let highestScore = -1;
        
        this.lobby.players.forEach(playerId => {
            const player = this.players.get(playerId);
            if (player && player.score > highestScore) {
                highestScore = player.score;
                winnerId = playerId;
            }
        });
        
        const winner = winnerId ? this.players.get(winnerId) : null;
        
        this.broadcastToLobby({
            type: 'gameEnded',
            winnerId: winnerId,
            winnerName: winner?.name,
            finalScores: Array.from(this.lobby.players).map(playerId => {
                const player = this.players.get(playerId);
                return [playerId, player?.score || 0];
            })
        });
        
        // Reset lobby after game ends
        setTimeout(() => {
            this.resetLobby();
        }, 10000); // Reset after 10 seconds
        
        console.log(`Game ended. Winner: ${winner?.name}`);
    }
    
    resetLobby() {
        this.lobby.players.clear();
        this.lobby.gameActive = false;
        this.lobby.gameState = null;
        
        // Reset all players' lobby state
        this.players.forEach(player => {
            player.inLobby = false;
            player.ready = false;
        });
        
        console.log('Lobby reset');
    }
    
    broadcastGameState() {
        if (!this.lobby.gameActive || !this.lobby.gameState) return;
        
        this.broadcastToLobby({
            type: 'gameStateUpdate',
            round: this.lobby.gameState.round,
            roundTimer: Math.max(0, this.lobby.gameState.roundTimer),
            enemies: this.lobby.gameState.enemies,
            level: this.lobby.gameState.level
        });
    }
    
    getLobbyPlayers() {
        return Array.from(this.lobby.players).map(playerId => {
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
    
    getOnlinePlayerCount() {
        // Count all connected players (including those not in lobby)
        let count = 0;
        this.players.forEach(player => {
            if (player.connected) {
                count++;
            }
        });
        return count;
    }
    
    broadcastToLobby(message, excludePlayerId = null) {
        this.lobby.players.forEach(playerId => {
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
            
            // Leave lobby if in one
            if (player.inLobby) {
                this.handleLeaveLobby(playerId);
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
            🎮 Unified Multiplayer Server
            =============================
            Server running on port: ${this.port}
            WebSocket endpoint: ws://localhost:${this.port}
            
            Features:
            - Single lobby system (max 4 players)
            - Ready system - game starts when all ready
            - Full game synchronization
            - Player revival each round
            - 10-round progression
            
            How to play:
            1. Click "Multiplayer Lobby" button
            2. Join the lobby
            3. Click "Ready"
            4. Game starts automatically when all ready
            5. Play 10 rounds together!
            `);
        });
    }
}

// Start server if run directly
if (require.main === module) {
    const port = process.env.PORT || 8080;
    const server = new UnifiedMultiplayerServer(port);
    server.start();
    
    process.on('SIGINT', () => {
        console.log('\n👋 Shutting down server...');
        process.exit(0);
    });
}

module.exports = UnifiedMultiplayerServer;