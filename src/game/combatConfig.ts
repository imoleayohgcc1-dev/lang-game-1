import {
  WeaponType,
  WeaponSpec,
  BombConfig,
  PickupType,
  PickupDefinition,
  EnemyDropRule,
} from './combatTypes';

// Unified Player Lifespan & Combat Configuration (Phase 13A)
export const MAX_HEALTH = 100;
export const STARTING_HEALTH = 100;
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_STARTING_HEALTH = 100;
export const PLAYER_DAMAGE_COOLDOWN = 0.8; // Brief invulnerability window

export const STARTING_AMMO = 10;
export const MAX_AMMO = 10;
export const STARTING_BOMBS = 3;
export const MAX_BOMBS = 5;
export const BIG_BULLET_DURATION = 12.0;
export const MACHINE_GUN_DURATION = 10.0;
export const BOMB_DAMAGE = 350;
export const BOMB_RADIUS = 8.0;
export const PICKUP_DROP_RATE = 0.45; // 45% chance on enemy defeat

// Damage configurations
export const PLAYER_BULLET_DAMAGE = 50;
export const BIG_BULLET_DAMAGE = 150;
export const MACHINE_GUN_DAMAGE = 35;
export const SPECIAL_BOMB_DAMAGE = 250;
export const SPECIAL_BOMB_RADIUS = 8.0;
export const SPECIAL_SHOT_COUNT = 5;

// Enemy & Obstacle Damage values (dealt to player)
export const SMALL_STONE_DAMAGE = 5; // Low damage, avoidable, non-lethal minor obstacle
export const SMALL_RANGED_DAMAGE = 10; // Small ranged enemy/drone
export const MEDIUM_RANGED_DAMAGE = 15; // Medium creature/beast
export const ENEMY_PROJECTILE_DAMAGE = 15; // Standard enemy projectile
export const DRAGON_PROJECTILE_DAMAGE = 25; // Dragon projectile / plasma fireball
export const OBSTACLE_COLLISION_DAMAGE = 30; // Medium obstacle impact
export const BLOCKING_OBSTACLE_DAMAGE = 35; // Heavy barrier crash
export const ENEMY_COLLISION_DAMAGE = 20; // Direct enemy body collision

// Protective Shield configuration (Phase 14 Energy Globe)
export const SHIELD_DURATION = 7.0; // Exactly 7 seconds default duration
export const SHIELD_COOLDOWN = 0.5;
export const SHIELD_PICKUP_RATE = 0.20;

export const SHIELD_CONFIG = {
  durationSeconds: 7,
  showCountdown: true,
  blockObstacleDamage: true,
  blockEnemyProjectileDamage: true,
  blockDragonProjectileDamage: true,
  blockAnimalProjectileDamage: true,
  blockHumanProjectileDamage: true,
  blockMinorStoneDamage: true,
  activationSoundEnabled: true,
  expirationSoundEnabled: true,
  humSoundEnabled: false,
};

// Human Shooter Enemies Configuration (Phase 14)
export const HUMAN_ENEMY_CONFIG = {
  enabled: true,
  spawnDistance: 32, // meters ahead
  minimumAttackDistance: 8,
  maximumActiveEnemies: 3,
  defaultHealth: 50,
  projectileDamage: 10,
  projectileSpeed: 18.0,
  attackCooldown: 2.2,
  projectileLifetime: 5.0,
  rewardCoins: 10,
  warningEnabled: true,
  types: {
    SCOUT: {
      type: 'SCOUT' as const,
      name: 'Scout Shooter',
      health: 40,
      speed: 2.6,
      attackCooldown: 2.8,
      damage: 10,
      projectileSpeed: 18.0,
      scoreReward: 150,
      coinReward: 8,
      outfitName: 'Light Recon',
    },
    RAPID: {
      type: 'RAPID' as const,
      name: 'Rapid Shooter',
      health: 60,
      speed: 3.2,
      attackCooldown: 1.8,
      burstCount: 2,
      damage: 12,
      projectileSpeed: 22.0,
      scoreReward: 250,
      coinReward: 15,
      outfitName: 'Cyber Commando',
    },
    ELITE: {
      type: 'ELITE' as const,
      name: 'Elite Shooter',
      health: 100,
      speed: 3.8,
      attackCooldown: 2.4,
      burstCount: 3,
      damage: 18,
      projectileSpeed: 26.0,
      scoreReward: 500,
      coinReward: 25,
      outfitName: 'Vanguard Elite',
    },
  },
};

