// Player character class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.speed = 0.3;
        this.velocity = { x: 0, y: 0 };
        this.color = '#00ffea';
        this.trail = [];
        this.maxTrailLength = 10;
        this.isDashing = false;
        this.dashCooldown = 0;
        this.dashDuration = 0;
    }
    
    update(keys, deltaTime) {
        // Reset velocity
        this.velocity.x = 0;
        this.velocity.y = 0;
        
        // Handle keyboard input
        if (keys['w'] || keys['arrowup']) {
            this.velocity.y = -this.speed;
        }
        if (keys['s'] || keys['arrowdown']) {
            this.velocity.y = this.speed;
        }
        if (keys['a'] || keys['arrowleft']) {
            this.velocity.x = -this.speed;
        }
        if (keys['d'] || keys['arrowright']) {
            this.velocity.x = this.speed;
        }
        
        // Normalize diagonal movement
        if (this.velocity.x !== 0 && this.velocity.y !== 0) {
            this.velocity.x *= 0.7071; // 1/√2
            this.velocity.y *= 0.7071;
        }
        
        // Handle dash (Space key)
        if (keys[' '] && this.dashCooldown <= 0 && !this.isDashing) {
            this.isDashing = true;
            this.dashDuration = 200; // 200ms dash
            this.dashCooldown = 1000; // 1 second cooldown
            this.speed *= 3; // Triple speed during dash
        }
        
        // Update dash state
        if (this.isDashing) {
            this.dashDuration -= deltaTime;
            if (this.dashDuration <= 0) {
                this.isDashing = false;
                this.speed /= 3; // Reset speed
            }
        }
        
        // Update dash cooldown
        if (this.dashCooldown > 0) {
            this.dashCooldown -= deltaTime;
        }
        
        // Update position
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;
        
        // Add to trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
    }
    
    moveTo(x, y) {
        // Simple movement towards click position
        const dx = x - this.x;
        const dy = y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) { // Only move if far enough
            this.x += (dx / distance) * this.speed * 2;
            this.y += (dy / distance) * this.speed * 2;
        }
    }
    
    draw(ctx) {
        // Draw trail
        if (this.trail.length > 1) {
            ctx.strokeStyle = 'rgba(0, 255, 234, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.stroke();
        }
        
        // Draw player circle
        ctx.fillStyle = this.isDashing ? '#ff00ff' : this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw player outline
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw direction indicator
        if (this.velocity.x !== 0 || this.velocity.y !== 0) {
            const angle = Math.atan2(this.velocity.y, this.velocity.x);
            const indicatorX = this.x + Math.cos(angle) * (this.radius + 5);
            const indicatorY = this.y + Math.sin(angle) * (this.radius + 5);
            
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(indicatorX, indicatorY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw dash cooldown indicator
        if (this.dashCooldown > 0) {
            const cooldownPercent = this.dashCooldown / 1000;
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + (cooldownPercent * Math.PI * 2);
            
            ctx.strokeStyle = '#ff6b6b';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, startAngle, endAngle);
            ctx.stroke();
        }
    }
}