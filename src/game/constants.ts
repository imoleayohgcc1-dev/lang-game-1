export type GameState = 'LOADING' | 'READY' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type PlayerState = 'RUNNING' | 'LANE_CHANGING' | 'JUMPING' | 'FALLING' | 'SLIDING' | 'DEAD';

export type ObstacleType = 'LOW' | 'HIGH' | 'BLOCKING' | 'MOVING_BARRIER';

export type EnemyType = 'BASIC' | 'FAST' | 'ARMORED';

export type PowerUpType = 'MAGNET' | 'SHIELD' | 'COIN_MULTIPLIER';

export type EnvironmentTheme = 'CITY' | 'TROPICAL' | 'CYBERPUNK';

export type DayNightMode = 'DAY' | 'NIGHT';

export type GraphicsQuality = 'LOW' | 'MEDIUM' | 'HIGH';

export interface GameSettings {
  musicEnabled: boolean;
  soundEnabled: boolean;
  graphicsQuality: GraphicsQuality;
  theme: EnvironmentTheme;
  dayNight: DayNightMode;
  controlSensitivity: number; // 1.0 = normal, 1.3 = fast
}

export const DEFAULT_SETTINGS: GameSettings = {
  musicEnabled: true,
  soundEnabled: true,
  graphicsQuality: 'MEDIUM',
  theme: 'CYBERPUNK',
  dayNight: 'NIGHT',
  controlSensitivity: 1.0,
};

