// Unified Multiplayer Client for Dodge This Shit
class UnifiedMultiplayerClient {
    constructor(game) {
        this.game = game;
        this.ws = null;
        this.connected = false;
        this.playerId = null;
        this.playerName = 'Player';
        this.inLobby = false;
        this.lobbyPlayers = new Map();
        
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
        console.log('Unified multiplayer client initialized');
        this.addUnifiedMultiplayerButton();
        
        // DON'T auto-connect! Wait for user to click button
        // Connection will be established when user clicks "Connect & Join Lobby"
    }
    
    addUnifiedMultiplayerButton() {
        // Remove any existing multiplayer buttons
        const oldButtons = ['multiplayer-btn', 'room-mp-btn', 'sync-mp-btn', 'simple-mp-btn'];
        oldButtons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.remove();
        });
        
        // Create unified multiplayer button
        const btn = document.createElement('button');
        btn.id = 'unified-mp-btn';
        btn.className = 'btn btn-primary';
        btn.textContent = '🎮 Multiplayer Lobby';
        btn.style.marginTop = '10px';
        btn.style.width = '100%';
        btn.style.backgroundColor = '#00ffea';
        btn.style.color = '#000';
        btn.style.fontWeight = 'bold';
        
        btn.addEventListener('click', () => {
            this.showUnifiedMenu();
        });
        
        const instructions = document.querySelector('.instructions');
        if (instructions) {
            instructions.appendChild(btn);
        }
    }
    
    showUnifiedMenu() {
        const menuHTML = `
            <div class="unified-menu" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.95);
                padding: 30px;
                border-radius: 15px;
                border: 3px solid #00ffea;
                z-index: 1000;
                max-width: 600px;
                width: 90%;
                text-align: center;
            ">
                <h2 style="color: #00ffea; margin-bottom: 20px;">🎮 MULTIPLAYER LOBBY</h2>
                <p style="color: #aaa; margin-bottom: 20px;">
                    Join the single lobby (max 4 players). When all players click "Ready", the game starts automatically!
                </p>
                
                <div id="unified-connection-section" ${this.connected ? 'style="display: none;"' : ''}>
                    <div style="margin: 20px 0;">
                        <label style="display: block; margin-bottom: 10px; color: #aaa;">Your Name:</label>
                        <input type="text" id="unified-player-name" value="${this.playerName}" 
                               style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); 
                                      border: 2px solid #00ffea; border-radius: 5px; color: white;">
                    </div>
                    
                    <button id="unified-connect-btn" class="btn btn-primary" 
                            style="width: 100%; background: #00ffea; color: #000; margin-top: 20px;">
                        Connect & Join Lobby
                    </button>
                </div>
                
                <div id="unified-lobby-section" ${this.connected && this.inLobby ? '' : 'style="display: none;"'}>
                    <h3 style="color: #00ffea; margin: 20px 0;">LOBBY (1-4 players)</h3>
                    <div style="margin: 10px 0; color: #aaa;">
                        <div>Lobby: <span id="lobby-player-count">0</span>/4 players</div>
                        <div>Online: <span id="online-player-count">0</span> players connected</div>
                        <div id="game-status" style="margin: 10px 0; padding: 10px; 
                             background: rgba(0, 255, 234, 0.1); border-radius: 8px;">
                            ${this.gameActive ? 'Game in progress' : 'Click "Ready" when everyone is here'}
                        </div>
                    </div>
                    
                    <div id="unified-lobby-players" style="margin: 20px 0; max-height: 200px; overflow-y: auto;">
                        <div style="padding: 10px; background: rgba(0, 255, 234, 0.1); border-radius: 8px;">
                            Loading players...
                        </div>
                    </div>
                    
                    <div id="unified-lobby-controls" style="margin-top: 20px;">
                        <button id="unified-ready-btn" class="btn" 
                                style="margin: 5px; background: #ffa500; color: #000; ${this.gameActive ? 'display: none;' : ''}">
                            ${this.lobbyPlayers.get(this.playerId)?.ready ? 'Not Ready' : 'Ready Up'}
                        </button>
                        <button id="unified-leave-btn" class="btn btn-danger" style="margin: 5px;">
                            Leave Lobby
                        </button>
                    </div>
                    
                    <div id="game-starting-countdown" style="display: none; margin: 20px 0; padding: 15px;
                         background: rgba(255, 165, 0, 0.2); border-radius: 10px; border: 2px solid #ffa500;">
                        <h4 style="color: #ffa500; margin: 0;">Game starting in <span id="countdown-timer">3</span>...</h4>
                    </div>
                </div>
                
                <div id="unified-game-info" style="display: none; margin: 20px 0; padding: 15px;
                     background: rgba(0, 255, 234, 0.1); border-radius: 10px;">
                    <h4 style="color: #00ffea; margin-bottom: 10px;">GAME INFO</h4>
                    <div style="color: #aaa;">
                        <div>Round: <span id="game-round">1</span>/10</div>
                        <div>Time left: <span id="game-timer">30</span>s</div>
                        <div>Level: <span id="game-level">1</span></div>
                    </div>
                </div>
                
                <button id="unified-close-btn" class="btn btn-danger" style="margin-top: 20px;">Close</button>
            </div>
        `;
        
        const overlay = document.createElement('div');
        overlay.id = 'unified-multiplayer-overlay';
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
        document.getElementById('unified-connect-btn').addEventListener('click', () => {
            this.playerName = document.getElementById('unified-player-name').value || 'Player';
            this.connectAndJoinLobby();
        });
        
        document.getElementById('unified-ready-btn').addEventListener('click', () => {
            this.toggleReady();
        });
        
        document.getElementById('unified-leave-btn').addEventListener('click', () => {
            this.leaveLobby();
        });
        
        document.getElementById('unified-close-btn').addEventListener('click', () => {
            this.hideUnifiedMenu();
        });
    }
    
    hideUnifiedMenu() {
        const overlay = document.getElementById('unified-multiplayer-overlay');
        if (overlay) overlay.remove();
    }
    
    connectAndJoinLobby() {
        // Prevent multiple connections
        if (this.connected) {
            this.showMessage('Already connected!');
            return;
        }
        
        // Prevent connecting if already trying to connect
        if (this.connecting) {
            this.showMessage('Already connecting...');
            return;
        }
        
        this.connecting = true;
        
        try {
            console.log(`Connecting to ${this.serverUrl}...`);
            this.ws = new WebSocket(this.serverUrl);
            
            this.ws.onopen = () => {
                console.log('Connected to unified server');
                this.connected = true;
                this.connecting = false;
                this.showMessage('Connected! Joining lobby...');
                this.joinLobby();
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
                console.log('Disconnected from server');
                this.connected = false;
                this.inLobby = false;
                this.lobbyPlayers.clear();
                this.serverEnemies.clear();
                this.gameActive = false;
                this.showMessage('Disconnected from server');
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.connecting = false;
                this.showMessage('Connection failed. Make sure server is running!');
            };
            
        } catch (error) {
            console.error('Failed to connect:', error);
            this.showMessage(`Connection error: ${error.message}`);
        }
    }
    
    joinLobby() {
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'joinLobby'
            }));
        }
    }
    
    leaveLobby() {
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'leaveLobby'
            }));
        }
        this.inLobby = false;
        this.lobbyPlayers.clear();
        this.updateLobbyUI();
    }
    
    toggleReady() {
        if (!this.connected || !this.inLobby || this.gameActive) return;
        
        const currentPlayer = this.lobbyPlayers.get(this.playerId);
        const newReadyState = !(currentPlayer?.ready || false);
        
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'setReady',
                ready: newReadyState
            }));
        }
    }
    
    handleMessage(message) {
        console.log('Unified server message:', message.type);
        
        switch (message.type) {
            case 'welcome':
                this.playerId = message.playerId;
                this.playerName = message.name;
                break;
                
            case 'lobbyJoined':
                this.inLobby = true;
                this.lobbyPlayers.clear();
                message.players.forEach(player => {
                    this.lobbyPlayers.set(player.id, player);
                });
                this.updateLobbyUI();
                this.updateOnlinePlayerCount(message.onlinePlayers || 1);
                this.showMessage('Joined lobby!');
                break;
                
            case 'playerJoined':
                this.lobbyPlayers.set(message.playerId, {
                    id: message.playerId,
                    name: message.playerName,
                    color: message.playerColor,
                    ready: false,
                    score: 0,
                    lives: 3
                });
                this.showMessage(`${message.playerName} joined the lobby!`);
                this.updateLobbyUI();
                this.updateOnlinePlayerCount(message.onlinePlayers);
                break;
                
            case 'playerLeft':
                const leftPlayer = this.lobbyPlayers.get(message.playerId);
                if (leftPlayer) {
                    this.showMessage(`${leftPlayer.name} left the lobby`);
                    this.lobbyPlayers.delete(message.playerId);
                    this.updateLobbyUI();
                    this.updateOnlinePlayerCount(message.onlinePlayers);
                }
                break;
                
            case 'playerReady':
                const player = this.lobbyPlayers.get(message.playerId);
                if (player) {
                    player.ready = message.ready;
                    this.updateLobbyUI();
                    
                    if (message.playerId === this.playerId) {
                        const btn = document.getElementById('unified-ready-btn');
                        if (btn) {
                            btn.textContent = message.ready ? 'Not Ready' : 'Ready Up';
                            btn.style.background = message.ready ? '#ff0000' : '#ffa500';
                        }
                    }
                }
                break;
                
            case 'gameStarting':
                this.showGameStartingCountdown(message.countdown);
                break;
                
            case 'gameStarted':
                this.gameActive = true;
                this.syncGameState(message.initialGameState);
                this.hideUnifiedMenu();
                this.startUnifiedGame();
                this.showMessage('Game started! Good luck!');
                break;
                
            case 'gameStateUpdate':
                this.updateGameState(message);
                this.updateGameInfoUI();
                break;
                
            case 'playerMoved':
                const movingPlayer = this.lobbyPlayers.get(message.playerId);
                if (movingPlayer) {
                    movingPlayer.x = message.x;
                    movingPlayer.y = message.y;
                }
                break;
                
            case 'playerHit':
                if (message.playerId === this.playerId) {
                    this.game.lives = message.lives;
                    this.game.updateUI();
                    
                    if (message.lives <= 0) {
                        this.showMessage('You died! Will revive next round.');
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
                    const deadPlayer = this.lobbyPlayers.get(message.playerId);
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
                const scoringPlayer = this.lobbyPlayers.get(message.playerId);
                if (scoringPlayer) {
                    scoringPlayer.score = message.score;
                    this.updateLobbyUI();
                }
                break;
                
            case 'roundEnded':
                this.serverRound = message.nextRound;
                this.serverRoundTimer = message.roundTimer;
                
                if (message.revivalMessage) {
                    this.showMessage(`Round ${message.round} complete! ${message.revivalMessage}`);
                } else {
                    this.showMessage(`Round ${message.round} complete! Starting round ${message.nextRound}`);
                }
                
                // Update revived players
                if (message.revivedPlayers && message.revivedPlayers.includes(this.playerId)) {
                    this.game.lives = 3;
                    this.game.updateUI();
                    this.showMessage('You have been revived!');
                }
                break;
                
            case 'gameEnded':
                this.gameActive = false;
                this.showMessage(`Game over! Winner: ${message.winnerName}`);
                // Show final scores
                setTimeout(() => {
                    alert(`Game Over!\n\nWinner: ${message.winnerName}\n\nFinal Scores:\n${
                        message.finalScores.map(([id, score]) => {
                            const player = this.lobbyPlayers.get(id);
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
    }
    
    startUnifiedGame() {
        // Configure game for unified multiplayer
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
        
        // Update UI
        this.game.updateUI();
    }
    
    updateOnlinePlayerCount(count) {
        const onlineCount = document.getElementById('online-player-count');
        if (onlineCount) {
            onlineCount.textContent = count;
        }
    }
    
    updateLobbyUI() {
        if (!this.inLobby) return;
        
        // Update player count
        const playerCount = document.getElementById('lobby-player-count');
        if (playerCount) {
            playerCount.textContent = this.lobbyPlayers.size;
        }
        
        // Update player list
        const playersDiv = document.getElementById('unified-lobby-players');
        if (playersDiv) {
            playersDiv.innerHTML = Array.from(this.lobbyPlayers.values()).map(player => `
                <div style="margin: 5px 0; padding: 10px; background: rgba(255,255,255,0.05); 
                     border-radius: 5px; display: flex; align-items: center; gap: 10px;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: ${player.color};"></div>
                    <div style="flex: 1; color: ${player.id === this.playerId ? '#00ffea' : 'white'}">
                        ${player.name} ${player.id === this.playerId ? '(You)' : ''}
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <div style="color: #ffa500;">${player.score}</div>
                        <div style="color: ${player.ready ? '#00ff00' : '#ffa500'};">
                            ${player.ready ? '✅ Ready' : '⏳ Not Ready'}
                        </div>
                    </div>
                </div>
            `).join('');
        }
        
        // Show/hide connection section
        const connectionSection = document.getElementById('unified-connection-section');
        const lobbySection = document.getElementById('unified-lobby-section');
        
        if (connectionSection && lobbySection) {
            connectionSection.style.display = 'none';
            lobbySection.style.display = 'block';
        }
        
        // Update game status
        const gameStatus = document.getElementById('game-status');
        if (gameStatus) {
            if (this.gameActive) {
                gameStatus.textContent = 'Game in progress';
                gameStatus.style.background = 'rgba(255, 165, 0, 0.2)';
            } else {
                const readyCount = Array.from(this.lobbyPlayers.values()).filter(p => p.ready).length;
                gameStatus.textContent = `Ready: ${readyCount}/${this.lobbyPlayers.size}`;
                gameStatus.style.background = 'rgba(0, 255, 234, 0.1)';
            }
        }
    }
    
    showGameStartingCountdown(seconds) {
        const countdownDiv = document.getElementById('game-starting-countdown');
        const timerSpan = document.getElementById('countdown-timer');
        
        if (countdownDiv && timerSpan) {
            countdownDiv.style.display = 'block';
            timerSpan.textContent = seconds;
            
            let countdown = seconds;
            const countdownInterval = setInterval(() => {
                countdown--;
                if (timerSpan) {
                    timerSpan.textContent = countdown;
                }
                
                if (countdown <= 0) {
                    clearInterval(countdownInterval);
                    countdownDiv.style.display = 'none';
                }
            }, 1000);
        }
    }
    
    updateGameInfoUI() {
        const gameInfo = document.getElementById('unified-game-info');
        if (gameInfo) {
            gameInfo.style.display = 'block';
            
            const roundSpan = document.getElementById('game-round');
            const timerSpan = document.getElementById('game-timer');
            const levelSpan = document.getElementById('game-level');
            
            if (roundSpan) roundSpan.textContent = this.serverRound;
            if (timerSpan) timerSpan.textContent = Math.ceil(this.serverRoundTimer / 1000);
            if (levelSpan) levelSpan.textContent = this.serverLevel;
        }
    }
    
    sendMove(x, y) {
        if (this.connected && this.inLobby && this.gameActive && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'move',
                x: x,
                y: y
            }));
        }
    }
    
    sendPlayerHit(enemyId) {
        if (this.connected && this.inLobby && this.gameActive && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'playerHit',
                enemyId: enemyId
            }));
        }
    }
    
    sendEnemyKilled(enemyId) {
        if (this.connected && this.inLobby && this.gameActive && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'enemyKilled',
                enemyId: enemyId
            }));
        }
    }
    
    drawOtherPlayers(ctx) {
        this.lobbyPlayers.forEach(player => {
            if (player.id !== this.playerId && player.x && player.y) {
                const isDead = player.lives <= 0;
                
                // Draw other player
                ctx.fillStyle = isDead ? `${player.color}80` : player.color;
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
                const statusText = isDead ? '💀' : `(${player.score})`;
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
            color: #00ffea;
            padding: 10px 20px;
            border-radius: 10px;
            border: 2px solid #00ffea;
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
    window.UnifiedMultiplayerClient = UnifiedMultiplayerClient;
    
    // The client will be created when user clicks "Multiplayer Lobby" button
    // No auto-initialization to prevent duplicate connections
}
