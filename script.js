const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 800;
canvas.height = 600;

// Game state
const gameState = {
    difficulty: 'medium', // 'medium', 'hard', or 'god'
    isPlaying: false,
    showMainMenu: true
};

// Player class
class Player {
    constructor() {
        this.width = 20;
        this.height = 30;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height / 2 - this.height / 2;
        this.baseSpeed = 5;
        this.speed = this.baseSpeed * (gameState.difficulty === 'god' ? 1.15 : 1);
        this.color = '#FFD700'; // Gold color
        this.isAlive = true;
        this.hasPowerUp = false;
        this.powerUpTimer = null;
        this.isInvincible = false;
        this.invincibilityTimer = null;
        this.hasBounceShield = false;
        this.bounceShieldTimer = null;
        this.glowEffect = 0;
        this.score = 0;
        this.startTime = Date.now();
        // Store high scores for each difficulty
        this.highScores = {
            medium: parseInt(localStorage.getItem('highScore_medium')) || 0,
            hard: parseInt(localStorage.getItem('highScore_hard')) || 0,
            god: parseInt(localStorage.getItem('highScore_god')) || 0
        };
    }

    updateScore() {
        if (this.isAlive) {
            this.score = Math.floor((Date.now() - this.startTime) / 1000);
            if (this.score > this.highScores[gameState.difficulty]) {
                this.highScores[gameState.difficulty] = this.score;
                localStorage.setItem(`highScore_${gameState.difficulty}`, this.score);
            }
        }
    }

    resetScore() {
        this.score = 0;
        this.startTime = Date.now();
    }

