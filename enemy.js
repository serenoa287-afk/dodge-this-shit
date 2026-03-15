// Enemy class
class Enemy {
    constructor(x, y, velocity, level) {
        this.x = x;
        this.y = y;
        this.velocity = velocity;
        this.level = level;
        
        // Enemy properties based on level
        this.type = this.determineType();
        this.setProperties();
        
        // Visual properties
        this.color = this.getColor();
        this.glowColor = this.getGlowColor();
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
        
        // Spawn delay for staggered patterns
        this.spawnDelay = 0;
        this.active = false;
        this.spawnTimer = 0;
    }
    
    determineType() {
        const types = ['basic', 'fast', 'tank', 'splitter', 'chaser', 'stalker'];
        let weights = [0, 0, 0, 0, 0, 0]; // All start at 0
        
        // Progressive enemy unlocking based on level
        if (this.level === 1) {
            // Level 1: Only basic enemies
            weights = [1.0, 0, 0, 0, 0, 0];
        } else if (this.level === 2) {
            // Level 2: Basic + occasional fast
            weights = [0.8, 0.2, 0, 0, 0, 0];
        } else if (this.level === 3) {
            // Level 3: Basic, fast, occasional chaser
            weights = [0.6, 0.3, 0, 0, 0.1, 0];
        } else if (this.level === 4) {
            // Level 4: More variety
            weights = [0.5, 0.3, 0.1, 0, 0.1, 0];
        } else if (this.level === 5) {
            // Level 5: Introduce splitter
            weights = [0.4, 0.3, 0.1, 0.1, 0.1, 0];
        } else if (this.level === 6) {
            // Level 6: More chasers
            weights = [0.3, 0.3, 0.1, 0.1, 0.2, 0];
        } else if (this.level === 7) {
            // Level 7: Introduce stalker
            weights = [0.2, 0.25, 0.15, 0.1, 0.2, 0.1];
        } else if (this.level === 8) {
            // Level 8: More stalkers
            weights = [0.15, 0.2, 0.15, 0.1, 0.2, 0.2];
        } else if (this.level === 9) {
            // Level 9: Intense mix
            weights = [0.1, 0.15, 0.15, 0.15, 0.25, 0.2];
        } else if (this.level >= 10) {
            // Level 10: Final boss level - all types
            weights = [0.05, 0.1, 0.2, 0.2, 0.25, 0.2];
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
    
    setProperties() {
        switch(this.type) {
            case 'basic':
                this.radius = 10 + Math.random() * 5;
                this.speedMultiplier = 1.0;
                this.health = 1;
                this.behavior = 'straight';
                break;
            case 'fast':
                this.radius = 8 + Math.random() * 4;
                this.speedMultiplier = 1.5;
                this.health = 1;
                this.behavior = 'straight';
                break;
            case 'tank':
                this.radius = 15 + Math.random() * 10;
                this.speedMultiplier = 0.7;
                this.health = 2 + Math.floor(this.level / 3);
                this.behavior = 'straight';
                break;
            case 'splitter':
                this.radius = 12 + Math.random() * 6;
                this.speedMultiplier = 1.2;
                this.health = 1;
                this.behavior = 'straight';
                break;
            case 'chaser':
                this.radius = 9 + Math.random() * 4;
                this.speedMultiplier = 1.3;
                this.health = 1;
                this.behavior = 'chase';
                this.chaseDuration = 3000 + Math.random() * 2000; // 3-5 seconds
                this.chaseTimer = 0;
                this.explosionRadius = 80 + (this.level * 5);
                this.explosionDamage = 1;
                this.isChasing = true;
                this.isExploding = false;
                this.explosionTimer = 0;
                this.explosionDuration = 500; // 0.5 second explosion
                this.homingStrength = 0.05 + (this.level * 0.005); // How strongly it follows player
                break;
            case 'stalker':
                this.radius = 11 + Math.random() * 5;
                this.speedMultiplier = 1.1;
                this.health = 1;
                this.behavior = 'stalk';
                this.stalkPhase = 'chase'; // chase -> pause -> explode
                this.stalkTimer = 0;
                this.chaseDuration = 2000 + Math.random() * 1500; // 2-3.5 seconds chase
                this.pauseDuration = 1000 + Math.random() * 1000; // 1-2 seconds pause
                this.explosionRadius = 100 + (this.level * 8);
                this.explosionDamage = 2;
                this.isExploding = false;
                this.explosionTimer = 0;
                this.explosionDuration = 600; // 0.6 second explosion
                this.homingStrength = 0.04 + (this.level * 0.004);
                this.pauseTimer = 0;
                break;
        }
        
        // Scale with level
        this.radius *= (1 + (this.level - 1) * 0.05);
        this.speedMultiplier *= (1 + (this.level - 1) * 0.1);
        
        // Chasers get faster and have larger explosions at higher levels
        if (this.type === 'chaser') {
            this.speedMultiplier *= (1 + (this.level - 1) * 0.15);
            this.explosionRadius *= (1 + (this.level - 1) * 0.1);
            this.explosionDamage = Math.min(3, 1 + Math.floor(this.level / 5));
        }
    }
    
    getColor() {
        switch(this.type) {
            case 'basic': return '#ff6b6b';
            case 'fast': return '#ffa500';
            case 'tank': return '#8b0000';
            case 'splitter': return '#9400d3';
            case 'chaser': return this.isExploding ? '#ff0000' : '#00ff00';
            case 'stalker': 
                if (this.isExploding) return '#ff0000';
                if (this.stalkPhase === 'pause') return '#ffff00';
                return '#ff00ff'; // Magenta while chasing
            default: return '#ff6b6b';
        }
    }
    
    getGlowColor() {
        switch(this.type) {
            case 'basic': return 'rgba(255, 107, 107, 0.5)';
            case 'fast': return 'rgba(255, 165, 0, 0.5)';
            case 'tank': return 'rgba(139, 0, 0, 0.5)';
            case 'splitter': return 'rgba(148, 0, 211, 0.5)';
            case 'chaser': 
                if (this.isExploding) {
                    return 'rgba(255, 0, 0, 0.7)';
                } else if (!this.isChasing) {
                    return 'rgba(255, 255, 0, 0.6)'; // Yellow when about to explode
                } else {
                    return 'rgba(0, 255, 0, 0.5)';
                }
            case 'stalker':
                if (this.isExploding) {
                    return 'rgba(255, 0, 0, 0.7)';
                } else if (this.stalkPhase === 'pause') {
                    return 'rgba(255, 255, 0, 0.7)'; // Yellow when paused
                } else {
                    return 'rgba(255, 0, 255, 0.5)'; // Magenta while chasing
                }
            default: return 'rgba(255, 107, 107, 0.5)';
        }
    }
    
    update(deltaTime, playerX = null, playerY = null) {
        // Handle spawn delay for staggered patterns
        if (this.spawnDelay > 0) {
            this.spawnTimer += deltaTime;
            if (this.spawnTimer < this.spawnDelay) {
                return; // Don't move until spawn delay is over
            }
        }
        
        this.active = true;
        
        // Handle chaser behavior
        if (this.type === 'chaser' && this.isChasing && playerX !== null && playerY !== null) {
            this.updateChaserBehavior(deltaTime, playerX, playerY);
        } else if (this.type === 'chaser' && this.isExploding) {
            this.updateExplosion(deltaTime);
        } else if (this.type === 'stalker' && playerX !== null && playerY !== null) {
            this.updateStalkerBehavior(deltaTime, playerX, playerY);
        } else {
            // Standard movement for other enemies
            this.x += this.velocity.x * this.speedMultiplier * deltaTime;
            this.y += this.velocity.y * this.speedMultiplier * deltaTime;
        }
        
        // Update rotation
        this.rotation += this.rotationSpeed * deltaTime;
        
        // Fast enemies slightly home in on player
        if (this.type === 'fast' && playerX !== null && playerY !== null) {
            this.updateFastEnemyHoming(deltaTime, playerX, playerY);
        }
    }
    
    updateChaserBehavior(deltaTime, playerX, playerY) {
        // Update chase timer
        this.chaseTimer += deltaTime;
        
        // Calculate direction to player
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            // Normalize direction and apply homing
            const targetVelX = (dx / distance) * 0.1;
            const targetVelY = (dy / distance) * 0.1;
            
            // Smoothly adjust velocity toward player (diagonal movement)
            this.velocity.x += (targetVelX - this.velocity.x) * this.homingStrength;
            this.velocity.y += (targetVelY - this.velocity.y) * this.homingStrength;
            
            // Normalize velocity to maintain consistent speed
            const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
            if (currentSpeed > 0) {
                this.velocity.x = (this.velocity.x / currentSpeed) * 0.1;
                this.velocity.y = (this.velocity.y / currentSpeed) * 0.1;
            }
        }
        
        // Move chaser
        this.x += this.velocity.x * this.speedMultiplier * deltaTime;
        this.y += this.velocity.y * this.speedMultiplier * deltaTime;
        
        // Check if chase duration is over
        if (this.chaseTimer >= this.chaseDuration) {
            this.isChasing = false;
            this.isExploding = true;
            this.explosionTimer = 0;
            // Stop movement when exploding
            this.velocity.x = 0;
            this.velocity.y = 0;
        }
    }
    
    updateExplosion(deltaTime) {
        this.explosionTimer += deltaTime;
        
        // Expand explosion radius during explosion
        const explosionProgress = this.explosionTimer / this.explosionDuration;
        this.currentExplosionRadius = this.explosionRadius * explosionProgress;
        
        // Check if explosion is complete
        if (this.explosionTimer >= this.explosionDuration) {
            this.shouldRemove = true; // Mark for removal
        }
    }
    
    updateStalkerBehavior(deltaTime, playerX, playerY) {
        this.stalkTimer += deltaTime;
        
        switch(this.stalkPhase) {
            case 'chase':
                // Chase the player
                const dx = playerX - this.x;
                const dy = playerY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    // Normalize direction and apply homing
                    const targetVelX = (dx / distance) * 0.08;
                    const targetVelY = (dy / distance) * 0.08;
                    
                    this.velocity.x += (targetVelX - this.velocity.x) * this.homingStrength;
                    this.velocity.y += (targetVelY - this.velocity.y) * this.homingStrength;
                    
                    // Normalize velocity
                    const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
                    if (currentSpeed > 0) {
                        this.velocity.x = (this.velocity.x / currentSpeed) * 0.08;
                        this.velocity.y = (this.velocity.y / currentSpeed) * 0.08;
                    }
                }
                
                // Move stalker
                this.x += this.velocity.x * this.speedMultiplier * deltaTime;
                this.y += this.velocity.y * this.speedMultiplier * deltaTime;
                
                // Check if chase phase is over
                if (this.stalkTimer >= this.chaseDuration) {
                    this.stalkPhase = 'pause';
                    this.stalkTimer = 0;
                    this.pauseTimer = 0;
                    // Stop movement during pause
                    this.velocity.x = 0;
                    this.velocity.y = 0;
                }
                break;
                
            case 'pause':
                // Pause for a couple seconds
                this.pauseTimer += deltaTime;
                
                // Check if pause phase is over
                if (this.pauseTimer >= this.pauseDuration) {
                    this.stalkPhase = 'explode';
                    this.stalkTimer = 0;
                    this.isExploding = true;
                    this.explosionTimer = 0;
                }
                break;
                
            case 'explode':
                // Handle explosion
                this.updateExplosion(deltaTime);
                break;
        }
    }
    
