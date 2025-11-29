
import { LevelConfig } from './types';

export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 768;

export const PLAYER_SIZE = 20; // Slightly larger for tank
export const PLAYER_SPEED = 4;
export const PLAYER_MAX_HP = 150; // Buffed HP for tank
export const INVULNERABILITY_TIME = 1000;

// Weapons
export const CANNON_COOLDOWN = 1000; // 1 second
export const CANNON_DAMAGE = 50;
export const CANNON_SPEED = 15;
export const CANNON_SIZE = 8;

export const MG_COOLDOWN = 100; // Fast fire
export const MG_DAMAGE = 8;
export const MG_SPEED = 18;
export const MG_SIZE = 3;

// Enemies
export const ENEMY_SIZE = 15;
export const TURRET_SIZE = 20;
export const AGGRO_RANGE = 500;
export const TURRET_FIRE_RATE = 2000;
export const TURRET_RANGE = 400;

export const COLORS = {
  player: '#00ffff', // Cyan
  playerBody: '#008888',
  playerTurret: '#00ffff',
  playerHit: '#ffffff',
  enemy: '#ff0055', // Neon Red
  enemySleep: '#550022',
  turretBase: '#330011',
  turretGun: '#ff0055',
  bulletMG: '#ffff00', // Yellow
  bulletCannon: '#ff8800', // Orange
  bulletEnemy: '#ff0000', // Red
  obstacle: '#333333',
  background: '#050505',
  grid: '#111111',
  gateClosed: '#550000',
  gateOpen: '#00ff00',
};

// Generate 10 levels with increasing difficulty and height
export const LEVELS: LevelConfig[] = Array.from({ length: 10 }, (_, i) => {
  const level = i + 1;
  return {
    level,
    enemyCount: 8 + (level * 4), 
    spawnRate: 0, 
    enemySpeedBase: 1.5 + (level * 0.2), 
    obstacleCount: 8 + (level * 2),
    worldHeight: 2000 + (level * 300), 
  };
});
