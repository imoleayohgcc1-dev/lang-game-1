import * as THREE from 'three';
import {
  GAME_CONFIG,
  GameState,
  PlayerState,
  GameSettings,
  DEFAULT_SETTINGS,
} from './constants';
import { GameStateManager } from './GameStateManager';
import { SceneManager } from './SceneManager';
import { Player } from './Player';
import { TrackManager } from './TrackManager';
import { CoinManager, CoinInstance } from './CoinManager';
import { ObstacleManager, ObstacleInstance } from './ObstacleManager';
import { ProjectileManager, ProjectileInstance } from './ProjectileManager';
import { EnemyManager, EnemyInstance } from './EnemyManager';
import { PowerUpManager, ActivePowerUpState } from './PowerUpManager';
import { VFXManager } from './VFXManager';
import { AchievementManager, Achievement } from './AchievementManager';
import { TemporaryMessageManager, TemporaryMessageState, MessageType } from './TemporaryMessageManager';
import { LevelManager } from './levels/LevelManager';
import {
  LevelDefinition,
  LevelRuntimeProgress,
  LevelCompletionStats,
  LevelFailedStats,
} from './levels/levelTypes';
import { CameraController } from './CameraController';
import { InputManager } from './InputManager';
import { AudioManager } from './AudioManager';
import { BombManager } from './BombManager';
import { PickupManager } from './PickupManager';
import { DragonManager, DragonInstance, ThrownDragonObstacle } from './DragonManager';
import { WeaponType, ActiveWeaponState, PickupType, DragonStatusInfo, ShieldStatusInfo } from './combatTypes';
import { PlayerHealthManager, DamageSource } from './PlayerHealthManager';
import { EnemyProjectileManager } from './EnemyProjectileManager';
import { HumanShooterManager, HumanShooterInstance } from './HumanShooterManager';
import { AdManager } from './AdManager';
import {
  WEAPON_CONFIGS,
  BOMB_CONFIG,
  PLAYER_STARTING_HEALTH,
  PLAYER_MAX_HEALTH,
  STARTING_AMMO,
  STARTING_BOMBS,
  MAX_BOMBS,
  BIG_BULLET_DURATION,
  MACHINE_GUN_DURATION,
  SPECIAL_SHOT_COUNT,
  DRAGON_HEALTH,
  DRAGON_MAX_HEALTH,
  DRAGON_REWARD,
  DRAGON_PROJECTILE_DAMAGE,
  SMALL_STONE_DAMAGE,
  OBSTACLE_COLLISION_DAMAGE,
  BLOCKING_OBSTACLE_DAMAGE,
  ENEMY_COLLISION_DAMAGE,
  SPECIAL_BOMB_DAMAGE,
  SPECIAL_BOMB_RADIUS,
  SHIELD_DURATION,
  SHIELD_CONFIG,
  REWARDED_RETRY_CONFIG,
} from './combatConfig';

export interface GameMetrics {
  score: number;
  coins: number;
  distance: number;
  speed: number;
  currentLane: number;
  highScore: number;
  playerState: PlayerState;
  health: number;
  maxHealth: number;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  hasTargetLock: boolean;
  targetEnemyName?: string;
  weapon: ActiveWeaponState;
  bombs: number;
  maxBombs: number;
  activePowerUps: ActivePowerUpState[];
  currentMessage?: TemporaryMessageState | null;
  levelProgress?: LevelRuntimeProgress;
  currentLevel?: LevelDefinition;
  dragonStatus?: DragonStatusInfo | null;
  shieldStatus?: ShieldStatusInfo | null;
  canRewardedRetry?: boolean;
  remainingRewardedRetries?: number;
}

export type MetricsCallback = (metrics: GameMetrics) => void;

const HIGH_SCORE_KEY = 'action_runner_high_score';
const SETTINGS_STORAGE_KEY = 'action_runner_settings';

export class GameManager {
  public stateManager: GameStateManager;
  public sceneManager: SceneManager;
  public player: Player;
  public trackManager: TrackManager;
  public coinManager: CoinManager;
  public obstacleManager: ObstacleManager;
  public projectileManager: ProjectileManager;
  public enemyManager: EnemyManager;
  public powerUpManager: PowerUpManager;
  public vfxManager: VFXManager;
  public achievementManager: AchievementManager;
  public messageManager: TemporaryMessageManager;
  public levelManager: LevelManager;
  public bombManager: BombManager;
  public pickupManager: PickupManager;
  public dragonManager: DragonManager;
  public playerHealthManager: PlayerHealthManager;
  public enemyProjectileManager: EnemyProjectileManager;
  public humanShooterManager: HumanShooterManager;
  public runId: string = 'run_' + Date.now();
  private lastDragonSpawnDistance: number = 0;
  public onLevelStarted?: (level: LevelDefinition) => void;
  public onLevelCompleted?: (stats: LevelCompletionStats) => void;
  public onLevelFailed?: (stats: LevelFailedStats) => void;
  public onNextLevelUnlocked?: (nextLevel: LevelDefinition) => void;
  private isLevelCompleteTriggered: boolean = false;
  private tookDamageInLevel: boolean = false;
  public cameraController: CameraController;
  public inputManager: InputManager;
  public audioManager: AudioManager;

  // Settings
  public settings: GameSettings;

  // Runtime metrics
  public score: number = 0;
  public coins: number = 0;
  public distance: number = 0;
  public currentSpeed: number = GAME_CONFIG.BASE_SPEED;
  public highScore: number = 0;

  // Combat metrics
  public activeWeapon: WeaponType = 'NORMAL';
  public weaponDurationRemaining: number = 0;
  public weaponMaxDuration: number = 0;
  public bombs: number = STARTING_BOMBS;
  public maxBombs: number = MAX_BOMBS;
  public health: number = PLAYER_STARTING_HEALTH;
  public maxHealth: number = PLAYER_MAX_HEALTH;
  public ammo: number = STARTING_AMMO;
  public maxAmmo: number = STARTING_AMMO;
  public isReloading: boolean = false;
  public reloadTimer: number = 0;
  private fireCooldownTimer: number = 0;
  public currentTargetEnemy: EnemyInstance | null = null;

  // Stats for achievements
  private enemiesDefeatedCount: number = 0;

  // Reusable vectors for performance
  private tempMuzzlePos: THREE.Vector3 = new THREE.Vector3();
  private tempForwardDir: THREE.Vector3 = new THREE.Vector3(0, 0, -1);

  // Future Language Learning Hooks
  public onEnemySpawned?: (enemy: EnemyInstance) => void;
  public onEnemyHit?: (enemy: EnemyInstance, remainingHealth: number) => void;
  public onEnemyDefeated?: (enemy: EnemyInstance) => void;
  public onPlayerDamaged?: (health: number) => void;
  public onPlayerHealthChanged?: (health: number, maxHealth: number) => void;

  private onMetricsUpdate?: MetricsCallback;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private isRunning: boolean = false;