    updateFastEnemyHoming(deltaTime, playerX, playerY) {
        // Fast enemies have slight homing
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            // Very slight homing effect (5% toward player)
            const homingStrength = 0.05;
            const targetVelX = (dx / distance) * 0.1;
            const targetVelY = (dy / distance) * 0.1;
            
            this.velocity.x += (targetVelX - this.velocity.x) * homingStrength;
            this.velocity.y += (targetVelY - this.velocity.y) * homingStrength;
        }
    }
    
    draw(ctx) {
        // Don't draw if not active yet (still in spawn delay)
        if (!this.active) {
            // Draw a faint preview of incoming enemy
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            return;
        }
        
        // Draw explosion effect for chasers and stalkers
        if ((this.type === 'chaser' || this.type === 'stalker') && this.isExploding) {
            this.drawExplosion(ctx);
            return;
        }
        
        // Draw glow effect
        ctx.fillStyle = this.glowColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw enemy body
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Different shapes for different enemy types
        switch(this.type) {
            case 'basic':
                this.drawBasic(ctx);
                break;
            case 'fast':
                this.drawFast(ctx);
                break;
            case 'tank':
                this.drawTank(ctx);
                break;
            case 'splitter':
                this.drawSplitter(ctx);
                break;
            case 'chaser':
                this.drawChaser(ctx);
                break;
            case 'stalker':
                this.drawStalker(ctx);
                break;
        }
        
        ctx.restore();
        
        // Draw chase timer for chasers
        if (this.type === 'chaser' && this.isChasing) {
            this.drawChaseTimer(ctx);
        }
        
        // Draw health for tank enemies
        if (this.type === 'tank' && this.health > 1) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.health.toString(), this.x, this.y + this.radius + 15);
        }
    }
    
    drawExplosion(ctx) {
        // Draw expanding explosion circle
        const explosionProgress = this.explosionTimer / this.explosionDuration;
        const alpha = 0.7 * (1 - explosionProgress); // Fade out
        
        // Outer explosion ring
        ctx.strokeStyle = `rgba(255, 100, 0, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentExplosionRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner explosion fill
        ctx.fillStyle = `rgba(255, 50, 0, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentExplosionRadius * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        // Shockwave lines
        const lineCount = 12;
        for (let i = 0; i < lineCount; i++) {
            const angle = (i * Math.PI * 2) / lineCount;
            const length = this.currentExplosionRadius * 1.2;
            const endX = this.x + Math.cos(angle) * length;
            const endY = this.y + Math.sin(angle) * length;
            
            ctx.strokeStyle = `rgba(255, 200, 0, ${alpha * 0.7})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
        
        // Center flash
        ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawChaseTimer(ctx) {
        // Draw chase timer circle around chaser
        const chaseProgress = this.chaseTimer / this.chaseDuration;
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (chaseProgress * Math.PI * 2);
        
        // Timer circle
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 15, startAngle, endAngle);
        ctx.stroke();
        
        // Warning when about to explode
        if (chaseProgress > 0.8) {
            const warningAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 100); // Pulsing effect
            ctx.fillStyle = `rgba(255, 0, 0, ${warningAlpha})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 20, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawBasic(ctx) {
        // Simple circle
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner detail
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawFast(ctx) {
        // Triangle shape for speed
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius * 0.866, this.radius * 0.5);
        ctx.lineTo(-this.radius * 0.866, this.radius * 0.5);
        ctx.closePath();
        ctx.fill();
        
        // Center dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawTank(ctx) {
        // Hexagon shape
        ctx.fillStyle = this.color;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const x = Math.cos(angle) * this.radius;
            const y = Math.sin(angle) * this.radius;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        
        // Armor plates
        ctx.strokeStyle = '#8b0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const x1 = Math.cos(angle) * (this.radius - 3);
            const y1 = Math.sin(angle) * (this.radius - 3);
            const x2 = Math.cos(angle) * (this.radius * 0.6);
            const y2 = Math.sin(angle) * (this.radius * 0.6);
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        }
        ctx.stroke();
    }
    
    drawSplitter(ctx) {
        // Four smaller circles in a cross pattern
        ctx.fillStyle = this.color;
        
        // Main center
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        
        // Satellite circles
        const satellites = 4;
        for (let i = 0; i < satellites; i++) {
            const angle = (i * Math.PI * 2) / satellites + this.rotation;
            const x = Math.cos(angle) * this.radius * 0.8;
            const y = Math.sin(angle) * this.radius * 0.8;
            
            ctx.beginPath();
            ctx.arc(x, y, this.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    isOutOfBounds(canvasWidth, canvasHeight) {
        const buffer = 100; // Extra buffer before removing
        return (
            this.x < -buffer ||
            this.x > canvasWidth + buffer ||
            this.y < -buffer ||
            this.y > canvasHeight + buffer
        );
    }
    
    takeDamage(amount = 1) {
        this.health -= amount;
        return this.health <= 0;
    }
    
    drawChaser(ctx) {
        // Diamond shape for chasers
        ctx.fillStyle = this.color;
        ctx.beginPath();
        
        // Diamond points
        ctx.moveTo(0, -this.radius); // Top
        ctx.lineTo(this.radius, 0);   // Right
        ctx.lineTo(0, this.radius);   // Bottom
        ctx.lineTo(-this.radius, 0);  // Left
        ctx.closePath();
        ctx.fill();
        
        // Inner diamond
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -this.radius * 0.6);
        ctx.lineTo(this.radius * 0.6, 0);
        ctx.lineTo(0, this.radius * 0.6);
        ctx.lineTo(-this.radius * 0.6, 0);
        ctx.closePath();
        ctx.fill();
        
        // Direction indicator (points toward movement)
        if (this.velocity.x !== 0 || this.velocity.y !== 0) {
            const angle = Math.atan2(this.velocity.y, this.velocity.x);
            const indicatorLength = this.radius * 1.5;
            const indicatorX = Math.cos(angle) * indicatorLength;
            const indicatorY = Math.sin(angle) * indicatorLength;
            
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(indicatorX, indicatorY);
            ctx.stroke();
            
            // Arrow head
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(indicatorX, indicatorY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawStalker(ctx) {
        // Square shape for stalkers
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        
        // Inner square
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-this.radius * 0.6, -this.radius * 0.6, this.radius * 1.2, this.radius * 1.2);
        
        // Phase indicator
        if (this.stalkPhase === 'pause') {
            // Draw pause timer
            const pauseProgress = this.pauseTimer / this.pauseDuration;
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 10, -Math.PI/2, (-Math.PI/2) + (pauseProgress * Math.PI * 2));
            ctx.stroke();
            
            // Draw exclamation mark when about to explode
            if (pauseProgress > 0.7) {
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(-2, -this.radius * 0.8, 4, this.radius * 1.2);
                ctx.fillRect(-2, this.radius * 0.4, 4, this.radius * 0.4);
            }
        } else if (this.stalkPhase === 'chase') {
            // Draw chase timer
            const chaseProgress = this.stalkTimer / this.chaseDuration;
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 10, -Math.PI/2, (-Math.PI/2) + (chaseProgress * Math.PI * 2));
            ctx.stroke();
            
            // Draw eyes
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(-this.radius * 0.4, -this.radius * 0.3, this.radius * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.radius * 0.4, -this.radius * 0.3, this.radius * 0.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}