    drawScore() {
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Time: ${this.score}s`, 10, 30);
        ctx.fillText(`Best: ${this.highScores[gameState.difficulty]}s`, 10, 60);
        
        // Draw difficulty indicator
        ctx.textAlign = 'right';
        ctx.fillStyle = gameState.difficulty === 'hard' ? '#ff4444' : (gameState.difficulty === 'god' ? '#9932CC' : '#4CAF50');
        ctx.fillText(`Difficulty: ${gameState.difficulty.charAt(0).toUpperCase() + gameState.difficulty.slice(1)}`, canvas.width - 10, 30);
    }

    draw() {
        if (!this.isAlive) return;
        
        // Draw glow effect when invincible or has bounce shield
        if (this.isInvincible || this.hasBounceShield) {
            this.glowEffect = (this.glowEffect + 0.1) % (Math.PI * 2);
            const glowSize = 5 + Math.sin(this.glowEffect) * 3;
            
            ctx.shadowColor = this.isInvincible ? '#00FFFF' : '#FFA500';
            ctx.shadowBlur = glowSize;
        }
        
        // Draw body
        ctx.fillStyle = this.isInvincible ? '#00FFFF' : (this.hasBounceShield ? '#FFA500' : this.color);
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw head
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y - 5, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }

    update() {
        if (!this.isAlive) return;

        // Handle keyboard input
        if ((keys.ArrowLeft || keys.a) && this.x > 0) this.x -= this.speed;
        if ((keys.ArrowRight || keys.d) && this.x < canvas.width - this.width) this.x += this.speed;
        if ((keys.ArrowUp || keys.w) && this.y > 0) this.y -= this.speed;
        if ((keys.ArrowDown || keys.s) && this.y < canvas.height - this.height) this.y += this.speed;
    }

    activateInvincibility() {
        this.isInvincible = true;
        
        // Clear existing timer if any
        if (this.invincibilityTimer) clearTimeout(this.invincibilityTimer);
        
        // Set timer to deactivate invincibility after 5 seconds
        this.invincibilityTimer = setTimeout(() => {
            this.deactivateInvincibility();
        }, 5000);
    }

    deactivateInvincibility() {
        this.isInvincible = false;
        this.invincibilityTimer = null;
    }

    activateBounceShield() {
        this.hasBounceShield = true;
        
        // Clear existing timer if any
        if (this.bounceShieldTimer) clearTimeout(this.bounceShieldTimer);
        
        // Set timer to deactivate bounce shield after 5 seconds
        this.bounceShieldTimer = setTimeout(() => {
            this.deactivateBounceShield();
        }, 5000);
    }

    deactivateBounceShield() {
        this.hasBounceShield = false;
        this.bounceShieldTimer = null;
    }

    checkCollision(ball) {
        if (!this.isAlive || this.isInvincible) return false;

        // Check body collision
        const bodyCollision = 
            this.x < ball.x + ball.radius &&
            this.x + this.width > ball.x - ball.radius &&
            this.y < ball.y + ball.radius &&
            this.y + this.height > ball.y - ball.radius;

        // Check head collision
        const headX = this.x + this.width / 2;
        const headY = this.y - 5;
        const headDistance = Math.sqrt(
            Math.pow(headX - ball.x, 2) + 
            Math.pow(headY - ball.y, 2)
        );
        const headCollision = headDistance < (10 + ball.radius);

        const collision = bodyCollision || headCollision;

        if (collision && this.hasBounceShield) {
            // Calculate collision point (use center of player for simplicity)
            const playerCenterX = this.x + this.width / 2;
            const playerCenterY = this.y + this.height / 2;
            
            // Calculate angle of collision
            const dx = ball.x - playerCenterX;
            const dy = ball.y - playerCenterY;
            const angle = Math.atan2(dy, dx);
            
            // Set new ball velocity (increase speed slightly for more dynamic bounces)
            const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy) * 1.2;
            ball.dx = Math.cos(angle) * speed;
            ball.dy = Math.sin(angle) * speed;
            
            // Move ball outside collision area
            const minDistance = Math.max(ball.radius + this.width / 2, ball.radius + this.height / 2);
            ball.x = playerCenterX + Math.cos(angle) * minDistance;
            ball.y = playerCenterY + Math.sin(angle) * minDistance;
        }

        return collision && !this.hasBounceShield;
    }

    activatePowerUp() {
        this.hasPowerUp = true;
        this.speed = this.baseSpeed * 2; // Double the speed
        
        // Clear existing timer if any
        if (this.powerUpTimer) clearTimeout(this.powerUpTimer);
        
        // Set timer to deactivate power-up after 5 seconds
        this.powerUpTimer = setTimeout(() => {
            this.deactivatePowerUp();
        }, 5000);
    }

    deactivatePowerUp() {
        this.hasPowerUp = false;
        this.speed = this.baseSpeed;
        this.powerUpTimer = null;
    }
}

// Ball class
class Ball {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        
        // Set speed based on difficulty
        const baseSpeed = 7.5;
        this.speed = gameState.difficulty === 'god' ? baseSpeed * 1.5 : 
                     gameState.difficulty === 'hard' ? baseSpeed : 
                     baseSpeed * 0.75; // Medium is 25% slower than hard
        const angle = Math.random() * Math.PI * 2; // Random angle between 0 and 2π
        this.dx = Math.cos(angle) * this.speed;
        this.dy = Math.sin(angle) * this.speed;
        
        this.mass = 1;
        this.bounce = 1; // Perfect elasticity
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    update(balls) {
        // Update position
        this.x += this.dx;
        this.y += this.dy;

        // Bounce off walls
        if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.dx = -Math.abs(this.dx);
        }
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.dx = Math.abs(this.dx);
        }
        if (this.y + this.radius > canvas.height) {
            this.y = canvas.height - this.radius;
            this.dy = -Math.abs(this.dy);
        }
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.dy = Math.abs(this.dy);
        }

        // Check collision with other balls
        for (let ball of balls) {
            if (ball === this) continue;

            const dx = ball.x - this.x;
            const dy = ball.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.radius + ball.radius) {
                // Collision detected - calculate new velocities
                const angle = Math.atan2(dy, dx);
                const sin = Math.sin(angle);
                const cos = Math.cos(angle);

                // Rotate velocities
                const vx1 = this.dx * cos + this.dy * sin;
                const vy1 = this.dy * cos - this.dx * sin;
                const vx2 = ball.dx * cos + ball.dy * sin;
                const vy2 = ball.dy * cos - ball.dx * sin;

                // Swap the velocities
                this.dx = vx2 * cos - vy1 * sin;
                this.dy = vy1 * cos + vx2 * sin;
                ball.dx = vx1 * cos - vy2 * sin;
                ball.dy = vy2 * cos + vx1 * sin;

                // Move balls apart to prevent sticking
                const overlap = (this.radius + ball.radius - distance) / 2;
                const moveX = overlap * cos;
                const moveY = overlap * sin;
                this.x -= moveX;
                this.y -= moveY;
                ball.x += moveX;
                ball.y += moveY;
            }
        }
    }
}

// PowerBall class for speed boost power-up
class PowerBall {
    constructor() {
        this.radius = 15;
        this.color = '#FF00FF'; // Magenta color
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.spawnTimer = null;
        this.scheduleSpawn();
    }

    draw() {
        if (!this.active) return;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();

        // Add pulsing effect
        const pulseRadius = this.radius + 5 * Math.sin(Date.now() / 200);
        ctx.beginPath();
        ctx.arc(this.x, this.y, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = this.color;
        ctx.stroke();
        ctx.closePath();
    }

    spawn() {
        if (player.hasPowerUp) {
            this.scheduleSpawn();
            return;
        }

        this.active = true;
        this.x = Math.random() * (canvas.width - this.radius * 2) + this.radius;
        this.y = Math.random() * (canvas.height - this.radius * 2) + this.radius;
    }

    scheduleSpawn() {
        if (this.spawnTimer) clearTimeout(this.spawnTimer);
        
        const randomTime = Math.random() * 15000 + 5000; // Random time between 5-20 seconds
        this.spawnTimer = setTimeout(() => this.spawn(), randomTime);
    }

    checkCollision() {
        if (!this.active) return false;

        const dx = this.x - (player.x + player.width / 2);
        const dy = this.y - (player.y + player.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < this.radius + Math.max(player.width, player.height) / 2;
    }

    collect() {
        this.active = false;
        player.activatePowerUp();
        this.scheduleSpawn();
    }
}

// InvincibilityPowerBall class
class InvincibilityPowerBall {
    constructor() {
        this.radius = 15;
        this.color = '#00FFFF'; // Cyan color
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.spawnTimer = null;
        this.rotationAngle = 0;
        this.scheduleSpawn();
    }

    draw() {
        if (!this.active) return;
        
        // Rotate the star effect
        this.rotationAngle += 0.02;
        
        // Draw the main orb
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();

        // Draw star effect
        const points = 5;
        const outerRadius = this.radius + 8;
        const innerRadius = this.radius + 3;
        
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI / points) + this.rotationAngle;
            const x = this.x + Math.cos(angle) * radius;
            const y = this.y + Math.sin(angle) * radius;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    spawn() {
        if (player.isInvincible) {
            this.scheduleSpawn();
            return;
        }

        this.active = true;
        this.x = Math.random() * (canvas.width - this.radius * 2) + this.radius;
        this.y = Math.random() * (canvas.height - this.radius * 2) + this.radius;
    }

    scheduleSpawn() {
        if (this.spawnTimer) clearTimeout(this.spawnTimer);
        
        const randomTime = Math.random() * 15000 + 5000; // Random time between 5-20 seconds
        this.spawnTimer = setTimeout(() => this.spawn(), randomTime);
    }

    checkCollision() {
        if (!this.active) return false;

        const dx = this.x - (player.x + player.width / 2);
        const dy = this.y - (player.y + player.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < this.radius + Math.max(player.width, player.height) / 2;
    }

    collect() {
        this.active = false;
        player.activateInvincibility();
        this.scheduleSpawn();
    }
}

// BounceShieldPowerBall class
class BounceShieldPowerBall {
    constructor() {
        this.radius = 15;
        this.color = '#FFA500'; // Orange color
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.spawnTimer = null;
        this.rotationAngle = 0;
        this.scheduleSpawn();
    }

    draw() {
        if (!this.active) return;
        
        // Rotate the shield effect
        this.rotationAngle += 0.02;
        
        // Draw the main orb
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();

        // Draw shield effect
        const shieldPoints = 8;
        const outerRadius = this.radius + 8;
        
        ctx.beginPath();
        for (let i = 0; i < shieldPoints; i++) {
            const angle = (i * Math.PI * 2 / shieldPoints) + this.rotationAngle;
            const x = this.x + Math.cos(angle) * outerRadius;
            const y = this.y + Math.sin(angle) * outerRadius;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    spawn() {
        if (player.hasBounceShield) {
            this.scheduleSpawn();
            return;
        }

        this.active = true;
        this.x = Math.random() * (canvas.width - this.radius * 2) + this.radius;
        this.y = Math.random() * (canvas.height - this.radius * 2) + this.radius;
    }

    scheduleSpawn() {
        if (this.spawnTimer) clearTimeout(this.spawnTimer);
        
        const randomTime = Math.random() * 15000 + 5000; // Random time between 5-20 seconds
        this.spawnTimer = setTimeout(() => this.spawn(), randomTime);
    }

    checkCollision() {
        if (!this.active) return false;

        const dx = this.x - (player.x + player.width / 2);
        const dy = this.y - (player.y + player.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < this.radius + Math.max(player.width, player.height) / 2;
    }

    collect() {
        this.active = false;
        player.activateBounceShield();
        this.scheduleSpawn();
    }
}

// Keyboard input handling
const keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

// Draw main menu
function drawMainMenu() {
    // Clear screen with fade effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw scoreboard
    const scoreboardY = 80;
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('High Scores', canvas.width / 2, scoreboardY);

    // Draw scores for each difficulty
    const scoreX = canvas.width / 2;
    const scoreSpacing = 180;
    ctx.font = '20px Arial';
    
    // Medium score
    ctx.fillStyle = '#4CAF50';
    ctx.fillText('Medium', scoreX - scoreSpacing, scoreboardY + 40);
    ctx.fillStyle = 'white';
    ctx.fillText(`${player.highScores.medium}s`, scoreX - scoreSpacing, scoreboardY + 70);
    
    // Hard score
    ctx.fillStyle = '#ff4444';
    ctx.fillText('Hard', scoreX, scoreboardY + 40);
    ctx.fillStyle = 'white';
    ctx.fillText(`${player.highScores.hard}s`, scoreX, scoreboardY + 70);
    
    // God score
    ctx.fillStyle = '#9932CC';
    ctx.fillText('God', scoreX + scoreSpacing, scoreboardY + 40);
    ctx.fillStyle = 'white';
    ctx.fillText(`${player.highScores.god}s`, scoreX + scoreSpacing, scoreboardY + 70);
    
    // Draw title
    ctx.fillStyle = '#4CAF50';
    ctx.font = '64px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Ball Dodge', canvas.width / 2, canvas.height / 3 + 50);
    
    // Difficulty selection text
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText('Select Difficulty:', canvas.width / 2, canvas.height / 2);

    // Update button dimensions for 3 buttons
    const buttonWidth = 120;
    const buttonHeight = 40;
    const buttonSpacing = 20;
    const totalWidth = buttonWidth * 3 + buttonSpacing * 2;
    const startX = canvas.width / 2 - totalWidth / 2;
    const buttonY = canvas.height / 2 + 20;

    // Medium button
    ctx.shadowColor = gameState.difficulty === 'medium' ? '#4CAF50' : '#666666';
    ctx.shadowBlur = 15;
    ctx.fillStyle = gameState.difficulty === 'medium' ? '#4CAF50' : '#666666';
    ctx.fillRect(startX, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = 'white';
    ctx.fillText('Medium', startX + buttonWidth / 2, buttonY + 28);

    // Hard button
    ctx.shadowColor = gameState.difficulty === 'hard' ? '#ff4444' : '#666666';
    ctx.shadowBlur = 15;
    ctx.fillStyle = gameState.difficulty === 'hard' ? '#ff4444' : '#666666';
    ctx.fillRect(startX + buttonWidth + buttonSpacing, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = 'white';
    ctx.fillText('Hard', startX + buttonWidth + buttonSpacing + buttonWidth / 2, buttonY + 28);

    // God Mode button
    ctx.shadowColor = gameState.difficulty === 'god' ? '#9932CC' : '#666666';
    ctx.shadowBlur = 15;
    ctx.fillStyle = gameState.difficulty === 'god' ? '#9932CC' : '#666666';
    ctx.fillRect(startX + (buttonWidth + buttonSpacing) * 2, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = 'white';
    ctx.fillText('God', startX + (buttonWidth + buttonSpacing) * 2 + buttonWidth / 2, buttonY + 28);

    // Play button
    const playButtonWidth = 200;
    const playButtonHeight = 50;
    const playButtonX = canvas.width / 2 - playButtonWidth / 2;
    const playButtonY = canvas.height / 2 + 100;

    ctx.shadowColor = '#4CAF50';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(playButtonX, playButtonY, playButtonWidth, playButtonHeight);
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = 'white';
    ctx.font = '32px Arial';
    ctx.fillText('Play Game', canvas.width / 2, playButtonY + 35);

    // Instructions
    ctx.fillStyle = '#888888';
    ctx.font = '18px Arial';
    ctx.fillText('Use WASD or Arrow Keys to move', canvas.width / 2, canvas.height - 80);
    ctx.fillText('Collect power-ups to survive longer', canvas.width / 2, canvas.height - 50);
}

// Add menu click handler
function handleMainMenuClick(event) {
    if (!gameState.showMainMenu) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const buttonWidth = 120;
    const buttonHeight = 40;
    const buttonSpacing = 20;
    const totalWidth = buttonWidth * 3 + buttonSpacing * 2;
    const startX = canvas.width / 2 - totalWidth / 2;
    const buttonY = canvas.height / 2 + 20;

    if (y >= buttonY && y <= buttonY + buttonHeight) {
        // Medium button
        if (x >= startX && x <= startX + buttonWidth) {
            gameState.difficulty = 'medium';
            return;
        }
        // Hard button
        if (x >= startX + buttonWidth + buttonSpacing && x <= startX + buttonWidth * 2 + buttonSpacing) {
            gameState.difficulty = 'hard';
            return;
        }
        // God Mode button
        if (x >= startX + (buttonWidth + buttonSpacing) * 2 && x <= startX + (buttonWidth + buttonSpacing) * 2 + buttonWidth) {
            gameState.difficulty = 'god';
            return;
        }
    }

    // Play button
    const playButtonWidth = 200;
    const playButtonHeight = 50;
    const playButtonX = canvas.width / 2 - playButtonWidth / 2;
    const playButtonY = canvas.height / 2 + 100;

    if (x >= playButtonX && x <= playButtonX + playButtonWidth &&
        y >= playButtonY && y <= playButtonY + playButtonHeight) {
        // Start the game
        gameState.showMainMenu = false;
        gameState.isPlaying = true;
        startGame();
    }
}

// Function to start a new game
function startGame() {
    // Reset player
    player.isAlive = true;
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height / 2 - player.height / 2;
    player.speed = player.baseSpeed;
    player.hasPowerUp = false;
    player.isInvincible = false;
    player.resetScore();
    if (player.powerUpTimer) clearTimeout(player.powerUpTimer);
    if (player.invincibilityTimer) clearTimeout(player.invincibilityTimer);

    // Reset balls with current difficulty
    balls.length = 0;
    const numBalls = gameState.difficulty === 'god' ? colors.length + 1 : colors.length;
    for (let i = 0; i < numBalls; i++) {
        const radius = 20;
        const x = Math.random() * (canvas.width - radius * 2) + radius;
        const y = Math.random() * (canvas.height - radius * 2) + radius;
        const color = i < colors.length ? colors[i] : 'purple'; // Extra ball in god mode is purple
        balls.push(new Ball(x, y, radius, color));
    }

    // Make player invincible for first 3 seconds
    player.activateInvincibility();
    if (player.invincibilityTimer) clearTimeout(player.invincibilityTimer);
    player.invincibilityTimer = setTimeout(() => {
        player.deactivateInvincibility();
    }, 3000);

    // Reset power balls
    powerBall.active = false;
    powerBall.scheduleSpawn();
    invincibilityPowerBall.active = false;
    invincibilityPowerBall.scheduleSpawn();
    bounceShieldPowerBall.active = false;
    bounceShieldPowerBall.scheduleSpawn();
}

// Initialize background balls for menu
function initMenuBalls() {
    if (balls.length === 0) {
        for (let i = 0; i < colors.length; i++) {
            const radius = 20;
            const x = Math.random() * (canvas.width - radius * 2) + radius;
            const y = Math.random() * (canvas.height - radius * 2) + radius;
            balls.push(new Ball(x, y, radius, colors[i]));
        }
    }
}

// Add menu click listener
canvas.addEventListener('click', handleMainMenuClick);

// Modify animation loop to include main menu
function animate() {
    // Initialize menu balls if needed
    if (gameState.showMainMenu && balls.length === 0) {
        initMenuBalls();
    }

    // Clear screen based on game state
    if (gameState.showMainMenu || (!gameState.isPlaying && !player.isAlive)) {
        // Fade effect for menus
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        // Clear screen completely for gameplay
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Update and draw balls (always running in both menu and game)
    balls.forEach(ball => {
        ball.update(balls);
        ball.draw();
    });

    if (gameState.showMainMenu) {
        drawMainMenu();
    } else if (gameState.isPlaying) {
        if (player.isAlive) {
            // Update and draw player
            player.update();
            player.draw();
            player.updateScore();
            player.drawScore();

            // Draw power balls
            powerBall.draw();
            invincibilityPowerBall.draw();
            bounceShieldPowerBall.draw();
            
            // Check power ball collisions
            if (powerBall.checkCollision()) {
                powerBall.collect();
            }
            if (invincibilityPowerBall.checkCollision()) {
                invincibilityPowerBall.collect();
            }
            if (bounceShieldPowerBall.checkCollision()) {
                bounceShieldPowerBall.collect();
            }

            // Check if ball hits player
            balls.forEach(ball => {
                if (player.checkCollision(ball)) {
                    player.isAlive = false;
                }
            });
        } else {
            // Show game over screen
            drawGameOver();
        }
    }

    requestAnimationFrame(animate);
}

// Separate game over screen drawing function
function drawGameOver() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Game Over text
    ctx.fillStyle = 'red';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 80);
    
    // Show final score
    ctx.fillStyle = 'white';
    ctx.font = '32px Arial';
    ctx.fillText(`Survival Time: ${player.score} seconds`, canvas.width / 2, canvas.height / 2 - 20);
    if (player.score >= player.highScores[gameState.difficulty]) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText('New High Score!', canvas.width / 2, canvas.height / 2 + 20);
    }

    // Play Again button
    const buttonWidth = 200;
    const buttonHeight = 50;
    const buttonSpacing = 20;
    const buttonX = canvas.width / 2 - buttonWidth / 2;
    const playAgainY = canvas.height / 2 + 80;
    const mainMenuY = playAgainY + buttonHeight + buttonSpacing;

    // Play Again button
    ctx.shadowColor = '#4CAF50';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(buttonX, playAgainY, buttonWidth, buttonHeight);
    
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText('Play Again', canvas.width / 2, playAgainY + 32);

    // Main Menu button
    ctx.shadowColor = '#666666';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#666666';
    ctx.fillRect(buttonX, mainMenuY, buttonWidth, buttonHeight);
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = 'white';
    ctx.fillText('Main Menu', canvas.width / 2, mainMenuY + 32);

    // Add click event listener if not already added
    if (!window.playAgainListener) {
        window.playAgainListener = true;
        canvas.addEventListener('click', function handleClick(event) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // Check play again button click
            if (x >= buttonX && x <= buttonX + buttonWidth &&
                y >= playAgainY && y <= playAgainY + buttonHeight) {
                // Remove click listener
                canvas.removeEventListener('click', handleClick);
                window.playAgainListener = false;
                startGame();
            }
            
            // Check main menu button click
            if (x >= buttonX && x <= buttonX + buttonWidth &&
                y >= mainMenuY && y <= mainMenuY + buttonHeight) {
                // Remove click listener
                canvas.removeEventListener('click', handleClick);
                window.playAgainListener = false;
                // Return to main menu
                gameState.showMainMenu = true;
                gameState.isPlaying = false;
            }
        });
    }
}

// Create player
const player = new Player();

// Create power ball
const powerBall = new PowerBall();

// Create invincibility power ball
const invincibilityPowerBall = new InvincibilityPowerBall();

// Create bounce shield power ball
const bounceShieldPowerBall = new BounceShieldPowerBall();

// Create balls array and colors (but don't create balls yet)
const colors = ['red', 'blue', 'green', 'orange', 'white'];
const balls = [];

// Start animation loop
animate(); 