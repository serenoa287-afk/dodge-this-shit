// Multiplayer client wrapper that loads the simple lobby client
// This file exists because game.js expects multiplayer-client.js

// Load the simple lobby client
const script = document.createElement('script');
script.src = 'simple-lobby-client.js';
script.onload = () => {
    console.log('✅ Simple lobby client loaded');
    
    // Create a wrapper class that matches what game.js expects
    if (typeof SimpleLobbyClient !== 'undefined') {
        window.MultiplayerClient = class MultiplayerClient {
            constructor(game) {
                console.log('Creating MultiplayerClient wrapper');
                // Create the actual simple lobby client
                this.simpleClient = new SimpleLobbyClient(game);
                
                // Proxy properties
                Object.defineProperty(this, 'gameActive', {
                    get: () => this.simpleClient.gameActive,
                    set: (value) => { this.simpleClient.gameActive = value; }
                });
                
                Object.defineProperty(this, 'players', {
                    get: () => this.simpleClient.lobbyPlayers || new Map()
                });
                
                // Proxy methods that game.js expects
                this.updateGameForMultiplayer = () => {
                    console.log('updateGameForMultiplayer called');
                    return this.simpleClient.updateGameForMultiplayer?.();
                };
                
                this.drawOtherPlayers = (ctx) => {
                    return this.simpleClient.drawOtherPlayers?.(ctx);
                };
                
                this.drawServerEnemies = (ctx) => {
                    return this.simpleClient.drawServerEnemies?.(ctx);
                };
                
                this.sendMove = (x, y) => {
                    return this.simpleClient.sendMove?.(x, y);
                };
                
                this.showLobbyMenu = () => {
                    return this.simpleClient.showLobbyMenu?.();
                };
            }
        };
        
        console.log('✅ MultiplayerClient wrapper created');
    }
};

document.head.appendChild(script);

// Also expose SimpleLobbyClient globally for startMultiplayer()
window.SimpleLobbyClient = SimpleLobbyClient;