import { useRef, useCallback, useEffect, useState } from 'react';
import { 
  Player, Projectile, Enemy, Obstacle, Particle, 
  GameStatus, Vector2, LevelConfig, Keys 
} from '../types';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_SIZE, PLAYER_SPEED, 
  PLAYER_MAX_HP, BULLET_SPEED, FIRE_RATE, ENEMY_SIZE, 
  COLORS, INVULNERABILITY_TIME 
} from '../constants';

// Helper: Check Circle-Rectangle Collision
const checkCircleRect = (circle: {pos: Vector2, radius: number}, rect: Obstacle) => {
  const distX = Math.abs(circle.pos.x - rect.x - rect.width / 2);
  const distY = Math.abs(circle.pos.y - rect.y - rect.height / 2);

  if (distX > (rect.width / 2 + circle.radius)) return false;
  if (distY > (rect.height / 2 + circle.radius)) return false;

  if (distX <= (rect.width / 2)) return true; 
  if (distY <= (rect.height / 2)) return true;

  const dx = distX - rect.width / 2;
  const dy = distY - rect.height / 2;
  return (dx * dx + dy * dy <= (circle.radius * circle.radius));
};

export const useGameEngine = () => {
  // We use refs for high-frequency game state to avoid React render cycles
  const gameStateRef = useRef({
    player: {
      id: 'player',
      pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
      velocity: { x: 0, y: 0 },
      radius: PLAYER_SIZE,
      color: COLORS.player,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      speed: PLAYER_SPEED,
      invulnerableUntil: 0
    } as Player,
    projectiles: [] as Projectile[],
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    obstacles: [] as Obstacle[],
    lastShotTime: 0,
    enemiesSpawned: 0,
    lastSpawnTime: 0,
    keys: { w: false, a: false, s: false, d: false } as Keys,
    mousePos: { x: 0, y: 0 },
    mouseDown: false,
    lastUiUpdate: 0,
  });

  // React state for UI updates only
  const [status, setStatus] = useState<GameStatus>(GameStatus.START_SCREEN);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [uiStats, setUiStats] = useState({ hp: 100, score: 0, remaining: 0 });

  const initLevel = useCallback((levelConfig: LevelConfig) => {
    const state = gameStateRef.current;
    
    // Reset Entity Positions
    state.player.pos = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
    state.player.hp = PLAYER_MAX_HP;
    state.player.invulnerableUntil = 0;
    state.projectiles = [];
    state.enemies = [];
    state.particles = [];
    state.enemiesSpawned = 0;
    state.lastUiUpdate = 0;
    
    // Generate Obstacles
    state.obstacles = [];
    for (let i = 0; i < levelConfig.obstacleCount; i++) {
      let valid = false;
      while (!valid) {
        const w = 50 + Math.random() * 100;
        const h = 50 + Math.random() * 100;
        const x = Math.random() * (CANVAS_WIDTH - w);
        const y = Math.random() * (CANVAS_HEIGHT - h);
        
        // Ensure not too close to center (player spawn)
        const distToCenter = Math.hypot(x + w/2 - CANVAS_WIDTH/2, y + h/2 - CANVAS_HEIGHT/2);
        
        if (distToCenter > 200) {
          state.obstacles.push({ id: `obs-${i}`, x, y, width: w, height: h });
          valid = true;
        }
      }
    }
    
    setUiStats(prev => ({ ...prev, hp: 100, remaining: levelConfig.enemyCount }));
  }, []);

  const spawnEnemy = (levelConfig: LevelConfig) => {
    const state = gameStateRef.current;
    if (state.enemiesSpawned >= levelConfig.enemyCount) return;

    // Spawn away from player
    let x, y;
    if (Math.random() < 0.5) {
      x = Math.random() < 0.5 ? -20 : CANVAS_WIDTH + 20;
      y = Math.random() * CANVAS_HEIGHT;
    } else {
      x = Math.random() * CANVAS_WIDTH;
      y = Math.random() < 0.5 ? -20 : CANVAS_HEIGHT + 20;
    }

    state.enemies.push({
      id: `enemy-${Date.now()}-${Math.random()}`,
      pos: { x, y },
      radius: ENEMY_SIZE,
      color: COLORS.enemy,
      hp: 20 + (levelConfig.level * 5),
      speed: levelConfig.enemySpeedBase + (Math.random() * 0.5),
      type: 'drone'
    });
    state.enemiesSpawned++;
  };

  const createParticles = (x: number, y: number, color: string, count: number) => {
    const state = gameStateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3;
      state.particles.push({
        id: `p-${Math.random()}`,
        pos: { x, y },
        radius: Math.random() * 3 + 1,
        color: color,
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: 1.0, // Alpha value
        maxLife: 1.0
      });
    }
  };

  const update = useCallback((dt: number, levelConfig: LevelConfig) => {
    if (status !== GameStatus.PLAYING) return;

    const state = gameStateRef.current;
    const now = performance.now();

    // --- Player Movement ---
    let dx = 0;
    let dy = 0;
    if (state.keys.w) dy -= 1;
    if (state.keys.s) dy += 1;
    if (state.keys.a) dx -= 1;
    if (state.keys.d) dx += 1;

    // Normalize diagonal
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
    }

    const nextX = state.player.pos.x + dx * state.player.speed;
    const nextY = state.player.pos.y + dy * state.player.speed;

    // Check Wall & Obstacle Collision for Player
    let canMoveX = true;
    let canMoveY = true;
    
    // Canvas Bounds
    if (nextX < state.player.radius || nextX > CANVAS_WIDTH - state.player.radius) canMoveX = false;
    if (nextY < state.player.radius || nextY > CANVAS_HEIGHT - state.player.radius) canMoveY = false;

    // Obstacles
    for (const obs of state.obstacles) {
      if (checkCircleRect({ pos: { x: nextX, y: state.player.pos.y }, radius: state.player.radius }, obs)) canMoveX = false;
      if (checkCircleRect({ pos: { x: state.player.pos.x, y: nextY }, radius: state.player.radius }, obs)) canMoveY = false;
    }

    if (canMoveX) state.player.pos.x = nextX;
    if (canMoveY) state.player.pos.y = nextY;

    // --- Shooting ---
    if (state.mouseDown && now - state.lastShotTime > FIRE_RATE) {
      const angle = Math.atan2(state.mousePos.y - state.player.pos.y, state.mousePos.x - state.player.pos.x);
      state.projectiles.push({
        id: `proj-${now}`,
        pos: { ...state.player.pos },
        radius: 3,
        color: COLORS.bullet,
        velocity: { x: Math.cos(angle) * BULLET_SPEED, y: Math.sin(angle) * BULLET_SPEED },
        damage: 10,
        isEnemy: false
      });
      state.lastShotTime = now;
    }

    // --- Projectiles Update ---
    state.projectiles.forEach(p => {
      p.pos.x += p.velocity.x;
      p.pos.y += p.velocity.y;
      
      // Cleanup out of bounds
      if (p.pos.x < 0 || p.pos.x > CANVAS_WIDTH || p.pos.y < 0 || p.pos.y > CANVAS_HEIGHT) {
        p.markedForDeletion = true;
      }
      // Cleanup obstacle hits
      for (const obs of state.obstacles) {
        if (checkCircleRect(p, obs)) {
          p.markedForDeletion = true;
          createParticles(p.pos.x, p.pos.y, COLORS.obstacle, 3);
        }
      }
    });

    // --- Spawning Enemies ---
    if (now - state.lastSpawnTime > levelConfig.spawnRate && state.enemiesSpawned < levelConfig.enemyCount) {
      spawnEnemy(levelConfig);
      state.lastSpawnTime = now;
    }

    // --- Enemies Update ---
    state.enemies.forEach(enemy => {
      // Move towards player
      const angle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
      const vx = Math.cos(angle) * enemy.speed;
      const vy = Math.sin(angle) * enemy.speed;

      // Simple obstacle collision for enemies (slide or stop)
      let nextEx = enemy.pos.x + vx;
      let nextEy = enemy.pos.y + vy;
      
      let eCanMoveX = true;
      let eCanMoveY = true;
      for (const obs of state.obstacles) {
        if (checkCircleRect({ pos: { x: nextEx, y: enemy.pos.y }, radius: enemy.radius }, obs)) eCanMoveX = false;
        if (checkCircleRect({ pos: { x: enemy.pos.x, y: nextEy }, radius: enemy.radius }, obs)) eCanMoveY = false;
      }
      
      if (eCanMoveX) enemy.pos.x = nextEx;
      if (eCanMoveY) enemy.pos.y = nextEy;

      // Player Collision
      const distToPlayer = Math.hypot(state.player.pos.x - enemy.pos.x, state.player.pos.y - enemy.pos.y);
      if (distToPlayer < state.player.radius + enemy.radius) {
         if (now > state.player.invulnerableUntil) {
           state.player.hp -= 10;
           state.player.invulnerableUntil = now + INVULNERABILITY_TIME;
           createParticles(state.player.pos.x, state.player.pos.y, COLORS.playerHit, 10);
           
           if (state.player.hp <= 0) {
             setStatus(GameStatus.GAME_OVER);
           }
         }
      }

      // Projectile Collision
      state.projectiles.forEach(p => {
        if (p.isEnemy) return;
        const distToBullet = Math.hypot(p.pos.x - enemy.pos.x, p.pos.y - enemy.pos.y);
        if (distToBullet < enemy.radius + p.radius) {
          enemy.hp -= p.damage;
          p.markedForDeletion = true;
          createParticles(p.pos.x, p.pos.y, COLORS.bullet, 2);
          
          if (enemy.hp <= 0 && !enemy.markedForDeletion) {
            enemy.markedForDeletion = true;
            createParticles(enemy.pos.x, enemy.pos.y, COLORS.enemy, 8);
            setUiStats(prev => ({ ...prev, score: prev.score + 10 }));
          }
        }
      });
    });

    // --- Particles Update ---
    state.particles.forEach(p => {
      p.pos.x += p.velocity.x;
      p.pos.y += p.velocity.y;
      p.life -= 0.05;
      if (p.life <= 0) p.markedForDeletion = true;
    });

    // --- Cleanup ---
    state.projectiles = state.projectiles.filter(p => !p.markedForDeletion);
    state.enemies = state.enemies.filter(e => !e.markedForDeletion);
    state.particles = state.particles.filter(p => !p.markedForDeletion);

    // --- Level Progression ---
    const remainingEnemies = (levelConfig.enemyCount - state.enemiesSpawned) + state.enemies.length;
    
    // Throttle UI Updates (every 100ms) to avoid React churn
    if (now - state.lastUiUpdate > 100) { 
        setUiStats(prev => ({
            ...prev,
            hp: state.player.hp,
            remaining: remainingEnemies
        }));
        state.lastUiUpdate = now;
    }

    if (state.enemiesSpawned >= levelConfig.enemyCount && state.enemies.length === 0) {
        if (currentLevelIdx >= 9) {
            setStatus(GameStatus.VICTORY);
        } else {
            setStatus(GameStatus.LEVEL_COMPLETE);
        }
    }

  }, [status, currentLevelIdx]);

  return {
    gameStateRef,
    status,
    setStatus,
    currentLevelIdx,
    setCurrentLevelIdx,
    uiStats,
    initLevel,
    update
  };
};