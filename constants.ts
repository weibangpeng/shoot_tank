import { LevelConfig } from './types';

export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 768;

export const PLAYER_SIZE = 15;
export const PLAYER_SPEED = 5;
export const PLAYER_MAX_HP = 100;
export const FIRE_RATE = 150; // ms
export const BULLET_SPEED = 12;
export const INVULNERABILITY_TIME = 1000;

export const ENEMY_SIZE = 12;
export const BOSS_SIZE = 30;

export const COLORS = {
  player: '#00ffff', // Cyan
  playerHit: '#ffffff',
  enemy: '#ff0055', // Neon Red
  bullet: '#ffff00', // Yellow
  obstacle: '#333333',
  background: '#050505',
  grid: '#111111',
};

// Generate 10 levels with increasing difficulty
export const LEVELS: LevelConfig[] = Array.from({ length: 10 }, (_, i) => {
  const level = i + 1;
  return {
    level,
    enemyCount: 5 + (level * 3), // Level 1: 8, Level 10: 35
    spawnRate: Math.max(200, 2000 - (level * 150)), // Spawns get faster
    enemySpeedBase: 1.5 + (level * 0.2), // Speed increases
    obstacleCount: 3 + Math.floor(level / 2),
  };
});