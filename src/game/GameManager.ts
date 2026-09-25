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
import { LanguageChallengeManager } from './language/LanguageChallengeManager';
import { LanguageCode, LanguageChallengeState, LearningItem, LearningProgress, LanguageDifficulty, AITeacherStatus } from './language/types';
import { CameraController } from './CameraController';
import { InputManager } from './InputManager';
import { AudioManager } from './AudioManager';

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
  activePowerUps: ActivePowerUpState[];
  currentMessage?: TemporaryMessageState | null;
  languageChallenge?: {
    state: LanguageChallengeState;
    item: LearningItem | null;
    progress: LearningProgress;
    aiTeacherStatus?: AITeacherStatus;
  };
}

export type MetricsCallback = (metrics: GameMetrics) => void;

const HIGH_SCORE_KEY = 'language_runner_high_score';
const SETTINGS_STORAGE_KEY = 'language_runner_settings';

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
  public languageManager: LanguageChallengeManager;
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
  public health: number = GAME_CONFIG.COMBAT.PLAYER_MAX_HEALTH;
  public maxHealth: number = GAME_CONFIG.COMBAT.PLAYER_MAX_HEALTH;
  public ammo: number = GAME_CONFIG.COMBAT.STARTING_AMMO;
  public maxAmmo: number = GAME_CONFIG.COMBAT.MAGAZINE_SIZE;
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
    this.vfxManager = new VFXManager(this.sceneManager.scene);
    this.achievementManager = new AchievementManager();
    this.messageManager = new TemporaryMessageManager();
    this.messageManager.onMessageChanged = () => this.broadcastMetrics();
    this.languageManager = new LanguageChallengeManager();
    this.cameraController = new CameraController(this.sceneManager.camera);
    this.inputManager = new InputManager(container);

    // Apply loaded settings
    this.applySettings(this.settings);

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
    this.audioManager.setMusicEnabled(settings.musicEnabled);
    this.audioManager.setSoundEnabled(settings.soundEnabled);
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
    this.inputManager.onShoot = () => this.shoot();

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
      const multiplier = this.powerUpManager.getCoinMultiplier();
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
        this.player.setShieldActive(true);
      } else if (type === 'MAGNET') {
        this.player.setMagnetActive(true);
      }

      this.achievementManager.unlock('POWER_SURGE');
      this.broadcastMetrics();
    };

    this.powerUpManager.onPowerUpExpired = (type) => {
      if (type === 'SHIELD') {
        this.player.setShieldActive(false);
      } else if (type === 'MAGNET') {
        this.player.setMagnetActive(false);
      }
      this.broadcastMetrics();
    };

    // 5. Obstacle collision hook
    this.obstacleManager.onCollision = (_obstacle: ObstacleInstance) => {
      this.handlePlayerCollisionDamage();
    };

    // 6. Enemy hooks
    this.enemyManager.onEnemySpawned = (enemy: EnemyInstance) => {
      this.onEnemySpawned?.(enemy);
    };

    this.enemyManager.onEnemyHit = (enemy: EnemyInstance, remaining: number) => {
      this.onEnemyHit?.(enemy, remaining);
    };

    this.enemyManager.onEnemyDefeated = (enemy: EnemyInstance) => {
      this.score += enemy.scoreReward;
      this.coins += enemy.coinReward;
      this.enemiesDefeatedCount++;

      this.audioManager.playDefeatSound();
      this.vfxManager.triggerEnemyDefeat(enemy.mesh.position);
      this.onEnemyDefeated?.(enemy);

      if (this.enemiesDefeatedCount >= 10) {
        this.achievementManager.unlock('CYBER_DEFENDER');
      }

      this.broadcastMetrics();
    };

    // 7. Language challenge hooks
    this.languageManager.onChallengeStateChanged = () => {
      this.broadcastMetrics();
    };

    this.languageManager.onProgressUpdated = () => {
      this.broadcastMetrics();
    };

    this.languageManager.onAITeacherStatusChanged = () => {
      this.broadcastMetrics();
    };

    this.languageManager.onLanguageChallengeCompleted = (_item, rewardCoins, _rewardXP) => {
      this.coins += rewardCoins;
      this.score += rewardCoins * 10;
      this.audioManager.playCoinSound();
      this.broadcastMetrics();
    };

    // 8. State changes
    this.stateManager.subscribe((newState) => {
      if (newState === 'PLAYING') {
        this.audioManager.startAmbientMusic();
      } else if (newState === 'PAUSED' || newState === 'READY' || newState === 'GAME_OVER') {
        this.audioManager.stopAmbientMusic();
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

  public shoot(): boolean {
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

    this.ammo -= 1;
    this.fireCooldownTimer = GAME_CONFIG.COMBAT.FIRE_COOLDOWN;

    this.player.getMuzzleWorldPosition(this.tempMuzzlePos);

    const bestTarget = this.enemyManager.findBestTarget(
      this.player.position,
      this.player.currentLaneIndex
    );

    this.projectileManager.spawn(this.tempMuzzlePos, this.tempForwardDir, bestTarget);
    this.audioManager.playShootSound();

    if (this.ammo <= 0) {
      this.triggerReload();
    }

    this.broadcastMetrics();
    return true;
  }

  public triggerReload(): void {
    if (this.isReloading || this.ammo === this.maxAmmo) return;
    this.isReloading = true;
    this.reloadTimer = GAME_CONFIG.COMBAT.RELOAD_TIME;
    this.audioManager.playReloadSound();
    this.broadcastMetrics();
  }

  /**
   * Inflict damage on player from obstacle or enemy collision
   */
  public handlePlayerCollisionDamage(amount: number = 1): void {
    if (this.player.isInvulnerable || this.player.state === 'DEAD' || !this.stateManager.isPlaying()) {
      return;
    }

    // Shield check: protects player from 1 hit!
    if (this.powerUpManager.consumeShield()) {
      this.player.setShieldActive(false);
      this.audioManager.playShieldAbsorbSound();
      this.player.triggerDamage(0.6); // brief invulnerability flash
      this.broadcastMetrics();
      return;
    }

    this.health = Math.max(0, this.health - amount);
    this.audioManager.playPlayerDamageSound();
    this.player.triggerDamage();
    this.onPlayerDamaged?.(this.health);
    this.onPlayerHealthChanged?.(this.health, this.maxHealth);

    if (this.health <= 0) {
      this.player.die();
      this.audioManager.playCrashSound();
      this.audioManager.playGameOverSound();
      this.saveHighScore(this.score);
      this.achievementManager.unlock('FIRST_RUN');
      this.stateManager.setState('GAME_OVER');
    }

    this.broadcastMetrics();
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

    this.health = this.maxHealth;
    this.ammo = this.maxAmmo;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.fireCooldownTimer = 0;

    this.player.reset();
    this.obstacleManager.reset();
    this.enemyManager.reset();
    this.powerUpManager.reset();
    this.projectileManager.reset();
    this.trackManager.reset();
    this.coinManager.reset();
    this.vfxManager.reset();
    this.messageManager.reset();
    this.languageManager.reset();
    this.cameraController.reset(this.player.position);
    this.sceneManager.updateLightPosition(0);

    this.seedInitialCoins();
    this.broadcastMetrics();

    this.startGame();
  }

  public goHome(): void {
    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.currentSpeed = GAME_CONFIG.BASE_SPEED;

    this.health = this.maxHealth;
    this.ammo = this.maxAmmo;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.fireCooldownTimer = 0;

    this.player.reset();
    this.obstacleManager.reset();
    this.enemyManager.reset();
    this.powerUpManager.reset();
    this.projectileManager.reset();
    this.trackManager.reset();
    this.coinManager.reset();
    this.vfxManager.reset();
    this.messageManager.reset();
    this.languageManager.reset();
    this.cameraController.reset(this.player.position);
    this.sceneManager.updateLightPosition(0);

    this.seedInitialCoins();
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
      this.currentSpeed = Math.min(
        GAME_CONFIG.MAX_SPEED,
        GAME_CONFIG.BASE_SPEED + (this.distance / 100) * GAME_CONFIG.SPEED_ACCELERATION
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
      const isMagnet = this.powerUpManager.isMagnetActive();
      this.coinManager.update(delta, this.player.position, isMagnet);

      // Update power-ups
      this.powerUpManager.update(delta, this.player.position, isPlaying);

      // Update obstacles & check collision
      this.obstacleManager.update(this.player.position.z, this.player.getBoundingBox(), isPlaying, delta);

      // Update enemies
      this.enemyManager.update(delta, this.player.position, isPlaying);

      // Check player vs enemy collision
      if (!this.player.isInvulnerable) {
        const playerBox = this.player.getBoundingBox();
        for (let i = 0; i < this.enemyManager.pool.length; i++) {
          const enemy = this.enemyManager.pool[i];
          if (!enemy.isActive || enemy.isDefeated) continue;

          if (playerBox.intersectsBox(enemy.boundingBox)) {
            this.handlePlayerCollisionDamage(1);
            this.enemyManager.hitEnemy(enemy, 1);
            break;
          }
        }
      }

      // Update projectiles & hits
      this.projectileManager.update(delta, this.enemyManager.pool, (enemy, proj) => {
        this.audioManager.playHitSound();
        this.enemyManager.hitEnemy(enemy, proj.damage);
      });

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

      // Update language challenge pacing along track
      this.languageManager.update(delta, this.distance, isPlaying);

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
        activePowerUps: this.powerUpManager.getActivePowerUps(),
        currentMessage: this.messageManager.getCurrentMessage(),
        languageChallenge: {
          state: this.languageManager.state,
          item: this.languageManager.currentItem,
          progress: this.languageManager.progress,
          aiTeacherStatus: this.languageManager.getAITeacherStatus(),
        },
      });
    }
  }

  public setLanguage(code: LanguageCode): void {
    this.languageManager.setTargetLanguage(code);
    this.broadcastMetrics();
  }

  public setLanguageDifficulty(difficulty: LanguageDifficulty): void {
    this.languageManager.setDifficulty(difficulty);
    this.broadcastMetrics();
  }

  public setLanguageCategory(category: string): void {
    this.languageManager.setCategory(category);
    this.broadcastMetrics();
  }

  public setUseAITeacher(enabled: boolean): void {
    this.languageManager.setUseAITeacher(enabled);
    this.broadcastMetrics();
  }

  public playLanguagePronunciation(): void {
    this.languageManager.triggerAudioPronunciation();
  }

  public completeLanguageChallenge(): void {
    this.languageManager.completeChallenge();
  }

  public skipLanguageChallenge(): void {
    this.languageManager.skipChallenge();
  }

  public dispose(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.inputManager.dispose();
    this.languageManager.dispose();
    this.messageManager.dispose();
    this.vfxManager.dispose();
    this.powerUpManager.dispose();
    this.projectileManager.dispose();
    this.enemyManager.dispose();
    this.obstacleManager.dispose();
    this.coinManager.dispose();
    this.trackManager.dispose();
    this.audioManager.dispose();
    this.sceneManager.dispose();
  }
}
