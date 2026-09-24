import * as THREE from 'three';
import { GAME_CONFIG, EnemyType } from './constants';

export interface EnemyInstance {
  mesh: THREE.Group;
  type: EnemyType;
  laneIndex: number;
  health: number;
  maxHealth: number;
  speed: number;
  scoreReward: number;
  coinReward: number;
  isActive: boolean;
  isDefeated: boolean;
  defeatTimer: number;
  hitFlashTimer: number;
  boundingBox: THREE.Box3;
  coreMaterial: THREE.MeshStandardMaterial;
  baseMaterial: THREE.MeshStandardMaterial;
  baseColor: number;
}

export class EnemyManager {
  private scene: THREE.Scene;
  public pool: EnemyInstance[] = [];
  private poolSize = 16;
  private nextSpawnZ: number = GAME_CONFIG.COMBAT.FIRST_ENEMY_Z;
  private animClock: number = 0;

  // Shared geometries
  private sharedGeos: Record<string, THREE.BufferGeometry> = {};

  // Callbacks for combat events (ready for future language learning hooks)
  public onEnemySpawned?: (enemy: EnemyInstance) => void;
  public onEnemyHit?: (enemy: EnemyInstance, remainingHealth: number) => void;
  public onEnemyDefeated?: (enemy: EnemyInstance) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initSharedGeos();
    this.buildPool();
  }

  private initSharedGeos(): void {
    // 1. BASIC Drone
    this.sharedGeos['droneCore'] = new THREE.SphereGeometry(0.55, 12, 10);
    this.sharedGeos['droneEye'] = new THREE.CylinderGeometry(0.2, 0.2, 0.2, 12);
    this.sharedGeos['droneEye'].rotateX(Math.PI / 2);
    this.sharedGeos['droneWing'] = new THREE.BoxGeometry(0.25, 0.08, 0.6);

    // 2. FAST Interceptor
    this.sharedGeos['fastBody'] = new THREE.ConeGeometry(0.55, 1.6, 6);
    this.sharedGeos['fastBody'].rotateX(Math.PI / 2);
    this.sharedGeos['fastFin'] = new THREE.BoxGeometry(1.4, 0.06, 0.5);

    // 3. ARMORED Mech
    this.sharedGeos['mechTorso'] = new THREE.BoxGeometry(1.2, 1.2, 0.9);
    this.sharedGeos['mechShield'] = new THREE.BoxGeometry(1.4, 1.0, 0.18);
    this.sharedGeos['mechCanon'] = new THREE.CylinderGeometry(0.12, 0.12, 0.9, 8);
    this.sharedGeos['mechCanon'].rotateX(Math.PI / 2);
    this.sharedGeos['mechHead'] = new THREE.BoxGeometry(0.6, 0.45, 0.6);
  }

  private buildPool(): void {
    const types: { type: EnemyType; count: number }[] = [
      { type: 'BASIC', count: 7 },
      { type: 'FAST', count: 5 },
      { type: 'ARMORED', count: 4 },
    ];

    types.forEach(({ type, count }) => {
      const cfg = GAME_CONFIG.COMBAT.ENEMIES[type];

      for (let i = 0; i < count; i++) {
        const coreMat = new THREE.MeshStandardMaterial({
          color: cfg.COLOR,
          emissive: cfg.COLOR,
          emissiveIntensity: 0.85,
          roughness: 0.2,
          metalness: 0.8,
        });

        const baseMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.4,
          metalness: 0.7,
        });

        const group = this.createEnemyModel(type, coreMat, baseMat);
        group.visible = false;
        group.position.set(0, -100, 0);
        this.scene.add(group);

        this.pool.push({
          mesh: group,
          type,
          laneIndex: 1,
          health: cfg.HEALTH,
          maxHealth: cfg.HEALTH,
          speed: cfg.SPEED,
          scoreReward: cfg.SCORE,
          coinReward: cfg.COINS,
          isActive: false,
          isDefeated: false,
          defeatTimer: 0,
          hitFlashTimer: 0,
          boundingBox: new THREE.Box3(),
          coreMaterial: coreMat,
          baseMaterial: baseMat,
          baseColor: cfg.COLOR,
        });
      }
    });
  }

  private createEnemyModel(
    type: EnemyType,
    coreMat: THREE.MeshStandardMaterial,
    baseMat: THREE.MeshStandardMaterial
  ): THREE.Group {
    const group = new THREE.Group();

    if (type === 'BASIC') {
      // Hovering Scout Drone
      const body = new THREE.Mesh(this.sharedGeos['droneCore'], baseMat);
      body.castShadow = true;
      group.add(body);

      // Glowing cyber eye visor
      const eye = new THREE.Mesh(this.sharedGeos['droneEye'], coreMat);
      eye.position.set(0, 0.05, 0.48);
      group.add(eye);

      // Left and right hover wings
      const leftWing = new THREE.Mesh(this.sharedGeos['droneWing'], baseMat);
      leftWing.position.set(-0.7, 0, 0);
      group.add(leftWing);

      const rightWing = new THREE.Mesh(this.sharedGeos['droneWing'], baseMat);
      rightWing.position.set(0.7, 0, 0);
      group.add(rightWing);

      // Elevation
      group.position.y = 1.3;
    } else if (type === 'FAST') {
      // Swift Aero Interceptor
      const nose = new THREE.Mesh(this.sharedGeos['fastBody'], baseMat);
      nose.castShadow = true;
      group.add(nose);

      const coreGlow = new THREE.Mesh(this.sharedGeos['droneEye'], coreMat);
      coreGlow.scale.set(0.8, 0.8, 0.8);
      coreGlow.position.set(0, 0.1, 0.45);
      group.add(coreGlow);

      const wings = new THREE.Mesh(this.sharedGeos['fastFin'], coreMat);
      wings.position.set(0, 0, -0.2);
      group.add(wings);

      group.position.y = 1.4;
    } else {
      // Heavy Armored Sentinel Mech
      const torso = new THREE.Mesh(this.sharedGeos['mechTorso'], baseMat);
      torso.castShadow = true;
      torso.position.y = 1.3;
      group.add(torso);

      const head = new THREE.Mesh(this.sharedGeos['mechHead'], baseMat);
      head.position.set(0, 2.05, 0.1);
      group.add(head);

      const visor = new THREE.Mesh(this.sharedGeos['droneEye'], coreMat);
      visor.scale.set(0.9, 0.5, 0.5);
      visor.position.set(0, 2.05, 0.42);
      group.add(visor);

      // Front protective energy shield
      const shield = new THREE.Mesh(this.sharedGeos['mechShield'], coreMat);
      shield.position.set(0, 1.3, 0.52);
      group.add(shield);

      // Dual cannons
      const leftCanon = new THREE.Mesh(this.sharedGeos['mechCanon'], baseMat);
      leftCanon.position.set(-0.75, 1.25, 0.2);
      group.add(leftCanon);

      const rightCanon = new THREE.Mesh(this.sharedGeos['mechCanon'], baseMat);
      rightCanon.position.set(0.75, 1.25, 0.2);
      group.add(rightCanon);
    }

    return group;
  }

  /**
   * Spawns an enemy of designated type at given lane and Z
   */
  public spawn(type: EnemyType, laneIndex: number, zPos: number): EnemyInstance | null {
    const enemy = this.pool.find((e) => !e.isActive && e.type === type);
    if (!enemy) return null;

    const cfg = GAME_CONFIG.COMBAT.ENEMIES[type];
    const laneX = GAME_CONFIG.LANES[laneIndex];

    enemy.isActive = true;
    enemy.isDefeated = false;
    enemy.defeatTimer = 0;
    enemy.hitFlashTimer = 0;
    enemy.laneIndex = laneIndex;
    enemy.health = cfg.HEALTH;
    enemy.maxHealth = cfg.HEALTH;
    enemy.mesh.scale.set(1, 1, 1);
    enemy.mesh.visible = true;

    // Reset material colors
    enemy.coreMaterial.color.setHex(enemy.baseColor);
    enemy.coreMaterial.emissive.setHex(enemy.baseColor);
    enemy.coreMaterial.emissiveIntensity = 0.85;

    // Initial position
    const baseY = type === 'ARMORED' ? 0.0 : 1.3;
    enemy.mesh.position.set(laneX, baseY, zPos);

    this.updateBoundingBox(enemy);

    if (this.onEnemySpawned) {
      this.onEnemySpawned(enemy);
    }

    return enemy;
  }

  private updateBoundingBox(enemy: EnemyInstance): void {
    const p = enemy.mesh.position;

    if (enemy.type === 'BASIC') {
      enemy.boundingBox.min.set(p.x - 0.75, p.y - 0.65, p.z - 0.65);
      enemy.boundingBox.max.set(p.x + 0.75, p.y + 0.65, p.z + 0.65);
    } else if (enemy.type === 'FAST') {
      enemy.boundingBox.min.set(p.x - 0.85, p.y - 0.55, p.z - 0.85);
      enemy.boundingBox.max.set(p.x + 0.85, p.y + 0.55, p.z + 0.85);
    } else {
      // ARMORED
      enemy.boundingBox.min.set(p.x - 0.95, p.y + 0.0, p.z - 0.7);
      enemy.boundingBox.max.set(p.x + 0.95, p.y + 2.4, p.z + 0.7);
    }
  }

  /**
   * Inflict damage on an active enemy
   */
  public hitEnemy(enemy: EnemyInstance, damage: number = 1): boolean {
    if (!enemy.isActive || enemy.isDefeated) return false;

    enemy.health -= damage;
    enemy.hitFlashTimer = 0.12;

    // Visual flash white/yellow
    enemy.coreMaterial.emissive.setHex(0xffffff);
    enemy.coreMaterial.emissiveIntensity = 1.8;

    if (this.onEnemyHit) {
      this.onEnemyHit(enemy, enemy.health);
    }

    if (enemy.health <= 0) {
      this.defeatEnemy(enemy);
      return true;
    }

    return false;
  }

  private defeatEnemy(enemy: EnemyInstance): void {
    enemy.isDefeated = true;
    enemy.defeatTimer = 0.28; // brief death shrink animation

    if (this.onEnemyDefeated) {
      this.onEnemyDefeated(enemy);
    }
  }

  /**
   * Target assist: Find the best target enemy ahead of the player
   */
  public findBestTarget(playerPos: THREE.Vector3, playerLane: number): EnemyInstance | null {
    let bestEnemy: EnemyInstance | null = null;
    let minScore = Infinity;

    const maxDist = GAME_CONFIG.COMBAT.TARGET_ASSIST_MAX_DISTANCE;
    const lateralWeight = 8.0; // prioritize enemies in the player's current lane

    for (let i = 0; i < this.pool.length; i++) {
      const enemy = this.pool[i];
      if (!enemy.isActive || enemy.isDefeated) continue;

      const dz = playerPos.z - enemy.mesh.position.z; // distance ahead (positive when enemy is in front)
      if (dz <= 1.0 || dz > maxDist) continue;

      const laneDiff = Math.abs(enemy.laneIndex - playerLane);
      // Lane diff 0: score = dz
      // Lane diff 1: score = dz + 8
      // Lane diff 2: score = dz + 16
      const score = dz + laneDiff * lateralWeight;

      if (score < minScore) {
        minScore = score;
        bestEnemy = enemy;
      }
    }

    return bestEnemy;
  }

  /**
   * Spawn procedural enemy waves ahead of player
   * Guarantees solvability alongside obstacle patterns
   */
  public generateWave(playerZ: number): void {
    const lookAhead = 190;
    while (this.nextSpawnZ > playerZ - lookAhead) {
      // Pick enemy type based on distance/progression
      const roll = Math.random();
      let type: EnemyType = 'BASIC';
      if (roll > 0.7) {
        type = 'ARMORED';
      } else if (roll > 0.35) {
        type = 'FAST';
      }

      // Pick lane (0, 1, or 2)
      const lane = Math.floor(Math.random() * 3);
      this.spawn(type, lane, this.nextSpawnZ);

      // Spacing gap
      const gap = GAME_CONFIG.COMBAT.MIN_SPAWN_GAP + 
        Math.random() * (GAME_CONFIG.COMBAT.MAX_SPAWN_GAP - GAME_CONFIG.COMBAT.MIN_SPAWN_GAP);
      this.nextSpawnZ -= gap;
    }
  }

  public update(delta: number, playerPos: THREE.Vector3, isPlaying: boolean): void {
    this.animClock += delta;

    if (isPlaying) {
      // Spawn new enemies ahead
      this.generateWave(playerPos.z);
    }

    for (let i = 0; i < this.pool.length; i++) {
      const enemy = this.pool[i];
      if (!enemy.isActive) continue;

      // 1. Defeat animation & cleanup
      if (enemy.isDefeated) {
        enemy.defeatTimer -= delta;
        // Shrink & spin
        enemy.mesh.scale.multiplyScalar(Math.max(0.01, 1.0 - delta * 4.5));
        enemy.mesh.rotation.y += delta * 12.0;

        if (enemy.defeatTimer <= 0) {
          this.deactivate(enemy);
        }
        continue;
      }

      // 2. Hit flash reset
      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer -= delta;
        if (enemy.hitFlashTimer <= 0) {
          enemy.coreMaterial.emissive.setHex(enemy.baseColor);
          enemy.coreMaterial.emissiveIntensity = 0.85;
        }
      }

      // 3. Move enemy toward runner when playing
      if (isPlaying) {
        // Enemies patrol forward along positive Z
        enemy.mesh.position.z += enemy.speed * delta;

        // Hover bobbing
        if (enemy.type !== 'ARMORED') {
          enemy.mesh.position.y = 1.3 + Math.sin(this.animClock * 4.0 + i) * 0.18;
        }
      }

      this.updateBoundingBox(enemy);

      // 4. Recycle if passed far behind the player
      if (enemy.mesh.position.z > playerPos.z + 16) {
        this.deactivate(enemy);
      }
    }
  }

  public deactivate(enemy: EnemyInstance): void {
    enemy.isActive = false;
    enemy.isDefeated = false;
    enemy.mesh.visible = false;
    enemy.mesh.position.set(0, -100, 0);
  }

  public reset(): void {
    this.pool.forEach((e) => this.deactivate(e));
    this.nextSpawnZ = GAME_CONFIG.COMBAT.FIRST_ENEMY_Z;
  }

  public dispose(): void {
    this.pool.forEach((e) => {
      this.scene.remove(e.mesh);
      e.coreMaterial.dispose();
      e.baseMaterial.dispose();
    });
    this.pool = [];

    Object.values(this.sharedGeos).forEach((g) => g.dispose());
    this.sharedGeos = {};
  }
}
