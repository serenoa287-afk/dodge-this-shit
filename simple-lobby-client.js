// Simple Lobby Client for Dodge This Shit
class SimpleLobbyClient {
    constructor(game) {
        this.game = game;
        this.ws = null;
        this.connected = false;
        this.playerId = null;
        this.playerName = 'Player';
        this.inLobby = false;
        this.lobbyPlayers = new Map();
        
        // Player counts
        this.totalPlayers = 0;
        this.lobbyPlayerCount = 0;
        
        // Game state
        this.serverEnemies = new Map();
        this.gameActive = false;
        
        this.serverUrl = 'ws://localhost:8080';
        
        this.init();
    }
    
    init() {
        console.log('Simple lobby client initialized');
        this.updateFrontPageCounts();
    }
    
    updateFrontPageCounts() {
        // Update the front page with player counts
        const playerCountElement = document.getElementById('player-count');
        if (playerCountElement) {
            playerCountElement.textContent = `${this.totalPlayers} player(s) online`;
        } else {
            // Create element if it doesn't exist
            const instructions = document.querySelector('.instructions');
            if (instructions) {
                const countElement = document.createElement('div');
                countElement.id = 'player-count';
                countElement.style.cssText = `
                    margin: 10px 0;
                    padding: 10px;
                    background: rgba(0, 255, 234, 0.1);
                    border-radius: 8px;
                    color: #00ffea;
                    font-family: 'Press Start 2P', cursive;
                    font-size: 12px;
                    text-align: center;
                `;
                countElement.textContent = `${this.totalPlayers} player(s) online`;
                instructions.insertBefore(countElement, instructions.firstChild);
            }
        }
    }
    
    showLobbyMenu() {
        const menuHTML = `
            <div class="lobby-menu" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.95);
                padding: 30px;
                border-radius: 15px;
                border: 3px solid #00ffea;
                z-index: 1000;
                max-width: 500px;
                width: 90%;
                text-align: center;
            ">
                <h2 style="color: #00ffea; margin-bottom: 20px;">🎮 MULTIPLAYER LOBBY</h2>
                
                <div id="lobby-connection-section" ${this.connected ? 'style="display: none;"' : ''}>
                    <div style="margin: 20px 0;">
                        <label style="display: block; margin-bottom: 10px; color: #aaa;">Your Name:</label>
                        <input type="text" id="lobby-player-name" value="${this.playerName}" 
                               style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); 
                                      border: 2px solid #00ffea; border-radius: 5px; color: white;">
                    </div>
                    
                    <button id="lobby-connect-btn" class="btn btn-primary" 
                            style="width: 100%; background: #00ffea; color: #000; margin-top: 20px;">
                        Connect & Join Lobby
                    </button>
                </div>
                
                <div id="lobby-waiting-room" ${this.connected && this.inLobby ? '' : 'style="display: none;"'}>
                    <h3 style="color: #00ffea; margin: 20px 0;">WAITING ROOM</h3>
                    
                    <div style="margin: 10px 0; color: #aaa;">
                        <div>Players in lobby: <span id="lobby-count">${this.lobbyPlayerCount}</span>/4</div>
                        <div>Total online: <span id="total-count">${this.totalPlayers}</span></div>
                    </div>
                    
                    <div id="lobby-player-list" style="margin: 20px 0; max-height: 200px; overflow-y: auto;">
                        <div style="padding: 10px; background: rgba(0, 255, 234, 0.1); border-radius: 8px;">
                            Loading players...
                        </div>
                    </div>
                    
                    <div id="lobby-controls" style="margin-top: 20px;">
                        <button id="lobby-ready-btn" class="btn" 
                                style="margin: 5px; background: #ffa500; color: #000; ${this.gameActive ? 'display: none;' : ''}">
                            ${this.lobbyPlayers.get(this.playerId)?.ready ? 'Not Ready' : 'Ready Up'}
                        </button>
                        <button id="lobby-leave-btn" class="btn btn-danger" style="margin: 5px;">
                            Leave Lobby
                        </button>
                    </div>
                    
                    <div id="game-starting-countdown" style="display: none; margin: 20px 0; padding: 15px;
                         background: rgba(255, 165, 0, 0.2); border-radius: 10px; border: 2px solid #ffa500;">
                        <h4 style="color: #ffa500; margin: 0;">Game starting in <span id="countdown-timer">3</span>...</h4>
                    </div>
                </div>
                
                <button id="lobby-close-btn" class="btn btn-danger" style="margin-top: 20px;">Close</button>
            </div>
        `;
        
        const overlay = document.createElement('div');
        overlay.id = 'lobby-overlay';
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
        document.getElementById('lobby-connect-btn').addEventListener('click', () => {
            this.playerName = document.getElementById('lobby-player-name').value || 'Player';
            this.connect();
        });
        
        document.getElementById('lobby-ready-btn').addEventListener('click', () => {
            this.toggleReady();
        });
        
        document.getElementById('lobby-leave-btn').addEventListener('click', () => {
            this.leaveLobby();
        });
        
        document.getElementById('lobby-close-btn').addEventListener('click', () => {
            this.hideLobbyMenu();
        });
    }
    
