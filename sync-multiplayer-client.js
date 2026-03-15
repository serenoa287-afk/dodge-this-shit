// Synchronized Multiplayer Client for Dodge This Shit
class SyncMultiplayerClient {
    constructor(game) {
        this.game = game;
        this.ws = null;
        this.connected = false;
        this.playerId = null;
        this.playerName = 'Player';
        this.roomId = null;
        this.roomPlayers = new Map();
        this.rooms = [];
        
        // Game state from server
        this.serverEnemies = new Map();
        this.serverRound = 1;
        this.serverRoundTimer = 30000;
        this.serverLevel = 1;
        this.gameActive = false;
        
        this.serverUrl = 'ws://localhost:8080';
        
        this.init();
    }
    
    init() {
        console.log('Sync multiplayer client initialized');
        this.addSyncMultiplayerButton();
    }
    
    addSyncMultiplayerButton() {
        if (!document.getElementById('sync-mp-btn')) {
            const btn = document.createElement('button');
            btn.id = 'sync-mp-btn';
            btn.className = 'btn btn-primary';
            btn.textContent = '🎮 Sync Multiplayer';
            btn.style.marginTop = '10px';
            btn.style.width = '100%';
            btn.style.backgroundColor = '#ffa500';
            
            btn.addEventListener('click', () => {
                this.showSyncMenu();
            });
            
            const instructions = document.querySelector('.instructions');
            if (instructions) {
                instructions.appendChild(btn);
            }
        }
    }
    
    showSyncMenu() {
        const menuHTML = `
            <div class="sync-menu" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.95);
                padding: 30px;
                border-radius: 15px;
                border: 3px solid #ffa500;
                z-index: 1000;
                max-width: 600px;
                width: 90%;
                text-align: center;
            ">
                <h2 style="color: #ffa500; margin-bottom: 20px;">🎮 SYNC MULTIPLAYER</h2>
                <p style="color: #aaa; margin-bottom: 20px;">
                    Full game synchronization: enemies, scores, rounds, and lives!
                </p>
                
                <div id="sync-connection-section">
                    <div style="margin: 20px 0;">
                        <label style="display: block; margin-bottom: 10px; color: #aaa;">Server URL:</label>
                        <input type="text" id="sync-server-url" value="${this.serverUrl}" 
                               style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); 
                                      border: 2px solid #ffa500; border-radius: 5px; color: white;">
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <label style="display: block; margin-bottom: 10px; color: #aaa;">Your Name:</label>
                        <input type="text" id="sync-player-name" value="${this.playerName}" 
                               style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); 
                                      border: 2px solid #ffa500; border-radius: 5px; color: white;">
                    </div>
                    
                    <button id="sync-connect-btn" class="btn btn-primary" 
                            style="width: 100%; background: #ffa500; margin-top: 20px;">
                        Connect to Sync Server
                    </button>
                </div>
                
                <div id="sync-room-section" style="display: none;">
                    <h3 style="color: #00ffea; margin: 20px 0;">Available Rooms</h3>
                    <div id="sync-room-list" style="margin: 20px 0; max-height: 200px; overflow-y: auto;">
                        <div style="padding: 10px; background: rgba(255, 165, 0, 0.1); border-radius: 8px;">
                            Loading rooms...
                        </div>
                    </div>
                    
                    <div id="sync-current-room" style="display: none; margin: 20px 0; padding: 15px; 
                         background: rgba(0, 255, 234, 0.1); border-radius: 10px;">
                        <h4 style="color: #00ffea; margin-bottom: 10px;">Current Room</h4>
                        <div id="sync-room-players"></div>
                        <div style="margin: 10px 0; color: #aaa;">
                            <div>Round: <span id="sync-room-round">1</span></div>
                            <div>Players: <span id="sync-room-player-count">0</span>/4</div>
                        </div>
                        <div id="sync-room-controls" style="margin-top: 15px;">
                            <button id="sync-ready-btn" class="btn" style="margin: 5px;">Ready Up</button>
                            <button id="sync-start-btn" class="btn btn-primary" style="margin: 5px; display: none;">Start Game</button>
                            <button id="sync-leave-btn" class="btn btn-danger" style="margin: 5px;">Leave Room</button>
                        </div>
                    </div>
                    
                    <button id="sync-back-btn" class="btn" style="margin-top: 20px;">Back to Connection</button>
                </div>
                
                <button id="sync-close-btn" class="btn btn-danger" style="margin-top: 20px;">Close</button>
            </div>
        `;
        
        const overlay = document.createElement('div');
        overlay.id = 'sync-multiplayer-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        overlay.innerHTML = menuHTML;
        
        document.body.appendChild(overlay);
        
        // Event listeners
        document.getElementById('sync-connect-btn').addEventListener('click', () => {
            this.serverUrl = document.getElementById('sync-server-url').value;
            this.playerName = document.getElementById('sync-player-name').value || 'Player';
            this.connect();
        });
        
        document.getElementById('sync-close-btn').addEventListener('click', () => {
            this.hideSyncMenu();
        });
        
        document.getElementById('sync-back-btn').addEventListener('click', () => {
            document.getElementById('sync-connection-section').style.display = 'block';
            document.getElementById('sync-room-section').style.display = 'none';
        });
    }
    