// Rewarded Ads Configurations (Phase 14)
export const REWARDED_RETRY_CONFIG = {
  enabled: true,
  maximumUsesPerRun: 1,
  restoreHealthPercent: 50,
  revivalInvulnerabilitySeconds: 3.0,
  clearNearbyHostileProjectiles: true,
  requireConfirmedReward: true,
};

export const REWARDED_LEVEL_START_CONFIG = {
  enabled: true,
  placement: 'LEVEL_START_REWARD' as const,
  requireConfirmedReward: true,
};

export const WEAPON_CONFIGS: Record<WeaponType, WeaponSpec> = {
  NORMAL: {
    type: 'NORMAL',
    name: 'Normal Blaster',
    damage: PLAYER_BULLET_DAMAGE,
    fireCooldown: 0.22,
    magazineSize: 10,
    projectileSpeed: 70.0,
    projectileScale: 1.0,
    projectileColor: 0x22d3ee, // Cyan
    duration: 0,
    hudLabel: 'NORMAL',
  },
  BIG_BULLET: {
    type: 'BIG_BULLET',
    name: 'Heavy Plasma',
    damage: BIG_BULLET_DAMAGE, // 3x damage vs obstacles & enemies
    fireCooldown: 0.25,
    magazineSize: 10,
    projectileSpeed: 65.0,
    projectileScale: 2.3, // visibly larger projectile
    projectileColor: 0xf59e0b, // Neon Amber/Gold
    duration: BIG_BULLET_DURATION,
    hudLabel: 'BIG BULLET 3x',
  },
  MACHINE_GUN: {
    type: 'MACHINE_GUN',
    name: 'Pulse Gatling',
    damage: MACHINE_GUN_DAMAGE,
    fireCooldown: 0.08, // Very fast firing rate
    magazineSize: 35, // Higher magazine capacity
    projectileSpeed: 85.0,
    projectileScale: 0.9,
    projectileColor: 0xf43f5e, // Neon Crimson
    duration: MACHINE_GUN_DURATION,
    hudLabel: 'MACHINE GUN',
  },
  SPECIAL_BOMB: {
    type: 'SPECIAL_BOMB',
    name: 'Star Special Bomb',
    damage: SPECIAL_BOMB_DAMAGE,
    fireCooldown: 0.35,
    magazineSize: SPECIAL_SHOT_COUNT,
    projectileSpeed: 52.0,
    projectileScale: 2.5,
    projectileColor: 0xd946ef, // Neon Magenta / Star Power
    duration: 0,
    hudLabel: 'SPECIAL BOMB',
    blastRadius: SPECIAL_BOMB_RADIUS,
  },
};

export const BOMB_CONFIG: BombConfig = {
  damage: BOMB_DAMAGE, // 350 full damage in inner radius
  reducedDamage: 150, // 150 partial damage at outer edge
  outerRadius: BOMB_RADIUS, // 8.0 units
  innerRadius: 4.0, // 4.0 units
  throwDistance: 24.0, // Thrown ahead of the player
  projectileSpeed: 38.0,
  cooldown: 0.8, // 0.8s between bomb throws
  startingBombs: STARTING_BOMBS,
  maximumBombs: MAX_BOMBS,
};

