export type WeaponType = 'NORMAL' | 'BIG_BULLET' | 'MACHINE_GUN';

export type PickupType =
  | 'COIN'
  | 'HEALTH'
  | 'MAX_HEALTH'
  | 'BOMB'
  | 'BIG_BULLET'
  | 'MACHINE_GUN'
  | 'SHIELD'
  | 'MAGNET'
  | 'COIN_MULTIPLIER';

export type PickupRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC';

export interface WeaponSpec {
  type: WeaponType;
  name: string;
  damage: number;
  fireCooldown: number; // seconds between shots
  magazineSize: number;
  projectileSpeed: number;
  projectileScale: number;
  projectileColor: number;
  duration: number; // 0 for normal (permanent), >0 for power-ups
  hudLabel: string;
}

export interface BombConfig {
  damage: number; // Full damage in inner radius
  reducedDamage: number; // Partial damage in outer radius
  outerRadius: number; // Blast radius
  innerRadius: number; // Full damage radius
  throwDistance: number; // Distance forward
  projectileSpeed: number;
  cooldown: number; // Min seconds between bomb throws
  startingBombs: number;
  maximumBombs: number;
}

export interface ActiveWeaponState {
  type: WeaponType;
  name: string;
  damage: number;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  remainingDuration: number;
  maxDuration: number;
  hudLabel?: string;
}

export interface PickupDefinition {
  pickupId: string;
  pickupType: PickupType;
  name: string;
  value: number;
  duration: number; // in seconds, 0 for instant
  rarity: PickupRarity;
  effect: string;
  maximumStack: number;
  color: number;
  sound: string;
  visualEffect: string;
}

export interface EnemyDropRule {
  pickupType: PickupType;
  weight: number;
  rarity: PickupRarity;
}