    hideSyncMenu() {
        const overlay = document.getElementById('sync-multiplayer-overlay');
        if (overlay) overlay.remove();
    }
    
    connect() {
        if (this.connected) {
            this.showMessage('Already connected!');
            return;
        }
        
        try {
            this.ws = new WebSocket(this.serverUrl);
            
            this.ws.onopen = () => {
                console.log('Connected to sync server');
                this.connected = true;
                this.showMessage('Connected to sync server!');
                
                // Show room section
                document.getElementById('sync-connection-section').style.display = 'none';
                document.getElementById('sync-room-section').style.display = 'block';
                this.updateSyncRoomList();
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('Disconnected from sync server');
                this.connected = false;
                this.roomId = null;
                this.roomPlayers.clear();
                this.serverEnemies.clear();
                this.gameActive = false;
                this.showMessage('Disconnected from sync server');
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.showMessage('Connection failed to sync server');
            };
            
        } catch (error) {
            console.error('Failed to connect:', error);
            this.showMessage(`Connection error: ${error.message}`);
        }
    }
    
    handleMessage(message) {
        console.log('Sync server message:', message.type);
        
        switch (message.type) {
            case 'welcome':
                this.playerId = message.playerId;
                this.playerName = message.name;
                this.rooms = message.rooms;
                this.updateSyncRoomList();
                break;
                
            case 'roomJoined':
                this.roomId = message.roomId;
                this.roomPlayers.clear();
                message.players.forEach(player => {
                    this.roomPlayers.set(player.id, player);
                });
                
                // If game is already active, sync game state
                if (message.gameState) {
                    this.syncGameState(message.gameState);
                    this.gameActive = true;
                    this.startSyncedGame();
                } else {
                    this.showCurrentSyncRoom();
                }
                break;
                
            case 'playerJoinedRoom':
                this.roomPlayers.set(message.playerId, {
                    id: message.playerId,
                    name: message.playerName,
                    color: message.playerColor,
                    ready: false,
                    score: 0,
                    lives: 3
                });
                this.showMessage(`${message.playerName} joined the room!`);
                this.updateSyncRoomPlayers();
                break;
                
            case 'playerLeftRoom':
                const leftPlayer = this.roomPlayers.get(message.playerId);
                if (leftPlayer) {
                    this.showMessage(`${leftPlayer.name} left the room`);
                    this.roomPlayers.delete(message.playerId);
                    this.updateSyncRoomPlayers();
                }
                break;
                
            case 'playerReady':
                const player = this.roomPlayers.get(message.playerId);
                if (player) {
                    player.ready = message.ready;
                    this.updateSyncRoomPlayers();
                }
                break;
                
            case 'gameStarted':
                this.gameActive = true;
                this.syncGameState(message.initialGameState);
                this.hideSyncMenu();
                this.startSyncedGame();
                this.showMessage('Game started! Enemies are synchronized!');
                break;
                
            case 'gameStateUpdate':
                this.updateGameState(message);
                break;
                
            case 'playerMoved':
                const movingPlayer = this.roomPlayers.get(message.playerId);
                if (movingPlayer) {
                    movingPlayer.x = message.x;
                    movingPlayer.y = message.y;
                }
                break;
                
            case 'playerHit':
                if (message.playerId === this.playerId) {
                    // Update local player lives
                    this.game.lives = message.lives;
                    this.game.updateUI();
                    
                    if (message.lives <= 0) {
                        this.showMessage('You died!');
                    }
                }
                break;
                
            case 'playerDied':
                if (message.playerId === this.playerId) {
                    if (message.canRevive) {
                        this.showMessage('You died! You will be revived next round.');
                    } else {
                        this.showMessage('You died in the final round! Game over.');
                    }
                } else {
                    const deadPlayer = this.roomPlayers.get(message.playerId);
                    if (deadPlayer) {
                        if (message.canRevive) {
                            this.showMessage(`${deadPlayer.name} died! Will revive next round.`);
                        } else {
                            this.showMessage(`${deadPlayer.name} died in final round!`);
                        }
                    }
                }
                break;
                
            case 'scoreUpdate':
                const scoringPlayer = this.roomPlayers.get(message.playerId);
                if (scoringPlayer) {
                    scoringPlayer.score = message.score;
                }
                break;
                
            case 'roundEnded':
                this.serverRound = message.nextRound;
                this.serverRoundTimer = message.roundTimer;
                
                // Show revival message if players were revived
                if (message.revivalMessage) {
                    this.showMessage(`Round ${message.round} complete! ${message.revivalMessage}`);
                } else {
                    this.showMessage(`Round ${message.round} complete! Starting round ${message.nextRound}`);
                }
                
                // Update revived players' lives
                if (message.revivedPlayers && message.revivedPlayers.includes(this.playerId)) {
                    // Local player was revived
                    this.game.lives = 3;
                    this.game.updateUI();
                    this.showMessage('You have been revived!');
                }
                break;
                
            case 'playerRevived':
                // Update revived player's state
                const revivedPlayer = this.roomPlayers.get(message.playerId);
                if (revivedPlayer) {
                    revivedPlayer.lives = message.lives;
                    revivedPlayer.x = message.x;
                    revivedPlayer.y = message.y;
                    
                    if (message.playerId !== this.playerId) {
                        this.showMessage(`${revivedPlayer.name} has been revived!`);
                    }
                }
                break;
                
            case 'gameEnded':
                this.gameActive = false;
                this.showMessage(`Game over! Winner: ${message.winnerName}`);
                // Show final scores
                setTimeout(() => {
                    alert(`Game Over!\n\nWinner: ${message.winnerName}\n\nFinal Scores:\n${
                        message.finalScores.map(([id, score]) => {
                            const player = this.roomPlayers.get(id);
                            return `${player?.name || 'Player'}: ${score}`;
                        }).join('\n')
                    }`);
                }, 1000);
                break;
                
            case 'error':
                this.showMessage(`Error: ${message.message}`);
                break;
        }
    }
    