export const PICKUP_DEFINITIONS: Record<PickupType, PickupDefinition> = {
  COIN: {
    pickupId: 'pickup_coin',
    pickupType: 'COIN',
    name: 'Gold Credits',
    value: 10,
    duration: 0,
    rarity: 'COMMON',
    effect: 'Increases coins and score',
    maximumStack: 99999,
    color: 0xfbbf24,
    sound: 'coin',
    visualEffect: 'sparkle',
  },
  HEALTH: {
    pickupId: 'pickup_health',
    pickupType: 'HEALTH',
    name: 'Nano Repair',
    value: 25, // Heals 25 HP
    duration: 0,
    rarity: 'COMMON',
    effect: 'Restores +25 health up to maximum health',
    maximumStack: 9999,
    color: 0xef4444,
    sound: 'heal',
    visualEffect: 'health_cross',
  },
  MAX_HEALTH: {
    pickupId: 'pickup_max_health',
    pickupType: 'MAX_HEALTH',
    name: 'Vitality Boost',
    value: 20, // +20 max health (100 -> 120 -> 140)
    duration: 0,
    rarity: 'RARE',
    effect: 'Increases maximum health capacity by +20 for this run',
    maximumStack: 9999,
    color: 0xf43f5e,
    sound: 'upgrade',
    visualEffect: 'shield_pulse',
  },
  BOMB: {
    pickupId: 'pickup_bomb',
    pickupType: 'BOMB',
    name: 'EMP Bomb',
    value: 1,
    duration: 0,
    rarity: 'UNCOMMON',
    effect: 'Adds +1 bomb up to maximum capacity',
    maximumStack: MAX_BOMBS,
    color: 0xa855f7,
    sound: 'bomb_pickup',
    visualEffect: 'emp_spark',
  },
  BIG_BULLET: {
    pickupId: 'pickup_big_bullet',
    pickupType: 'BIG_BULLET',
    name: 'Heavy Plasma Core',
    value: 2,
    duration: BIG_BULLET_DURATION,
    rarity: 'UNCOMMON',
    effect: 'Replaces bullets with heavy 3x damage projectiles',
    maximumStack: 1,
    color: 0xf59e0b,
    sound: 'weapon_upgrade',
    visualEffect: 'plasma_surge',
  },
  MACHINE_GUN: {
    pickupId: 'pickup_machine_gun',
    pickupType: 'MACHINE_GUN',
    name: 'Rapid Gatling Core',
    value: 1,
    duration: MACHINE_GUN_DURATION,
    rarity: 'RARE',
    effect: 'Rapid fire stream with expanded magazine',
    maximumStack: 1,
    color: 0xec4899,
    sound: 'weapon_upgrade',
    visualEffect: 'gatling_whir',
  },
  SHIELD: {
    pickupId: 'pickup_shield',
    pickupType: 'SHIELD',
    name: 'Protective Shield',
    value: 1,
    duration: SHIELD_DURATION,
    rarity: 'UNCOMMON',
    effect: 'Forms an invincible forcefield globe absorbing all damage',
    maximumStack: 1,
    color: 0x10b981,
    sound: 'shield_up',
    visualEffect: 'hex_shield',
  },
  MAGNET: {
    pickupId: 'pickup_magnet',
    pickupType: 'MAGNET',
    name: 'Magnetic Coil',
    value: 1,
    duration: 12.0,
    rarity: 'UNCOMMON',
    effect: 'Draws all nearby coins towards player',
    maximumStack: 1,
    color: 0x06b6d4,
    sound: 'magnet_hum',
    visualEffect: 'magnetic_rings',
  },
  COIN_MULTIPLIER: {
    pickupId: 'pickup_multiplier',
    pickupType: 'COIN_MULTIPLIER',
    name: 'Double Credit Booster',
    value: 2,
    duration: 12.0,
    rarity: 'UNCOMMON',
    effect: 'Doubles all collected coin value',
    maximumStack: 1,
    color: 0xeab308,
    sound: 'multiplier_ding',
    visualEffect: 'golden_glow',
  },
  STAR: {
    pickupId: 'pickup_star',
    pickupType: 'STAR',
    name: 'Star Power',
    value: SPECIAL_SHOT_COUNT,
    duration: 0,
    rarity: 'UNCOMMON',
    effect: 'Transforms weapon into special bomb shots (5 explosive shots)',
    maximumStack: 1,
    color: 0xd946ef,
    sound: 'star_power',
    visualEffect: 'star_burst',
  },
};

