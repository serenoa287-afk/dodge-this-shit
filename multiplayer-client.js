            case 'gameEnded':
                this.game.endMultiplayerGame(message.winnerId, message.scores);
                this.updateScoreboard(message.scores);
                break;
                
            case 'lobbyReset':
                this.resetLobby();
                break;
                
            case 'chat':
                this.addChatMessage(message.playerName, message.text, message.timestamp);
                break;
                
            case 'error':
                this.showError(message.message);
                break;
        }
    }
    
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
    
    requestLobbyList() {
        this.send({ type: 'getLobbies' });
    }
    
    createLobby(name) {
        this.send({ type: 'createLobby', name });
    }
    
    joinLobby(lobbyId) {
        this.send({ type: 'joinLobby', lobbyId });
    }
    
    leaveLobby() {
        this.send({ type: 'leaveLobby' });
        this.lobbyId = null;
        this.isHost = false;
        this.showLobbySection();
        this.players.clear();
        document.getElementById('start-game-btn').style.display = 'none';
    }
    
    setReady(ready) {
        this.send({ type: 'setReady', ready });
        const btn = document.getElementById('ready-btn');
        btn.textContent = ready ? 'Not Ready' : 'Ready';
        btn.style.background = ready ? '#00ff00' : '#ff6b6b';
    }
    
    startGame() {
        this.send({ type: 'startGame' });
    }
    
    sendChat() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (text) {
            this.send({ type: 'chat', text });
            input.value = '';
        }
    }
    
    sendPlayerMove(position) {
        if (this.lobbyId) {
            this.send({ type: 'playerMove', position });
        }
    }
    
    sendPlayerAction(action) {
        if (this.lobbyId) {
            this.send({ type: 'playerAction', action });
        }
    }
    
    // UI Updates
    updateLobbyList(lobbies) {
        const lobbyList = document.getElementById('lobby-list');
        
        if (lobbies.length === 0) {
            lobbyList.innerHTML = '<div class="empty-message">No lobbies available</div>';
            return;
        }
        
        lobbyList.innerHTML = '';
        lobbies.forEach(lobby => {
            const item = document.createElement('div');
            item.className = 'lobby-item';
            item.innerHTML = `
                <div class="lobby-name">${lobby.name}</div>
                <div class="lobby-info">
                    Host: ${lobby.hostName} | 
                    Players: ${lobby.playerCount}/${lobby.maxPlayers}
                </div>
            `;
            item.addEventListener('click', () => {
                // Remove selection from other items
                document.querySelectorAll('.lobby-item').forEach(i => {
                    i.classList.remove('selected');
                });
                item.classList.add('selected');
                this.joinLobby(lobby.id);
            });
            lobbyList.appendChild(item);
        });
    }
    
    showLobbySection() {
        document.getElementById('lobby-section').style.display = 'block';
        document.getElementById('player-section').style.display = 'none';
        document.getElementById('chat-section').style.display = 'none';
        document.getElementById('game-info').style.display = 'none';
    }
    
    showPlayerSection() {
        document.getElementById('lobby-section').style.display = 'none';
        document.getElementById('player-section').style.display = 'block';
        document.getElementById('chat-section').style.display = 'block';
    }
    
    showGameInfo() {
        document.getElementById('game-info').style.display = 'block';
    }
    
    requestLobbyInfo() {
        if (this.lobbyId) {
            this.send({ type: 'getLobbyInfo', lobbyId: this.lobbyId });
        }
    }
    
    updatePlayerList(players) {
        this.showPlayerSection();
        
        const playerList = document.getElementById('player-list');
        playerList.innerHTML = '';
        
        players.forEach(player => {
            const item = document.createElement('div');
            item.className = 'player-item';
            item.innerHTML = `
                <div class="player-info">
                    <span class="player-color" style="background: ${player.color}"></span>
                    <span class="player-name">${player.name}</span>
                </div>
                <div class="player-status ${player.ready ? 'ready' : ''} ${player.isHost ? 'host' : ''}">
                    ${player.isHost ? 'HOST' : (player.ready ? 'READY' : 'NOT READY')}
                </div>
            `;
            playerList.appendChild(item);
            
            // Store player data
            this.players.set(player.id, {
                id: player.id,
                name: player.name,
                color: player.color,
                ready: player.ready,
                isHost: player.isHost,
                score: 0,
                lives: 3,
                position: { x: 400, y: 300 }
            });
        });
    }
    
    addPlayer(playerId, name, color) {
        this.players.set(playerId, {
            id: playerId,
            name,
            color,
            ready: false,
            isHost: false,
            score: 0,
            lives: 3,
            position: { x: 400, y: 300 }
        });
        
        this.requestLobbyInfo();
    }
    
    removePlayer(playerId) {
        this.players.delete(playerId);
        this.requestLobbyInfo();
    }
    
    updatePlayerReady(playerId, ready) {
        const player = this.players.get(playerId);
        if (player) {
            player.ready = ready;
            this.requestLobbyInfo();
        }
    }
    
    updateGameState(gameState) {
        // Update UI based on game state
        const readyBtn = document.getElementById('ready-btn');
        const startBtn = document.getElementById('start-game-btn');
        
        switch (gameState) {
            case 'waiting':
                readyBtn.disabled = false;
                startBtn.disabled = !this.isHost;
                break;
            case 'starting':
            case 'playing':
                readyBtn.disabled = true;
                startBtn.disabled = true;
                break;
            case 'ended':
                readyBtn.disabled = true;
                startBtn.disabled = true;
                break;
        }
    }
    
    showCountdown(countdown) {
        const roundInfo = document.getElementById('round-info');
        roundInfo.innerHTML = `<div>Starting in ${countdown}...</div>`;
        roundInfo.style.display = 'block';
    }
    
    updateRoundInfo(round) {
        const roundInfo = document.getElementById('round-info');
        roundInfo.innerHTML = `<div>ROUND ${round}</div>`;
        roundInfo.style.display = 'block';
    }
    
    updatePlayerPosition(playerId, position) {
        const player = this.players.get(playerId);
        if (player && playerId !== this.playerId) {
            player.position = position;
            // Update visual representation in game
            this.game.updateOtherPlayer(playerId, position, player.color);
        }
    }
    
    updatePlayerScore(playerId, score) {
        const player = this.players.get(playerId);
        if (player) {
            player.score = score;
            this.updateScoreboard();
        }
    }
    
    updateScoreboard(scores = null) {
        const scoreboard = document.getElementById('scoreboard');
        
        if (scores) {
            // Convert scores object to array and sort
            const scoreArray = Object.entries(scores).map(([id, data]) => ({
                id,
                ...data
            })).sort((a, b) => b.score - a.score);
            
            scoreboard.innerHTML = '';
            scoreArray.forEach(player => {
                const item = document.createElement('div');
                item.className = 'score-item';
                item.innerHTML = `
                    <div class="score-player">
                        <span class="player-color" style="background: ${player.color}"></span>
                        <span>${player.name}</span>
                    </div>
                    <div class="score-value">${player.score}</div>
                `;
                scoreboard.appendChild(item);
            });
        } else {
            // Use local player data
            const playersArray = Array.from(this.players.values())
                .sort((a, b) => b.score - a.score);
            
            scoreboard.innerHTML = '';
            playersArray.forEach(player => {
                const item = document.createElement('div');
                item.className = 'score-item';
                item.innerHTML = `
                    <div class="score-player">
                        <span class="player-color" style="background: ${player.color}"></span>
                        <span>${player.name}</span>
                    </div>
                    <div class="score-value">${player.score}</div>
                `;
                scoreboard.appendChild(item);
            });
        }
    }
    
    handlePlayerAction(playerId, action) {
        if (playerId !== this.playerId) {
            this.game.handleOtherPlayerAction(playerId, action);
        }
    }
    
    showPlayerHit(playerId, lives) {
        const player = this.players.get(playerId);
        if (player) {
            player.lives = lives;
            this.game.showHitEffect(playerId);
        }
    }
    
    showPlayerEliminated(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            player.lives = 0;
            this.game.showEliminationEffect(playerId);
        }
    }
    
    addChatMessage(playerName, text, timestamp) {
        const chatMessages = document.getElementById('chat-messages');
        const message = document.createElement('div');
        message.className = 'chat-message';
        
        const time = new Date(timestamp);
        const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
        
        message.innerHTML = `
            <div>
                <span class="chat-sender">${playerName}:</span>
                <span class="chat-text">${text}</span>
            </div>
            <div class="chat-timestamp">${timeStr}</div>
        `;
        
        chatMessages.appendChild(message);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    showError(message) {
        const chatMessages = document.getElementById('chat-messages');
        const error = document.createElement('div');
        error.className = 'chat-message';
        error.style.borderLeft = '3px solid #ff6b6b';
        error.innerHTML = `<div style="color: #ff6b6b;">⚠️ ${message}</div>`;
        
        chatMessages.appendChild(error);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    resetLobby() {
        this.players.forEach(player => {
            player.ready = false;
            player.score = 0;
            player.lives = 3;
        });
        
        const readyBtn = document.getElementById('ready-btn');
        readyBtn.textContent = 'Ready';
        readyBtn.style.background = '';
        readyBtn.disabled = false;
        
        this.updatePlayerList(Array.from(this.players.values()));
        this.updateScoreboard();
    }
    
    // Game integration methods
    updateGameForMultiplayer() {
        // Override game methods for multiplayer
        const originalUpdate = this.game.update.bind(this.game);
        this.game.update = function(keys, deltaTime) {
            // Call original update
            originalUpdate(keys, deltaTime);
            
            // Send position to server
            if (this.multiplayer && this.multiplayer.connected && this.multiplayer.lobbyId) {
                this.multiplayer.sendPlayerMove({
                    x: this.player.x,
                    y: this.player.y
                });
            }
        };
        
        // Override player hit detection
        const originalCheckCollision = this.game.checkCollision.bind(this.game);
        this.game.checkCollision = function(player, enemy) {
            const collision = originalCheckCollision(player, enemy);
            if (collision && this.multiplayer) {
                this.multiplayer.sendPlayerAction({
                    type: 'hit'
                });
            }
            return collision;
        };
        
        // Override score updates
        const originalAddScore = this.game.addScore.bind(this.game);
        this.game.addScore = function(points) {
            originalAddScore(points);
            if (this.multiplayer) {
                this.multiplayer.sendPlayerAction({
                    type: 'score',
                    points
                });
            }
        };
    }
    
    // Show/hide multiplayer panel
    toggle() {
        if (this.multiplayerPanel.style.display === 'none') {
            this.multiplayerPanel.style.display = 'block';
            if (!this.connected) {
                this.connect();
            }
        } else {
            this.multiplayerPanel.style.display = 'none';
        }
    }
}

// Export for use in game.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiplayerClient;
}