    syncGameState(gameState) {
        this.serverRound = gameState.round;
        this.serverRoundTimer = gameState.roundTimer;
        this.serverLevel = gameState.level;
        
        // Sync enemies
        this.serverEnemies.clear();
        gameState.enemies.forEach(enemy => {
            this.serverEnemies.set(enemy.id, enemy);
        });
        
        // Sync scores
        gameState.scores.forEach(([playerId, score]) => {
            const player = this.roomPlayers.get(playerId);
            if (player) {
                player.score = score;
            }
        });
        
        // Sync lives
        gameState.lives.forEach(([playerId, lives]) => {
            const player = this.roomPlayers.get(playerId);
            if (player) {
                player.lives = lives;
            }
        });
    }
    
    updateGameState(message) {
        this.serverRound = message.round;
        this.serverRoundTimer = message.roundTimer;
        this.serverLevel = message.level;
        
        // Update enemies
        this.serverEnemies.clear();
        message.enemies.forEach(enemy => {
            this.serverEnemies.set(enemy.id, enemy);
        });
        
        // Update scores
        message.scores.forEach(([playerId, score]) => {
            const player = this.roomPlayers.get(playerId);
            if (player) {
                player.score = score;
            }
        });
        
        // Update lives
        message.lives.forEach(([playerId, lives]) => {
            const player = this.roomPlayers.get(playerId);
            if (player) {
                player.lives = lives;
            }
        });
    }
    
