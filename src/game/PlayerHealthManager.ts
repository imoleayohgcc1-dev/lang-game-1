/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PLAYER_STARTING_HEALTH,
  PLAYER_MAX_HEALTH,
  PLAYER_DAMAGE_COOLDOWN,
  SHIELD_DURATION,
  SHIELD_CONFIG,
} from './combatConfig';

export type DamageSource =
  | 'STONE'
  | 'OBSTACLE'
  | 'ENEMY_COLLISION'
  | 'ENEMY_PROJECTILE'
  | 'HUMAN_PROJECTILE'
  | 'ANIMAL_PROJECTILE'
  | 'DRAGON_PROJECTILE'
  | 'DRAGON_HAZARD';

export class PlayerHealthManager {
  public currentHealth: number;
  public maxHealth: number;

  // Damage Cooldown & Invulnerability window
  public damageCooldownTimer: number = 0;
  public damageCooldownDuration: number = PLAYER_DAMAGE_COOLDOWN;

  // Protective Forcefield Shield
  public isShieldActive: boolean = false;
  public shieldDurationRemaining: number = 0;
  public shieldMaxDuration: number = SHIELD_CONFIG.durationSeconds;

  public isDead: boolean = false;

  // Optional subtle health regeneration (configurable, default off)
  public isRegenEnabled: boolean = false;
  public regenRate: number = 0; // HP per second

  // Callbacks
  public onHealthChanged?: (current: number, max: number) => void;
  public onDamageTaken?: (amount: number, remaining: number, source: DamageSource) => void;
  public onShieldHit?: (source: DamageSource) => void;
  public onShieldChanged?: (active: boolean, remainingDuration: number, isExpiringSoon: boolean) => void;
  public onShieldExpired?: () => void;
  public onHealed?: (amount: number, current: number) => void;
  public onMaxHealthUpgraded?: (amount: number, newMax: number) => void;
  public onDeath?: () => void;

  constructor(
    startingHealth: number = PLAYER_STARTING_HEALTH,
    maxHealth: number = PLAYER_MAX_HEALTH
  ) {
    this.currentHealth = startingHealth;
    this.maxHealth = maxHealth;
  }

  public isShieldBlockingSource(source: DamageSource): boolean {
    if (!this.isShieldActive) return false;
    switch (source) {
      case 'STONE':
        return SHIELD_CONFIG.blockMinorStoneDamage;
      case 'OBSTACLE':
      case 'ENEMY_COLLISION':
        return SHIELD_CONFIG.blockObstacleDamage;
      case 'ENEMY_PROJECTILE':
        return SHIELD_CONFIG.blockEnemyProjectileDamage;
      case 'HUMAN_PROJECTILE':
        return SHIELD_CONFIG.blockHumanProjectileDamage;
      case 'ANIMAL_PROJECTILE':
        return SHIELD_CONFIG.blockAnimalProjectileDamage;
      case 'DRAGON_PROJECTILE':
      case 'DRAGON_HAZARD':
        return SHIELD_CONFIG.blockDragonProjectileDamage;
      default:
        return true;
    }
  }

  /**
   * Applies damage to the player lifespan.
   * If shield is active and blocks the source, absorbs 100% of damage and preserves player HP.
   * If damage cooldown is active, prevents multi-frame repeated damage.
   * Returns true if HP was actually reduced.
   */
  public takeDamage(amount: number, source: DamageSource = 'OBSTACLE'): boolean {
    if (this.isDead) return false;

    // 1. Authoritative Protective Shield Immunity
    if (this.isShieldActive && this.isShieldBlockingSource(source)) {
      this.onShieldHit?.(source);
      return false;
    }

    // 2. Prevent multi-frame collision drain
    if (this.damageCooldownTimer > 0) {
      return false;
    }

    // 3. Apply Unified Health Reduction
    const previous = this.currentHealth;
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    this.damageCooldownTimer = this.damageCooldownDuration;

    this.onDamageTaken?.(amount, this.currentHealth, source);
    this.onHealthChanged?.(this.currentHealth, this.maxHealth);

    // 4. Check for Death
    if (this.currentHealth <= 0 && previous > 0) {
      this.currentHealth = 0;
      this.isDead = true;
      this.onDeath?.();
    }

    return true;
  }

  /**
   * Restores health up to current maxHealth
   */
  public heal(amount: number): number {
    if (this.isDead) return this.currentHealth;
    const prev = this.currentHealth;
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    const healed = this.currentHealth - prev;

    if (healed > 0) {
      this.onHealed?.(healed, this.currentHealth);
      this.onHealthChanged?.(this.currentHealth, this.maxHealth);
    }
    return this.currentHealth;
  }

  /**
   * Upgrades maximum health capacity and scales current health
   */
  public upgradeMaxHealth(amount: number): number {
    this.maxHealth += amount;
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    this.onMaxHealthUpgraded?.(amount, this.maxHealth);
    this.onHealthChanged?.(this.currentHealth, this.maxHealth);
    return this.maxHealth;
  }

  /**
   * Activates or extends the Protective Forcefield Globe (Default exactly 7 seconds)
   */
  public activateShield(duration: number = SHIELD_CONFIG.durationSeconds): void {
    if (this.isShieldActive) {
      // Extend current duration to full default or higher
      this.shieldDurationRemaining = Math.max(this.shieldDurationRemaining, duration);
      this.shieldMaxDuration = Math.max(this.shieldMaxDuration, this.shieldDurationRemaining);
    } else {
      this.isShieldActive = true;
      this.shieldDurationRemaining = duration;
      this.shieldMaxDuration = duration;
    }

    this.onShieldChanged?.(true, this.shieldDurationRemaining, this.isShieldExpiringSoon());
  }

  public deactivateShield(): void {
    if (!this.isShieldActive) return;
    this.isShieldActive = false;
    this.shieldDurationRemaining = 0;
    this.onShieldChanged?.(false, 0, false);
    this.onShieldExpired?.();
  }

  public isShieldExpiringSoon(): boolean {
    return this.isShieldActive && this.shieldDurationRemaining <= 3.0 && this.shieldDurationRemaining > 0;
  }

  public update(delta: number): void {
    if (this.isDead) return;

    // 1. Damage cooldown window
    if (this.damageCooldownTimer > 0) {
      this.damageCooldownTimer = Math.max(0, this.damageCooldownTimer - delta);
    }

    // 2. Shield Countdown
    if (this.isShieldActive) {
      this.shieldDurationRemaining -= delta;
      if (this.shieldDurationRemaining <= 0) {
        this.deactivateShield();
      } else {
        this.onShieldChanged?.(true, this.shieldDurationRemaining, this.isShieldExpiringSoon());
      }
    }

    // 3. Optional Health Regeneration
    if (this.isRegenEnabled && this.regenRate > 0 && this.currentHealth < this.maxHealth) {
      this.heal(this.regenRate * delta);
    }
  }

  public reset(
    startingHealth: number = PLAYER_STARTING_HEALTH,
    maxHealth: number = PLAYER_MAX_HEALTH
  ): void {
    this.maxHealth = maxHealth;
    this.currentHealth = startingHealth;
    this.damageCooldownTimer = 0;
    this.isDead = false;
    this.isShieldActive = false;
    this.shieldDurationRemaining = 0;
    this.onHealthChanged?.(this.currentHealth, this.maxHealth);
    this.onShieldChanged?.(false, 0, false);
  }
}
