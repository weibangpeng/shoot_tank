
import { useRef, useCallback, useState } from 'react';
import { 
  Player, Projectile, Enemy, Obstacle, Particle, Gate,
  GameStatus, Vector2, LevelConfig, Keys 
} from '../types';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_SIZE, PLAYER_SPEED, 
  PLAYER_MAX_HP, COLORS, INVULNERABILITY_TIME, AGGRO_RANGE,
  CANNON_COOLDOWN, CANNON_DAMAGE, CANNON_SPEED, CANNON_SIZE,
  MG_COOLDOWN, MG_DAMAGE, MG_SPEED, MG_SIZE,
  TURRET_SIZE, TURRET_FIRE_RATE, TURRET_RANGE, ENEMY_SIZE
} from '../constants';

// Helper: Check Circle-Rectangle Collision
const checkCircleRect = (circle: {pos: Vector2, radius: number}, rect: {x: number, y: number, width: number, height: number}) => {
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
      invulnerableUntil: 0,
      chassisRotation: -Math.PI / 2, // Facing up
      turretRotation: -Math.PI / 2,
      cannonCooldown: 0,
      mgCooldown: 0
    } as Player,
    projectiles: [] as Projectile[],
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    obstacles: [] as Obstacle[],
    gate: { x: 0, y: 0, width: 200, height: 50, active: false } as Gate,
    camera: { x: 0, y: 0 },
    worldHeight: CANVAS_HEIGHT,
    keys: { w: false, a: false, s: false, d: false, " ": false } as Keys,
    mousePos: { x: 0, y: 0 }, // In WORLD coordinates
    mouseDown: false,
    lastUiUpdate: 0,
  });

  const [status, setStatus] = useState<GameStatus>(GameStatus.START_SCREEN);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [uiStats, setUiStats] = useState({ hp: 100, score: 0, remaining: 0, gateOpen: false });

  const initLevel = useCallback((levelConfig: LevelConfig) => {
    const state = gameStateRef.current;
    
    // Set World Dimensions
    state.worldHeight = levelConfig.worldHeight;
    
    // Spawn Player at Bottom
    state.player.pos = { x: CANVAS_WIDTH / 2, y: state.worldHeight - 150 };
    state.player.hp = PLAYER_MAX_HP;
    state.player.invulnerableUntil = 0;
    state.player.chassisRotation = -Math.PI / 2;
    state.player.turretRotation = -Math.PI / 2;
    
    // Reset Camera to focus on player initially (clamped to bottom)
    state.camera.y = state.worldHeight - CANVAS_HEIGHT;

    // Reset Entities
    state.projectiles = [];
    state.enemies = [];
    state.particles = [];
    state.lastUiUpdate = 0;
    
    // Setup Gate at Top
    state.gate = {
      x: CANVAS_WIDTH / 2 - 100,
      y: 50, // Near the top
      width: 200,
      height: 40,
      active: false
    };

    // Generate Obstacles (Distributed vertically)
    state.obstacles = [];
    for (let i = 0; i < levelConfig.obstacleCount; i++) {
      let valid = false;
      while (!valid) {
        const w = 60 + Math.random() * 100;
        const h = 60 + Math.random() * 100;
        const x = Math.random() * (CANVAS_WIDTH - w);
        // Distribute from top (near gate) to near bottom, avoiding spawn
        const y = 200 + Math.random() * (state.worldHeight - 500);
        
        state.obstacles.push({ id: `obs-${i}`, x, y, width: w, height: h });
        valid = true;
      }
    }

    // Pre-spawn Enemies (Distributed vertically)
    for (let i = 0; i < levelConfig.enemyCount; i++) {
        let valid = false;
        while (!valid) {
            const x = 50 + Math.random() * (CANVAS_WIDTH - 100);
            // Spawn mainly between gate and player start
            const y = 200 + Math.random() * (state.worldHeight - 500);
            
            // Don't spawn inside obstacles
            let inObstacle = false;
            for (const obs of state.obstacles) {
                if (checkCircleRect({pos: {x, y}, radius: ENEMY_SIZE + 5}, obs)) {
                    inObstacle = true;
                    break;
                }
            }

            if (!inObstacle) {
                // Determine Enemy Type
                const isTurret = Math.random() < 0.3; // 30% chance for turret
                
                state.enemies.push({
                    id: `enemy-${i}`,
                    pos: { x, y },
                    radius: isTurret ? TURRET_SIZE : ENEMY_SIZE,
                    color: COLORS.enemy,
                    hp: 20 + (levelConfig.level * 5),
                    speed: isTurret ? 0 : levelConfig.enemySpeedBase + (Math.random() * 0.5),
                    type: isTurret ? 'turret' : 'drone',
                    active: false,
                    rotation: 0,
                    lastShotTime: 0
                });
                valid = true;
            }
        }
    }
    
    setUiStats(prev => ({ ...prev, hp: 100, remaining: levelConfig.enemyCount, gateOpen: false }));
  }, []);

  const createParticles = (x: number, y: number, color: string, count: number, speedMultiplier: number = 1) => {
    const state = gameStateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 * speedMultiplier;
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

    // --- Player Movement & Chassis Rotation ---
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
      
      // Update Chassis Rotation to face movement direction
      state.player.chassisRotation = Math.atan2(dy, dx);
    }

    const nextX = state.player.pos.x + dx * state.player.speed;
    const nextY = state.player.pos.y + dy * state.player.speed;

    // Check Wall & Obstacle Collision for Player
    let canMoveX = true;
    let canMoveY = true;
    
    // World Bounds (Vertical strip)
    if (nextX < state.player.radius || nextX > CANVAS_WIDTH - state.player.radius) canMoveX = false;
    if (nextY < state.player.radius || nextY > state.worldHeight - state.player.radius) canMoveY = false;

    // Obstacles
    for (const obs of state.obstacles) {
      if (checkCircleRect({ pos: { x: nextX, y: state.player.pos.y }, radius: state.player.radius }, obs)) canMoveX = false;
      if (checkCircleRect({ pos: { x: state.player.pos.x, y: nextY }, radius: state.player.radius }, obs)) canMoveY = false;
    }

    if (canMoveX) state.player.pos.x = nextX;
    if (canMoveY) state.player.pos.y = nextY;

    // --- Turret Rotation (Mouse Aim) ---
    state.player.turretRotation = Math.atan2(
        state.mousePos.y - state.player.pos.y, 
        state.mousePos.x - state.player.pos.x
    );

    // --- Camera Update ---
    // Center vertically on player, but clamp to world bounds
    let targetCamY = state.player.pos.y - CANVAS_HEIGHT / 2;
    // Clamp
    targetCamY = Math.max(0, Math.min(targetCamY, state.worldHeight - CANVAS_HEIGHT));
    state.camera.y = targetCamY;


    // --- Shooting: Machine Gun (Mouse Left Click) ---
    if (state.mouseDown && now > state.player.mgCooldown) {
      const angle = state.player.turretRotation;
      const muzzleX = state.player.pos.x + Math.cos(angle) * (PLAYER_SIZE + 5);
      const muzzleY = state.player.pos.y + Math.sin(angle) * (PLAYER_SIZE + 5);

      state.projectiles.push({
        id: `mg-${now}`,
        pos: { x: muzzleX, y: muzzleY },
        radius: MG_SIZE,
        color: COLORS.bulletMG,
        velocity: { x: Math.cos(angle) * MG_SPEED, y: Math.sin(angle) * MG_SPEED },
        damage: MG_DAMAGE,
        isEnemy: false,
        type: 'mg'
      });
      state.player.mgCooldown = now + MG_COOLDOWN;
    }

    // --- Shooting: Main Cannon (Spacebar) ---
    if (state.keys[' '] && now > state.player.cannonCooldown) {
      const angle = state.player.chassisRotation;
      const muzzleX = state.player.pos.x + Math.cos(angle) * (PLAYER_SIZE + 8);
      const muzzleY = state.player.pos.y + Math.sin(angle) * (PLAYER_SIZE + 8);

      state.projectiles.push({
        id: `cannon-${now}`,
        pos: { x: muzzleX, y: muzzleY },
        radius: CANNON_SIZE,
        color: COLORS.bulletCannon,
        velocity: { x: Math.cos(angle) * CANNON_SPEED, y: Math.sin(angle) * CANNON_SPEED },
        damage: CANNON_DAMAGE,
        isEnemy: false,
        type: 'cannon'
      });
      
      // Recoil effect (visual only for now, maybe small kickback)
      createParticles(muzzleX, muzzleY, '#ffaa00', 5, 2);
      
      state.player.cannonCooldown = now + CANNON_COOLDOWN;
    }

    // --- Projectiles Update ---
    state.projectiles.forEach(p => {
      p.pos.x += p.velocity.x;
      p.pos.y += p.velocity.y;
      
      // Cleanup out of bounds
      if (p.pos.x < 0 || p.pos.x > CANVAS_WIDTH || p.pos.y < 0 || p.pos.y > state.worldHeight) {
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

    // --- Enemies Update ---
    state.enemies.forEach(enemy => {
      const distToPlayer = Math.hypot(state.player.pos.x - enemy.pos.x, state.player.pos.y - enemy.pos.y);
      
      // Aggro Logic
      if (!enemy.active && distToPlayer < AGGRO_RANGE) {
          enemy.active = true;
      }

      if (enemy.active) {
        if (enemy.type === 'turret') {
            // Turret Logic: Rotate to player, Shoot if in range
            enemy.rotation = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
            
            if (distToPlayer < TURRET_RANGE && (!enemy.lastShotTime || now - enemy.lastShotTime > TURRET_FIRE_RATE)) {
                 const angle = enemy.rotation;
                 state.projectiles.push({
                    id: `turret-shot-${now}-${Math.random()}`,
                    pos: { x: enemy.pos.x + Math.cos(angle)*20, y: enemy.pos.y + Math.sin(angle)*20 },
                    radius: 5,
                    color: COLORS.bulletEnemy,
                    velocity: { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8 },
                    damage: 15,
                    isEnemy: true,
                    type: 'enemy'
                 });
                 enemy.lastShotTime = now;
            }

        } else {
            // Drone Logic: Chase
            const angle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
            const vx = Math.cos(angle) * enemy.speed;
            const vy = Math.sin(angle) * enemy.speed;

            // Simple obstacle collision for enemies
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
        }
      }

      // Player Collision (Contact Damage)
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

      // Projectile Collision (Player hitting Enemy)
      state.projectiles.forEach(p => {
        if (p.isEnemy) return; // Enemy bullets don't hit enemies
        const distToBullet = Math.hypot(p.pos.x - enemy.pos.x, p.pos.y - enemy.pos.y);
        if (distToBullet < enemy.radius + p.radius) {
          enemy.hp -= p.damage;
          p.markedForDeletion = true;
          
          if (p.type === 'cannon') {
               createParticles(p.pos.x, p.pos.y, '#ffaa00', 12, 1.5); // Big explosion
          } else {
               createParticles(p.pos.x, p.pos.y, COLORS.bulletMG, 2);
          }
          
          // Wake up enemy if shot
          if (!enemy.active) enemy.active = true;

          if (enemy.hp <= 0 && !enemy.markedForDeletion) {
            enemy.markedForDeletion = true;
            createParticles(enemy.pos.x, enemy.pos.y, COLORS.enemy, 8);
            setUiStats(prev => ({ ...prev, score: prev.score + (enemy.type === 'turret' ? 25 : 10) }));
          }
        }
      });
    });

    // Enemy Projectiles hitting Player
    state.projectiles.forEach(p => {
        if (!p.isEnemy) return;
        const distToPlayer = Math.hypot(p.pos.x - state.player.pos.x, p.pos.y - state.player.pos.y);
        
        if (distToPlayer < state.player.radius + p.radius) {
             if (now > state.player.invulnerableUntil) {
                state.player.hp -= p.damage;
                state.player.invulnerableUntil = now + INVULNERABILITY_TIME;
                createParticles(state.player.pos.x, state.player.pos.y, COLORS.playerHit, 10);
                p.markedForDeletion = true;
                
                if (state.player.hp <= 0) {
                    setStatus(GameStatus.GAME_OVER);
                }
             }
        }
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

    // --- Game Logic ---
    const remainingEnemies = state.enemies.length;
    const gateOpen = remainingEnemies === 0;
    
    // Check Gate Win Condition
    if (checkCircleRect(state.player, state.gate)) {
        if (gateOpen) {
            if (currentLevelIdx >= 9) {
                setStatus(GameStatus.VICTORY);
            } else {
                setStatus(GameStatus.LEVEL_COMPLETE);
            }
        }
    }
    
    // Throttle UI Updates
    if (now - state.lastUiUpdate > 100) { 
        setUiStats(prev => ({
            ...prev,
            hp: state.player.hp,
            remaining: remainingEnemies,
            gateOpen: gateOpen
        }));
        state.lastUiUpdate = now;
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
