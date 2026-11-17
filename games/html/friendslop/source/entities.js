

// Player class
class Player {
    constructor(x, y, emoji, controls) {
        this.x = x;
        this.y = y;
        this.emoji = emoji;
        this.controls = controls;
        this.width = 40;
        this.height = 40;
        this.speed = 5;
        this.moveLeft = false;
        this.moveRight = false;
    }
    
    update() {
        if (this.moveLeft && this.x > 0) this.x -= this.speed;
        if (this.moveRight && this.x < canvas.width - this.width) this.x += this.speed;
        // Slop-stick feed/move: analog drift from the left joystick (-1..1)
        const stick = (game && typeof game.stickX === 'number') ? game.stickX : 0;
        if (stick) {
            this.x += stick * this.speed * 1.2;
            if (this.x < 0) this.x = 0;
            if (this.x > canvas.width - this.width) this.x = canvas.width - this.width;
        }
    }
    
    throw(vx = 0) {
        const projectile = new Projectile(this.x + this.width / 2, this.y, vx, -10);
        game.projectiles.push(projectile);
        playSlopSound('throw');
    }

    yeet() {
        // YEET: 3-way spread lobbed at the friends row
        const cx = this.x + this.width / 2;
        game.projectiles.push(new Projectile(cx, this.y, -3.5, -11));
        game.projectiles.push(new Projectile(cx, this.y, 0, -13));
        game.projectiles.push(new Projectile(cx, this.y, 3.5, -11));
        playSlopSound('throw');
        playSlopSound('feed');
    }
    
    collidesWith(entity) {
        return this.x < entity.x + entity.width &&
               this.x + this.width > entity.x &&
               this.y < entity.y + entity.height &&
               this.y + this.height > entity.y;
    }
    
    draw(ctx) {
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, this.x + this.width / 2, this.y + this.height / 2);
    }
}


// Friend class
class Friend {
    constructor(x, y, emoji) {
        this.x = x;
        this.y = y;
        this.emoji = emoji;
        this.width = 40;
        this.height = 40;
        this.bounceAmount = 0;
    }
    
    update() {
        if (this.bounceAmount > 0) {
            this.bounceAmount -= 2;
        }
    }
    
    bounce() {
        this.bounceAmount = 20;
    }
    
    collidesWith(entity) {
        return this.x < entity.x + entity.width &&
               this.x + this.width > entity.x &&
               this.y < entity.y + entity.height &&
               this.y + this.height > entity.y;
    }
    
    draw(ctx) {
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const offsetY = -this.bounceAmount;
        ctx.fillText(this.emoji, this.x + this.width / 2, this.y + this.height / 2 + offsetY);
    }
}


// Slop class
class Slop {
    constructor(x, y, emoji) {
        this.x = x;
        this.y = y;
        this.emoji = emoji;
        this.width = 30;
        this.height = 30;
        this.speed = 2 + Math.random() * 2;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
    }
    
    update() {
        this.y += this.speed;
        this.rotation += this.rotationSpeed;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, 0, 0);
        ctx.restore();
    }
}


// Hazard class
class Hazard {
    constructor(x, y, emoji) {
        this.x = x;
        this.y = y;
        this.emoji = emoji;
        this.width = 35;
        this.height = 35;
        this.speed = 1.5 + Math.random() * 1.5;
    }
    
    update() {
        this.y += this.speed;
    }
    
    draw(ctx) {
        ctx.font = '35px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, this.x + this.width / 2, this.y + this.height / 2);
    }
}


// Projectile class
class Projectile {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.width = 20;
        this.height = 20;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // gravity
    }
    
    draw(ctx) {
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🍝', this.x, this.y);
    }
}


// Particle class
class Particle {
    constructor(x, y, vx, vy, emoji) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.emoji = emoji;
        this.life = 30;
        this.size = 20;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.3; // gravity
        this.life--;
    }
    
    draw(ctx) {
        ctx.globalAlpha = this.life / 30;
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, this.x, this.y);
        ctx.globalAlpha = 1;
    }
}
