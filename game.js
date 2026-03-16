// Main game controller
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.gameState = 'start'; // 'start', 'playing', 'gameover'
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.enemies = [];
        this.enemyCount = 0;
        
        // Game objects
        this.player = null;
        this.levelManager = null;
        this.otherPlayers = new Map(); // For multiplayer
        
        // Multiplayer
        this.multiplayer = null;
        this.isMultiplayer = false;
        this.multiplayerRound = 1;
        this.playerDead = false;
        this.playerDeathTime = 0;
        
        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 1000; // ms - faster spawning for rows/columns
        this.roundTimer = 0;
        this.roundDuration = 10000; // 10 seconds per round (easier)
        this.roundActive = false;
        
        // Input
        this.keys = {};
        this.mousePos = { x: 0, y: 0 };
        
        // UI elements
        this.restartBtn = document.getElementById('restart-btn');
        this.singlePlayerBtn = document.getElementById('single-player-btn');
        this.multiplayerLobbyBtn = document.getElementById('multiplayer-lobby-btn');
        this.gameOverScreen = document.getElementById('game-over');
        this.startScreen = document.getElementById('start-screen');
        

        
        this.init();
    }
    
    init() {
        // Set canvas size
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Initialize player
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
        
        // Initialize level manager
        this.levelManager = new LevelManager();
        
        // Initialize multiplayer (optional)
        this.initMultiplayer();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start game loop
        this.gameLoop();
        
        // Update UI
        this.updateUI();
    }
    
    setupEventListeners() {
        // Keyboard input
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Mouse input
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('click', (e) => {
            if (this.gameState === 'playing') {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                // Only move player if not dead in multiplayer
                if (!(this.isMultiplayer && this.playerDead)) {
                    this.player.moveTo(x, y);
                }
            }
        });
        
        // Button events
        this.restartBtn.addEventListener('click', () => this.restartGame());
        this.singlePlayerBtn.addEventListener('click', () => {
            // Single player = multiplayer with 1 player
            this.startMultiplayer();
        });
        
        this.multiplayerLobbyBtn.addEventListener('click', () => {
            this.startMultiplayer();
        });
        
        // GitHub link
        // GitHub link
        document.getElementById('github-link').addEventListener('click', (e) => {
            e.preventDefault();
            window.open('https://github.com/serenoa287-afk/dodge-this-shit', '_blank');
        });
        

    }
    
    startGame() {
        this.gameState = 'playing';
        this.startScreen.style.display = 'none';
        this.gameOverScreen.style.display = 'none';
        this.isMultiplayer = false;
        this.resetGameState();
    }
    
    startMultiplayer() {
        // Use simple lobby client if available
        if (!this.multiplayer && typeof SimpleLobbyClient !== 'undefined') {
            this.multiplayer = new SimpleLobbyClient(this);
        }
        this.isMultiplayer = true;
        this.useServerEnemies = false; // Default to local enemies
        
        // Show the lobby menu
        if (this.multiplayer && this.multiplayer.showLobbyMenu) {
            this.multiplayer.showLobbyMenu();
        }
    }
    
    resetGameState() {
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.enemies = [];
        this.enemyCount = 0;
        this.enemySpawnTimer = 0;
        this.roundTimer = 0;
        this.roundActive = true;
        
        // Reset player position
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height / 2;
        this.player.velocity = { x: 0, y: 0 };
        
        // Reset level manager
        this.levelManager.reset();
        
        this.updateUI();
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.pauseBtn.textContent = 'Resume (P)';
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.pauseBtn.textContent = 'Pause (P)';
        }
    }
    
    restartGame() {
        // In multiplayer, exit to title screen and leave lobby
        if (this.isMultiplayer && this.multiplayer) {
            console.log('🛑 Restart button pressed in multiplayer - exiting to title');
            
            // Leave the lobby
            if (this.multiplayer.leaveLobby) {
                this.multiplayer.leaveLobby();
            }
            
            // Reset game state
            this.gameState = 'start';
            this.startScreen.style.display = 'flex';
            this.gameOverScreen.style.display = 'none';
            this.resetGameState();
            
            // Reset multiplayer state
            this.isMultiplayer = false;
            this.multiplayer = null;
            this.playerDead = false;
            this.playerDeathTime = 0;
            
            return;
        }
        
        // Single player: restart normally
        this.startGame();
    }
    
    gameLoop(currentTime = 0) {
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameState === 'playing') {
            this.update();
        }
        
        this.draw();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update() {
        // Update player (if not dead in multiplayer)
        if (!(this.isMultiplayer && this.playerDead)) {
            this.player.update(this.keys, this.deltaTime);
            
            // Keep player within bounds
            this.player.x = Math.max(this.player.radius, Math.min(this.canvas.width - this.player.radius, this.player.x));
            this.player.y = Math.max(this.player.radius, Math.min(this.canvas.height - this.player.radius, this.player.y));
        }
        
        // Send player position to server in multiplayer
        if (this.isMultiplayer && this.multiplayer && this.gameState === 'playing') {
            this.multiplayer.sendMove(this.player.x, this.player.y);
        }
        
        // Update round timer
        if (this.roundActive) {
            this.roundTimer += this.deltaTime;
            
            // Check if round is over (30 seconds)
            if (this.roundTimer >= this.roundDuration) {
                this.endRound();
            }
        }
        
        // Only spawn enemies locally in single-player mode
        // In multiplayer, enemies come from server
        if (!this.isMultiplayer) {
            this.enemySpawnTimer += this.deltaTime;
            if (this.enemySpawnTimer >= this.enemySpawnInterval * 1.5 && this.roundActive) { // 50% slower spawn rate
                this.spawnEnemyPattern();
                this.enemySpawnTimer = 0;
                
                // Adjust spawn interval based on level and round progress (easier)
                const roundProgress = this.roundTimer / this.roundDuration;
                const baseInterval = Math.max(500, 2000 - (this.level * 60)); // Slower spawns
                this.enemySpawnInterval = baseInterval * (1 - (roundProgress * 0.5)); // Faster as round progresses
            }
        }
        
        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(this.deltaTime, this.player.x, this.player.y);
            
            // Handle chaser explosions
            if (enemy.type === 'chaser' && enemy.isExploding) {
                // Check if player is within explosion radius
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < enemy.currentExplosionRadius + this.player.radius) {
                    this.lives -= enemy.explosionDamage;
                    
                    if (this.lives <= 0) {
                        this.gameOver();
                    }
                    
                    this.updateUI();
                }
            }
            
            // Check collision with player (for non-exploding chasers)
            if (enemy.type !== 'chaser' || !enemy.isExploding) {
                if (this.checkCollision(this.player, enemy)) {
                    this.lives--;
                    this.enemies.splice(i, 1);
                    this.enemyCount--;
                    
                    if (this.lives <= 0) {
                        this.gameOver();
                    }
                    
                    this.updateUI();
                    continue;
                }
            }
            
            // Remove enemies that are out of bounds or finished exploding
            if (enemy.shouldRemove || enemy.isOutOfBounds(this.canvas.width, this.canvas.height)) {
                this.enemies.splice(i, 1);
                this.enemyCount--;
                
                // Only give score for dodging if not a chaser explosion
                if (!enemy.shouldRemove) {
                    this.score += 10; // Bonus for dodging
                }
                
                this.updateUI();
            }
        }
        
        // Check level progression (now based on rounds completed)
        if (this.score >= this.level * 1000) {
            this.levelUp();
        }
    }
    
    spawnEnemyPattern() {
        const roundProgress = this.roundTimer / this.roundDuration;
        const patternType = this.getPatternType(roundProgress);
        
        switch(patternType) {
            case 'single':
                this.spawnSingleEnemy();
                break;
            case 'row':
                this.spawnRowPattern();
                break;
            case 'column':
                this.spawnColumnPattern();
                break;
            case 'staggered':
                this.spawnStaggeredPattern();
                break;
            case 'wave':
                this.spawnWavePattern();
                break;
            case 'chaserWave':
                this.spawnChaserWave();
                break;
        }
    }
    
    getPatternType(roundProgress) {
        // Progressive pattern unlocking based on level
        let patterns = [];
        
        if (this.level === 1) {
            // Level 1: Only single enemies
            patterns = [{ type: 'single', weight: 1.0 }];
        } else if (this.level === 2) {
            // Level 2: Mostly single, occasional rows
            patterns = [
                { type: 'single', weight: 0.8 },
                { type: 'row', weight: 0.2 }
            ];
        } else if (this.level === 3) {
            // Level 3: Add columns
            patterns = [
                { type: 'single', weight: 0.6 },
                { type: 'row', weight: 0.2 },
                { type: 'column', weight: 0.2 }
            ];
        } else if (this.level === 4) {
            // Level 4: Add staggered
            patterns = [
                { type: 'single', weight: 0.5 },
                { type: 'row', weight: 0.2 },
                { type: 'column', weight: 0.2 },
                { type: 'staggered', weight: 0.1 }
            ];
        } else if (this.level === 5) {
            // Level 5: Add waves
            patterns = [
                { type: 'single', weight: 0.4 },
                { type: 'row', weight: 0.2 },
                { type: 'column', weight: 0.2 },
                { type: 'staggered', weight: 0.1 },
                { type: 'wave', weight: 0.1 }
            ];
        } else if (this.level === 6) {
            // Level 6: Add chaser waves
            patterns = [
                { type: 'single', weight: 0.3 },
                { type: 'row', weight: 0.2 },
                { type: 'column', weight: 0.2 },
                { type: 'staggered', weight: 0.15 },
                { type: 'wave', weight: 0.1 },
                { type: 'chaserWave', weight: 0.05 }
            ];
        } else if (this.level >= 7) {
            // Levels 7-10: Full patterns with progression
            patterns = [
                { type: 'single', weight: 0.25 },
                { type: 'row', weight: 0.2 },
                { type: 'column', weight: 0.2 },
                { type: 'staggered', weight: 0.15 },
                { type: 'wave', weight: 0.1 },
                { type: 'chaserWave', weight: 0.1 }
            ];
            
            // Adjust based on round progress
            if (roundProgress > 0.5) {
                patterns[0].weight = 0.15;  // Less single
                patterns[3].weight = 0.2;   // More staggered
                patterns[4].weight = 0.15;  // More waves
                patterns[5].weight = 0.15;  // More chaser waves
            }
            
            if (roundProgress > 0.8) {
                patterns[0].weight = 0.1;
                patterns[1].weight = 0.25;
                patterns[2].weight = 0.25;
                patterns[3].weight = 0.15;
                patterns[4].weight = 0.15;
                patterns[5].weight = 0.1;
            }
        }
        
        const random = Math.random();
        let cumulative = 0;
        
        for (const pattern of patterns) {
            cumulative += pattern.weight;
            if (random < cumulative) {
                return pattern.type;
            }
        }
        
        return 'single';
    }
    
    spawnSingleEnemy() {
        const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        let x, y, velocity;
        
        // Progressive speed increase: slower at start, faster at higher levels
        const baseSpeed = 0.08;
        const levelSpeedBonus = (this.level - 1) * 0.015; // 0.015 per level
        const speed = Math.min(0.2, baseSpeed + levelSpeedBonus); // Cap at 0.2
        
        // Chance to spawn special enemies based on level
        const spawnChaser = Math.random() < (0.1 + (this.level - 3) * 0.05) && this.level >= 3;
        const spawnStalker = Math.random() < (0.05 + (this.level - 7) * 0.05) && this.level >= 7;
        
        if (spawnChaser || spawnStalker) {
            // Spawn chaser or stalker from one of the four corners
            const corner = Math.floor(Math.random() * 4);
            switch(corner) {
                case 0: // Top-left
                    x = -50;
                    y = -50;
                    velocity = { x: speed * 0.7, y: speed * 0.7 }; // Diagonal down-right
                    break;
                case 1: // Top-right
                    x = this.canvas.width + 50;
                    y = -50;
                    velocity = { x: -speed * 0.7, y: speed * 0.7 }; // Diagonal down-left
                    break;
                case 2: // Bottom-left
                    x = -50;
                    y = this.canvas.height + 50;
                    velocity = { x: speed * 0.7, y: -speed * 0.7 }; // Diagonal up-right
                    break;
                case 3: // Bottom-right
                    x = this.canvas.width + 50;
                    y = this.canvas.height + 50;
                    velocity = { x: -speed * 0.7, y: -speed * 0.7 }; // Diagonal up-left
                    break;
            }
        } else {
            // Regular enemy spawn
            switch(side) {
                case 0: // Top
                    x = Math.random() * this.canvas.width;
                    y = -50;
                    velocity = { x: 0, y: speed };
                    break;
                case 1: // Right
                    x = this.canvas.width + 50;
                    y = Math.random() * this.canvas.height;
                    velocity = { x: -speed, y: 0 };
                    break;
                case 2: // Bottom
                    x = Math.random() * this.canvas.width;
                    y = this.canvas.height + 50;
                    velocity = { x: 0, y: -speed };
                    break;
                case 3: // Left
                    x = -50;
                    y = Math.random() * this.canvas.height;
                    velocity = { x: speed, y: 0 };
                    break;
            }
        }
        
        const enemy = new Enemy(x, y, velocity, this.level);
        
        // Force enemy type if spawning chaser or stalker
        if (spawnChaser) {
            enemy.type = 'chaser';
            enemy.setProperties(); // Re-set properties for chaser
        } else if (spawnStalker) {
            enemy.type = 'stalker';
            enemy.setProperties(); // Re-set properties for stalker
        }
        
        this.enemies.push(enemy);
        this.enemyCount++;
        this.updateUI();
    }
    
    spawnRowPattern() {
        const side = Math.floor(Math.random() * 2); // 0: top, 1: bottom
        const baseSpeed = 0.07;
        const levelSpeedBonus = (this.level - 1) * 0.012;
        const speed = Math.min(0.18, baseSpeed + levelSpeedBonus);
        
        // Number of enemies in row: 3-7, increases with level
        const count = 3 + Math.floor(Math.random() * 3) + Math.min(2, Math.floor(this.level / 3));
        const spacing = this.canvas.width / (count + 1);
        
        for (let i = 1; i <= count; i++) {
            let x, y, velocity;
            
            if (side === 0) { // Top row
                x = i * spacing;
                y = -50 - (i * 10); // Stagger them slightly
                velocity = { x: 0, y: speed };
            } else { // Bottom row
                x = i * spacing;
                y = this.canvas.height + 50 + (i * 10);
                velocity = { x: 0, y: -speed };
            }
            
            const enemy = new Enemy(x, y, velocity, this.level);
            this.enemies.push(enemy);
            this.enemyCount++;
        }
        
        this.updateUI();
    }
    
    spawnColumnPattern() {
        const side = Math.floor(Math.random() * 2); // 0: left, 1: right
        const baseSpeed = 0.07;
        const levelSpeedBonus = (this.level - 1) * 0.012;
        const speed = Math.min(0.18, baseSpeed + levelSpeedBonus);
        
        // Number of enemies in column: 3-7, increases with level
        const count = 3 + Math.floor(Math.random() * 3) + Math.min(2, Math.floor(this.level / 3));
        const spacing = this.canvas.height / (count + 1);
        
        for (let i = 1; i <= count; i++) {
            let x, y, velocity;
            
            if (side === 0) { // Left column
                x = -50 - (i * 10); // Stagger them slightly
                y = i * spacing;
                velocity = { x: speed, y: 0 };
            } else { // Right column
                x = this.canvas.width + 50 + (i * 10);
                y = i * spacing;
                velocity = { x: -speed, y: 0 };
            }
            
            const enemy = new Enemy(x, y, velocity, this.level);
            this.enemies.push(enemy);
            this.enemyCount++;
        }
        
        this.updateUI();
    }
    
    spawnStaggeredPattern() {
        const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        const baseSpeed = 0.06;
        const levelSpeedBonus = (this.level - 1) * 0.01;
        const speed = Math.min(0.16, baseSpeed + levelSpeedBonus);
        
        // Number of enemies: 5-10, increases with level
        const count = 5 + Math.floor(Math.random() * 4) + Math.min(3, Math.floor(this.level / 2));
        
        for (let i = 0; i < count; i++) {
            let x, y, velocity;
            const delay = i * 200; // Stagger by 200ms
            
            switch(side) {
                case 0: // Top - staggered horizontally
                    x = Math.random() * this.canvas.width;
                    y = -50 - (i * 30);
                    velocity = { x: 0, y: speed };
                    break;
                case 1: // Right - staggered vertically
                    x = this.canvas.width + 50 + (i * 30);
                    y = Math.random() * this.canvas.height;
                    velocity = { x: -speed, y: 0 };
                    break;
                case 2: // Bottom - staggered horizontally
                    x = Math.random() * this.canvas.width;
                    y = this.canvas.height + 50 + (i * 30);
                    velocity = { x: 0, y: -speed };
                    break;
                case 3: // Left - staggered vertically
                    x = -50 - (i * 30);
                    y = Math.random() * this.canvas.height;
                    velocity = { x: speed, y: 0 };
                    break;
            }
            
            const enemy = new Enemy(x, y, velocity, this.level);
            enemy.spawnDelay = delay; // Store delay for staggered spawning
            this.enemies.push(enemy);
            this.enemyCount++;
        }
        
        this.updateUI();
    }
    
    spawnWavePattern() {
        // Spawn multiple patterns at once for intense waves
        const patterns = ['row', 'column', 'staggered'];
        const patternCount = 1 + Math.floor(Math.random() * 2) + Math.min(1, Math.floor(this.level / 5));
        
        for (let i = 0; i < patternCount; i++) {
            const pattern = patterns[Math.floor(Math.random() * patterns.length)];
            
            switch(pattern) {
                case 'row':
                    this.spawnRowPattern();
                    break;
                case 'column':
                    this.spawnColumnPattern();
                    break;
                case 'staggered':
                    this.spawnStaggeredPattern();
                    break;
            }
            
            // Small delay between patterns in the wave
            this.enemySpawnTimer = -500 * (i + 1);
        }
    }
    
    spawnChaserWave() {
        const baseSpeed = 0.07;
        const levelSpeedBonus = (this.level - 1) * 0.012;
        const speed = Math.min(0.18, baseSpeed + levelSpeedBonus);
        
        // Spawn 3-5 chasers from different corners
        const count = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < count; i++) {
            let x, y, velocity;
            
            // Each chaser from a different corner
            switch(i % 4) {
                case 0: // Top-left
                    x = -50 - (i * 20);
                    y = -50 - (i * 20);
                    velocity = { x: speed * 0.6, y: speed * 0.6 };
                    break;
                case 1: // Top-right
                    x = this.canvas.width + 50 + (i * 20);
                    y = -50 - (i * 20);
                    velocity = { x: -speed * 0.6, y: speed * 0.6 };
                    break;
                case 2: // Bottom-left
                    x = -50 - (i * 20);
                    y = this.canvas.height + 50 + (i * 20);
                    velocity = { x: speed * 0.6, y: -speed * 0.6 };
                    break;
                case 3: // Bottom-right
                    x = this.canvas.width + 50 + (i * 20);
                    y = this.canvas.height + 50 + (i * 20);
                    velocity = { x: -speed * 0.6, y: -speed * 0.6 };
                    break;
            }
            
            const enemy = new Enemy(x, y, velocity, this.level);
            
            // At higher levels, some chasers become stalkers
            if (this.level >= 7 && Math.random() < 0.4) {
                enemy.type = 'stalker';
                enemy.setProperties();
            } else {
                // Stagger their chase timers slightly
                enemy.chaseDuration += i * 500;
            }
            
            this.enemies.push(enemy);
            this.enemyCount++;
        }
        
        this.updateUI();
    }
    
    checkCollision(circle1, circle2) {
        const dx = circle1.x - circle2.x;
        const dy = circle1.y - circle2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (circle1.radius + circle2.radius);
    }
    
    endRound() {
        this.roundActive = false;
        this.roundTimer = 0;
        
        // Clear all enemies
        this.enemies = [];
        this.enemyCount = 0;
        
        // Bonus score for surviving the round
        const roundBonus = 500 * this.level;
        this.score += roundBonus;
        
        // Check if game is complete (10 rounds)
        if (this.level >= 10) {
            this.gameComplete();
            return;
        }
        
        // Level up after each round
        this.level++;
        this.levelManager.applyLevelEffects(this.level);
        
        // Show round complete message
        this.ctx.fillStyle = '#333333'; // Dark gray (paperlike)
        this.ctx.font = '40px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`ROUND ${this.level - 1} COMPLETE!`, this.canvas.width / 2, this.canvas.height / 2 - 30);
        this.ctx.font = '24px "Press Start 2P"';
        this.ctx.fillText(`+${roundBonus} BONUS`, this.canvas.width / 2, this.canvas.height / 2 + 30);
        
        // Start next round after 3 seconds
        setTimeout(() => {
            if (this.gameState === 'playing') {
                this.roundActive = true;
                this.roundTimer = 0;
            }
        }, 3000);
        
        this.updateUI();
    }
    
    gameComplete() {
        this.gameState = 'gameover';
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-level').textContent = 'COMPLETE!';
        document.getElementById('game-over').querySelector('h2').textContent = 'VICTORY!';
        this.gameOverScreen.style.display = 'flex';
    }
    
    levelUp() {
        // Leveling now happens at end of each round
        // This method is kept for compatibility
        this.updateUI();
    }
    
    gameOver() {
        // In multiplayer, don't show game over screen immediately
        // Players might be revived next round
        if (this.isMultiplayer && this.multiplayer) {
            // Player is dead - hide them
            console.log(`💀 Local player died! Setting playerDead = true`);
            this.playerDead = true;
            this.playerDeathTime = Date.now();
            this.updateUI();
            return;
        }
        
        this.gameState = 'gameover';
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-level').textContent = this.level;
        this.gameOverScreen.style.display = 'flex';
    }
    
    draw() {
        // Draw grid background
        this.drawGrid();
        
        // Draw player (if not dead in multiplayer)
        if (!(this.isMultiplayer && this.playerDead)) {
            this.player.draw(this.ctx);
        } else if (this.isMultiplayer && this.playerDead) {
            // Draw death animation for local player
            this.drawPlayerDeathAnimation();
        }
        
        // Draw other players in multiplayer
        if (this.isMultiplayer && this.multiplayer && this.multiplayer.drawOtherPlayers) {
            this.multiplayer.drawOtherPlayers(this.ctx);
        }
        
        // Draw server enemies in synchronized multiplayer
        if (this.isMultiplayer && this.multiplayer && this.multiplayer.gameActive && this.multiplayer.drawServerEnemies) {
            console.log('🎮 Game calling drawServerEnemies');
            this.multiplayer.drawServerEnemies(this.ctx);
        } else {
            console.log('🎮 Game NOT calling drawServerEnemies:', {
                isMultiplayer: this.isMultiplayer,
                hasMultiplayer: !!this.multiplayer,
                gameActive: this.multiplayer?.gameActive,
                hasDrawMethod: !!this.multiplayer?.drawServerEnemies
            });
        }
        
        // Draw local enemies (single player only)
        this.enemies.forEach(enemy => enemy.draw(this.ctx));
        
        // Draw HUD
        this.drawHUD();
    }
    
    drawOtherPlayer(player) {
        // Draw other player circle
        this.ctx.fillStyle = player.color;
        this.ctx.beginPath();
        this.ctx.arc(player.position.x, player.position.y, 15, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw outline
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(player.position.x, player.position.y, 15, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Draw player name
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px "Roboto Mono"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(player.name, player.position.x, player.position.y - 25);
        
        // Draw lives indicator
        for (let i = 0; i < player.lives; i++) {
            this.ctx.fillStyle = '#ff6b6b';
            this.ctx.beginPath();
            this.ctx.arc(player.position.x - 10 + (i * 10), player.position.y + 25, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawPlayerDeathAnimation() {
        if (!this.playerDeathTime) {
            console.log('⚠️ No playerDeathTime set, cannot draw death animation');
            return;
        }
        
        const elapsed = Date.now() - this.playerDeathTime;
        const duration = 1000; // 1 second animation
        const progress = Math.min(1, elapsed / duration);
        
        console.log(`🎬 Death animation: elapsed=${elapsed}ms, progress=${progress.toFixed(2)}`);
        
        // Don't draw anything after animation completes
        if (progress >= 1) {
            console.log('✅ Death animation complete, player hidden');
            return; // Animation complete, player stays completely hidden
        }
        
        // Fade out and shrink
        const alpha = 1 - progress;
        const radius = 15 * (1 - progress);
        
        this.ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw explosion particles at the end
        if (progress >= 0.8) {
            this.ctx.fillStyle = '#ff9900';
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const distance = 20 * (progress - 0.8) * 5;
                const px = this.player.x + Math.cos(angle) * distance;
                const py = this.player.y + Math.sin(angle) * distance;
                this.ctx.beginPath();
                this.ctx.arc(px, py, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(0, 255, 234, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // Center marker
        this.ctx.fillStyle = 'rgba(0, 255, 234, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, 5, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawHUD() {
        // Score display
        this.ctx.fillStyle = '#333333'; // Dark gray (paperlike)
        this.ctx.font = '16px "Press Start 2P"';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 20, 30);
        // Show multiplayer round in multiplayer, level in single player
        const roundDisplay = this.isMultiplayer ? this.multiplayerRound : this.level;
        this.ctx.fillText(`ROUND: ${roundDisplay}`, 20, 60);
        this.ctx.fillText(`LIVES: ${this.lives}`, 20, 90);
        
        // Round timer
        if (this.roundActive) {
            const timeLeft = Math.max(0, this.roundDuration - this.roundTimer);
            const seconds = Math.floor(timeLeft / 1000);
            const milliseconds = Math.floor((timeLeft % 1000) / 10);
            this.ctx.fillText(`TIME: ${seconds}.${milliseconds.toString().padStart(2, '0')}`, 20, 120);
            
            // Timer bar
            const progress = timeLeft / this.roundDuration;
            this.ctx.fillStyle = '#666666'; // Medium gray (paperlike)
            this.ctx.fillRect(20, 130, 200 * progress, 5);
            this.ctx.strokeStyle = '#333333'; // Dark gray border
            this.ctx.strokeRect(20, 130, 200, 5);
        }
        
        // Lives indicator
        for (let i = 0; i < this.lives; i++) {
            this.ctx.fillStyle = '#ff6b6b';
            this.ctx.beginPath();
            this.ctx.arc(150 + i * 30, 25, 8, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('enemies').textContent = this.enemyCount;
    }
    
    // Multiplayer methods
    initMultiplayer() {
        // Load multiplayer client dynamically
        const script = document.createElement('script');
        script.src = 'multiplayer-client.js';
        script.onload = () => {
            if (typeof MultiplayerClient !== 'undefined') {
                this.multiplayer = new MultiplayerClient(this);
                this.multiplayer.updateGameForMultiplayer();
            }
        };
        document.head.appendChild(script);
    }
    
    startMultiplayerRound(round, duration) {
        this.isMultiplayer = true;
        this.multiplayerRound = round;
        this.roundDuration = duration;
        this.roundActive = true;
        this.roundTimer = 0;
        this.enemies = [];
        this.enemyCount = 0;
        console.log(`🔄 Round ${round} starting - resetting playerDead from ${this.playerDead} to false`);
        this.playerDead = false; // Reset death state
        this.playerDeathTime = 0;
        
        // Reset player position for multiplayer
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height / 2;
        
        console.log(`Multiplayer round ${round} started`);
    }
    
    spawnMultiplayerEnemies(enemies) {
        enemies.forEach(enemyData => {
            const enemy = new Enemy(enemyData.x, enemyData.y, enemyData.velocity, this.multiplayerRound);
            enemy.id = enemyData.id;
            enemy.color = enemyData.color;
            enemy.radius = enemyData.radius;
            if (enemyData.spawnDelay) {
                enemy.spawnDelay = enemyData.spawnDelay;
            }
            this.enemies.push(enemy);
            this.enemyCount++;
        });
        this.updateUI();
    }
    
    endMultiplayerRound(bonus) {
        this.roundActive = false;
        this.score += bonus;
        
        // Clear enemies
        this.enemies = [];
        this.enemyCount = 0;
        
        // Show bonus message
        this.ctx.fillStyle = '#333333'; // Dark gray (paperlike)
        this.ctx.font = '40px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`+${bonus} BONUS`, this.canvas.width / 2, this.canvas.height / 2);
        
        this.updateUI();
    }
    
    endMultiplayerGame(winnerId, scores) {
        this.gameState = 'gameover';
        this.isMultiplayer = false;
        
        // Show winner
        const winner = this.multiplayer.players.get(winnerId);
        const winnerName = winner ? winner.name : 'Unknown';
        
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-level').textContent = this.multiplayerRound;
        document.getElementById('game-over').querySelector('h2').textContent = `GAME OVER - ${winnerName} WINS!`;
        this.gameOverScreen.style.display = 'flex';
    }
    
    updateOtherPlayer(playerId, position, color) {
        if (!this.otherPlayers.has(playerId)) {
            this.otherPlayers.set(playerId, {
                x: position.x,
                y: position.y,
                color: color,
                radius: 15
            });
        } else {
            const player = this.otherPlayers.get(playerId);
            player.x = position.x;
            player.y = position.y;
        }
    }
    
    handleOtherPlayerAction(playerId, action) {
        switch (action.type) {
            case 'dash':
                // Show dash effect for other player
                this.showDashEffect(playerId);
                break;
            case 'hit':
                // Show hit effect for other player
                this.showHitEffect(playerId);
                break;
        }
    }
    
    showDashEffect(playerId) {
        const player = this.otherPlayers.get(playerId);
        if (player) {
            // Visual effect for dash
            player.isDashing = true;
            setTimeout(() => {
                player.isDashing = false;
            }, 200);
        }
    }
    
    showHitEffect(playerId) {
        const player = this.otherPlayers.get(playerId);
        if (player) {
            // Visual effect for hit
            player.hitFlash = true;
            setTimeout(() => {
                player.hitFlash = false;
            }, 500);
        }
    }
    
    showEliminationEffect(playerId) {
        const player = this.otherPlayers.get(playerId);
        if (player) {
            // Show elimination effect
            player.eliminated = true;
        }
    }
    
    // Enhanced difficulty methods
    getProgressiveDifficulty() {
        const round = this.isMultiplayer ? this.multiplayerRound : this.level;
        
        return {
            enemySpeed: 0.1 + (round * 0.025), // 2.5% faster each round
            enemySpawnRate: 1 + (round * 0.2), // 20% more frequent each round
            enemyHealth: 1 + Math.floor(round / 3), // +1 health every 3 rounds
            enemySize: 1 + (round * 0.08), // 8% larger each round
            patternComplexity: Math.min(1 + (round * 0.15), 3), // Up to 3x complexity
            specialAbilities: round >= 10 // Enemies get special abilities after round 10
        };
    }
    
    // Update draw method to include other players

    
    // Update spawn patterns with progressive difficulty
    getPatternType(roundProgress) {
        const round = this.isMultiplayer ? this.multiplayerRound : this.level;
        const difficulty = this.getProgressiveDifficulty();
        
        const patterns = [
            { type: 'single', weight: 0.4 },
            { type: 'row', weight: 0.2 },
            { type: 'column', weight: 0.2 },
            { type: 'staggered', weight: 0.1 },
            { type: 'wave', weight: 0.1 }
        ];
        
        // Adjust weights based on round and difficulty
        if (round > 3) {
            patterns[0].weight = Math.max(0.1, 0.4 - (round * 0.05));
            patterns[1].weight = 0.2 + (round * 0.03);
            patterns[2].weight = 0.2 + (round * 0.03);
            patterns[3].weight = 0.1 + (round * 0.02);
            patterns[4].weight = 0.1 + (round * 0.02);
        }
        
        // Further adjust based on round progress
        if (roundProgress > 0.5) {
            patterns[0].weight *= 0.5;
            patterns[1].weight *= 1.5;
            patterns[2].weight *= 1.5;
        }
        
        if (roundProgress > 0.8) {
            patterns[0].weight *= 0.3;
            patterns[3].weight *= 2;
            patterns[4].weight *= 2;
        }
        
        // Normalize weights
        const totalWeight = patterns.reduce((sum, p) => sum + p.weight, 0);
        patterns.forEach(p => p.weight /= totalWeight);
        
        const random = Math.random();
        let cumulative = 0;
        
        for (const pattern of patterns) {
            cumulative += pattern.weight;
            if (random < cumulative) {
                return pattern.type;
            }
        }
        
        return 'single';
    }
    
    // Update spawn methods with progressive difficulty
    spawnRowPattern() {
        const side = Math.floor(Math.random() * 2);
        const difficulty = this.getProgressiveDifficulty();
        const speed = difficulty.enemySpeed * 0.8;
        
        // Number of enemies increases with difficulty
        const baseCount = 3;
        const extraCount = Math.floor(this.level / 2);
        const count = baseCount + Math.floor(Math.random() * 4) + extraCount;
        const spacing = this.canvas.width / (count + 1);
        
        for (let i = 1; i <= count; i++) {
            let x, y, velocity;
            
            if (side === 0) {
                x = i * spacing;
                y = -50 - (i * 10);
                velocity = { x: 0, y: speed };
            } else {
                x = i * spacing;
                y = this.canvas.height + 50 + (i * 10);
                velocity = { x: 0, y: -speed };
            }
            
            const enemy = new Enemy(x, y, velocity, this.level);
            enemy.radius *= difficulty.enemySize;
            this.enemies.push(enemy);
            this.enemyCount++;
        }
        
        this.updateUI();
    }
    
    // Add score method
    addScore(points) {
        this.score += points;
        this.updateUI();
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    window.game = new Game();
});