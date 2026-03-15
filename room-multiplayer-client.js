// Room-based Multiplayer Client for Dodge This Shit
class RoomMultiplayerClient {
    constructor(game) {
        this.game = game;
        this.ws = null;
        this.connected = false;
        this.playerId = null;
        this.playerName = 'Player';
        this.roomId = null;
        this.roomPlayers = new Map();
        this.rooms = [];
        
        this.serverUrl = 'ws://localhost:8080';
        
        this.init();
    }
    
    init() {
        console.log('Room multiplayer client initialized');
        this.addRoomMultiplayerButton();
    }
    
    addRoomMultiplayerButton() {
        if (!document.getElementById('room-mp-btn')) {
            const btn = document.createElement('button');
            btn.id = 'room-mp-btn';
            btn.className = 'btn btn-primary';
            btn.textContent = '🎮 Room Multiplayer';
            btn.style.marginTop = '10px';
            btn.style.width = '100%';
            btn.style.backgroundColor = '#9400d3';
            
            btn.addEventListener('click', () => {
                this.showRoomMenu();
            });
            
            const instructions = document.querySelector('.instructions');
            if (instructions) {
                instructions.appendChild(btn);
            }
        }
    }
    
    showRoomMenu() {
        const menuHTML = `
            <div class="room-menu" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.95);
                padding: 30px;
                border-radius: 15px;
                border: 3px solid #9400d3;
                z-index: 1000;
                max-width: 600px;
                width: 90%;
                text-align: center;
            ">
                <h2 style="color: #9400d3; margin-bottom: 20px;">🎮 ROOM MULTIPLAYER</h2>
                
                <div id="connection-section">
                    <div style="margin: 20px 0;">
                        <label style="display: block; margin-bottom: 10px; color: #aaa;">Server URL:</label>
                        <input type="text" id="server-url" value="${this.serverUrl}" 
                               style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); 
                                      border: 2px solid #9400d3; border-radius: 5px; color: white;">
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <label style="display: block; margin-bottom: 10px; color: #aaa;">Your Name:</label>
                        <input type="text" id="player-name" value="${this.playerName}" 
                               style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); 
                                      border: 2px solid #9400d3; border-radius: 5px; color: white;">
                    </div>
                    
                    <button id="connect-room-btn" class="btn btn-primary" 
                            style="width: 100%; background: #9400d3; margin-top: 20px;">
                        Connect to Server
                    </button>
                </div>
                
                <div id="room-section" style="display: none;">
                    <h3 style="color: #00ffea; margin: 20px 0;">Available Rooms</h3>
                    <div id="room-list" style="margin: 20px 0; max-height: 200px; overflow-y: auto;">
                        <div style="padding: 10px; background: rgba(148, 0, 211, 0.1); border-radius: 8px;">
                            Loading rooms...
                        </div>
                    </div>
                    
                    <div id="current-room" style="display: none; margin: 20px 0; padding: 15px; 
                         background: rgba(0, 255, 234, 0.1); border-radius: 10px;">
                        <h4 style="color: #00ffea; margin-bottom: 10px;">Current Room</h4>
                        <div id="room-players"></div>
                        <div id="room-controls" style="margin-top: 15px;">
                            <button id="ready-btn" class="btn" style="margin: 5px;">Ready Up</button>
                            <button id="start-btn" class="btn btn-primary" style="margin: 5px; display: none;">Start Game</button>
                            <button id="leave-btn" class="btn btn-danger" style="margin: 5px;">Leave Room</button>
                        </div>
                    </div>
                    
                    <button id="back-btn" class="btn" style="margin-top: 20px;">Back to Connection</button>
                </div>
                
                <button id="close-room-btn" class="btn btn-danger" style="margin-top: 20px;">Close</button>
            </div>
        `;
        
        const overlay = document.createElement('div');
        overlay.id = 'room-multiplayer-overlay';
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
        document.getElementById('connect-room-btn').addEventListener('click', () => {
            this.serverUrl = document.getElementById('server-url').value;
            this.playerName = document.getElementById('player-name').value || 'Player';
            this.connect();
        });
        
        document.getElementById('close-room-btn').addEventListener('click', () => {
            this.hideRoomMenu();
        });
        
        document.getElementById('back-btn').addEventListener('click', () => {
            document.getElementById('connection-section').style.display = 'block';
            document.getElementById('room-section').style.display = 'none';
        });
    }
    
