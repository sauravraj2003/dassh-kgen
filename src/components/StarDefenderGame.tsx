import { useEffect, useRef } from 'react';

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Spaceship extends GameObject {
  dx: number;
  dy: number;
  targetX: number;
  targetY: number;
}

interface Enemy extends GameObject {
  dy: number;
  health: number;
}

interface Missile extends GameObject {
  dy: number;
}

interface Explosion {
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

const StarDefenderGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef({
    spaceship: { x: 0, y: 0, width: 20, height: 16, dx: 0, dy: 0, targetX: 0, targetY: 0 } as Spaceship,
    enemies: [] as Enemy[],
    missiles: [] as Missile[],
    explosions: [] as Explosion[],
    gameSpeed: 1,
    lastMissileTime: 0,
    missileInterval: 150,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const gameState = gameStateRef.current;
    // Fix spaceship Y position - only moves horizontally
    gameState.spaceship.y = canvas.height - 120;
    gameState.spaceship.targetY = gameState.spaceship.y;
    gameState.spaceship.x = canvas.width / 2 - gameState.spaceship.width / 2;
    gameState.spaceship.targetX = gameState.spaceship.x;

    const spawnEnemy = () => {
      if (Math.random() < 0.004) {
        const enemy: Enemy = {
          x: Math.random() * (canvas.width - 20),
          y: -20,
          width: 16,
          height: 16,
          dy: 0.6 + Math.random() * 0.8,
          health: 1
        };
        gameState.enemies.push(enemy);
      }
    };

    const findBestTargetEnemy = () => {
      if (gameState.enemies.length === 0) return null;
      
      // Find enemies that are closest and in a threatening position
      let bestEnemy = null;
      let bestScore = -1;

      gameState.enemies.forEach(enemy => {
        // Calculate how long it would take for enemy to reach bottom
        const timeToBottom = (canvas.height - enemy.y) / enemy.dy;
        
        // Calculate how long it would take for a missile to reach the enemy
        const missileSpeed = 4; // missile dy speed
        const timeToHitEnemy = (enemy.y - gameState.spaceship.y) / missileSpeed;
        
        // Prioritize enemies that:
        // 1. Are closer to the bottom (more threatening)
        // 2. Can actually be hit by our missiles
        // 3. Are within reasonable horizontal distance
        const threat = 1 / Math.max(timeToBottom, 1); // Higher threat = closer to bottom
        const canHit = timeToHitEnemy > 0 && timeToHitEnemy < timeToBottom ? 1 : 0.1;
        const horizontalDistance = Math.abs(enemy.x - gameState.spaceship.x);
        const proximity = 1 / Math.max(horizontalDistance / 100, 1); // Prefer closer enemies horizontally
        
        const score = threat * canHit * proximity;
        
        if (score > bestScore) {
          bestScore = score;
          bestEnemy = enemy;
        }
      });

      return bestEnemy;
    };

    const spawnMissile = (currentTime: number) => {
      if (currentTime - gameState.lastMissileTime > gameState.missileInterval) {
        const missile: Missile = {
          x: gameState.spaceship.x + gameState.spaceship.width / 2 - 1,
          y: gameState.spaceship.y,
          width: 2,
          height: 8,
          dy: -4
        };
        gameState.missiles.push(missile);
        gameState.lastMissileTime = currentTime;
      }
    };

    const createExplosion = (x: number, y: number) => {
      gameState.explosions.push({
        x,
        y,
        life: 0,
        maxLife: 15
      });
    };

    const checkCollisions = () => {
      gameState.missiles.forEach((missile, missileIndex) => {
        gameState.enemies.forEach((enemy, enemyIndex) => {
          if (
            missile.x < enemy.x + enemy.width &&
            missile.x + missile.width > enemy.x &&
            missile.y < enemy.y + enemy.height &&
            missile.y + missile.height > enemy.y
          ) {
            createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            gameState.missiles.splice(missileIndex, 1);
            gameState.enemies.splice(enemyIndex, 1);
          }
        });
      });
    };

    const updateSpaceship = () => {
      const targetEnemy = findBestTargetEnemy();
      
      if (targetEnemy) {
        // Move horizontally to align with the target enemy
        // Predict where the enemy will be when our missile reaches it
        const missileSpeed = 4;
        const timeToReach = (targetEnemy.y - gameState.spaceship.y) / missileSpeed;
        const predictedEnemyX = targetEnemy.x + (targetEnemy.dx || 0) * timeToReach;
        
        // Aim for the center of the predicted enemy position
        gameState.spaceship.targetX = predictedEnemyX - gameState.spaceship.width / 2;
      } else {
        // Return to center if no enemies
        gameState.spaceship.targetX = canvas.width / 2 - gameState.spaceship.width / 2;
      }

      // Only move horizontally - Y position stays fixed
      const moveSpeed = 2.5; // Increased speed for more responsive movement
      const dx = gameState.spaceship.targetX - gameState.spaceship.x;
      
      if (Math.abs(dx) > 1) {
        gameState.spaceship.x += dx > 0 ? moveSpeed : -moveSpeed;
      }

      // Keep spaceship within horizontal bounds only
      gameState.spaceship.x = Math.max(0, Math.min(canvas.width - gameState.spaceship.width, gameState.spaceship.x));
      
      // Ensure Y position remains fixed
      gameState.spaceship.y = canvas.height - 120;
    };

    const updateEnemies = () => {
      gameState.enemies = gameState.enemies.filter(enemy => {
        enemy.y += enemy.dy;
        return enemy.y < canvas.height + enemy.height;
      });
    };

    const updateMissiles = () => {
      gameState.missiles = gameState.missiles.filter(missile => {
        missile.y += missile.dy;
        return missile.y > -missile.height;
      });
    };

    const updateExplosions = () => {
      gameState.explosions = gameState.explosions.filter(explosion => {
        explosion.life++;
        return explosion.life < explosion.maxLife;
      });
    };

    const drawSpaceship = () => {
      ctx.fillStyle = 'rgba(0, 255, 204, 0.6)';
      ctx.fillRect(gameState.spaceship.x, gameState.spaceship.y, gameState.spaceship.width, gameState.spaceship.height);
      
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(gameState.spaceship.x, gameState.spaceship.y, gameState.spaceship.width, gameState.spaceship.height);
    };

    const drawEnemies = () => {
      ctx.fillStyle = 'rgba(180, 180, 180, 0.5)';
      gameState.enemies.forEach(enemy => {
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        ctx.strokeStyle = 'rgba(180, 180, 180, 0.7)';
        ctx.lineWidth = 1;
        ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
      });
    };

    const drawMissiles = () => {
      ctx.fillStyle = 'rgba(0, 255, 204, 0.8)';
      gameState.missiles.forEach(missile => {
        ctx.fillRect(missile.x, missile.y, missile.width, missile.height);
        
        ctx.fillStyle = 'rgba(0, 255, 204, 0.2)';
        ctx.fillRect(missile.x - 1, missile.y + missile.height, missile.width + 2, 4);
        ctx.fillStyle = 'rgba(0, 255, 204, 0.8)';
      });
    };

    const drawExplosions = () => {
      gameState.explosions.forEach(explosion => {
        const progress = explosion.life / explosion.maxLife;
        const size = 8 * (1 - progress);
        const opacity = (1 - progress) * 0.6;
        
        ctx.fillStyle = `rgba(0, 255, 204, ${opacity})`;
        ctx.fillRect(explosion.x - size/2, explosion.y - size/2, size, size);
      });
    };

    const gameLoop = (currentTime: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      updateSpaceship();
      updateEnemies();
      updateMissiles();
      updateExplosions();
      spawnEnemy();
      spawnMissile(currentTime);
      checkCollisions();

      drawSpaceship();
      drawEnemies();
      drawMissiles();
      drawExplosions();

      requestAnimationFrame(gameLoop);
    };

    requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="star-defender-game"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        opacity: 0.25,
        pointerEvents: 'none',
      }}
    />
  );
};

export default StarDefenderGame;