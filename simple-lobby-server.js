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
        this.betweenRounds = false;
        this.roundEndTimer = null;
        
        // Game constants
        this.ROUND_DURATION = 10000; // 10 seconds per round (easier)
        this.ENEMY_SPAWN_INTERVAL = 500; // Much faster spawn rate
        this.ENEMIES_PER_SPAWN = 3; // Spawn multiple enemies at once
        this.ROUND_END_DELAY = 4000; // 4 seconds between rounds
        
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
                
                // Broadcast to lobby (include sender so their UI updates)
                this.broadcastToLobby({
                    type: 'playerReady',
                    playerId: playerId,
                    ready: player.ready
                });
                
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
        
        // If game is active and no players left in lobby, stop the game
        if (this.gameActive && this.lobbyPlayers.size === 0) {
            console.log('🛑 All players left the game, stopping game...');
            this.endGame();
        }
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
        
        console.log(`🎮 Starting game with ${this.lobbyPlayers.size} players`);
        console.log(`   Round duration: ${this.ROUND_DURATION}ms`);
        console.log(`   Enemy spawn interval: ${this.ENEMY_SPAWN_INTERVAL}ms`);
        
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
        console.log(`🔄 Starting game loop (${GAME_TICK.toFixed(1)}ms tick)`);
        this.gameLoop = setInterval(() => {
            this.updateGame();
        }, GAME_TICK);
    }
    
    updateGame() {
        if (!this.gameActive || !this.gameState) return;
        
        const now = Date.now();
        const deltaTime = 16;
        const gameState = this.gameState;
        
        // Update round timer (only if not between rounds)
        if (!this.betweenRounds) {
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
        }
        
        // Update enemies
        this.updateEnemies(deltaTime);
        
        // Check collisions
        this.checkCollisions();
        
        // Broadcast game state
        this.broadcastGameState();
    }
    
    spawnEnemy() {
        // Use pattern-based spawning like single player
        const roundProgress = this.gameState.roundTimer / this.ROUND_DURATION;
        const patternType = this.getPatternType(roundProgress);
        
        console.log(`🎯 Spawning pattern: ${patternType} (level ${this.gameState.level}, progress ${roundProgress.toFixed(2)})`);
        
        switch(patternType) {
            case 'single':
                this.spawnSingleEnemy();
                break;
            case 'row':
                this.spawnRowPattern();
                break;
            case 'column':
                this.spawnColumnPattern();
                break;
            case 'staggered':
                this.spawnStaggeredPattern();
                break;
            case 'wave':
                this.spawnWavePattern();
                break;
            case 'chaserWave':
                this.spawnChaserWave();
                break;
        }
    }
    
    getPatternType(roundProgress) {
        const level = this.gameState.level;
        // Progressive pattern unlocking based on level
        let patterns = [];
        
        if (level === 1) {
            // Level 1: Only single enemies
            patterns = [{ type: 'single', weight: 1.0 }];
        } else if (level === 2) {
            // Level 2: Mostly single, occasional rows
            patterns = [
                { type: 'single', weight: 0.8 },
                { type: 'row', weight: 0.2 }
            ];
        } else if (level === 3) {
            // Level 3: Add columns
            patterns = [
                { type: 'single', weight: 0.6 },
                { type: 'row', weight: 0.2 },
                { type: 'column', weight: 0.2 }
            ];
        } else if (level === 4) {
            // Level 4: Add staggered
            patterns = [
                { type: 'single', weight: 0.5 },
                { type: 'row', weight: 0.2 },
                { type: 'column', weight: 0.2 },
                { type: 'staggered', weight: 0.1 }
            ];
        } else if (level === 5) {
            // Level 5: Add waves
            patterns = [
                { type: 'single', weight: 0.4 },
                { type: 'row', weight: 0.2 },
                { type: 'column', weight: 0.2 },
                { type: 'staggered', weight: 0.1 },
                { type: 'wave', weight: 0.1 }
            ];
        } else if (level === 6) {
            // Level 6: Add chaser waves
            patterns = [
                { type: 'single', weight: 0.3 },
                { type: 'row', weight: 0.2 },
                { type: 'column', weight: 0.2 },
                { type: 'staggered', weight: 0.15 },
                { type: 'wave', weight: 0.1 },
                { type: 'chaserWave', weight: 0.05 }
            ];
        } else if (level >= 7) {
            // Levels 7-10: Full patterns with progression
            patterns = [
                { type: 'single', weight: 0.25 },
                { type: 'row', weight: 0.2 },
                { type: 'column', weight: 0.2 },
                { type: 'staggered', weight: 0.15 },
                { type: 'wave', weight: 0.1 },
                { type: 'chaserWave', weight: 0.1 }
            ];
            
            // Adjust based on round progress
            if (roundProgress > 0.5) {
                patterns[0].weight = 0.15;  // Less single
                patterns[3].weight = 0.2;   // More staggered
                patterns[4].weight = 0.15;  // More waves
                patterns[5].weight = 0.15;  // More chaser waves
            }
            
            if (roundProgress > 0.8) {
                patterns[0].weight = 0.1;
                patterns[1].weight = 0.25;
                patterns[2].weight = 0.25;
                patterns[3].weight = 0.15;
                patterns[4].weight = 0.15;
                patterns[5].weight = 0.1;
            }
        }
        
        const random = Math.random();
        let cumulative = 0;
        
        for (const pattern of patterns) {
            cumulative += pattern.weight;
            if (random < cumulative) {
                return pattern.type;
            }
        }
        
        return 'single';
    }
    
    spawnSingleEnemy() {
        const enemyId = `enemy${this.gameState.enemyCount++}`;
        const level = this.gameState.level;
        
        const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        let x, y, velocityX, velocityY;
        
        const baseSpeed = 0.3 + (level * 0.05);
        const speed = Math.min(0.5, baseSpeed);
        
        switch(side) {
            case 0: // Top
                x = Math.random() * 800;
                y = -50;
                velocityX = (Math.random() - 0.5) * 0.1;
                velocityY = speed;
                break;
            case 1: // Right
                x = 850;
                y = Math.random() * 600;
                velocityX = -speed;
                velocityY = (Math.random() - 0.5) * 0.1;
                break;
            case 2: // Bottom
                x = Math.random() * 800;
                y = 650;
                velocityX = (Math.random() - 0.5) * 0.1;
                velocityY = -speed;
                break;
            case 3: // Left
                x = -50;
                y = Math.random() * 600;
                velocityX = speed;
                velocityY = (Math.random() - 0.5) * 0.1;
                break;
        }
        
        const enemy = {
            id: enemyId,
            x: x,
            y: y,
            velocityX: velocityX,
            velocityY: velocityY,
            radius: 10 + (level * 2),
            type: 'basic',
            color: '#ff0000',
            health: 1,
            damage: 1
        };
        
        this.gameState.enemies.push(enemy);
        console.log(`  Spawned single enemy at (${x.toFixed(0)}, ${y.toFixed(0)})`);
    }
    
    spawnRowPattern() {
        const level = this.gameState.level;
        const side = Math.floor(Math.random() * 2); // 0: top, 1: bottom
        const baseSpeed = 0.3 + (level * 0.05);
        const speed = Math.min(0.45, baseSpeed);
        
        // Number of enemies in row: 3-7, increases with level
        const count = 3 + Math.floor(Math.random() * 3) + Math.min(2, Math.floor(level / 3));
        const spacing = 800 / (count + 1);
        
        console.log(`  Spawning row of ${count} enemies`);
        
        for (let i = 1; i <= count; i++) {
            const enemyId = `enemy${this.gameState.enemyCount++}`;
            let x, y, velocityX, velocityY;
            
            if (side === 0) { // Top row
                x = i * spacing;
                y = -50 - (i * 10); // Stagger them slightly
                velocityX = 0;
                velocityY = speed;
            } else { // Bottom row
                x = i * spacing;
                y = 650 + (i * 10);
                velocityX = 0;
                velocityY = -speed;
            }
            
            const enemy = {
                id: enemyId,
                x: x,
                y: y,
                velocityX: velocityX,
                velocityY: velocityY,
                radius: 10 + (level * 2),
                type: 'basic',
                color: '#ff0000',
                health: 1,
                damage: 1
            };
            
            this.gameState.enemies.push(enemy);
        }
    }
    
    spawnColumnPattern() {
        const level = this.gameState.level;
        const side = Math.floor(Math.random() * 2); // 0: left, 1: right
        const baseSpeed = 0.3 + (level * 0.05);
        const speed = Math.min(0.45, baseSpeed);
        
        // Number of enemies in column: 3-7, increases with level
        const count = 3 + Math.floor(Math.random() * 3) + Math.min(2, Math.floor(level / 3));
        const spacing = 600 / (count + 1);
        
        console.log(`  Spawning column of ${count} enemies`);
        
        for (let i = 1; i <= count; i++) {
            const enemyId = `enemy${this.gameState.enemyCount++}`;
            let x, y, velocityX, velocityY;
            
            if (side === 0) { // Left column
                x = -50 - (i * 10); // Stagger them slightly
                y = i * spacing;
                velocityX = speed;
                velocityY = 0;
            } else { // Right column
                x = 850 + (i * 10);
                y = i * spacing;
                velocityX = -speed;
                velocityY = 0;
            }
            
            const enemy = {
                id: enemyId,
                x: x,
                y: y,
                velocityX: velocityX,
                velocityY: velocityY,
                radius: 10 + (level * 2),
                type: 'basic',
                color: '#ff0000',
                health: 1,
                damage: 1
            };
            
            this.gameState.enemies.push(enemy);
        }
    }
    
    spawnStaggeredPattern() {
        const level = this.gameState.level;
        const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        const baseSpeed = 0.3 + (level * 0.05);
        const speed = Math.min(0.4, baseSpeed);
        
        // Number of enemies: 5-10, increases with level
        const count = 5 + Math.floor(Math.random() * 4) + Math.min(3, Math.floor(level / 2));
        
        console.log(`  Spawning staggered pattern of ${count} enemies`);
        
        for (let i = 0; i < count; i++) {
            const enemyId = `enemy${this.gameState.enemyCount++}`;
            let x, y, velocityX, velocityY;
            
            switch(side) {
                case 0: // Top - staggered horizontally
                    x = Math.random() * 800;
                    y = -50 - (i * 30);
                    velocityX = 0;
                    velocityY = speed;
                    break;
                case 1: // Right - staggered vertically
                    x = 850 + (i * 30);
                    y = Math.random() * 600;
                    velocityX = -speed;
                    velocityY = 0;
                    break;
                case 2: // Bottom - staggered horizontally
                    x = Math.random() * 800;
                    y = 650 + (i * 30);
                    velocityX = 0;
                    velocityY = -speed;
                    break;
                case 3: // Left - staggered vertically
                    x = -50 - (i * 30);
                    y = Math.random() * 600;
                    velocityX = speed;
                    velocityY = 0;
                    break;
            }
            
            const enemy = {
                id: enemyId,
                x: x,
                y: y,
                velocityX: velocityX,
                velocityY: velocityY,
                radius: 10 + (level * 2),
                type: 'basic',
                color: '#ff0000',
                health: 1,
                damage: 1
            };
            
            this.gameState.enemies.push(enemy);
        }
    }
    
    spawnWavePattern() {
        const level = this.gameState.level;
        console.log(`  Spawning wave pattern (level ${level})`);
        
        // Spawn multiple patterns at once for intense waves
        const patterns = ['row', 'column', 'staggered'];
        const patternCount = 1 + Math.floor(Math.random() * 2) + Math.min(1, Math.floor(level / 5));
        
        for (let i = 0; i < patternCount; i++) {
            const pattern = patterns[Math.floor(Math.random() * patterns.length)];
            
            switch(pattern) {
                case 'row':
                    this.spawnRowPattern();
                    break;
                case 'column':
                    this.spawnColumnPattern();
                    break;
                case 'staggered':
                    this.spawnStaggeredPattern();
                    break;
            }
        }
    }
    
    spawnChaserWave() {
        const level = this.gameState.level;
        const baseSpeed = 0.3 + (level * 0.05);
        const speed = Math.min(0.4, baseSpeed);
        
        // Spawn 3-5 chasers from different corners
        const count = 3 + Math.floor(Math.random() * 3);
        
        console.log(`  Spawning chaser wave of ${count} enemies`);
        
        for (let i = 0; i < count; i++) {
            const enemyId = `enemy${this.gameState.enemyCount++}`;
            let x, y, velocityX, velocityY;
            
            // Each chaser from a different corner
            switch(i % 4) {
                case 0: // Top-left
                    x = -50 - (i * 20);
                    y = -50 - (i * 20);
                    velocityX = speed * 0.6;
                    velocityY = speed * 0.6;
                    break;
                case 1: // Top-right
                    x = 850 + (i * 20);
                    y = -50 - (i * 20);
                    velocityX = -speed * 0.6;
                    velocityY = speed * 0.6;
                    break;
                case 2: // Bottom-left
                    x = -50 - (i * 20);
                    y = 650 + (i * 20);
                    velocityX = speed * 0.6;
                    velocityY = -speed * 0.6;
                    break;
                case 3: // Bottom-right
                    x = 850 + (i * 20);
                    y = 650 + (i * 20);
                    velocityX = -speed * 0.6;
                    velocityY = -speed * 0.6;
                    break;
            }
            
            const enemy = {
                id: enemyId,
                x: x,
                y: y,
                velocityX: velocityX,
                velocityY: velocityY,
                radius: 10 + (level * 2),
                type: 'chaser',
                color: '#ff9900',
                health: 1,
                damage: 1
            };
            
            this.gameState.enemies.push(enemy);
        }
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
                            playerId: playerId,
                            withAnimation: true
                        });
                        
                        // Check if ALL players are dead
                        const allPlayersDead = Array.from(this.lobbyPlayers).every(playerId => {
                            const p = this.players.get(playerId);
                            return p && p.lives <= 0;
                        });
                        
                        if (allPlayersDead) {
                            console.log('💀 All players dead! Game over.');
                            this.endGame();
                        }
                    }
                }
            });
        });
    }
    
    endRound() {
        const currentRound = this.gameState.round;
        const nextRound = currentRound + 1;
        
        // Set between rounds state
        this.betweenRounds = true;
        this.gameState.enemies = [];
        
        // Broadcast round end with 4-second delay
        this.broadcastToLobby({
            type: 'roundEnded',
            round: currentRound,
            nextRound: nextRound,
            delay: this.ROUND_END_DELAY
        });
        
        console.log(`🎉 Round ${currentRound} complete! Next round in ${this.ROUND_END_DELAY/1000} seconds...`);
        
        // Start next round after delay
        if (this.roundEndTimer) clearTimeout(this.roundEndTimer);
        this.roundEndTimer = setTimeout(() => {
            this.startNextRound(nextRound);
        }, this.ROUND_END_DELAY);
        
        // Check if game over
        if (nextRound > 10) {
            this.endGame();
        }
    }
    
    startNextRound(nextRound) {
        this.betweenRounds = false;
        
        this.gameState.round = nextRound;
        this.gameState.level = nextRound;
        this.gameState.roundTimer = this.ROUND_DURATION;
        this.gameState.lastSpawnTime = Date.now();
        
        // Revive dead players
        this.lobbyPlayers.forEach(playerId => {
            const player = this.players.get(playerId);
            if (player && player.lives <= 0) {
                player.lives = 3;
                player.x = 400;
                player.y = 300;
                
                // Notify player revived
                this.broadcastToLobby({
                    type: 'playerRevived',
                    playerId: playerId,
                    lives: 3
                });
            }
        });
        
        // Broadcast round start
        this.broadcastToLobby({
            type: 'roundStarted',
            round: nextRound,
            roundTimer: this.ROUND_DURATION
        });
        
        console.log(`🎮 Starting round ${nextRound}`);
    }
    
    endGame() {
        console.log('🛑 Ending game...');
        this.gameActive = false;
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
        
        // Clear game state
        this.gameState = null;
        this.betweenRounds = false;
        if (this.roundEndTimer) {
            clearTimeout(this.roundEndTimer);
            this.roundEndTimer = null;
        }
        
        // Send all players back to title screen
        this.broadcastToLobby({
            type: 'gameEnded',
            backToTitle: true,
            message: 'Game Over! All players died.'
        });
        
        // Clear lobby immediately
        this.lobbyPlayers.forEach(playerId => {
            const player = this.players.get(playerId);
            if (player) {
                player.inLobby = false;
                player.ready = false;
                player.score = 0;
                player.lives = 3;
            }
        });
        
        this.lobbyPlayers.clear();
        
        // Update player counts
        this.broadcastToAll({
            type: 'playerCountUpdate',
            totalPlayers: this.players.size,
            lobbyPlayers: 0
        });
        
        console.log('✅ Game ended, players returned to title screen');
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
        
        const message = {
            type: 'gameStateUpdate',
            round: this.gameState.round,
            roundTimer: Math.max(0, this.gameState.roundTimer),
            enemies: this.gameState.enemies,
            level: this.gameState.level,
            players: playerStates
        };
        
        console.log(`📤 Broadcasting game state: ${this.gameState.enemies.length} enemies, ${playerStates.length} players`);
        this.broadcastToLobby(message);
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