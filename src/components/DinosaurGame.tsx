
import { useEffect, useRef } from 'react';

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Dino extends GameObject {
  dy: number;
  isJumping: boolean;
  isDucking: boolean;
}

interface Obstacle extends GameObject {
  type: 'cactus' | 'bird';
}

const DinosaurGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef({
    dino: { x: 50, y: 150, width: 20, height: 20, dy: 0, isJumping: false, isDucking: false } as Dino,
    obstacles: [] as Obstacle[],
    gameSpeed: 2,
    score: 0,
    groundY: 170,
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
    gameState.groundY = canvas.height - 50;
    gameState.dino.y = gameState.groundY - gameState.dino.height;

    const gravity = 0.5;
    const jumpPower = -12;

    const spawnObstacle = () => {
      if (Math.random() < 0.005) {
        const type = Math.random() < 0.7 ? 'cactus' : 'bird';
        const obstacle: Obstacle = {
          x: canvas.width,
          y: type === 'cactus' ? gameState.groundY - 15 : gameState.groundY - 40,
          width: type === 'cactus' ? 15 : 20,
          height: type === 'cactus' ? 15 : 15,
          type
        };
        gameState.obstacles.push(obstacle);
      }
    };

    const updateDino = () => {
      // Apply gravity
      if (gameState.dino.isJumping) {
        gameState.dino.dy += gravity;
        gameState.dino.y += gameState.dino.dy;

        if (gameState.dino.y >= gameState.groundY - gameState.dino.height) {
          gameState.dino.y = gameState.groundY - gameState.dino.height;
          gameState.dino.isJumping = false;
          gameState.dino.dy = 0;
        }
      }
    };

    const updateObstacles = () => {
      gameState.obstacles = gameState.obstacles.filter(obstacle => {
        obstacle.x -= gameState.gameSpeed;
        return obstacle.x > -obstacle.width;
      });
    };

    const drawDino = () => {
      ctx.fillStyle = '#333333';
      ctx.fillRect(gameState.dino.x, gameState.dino.y, gameState.dino.width, gameState.dino.height);
    };

    const drawObstacles = () => {
      ctx.fillStyle = '#444444';
      gameState.obstacles.forEach(obstacle => {
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      });
    };

    const drawGround = () => {
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, gameState.groundY);
      ctx.lineTo(canvas.width, gameState.groundY);
      ctx.stroke();
    };

    const gameLoop = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update game objects
      updateDino();
      updateObstacles();
      spawnObstacle();

      // Draw everything
      drawGround();
      drawDino();
      drawObstacles();

      // Continue the loop
      requestAnimationFrame(gameLoop);
    };

    // Auto-jump for background effect
    const autoJump = () => {
      if (!gameState.dino.isJumping && Math.random() < 0.003) {
        gameState.dino.isJumping = true;
        gameState.dino.dy = jumpPower;
      }
    };

    const gameLoopWithAutoJump = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update game objects
      updateDino();
      updateObstacles();
      spawnObstacle();
      autoJump();

      // Draw everything
      drawGround();
      drawDino();
      drawObstacles();

      // Continue the loop
      requestAnimationFrame(gameLoopWithAutoJump);
    };

    // Start the game loop
    gameLoopWithAutoJump();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="dino-game"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        opacity: 0.15,
        pointerEvents: 'none',
      }}
    />
  );
};

export default DinosaurGame;
