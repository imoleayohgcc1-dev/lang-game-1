import {
  WeaponType,
  WeaponSpec,
  BombConfig,
  PickupType,
  PickupDefinition,
  EnemyDropRule,
} from './combatTypes';

// Centralized configuration required by Phase 11
export const MAX_HEALTH = 5;
export const STARTING_HEALTH = 3;
export const STARTING_AMMO = 10;
export const MAX_AMMO = 10;
export const STARTING_BOMBS = 3;
export const MAX_BOMBS = 5;
export const BIG_BULLET_DURATION = 12.0;
export const MACHINE_GUN_DURATION = 10.0;
export const BOMB_DAMAGE = 4;
export const BOMB_RADIUS = 8.0;
export const PICKUP_DROP_RATE = 0.45; // 45% chance on enemy defeat

export const WEAPON_CONFIGS: Record<WeaponType, WeaponSpec> = {
  NORMAL: {
    type: 'NORMAL',
    name: 'Normal Blaster',
    damage: 1,
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
    damage: 2, // 2x damage
    fireCooldown: 0.25,
    magazineSize: 10,
    projectileSpeed: 65.0,
    projectileScale: 2.3, // visibly larger projectile
    projectileColor: 0xf59e0b, // Neon Amber/Gold
    duration: BIG_BULLET_DURATION,
    hudLabel: 'BIG BULLET 2x',
  },
  MACHINE_GUN: {
    type: 'MACHINE_GUN',
    name: 'Pulse Gatling',
    damage: 1,
    fireCooldown: 0.08, // Very fast firing rate
    magazineSize: 35, // Higher magazine capacity
    projectileSpeed: 85.0,
    projectileScale: 0.9,
    projectileColor: 0xf43f5e, // Neon Crimson
    duration: MACHINE_GUN_DURATION,
    hudLabel: 'MACHINE GUN',
  },
};

export const BOMB_CONFIG: BombConfig = {
  damage: BOMB_DAMAGE, // 4 full damage in inner radius
  reducedDamage: 2, // 2 partial damage at outer edge
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
    value: 1,
    duration: 0,
    rarity: 'COMMON',
    effect: 'Restores +1 health up to maximum health',
    maximumStack: MAX_HEALTH,
    color: 0xef4444,
    sound: 'heal',
    visualEffect: 'health_cross',
  },
  MAX_HEALTH: {
    pickupId: 'pickup_max_health',
    pickupType: 'MAX_HEALTH',
    name: 'Vitality Boost',
    value: 1,
    duration: 0,
    rarity: 'RARE',
    effect: 'Increases maximum health capacity by +1 for this run',
    maximumStack: MAX_HEALTH,
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
    effect: 'Replaces bullets with heavy 2x damage projectiles',
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
    name: 'Energy Shield',
    value: 1,
    duration: 15.0,
    rarity: 'UNCOMMON',
    effect: 'Absorbs 1 obstacle or enemy collision',
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
};

export const ENEMY_DROP_TABLE: EnemyDropRule[] = [
  { pickupType: 'COIN', weight: 45, rarity: 'COMMON' },
  { pickupType: 'HEALTH', weight: 18, rarity: 'COMMON' },
  { pickupType: 'BOMB', weight: 15, rarity: 'UNCOMMON' },
  { pickupType: 'BIG_BULLET', weight: 12, rarity: 'UNCOMMON' },
  { pickupType: 'MACHINE_GUN', weight: 7, rarity: 'RARE' },
  { pickupType: 'MAX_HEALTH', weight: 3, rarity: 'RARE' },
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
