import React, { useEffect, useRef } from 'react';
import { Player, Projectile, Enemy, Obstacle, Particle, Vector2, Keys } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from '../constants';

interface GameCanvasProps {
  gameStateRef: React.MutableRefObject<{
    player: Player;
    projectiles: Projectile[];
    enemies: Enemy[];
    particles: Particle[];
    obstacles: Obstacle[];
    mousePos: Vector2;
    mouseDown: boolean;
    keys: Keys;
  }>;
  onLoop: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameStateRef, onLoop }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);

  const draw = (ctx: CanvasRenderingContext2D) => {
    const state = gameStateRef.current;
    
    // Clear
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Grid (Cyberpunk feel)
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_WIDTH; x += 50) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += 50) {
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
    }
    ctx.stroke();

    // Draw Obstacles
    ctx.fillStyle = COLORS.obstacle;
    ctx.shadowBlur = 0;
    state.obstacles.forEach(obs => {
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      // Border for visibility
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    });

    // Draw Particles
    state.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    // Draw Projectiles
    ctx.shadowBlur = 10;
    ctx.shadowColor = COLORS.bullet;
    ctx.fillStyle = COLORS.bullet;
    state.projectiles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Enemies
    ctx.shadowBlur = 10;
    ctx.shadowColor = COLORS.enemy;
    ctx.fillStyle = COLORS.enemy;
    state.enemies.forEach(e => {
      ctx.beginPath();
      // Draw as diamond for variety
      ctx.moveTo(e.pos.x, e.pos.y - e.radius);
      ctx.lineTo(e.pos.x + e.radius, e.pos.y);
      ctx.lineTo(e.pos.x, e.pos.y + e.radius);
      ctx.lineTo(e.pos.x - e.radius, e.pos.y);
      ctx.closePath();
      ctx.fill();
      
      // Health bar above enemy
      const hpPct = e.hp / 20; // Rough calc based on base HP
      ctx.fillStyle = 'red';
      ctx.fillRect(e.pos.x - 10, e.pos.y - 20, 20, 4);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(e.pos.x - 10, e.pos.y - 20, Math.max(0, 20 * (e.hp/50)), 4); // Capped visualization
    });

    // Draw Player
    const player = state.player;
    ctx.shadowBlur = 15;
    ctx.shadowColor = COLORS.player;
    ctx.fillStyle = (player.invulnerableUntil > performance.now() && Math.floor(performance.now() / 100) % 2 === 0) 
        ? '#ffffff' 
        : COLORS.player;
    
    ctx.save();
    ctx.translate(player.pos.x, player.pos.y);
    // Rotate towards mouse
    const angle = Math.atan2(state.mousePos.y - player.pos.y, state.mousePos.x - player.pos.x);
    ctx.rotate(angle);
    
    // Draw Triangle Ship
    ctx.beginPath();
    ctx.moveTo(player.radius, 0);
    ctx.lineTo(-player.radius, player.radius/1.5);
    ctx.lineTo(-player.radius, -player.radius/1.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.shadowBlur = 0; // Reset
  };

  const loop = () => {
    onLoop(); // Physics update
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx);
    }
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [onLoop]);

  // Input Handlers
  const handleKeyDown = (e: KeyboardEvent) => {
    if (['w','a','s','d'].includes(e.key.toLowerCase())) {
        gameStateRef.current.keys[e.key.toLowerCase()] = true;
    }
  };
  const handleKeyUp = (e: KeyboardEvent) => {
    if (['w','a','s','d'].includes(e.key.toLowerCase())) {
        gameStateRef.current.keys[e.key.toLowerCase()] = false;
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
        gameStateRef.current.mousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
  };
  const handleMouseDown = () => { gameStateRef.current.mouseDown = true; };
  const handleMouseUp = () => { gameStateRef.current.mouseDown = false; };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="border-2 border-slate-700 rounded-lg bg-black cursor-crosshair shadow-2xl shadow-cyan-900/50"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    />
  );
};

export default GameCanvas;