    hideRoomMenu() {
        const overlay = document.getElementById('room-multiplayer-overlay');
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
                console.log('Connected to room server');
                this.connected = true;
                this.showMessage('Connected to room server!');
                
                // Show room section
                document.getElementById('connection-section').style.display = 'none';
                document.getElementById('room-section').style.display = 'block';
                this.updateRoomList();
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
                console.log('Disconnected from room server');
                this.connected = false;
                this.roomId = null;
                this.roomPlayers.clear();
                this.showMessage('Disconnected from room server');
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.showMessage('Connection failed to room server');
            };
            
        } catch (error) {
            console.error('Failed to connect:', error);
            this.showMessage(`Connection error: ${error.message}`);
        }
    }
    
    handleMessage(message) {
        console.log('Room server message:', message.type);
        
        switch (message.type) {
            case 'welcome':
                this.playerId = message.playerId;
                this.playerName = message.name;
                this.rooms = message.rooms;
                this.updateRoomList();
                break;
                
            case 'roomJoined':
                this.roomId = message.roomId;
                this.roomPlayers.clear();
                message.players.forEach(player => {
                    this.roomPlayers.set(player.id, player);
                });
                this.showCurrentRoom();
                break;
                
            case 'playerJoinedRoom':
                this.roomPlayers.set(message.playerId, {
                    id: message.playerId,
                    name: message.playerName,
                    color: message.playerColor,
                    ready: false
                });
                this.showMessage(`${message.playerName} joined the room!`);
                this.updateRoomPlayers();
                break;
                
            case 'playerLeftRoom':
                const leftPlayer = this.roomPlayers.get(message.playerId);
                if (leftPlayer) {
                    this.showMessage(`${leftPlayer.name} left the room`);
                    this.roomPlayers.delete(message.playerId);
                    this.updateRoomPlayers();
                }
                break;
                
            case 'playerReady':
                const player = this.roomPlayers.get(message.playerId);
                if (player) {
                    player.ready = message.ready;
                    this.updateRoomPlayers();
                }
                break;
                
            case 'gameStarted':
                this.game.isMultiplayer = true;
                this.game.multiplayer = this;
                this.hideRoomMenu();
                this.game.startGame();
                this.showMessage('Game started! Good luck!');
                break;
                
            case 'playerMoved':
                const movingPlayer = this.roomPlayers.get(message.playerId);
                if (movingPlayer) {
                    movingPlayer.x = message.x;
                    movingPlayer.y = message.y;
                }
                break;
                
            case 'error':
                this.showMessage(`Error: ${message.message}`);
                break;
        }
    }
    
    updateRoomList() {
        const roomList = document.getElementById('room-list');
        if (!roomList) return;
        
        if (this.rooms.length === 0) {
            roomList.innerHTML = '<div style="padding: 10px; color: #aaa;">No rooms available</div>';
            return;
        }
        
        roomList.innerHTML = this.rooms.map(room => `
            <div style="margin: 10px 0; padding: 15px; background: rgba(148, 0, 211, 0.2); 
                 border-radius: 8px; border: 1px solid #9400d3; cursor: pointer;"
                 onclick="window.currentMultiplayer?.joinRoom('${room.id}')">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: #00ffea;">${room.name}</strong>
                        <div style="color: #aaa; font-size: 0.9em;">
                            ${room.playerCount}/${room.maxPlayers} players
                            ${room.gameActive ? '• Game in progress' : ''}
                        </div>
                    </div>
                    <button style="background: #00ffea; color: black; border: none; padding: 5px 15px; 
                            border-radius: 5px; cursor: pointer;">
                        Join
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
    
    showCurrentRoom() {
        document.getElementById('current-room').style.display = 'block';
        this.updateRoomPlayers();
        
        // Setup room control buttons
        const readyBtn = document.getElementById('ready-btn');
        const startBtn = document.getElementById('start-btn');
        const leaveBtn = document.getElementById('leave-btn');
        
        readyBtn.onclick = () => {
            const isReady = !this.roomPlayers.get(this.playerId)?.ready;
            this.ws.send(JSON.stringify({
                type: 'setReady',
                ready: isReady
            }));
            readyBtn.textContent = isReady ? 'Not Ready' : 'Ready Up';
            readyBtn.style.background = isReady ? '#ffa500' : '#00ffea';
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
            document.getElementById('current-room').style.display = 'none';
            this.roomId = null;
            this.roomPlayers.clear();
        };
        
        // Show start button only for first player (host)
        const playersArray = Array.from(this.roomPlayers.keys());
        startBtn.style.display = playersArray[0] === this.playerId ? 'inline-block' : 'none';
    }
    
    updateRoomPlayers() {
        const roomPlayersDiv = document.getElementById('room-players');
        if (!roomPlayersDiv) return;
        
        roomPlayersDiv.innerHTML = Array.from(this.roomPlayers.values()).map(player => `
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
    
    sendMove(x, y) {
        if (this.connected && this.roomId && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'move',
                x: x,
                y: y
            }));
        }
    }
    
    drawOtherPlayers(ctx) {
        this.roomPlayers.forEach(player => {
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
                
                // Draw name
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px "Roboto Mono"';
                ctx.textAlign = 'center';
                ctx.fillText(player.name, player.x, player.y - 25);
                
                // Draw ready indicator
                if (player.ready) {
                    ctx.fillStyle = '#00ff00';
                    ctx.beginPath();
                    ctx.arc(player.x, player.y + 30, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        });
    }
    
    showMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: #9400d3;
            padding: 10px 20px;
            border-radius: 10px;
            border: 2px solid #9400d3;
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
    window.RoomMultiplayerClient = RoomMultiplayerClient;
    window.currentMultiplayer = null;
    
    // Initialize when page loads
    document.addEventListener('DOMContentLoaded', () => {
        window.currentMultiplayer = new RoomMultiplayerClient(window.game);
    });
}