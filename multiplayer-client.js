// Multiplayer Client for Dodge This Shit Game
class MultiplayerClient {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.ws = null;
        this.connected = false;
        this.playerId = null;
        this.playerName = 'Player';
        this.lobbyId = null;
        this.isHost = false;
        this.otherPlayers = new Map();
        
        // Default server URL (can be changed by user)
        this.serverUrl = 'ws://localhost:8080';
        
        // Initialize when game is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    init() {
        console.log('Initializing multiplayer client...');
        
        // Create multiplayer button if it doesn't exist
        this.createMultiplayerButton();
        
        // Try to connect to server
        this.connectToServer();
    }
    
    createMultiplayerButton() {
        // Check if button already exists
        if (document.getElementById('multiplayer-btn')) return;
        
        // Create multiplayer button
        const multiplayerBtn = document.createElement('button');
        multiplayerBtn.id = 'multiplayer-btn';
        multiplayerBtn.className = 'btn btn-primary';
        multiplayerBtn.textContent = '🎮 Online Multiplayer';
        multiplayerBtn.style.marginTop = '10px';
        
        // Add to start screen controls
        const startScreenControls = document.querySelector('.instructions');
        if (startScreenControls) {
            startScreenControls.appendChild(multiplayerBtn);
            
            // Add click handler
            multiplayerBtn.addEventListener('click', () => {
                this.showMultiplayerMenu();
            });
        }
    }
    
    showMultiplayerMenu() {
        // Create simple multiplayer menu
        const menuHTML = `
            <div class="multiplayer-menu" style="
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
                <h2 style="color: #00ffea; margin-bottom: 20px;">🎮 ONLINE MULTIPLAYER</h2>
                
                <div style="margin: 20px 0;">
                    <label style="display: block; margin-bottom: 10px; color: #aaa;">Server URL:</label>
                    <input type="text" id="server-url" value="${this.serverUrl}" 
                           style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); 
                                  border: 2px solid #00ffea; border-radius: 5px; color: white;">
                </div>
                
                <div style="margin: 20px 0;">
                    <label style="display: block; margin-bottom: 10px; color: #aaa;">Your Name:</label>
                    <input type="text" id="player-name" value="${this.playerName}" 
                           style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); 
                                  border: 2px solid #00ffea; border-radius: 5px; color: white;">
                </div>
                
                <div id="connection-status" style="margin: 20px 0; padding: 10px; 
                     background: rgba(0,255,234,0.1); border-radius: 8px;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <div id="status-indicator" style="width: 12px; height: 12px; 
                             border-radius: 50%; background: #ffff00;"></div>
                        <span id="status-text">Connecting to server...</span>
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 30px;">
                    <button id="connect-btn" class="btn btn-primary" style="flex: 1;">Connect</button>
                    <button id="cancel-btn" class="btn btn-danger" style="flex: 1;">Cancel</button>
                </div>
            </div>
        `;
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'multiplayer-overlay';
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
        
        // Add to document
        document.body.appendChild(overlay);
        
        // Add event listeners
        document.getElementById('connect-btn').addEventListener('click', () => {
            this.serverUrl = document.getElementById('server-url').value;
            this.playerName = document.getElementById('player-name').value || 'Player';
            this.connectToServer();
        });
        
        document.getElementById('cancel-btn').addEventListener('click', () => {
            this.hideMultiplayerMenu();
        });
    }
    
    hideMultiplayerMenu() {
        const overlay = document.getElementById('multiplayer-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
    
    updateConnectionStatus(connected, message = '') {
        const indicator = document.getElementById('status-indicator');
        const text = document.getElementById('status-text');
        
        if (indicator && text) {
            if (connected) {
                indicator.style.background = '#00ff00';
                indicator.style.boxShadow = '0 0 10px #00ff00';
                text.textContent = message || 'Connected to server!';
                
                // Auto-close menu after successful connection
                setTimeout(() => {
                    this.hideMultiplayerMenu();
                    this.showLobbyMenu();
                }, 1500);
            } else {
                indicator.style.background = '#ff0000';
                indicator.style.boxShadow = '0 0 10px #ff0000';
                text.textContent = message || 'Disconnected from server';
            }
        }
    }
    
    showLobbyMenu() {
        // Simple lobby menu for now
        alert(`Connected to multiplayer server!\n\nPlayer: ${this.playerName}\nServer: ${this.serverUrl}\n\nNote: Full multiplayer lobby system needs more development.`);
        
        // For now, just start a single-player game
        this.game.startGame();
    }
    
    connectToServer() {
        try {
            this.updateConnectionStatus(false, 'Connecting...');
            
            this.ws = new WebSocket(this.serverUrl);
            
            this.ws.onopen = () => {
                console.log('Connected to multiplayer server');
                this.connected = true;
                this.updateConnectionStatus(true, 'Connected! Setting up...');
                
                // Send initial handshake
                this.sendToServer({
                    type: 'hello',
                    name: this.playerName,
                    version: '1.0'
                });
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
                this.updateConnectionStatus(false, 'Disconnected - Server not available');
                
                // Try to reconnect after 5 seconds
                setTimeout(() => {
                    if (!this.connected) {
                        this.connectToServer();
                    }
                }, 5000);
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus(false, 'Connection failed - Check server URL');
            };
            
        } catch (error) {
            console.error('Failed to connect to server:', error);
            this.updateConnectionStatus(false, 'Connection error: ' + error.message);
        }
    }
    
    sendToServer(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not ready, cannot send message');
        }
    }
    
    handleServerMessage(message) {
        console.log('Server message:', message.type, message);
        
        switch(message.type) {
            case 'welcome':
                this.playerId = message.playerId;
                this.updateConnectionStatus(true, `Welcome ${this.playerName}!`);
                break;
                
            case 'error':
                alert(`Server error: ${message.message}`);
                break;
                
            case 'lobbyList':
                // Handle lobby list
                break;
                
            default:
                console.log('Unhandled message type:', message.type);
        }
    }
    
    // Game integration methods
    sendPlayerPosition(x, y) {
        if (this.connected) {
            this.sendToServer({
                type: 'playerMove',
                x: x,
                y: y
            });
        }
    }
    
    sendPlayerAction(action) {
        if (this.connected) {
            this.sendToServer({
                type: 'playerAction',
                action: action
            });
        }
    }
}

// Export for use in game.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiplayerClient;
}