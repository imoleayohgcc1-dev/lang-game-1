import * as THREE from 'three';
import { GAME_CONFIG, GameState, PlayerState } from './constants';
import { GameStateManager } from './GameStateManager';
import { SceneManager } from './SceneManager';
import { Player } from './Player';
import { TrackManager } from './TrackManager';
import { CoinManager, CoinInstance } from './CoinManager';
import { ObstacleManager, ObstacleInstance } from './ObstacleManager';
import { ProjectileManager, ProjectileInstance } from './ProjectileManager';
import { EnemyManager, EnemyInstance } from './EnemyManager';
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
}

export type MetricsCallback = (metrics: GameMetrics) => void;

const HIGH_SCORE_KEY = 'language_runner_high_score';

export class GameManager {
  public stateManager: GameStateManager;
  public sceneManager: SceneManager;
  public player: Player;
  public trackManager: TrackManager;
  public coinManager: CoinManager;
  public obstacleManager: ObstacleManager;
  public projectileManager: ProjectileManager;
  public enemyManager: EnemyManager;
  public cameraController: CameraController;
  public inputManager: InputManager;
  public audioManager: AudioManager;

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
    this.cameraController = new CameraController(this.sceneManager.camera);
    this.inputManager = new InputManager(container);

    this.setupHooks();

    // Spawn initial coins along track
    this.seedInitialCoins();

