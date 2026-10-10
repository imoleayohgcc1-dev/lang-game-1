/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { GAME_CONFIG } from './constants';
import {
  DRAGON_ENABLED,
  DRAGON_HEALTH,
  DRAGON_SPAWN_DISTANCE,
  DRAGON_MINIMUM_DISTANCE,
  DRAGON_ATTACK_COOLDOWN,
  DRAGON_THROW_SPEED,
  DRAGON_THROW_DAMAGE,
  DRAGON_REWARD,
} from './combatConfig';
import { DragonState, DragonAttackPattern, PickupType } from './combatTypes';

export interface DragonInstance {
  mesh: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  head: THREE.Group;
  mouthGlow: THREE.Mesh;
  bodyMesh: THREE.Mesh;
  coreMaterial: THREE.MeshStandardMaterial;
  baseMaterial: THREE.MeshStandardMaterial;

  isActive: boolean;
  state: DragonState;
  health: number;
  maxHealth: number;
  targetZOffset: number; // Distance ahead of player
  currentLaneIndex: number;
  targetLaneIndex: number;
  xPos: number;
  yPos: number;
  zPos: number;

  attackCooldown: number;
  chargeTimer: number;
  hitFlashTimer: number;
  defeatTimer: number;
  animClock: number;
  currentPattern: DragonAttackPattern;
  boundingBox: THREE.Box3;
}

export interface ThrownDragonObstacle {
  mesh: THREE.Group;
  isActive: boolean;
  isDestructible: boolean;
  health: number;
  maxHealth: number;
  boundingBox: THREE.Box3;

  // Arc flight physics
  isFlying: boolean;
  flightTimer: number;
  flightDuration: number;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  targetLane: number;
  arcHeight: number;
}

export class DragonManager {
  private scene: THREE.Scene;
  public pool: DragonInstance[] = [];
  public thrownPool: ThrownDragonObstacle[] = [];
  private poolSize = 2; // Dragon boss pool
  private thrownPoolSize = 8; // Projectile / thrown hazard pool

  // Shared geometries
  private sharedGeos: Record<string, THREE.BufferGeometry> = {};
  private sharedMats: Record<string, THREE.Material> = {};