    hideLobbyMenu() {
        const overlay = document.getElementById('lobby-overlay');
        if (overlay) overlay.remove();
    }
    
    connect() {
        if (this.connected) {
            this.joinLobby();
            return;
        }
        
        try {
            this.ws = new WebSocket(this.serverUrl);
            
            this.ws.onopen = () => {
                console.log('Connected to lobby server');
                this.connected = true;
                this.showMessage('Connected! Joining lobby...');
                
                // Show waiting room
                document.getElementById('lobby-connection-section').style.display = 'none';
                document.getElementById('lobby-waiting-room').style.display = 'block';
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
                console.log('Disconnected from lobby server');
                this.connected = false;
                this.inLobby = false;
                this.lobbyPlayers.clear();
                this.showMessage('Disconnected from server');
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
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
        console.log('Lobby message:', message.type);
        
        switch (message.type) {
            case 'welcome':
                this.playerId = message.playerId;
                this.playerName = message.name;
                this.totalPlayers = message.totalPlayers;
                this.lobbyPlayerCount = message.lobbyPlayers;
                this.updateFrontPageCounts();
                this.joinLobby(); // Auto-join lobby after welcome
                break;
                
            case 'lobbyJoined':
                this.inLobby = true;
                this.lobbyPlayers.clear();
                message.players.forEach(player => {
                    this.lobbyPlayers.set(player.id, player);
                });
                this.totalPlayers = message.totalPlayers;
                this.lobbyPlayerCount = message.lobbyPlayers;
                this.updateLobbyUI();
                this.updateFrontPageCounts();
                this.showMessage('Joined lobby!');
                break;
                
            case 'playerJoinedLobby':
                this.lobbyPlayers.set(message.playerId, {
                    id: message.playerId,
                    name: message.playerName,
                    color: message.playerColor,
                    ready: false,
                    score: 0,
                    lives: 3
                });
                this.lobbyPlayerCount = this.lobbyPlayers.size;
                this.updateLobbyUI();
                this.showMessage(`${message.playerName} joined the lobby!`);
                break;
                
            case 'playerLeftLobby':
                const leftPlayer = this.lobbyPlayers.get(message.playerId);
                if (leftPlayer) {
                    this.showMessage(`${leftPlayer.name} left the lobby`);
                    this.lobbyPlayers.delete(message.playerId);
                    this.lobbyPlayerCount = this.lobbyPlayers.size;
                    this.updateLobbyUI();
                }
                break;
                
            case 'playerReady':
                const player = this.lobbyPlayers.get(message.playerId);
                if (player) {
                    player.ready = message.ready;
                    this.updateLobbyUI();
                    
                    if (message.playerId === this.playerId) {
                        const btn = document.getElementById('lobby-ready-btn');
                        if (btn) {
                            btn.textContent = message.ready ? 'Not Ready' : 'Ready Up';
                            btn.style.background = message.ready ? '#ff0000' : '#ffa500';
                        }
                    }
                }
                break;
                
            case 'playerMoved':
                const movingPlayer = this.lobbyPlayers.get(message.playerId);
                if (movingPlayer && message.playerId !== this.playerId) {
                    movingPlayer.x = message.x;
                    movingPlayer.y = message.y;
                }
                break;
                
            case 'playerCountUpdate':
                this.totalPlayers = message.totalPlayers;
                this.lobbyPlayerCount = message.lobbyPlayers;
                this.updateFrontPageCounts();
                this.updateLobbyUI();
                break;
                
            case 'gameStarting':
                this.showGameStartingCountdown(message.countdown);
                break;
                
            case 'gameStarted':
                this.gameActive = true;
                this.hideLobbyMenu();
                this.startGame(message);
                this.showMessage('Game started! Good luck!');
                break;
                
            case 'gameStateUpdate':
                this.updateGameState(message);
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
                    this.showMessage('You died!');
                } else {
                    const deadPlayer = this.lobbyPlayers.get(message.playerId);
                    if (deadPlayer) {
                        this.showMessage(`${deadPlayer.name} died!`);
                    }
                }
                break;
                
            case 'scoreUpdate':
                const scoringPlayer = this.lobbyPlayers.get(message.playerId);
                if (scoringPlayer) {
                    scoringPlayer.score = message.score;
                }
                break;
                
            case 'roundEnded':
                this.showMessage(`Round ${message.round} complete! Starting round ${message.nextRound}`);
                break;
                
            case 'gameEnded':
                this.gameActive = false;
                this.showMessage(`Game over! Winner: ${message.winnerName}`);
                break;
                
            case 'error':
                this.showMessage(`Error: ${message.message}`);
                break;
        }
    }
    
    updateLobbyUI() {
        if (!this.inLobby) return;
        
        // Update counts
        const lobbyCount = document.getElementById('lobby-count');
        const totalCount = document.getElementById('total-count');
        if (lobbyCount) lobbyCount.textContent = this.lobbyPlayerCount;
        if (totalCount) totalCount.textContent = this.totalPlayers;
        
        // Update player list
        const playerList = document.getElementById('lobby-player-list');
        if (playerList) {
            if (this.lobbyPlayers.size === 0) {
                playerList.innerHTML = '<div style="padding: 10px; color: #aaa;">No players in lobby</div>';
            } else {
                playerList.innerHTML = Array.from(this.lobbyPlayers.values()).map(player => `
                    <div style="margin: 5px 0; padding: 10px; background: rgba(255,255,255,0.05); 
                         border-radius: 5px; display: flex; align-items: center; gap: 10px;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${player.color};"></div>
                        <div style="flex: 1; color: ${player.id === this.playerId ? '#00ffea' : 'white'}">
                            ${player.name} ${player.id === this.playerId ? '(You)' : ''}
                        </div>
                        <div style="color: ${player.ready ? '#00ff00' : '#ffa500'};">
                            ${player.ready ? '✅ Ready' : '⏳ Not Ready'}
                        </div>
                    </div>
                `).join('');
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
    
    startGame(message) {
        // Configure game for multiplayer
        this.game.isMultiplayer = true;
        this.game.multiplayer = this;
        
        // Reset game state
        this.game.score = 0;
        this.game.lives = 3;
        this.game.level = message.initialGameState?.level || 1;
        this.game.roundTimer = message.roundTimer || 30000;
        this.game.roundActive = true;
        
        // Clear local enemies
        this.game.enemies = [];
        
        // Start game
        this.game.gameState = 'playing';
        this.game.startGame();
        this.game.updateUI();
    }
    
    updateGameState(message) {
        // Update server enemies
        this.serverEnemies.clear();
        if (message.enemies) {
            message.enemies.forEach(enemy => {
                this.serverEnemies.set(enemy.id, enemy);
            });
        }
        
        // Update other player positions
        if (message.players) {
            message.players.forEach(playerData => {
                if (playerData.id !== this.playerId) {
                    const player = this.lobbyPlayers.get(playerData.id);
                    if (player) {
                        player.x = playerData.x;
                        player.y = playerData.y;
                        player.lives = playerData.lives;
                        player.score = playerData.score;
                    }
                }
            });
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
                // Draw other player
                ctx.fillStyle = player.color;
                ctx.beginPath();
                ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw outline
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
                ctx.stroke();
                
                // Draw name and score
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px "Roboto Mono"';
                ctx.textAlign = 'center';
                ctx.fillText(`${player.name} (${player.score})`, player.x, player.y - 25);
                
                // Draw lives
                if (player.lives > 0) {
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
    window.SimpleLobbyClient = SimpleLobbyClient;
    
    // Initialize when game is ready
    window.addEventListener('load', () => {
        // Wait for game to be initialized
        setTimeout(() => {
            if (window.game) {
                window.game.simpleLobbyClient = new SimpleLobbyClient(window.game);
            }
        }, 1000);
    });
}