    startSyncedGame() {
        // Configure game for synchronized multiplayer
        this.game.isMultiplayer = true;
        this.game.multiplayer = this;
        this.game.useServerEnemies = true;
        
        // Reset game state
        this.game.score = 0;
        this.game.lives = 3;
        this.game.level = this.serverLevel;
        this.game.roundTimer = this.serverRoundTimer;
        this.game.roundActive = true;
        
        // Clear local enemies (will use server enemies)
        this.game.enemies = [];
        
        // Start game
        this.game.gameState = 'playing';
        this.game.startGame();
        
        // Update UI to show sync mode
        this.game.updateUI();
    }
    
    updateSyncRoomList() {
        const roomList = document.getElementById('sync-room-list');
        if (!roomList) return;
        
        if (this.rooms.length === 0) {
            roomList.innerHTML = '<div style="padding: 10px; color: #aaa;">No rooms available</div>';
            return;
        }
        
        roomList.innerHTML = this.rooms.map(room => `
            <div style="margin: 10px 0; padding: 15px; background: rgba(255, 165, 0, 0.2); 
                 border-radius: 8px; border: 1px solid #ffa500; cursor: pointer;"
                 onclick="window.currentSyncMultiplayer?.joinRoom('${room.id}')">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: #00ffea;">${room.name}</strong>
                        <div style="color: #aaa; font-size: 0.9em;">
                            ${room.playerCount}/${room.maxPlayers} players
                            ${room.gameActive ? `• Round ${room.round}` : ''}
                        </div>
                    </div>
                    <button style="background: #00ffea; color: black; border: none; padding: 5px 15px; 
                            border-radius: 5px; cursor: pointer;">
                        ${room.gameActive ? 'Spectate' : 'Join'}
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    joinRoom(roomId) {
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'joinRoom',
                roomId: roomId
            }));
        }
    }
    
    showCurrentSyncRoom() {
        document.getElementById('sync-current-room').style.display = 'block';
        this.updateSyncRoomPlayers();
        
        // Setup room control buttons
        const readyBtn = document.getElementById('sync-ready-btn');
        const startBtn = document.getElementById('sync-start-btn');
        const leaveBtn = document.getElementById('sync-leave-btn');
        
        readyBtn.onclick = () => {
            const isReady = !this.roomPlayers.get(this.playerId)?.ready;
            this.ws.send(JSON.stringify({
                type: 'setReady',
                ready: isReady
            }));
            readyBtn.textContent = isReady ? 'Not Ready' : 'Ready Up';
            readyBtn.style.background = isReady ? '#ff0000' : '#00ffea';
        };
        
        startBtn.onclick = () => {
            this.ws.send(JSON.stringify({
                type: 'startGame'
            }));
        };
        
        leaveBtn.onclick = () => {
            this.ws.send(JSON.stringify({
                type: 'leaveRoom'
            }));
            document.getElementById('sync-current-room').style.display = 'none';
            this.roomId = null;
            this.roomPlayers.clear();
            this.gameActive = false;
        };
        
        // Show start button only for first player (host)
        const playersArray = Array.from(this.roomPlayers.keys());
        startBtn.style.display = playersArray[0] === this.playerId ? 'inline-block' : 'none';
        
        // Update room info
        document.getElementById('sync-room-round').textContent = this.serverRound;
        document.getElementById('sync-room-player-count').textContent = this.roomPlayers.size;
    }
    
    updateSyncRoomPlayers() {
        const roomPlayersDiv = document.getElementById('sync-room-players');
        if (!roomPlayersDiv) return;
        
        roomPlayersDiv.innerHTML = Array.from(this.roomPlayers.values()).map(player => `
            <div style="margin: 5px 0; padding: 10px; background: rgba(255,255,255,0.05); 
                 border-radius: 5px; display: flex; align-items: center; gap: 10px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: ${player.color};"></div>
                <div style="flex: 1; color: ${player.id === this.playerId ? '#00ffea' : 'white'}">
                    ${player.name} ${player.id === this.playerId ? '(You)' : ''}
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <div style="color: #ffa500;">${player.score}</div>
                    <div style="color: ${player.lives > 0 ? '#00ff00' : '#ff0000'};">❤️ ${player.lives}</div>
                    <div style="color: ${player.ready ? '#00ff00' : '#ffa500'};">
                        ${player.ready ? '✅' : '⏳'}
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    sendMove(x, y) {
        if (this.connected && this.roomId && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'move',
                x: x,
                y: y
            }));
        }
    }
    
    sendPlayerHit(enemyId) {
        if (this.connected && this.roomId && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'playerHit',
                enemyId: enemyId
            }));
        }
    }
    
    sendEnemyKilled(enemyId) {
        if (this.connected && this.roomId && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'enemyKilled',
                enemyId: enemyId
            }));
        }
    }
    
    drawOtherPlayers(ctx) {
        this.roomPlayers.forEach(player => {
            if (player.id !== this.playerId && player.x && player.y) {
                const isDead = player.lives <= 0;
                
                // Draw other player with different style if dead
                ctx.fillStyle = isDead ? `${player.color}80` : player.color; // 50% opacity if dead
                ctx.beginPath();
                ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw outline
                ctx.strokeStyle = isDead ? '#888888' : '#ffffff';
                ctx.lineWidth = isDead ? 1 : 2;
                ctx.beginPath();
                ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
                ctx.stroke();
                
                // Draw name and score
                ctx.fillStyle = isDead ? '#888888' : '#ffffff';
                ctx.font = '12px "Roboto Mono"';
                ctx.textAlign = 'center';
                const statusText = isDead ? '💀 SPECTATING' : `(${player.score})`;
                ctx.fillText(`${player.name} ${statusText}`, player.x, player.y - 25);
                
                // Draw lives (only if alive)
                if (!isDead) {
                    ctx.fillStyle = '#ff0000';
                    for (let i = 0; i < player.lives; i++) {
                        ctx.beginPath();
                        ctx.arc(player.x - 15 + (i * 10), player.y + 25, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                
                // Draw ready indicator (only if not in game)
                if (player.ready && !this.gameActive) {
                    ctx.fillStyle = '#00ff00';
                    ctx.beginPath();
                    ctx.arc(player.x, player.y + 40, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Draw revival countdown if dead and not final round
                if (isDead && this.gameActive && this.serverRound < 10) {
                    ctx.fillStyle = '#ffff00';
                    ctx.font = '10px "Roboto Mono"';
                    ctx.textAlign = 'center';
                    ctx.fillText(`Revives round ${this.serverRound + 1}`, player.x, player.y + 40);
                }
            }
        });
    }
    
    drawServerEnemies(ctx) {
        this.serverEnemies.forEach(enemy => {
            // Draw enemy
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw enemy outline
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw enemy type indicator
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px "Roboto Mono"';
            ctx.textAlign = 'center';
            ctx.fillText(enemy.type.charAt(0).toUpperCase(), enemy.x, enemy.y + 3);
        });
    }
    
    checkCollisionsWithServerEnemies(playerX, playerY, playerRadius = 15) {
        let hitEnemyId = null;
        
        this.serverEnemies.forEach(enemy => {
            const dx = playerX - enemy.x;
            const dy = playerY - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < (playerRadius + enemy.radius)) {
                hitEnemyId = enemy.id;
            }
        });
        
        return hitEnemyId;
    }
    
    showMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: #ffa500;
            padding: 10px 20px;
            border-radius: 10px;
            border: 2px solid #ffa500;
            z-index: 1000;
            font-family: 'Press Start 2P', cursive;
            font-size: 12px;
        `;
        messageDiv.textContent = text;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.SyncMultiplayerClient = SyncMultiplayerClient;
    window.currentSyncMultiplayer = null;
    
    // Initialize when page loads
    document.addEventListener('DOMContentLoaded', () => {
        window.currentSyncMultiplayer = new SyncMultiplayerClient(window.game);
    });
}