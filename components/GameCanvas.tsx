
import React, { useEffect, useRef } from 'react';
import { Player, Projectile, Enemy, Obstacle, Particle, Vector2, Keys, Gate } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, PLAYER_SIZE } from '../constants';

interface GameCanvasProps {
  gameStateRef: React.MutableRefObject<{
    player: Player;
    projectiles: Projectile[];
    enemies: Enemy[];
    particles: Particle[];
    obstacles: Obstacle[];
    gate: Gate;
    camera: Vector2;
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
    
    // 1. Clear Screen (Viewport)
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Apply Camera Transform
    ctx.save();
    ctx.translate(-state.camera.x, -state.camera.y);

    // --- DRAWING IN WORLD COORDINATES START ---

    // Draw Grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_WIDTH; x += 50) {
      ctx.moveTo(x, state.camera.y);
      ctx.lineTo(x, state.camera.y + CANVAS_HEIGHT);
    }
    const startY = Math.floor(state.camera.y / 50) * 50;
    const endY = startY + CANVAS_HEIGHT + 50;
    for (let y = startY; y <= endY; y += 50) {
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
    }
    ctx.stroke();

    // Draw Gate
    const enemiesRemaining = state.enemies.length;
    ctx.shadowBlur = 20;
    ctx.shadowColor = enemiesRemaining === 0 ? COLORS.gateOpen : COLORS.gateClosed;
    ctx.fillStyle = enemiesRemaining === 0 ? 'rgba(0, 255, 0, 0.2)' : 'rgba(85, 0, 0, 0.2)';
    ctx.strokeStyle = enemiesRemaining === 0 ? COLORS.gateOpen : COLORS.gateClosed;
    ctx.lineWidth = 4;
    
    ctx.fillRect(state.gate.x, state.gate.y, state.gate.width, state.gate.height);
    ctx.strokeRect(state.gate.x, state.gate.y, state.gate.width, state.gate.height);
    
    // Gate Label
    ctx.fillStyle = enemiesRemaining === 0 ? '#fff' : '#aaa';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(enemiesRemaining === 0 ? "EXTRACTION OPEN" : "LOCKDOWN ACTIVE", state.gate.x + state.gate.width/2, state.gate.y - 10);