export const ENEMY_DROP_TABLE: EnemyDropRule[] = [
  { pickupType: 'COIN', weight: 35, rarity: 'COMMON' },
  { pickupType: 'HEALTH', weight: 16, rarity: 'COMMON' },
  { pickupType: 'BOMB', weight: 12, rarity: 'UNCOMMON' },
  { pickupType: 'BIG_BULLET', weight: 10, rarity: 'UNCOMMON' },
  { pickupType: 'MACHINE_GUN', weight: 7, rarity: 'RARE' },
  { pickupType: 'SHIELD', weight: 10, rarity: 'UNCOMMON' },
  { pickupType: 'STAR', weight: 8, rarity: 'UNCOMMON' },
  { pickupType: 'MAX_HEALTH', weight: 2, rarity: 'RARE' },
];

export function selectRandomEnemyDrop(): PickupType {
  const totalWeight = ENEMY_DROP_TABLE.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of ENEMY_DROP_TABLE) {
    if (roll < item.weight) {
      return item.pickupType;
    }
    roll -= item.weight;
  }
  return 'COIN';
}

// ============================================================================
// PHASE 12: CENTRALIZED CONFIGURATION
// Dragon Enemies, Destructible Obstacles & Audio Mixing
// ============================================================================

// 1. DRAGON CONFIGURATION
export const DRAGON_ENABLED = true;
export const DRAGON_HEALTH = 1000; // 1000 HP boss lifespan (dealt ~50 per blaster shot, 150 per heavy shot, 350 per bomb)
export const DRAGON_MAX_HEALTH = 1000;
export const DRAGON_SPEED = 18.0;
export const DRAGON_SPAWN_DISTANCE = 85.0; // Spawns 85m ahead, well in advance
export const DRAGON_MINIMUM_DISTANCE = 32.0; // Stays at safe distance, never in camera face
export const DRAGON_MAXIMUM_DISTANCE = 110.0;
export const DRAGON_ATTACK_COOLDOWN = 4.2; // Seconds between attacks
export const DRAGON_THROW_SPEED = 24.0;
export const DRAGON_THROW_DAMAGE = 1; // 1 heart of damage
export const DRAGON_MAX_ACTIVE = 1;
export const DRAGON_REWARD = 1000; // 1000 score points
export const DRAGON_DROP_RATE = 1.0; // Guaranteed valuable drop upon defeat
export const DRAGON_MUSIC_ENABLED = true;

// 2. OBSTACLE CONFIGURATION
export const OBSTACLE_WARNING_DISTANCE = 65.0;
export const OBSTACLE_MIN_VISIBLE_DISTANCE = 25.0;
export const OBSTACLE_SAFE_CAMERA_DISTANCE = 6.0; // Never spawns within 6m of camera
export const OBSTACLE_DESTRUCTIBLE = true;
export const OBSTACLE_HEALTH: Record<string, number> = {
  RED_STONE: 50, // Small red ground stone (50 HP)
  LOW: 100, // Small laser hurdle
  BLOCKING: 100, // Destructible barrier pylon
  MOVING_BARRIER: 150, // Sweeper drone
  HIGH: 9999, // Steel overhead gantry is non-destructible (must slide)
};
export const OBSTACLE_DESTRUCTION_DAMAGE = 150; // Bomb blast damage to obstacles

// 3. AUDIO CONFIGURATION
export const MASTER_VOLUME = 0.8;
export const MUSIC_VOLUME = 0.45;
export const SFX_VOLUME = 0.7;