  constructor(container: HTMLElement, onMetricsUpdate?: MetricsCallback) {
    this.onMetricsUpdate = onMetricsUpdate;
    this.highScore = this.loadHighScore();
    this.settings = this.loadSettings();

    // 1. Initialize Subsystems
    this.stateManager = new GameStateManager('LOADING');
    this.audioManager = new AudioManager();
    this.sceneManager = new SceneManager(container);

    const initialized = this.sceneManager.init();
    if (!initialized) {
      throw new Error('Three.js SceneManager failed to initialize.');
    }

    this.player = new Player();
    this.sceneManager.scene.add(this.player.mesh);

    this.trackManager = new TrackManager(this.sceneManager.scene);
    this.coinManager = new CoinManager(this.sceneManager.scene);
    this.obstacleManager = new ObstacleManager(this.sceneManager.scene);
    this.projectileManager = new ProjectileManager(this.sceneManager.scene);
    this.enemyManager = new EnemyManager(this.sceneManager.scene);
    this.powerUpManager = new PowerUpManager(this.sceneManager.scene);
    this.bombManager = new BombManager(this.sceneManager.scene);
    this.dragonManager = new DragonManager(this.sceneManager.scene);
    this.pickupManager = new PickupManager(this.sceneManager.scene);
    this.playerHealthManager = new PlayerHealthManager(PLAYER_STARTING_HEALTH, PLAYER_MAX_HEALTH);
    this.enemyProjectileManager = new EnemyProjectileManager(this.sceneManager.scene);
    this.humanShooterManager = new HumanShooterManager(this.sceneManager.scene, this.enemyProjectileManager);
    this.vfxManager = new VFXManager(this.sceneManager.scene);
    this.achievementManager = new AchievementManager();
    this.messageManager = new TemporaryMessageManager();
    this.messageManager.onMessageChanged = () => this.broadcastMetrics();
    this.levelManager = new LevelManager();
    this.cameraController = new CameraController(this.sceneManager.camera);
    this.inputManager = new InputManager(container);

    // Apply loaded settings and initial level configuration
    this.applySettings(this.settings);
    this.applyLevelConfig(this.levelManager.currentLevel);

    this.setupHooks();

    // Spawn initial coins along track
    this.seedInitialCoins();

    // Set to READY state once fully loaded
    this.stateManager.setState('READY');
    this.broadcastMetrics();
  }

