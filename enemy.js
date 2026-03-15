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
    }
    
    determineType() {
        const types = ['basic', 'fast', 'tank', 'splitter'];
        const weights = [0.5, 0.3, 0.15, 0.05]; // Probabilities
        
        // Adjust weights based on level
        if (this.level > 5) {
            weights[0] = 0.3; // Less basic
            weights[1] = 0.4; // More fast
            weights[2] = 0.2; // More tank
            weights[3] = 0.1; // More splitter
        }
        
        if (this.level > 10) {
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
    
    setProperties() {
        switch(this.type) {
            case 'basic':
                this.radius = 10 + Math.random() * 5;
                this.speedMultiplier = 1.0;
                this.health = 1;
                break;
            case 'fast':
                this.radius = 8 + Math.random() * 4;
                this.speedMultiplier = 1.5;
                this.health = 1;
                break;
            case 'tank':
                this.radius = 15 + Math.random() * 10;
                this.speedMultiplier = 0.7;
                this.health = 2 + Math.floor(this.level / 3);
                break;
            case 'splitter':
                this.radius = 12 + Math.random() * 6;
                this.speedMultiplier = 1.2;
                this.health = 1;
                break;
        }
        
        // Scale with level
        this.radius *= (1 + (this.level - 1) * 0.05);
        this.speedMultiplier *= (1 + (this.level - 1) * 0.1);
    }
    
    getColor() {
        switch(this.type) {
            case 'basic': return '#ff6b6b';
            case 'fast': return '#ffa500';
            case 'tank': return '#8b0000';
            case 'splitter': return '#9400d3';
            default: return '#ff6b6b';
        }
    }
    
    getGlowColor() {
        switch(this.type) {
            case 'basic': return 'rgba(255, 107, 107, 0.5)';
            case 'fast': return 'rgba(255, 165, 0, 0.5)';
            case 'tank': return 'rgba(139, 0, 0, 0.5)';
            case 'splitter': return 'rgba(148, 0, 211, 0.5)';
            default: return 'rgba(255, 107, 107, 0.5)';
        }
    }
    
    update(deltaTime) {
        // Update position
        this.x += this.velocity.x * this.speedMultiplier * deltaTime;
        this.y += this.velocity.y * this.speedMultiplier * deltaTime;
        
        // Update rotation
        this.rotation += this.rotationSpeed * deltaTime;
        
        // Some enemies have special behaviors
        if (this.type === 'fast') {
            // Fast enemies slightly home in on player
            // This would require player position, handled in game.js
        }
    }
    
    draw(ctx) {
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
        }
        
        ctx.restore();
        
        // Draw health for tank enemies
        if (this.type === 'tank' && this.health > 1) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.health.toString(), this.x, this.y + this.radius + 15);
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
}