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
        
        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 2000; // ms
        
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
        
        // Spawn enemies
        this.enemySpawnTimer += this.deltaTime;
        if (this.enemySpawnTimer >= this.enemySpawnInterval) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
            
            // Adjust spawn interval based on level
            this.enemySpawnInterval = Math.max(500, 2000 - (this.level * 100));
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
        
        // Check level progression
        if (this.score >= this.level * 1000) {
            this.levelUp();
        }
    }
    
    spawnEnemy() {
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
    
    checkCollision(circle1, circle2) {
        const dx = circle1.x - circle2.x;
        const dy = circle1.y - circle2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (circle1.radius + circle2.radius);
    }
    
    levelUp() {
        this.level++;
        this.levelManager.applyLevelEffects(this.level);
        
        // Visual feedback for level up
        this.ctx.fillStyle = '#00ffea';
        this.ctx.font = '40px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`LEVEL ${this.level}`, this.canvas.width / 2, this.canvas.height / 2);
        
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
        this.ctx.fillText(`LEVEL: ${this.level}`, 20, 60);
        this.ctx.fillText(`LIVES: ${this.lives}`, 20, 90);
        
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
}

// Initialize game when page loads
window.addEventListener('load', () => {
    const game = new Game();
});