    // Draw Obstacles
    ctx.fillStyle = COLORS.obstacle;
    ctx.shadowBlur = 0;
    state.obstacles.forEach(obs => {
      if (obs.y + obs.height < state.camera.y || obs.y > state.camera.y + CANVAS_HEIGHT) return;
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
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
    state.projectiles.forEach(p => {
      ctx.shadowBlur = p.type === 'cannon' ? 15 : 5;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Enemies
    state.enemies.forEach(e => {
      if (e.pos.y + e.radius < state.camera.y || e.pos.y - e.radius > state.camera.y + CANVAS_HEIGHT) return;

      if (e.type === 'turret') {
         // TURRET RENDER
         ctx.save();
         ctx.translate(e.pos.x, e.pos.y);
         
         // Base
         ctx.shadowBlur = 0;
         ctx.fillStyle = COLORS.turretBase;
         ctx.fillRect(-e.radius, -e.radius, e.radius*2, e.radius*2);
         ctx.strokeStyle = COLORS.enemy;
         ctx.strokeRect(-e.radius, -e.radius, e.radius*2, e.radius*2);

         // Rotating Gun
         ctx.rotate(e.rotation);
         ctx.fillStyle = COLORS.turretGun;
         ctx.shadowBlur = 10;
         ctx.shadowColor = COLORS.turretGun;
         ctx.fillRect(0, -5, e.radius + 5, 10); // Barrel
         ctx.beginPath();
         ctx.arc(0, 0, e.radius/1.5, 0, Math.PI*2); // Pivot
         ctx.fill();

         ctx.restore();

      } else {
         // DRONE RENDER
         ctx.shadowBlur = 10;
         ctx.shadowColor = e.active ? COLORS.enemy : COLORS.enemySleep;
         ctx.fillStyle = e.active ? COLORS.enemy : COLORS.enemySleep;
         
         ctx.beginPath();
         ctx.moveTo(e.pos.x, e.pos.y - e.radius);
         ctx.lineTo(e.pos.x + e.radius, e.pos.y);
         ctx.lineTo(e.pos.x, e.pos.y + e.radius);
         ctx.lineTo(e.pos.x - e.radius, e.pos.y);
         ctx.closePath();
         ctx.fill();
      }
      
      // HP Bar
      if (e.hp < (e.type === 'turret' ? 40 : 20)) {
        ctx.fillStyle = 'red';
        ctx.fillRect(e.pos.x - 10, e.pos.y - 20, 20, 4);
        ctx.fillStyle = '#0f0';
        const maxHp = e.type === 'turret' ? 50 : 25; // Approximate
        ctx.fillRect(e.pos.x - 10, e.pos.y - 20, Math.max(0, 20 * (e.hp/maxHp)), 4);
      }
    });

    // Draw Player (Tank)
    const player = state.player;
    ctx.shadowBlur = 15;
    ctx.shadowColor = COLORS.player;
    
    const isFlashing = (player.invulnerableUntil > performance.now() && Math.floor(performance.now() / 100) % 2 === 0);
    
    ctx.save();
    ctx.translate(player.pos.x, player.pos.y);

    // 1. Draw Chassis (Rotated by Movement)
    ctx.save();
    ctx.rotate(player.chassisRotation);
    ctx.fillStyle = isFlashing ? '#ffffff' : COLORS.playerBody;
    // Main Body Rect
    ctx.fillRect(-PLAYER_SIZE, -PLAYER_SIZE + 5, PLAYER_SIZE * 2, PLAYER_SIZE * 1.5); // Wider track base
    // Tracks
    ctx.fillStyle = '#111';
    ctx.fillRect(-PLAYER_SIZE - 4, -PLAYER_SIZE + 5, 4, PLAYER_SIZE * 1.5);
    ctx.fillRect(PLAYER_SIZE, -PLAYER_SIZE + 5, 4, PLAYER_SIZE * 1.5);
    
    // Main Cannon (Fixed to Chassis)
    ctx.fillStyle = isFlashing ? '#ffffff' : '#00aaaa';
    ctx.fillRect(0, -5, PLAYER_SIZE + 10, 10); // Barrel sticking out front
    ctx.restore();

    // 2. Draw Turret (Rotated by Mouse)
    ctx.save();
    ctx.rotate(player.turretRotation);
    ctx.fillStyle = isFlashing ? '#ffffff' : COLORS.playerTurret;
    // Turret Circle
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_SIZE / 1.5, 0, Math.PI * 2);
    ctx.fill();
    // MG Barrel
    ctx.fillRect(0, -2, PLAYER_SIZE + 2, 4);
    ctx.restore();

    ctx.restore();

    // --- DRAWING IN WORLD COORDINATES END ---
    ctx.restore(); 
    
    // 3. Draw HUD Indicators
    if (state.gate.y < state.camera.y) {
       const dist = Math.floor((player.pos.y - state.gate.y) / 10);
       ctx.fillStyle = '#fff';
       ctx.font = '12px monospace';
       ctx.fillText(`GATE: ${dist}m`, CANVAS_WIDTH / 2, 20);
    }
  };

  const loop = () => {
    onLoop();
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
    const key = e.key.toLowerCase();
    if (['w','a','s','d', ' '].includes(key)) {
        gameStateRef.current.keys[key] = true;
    }
  };
  const handleKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (['w','a','s','d', ' '].includes(key)) {
        gameStateRef.current.keys[key] = false;
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        gameStateRef.current.mousePos = {
            x: screenX,
            y: screenY + gameStateRef.current.camera.y
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