    // Set to READY state once fully loaded
    this.stateManager.setState('READY');
    this.broadcastMetrics();
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
      if (Math.random() > 0.3) {
        this.coinManager.populateTrackSection(newZPos, 3);
      }
    });

    // 3. Coin collection hook
    this.coinManager.onCoinCollected = (_coin: CoinInstance) => {
      this.coins += 1;
      this.score += GAME_CONFIG.COIN_VALUE;
      this.audioManager.playCoinSound();
      this.broadcastMetrics();
    };

    // 4. Obstacle collision hook
    this.obstacleManager.onCollision = (_obstacle: ObstacleInstance) => {
      this.handlePlayerCollisionDamage();
    };

    // 5. Enemy hooks
    this.enemyManager.onEnemySpawned = (enemy: EnemyInstance) => {
      this.onEnemySpawned?.(enemy);
    };

    this.enemyManager.onEnemyHit = (enemy: EnemyInstance, remaining: number) => {
      this.onEnemyHit?.(enemy, remaining);
    };

    this.enemyManager.onEnemyDefeated = (enemy: EnemyInstance) => {
      this.score += enemy.scoreReward;
      this.coins += enemy.coinReward;
      this.audioManager.playDefeatSound();
      this.onEnemyDefeated?.(enemy);
      this.broadcastMetrics();
    };

    // 6. State changes
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

  /**
   * Shoot a laser projectile towards enemies with target assistance
   */
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

    // Spend ammunition
    this.ammo -= 1;
    this.fireCooldownTimer = GAME_CONFIG.COMBAT.FIRE_COOLDOWN;

    // Locate muzzle position from player weapon
    this.player.getMuzzleWorldPosition(this.tempMuzzlePos);

    // Target assist search
    const bestTarget = this.enemyManager.findBestTarget(
      this.player.position,
      this.player.currentLaneIndex
    );

    // Spawn projectile in 3D scene
    this.projectileManager.spawn(this.tempMuzzlePos, this.tempForwardDir, bestTarget);

    // Sound effect
    this.audioManager.playShootSound();

    // Automatic reload trigger on empty magazine
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

    this.health = Math.max(0, this.health - amount);
    this.audioManager.playPlayerDamageSound();
    this.player.triggerDamage();
    this.onPlayerDamaged?.(this.health);
    this.onPlayerHealthChanged?.(this.health, this.maxHealth);

    if (this.health <= 0) {
      // Game Over sequence
      this.player.die();
      this.audioManager.playCrashSound();
      this.audioManager.playGameOverSound();
      this.saveHighScore(this.score);
      this.stateManager.setState('GAME_OVER');
    }

    this.broadcastMetrics();
  }

  private seedInitialCoins(): void {
    // Seed clusters of coins down the track ahead of player
    this.coinManager.populateTrackSection(-15, 3);
    this.coinManager.populateTrackSection(-48, 4);
    this.coinManager.populateTrackSection(-85, 3);
    this.coinManager.populateTrackSection(-120, 4);
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
    this.projectileManager.reset();
    this.trackManager.reset();
    this.coinManager.reset();
    this.cameraController.reset(this.player.position);
    this.sceneManager.updateLightPosition(0);

    this.seedInitialCoins();
    this.broadcastMetrics();

    // Start playing immediately on restart
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
    this.projectileManager.reset();
    this.trackManager.reset();
    this.coinManager.reset();
    this.cameraController.reset(this.player.position);
    this.sceneManager.updateLightPosition(0);

    this.seedInitialCoins();
    this.broadcastMetrics();

    this.stateManager.setState('READY');
  }

  private gameLoop = (currentTime: number): void => {
    this.animationFrameId = requestAnimationFrame(this.gameLoop);

    // Delta time in seconds with safe ceiling (prevents huge delta on tab unfocus)
    const rawDelta = (currentTime - this.lastTime) / 1000;
    const delta = Math.min(rawDelta, 0.08);
    this.lastTime = currentTime;

    const isPlaying = this.stateManager.isPlaying();

    // 1. Advance Gameplay when PLAYING
    if (isPlaying && this.player.state !== 'DEAD') {
      // Accelerate forward speed slightly over time (Difficulty Scaling)
      this.currentSpeed = Math.min(
        GAME_CONFIG.MAX_SPEED,
        GAME_CONFIG.BASE_SPEED + (this.distance / 100) * GAME_CONFIG.SPEED_ACCELERATION
      );

      // Player forward progression (negative Z in Three.js coordinate system)
      const forwardDistance = this.currentSpeed * delta;
      this.player.mesh.position.z -= forwardDistance;
      this.distance += forwardDistance;
      this.score += Math.floor(forwardDistance * 0.5);

      // Procedural track recycling
      this.trackManager.update(this.player.position.z, (newZPos) => {
        if (Math.random() > 0.3) {
          this.coinManager.populateTrackSection(newZPos, 3);
        }
      });

      // Update coins
      this.coinManager.update(delta, this.player.position);

      // Update obstacles & check collision
      this.obstacleManager.update(this.player.position.z, this.player.getBoundingBox(), isPlaying);

      // Update enemies
      this.enemyManager.update(delta, this.player.position, isPlaying);

      // Check player vs enemy collision
      if (!this.player.isInvulnerable) {
        const playerBox = this.player.getBoundingBox();
        for (let i = 0; i < this.enemyManager.pool.length; i++) {
          const enemy = this.enemyManager.pool[i];
          if (!enemy.isActive || enemy.isDefeated) continue;

          if (playerBox.intersectsBox(enemy.boundingBox)) {
            // Player collides with enemy!
            this.handlePlayerCollisionDamage(1);
            // Defeat or damage the enemy on ram
            this.enemyManager.hitEnemy(enemy, 1);
            break;
          }
        }
      }

      // Update projectiles & check projectile vs enemy collision
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

      // Update target lock assist
      this.currentTargetEnemy = this.enemyManager.findBestTarget(
        this.player.position,
        this.player.currentLaneIndex
      );

      // Update directional light to follow runner
      this.sceneManager.updateLightPosition(this.player.position.z);

      // Periodically broadcast metrics to React HUD
      this.broadcastMetrics();
    }

    // 2. Character kinematics (jump, gravity, slide, lane lerp, run/death animation)
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
      });
    }
  }

  public dispose(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.inputManager.dispose();
    this.projectileManager.dispose();
    this.enemyManager.dispose();
    this.obstacleManager.dispose();
    this.coinManager.dispose();
    this.trackManager.dispose();
    this.audioManager.dispose();
    this.sceneManager.dispose();
  }
}
