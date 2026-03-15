    handleChatMessage(playerId, text) {
        const player = this.players.get(playerId);
        if (!player || !player.lobbyId || !text || text.trim().length === 0) return;
        
        const message = {
            type: 'chat',
            playerId,
            playerName: player.name,
            text: text.trim().substring(0, 200),
            timestamp: Date.now()
        };
        
        this.broadcastToLobby(player.lobbyId, message);
    }
    
    handleDisconnect(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            if (player.lobbyId) {
                this.leaveLobby(playerId);
            }
            this.players.delete(playerId);
        }
    }
    
    // Helper methods
    sendToPlayer(playerId, message) {
        const player = this.players.get(playerId);
        if (player && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(message));
        }
    }
    
    broadcastToLobby(lobbyId, message, excludePlayerId = null) {
        const lobby = this.lobbies.get(lobbyId);
        if (!lobby) return;
        
        lobby.players.forEach(playerId => {
            if (playerId !== excludePlayerId) {
                this.sendToPlayer(playerId, message);
            }
        });
    }
    
    broadcastLobbyList() {
        const lobbyList = Array.from(this.lobbies.values())
            .filter(lobby => lobby.gameState === 'waiting')
            .map(lobby => ({
                id: lobby.id,
                name: lobby.name,
                hostName: this.players.get(lobby.hostId)?.name || 'Unknown',
                playerCount: lobby.players.length,
                maxPlayers: lobby.settings.maxPlayers
            }));
        
        this.players.forEach((player, playerId) => {
            if (!player.lobbyId) {
                this.sendToPlayer(playerId, {
                    type: 'lobbyList',
                    lobbies: lobbyList
                });
            }
        });
    }
    
    sendLobbyList(playerId) {
        const lobbyList = Array.from(this.lobbies.values())
            .filter(lobby => lobby.gameState === 'waiting')
            .map(lobby => ({
                id: lobby.id,
                name: lobby.name,
                hostName: this.players.get(lobby.hostId)?.name || 'Unknown',
                playerCount: lobby.players.length,
                maxPlayers: lobby.settings.maxPlayers
            }));
        
        this.sendToPlayer(playerId, {
            type: 'lobbyList',
            lobbies: lobbyList
        });
    }
    
    sendLobbyInfo(playerId, lobbyId) {
        const lobby = this.lobbies.get(lobbyId);
        if (!lobby) return;
        
        const players = lobby.players.map(pId => {
            const p = this.players.get(pId);
            return {
                id: pId,
                name: p?.name || 'Unknown',
                color: p?.color || '#ffffff',
                ready: p?.ready || false,
                isHost: pId === lobby.hostId
            };
        });
        
        this.sendToPlayer(playerId, {
            type: 'lobbyInfo',
            lobbyId: lobby.id,
            lobbyName: lobby.name,
            hostId: lobby.hostId,
            players,
            gameState: lobby.gameState,
            settings: lobby.settings
        });
    }
    
    getLobbyScores(lobbyId) {
        const lobby = this.lobbies.get(lobbyId);
        if (!lobby) return {};
        
        const scores = {};
        lobby.players.forEach(playerId => {
            const player = this.players.get(playerId);
            if (player) {
                scores[playerId] = {
                    name: player.name,
                    score: player.score,
                    lives: player.lives,
                    color: player.color
                };
            }
        });
        
        return scores;
    }
    
    getRandomColor() {
        const colors = [
            '#00ffea', '#ff6b6b', '#ffa500', '#9400d3',
            '#0088ff', '#00ff00', '#ffff00', '#ff00ff'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    getSpawnPosition(playerIndex) {
        const positions = [
            { x: 200, y: 200 },  // Top-left
            { x: 600, y: 200 },  // Top-right
            { x: 200, y: 400 },  // Bottom-left
            { x: 600, y: 400 }   // Bottom-right
        ];
        return positions[playerIndex % positions.length];
    }
    
    getDifficultyMultiplier(difficulty, round) {
        const baseMultipliers = {
            easy: 0.7,
            normal: 1.0,
            hard: 1.3,
            insane: 1.7
        };
        
        const base = baseMultipliers[difficulty] || 1.0;
        const roundMultiplier = 1 + (round - 1) * 0.1; // 10% harder each round
        
        return base * roundMultiplier;
    }
    
    getSpawnPattern(round) {
        const patterns = ['single', 'row', 'column', 'staggered', 'wave'];
        
        // Weight patterns based on round
        const weights = [0.3, 0.2, 0.2, 0.15, 0.15];
        
        if (round > 5) {
            weights[0] = 0.2;  // Less single
            weights[1] = 0.25; // More rows
            weights[2] = 0.25; // More columns
            weights[3] = 0.15; // Same staggered
            weights[4] = 0.15; // Same waves
        }
        
        if (round > 10) {
            weights[0] = 0.1;
            weights[1] = 0.3;
            weights[2] = 0.3;
            weights[3] = 0.15;
            weights[4] = 0.15;
        }
        
        const random = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < patterns.length; i++) {
            cumulative += weights[i];
            if (random < cumulative) {
                return patterns[i];
            }
        }
        
        return 'single';
    }
    
    generateEnemies(pattern, round, playerCount) {
        const enemies = [];
        const baseSpeed = 0.1 + (round * 0.02);
        const countMultiplier = 1 + (playerCount - 1) * 0.3; // 30% more enemies per additional player
        
        switch (pattern) {
            case 'single':
                enemies.push(this.createRandomEnemy(round, baseSpeed));
                break;
                
            case 'row':
                const rowCount = Math.floor((3 + Math.random() * 4) * countMultiplier);
                for (let i = 0; i < rowCount; i++) {
                    enemies.push(this.createRowEnemy(i, rowCount, round, baseSpeed));
                }
                break;
                
            case 'column':
                const colCount = Math.floor((3 + Math.random() * 4) * countMultiplier);
                for (let i = 0; i < colCount; i++) {
                    enemies.push(this.createColumnEnemy(i, colCount, round, baseSpeed));
                }
                break;
                
            case 'staggered':
                const staggerCount = Math.floor((5 + Math.random() * 5) * countMultiplier);
                for (let i = 0; i < staggerCount; i++) {
                    enemies.push(this.createStaggeredEnemy(i, staggerCount, round, baseSpeed));
                }
                break;
                
            case 'wave':
                const waveCount = Math.floor((2 + Math.random() * 3) * countMultiplier);
                for (let i = 0; i < waveCount; i++) {
                    // Mix different patterns in wave
                    if (i % 3 === 0) {
                        enemies.push(this.createRandomEnemy(round, baseSpeed));
                    } else if (i % 3 === 1) {
                        enemies.push(this.createRowEnemy(i, waveCount, round, baseSpeed));
                    } else {
                        enemies.push(this.createColumnEnemy(i, waveCount, round, baseSpeed));
                    }
                }
                break;
        }
        
        return enemies;
    }
    
    createRandomEnemy(round, baseSpeed) {
        const side = Math.floor(Math.random() * 4);
        let x, y, velocity;
        
        switch(side) {
            case 0: // Top
                x = Math.random() * 800;
                y = -50;
                velocity = { x: 0, y: baseSpeed };
                break;
            case 1: // Right
                x = 850;
                y = Math.random() * 600;
                velocity = { x: -baseSpeed, y: 0 };
                break;
            case 2: // Bottom
                x = Math.random() * 800;
                y = 650;
                velocity = { x: 0, y: -baseSpeed };
                break;
            case 3: // Left
                x = -50;
                y = Math.random() * 600;
                velocity = { x: baseSpeed, y: 0 };
                break;
        }
        
        return {
            id: generateId(),
            x, y, velocity,
            type: this.getEnemyType(round),
            radius: 10 + Math.random() * 5,
            color: this.getEnemyColor(round)
        };
    }
    
    createRowEnemy(index, total, round, baseSpeed) {
        const side = Math.floor(Math.random() * 2); // 0: top, 1: bottom
        const spacing = 800 / (total + 1);
        const speed = baseSpeed * 0.8;
        
        let x, y, velocity;
        
        if (side === 0) { // Top
            x = (index + 1) * spacing;
            y = -50 - (index * 10);
            velocity = { x: 0, y: speed };
        } else { // Bottom
            x = (index + 1) * spacing;
            y = 650 + (index * 10);
            velocity = { x: 0, y: -speed };
        }
        
        return {
            id: generateId(),
            x, y, velocity,
            type: this.getEnemyType(round),
            radius: 8 + Math.random() * 4,
            color: this.getEnemyColor(round)
        };
    }
    
    createColumnEnemy(index, total, round, baseSpeed) {
        const side = Math.floor(Math.random() * 2); // 0: left, 1: right
        const spacing = 600 / (total + 1);
        const speed = baseSpeed * 0.8;
        
        let x, y, velocity;
        
        if (side === 0) { // Left
            x = -50 - (index * 10);
            y = (index + 1) * spacing;
            velocity = { x: speed, y: 0 };
        } else { // Right
            x = 850 + (index * 10);
            y = (index + 1) * spacing;
            velocity = { x: -speed, y: 0 };
        }
        
        return {
            id: generateId(),
            x, y, velocity,
            type: this.getEnemyType(round),
            radius: 8 + Math.random() * 4,
            color: this.getEnemyColor(round)
        };
    }
    
    createStaggeredEnemy(index, total, round, baseSpeed) {
        const side = Math.floor(Math.random() * 4);
        const speed = baseSpeed * 0.7;
        const delay = index * 200;
        
        let x, y, velocity;
        
        switch(side) {
            case 0: // Top
                x = Math.random() * 800;
                y = -50 - (index * 30);
                velocity = { x: 0, y: speed };
                break;
            case 1: // Right
                x = 850 + (index * 30);
                y = Math.random() * 600;
                velocity = { x: -speed, y: 0 };
                break;
            case 2: // Bottom
                x = Math.random() * 800;
                y = 650 + (index * 30);
                velocity = { x: 0, y: -speed };
                break;
            case 3: // Left
                x = -50 - (index * 30);
                y = Math.random() * 600;
                velocity = { x: speed, y: 0 };
                break;
        }
        
        return {
            id: generateId(),
            x, y, velocity,
            type: this.getEnemyType(round),
            radius: 12 + Math.random() * 6,
            color: this.getEnemyColor(round),
            spawnDelay: delay
        };
    }
    
    getEnemyType(round) {
        const types = ['basic', 'fast', 'tank', 'splitter'];
        const weights = [0.5, 0.3, 0.15, 0.05];
        
        if (round > 5) {
            weights[0] = 0.3;
            weights[1] = 0.4;
            weights[2] = 0.2;
            weights[3] = 0.1;
        }
        
        if (round > 10) {
            weights[0] = 0.2;
            weights[1] = 0.3;
            weights[2] = 0.3;
            weights[3] = 0.2;
        }
        
        const random = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < types.length; i++) {
            cumulative += weights[i];
            if (random < cumulative) {
                return types[i];
            }
        }
        
        return 'basic';
    }
    
    getEnemyColor(round) {
        const colors = {
            basic: '#ff6b6b',
            fast: '#ffa500',
            tank: '#8b0000',
            splitter: '#9400d3'
        };
        
        const type = this.getEnemyType(round);
        return colors[type] || '#ff6b6b';
    }
    
    start() {
        this.server.listen(this.port, () => {
            console.log(`
            🎮 Dodge This Shit - Multiplayer Server
            ========================================
            Server running on port: ${this.port}
            
            Features:
            - Lobby system (create/join rooms)
            - Up to 4 players per game
            - 30-second rounds with progressive difficulty
            - Row/column/staggered enemy patterns
            - Real-time player movement and actions
            - Chat system
            - Score tracking and leaderboards
            
            WebSocket endpoint: ws://localhost:${this.port}
            `);
        });
    }
    
    stop() {
        this.wss.close();
        this.server.close();
        console.log('Multiplayer server stopped');
    }
}

// Start server if run directly
if (require.main === module) {
    const port = process.env.PORT || 8080;
    const server = new MultiplayerServer(port);
    server.start();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n👋 Shutting down multiplayer server...');
        server.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        console.log('\n👋 Received SIGTERM, shutting down...');
        server.stop();
        process.exit(0);
    });
}

module.exports = MultiplayerServer;