export type Vector2 = { x: number; y: number };

export enum GameStatus {
  START_SCREEN,
  BRIEFING,
  PLAYING,
  LEVEL_COMPLETE,
  GAME_OVER,
  VICTORY
}

export interface Entity {
  id: string;
  pos: Vector2;
  radius: number;
  color: string;
  markedForDeletion?: boolean;
}

export interface Player extends Entity {
  velocity: Vector2;
  hp: number;
  maxHp: number;
  speed: number;
  invulnerableUntil: number;
}

export interface Enemy extends Entity {
  hp: number;
  speed: number;
  type: 'drone' | 'charger' | 'boss';
}

export interface Projectile extends Entity {
  velocity: Vector2;
  damage: number;
  isEnemy: boolean;
}

export interface Particle extends Entity {
  velocity: Vector2;
  life: number;
  maxLife: number;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Keys {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  [key: string]: boolean;
}

export interface LevelConfig {
  level: number;
  enemyCount: number;
  spawnRate: number; // ms between spawns
  enemySpeedBase: number;
  obstacleCount: number;
}