export const GAME_CONFIG = {
  TITLE: 'LANGUAGE RUNNER',
  SUBTITLE: 'Run. Learn. Speak.',
  VERSION: '0.4.0-phase4',

  // Gameplay & Physics
  BASE_SPEED: 18.0, // units per second
  MAX_SPEED: 34.0,
  SPEED_ACCELERATION: 0.12, // speed increase per 100 meters
  LANES: [-3.2, 0, 3.2] as const, // Left, Center, Right X coordinates
  LANE_SWITCH_SPEED: 15.0, // horizontal lerp speed
  
  // Jump Kinematics
  JUMP_VELOCITY: 11.5, // initial upward velocity
  GRAVITY: -28.0, // downward gravitational acceleration
  MAX_JUMP_HEIGHT: 2.4,

  // Slide Kinematics
  SLIDE_DURATION: 0.72, // seconds
  PLAYER_NORMAL_HEIGHT: 2.0,
  PLAYER_SLIDE_HEIGHT: 0.75,

  // Power-Up System Configuration
  POWERUPS: {
    SPAWN_INTERVAL_MIN: 55.0, // meters between power-up opportunities
    SPAWN_INTERVAL_MAX: 95.0,
    POOL_SIZE: 6,
    TYPES: {
      MAGNET: {
        DURATION: 10.0, // seconds
        RADIUS: 14.0, // coin attraction radius
        COLOR: 0x06b6d4, // Cyan
        NAME: 'Coin Magnet',
      },
      SHIELD: {
        DURATION: 15.0, // seconds
        COLOR: 0x10b981, // Emerald Green
        NAME: 'Energy Shield',
      },
      COIN_MULTIPLIER: {
        DURATION: 12.0, // seconds
        MULTIPLIER: 2,
        COLOR: 0xf59e0b, // Amber Gold
        NAME: '2X Multiplier',
      },
    },
  },
  
  // Combat System Configuration
  COMBAT: {
    PLAYER_MAX_HEALTH: 3,
    STARTING_AMMO: 10,
    MAGAZINE_SIZE: 10,
    RELOAD_TIME: 1.25, // seconds
    FIRE_COOLDOWN: 0.18, // seconds between shots
    PROJECTILE_SPEED: 70.0, // units/sec forward
    PROJECTILE_DAMAGE: 1,
    PROJECTILE_MAX_DISTANCE: 65.0,
    PROJECTILE_POOL_SIZE: 30,
    TARGET_ASSIST_MAX_DISTANCE: 50.0,
    TARGET_ASSIST_LATERAL_RANGE: 4.5,
    INVULNERABILITY_DURATION: 1.4, // seconds after taking damage
    
    // Enemy Type Configurations
    ENEMIES: {
      BASIC: {
        HEALTH: 1,
        SPEED: 6.0,
        SCORE: 100,
        COINS: 1,
        COLOR: 0xef4444, // Red drone
      },
      FAST: {
        HEALTH: 2,
        SPEED: 11.0,
        SCORE: 200,
        COINS: 2,
        COLOR: 0xf59e0b, // Amber scout
      },
      ARMORED: {
        HEALTH: 3,
        SPEED: 4.0,
        SCORE: 350,
        COINS: 3,
        COLOR: 0x8b5cf6, // Violet titan
      },
    },
    
    // Enemy Spawning
    MAX_ACTIVE_ENEMIES: 10,
    FIRST_ENEMY_Z: -50,
    MIN_SPAWN_GAP: 25.0,
    MAX_SPAWN_GAP: 42.0,
  },
  
  // Track geometry
  TRACK_SEGMENT_LENGTH: 40,
  TOTAL_ACTIVE_SEGMENTS: 7, // 7 * 40 = 280 units visible forward
  ROAD_WIDTH: 10.0,
  
  // Obstacle Spawning & Difficulty
  OBSTACLE_POOL_SIZE: 28,
  FIRST_OBSTACLE_Z: -35,
  MIN_OBSTACLE_GAP: 24.0, // minimum distance between obstacle waves
  MAX_OBSTACLE_GAP: 38.0,
  MOVING_OBSTACLE_SPEED: 2.2, // side-to-side oscillation speed
  
  // Coin settings
  COIN_SPIN_SPEED: 3.5,
  COIN_BOB_SPEED: 4.0,
  COIN_BOB_HEIGHT: 0.25,
  COIN_COLLECT_DISTANCE: 1.5,
  COIN_VALUE: 10,
  
  // Colors & visual themes
  COLORS: {
    FOG: 0x070c18,
    SKY_TOP: '#050813',
    SKY_BOTTOM: '#111936',
    ROAD_SURFACE: 0x12172b,
    ROAD_BORDER: 0x1e2645,
    LANE_MARKER: 0x38bdf8,
    NEON_CYAN: 0x06b6d4,
    NEON_PURPLE: 0x8b5cf6,
    NEON_ORANGE: 0xf97316,
    NEON_RED: 0xef4444,
    NEON_YELLOW: 0xeab308,
    NEON_GREEN: 0x10b981,
    PROJECTILE_CYAN: 0x22d3ee,
    COIN_GOLD: 0xfbbf24,
    COIN_CORE: 0xf59e0b,
    PLAYER_PRIMARY: 0x2563eb,
    PLAYER_SECONDARY: 0x38bdf8,
    PLAYER_ACCENT: 0xf43f5e,
    PLAYER_VISOR: 0x22d3ee,
    LIGHT_KEY: 0xffffff,
    LIGHT_FILL: 0x818cf8,
  },
  
  // Theme Presets
  THEMES: {
    CYBERPUNK: {
      NAME: 'Cyberpunk Metro',
      FOG_NIGHT: 0x070c18,
      FOG_DAY: 0x1a2138,
      SKY_TOP_NIGHT: '#050813',
      SKY_BOTTOM_NIGHT: '#111936',
      SKY_TOP_DAY: '#1e293b',
      SKY_BOTTOM_DAY: '#334155',
      ROAD_COLOR: 0x12172b,
      VERGE_COLOR: 0x090e1c,
      CURB_COLOR: 0x06b6d4,
      ACCENT_COLOR: 0x8b5cf6,
      SUN_INTENSITY_DAY: 1.6,
      SUN_INTENSITY_NIGHT: 0.9,
    },
    CITY: {
      NAME: 'Modern City',
      FOG_NIGHT: 0x0a101f,
      FOG_DAY: 0x93c5fd,
      SKY_TOP_NIGHT: '#070f26',
      SKY_BOTTOM_NIGHT: '#132147',
      SKY_TOP_DAY: '#38bdf8',
      SKY_BOTTOM_DAY: '#bae6fd',
      ROAD_COLOR: 0x1e2430,
      VERGE_COLOR: 0x334155,
      CURB_COLOR: 0xf59e0b,
      ACCENT_COLOR: 0x3b82f6,
      SUN_INTENSITY_DAY: 1.8,
      SUN_INTENSITY_NIGHT: 0.8,
    },
    TROPICAL: {
      NAME: 'Tropical Island',
      FOG_NIGHT: 0x081b24,
      FOG_DAY: 0x67e8f9,
      SKY_TOP_NIGHT: '#041724',
      SKY_BOTTOM_NIGHT: '#0f3147',
      SKY_TOP_DAY: '#0284c7',
      SKY_BOTTOM_DAY: '#a5f3fc',
      ROAD_COLOR: 0x292524,
      VERGE_COLOR: 0x14532d,
      CURB_COLOR: 0x10b981,
      ACCENT_COLOR: 0xf97316,
      SUN_INTENSITY_DAY: 2.0,
      SUN_INTENSITY_NIGHT: 0.7,
    },
  },

  // Camera
  CAMERA: {
    FOV_DESKTOP: 60,
    FOV_MOBILE: 70,
    OFFSET_Y: 4.8,
    OFFSET_Z: 8.5,
    LOOK_AT_OFFSET_Y: 2.2,
    LOOK_AT_OFFSET_Z: -12.0,
    SMOOTH_FACTOR: 0.15,
  },
};