  // Callbacks
  public onDragonSpawned?: (dragon: DragonInstance) => void;
  public onAttackWarning?: (pattern: DragonAttackPattern, laneIndex: number) => void;
  public onAttackLaunched?: (obstacle: ThrownDragonObstacle) => void;
  public onDragonHit?: (dragon: DragonInstance, remainingHp: number) => void;
  public onDragonDefeated?: (dragon: DragonInstance, position: THREE.Vector3, rewardDrop: PickupType) => void;
  public onThrownObstacleDestroyed?: (obstacle: ThrownDragonObstacle) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initSharedAssets();
    this.buildDragonPool();
    this.buildThrownPool();
  }

  private initSharedAssets(): void {
    // 1. Dragon Anatomy Geometries
    this.sharedGeos['body'] = new THREE.ConeGeometry(1.2, 4.2, 8);
    this.sharedGeos['body'].rotateX(Math.PI / 2);

    this.sharedGeos['head'] = new THREE.ConeGeometry(0.85, 2.0, 6);
    this.sharedGeos['head'].rotateX(-Math.PI / 2);

    this.sharedGeos['horn'] = new THREE.ConeGeometry(0.25, 1.4, 4);
    this.sharedGeos['horn'].rotateX(-Math.PI / 4);

    this.sharedGeos['wingBone'] = new THREE.BoxGeometry(3.6, 0.15, 0.4);
    this.sharedGeos['wingMembrane'] = new THREE.PlaneGeometry(3.4, 2.4);

    this.sharedGeos['tail'] = new THREE.CylinderGeometry(0.15, 0.6, 3.2, 6);
    this.sharedGeos['tail'].rotateX(Math.PI / 2);

    this.sharedGeos['mouthGlow'] = new THREE.SphereGeometry(0.4, 8, 8);

    // 2. Thrown Obstacle Geometries (Plasma Core Boulder)
    this.sharedGeos['plasmaCore'] = new THREE.DodecahedronGeometry(0.85);
    this.sharedGeos['plasmaRing'] = new THREE.TorusGeometry(1.1, 0.12, 6, 12);
    this.sharedGeos['plasmaSpike'] = new THREE.ConeGeometry(0.3, 0.8, 4);

    // Materials
    this.sharedMats['dragonArmor'] = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Deep slate cyber armor
      roughness: 0.35,
      metalness: 0.85,
    });

    this.sharedMats['dragonCore'] = new THREE.MeshStandardMaterial({
      color: 0xa855f7, // Neon purple cyber scale emissive
      emissive: 0xa855f7,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.7,
    });

    this.sharedMats['mouthCharging'] = new THREE.MeshBasicMaterial({
      color: 0xef4444, // Intense red/orange charge
      transparent: true,
      opacity: 0.85,
    });

    this.sharedMats['plasmaHazard'] = new THREE.MeshStandardMaterial({
      color: 0xf97316, // Molten plasma hazard
      emissive: 0xf97316,
      emissiveIntensity: 1.0,
      roughness: 0.2,
      metalness: 0.5,
    });

    this.sharedMats['plasmaFrame'] = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      roughness: 0.4,
      metalness: 0.8,
    });
  }

  private buildDragonPool(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const group = new THREE.Group();
      group.name = `dragon_boss_${i}`;

      const coreMat = (this.sharedMats['dragonCore'] as THREE.MeshStandardMaterial).clone();
      const baseMat = (this.sharedMats['dragonArmor'] as THREE.MeshStandardMaterial).clone();

      // Main Torso
      const bodyMesh = new THREE.Mesh(this.sharedGeos['body'], baseMat);
      bodyMesh.castShadow = true;
      group.add(bodyMesh);

      // Spine glowing ridges
      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 3.8), coreMat);
      spine.position.set(0, 0.8, 0);
      group.add(spine);

      // Articulated Head
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.4, -2.4);
      const headMesh = new THREE.Mesh(this.sharedGeos['head'], baseMat);
      headMesh.castShadow = true;
      headGroup.add(headMesh);

      // Cyber Horns
      const hornL = new THREE.Mesh(this.sharedGeos['horn'], coreMat);
      hornL.position.set(-0.45, 0.7, 0.2);
      headGroup.add(hornL);
      const hornR = new THREE.Mesh(this.sharedGeos['horn'], coreMat);
      hornR.position.set(0.45, 0.7, 0.2);
      headGroup.add(hornR);

      // Glowing mouth cannon
      const mouthGlow = new THREE.Mesh(this.sharedGeos['mouthGlow'], this.sharedMats['mouthCharging']);
      mouthGlow.position.set(0, -0.2, -1.0);
      mouthGlow.visible = false;
      headGroup.add(mouthGlow);

      group.add(headGroup);

      // Articulated Wings (Left & Right)
      const leftWing = new THREE.Group();
      leftWing.position.set(-1.0, 0.5, -0.4);
      const lBone = new THREE.Mesh(this.sharedGeos['wingBone'], baseMat);
      lBone.position.set(-1.8, 0, 0);
      leftWing.add(lBone);
      const lMembrane = new THREE.Mesh(this.sharedGeos['wingMembrane'], coreMat);
      lMembrane.position.set(-1.8, -0.9, 0.1);
      lMembrane.rotation.x = Math.PI / 8;
      leftWing.add(lMembrane);
      group.add(leftWing);

      const rightWing = new THREE.Group();
      rightWing.position.set(1.0, 0.5, -0.4);
      const rBone = new THREE.Mesh(this.sharedGeos['wingBone'], baseMat);
      rBone.position.set(1.8, 0, 0);
      rightWing.add(rBone);
      const rMembrane = new THREE.Mesh(this.sharedGeos['wingMembrane'], coreMat);
      rMembrane.position.set(1.8, -0.9, 0.1);
      rMembrane.rotation.x = Math.PI / 8;
      rightWing.add(rMembrane);
      group.add(rightWing);

      // Tail
      const tail = new THREE.Mesh(this.sharedGeos['tail'], baseMat);
      tail.position.set(0, -0.2, 2.5);
      group.add(tail);

      group.visible = false;
      group.position.set(0, -100, 0);
      this.scene.add(group);

      this.pool.push({
        mesh: group,
        leftWing,
        rightWing,
        head: headGroup,
        mouthGlow,
        bodyMesh,
        coreMaterial: coreMat,
        baseMaterial: baseMat,
        isActive: false,
        state: 'INACTIVE',
        health: DRAGON_HEALTH,
        maxHealth: DRAGON_HEALTH,
        targetZOffset: 42.0, // Hovers 42m ahead of player
        currentLaneIndex: 1,
        targetLaneIndex: 1,
        xPos: 0,
        yPos: 5.8, // Stays elevated above runway (Y = 5.8m) so road is 100% visible
        zPos: 0,
        attackCooldown: DRAGON_ATTACK_COOLDOWN,
        chargeTimer: 0,
        hitFlashTimer: 0,
        defeatTimer: 0,
        animClock: 0,
        currentPattern: 'SINGLE_LANE',
        boundingBox: new THREE.Box3(),
      });
    }
  }

  private buildThrownPool(): void {
    for (let i = 0; i < this.thrownPoolSize; i++) {
      const group = new THREE.Group();
      group.name = `dragon_thrown_${i}`;

      const core = new THREE.Mesh(this.sharedGeos['plasmaCore'], this.sharedMats['plasmaHazard']);
      core.castShadow = true;
      group.add(core);

      const ring = new THREE.Mesh(this.sharedGeos['plasmaRing'], this.sharedMats['plasmaFrame']);
      ring.rotation.x = Math.PI / 4;
      group.add(ring);

      group.visible = false;
      group.position.set(0, -100, 0);
      this.scene.add(group);

      this.thrownPool.push({
        mesh: group,
        isActive: false,
        isDestructible: true,
        health: 80, // Destructible: 80 HP (can be shot down or bombed)
        maxHealth: 80,
        boundingBox: new THREE.Box3(),
        isFlying: false,
        flightTimer: 0,
        flightDuration: 1.2,
        startPos: new THREE.Vector3(),
        targetPos: new THREE.Vector3(),
        targetLane: 1,
        arcHeight: 4.5,
      });
    }
  }

  /**
   * Spawns a Dragon Boss encounter ahead of the runner
   */
  public spawnDragon(playerZ: number, health: number = DRAGON_HEALTH): DragonInstance | null {
    if (!DRAGON_ENABLED) return null;
    const dragon = this.pool.find((d) => !d.isActive);
    if (!dragon) return null;

    dragon.isActive = true;
    dragon.state = 'FLYING';
    dragon.health = health;
    dragon.maxHealth = health;
    dragon.currentLaneIndex = 1;
    dragon.targetLaneIndex = 1;
    dragon.targetZOffset = 42.0;

    // Spawns smoothly far ahead (85m ahead, Y = 6.2m)
    dragon.xPos = 0;
    dragon.yPos = 6.0;
    dragon.zPos = playerZ - DRAGON_SPAWN_DISTANCE;

    dragon.mesh.position.set(dragon.xPos, dragon.yPos, dragon.zPos);
    dragon.mesh.scale.set(1, 1, 1);
    dragon.mesh.visible = true;

    dragon.attackCooldown = 3.5; // Short delay before first attack
    dragon.chargeTimer = 0;
    dragon.hitFlashTimer = 0;
    dragon.defeatTimer = 0;
    dragon.animClock = 0;
    dragon.mouthGlow.visible = false;

    this.updateDragonBoundingBox(dragon);
    this.onDragonSpawned?.(dragon);

    return dragon;
  }

  public getActiveDragon(): DragonInstance | null {
    return this.pool.find((d) => d.isActive && d.state !== 'DEFEATED') || null;
  }

  public hasActiveDragon(): boolean {
    return this.pool.some((d) => d.isActive && d.state !== 'DEFEATED');
  }

  private updateDragonBoundingBox(dragon: DragonInstance): void {
    const p = dragon.mesh.position;
    // Dragon has a generous hit target box in the air
    dragon.boundingBox.min.set(p.x - 2.8, p.y - 1.5, p.z - 2.8);
    dragon.boundingBox.max.set(p.x + 2.8, p.y + 2.0, p.z + 2.8);
  }

  private updateThrownBoundingBox(item: ThrownDragonObstacle): void {
    const p = item.mesh.position;
    item.boundingBox.min.set(p.x - 0.9, p.y - 0.2, p.z - 0.9);
    item.boundingBox.max.set(p.x + 0.9, p.y + 1.8, p.z + 0.9);
  }

  /**
   * Main game loop update
   */
  public update(delta: number, playerZ: number, playerBox: THREE.Box3, isPlaying: boolean): void {
    // 1. Update Dragons
    for (let i = 0; i < this.pool.length; i++) {
      const dragon = this.pool[i];
      if (!dragon.isActive) continue;

      dragon.animClock += delta;

      // Handle defeat animation
      if (dragon.state === 'DEFEATED') {
        dragon.defeatTimer += delta;
        dragon.mesh.rotation.x -= delta * 3.0;
        dragon.mesh.rotation.z += delta * 4.0;
        dragon.mesh.position.y += delta * 8.0; // Rises into the clouds
        const fade = Math.max(0.01, 1.0 - dragon.defeatTimer / 0.8);
        dragon.mesh.scale.set(fade, fade, fade);

        if (dragon.defeatTimer >= 0.8) {
          this.deactivateDragon(dragon);
        }
        continue;
      }

      // Smooth wing flapping animation (sinusoidal flap)
      const flapAngle = Math.sin(dragon.animClock * 5.5) * 0.55;
      dragon.leftWing.rotation.z = flapAngle;
      dragon.rightWing.rotation.z = -flapAngle;

      // Gentle dragon hover sway
      const hoverY = 5.8 + Math.sin(dragon.animClock * 2.2) * 0.45;
      dragon.yPos = hoverY;

      // Maintain safe distance ahead of runner
      // Target Z is playerZ - dragon.targetZOffset
      const idealZ = playerZ - dragon.targetZOffset;
      dragon.zPos = THREE.MathUtils.lerp(dragon.zPos, idealZ, delta * 2.5);

      // Smooth lane following
      const targetX = GAME_CONFIG.LANES[dragon.targetLaneIndex];
      dragon.xPos = THREE.MathUtils.lerp(dragon.xPos, targetX, delta * 3.5);

      dragon.mesh.position.set(dragon.xPos, dragon.yPos, dragon.zPos);
      this.updateDragonBoundingBox(dragon);

      // Hit flash timer
      if (dragon.hitFlashTimer > 0) {
        dragon.hitFlashTimer -= delta;
        if (dragon.hitFlashTimer <= 0) {
          dragon.coreMaterial.emissive.setHex(0xa855f7);
          dragon.coreMaterial.emissiveIntensity = 0.9;
        }
      }

      if (!isPlaying) continue;

      // AI Attack Sequencing
      dragon.attackCooldown -= delta;

      // When ready to attack, enter CHARGING phase
      if (dragon.attackCooldown <= 0 && dragon.state === 'FLYING') {
        dragon.state = 'CHARGING';
        dragon.chargeTimer = 1.1; // 1.1s visible charge telegraph
        dragon.mouthGlow.visible = true;

        // Pick attack pattern
        const patterns: DragonAttackPattern[] = [
          'SINGLE_LANE',
          'TWO_LANES',
          'DELAYED_ARC',
          'DRAGON_SWEEP',
          'RAPID_BURST',
        ];
        dragon.currentPattern = patterns[Math.floor(Math.random() * patterns.length)];

        // Choose target lane (0, 1, or 2)
        const targetLane = Math.floor(Math.random() * 3);
        dragon.targetLaneIndex = targetLane;

        // Emit non-obstructive attack warning to SAFE_HUD_AREA
        this.onAttackWarning?.(dragon.currentPattern, targetLane);
      }

      // In CHARGING phase: mouth glows and head tilts forward
      if (dragon.state === 'CHARGING') {
        dragon.chargeTimer -= delta;
        const pulse = Math.sin(dragon.animClock * 20.0) * 0.3 + 0.9;
        dragon.mouthGlow.scale.set(pulse, pulse, pulse);

        if (dragon.chargeTimer <= 0) {
          // Fire attack!
          this.executeDragonAttack(dragon, playerZ);
          dragon.state = 'FLYING';
          dragon.mouthGlow.visible = false;
          dragon.attackCooldown = DRAGON_ATTACK_COOLDOWN;
        }
      }
    }

    // 2. Update Thrown Obstacles / Projectiles
    for (let i = 0; i < this.thrownPool.length; i++) {
      const item = this.thrownPool[i];
      if (!item.isActive) continue;

      // Arc flight phase
      if (item.isFlying) {
        item.flightTimer += delta;
        const progress = Math.min(1.0, item.flightTimer / item.flightDuration);

        // Parabolic arc interpolation from dragon to road
        const curX = THREE.MathUtils.lerp(item.startPos.x, item.targetPos.x, progress);
        const curZ = THREE.MathUtils.lerp(item.startPos.z, item.targetPos.z, progress);
        const heightArc = Math.sin(progress * Math.PI) * item.arcHeight;
        const curY = THREE.MathUtils.lerp(item.startPos.y, item.targetPos.y, progress) + heightArc;

        item.mesh.position.set(curX, curY, curZ);
        item.mesh.rotation.x += delta * 8.0;
        item.mesh.rotation.y += delta * 6.0;

        if (progress >= 1.0) {
          // Landed on road! Now sits as a stationary destructible obstacle
          item.isFlying = false;
          item.mesh.position.copy(item.targetPos);
          item.mesh.position.y = 0.6; // Resting on ground
        }
      } else {
        // Stationary on road: rotating idle plasma core
        item.mesh.rotation.y += delta * 2.0;
      }

      this.updateThrownBoundingBox(item);

      // Player collision check
      if (isPlaying && !item.isFlying && Math.abs(item.mesh.position.z - playerZ) < 2.0) {
        if (playerBox.intersectsBox(item.boundingBox)) {
          // Collision dealt by Obstacle collision system via GameManager
        }
      }

      // Recycle when passed far behind player
      if (item.mesh.position.z > playerZ + 15) {
        this.deactivateThrownObstacle(item);
      }
    }
  }

  /**
   * Executes the chosen attack pattern with visible parabolic trajectory
   */
  private executeDragonAttack(dragon: DragonInstance, playerZ: number): void {
    const pattern = dragon.currentPattern;
    const dragonMouth = dragon.mesh.position.clone();
    dragonMouth.y -= 0.3;
    dragonMouth.z -= 1.8;

    // Target landing point: ~26-30m ahead of player (perfect fair reaction distance)
    const landingZ = playerZ - 28.0;

    if (pattern === 'SINGLE_LANE' || pattern === 'DELAYED_ARC') {
      const lane = dragon.targetLaneIndex;
      this.launchThrownObstacle(dragonMouth, lane, landingZ, pattern === 'DELAYED_ARC' ? 1.6 : 1.1);
    } else if (pattern === 'TWO_LANES') {
      // Launch at 2 lanes, guaranteed leaving 1 lane completely free
      const safeLane = Math.floor(Math.random() * 3);
      const attackLanes = [0, 1, 2].filter((l) => l !== safeLane);
      this.launchThrownObstacle(dragonMouth, attackLanes[0], landingZ, 1.1);
      setTimeout(() => {
        if (dragon.isActive) {
          this.launchThrownObstacle(dragonMouth, attackLanes[1], landingZ - 8.0, 1.2);
        }
      }, 350);
    } else if (pattern === 'DRAGON_SWEEP') {
      // Dragon sways and launches high plasma core
      dragon.targetLaneIndex = (dragon.targetLaneIndex + 1) % 3;
      this.launchThrownObstacle(dragonMouth, dragon.targetLaneIndex, landingZ, 1.25);
    } else {
      // RAPID_BURST: Two rapid projectiles into lane
      this.launchThrownObstacle(dragonMouth, dragon.targetLaneIndex, landingZ, 0.95);
    }
  }

  private launchThrownObstacle(
    startPos: THREE.Vector3,
    targetLane: number,
    targetZ: number,
    flightDuration: number = 1.1
  ): ThrownDragonObstacle | null {
    const item = this.thrownPool.find((o) => !o.isActive);
    if (!item) return null;

    item.isActive = true;
    item.isFlying = true;
    item.isDestructible = true;
    item.health = 80;
    item.maxHealth = 80;
    item.flightTimer = 0;
    item.flightDuration = flightDuration;
    item.targetLane = targetLane;
    item.startPos.copy(startPos);
    item.targetPos.set(GAME_CONFIG.LANES[targetLane], 0.6, targetZ);
    item.arcHeight = 4.2;

    item.mesh.position.copy(startPos);
    item.mesh.visible = true;

    this.updateThrownBoundingBox(item);
    this.onAttackLaunched?.(item);

    return item;
  }

  /**
   * Player attacks Dragon: applies weapon damage
   */
  public hitDragon(dragon: DragonInstance, damage: number): boolean {
    if (!dragon.isActive || dragon.state === 'DEFEATED') return false;

    dragon.health -= damage;
    dragon.hitFlashTimer = 0.12;

    // Emissive white/cyan hit flash
    dragon.coreMaterial.emissive.setHex(0xffffff);
    dragon.coreMaterial.emissiveIntensity = 2.5;

    this.onDragonHit?.(dragon, dragon.health);

    if (dragon.health <= 0) {
      dragon.health = 0;
      dragon.state = 'DEFEATED';
      dragon.defeatTimer = 0;

      // Select guaranteed high-value reward
      const possibleDrops: PickupType[] = ['BOMB', 'BIG_BULLET', 'MACHINE_GUN', 'HEALTH', 'COIN'];
      const drop = possibleDrops[Math.floor(Math.random() * possibleDrops.length)];

      const pos = dragon.mesh.position.clone();
      this.onDragonDefeated?.(dragon, pos, drop);
      return true;
    }

    return false;
  }

  /**
   * Player shoots or bombs a thrown dragon obstacle
   */
  public damageThrownObstacle(item: ThrownDragonObstacle, damage: number): boolean {
    if (!item.isActive || !item.isDestructible) return false;

    item.health -= damage;
    if (item.health <= 0) {
      this.destroyThrownObstacle(item);
      return true;
    }
    return false;
  }

  public destroyThrownObstacle(item: ThrownDragonObstacle): void {
    if (!item.isActive) return;
    this.deactivateThrownObstacle(item);
    this.onThrownObstacleDestroyed?.(item);
  }

  public deactivateDragon(dragon: DragonInstance): void {
    dragon.isActive = false;
    dragon.state = 'INACTIVE';
    dragon.mesh.visible = false;
    dragon.mesh.position.set(0, -100, 0);
  }

  public deactivateThrownObstacle(item: ThrownDragonObstacle): void {
    item.isActive = false;
    item.isFlying = false;
    item.mesh.visible = false;
    item.mesh.position.set(0, -100, 0);
  }

  public reset(): void {
    this.pool.forEach((d) => this.deactivateDragon(d));
    this.thrownPool.forEach((o) => this.deactivateThrownObstacle(o));
  }

  public dispose(): void {
    this.reset();
    this.pool.forEach((d) => this.scene.remove(d.mesh));
    this.thrownPool.forEach((o) => this.scene.remove(o.mesh));
    this.pool = [];
    this.thrownPool = [];

    Object.values(this.sharedGeos).forEach((g) => g.dispose());
    this.sharedGeos = {};
    Object.values(this.sharedMats).forEach((m) => m.dispose());
    this.sharedMats = {};
  }
}
