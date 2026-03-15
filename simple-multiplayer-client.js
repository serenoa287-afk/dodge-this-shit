// Simple Multiplayer Client for Dodge This Shit
class SimpleMultiplayerClient {
    constructor(game) {
        this.game = game;
        this.ws = null;
        this.connected = false;
        this.playerId = null;
        this.playerName = 'Player';
        this.otherPlayers = new Map();
        
        this.serverUrl = 'ws://localhost:8080';
        
        this.init();
    }
    
    init() {
        console.log('Simple multiplayer client initialized');
        
        // Add multiplayer button to game
        this.addMultiplayerButton();
    }
    
    addMultiplayerButton() {
        // Create button if it doesn't exist
        if (!document.getElementById('simple-mp-btn')) {
            const btn = document.createElement('button');
            btn.id = 'simple-mp-btn';
            btn.className = 'btn btn-primary';
            btn.textContent = '🎮 Simple Multiplayer';
            btn.style.marginTop = '10px';
            btn.style.width = '100%';
            
            btn.addEventListener('click', () => {
                this.connect();
            });
            
            // Add to start screen
            const instructions = document.querySelector('.instructions');
            if (instructions) {
                instructions.appendChild(btn);
            }
        }
    }
    
    connect() {
        if (this.connected) {
            alert('Already connected to server!');
            return;
        }
        
        // Get player name
        const name = prompt('Enter your name:', this.playerName) || this.playerName;
        this.playerName = name;
        
        try {
            console.log(`Connecting to ${this.serverUrl}...`);
            
            this.ws = new WebSocket(this.serverUrl);
            
            this.ws.onopen = () => {
                console.log('Connected to multiplayer server');
                this.connected = true;
                this.game.isMultiplayer = true;
                
                // Show connected message
                this.showMessage('Connected to multiplayer server!');
                
                // Start game
                this.game.startGame();
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
                this.game.isMultiplayer = false;
                this.otherPlayers.clear();
                
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
    
    handleMessage(message) {
        switch (message.type) {
            case 'welcome':
                this.playerId = message.playerId;
                this.playerName = message.name;
                console.log(`Welcome! You are ${this.playerName} (${this.playerId})`);
                break;
                
            case 'playerList':
                // Add existing players
                message.players.forEach(player => {
                    this.otherPlayers.set(player.id, {
                        id: player.id,
                        name: player.name,
                        color: player.color,
                        x: player.x,
                        y: player.y
                    });
                });
                break;
                
            case 'playerJoined':
                // Add new player
                this.otherPlayers.set(message.playerId, {
                    id: message.playerId,
                    name: message.name,
                    color: message.color,
                    x: message.x,
                    y: message.y
                });
                this.showMessage(`${message.name} joined the game!`);
                break;
                
            case 'playerLeft':
                // Remove player
                const player = this.otherPlayers.get(message.playerId);
                if (player) {
                    this.showMessage(`${player.name} left the game`);
                    this.otherPlayers.delete(message.playerId);
                }
                break;
                
            case 'playerMoved':
                // Update player position
                const movingPlayer = this.otherPlayers.get(message.playerId);
                if (movingPlayer) {
                    movingPlayer.x = message.x;
                    movingPlayer.y = message.y;
                }
                break;
                
            case 'chat':
                // Show chat message
                console.log(`[${message.playerName}]: ${message.message}`);
                break;
                
            case 'playerAction':
                // Handle other player actions
                console.log(`Player ${message.playerId} performed action:`, message.action);
                break;
        }
    }
    
    sendMove(x, y) {
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'move',
                x: x,
                y: y
            }));
        }
    }
    
    sendAction(action) {
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'action',
                action: action
            }));
        }
    }
    
    sendChat(text) {
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'chat',
                text: text
            }));
        }
    }
    
    showMessage(text) {
        // Simple message display
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
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }
    
    drawOtherPlayers(ctx) {
        this.otherPlayers.forEach(player => {
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
        });
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
        this.connected = false;
        this.game.isMultiplayer = false;
        this.otherPlayers.clear();
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.SimpleMultiplayerClient = SimpleMultiplayerClient;
}