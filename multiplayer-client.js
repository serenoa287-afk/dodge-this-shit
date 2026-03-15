            border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 1.2em;
                transition: all 0.3s ease;
            }
            
            .chat-toggle:hover {
                background: rgba(0, 255, 234, 0.3);
                transform: scale(1.1);
            }
            
            .chat-minimized {
                position: absolute;
                top: 50px;
                right: 0;
                width: 300px;
                background: rgba(0, 0, 0, 0.9);
                border: 2px solid #00ffea;
                border-radius: 10px;
                padding: 10px;
                display: none;
            }
            
            .chat-minimized input {
                width: 100%;
                padding: 8px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid #00ffea;
                border-radius: 5px;
                color: white;
                font-family: 'Roboto Mono', monospace;
            }
            
            .chat-minimized.active {
                display: block;
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // Multiplayer menu events
        document.getElementById('update-name')?.addEventListener('click', () => {
            const nameInput = document.getElementById('player-name');
            if (nameInput.value.trim()) {
                this.setPlayerName(nameInput.value.trim());
            }
        });
        
        document.getElementById('player-name')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const nameInput = document.getElementById('player-name');
                if (nameInput.value.trim()) {
                    this.setPlayerName(nameInput.value.trim());
                }
            }
        });
        
        document.getElementById('create-lobby')?.addEventListener('click', () => {
            const lobbyName = document.getElementById('lobby-name').value.trim() || 'Dodge Arena';
            this.createLobby(lobbyName);
        });
        
        document.getElementById('refresh-lobbies')?.addEventListener('click', () => {
            this.requestLobbyList();
        });
        
        document.getElementById('back-to-single')?.addEventListener('click', () => {
            this.showScreen('start');
        });
        
        // Lobby screen events
        document.getElementById('ready-checkbox')?.addEventListener('change', (e) => {
            this.setReady(e.target.checked);
        });
        
        document.getElementById('start-game')?.addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('leave-lobby')?.addEventListener('click', () => {
            this.leaveLobby();
        });
        
        document.getElementById('send-chat')?.addEventListener('click', () => {
            this.sendChatMessage();
        });
        
        document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });
        
        // In-game chat events
        document.querySelector('.chat-toggle')?.addEventListener('click', () => {
            const chatMinimized = document.querySelector('.chat-minimized');
            chatMinimized.classList.toggle('active');
        });
        
        document.getElementById('game-chat-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const input = document.getElementById('game-chat-input');
                if (input.value.trim()) {
                    this.sendChatMessage(input.value.trim());
                    input.value = '';
                }
            }
        });
    }
    
    connectToServer() {
        try {
            this.ws = new WebSocket(this.serverUrl);
            
            this.ws.onopen = () => {
                console.log('Connected to multiplayer server');
                this.connected = true;
                this.updateConnectionStatus('connected');
                this.requestLobbyList();
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleServerMessage(message);
                } catch (error) {
                    console.error('Error parsing server message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('Disconnected from multiplayer server');
                this.connected = false;
                this.updateConnectionStatus('disconnected');
                
                // Try to reconnect after 3 seconds
                setTimeout(() => {
                    if (!this.connected) {
                        this.connectToServer();
                    }
                }, 3000);
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus('disconnected');
            };
            
        } catch (error) {
            console.error('Failed to connect to server:', error);
            this.updateConnectionStatus('disconnected');
        }
    }
    
    updateConnectionStatus(status) {
        const statusElem = document.getElementById('connection-status');
        if (!statusElem) return;
        
        const indicator = statusElem.querySelector('.status-indicator');
        const text = statusElem.querySelector('span');
        
        indicator.className = 'status-indicator ' + status;
        
        switch(status) {
            case 'connected':
                text.textContent = 'Connected to server';
                break;
            case 'connecting':
                text.textContent = 'Connecting to server...';
                break;
            case 'disconnected':
                text.textContent = 'Disconnected - Trying to reconnect...';
                break;
        }
    }
    
    sendToServer(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not ready, cannot send message:', message);
        }
    }
    
    handleServerMessage(message) {
        console.log('Server message:', message.type, message);
        
        switch(message.type) {
            case 'welcome':
                this.handleWelcome(message);
                break;
            case 'lobbyList':
                this.handleLobbyList(message);
                break;
            case 'lobbyCreated':
                this.handleLobbyCreated(message);
                break;
            case 'lobbyInfo':
                this.handleLobbyInfo(message);
                break;
            case 'playerJoined':
                this.handlePlayerJoined(message);
                break;
            case 'playerLeft':
                this.handlePlayerLeft(message);
                break;
            case 'playerReady':
                this.handlePlayerReady(message);
                break;
            case 'newHost':
                this.handleNewHost(message);
                break;
            case 'gameStarting':
                this.handleGameStarting(message);
                break;
            case 'gameCountdown':
                this.handleGameCountdown(message);
                break;
            case 'roundStarted':
                this.handleRoundStarted(message);
                break;
            case 'enemiesSpawned':
                this.handleEnemiesSpawned(message);
                break;
            case 'playerMoved':
                this.handlePlayerMoved(message);
                break;
            case 'playerAction':
                this.handlePlayerAction(message);
                break;
            case 'playerHit':
                this.handlePlayerHit(message);
                break;
            case 'playerEliminated':
                this.handlePlayerEliminated(message);
                break;
            case 'playerScored':
                this.handlePlayerScored(message);
                break;
            case 'roundEnded':
                this.handleRoundEnded(message);
                break;
            case 'gameEnded':
                this.handleGameEnded(message);
                break;
            case 'lobbyReset':
                this.handleLobbyReset(message);
                break;
            case 'chat':
                this.handleChatMessage(message);
                break;
            case 'error':
                this.handleError(message);
                break;
        }
    }
    
    // Message handlers
    handleWelcome(message) {
        this.playerId = message.playerId;
        this.playerName = message.name || this.playerName;
        document.getElementById('player-name').value = this.playerName;
    }
    
    handleLobbyList(message) {
        this.updateLobbyList(message.lobbies || []);
    }
    
    handleLobbyCreated(message) {
        this.lobbyId = message.lobbyId;
        this.isHost = message.isHost;
        this.showScreen('lobby');
        this.requestLobbyInfo();
    }
    
    handleLobbyInfo(message) {
        this.lobbyId = message.lobbyId;
        this.isHost = message.hostId === this.playerId;
        this.updateLobbyInfo(message);
    }
    
    handlePlayerJoined(message) {
        this.addOtherPlayer(message.playerId, message.name, message.color);
        this.updatePlayerCount();
    }
    
    handlePlayerLeft(message) {
        this.removeOtherPlayer(message.playerId);
        this.updatePlayerCount();
    }
    
    handlePlayerReady(message) {
        this.updatePlayerReady(message.playerId, message.ready);
    }
    
    handleNewHost(message) {
        this.isHost = message.hostId === this.playerId;
        this.updateHost(message.hostId);
    }
    
    handleGameStarting(message) {
        this.showGameCountdown(message.countdown);
    }
    
    handleGameCountdown(message) {
        this.updateCountdown(message.countdown);
    }
    
    handleRoundStarted(message) {
        this.startMultiplayerGame(message);
    }
    
    handleEnemiesSpawned(message) {
        this.addServerEnemies(message.enemies);
    }
    
    handlePlayerMoved(message) {
        this.updateOtherPlayerPosition(message.playerId, message.position);
    }
    
    handlePlayerAction(message) {
        // Handle other player actions (dash, etc.)
        if (message.action.type === 'dash') {
            this.showPlayerDashEffect(message.playerId);
        }
    }
    
    handlePlayerHit(message) {
        this.updatePlayerLives(message.playerId, message.lives);
    }
    
    handlePlayerEliminated(message) {
        this.markPlayerEliminated(message.playerId);
    }
    
    handlePlayerScored(message) {
        this.updatePlayerScore(message.playerId, message.totalScore);
    }
    
    handleRoundEnded(message) {
        this.showRoundEnd(message);
    }
    
    handleGameEnded(message) {
        this.showGameEnd(message);
    }
    
    handleLobbyReset(message) {
        this.resetLobby();
    }
    
    handleChatMessage(message) {
        this.addChatMessage(message.playerName, message.text, message.timestamp);
    }
    
    handleError(message) {
        this.showError(message.message || 'An error occurred');
    }
    
    // UI Methods
    showScreen(screen) {
        // Hide all screens
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('multiplayer-screen').style.display = 'none';
        document.getElementById('lobby-screen').style.display = 'none';
        document.getElementById('game-over').style.display = 'none';
        document.getElementById('multiplayer-game-overlay').style.display = 'none';
        
        // Show requested screen
        switch(screen) {
            case 'start':
                document.getElementById('start-screen').style.display = 'flex';
                break;
            case 'multiplayer':
                document.getElementById('multiplayer-screen').style.display = 'flex';
                break;
            case 'lobby':
                document.getElementById('lobby-screen').style.display = 'flex';
                break;
            case 'game':
                document.getElementById('multiplayer-game-overlay').style.display = 'block';
                // Hide canvas overlays
                document.getElementById('game-over').style.display = 'none';
                break;
        }
    }
    
    updateLobbyList(lobbies) {
        const lobbyList = document.getElementById('lobby-list');
        if (!lobbyList) return;
        
        if (lobbies.length === 0) {
            lobbyList.innerHTML = '<div class="lobby-item empty">No lobbies available</div>';
            return;
        }
        
        lobbyList.innerHTML = lobbies.map(lobby => `
            <div class="lobby-item" data-lobby-id="${lobby.id}">
                <div class="lobby-info">
                    <div class="lobby-name">${lobby.name}</div>
                    <div class="lobby-host">Host: ${lobby.hostName}</div>
                </div>
                <div class="lobby-stats">
                    ${lobby.playerCount}/${lobby.maxPlayers} players
                </div>
            </div>
        `).join('');
        
        // Add click handlers
        lobbyList.querySelectorAll('.lobby-item:not(.empty)').forEach(item => {
            item.addEventListener('click', () => {
                const lobbyId = item.dataset.lobbyId;
                this.joinLobby(lobbyId);
            });
        });
    }
    
    updateLobbyInfo(info) {
        // Update lobby title
        document.getElementById('lobby-title').textContent = info.lobbyName;
        document.getElementById('lobby-name-display').textContent = info.lobbyName;
        
        // Update players list
        this.updatePlayersList(info.players);
        
        // Update start button
        const startBtn = document.getElementById('start-game');
        startBtn.disabled = !this.isHost;
        
        // Update player count
        this.updatePlayerCount();
    }
    
    updatePlayersList(players) {
        const playersList = document.getElementById('players-list');
        if (!playersList) return;
        
        // Clear other players
        this.otherPlayers.clear();
        
        playersList.innerHTML = players.map(player => {
            // Store player info
            this.otherPlayers.set(player.id, {
                id: player.id,
                name: player.name,
                color: player.color,
                ready: player.ready,
                isHost: player.isHost,
                position: { x: 400, y: 300 },
                score: 0,
                lives: 3
            });
            
            return `
                <div class="player-card ${player.isHost ? 'host' : ''} ${player.ready ? 'ready' : ''}" 
                     data-player-id="${player.id}">
                    ${player.isHost ? '<div class="host-badge">HOST</div>' : ''}
                    <div class="player-color" style="background: ${player.color}"></div>
                    <div class="player-name">${player.name}</div>
                    <div class="player-status ${player.ready ? 'ready' : ''}">
                        ${player.ready ? 'READY' : 'NOT READY'}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    updatePlayerCount() {
        const playerCount = document.getElementById('player-count');
        if (playerCount && this.lobbyId) {
            const count = this.otherPlayers.size + 1; // +1 for self
            playerCount.textContent = `${count}/4 players`;
        }
    }
    
    showGameCountdown(countdown) {
        const countdownElem = document.getElementById('game-countdown');
        const timerElem = document.getElementById('countdown-timer');
        
        if (countdownElem && timerElem) {
            countdownElem.style.display = 'block';
            timerElem.textContent = countdown;
        }
    }
    
    updateCountdown(countdown) {
        const timerElem = document.getElementById('countdown-timer');
        if (timerElem) {
            timerElem.textContent = countdown;
        }
    }
    
    // Game Methods
    startMultiplayerGame(message) {
        // Hide countdown
        document.getElementById('game-countdown').style.display = 'none';
        
        // Show game screen
        this.showScreen('game');
        
        // Reset game state
        this.game.resetGameState();
        this.game.gameState = 'playing';
        this.game.roundActive = true;
        this.game.roundDuration = message.duration;
        this.game.level = message.round;
        
        // Clear server enemies
        this.serverEnemies.clear();
        
        // Update scores display
        this.updateScoresDisplay();
    }
    
    updateScoresDisplay() {
        const scoresElem = document.getElementById('player-scores');
        if (!scoresElem) return;
        
        // Add self to scores
        const players = Array.from(this.otherPlayers.values());
        players.unshift({
            id: this.playerId,
            name: this.playerName,
            color: '#00ffea',
            score: this.game.score,
            lives: this.game.lives,
            isYou: true
        });
        
        scoresElem.innerHTML = players.map(player => `
            <div class="score-item ${player.isYou ? 'you' : ''}">
                <div class="score-player">
                    <div class="score-color" style="background: ${player.color}"></div>
                    <div class="score-name">${player.name}</div>
                </div>
                <div class="score-info">
                    <span class="score-value">${player.score}</span>
                    <span class="score-lives">❤️ ${player.lives}</span>
                </div>
            </div>
        `).join('');
    }
    
    // Server Communication Methods
    requestLobbyList() {
        this.sendToServer({ type: 'getLobbies' });
    }
    
    requestLobbyInfo() {
        if (this.lobbyId) {
            this.sendToServer({ type: 'getLobbyInfo', lobbyId: this.lobbyId });
        }
    }
    
    setPlayerName(name) {
        this.playerName = name;
        this.sendToServer({ type: 'setName', name });
    }
    
    createLobby(name) {
        this.sendToServer({ type: 'createLobby', name });
    }
    
    joinLobby(lobbyId) {
        this.sendToServer({ type: 'joinLobby', lobbyId });
    }
    
    leaveLobby() {
        this.sendToServer({ type: 'leaveLobby' });
        this.lobbyId = null;
        this.isHost = false;
        this.otherPlayers.clear();
        this.showScreen('multiplayer');
        this.requestLobbyList();
    }
    
    setReady(ready) {
        this.sendToServer({ type: 'setReady', ready });
    }
    
    startGame() {
        if (this.isHost) {
            this.sendToServer({ type: 'startGame' });
        }
    }
    
    sendChatMessage(text = null) {
        if (!text) {
            const input = document.getElementById('chat-input');
            text = input.value.trim();
            input.value = '';
        }
        
        if (text) {
            this.sendToServer({ type: 'chat', text });
        }
    }
    
    sendPlayerMove(position) {
        if (this.lobbyId && this.game.gameState === 'playing') {
            this.sendToServer({ type: 'playerMove', position });
        }
    }
    
    sendPlayerAction(action)