  private loadSettings(): GameSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback
    }
    return { ...DEFAULT_SETTINGS };
  }

  public saveSettings(newSettings: GameSettings): void {
    this.settings = newSettings;
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch {
      // Fallback
    }
    this.applySettings(newSettings);
  }

  public applySettings(settings: GameSettings): void {
    this.sceneManager.applyTheme(settings.theme, settings.dayNight);
    this.sceneManager.applyGraphicsQuality(settings.graphicsQuality);
    this.trackManager.applyTheme(settings.theme, settings.dayNight);
    this.vfxManager.setQuality(settings.graphicsQuality);
    this.audioManager.setMasterVolume(settings.masterVolume ?? 0.8);
    this.audioManager.setMusicVolume(settings.musicVolume ?? 0.45);
    this.audioManager.setSfxVolume(settings.sfxVolume ?? 0.7);
    this.audioManager.setMusicEnabled(settings.musicEnabled);
    this.audioManager.setSoundEnabled(settings.soundEnabled);
    this.audioManager.setShieldSoundEnabled(settings.shieldSoundEnabled !== false);
    this.audioManager.setEnemyCombatSoundEnabled(settings.enemyCombatSoundEnabled !== false);
  }

  public applyLevelConfig(level: LevelDefinition): void {
    // 1. Environment Theme and Day/Night mode
    this.sceneManager.applyTheme(level.environment, level.dayNight);
    this.trackManager.applyTheme(level.environment, level.dayNight);

    // 2. Obstacle & Enemy Difficulty
    this.obstacleManager.setDifficulty(level.obstacleDifficulty, level.obstacleGapMultiplier);
    this.enemyManager.setDifficulty(level.enemyDifficulty, level.enemySpawnRate, level.maximumActiveEnemies);
    this.humanShooterManager.setDifficulty(level.enemyDifficulty);

    // 3. Collectibles & Power-up pacing
    this.coinManager.setDensity(level.coinDensity);
    this.powerUpManager.setFrequency(level.powerUpFrequency);

    // 4. Baseline starting speed
    this.currentSpeed = level.startingSpeed;
  }

  private loadHighScore(): number {
    try {
      const stored = localStorage.getItem(HIGH_SCORE_KEY);
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  private saveHighScore(score: number): void {
    if (score > this.highScore) {
      this.highScore = score;
      try {
        localStorage.setItem(HIGH_SCORE_KEY, score.toString());
      } catch {
        // LocalStorage fallback
      }
    }
  }

  private setupHooks(): void {
    // 1. Input bindings
    this.inputManager.onMoveLeft = () => this.moveLeft();
    this.inputManager.onMoveRight = () => this.moveRight();
    this.inputManager.onJump = () => this.jump();
    this.inputManager.onSlide = () => this.slide();
    this.inputManager.onShoot = (side) => this.shoot(side);
    this.inputManager.onBomb = () => this.throwBomb();

    this.inputManager.onTogglePause = () => {
      if (this.stateManager.isPlaying()) {
        this.pause();
      } else if (this.stateManager.isPaused()) {
        this.resume();
      }
    };

    // 2. Track recycling hook: spawn new coins ahead
    this.trackManager.update(this.player.position.z, (newZPos) => {
      if (Math.random() > 0.25) {
        this.coinManager.populateTrackSection(newZPos);
      }
    });

    // 3. Coin collection hook
    this.coinManager.onCoinCollected = (coin: CoinInstance) => {
      const multiplier = (this.powerUpManager.isMultiplierActive() || this.pickupManager.isMultiplierActive()) ? 2 : 1;
      const earnedCoins = 1 * multiplier;
      this.coins += earnedCoins;
      this.score += GAME_CONFIG.COIN_VALUE * multiplier;

      this.audioManager.playCoinSound();
      this.vfxManager.triggerCoinCollect(coin.mesh.position);

      if (this.coins >= 50) {
        this.achievementManager.unlock('COIN_COLLECTOR');
      }

      this.broadcastMetrics();
    };

    // 4. PowerUp collection hook
    this.powerUpManager.onPowerUpCollected = (type, _duration) => {
      this.audioManager.playPowerUpSound();
      const cfg = GAME_CONFIG.POWERUPS.TYPES[type];
      this.vfxManager.triggerPowerUpCollect(this.player.position, cfg.COLOR);

      if (type === 'SHIELD') {
        this.playerHealthManager.activateShield(SHIELD_DURATION);
        this.audioManager.playShieldActivateSound();
      } else if (type === 'MAGNET') {
        this.player.setMagnetActive(true);
      }

      this.achievementManager.unlock('POWER_SURGE');
      this.broadcastMetrics();
    };

    this.powerUpManager.onPowerUpExpired = (type) => {
      if (type === 'SHIELD') {
        this.playerHealthManager.deactivateShield();
      } else if (type === 'MAGNET') {
        this.player.setMagnetActive(false);
      }
      this.broadcastMetrics();
    };

    // 5. PickupManager hooks
    this.pickupManager.onPickupCollected = (type, value, duration) => {
      this.handlePickupCollected(type, value, duration);
    };

    this.pickupManager.onEffectExpired = (type) => {
      if (type === 'SHIELD') {
        this.playerHealthManager.deactivateShield();
      } else if (type === 'MAGNET') {
        this.player.setMagnetActive(false);
      }
      this.broadcastMetrics();
    };

    // 6. BombManager hooks
    this.bombManager.onBombDetonated = (center, hitCount) => {
      this.audioManager.playBombExplosionSound();
      this.vfxManager.triggerEnemyDefeat(center);
      // Also damage human shooters in blast radius
      let humanShootersHit = 0;
      for (const shooter of this.humanShooterManager.pool) {
        if (!shooter.isActive || shooter.isDefeated) continue;
        if (shooter.mesh.position.distanceTo(center) <= SPECIAL_BOMB_RADIUS) {
          this.humanShooterManager.damageShooter(shooter, SPECIAL_BOMB_DAMAGE);
          humanShootersHit++;
        }
      }
      const totalHits = hitCount + humanShootersHit;
      if (totalHits > 0) {
        this.enemiesDefeatedCount += totalHits;
        this.score += totalHits * 150;
        this.showMessage(`EMP BLAST: ${totalHits} ENEMIES HIT`, 1800, 'combat');
      }
      this.broadcastMetrics();
    };

    this.bombManager.onBombCountChanged = (count) => {
      this.bombs = count;
      this.broadcastMetrics();
    };

    this.bombManager.onObstacleDestroyedByBomb = (obs) => {
      this.obstacleManager.destroyObstacle(obs);
    };

    this.bombManager.onDragonDamagedByBomb = (dragon, damage) => {
      this.dragonManager.hitDragon(dragon, damage);
    };

    this.bombManager.onThrownDestroyedByBomb = (thrown) => {
      this.dragonManager.destroyThrownObstacle(thrown);
    };

    // 7. Player Health Manager hooks (Unified Lifespan & Shield System)
    this.playerHealthManager.onHealthChanged = (current, max) => {
      this.health = current;
      this.maxHealth = max;
      this.onPlayerHealthChanged?.(current, max);
      this.broadcastMetrics();
    };

    this.playerHealthManager.onDamageTaken = (_amount, remaining, _source) => {
      this.tookDamageInLevel = true;
      this.player.triggerDamage();
      this.audioManager.playPlayerDamageSound();
      this.onPlayerDamaged?.(remaining);
      this.broadcastMetrics();
    };

    this.playerHealthManager.onShieldHit = (_source) => {
      this.player.triggerShieldHitEffect();
      this.audioManager.playShieldDeflectSound();
      this.showMessage('🛡️ ENERGY GLOBE DEFLECTED ATTACK', 1200, 'powerup');
      this.broadcastMetrics();
    };

    this.playerHealthManager.onShieldChanged = (active, _remainingDuration, isExpiringSoon) => {
      this.player.setShieldActive(active, isExpiringSoon);
      this.broadcastMetrics();
    };

    this.playerHealthManager.onShieldExpired = () => {
      this.player.setShieldActive(false);
      this.audioManager.playShieldExpireSound();
      this.showMessage('🛡️ ENERGY GLOBE EXPIRED', 1400, 'gameplay');
      this.broadcastMetrics();
    };

    this.playerHealthManager.onDeath = () => {
      this.levelManager.failLevel({
        distance: this.distance,
        score: this.score,
        coins: this.coins,
        enemiesDefeated: this.enemiesDefeatedCount,
        bombsUsed: 0,
        cause: 'Lifespan Depleted',
      });
      this.player.die();
      this.audioManager.playCrashSound();
      this.audioManager.playGameOverSound();
      this.saveHighScore(this.score);
      this.achievementManager.unlock('FIRST_RUN');
      this.stateManager.setState('GAME_OVER');
      this.broadcastMetrics();
    };

    // 8. Enemy Projectile Manager hooks
    this.enemyProjectileManager.onPlayerHit = (damage, source) => {
      const dmgSource: DamageSource =
        source === 'DRAGON'
          ? 'DRAGON_PROJECTILE'
          : source === 'HUMAN'
          ? 'HUMAN_PROJECTILE'
          : 'ENEMY_PROJECTILE';
      this.handlePlayerCollisionDamage(damage, dmgSource);
    };

    this.enemyProjectileManager.onProjectileDestroyed = (pos) => {
      this.vfxManager.triggerEnemyDefeat(pos);
      this.score += 25;
      this.broadcastMetrics();
    };

    // 8B. Human Shooter Enemy hooks (Phase 14)
    this.humanShooterManager.onEnemySpawned = (enemy) => {
      if (enemy.type === 'ELITE') {
        this.audioManager.playEliteEncounterSound();
        this.audioManager.musicManager.transitionToEliteCombatMusic();
        this.showMessage('⚠ ELITE VANGUARD SHOOTER DETECTED!', 1800, 'warning');
      } else {
        this.audioManager.playHumanEnemyAlertSound();
        this.audioManager.musicManager.transitionToHumanCombatMusic();
      }
    };

    this.humanShooterManager.onEnemyAiming = (_enemy, laneIndex) => {
      this.audioManager.playHumanEnemyAimSound();
      const laneName = laneIndex === 0 ? 'LEFT' : laneIndex === 1 ? 'CENTER' : 'RIGHT';
      this.showMessage(`⚠ SHOOTER AIMING: ${laneName} LANE`, 1100, 'warning');
    };

    this.humanShooterManager.onEnemyShoot = (_enemy) => {
      this.audioManager.playHumanEnemyShootSound();
    };

    this.humanShooterManager.onEnemyHit = (_enemy) => {
      this.audioManager.playHumanEnemyHurtSound();
      this.score += 20;
      this.broadcastMetrics();
    };

    this.humanShooterManager.onEnemyDefeated = (enemy) => {
      this.audioManager.playHumanEnemyDefeatSound();
      this.score += enemy.scoreReward;
      this.coins += enemy.coinReward;
      this.enemiesDefeatedCount++;
      this.vfxManager.triggerEnemyDefeat(enemy.mesh.position);
      this.pickupManager.spawnEnemyDrop(enemy.mesh.position, enemy.laneIndex);
      this.showMessage(`+${enemy.coinReward} CREDITS (SHOOTER ELIMINATED)`, 1500, 'combat');
      this.broadcastMetrics();

      if (this.humanShooterManager.getActiveCount() === 0 && !this.dragonManager.hasActiveDragon()) {
        this.audioManager.musicManager.transitionToGameplayMusic();
      }
    };

    // 9. Obstacle hooks
    this.obstacleManager.onCollision = (obs: ObstacleInstance) => {
      if (obs.type === 'RED_STONE') {
        this.handlePlayerCollisionDamage(SMALL_STONE_DAMAGE, 'STONE');
        this.audioManager.playStoneHitSound();
        this.showMessage('STONE SCRAPE -5 HP', 1200, 'gameplay');
      } else if (obs.type === 'BLOCKING') {
        this.handlePlayerCollisionDamage(BLOCKING_OBSTACLE_DAMAGE, 'OBSTACLE');
      } else {
        this.handlePlayerCollisionDamage(OBSTACLE_COLLISION_DAMAGE, 'OBSTACLE');
      }
    };

    this.obstacleManager.onDestroyed = (_obstacle: ObstacleInstance) => {
      this.audioManager.playObstacleDestructionSound();
      this.score += 50;
      this.broadcastMetrics();
    };

    // 10. Dragon Boss hooks
    this.dragonManager.onDragonSpawned = (_dragon: DragonInstance) => {
      this.audioManager.playDragonMusic();
      this.audioManager.playDragonWarningSound();
      this.showMessage('⚡ DRAGON APPROACHING!', 2200, 'warning');
      this.broadcastMetrics();
    };

    this.dragonManager.onAttackWarning = (_pattern, laneIndex) => {
      this.audioManager.playDragonWarningSound();
      const laneName = laneIndex === 0 ? 'LEFT' : laneIndex === 1 ? 'CENTER' : 'RIGHT';
      this.showMessage(`⚠ DRAGON ATTACK: ${laneName} LANE`, 1600, 'warning');
      this.broadcastMetrics();
    };

    this.dragonManager.onAttackLaunched = (_obstacle: ThrownDragonObstacle) => {
      this.audioManager.playDragonAttackSound();
    };

    this.dragonManager.onDragonHit = (_dragon: DragonInstance, _remainingHp: number) => {
      this.audioManager.playDragonHitSound();
      this.score += 100;
      this.broadcastMetrics();
    };

    this.dragonManager.onDragonDefeated = (dragon: DragonInstance, position: THREE.Vector3, rewardDrop: PickupType) => {
      this.audioManager.playDragonDefeatSound();
      this.score += DRAGON_REWARD;
      this.showMessage('🏆 DRAGON DEFEATED! +1000 PTS', 2800, 'success');
      this.audioManager.startAmbientMusic(); // Smooth transition back to gameplay soundtrack
      this.pickupManager.spawn(rewardDrop, dragon.targetLaneIndex, position.z);
      this.broadcastMetrics();
    };

    this.dragonManager.onThrownObstacleDestroyed = (obstacle: ThrownDragonObstacle) => {
      this.audioManager.playObstacleDestructionSound();
      this.score += 75;
      this.vfxManager.triggerEnemyDefeat(obstacle.mesh.position);
      this.broadcastMetrics();
    };

    // 11. Enemy hooks
    this.enemyManager.onEnemySpawned = (enemy: EnemyInstance) => {
      this.onEnemySpawned?.(enemy);
    };

    this.enemyManager.onEnemyHit = (enemy: EnemyInstance, remaining: number) => {
      this.onEnemyHit?.(enemy, remaining);
    };

    this.enemyManager.onEnemyShoot = (_enemy, origin, target, damage) => {
      this.enemyProjectileManager.spawn(
        origin,
        target,
        _enemy.type === 'ARMORED' ? 'BEAST' : 'DRONE',
        damage
      );
      this.audioManager.playEnemyShootSound();
    };

    this.enemyManager.onEnemyWarning = (_enemy, laneIndex) => {
      this.audioManager.playWarningSound();
      const laneName = laneIndex === 0 ? 'LEFT' : laneIndex === 1 ? 'CENTER' : 'RIGHT';
      this.showMessage(`⚠ ENEMY AIMING: ${laneName} LANE`, 1200, 'warning');
    };

    this.enemyManager.onEnemyDefeated = (enemy: EnemyInstance) => {
      this.score += enemy.scoreReward;
      this.coins += enemy.coinReward;
      this.enemiesDefeatedCount++;

      this.audioManager.playDefeatSound();
      this.vfxManager.triggerEnemyDefeat(enemy.mesh.position);
      this.onEnemyDefeated?.(enemy);

      // Enemy drop pickup opportunity!
      this.pickupManager.spawnEnemyDrop(enemy.mesh.position, enemy.laneIndex);

      if (this.enemiesDefeatedCount >= 10) {
        this.achievementManager.unlock('CYBER_DEFENDER');
      }

      this.broadcastMetrics();
    };

    // 9. Level progression hooks
    this.levelManager.onLevelCompleted = (stats) => {
      this.audioManager.musicManager.playVictoryMusic();
      this.broadcastMetrics();
      this.onLevelCompleted?.(stats);
    };

    this.levelManager.onLevelFailed = (stats) => {
      this.audioManager.musicManager.playGameOverMusic();
      this.broadcastMetrics();
      this.onLevelFailed?.(stats);
    };

    this.levelManager.onNextLevelUnlocked = (nextLevel) => {
      this.broadcastMetrics();
      this.onNextLevelUnlocked?.(nextLevel);
    };

    this.levelManager.onLevelStarted = (level) => {
      this.applyLevelConfig(level);
      this.broadcastMetrics();
      this.onLevelStarted?.(level);
    };

    // 10. State changes and music transitions
    this.stateManager.subscribe((newState) => {
      if (newState === 'PLAYING') {
        if (this.dragonManager && this.dragonManager.hasActiveDragon()) {
          this.audioManager.playDragonMusic();
        } else {
          this.audioManager.startAmbientMusic();
        }
      } else if (newState === 'READY') {
        this.audioManager.playMenuMusic();
      } else if (newState === 'PAUSED') {
        this.audioManager.stopAmbientMusic();
      } else if (newState === 'GAME_OVER') {
        this.audioManager.musicManager.playGameOverMusic();
      }
    });
  }

  public jump(): boolean {
    if (this.stateManager.isPlaying() && this.player.state !== 'DEAD') {
      const jumped = this.player.jump();
      if (jumped) {
        this.audioManager.playJumpSound();
        this.broadcastMetrics();
        return true;
      }
    }
    return false;
  }

  public slide(): boolean {
    if (this.stateManager.isPlaying() && this.player.state !== 'DEAD') {
      const slid = this.player.slide();
      if (slid) {
        this.audioManager.playSlideSound();
        this.broadcastMetrics();
        return true;
      }
    }
    return false;
  }

  public moveLeft(): boolean {
    if (this.stateManager.isPlaying() && this.player.state !== 'DEAD') {
      const moved = this.player.moveLane(-1);
      if (moved) {
        this.audioManager.playLaneSwitchSound();
        this.broadcastMetrics();
        return true;
      }
    }
    return false;
  }

  public moveRight(): boolean {
    if (this.stateManager.isPlaying() && this.player.state !== 'DEAD') {
      const moved = this.player.moveLane(1);
      if (moved) {
        this.audioManager.playLaneSwitchSound();
        this.broadcastMetrics();
        return true;
      }
    }
    return false;
  }

  public shoot(preferSide?: 'LEFT' | 'RIGHT' | 'AUTO'): boolean {
    if (!this.stateManager.isPlaying() || this.player.state === 'DEAD') {
      return false;
    }

    if (this.isReloading) {
      return false;
    }

    if (this.ammo <= 0) {
      this.triggerReload();
      return false;
    }

    if (this.fireCooldownTimer > 0) {
      return false;
    }

    const spec = WEAPON_CONFIGS[this.activeWeapon] || WEAPON_CONFIGS.NORMAL;

    this.ammo -= 1;
    this.fireCooldownTimer = spec.fireCooldown;

    // Get muzzle position respecting left-side or twin-barrel alternation
    this.player.getMuzzleWorldPosition(this.tempMuzzlePos, preferSide);

    const bestTarget = this.enemyManager.findBestTarget(
      this.player.position,
      this.player.currentLaneIndex
    );

    const activeDragon = this.dragonManager.getActiveDragon();
    let fireDir = this.tempForwardDir;
    if (!bestTarget && activeDragon && activeDragon.mesh.position.z < this.player.position.z) {
      fireDir = activeDragon.mesh.position.clone().sub(this.tempMuzzlePos).normalize();
    }

    this.projectileManager.spawn(this.tempMuzzlePos, fireDir, bestTarget, this.activeWeapon);
    this.audioManager.playShootSound(this.activeWeapon);

    if (this.ammo <= 0) {
      if (this.activeWeapon === 'SPECIAL_BOMB') {
        // Special Star Bomb ammo depleted: revert to normal weapon
        this.activeWeapon = 'NORMAL';
        this.player.transformWeapon('NORMAL');
        this.ammo = WEAPON_CONFIGS.NORMAL.magazineSize;
        this.maxAmmo = WEAPON_CONFIGS.NORMAL.magazineSize;
        this.showMessage('Weapon: Normal Blaster', 1200, 'combat');
      } else {
        this.triggerReload();
      }
    }

    this.broadcastMetrics();
    return true;
  }

  public throwBomb(): boolean {
    if (!this.stateManager.isPlaying() || this.player.state === 'DEAD') {
      return false;
    }

    if (this.bombs <= 0 || this.bombManager.cooldownTimer > 0) {
      return false;
    }

    const thrown = this.bombManager.throwBomb(this.player.position);
    if (thrown) {
      this.bombs = this.bombManager.currentBombs;
      this.audioManager.playBombThrowSound();
      this.showMessage('EMP BOMB LAUNCHED', 1200, 'combat');
      this.broadcastMetrics();
      return true;
    }
    return false;
  }

  private handlePickupCollected(type: PickupType, _value: number, duration: number): void {
    switch (type) {
      case 'COIN': {
        const mult = (this.powerUpManager.isMultiplierActive() || this.pickupManager.isMultiplierActive()) ? 2 : 1;
        this.coins += 1 * mult;
        this.score += GAME_CONFIG.COIN_VALUE * mult;
        this.audioManager.playCoinSound();
        this.vfxManager.triggerCoinCollect(this.player.position);
        break;
      }
      case 'HEALTH': {
        this.playerHealthManager.heal(25);
        this.audioManager.playPickupSound('HEALTH');
        this.vfxManager.triggerPowerUpCollect(this.player.position, 0xef4444);
        this.showMessage('+25 HP RESTORED', 1800, 'gameplay');
        break;
      }
      case 'MAX_HEALTH': {
        this.playerHealthManager.upgradeMaxHealth(20);
        this.audioManager.playPickupSound('MAX_HEALTH');
        this.vfxManager.triggerPowerUpCollect(this.player.position, 0xf43f5e);
        this.showMessage(`MAX HEALTH UPGRADED (${this.playerHealthManager.maxHealth} HP)`, 2500, 'powerup');
        break;
      }
      case 'BOMB': {
        this.bombs = Math.min(this.maxBombs, this.bombs + 1);
        this.bombManager.currentBombs = this.bombs;
        this.audioManager.playPickupSound('BOMB');
        this.vfxManager.triggerPowerUpCollect(this.player.position, 0xa855f7);
        this.showMessage(`+1 EMP BOMB (${this.bombs}/${this.maxBombs})`, 1800, 'combat');
        break;
      }
      case 'BIG_BULLET': {
        this.activeWeapon = 'BIG_BULLET';
        this.weaponDurationRemaining = duration || BIG_BULLET_DURATION;
        this.weaponMaxDuration = this.weaponDurationRemaining;
        this.ammo = WEAPON_CONFIGS.BIG_BULLET.magazineSize;
        this.maxAmmo = WEAPON_CONFIGS.BIG_BULLET.magazineSize;
        this.isReloading = false;
        this.player.transformWeapon('BIG_BULLET');
        this.audioManager.playPickupSound('BIG_BULLET');
        this.vfxManager.triggerPowerUpCollect(this.player.position, 0xf59e0b);
        this.showMessage('HEAVY PLASMA CANNON (3x Damage)', 2500, 'combat');
        break;
      }
      case 'MACHINE_GUN': {
        this.activeWeapon = 'MACHINE_GUN';
        this.weaponDurationRemaining = duration || MACHINE_GUN_DURATION;
        this.weaponMaxDuration = this.weaponDurationRemaining;
        this.ammo = WEAPON_CONFIGS.MACHINE_GUN.magazineSize;
        this.maxAmmo = WEAPON_CONFIGS.MACHINE_GUN.magazineSize;
        this.isReloading = false;
        this.player.transformWeapon('MACHINE_GUN');
        this.audioManager.playPickupSound('MACHINE_GUN');
        this.vfxManager.triggerPowerUpCollect(this.player.position, 0xec4899);
        this.showMessage('PULSE GATLING (Rapid Fire)', 2500, 'combat');
        break;
      }
      case 'STAR': {
        this.activeWeapon = 'SPECIAL_BOMB';
        this.weaponDurationRemaining = 0; // Shot-based (5 explosive shots)
        this.weaponMaxDuration = 0;
        this.ammo = SPECIAL_SHOT_COUNT;
        this.maxAmmo = SPECIAL_SHOT_COUNT;
        this.isReloading = false;
        this.player.transformWeapon('SPECIAL_BOMB');
        this.audioManager.playPickupSound('STAR');
        this.vfxManager.triggerPowerUpCollect(this.player.position, 0xd946ef);
        this.showMessage('★ STAR POWER (5 Transformed Special Bombs)', 2500, 'combat');
        break;
      }
      case 'SHIELD': {
        this.playerHealthManager.activateShield(SHIELD_DURATION);
        this.audioManager.playShieldActivateSound();
        this.vfxManager.triggerPowerUpCollect(this.player.position, 0x10b981);
        this.showMessage('PROTECTIVE SHIELD ACTIVE', 2000, 'powerup');
        break;
      }
      case 'MAGNET': {
        this.player.setMagnetActive(true);
        this.audioManager.playPowerUpSound();
        this.vfxManager.triggerPowerUpCollect(this.player.position, 0x06b6d4);
        this.showMessage('MAGNET ACTIVE', 2000, 'powerup');
        break;
      }
      case 'COIN_MULTIPLIER': {
        this.audioManager.playMultiplierSound();
        this.vfxManager.triggerPowerUpCollect(this.player.position, 0xeab308);
        this.showMessage('2X CREDIT MULTIPLIER ACTIVE', 2000, 'powerup');
        break;
      }
    }
    this.broadcastMetrics();
  }

  public triggerReload(): void {
    if (this.isReloading || this.ammo === this.maxAmmo) return;
    this.isReloading = true;
    this.reloadTimer = GAME_CONFIG.COMBAT.RELOAD_TIME;
    this.audioManager.playReloadSound();
    this.broadcastMetrics();
  }

  /**
   * Inflict damage on player from obstacle, projectile, or enemy collision.
   * Centralized through PlayerHealthManager (Unified Lifespan & Shield system).
   */
  public handlePlayerCollisionDamage(
    amount: number = OBSTACLE_COLLISION_DAMAGE,
    source: DamageSource = 'OBSTACLE'
  ): void {
    if (this.player.state === 'DEAD' || !this.stateManager.isPlaying()) {
      return;
    }
    this.playerHealthManager.takeDamage(amount, source);
  }

  private seedInitialCoins(): void {
    this.coinManager.populateTrackSection(-15, 'STRAIGHT');
    this.coinManager.populateTrackSection(-48, 'CURVE');
    this.coinManager.populateTrackSection(-85, 'JUMP_PATH');
    this.coinManager.populateTrackSection(-120, 'ZIGZAG');
  }

  public startGame(): void {
    this.audioManager.unlock();
    this.audioManager.playStartSound();

    this.stateManager.setState('PLAYING');

    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.gameLoop(this.lastTime);
    }
  }

  public pause(): void {
    if (this.stateManager.setState('PAUSED')) {
      this.audioManager.playClickSound();
    }
  }

  public resume(): void {
    if (this.stateManager.setState('PLAYING')) {
      this.lastTime = performance.now();
      this.audioManager.playClickSound();
    }
  }

  public showMessage(
    text: string,
    duration: number = 3000,
    type: MessageType = 'gameplay',
    priority: number = 1,
    subtext?: string
  ): void {
    this.messageManager.showMessage(text, duration, type, priority, subtext);
  }

  public hideMessage(): void {
    this.messageManager.hideMessage();
  }

  public restart(): void {
    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.currentSpeed = GAME_CONFIG.BASE_SPEED;

    this.activeWeapon = 'NORMAL';
    this.weaponDurationRemaining = 0;
    this.weaponMaxDuration = 0;
    this.bombs = STARTING_BOMBS;
    this.ammo = STARTING_AMMO;
    this.maxAmmo = STARTING_AMMO;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.fireCooldownTimer = 0;

    this.playerHealthManager.reset(PLAYER_STARTING_HEALTH, PLAYER_MAX_HEALTH);
    this.health = this.playerHealthManager.currentHealth;
    this.maxHealth = this.playerHealthManager.maxHealth;
    this.enemyProjectileManager.reset();

    this.player.reset();
    this.player.transformWeapon('NORMAL');
    this.obstacleManager.reset();
    this.enemyManager.reset();
    this.humanShooterManager.reset();
    this.dragonManager.reset();
    this.runId = 'run_' + Date.now();
    this.lastDragonSpawnDistance = 0;
    this.powerUpManager.reset();
    this.pickupManager.reset();
    this.bombManager.reset(STARTING_BOMBS);
    this.projectileManager.reset();
    this.trackManager.reset();
    this.coinManager.reset();
    this.vfxManager.reset();
    this.messageManager.reset();
    this.cameraController.reset(this.player.position);
    this.sceneManager.updateLightPosition(0);

    this.seedInitialCoins();
    this.isLevelCompleteTriggered = false;
    this.tookDamageInLevel = false;
    this.enemiesDefeatedCount = 0;
    this.levelManager.startLevel(this.levelManager.currentLevel.levelNumber);
    this.applyLevelConfig(this.levelManager.currentLevel);
    this.broadcastMetrics();

    this.startGame();
  }

  public goHome(): void {
    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.currentSpeed = GAME_CONFIG.BASE_SPEED;

    this.activeWeapon = 'NORMAL';
    this.weaponDurationRemaining = 0;
    this.weaponMaxDuration = 0;
    this.bombs = STARTING_BOMBS;
    this.ammo = STARTING_AMMO;
    this.maxAmmo = STARTING_AMMO;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.fireCooldownTimer = 0;

    this.playerHealthManager.reset(PLAYER_STARTING_HEALTH, PLAYER_MAX_HEALTH);
    this.health = this.playerHealthManager.currentHealth;
    this.maxHealth = this.playerHealthManager.maxHealth;
    this.enemyProjectileManager.reset();

    this.player.reset();
    this.player.transformWeapon('NORMAL');
    this.obstacleManager.reset();
    this.enemyManager.reset();
    this.humanShooterManager.reset();
    this.dragonManager.reset();
    this.runId = 'run_' + Date.now();
    this.lastDragonSpawnDistance = 0;
    this.powerUpManager.reset();
    this.pickupManager.reset();
    this.bombManager.reset(STARTING_BOMBS);
    this.projectileManager.reset();
    this.trackManager.reset();
    this.coinManager.reset();
    this.vfxManager.reset();
    this.messageManager.reset();
    this.cameraController.reset(this.player.position);
    this.sceneManager.updateLightPosition(0);

    this.seedInitialCoins();
    this.isLevelCompleteTriggered = false;
    this.tookDamageInLevel = false;
    this.enemiesDefeatedCount = 0;
    this.levelManager.startLevel(this.levelManager.currentLevel.levelNumber);
    this.applyLevelConfig(this.levelManager.currentLevel);
    this.broadcastMetrics();

    this.stateManager.setState('READY');
  }

  private gameLoop = (currentTime: number): void => {
    this.animationFrameId = requestAnimationFrame(this.gameLoop);

    const rawDelta = (currentTime - this.lastTime) / 1000;
    const delta = Math.min(rawDelta, 0.08);
    this.lastTime = currentTime;

    const isPlaying = this.stateManager.isPlaying();

    // 1. Advance Gameplay when PLAYING
    if (isPlaying && this.player.state !== 'DEAD') {
      const level = this.levelManager.currentLevel;
      this.currentSpeed = Math.min(
        level.maximumSpeed,
        level.startingSpeed + (this.distance / 100) * level.speedAcceleration
      );

      // Achievements on speed & distance
      if (this.currentSpeed >= 26) {
        this.achievementManager.unlock('SPEED_DEMON');
      }
      if (this.distance >= 350) {
        this.achievementManager.unlock('DISTANCE_RUNNER');
      }

      const forwardDistance = this.currentSpeed * delta;
      this.player.mesh.position.z -= forwardDistance;
      this.distance += forwardDistance;
      this.score += Math.floor(forwardDistance * 0.5);

      // Track recycling
      this.trackManager.update(this.player.position.z, (newZPos) => {
        if (Math.random() > 0.25) {
          this.coinManager.populateTrackSection(newZPos);
        }
      });

      // Update coins with magnet attraction
      const isMagnet = this.powerUpManager.isMagnetActive() || this.pickupManager.isMagnetActive();
      this.coinManager.update(delta, this.player.position, isMagnet);

      // Update power-ups & pickups
      this.powerUpManager.update(delta, this.player.position, isPlaying);
      this.pickupManager.update(delta, this.player.position, isPlaying, isMagnet);

      // Update obstacles & check collision
      this.obstacleManager.update(this.player.position.z, this.player.getBoundingBox(), isPlaying, delta);

      // Update Dragon Boss and Thrown Projectiles
      this.dragonManager.update(delta, this.player.position.z, this.player.getBoundingBox(), isPlaying);

      // Check dynamic Dragon Boss Spawning:
      // Spawns smoothly after 80m and every ~280m interval if no dragon is currently active
      if (
        isPlaying &&
        !this.dragonManager.hasActiveDragon() &&
        this.distance >= 80 &&
        this.distance - this.lastDragonSpawnDistance >= 280
      ) {
        this.dragonManager.spawnDragon(this.player.position.z, DRAGON_HEALTH);
        this.lastDragonSpawnDistance = this.distance;
      }

      // Check player collision with landed thrown dragon obstacles
      if (isPlaying && !this.player.isInvulnerable) {
        const playerBox = this.player.getBoundingBox();
        for (let i = 0; i < this.dragonManager.thrownPool.length; i++) {
          const item = this.dragonManager.thrownPool[i];
          if (!item.isActive || item.isFlying) continue;
          if (playerBox.intersectsBox(item.boundingBox)) {
            this.handlePlayerCollisionDamage(DRAGON_PROJECTILE_DAMAGE, 'DRAGON_HAZARD');
            this.dragonManager.destroyThrownObstacle(item);
            break;
          }
        }
      }

      // Update enemies
      this.enemyManager.update(delta, this.player.position, isPlaying);

      // Update human shooter enemies (Phase 14)
      this.humanShooterManager.update(delta, this.player.position, this.player.currentLaneIndex, isPlaying);

      // Update incoming enemy projectiles
      this.enemyProjectileManager.update(delta, this.player.position, this.player.getBoundingBox(), isPlaying);

      // Update player health lifespan and shield countdown
      this.playerHealthManager.update(delta);

      // Update bombs & blast area (enemies, destructible obstacles, dragon & thrown hazards)
      this.bombManager.update(
        delta,
        this.enemyManager.pool,
        this.obstacleManager.pool,
        this.dragonManager.getActiveDragon(),
        this.dragonManager.thrownPool
      );

      // Check player vs enemy collision
      if (!this.player.isInvulnerable) {
        const playerBox = this.player.getBoundingBox();
        for (let i = 0; i < this.enemyManager.pool.length; i++) {
          const enemy = this.enemyManager.pool[i];
          if (!enemy.isActive || enemy.isDefeated) continue;

          if (playerBox.intersectsBox(enemy.boundingBox)) {
            this.handlePlayerCollisionDamage(ENEMY_COLLISION_DAMAGE, 'ENEMY_COLLISION');
            this.enemyManager.hitEnemy(enemy, 50);
            break;
          }
        }

        // Check player vs human shooter collision
        for (let i = 0; i < this.humanShooterManager.pool.length; i++) {
          const shooter = this.humanShooterManager.pool[i];
          if (!shooter.isActive || shooter.isDefeated) continue;

          if (playerBox.intersectsBox(shooter.boundingBox)) {
            this.handlePlayerCollisionDamage(ENEMY_COLLISION_DAMAGE, 'ENEMY_COLLISION');
            this.humanShooterManager.damageShooter(shooter, 40);
            break;
          }
        }
      }

      // Update projectiles & hits (enemies, obstacles, dragon, thrown hazards, enemy projectiles)
      this.projectileManager.update(
        delta,
        this.enemyManager.pool,
        (enemy, proj) => {
          this.audioManager.playHitSound();
          this.enemyManager.hitEnemy(enemy, proj.damage);
        },
        this.obstacleManager.pool,
        (obs, proj) => {
          this.audioManager.playHitSound();
          this.obstacleManager.damageObstacle(obs, proj.damage);
        },
        this.dragonManager.getActiveDragon(),
        (dragon, proj) => {
          this.dragonManager.hitDragon(dragon, proj.damage);
        },
        this.dragonManager.thrownPool,
        (thrown, proj) => {
          this.audioManager.playHitSound();
          this.dragonManager.damageThrownObstacle(thrown, proj.damage);
        },
        this.enemyProjectileManager.pool,
        (ep, proj) => {
          this.audioManager.playHitSound();
          this.enemyProjectileManager.destroyProjectile(ep);
          this.score += 25;
          this.broadcastMetrics();
        }
      );

      // Check player projectiles against human shooters
      for (let p = 0; p < this.projectileManager.pool.length; p++) {
        const proj = this.projectileManager.pool[p];
        if (!proj.isActive) continue;

        for (let h = 0; h < this.humanShooterManager.pool.length; h++) {
          const shooter = this.humanShooterManager.pool[h];
          if (!shooter.isActive || shooter.isDefeated) continue;

          if (proj.boundingBox.intersectsBox(shooter.boundingBox)) {
            this.audioManager.playHitSound();
            this.humanShooterManager.damageShooter(shooter, proj.damage);
            this.projectileManager.deactivate(proj);
            break;
          }
        }
      }

      // Weapon duration countdown
      if (this.activeWeapon !== 'NORMAL') {
        this.weaponDurationRemaining -= delta;
        if (this.weaponDurationRemaining <= 0) {
          this.activeWeapon = 'NORMAL';
          this.player.transformWeapon('NORMAL');
          this.weaponDurationRemaining = 0;
          this.weaponMaxDuration = 0;
          this.maxAmmo = WEAPON_CONFIGS.NORMAL.magazineSize;
          this.ammo = Math.min(this.ammo, this.maxAmmo);
          this.showMessage('Weapon: Normal Blaster', 1500, 'combat');
          this.broadcastMetrics();
        }
      }

      // Combat cooldown timers
      if (this.fireCooldownTimer > 0) {
        this.fireCooldownTimer -= delta;
      }

      if (this.isReloading) {
        this.reloadTimer -= delta;
        if (this.reloadTimer <= 0) {
          this.isReloading = false;
          this.ammo = this.maxAmmo;
          this.reloadTimer = 0;
          this.broadcastMetrics();
        }
      }

      // Target lock assist
      this.currentTargetEnemy = this.enemyManager.findBestTarget(
        this.player.position,
        this.player.currentLaneIndex
      );

      // Update directional light
      this.sceneManager.updateLightPosition(this.player.position.z);

      // Update visual effects & speed lines
      this.vfxManager.update(delta, this.currentSpeed, this.player.position.z);

      // Level Progression: Advance distance and check completion conditions
      const levelProgress = this.levelManager.update(this.distance, delta, {
        score: this.score,
        coins: this.coins,
        enemiesDefeated: this.enemiesDefeatedCount,
        bombsUsed: 0,
      });

      if (levelProgress.isComplete && !this.isLevelCompleteTriggered) {
        this.isLevelCompleteTriggered = true;
        const completionStats = this.levelManager.completeLevel({
          distance: this.distance,
          score: this.score,
          coins: this.coins,
          xp: Math.floor(this.score * 0.1),
          enemiesDefeated: this.enemiesDefeatedCount,
          bombsUsed: 0,
          tookDamage: this.tookDamageInLevel,
        });

        this.coins += completionStats.coinsEarned;
        this.score += completionStats.xpEarned * 10;
        this.audioManager.playPowerUpSound();
      }

      this.broadcastMetrics();
    }

    // 2. Character kinematics
    this.player.update(delta, isPlaying, this.currentSpeed);

    // 3. Smooth 3rd-person chase camera
    this.cameraController.update(delta, this.player.position);

    // 4. Render 3D Frame
    this.sceneManager.render();
  };

  private broadcastMetrics(): void {
    if (this.onMetricsUpdate) {
      const powerUps = [...this.powerUpManager.getActivePowerUps()];
      this.pickupManager.getActiveEffects().forEach((eff) => {
        if (!powerUps.some((p) => p.type === eff.type)) {
          powerUps.push({
            type: eff.type as any,
            name: eff.name,
            color: eff.color,
            remainingDuration: eff.remainingDuration,
            maxDuration: eff.maxDuration,
          });
        }
      });

      // Ensure active shield energy globe is represented in active powerups
      if (this.playerHealthManager.isShieldActive && !powerUps.some((p) => p.type === 'SHIELD')) {
        powerUps.unshift({
          type: 'SHIELD',
          name: 'Energy Globe',
          color: 0x10b981,
          remainingDuration: this.playerHealthManager.shieldDurationRemaining,
          maxDuration: this.playerHealthManager.shieldMaxDuration,
        });
      }

      this.onMetricsUpdate({
        score: this.score,
        coins: this.coins,
        distance: Math.floor(this.distance),
        speed: Math.round(this.currentSpeed),
        currentLane: this.player.currentLaneIndex,
        highScore: this.highScore,
        playerState: this.player.state,
        health: this.health,
        maxHealth: this.maxHealth,
        ammo: this.ammo,
        maxAmmo: this.maxAmmo,
        isReloading: this.isReloading,
        hasTargetLock: !!this.currentTargetEnemy,
        targetEnemyName: this.currentTargetEnemy ? this.currentTargetEnemy.type : undefined,
        weapon: {
          type: this.activeWeapon,
          name: WEAPON_CONFIGS[this.activeWeapon].name,
          damage: WEAPON_CONFIGS[this.activeWeapon].damage,
          ammo: this.ammo,
          maxAmmo: this.maxAmmo,
          isReloading: this.isReloading,
          remainingDuration: this.weaponDurationRemaining,
          maxDuration: this.weaponMaxDuration,
          hudLabel: WEAPON_CONFIGS[this.activeWeapon].hudLabel,
        },
        bombs: this.bombs,
        maxBombs: this.maxBombs,
        activePowerUps: powerUps,
        currentMessage: this.messageManager.getCurrentMessage(),
        levelProgress: this.levelManager.runtimeProgress,
        currentLevel: this.levelManager.currentLevel,
        dragonStatus: (() => {
          const activeDragon = this.dragonManager.getActiveDragon();
          if (!activeDragon) return null;
          return {
            isActive: true,
            health: activeDragon.health,
            maxHealth: activeDragon.maxHealth,
            isCharging: activeDragon.state === 'CHARGING',
            state: activeDragon.state,
          };
        })(),
        shieldStatus: {
          isActive: this.playerHealthManager.isShieldActive,
          remainingDuration: this.playerHealthManager.shieldDurationRemaining,
          maxDuration: this.playerHealthManager.shieldMaxDuration,
          isExpiringSoon: this.playerHealthManager.isShieldExpiringSoon(),
        },
        canRewardedRetry: this.canUseRewardedRetry(),
        remainingRewardedRetries: this.getRemainingRewardedRetries(),
      });
    }
  }

  public canUseRewardedRetry(): boolean {
    return AdManager.getInstance().canUseRewardedRetry(this.runId);
  }

  public getRemainingRewardedRetries(): number {
    return AdManager.getInstance().getRemainingRewardedRetries(this.runId);
  }

  public revivePlayerWithReward(): boolean {
    if (!this.canUseRewardedRetry()) return false;
    AdManager.getInstance().recordRewardedRetryUsed(this.runId);

    // 1. Restore health (50% of max health)
    const restoreAmount = Math.round(
      (this.playerHealthManager.maxHealth * REWARDED_RETRY_CONFIG.restoreHealthPercent) / 100
    );
    this.playerHealthManager.reset(restoreAmount, this.playerHealthManager.maxHealth);
    this.health = this.playerHealthManager.currentHealth;
    this.maxHealth = this.playerHealthManager.maxHealth;

    // 2. Grant temporary revival invulnerability & shield globe
    this.player.setInvulnerable(REWARDED_RETRY_CONFIG.revivalInvulnerabilitySeconds);
    this.playerHealthManager.activateShield(SHIELD_DURATION);

    // 3. Clear nearby hostile projectiles & clear immediate obstacles
    this.enemyProjectileManager.reset();

    const playerZ = this.player.position.z;
    for (const obs of this.obstacleManager.pool) {
      if (obs.isActive && obs.mesh.position.z < playerZ && obs.mesh.position.z > playerZ - 25) {
        this.obstacleManager.damageObstacle(obs, 9999);
      }
    }

    // 4. Reset player state from DEAD back to RUNNING
    this.player.state = 'RUNNING';
    this.player.isGrounded = true;
    this.player.verticalVelocity = 0;
    this.player.mesh.position.y = 0;
    this.player.mesh.rotation.set(0, 0, 0);

    // 5. Resume game state to PLAYING
    this.stateManager.setState('PLAYING');
    this.audioManager.musicManager.transitionToGameplayMusic();
    this.showMessage('🛡️ RUN REVIVED! 50% HP + ENERGY SHIELD ACTIVE', 2500, 'powerup');
    this.broadcastMetrics();

    return true;
  }

  public startLevel(levelNumberOrId: number | string): LevelDefinition {
    this.runId = 'run_' + Date.now();
    this.restart();
    const level = this.levelManager.startLevel(levelNumberOrId);
    this.applyLevelConfig(level);
    this.broadcastMetrics();
    return level;
  }

  public restartCurrentLevel(): LevelDefinition {
    return this.startLevel(this.levelManager.currentLevel.levelNumber);
  }

  public startNextLevel(): LevelDefinition {
    const nextNum = this.levelManager.currentLevel.levelNumber + 1;
    return this.startLevel(nextNum);
  }

  public dispose(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.inputManager.dispose();
    this.messageManager.dispose();
    this.vfxManager.dispose();
    this.powerUpManager.dispose();
    this.pickupManager.dispose();
    this.dragonManager.dispose();
    this.bombManager.dispose();
    this.projectileManager.dispose();
    this.enemyManager.dispose();
    this.humanShooterManager.dispose();
    this.obstacleManager.dispose();
    this.coinManager.dispose();
    this.trackManager.dispose();
    this.audioManager.dispose();
    this.sceneManager.dispose();
  }
}
