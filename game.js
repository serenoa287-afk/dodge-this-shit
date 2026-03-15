// Main game controller
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.gameState = 'start'; // 'start', 'playing', 'paused', 'gameover'
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
        
        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 1000; // ms - faster spawning for rows/columns
        this.roundTimer = 0;
        this.roundDuration = 30000; // 30 seconds per round
        this.roundActive = false;
        
        // Input
        this.keys = {};
        this.mousePos = { x: 0, y: 0 };
        
        // UI elements
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.restartBtn = document.getElementById('restart-btn');
        this.startScreenBtn = document.getElementById('start-screen-btn');
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
            
            // Pause with P key
            if (e.key.toLowerCase() === 'p') {
                this.togglePause();
            }
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
                this.player.moveTo(x, y);
            }
        });
        
        // Button events
        this.startBtn.addEventListener('click', () => this.startGame());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.resetBtn.addEventListener('click', () => this.resetGame());
        this.restartBtn.addEventListener('click', () => this.restartGame());
        this.startScreenBtn.addEventListener('click', () => this.startGame());
        
        // GitHub link
        document.getElementById('github-link').addEventListener('click', (e) => {
            e.preventDefault();
            alert('GitHub repository will be created soon!');
        });
        
        // Multiplayer toggle button
        const mpBtn = document.createElement('button');
        mpBtn.id = 'multiplayer-btn';
        mpBtn.className = 'btn btn-primary';
        mpBtn.textContent = '🎮 Multiplayer';
        mpBtn.style.position = 'absolute';
        mpBtn.style.top = '20px';
        mpBtn.style.right = '20px';
        mpBtn.style.zIndex = '1000';
        document.querySelector('.container').appendChild(mpBtn);
        
        mpBtn.addEventListener('click', () => {
            if (this.multiplayer) {
                this.multiplayer.toggle();
            }
        });
    }
    
    startGame() {
        this.gameState = 'playing';
        this.startScreen.style.display = 'none';
        this.gameOverScreen.style.display = 'none';
        this.resetGameState();
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
    
    resetGame() {
        this.gameState = 'start';
        this.startScreen.style.display = 'flex';
        this.gameOverScreen.style.display = 'none';
        this.resetGameState();
    }
    
    restartGame() {
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
        // Update player
        this.player.update(this.keys, this.deltaTime);
        
        // Keep player within bounds
        this.player.x = Math.max(this.player.radius, Math.min(this.canvas.width - this.player.radius, this.player.x));
        this.player.y = Math.max(this.player.radius, Math.min(this.canvas.height - this.player.radius, this.player.y));
        
        // Update round timer
        if (this.roundActive) {
            this.roundTimer += this.deltaTime;
            
            // Check if round is over (30 seconds)
            if (this.roundTimer >= this.roundDuration) {
                this.endRound();
            }
        }
        
        // Spawn enemies based on round progress
        this.enemySpawnTimer += this.deltaTime;
        if (this.enemySpawnTimer >= this.enemySpawnInterval && this.roundActive) {
            this.spawnEnemyPattern();
            this.enemySpawnTimer = 0;
            
            // Adjust spawn interval based on level and round progress
            const roundProgress = this.roundTimer / this.roundDuration;
            const baseInterval = Math.max(300, 1500 - (this.level * 80));
            this.enemySpawnInterval = baseInterval * (1 - (roundProgress * 0.5)); // Faster as round progresses
        }
        
        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(this.deltaTime);
            
            // Check collision with player
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
            
            // Remove enemies that are out of bounds
            if (enemy.isOutOfBounds(this.canvas.width, this.canvas.height)) {
                this.enemies.splice(i, 1);
                this.enemyCount--;
                this.score += 10; // Bonus for dodging
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
        }
    }
    
    getPatternType(roundProgress) {
        // Pattern distribution changes as round progresses
        const patterns = [
            { type: 'single', weight: 0.4 },
            { type: 'row', weight: 0.2 },
            { type: 'column', weight: 0.2 },
            { type: 'staggered', weight: 0.1 },
            { type: 'wave', weight: 0.1 }
        ];
        
        // Adjust weights based on round progress
        if (roundProgress > 0.5) {
            // More complex patterns in second half of round
            patterns[0].weight = 0.2;  // Less single
            patterns[1].weight = 0.25; // More rows
            patterns[2].weight = 0.25; // More columns
            patterns[3].weight = 0.15; // More staggered
            patterns[4].weight = 0.15; // More waves
        }
        
        if (roundProgress > 0.8) {
            // Intense patterns near end of round
            patterns[0].weight = 0.1;
            patterns[1].weight = 0.3;
            patterns[2].weight = 0.3;
            patterns[3].weight = 0.15;
            patterns[4].weight = 0.15;
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
        
        const speed = 0.1 + (this.level * 0.02); // Speed increases with level
        
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
        
        const enemy = new Enemy(x, y, velocity, this.level);
        this.enemies.push(enemy);
        this.enemyCount++;
        this.updateUI();
    }
    
    spawnRowPattern() {
        const side = Math.floor(Math.random() * 2); // 0: top, 1: bottom
        const speed = 0.08 + (this.level * 0.015);
        
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
        const speed = 0.08 + (this.level * 0.015);
        
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
        const speed = 0.07 + (this.level * 0.012);
        
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
        
        // Level up after each round
        this.level++;
        this.levelManager.applyLevelEffects(this.level);
        
        // Show round complete message
        this.ctx.fillStyle = '#00ffea';
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
    
    levelUp() {
        // Leveling now happens at end of each round
        // This method is kept for compatibility
        this.updateUI();
    }
    
    gameOver() {
        this.gameState = 'gameover';
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-level').textContent = this.level;
        this.gameOverScreen.style.display = 'flex';
    }
    
    draw() {
        // Draw grid background
        this.drawGrid();
        
        // Draw player
        this.player.draw(this.ctx);
        
        // Draw enemies
        this.enemies.forEach(enemy => enemy.draw(this.ctx));
        
        // Draw HUD
        this.drawHUD();
        
        // Draw pause overlay
        if (this.gameState === 'paused') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#00ffea';
            this.ctx.font = '40px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
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
        this.ctx.fillStyle = '#00ffea';
        this.ctx.font = '16px "Press Start 2P"';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 20, 30);
        this.ctx.fillText(`ROUND: ${this.level}`, 20, 60);
        this.ctx.fillText(`LIVES: ${this.lives}`, 20, 90);
        
        // Round timer
        if (this.roundActive) {
            const timeLeft = Math.max(0, this.roundDuration - this.roundTimer);
            const seconds = Math.floor(timeLeft / 1000);
            const milliseconds = Math.floor((timeLeft % 1000) / 10);
            this.ctx.fillText(`TIME: ${seconds}.${milliseconds.toString().padStart(2, '0')}`, 20, 120);
            
            // Timer bar
            const progress = timeLeft / this.roundDuration;
            this.ctx.fillStyle = '#00ffea';
            this.ctx.fillRect(20, 130, 200 * progress, 5);
            this.ctx.strokeStyle = '#ffffff';
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
        this.ctx.fillStyle = '#00ffea';
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
    draw() {
        // Draw grid background
        this.drawGrid();
        
        // Draw other players (multiplayer)
        this.otherPlayers.forEach((player, playerId) => {
            if (!player.eliminated) {
                this.ctx.fillStyle = player.hitFlash ? '#ff0000' : player.color;
                this.ctx.beginPath();
                this.ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw dash effect
                if (player.isDashing) {
                    this.ctx.strokeStyle = '#ffffff';
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
                
                // Draw player name (if available)
                if (this.multiplayer) {
                    const mpPlayer = this.multiplayer.players.get(playerId);
                    if (mpPlayer) {
                        this.ctx.fillStyle = '#ffffff';
                        this.ctx.font = '12px Arial';
                        this.ctx.textAlign = 'center';
                        this.ctx.fillText(mpPlayer.name, player.x, player.y - player.radius - 10);
                    }
                }
            }
        });
        
        // Draw player
        this.player.draw(this.ctx);
        
        // Draw enemies
        this.enemies.forEach(enemy => enemy.draw(this.ctx));
        
        // Draw HUD
        this.drawHUD();
        
        // Draw pause overlay
        if (this.gameState === 'paused') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#00ffea';
            this.ctx.font = '40px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        }
    }
    
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
    const game = new Game();
});