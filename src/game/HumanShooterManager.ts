/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { GAME_CONFIG } from './constants';
import { HUMAN_ENEMY_CONFIG } from './combatConfig';
import { EnemyProjectileManager } from './EnemyProjectileManager';

export type HumanShooterType = 'SCOUT' | 'RAPID' | 'ELITE';

export interface HumanShooterInstance {
  id: string;
  mesh: THREE.Group;
  type: HumanShooterType;
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

  // Combat behavior
  attackCooldown: number;
  isAiming: boolean;
  aimTimer: number;
  burstRemaining: number;
  burstIntervalTimer: number;

  // Articulated parts for animation
  head: THREE.Mesh;
  torso: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  launcherMesh: THREE.Group;
  muzzleGlow: THREE.Mesh;
  healthBarGroup: THREE.Group;
  healthBarFill: THREE.Mesh;

  // Materials
  suitMaterial: THREE.MeshStandardMaterial;
  vestMaterial: THREE.MeshStandardMaterial;
  visorMaterial: THREE.MeshStandardMaterial;
  launcherMaterial: THREE.MeshStandardMaterial;
}

export class HumanShooterManager {
  private scene: THREE.Scene;
  public pool: HumanShooterInstance[] = [];
  private poolSize = 10;
  private animClock: number = 0;
  private projectileManager: EnemyProjectileManager;

  public difficulty: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  public nextSpawnZ: number = -65;
  public spawnCooldown: number = 2.0;

  // Event callbacks
  public onEnemySpawned?: (enemy: HumanShooterInstance) => void;
  public onEnemyAiming?: (enemy: HumanShooterInstance, laneIndex: number) => void;
  public onEnemyShoot?: (enemy: HumanShooterInstance, origin: THREE.Vector3, target: THREE.Vector3, damage: number) => void;
  public onEnemyHit?: (enemy: HumanShooterInstance, remainingHp: number) => void;
  public onEnemyDefeated?: (enemy: HumanShooterInstance) => void;

  constructor(scene: THREE.Scene, projectileManager: EnemyProjectileManager) {
    this.scene = scene;
    this.projectileManager = projectileManager;
    this.buildPool();
  }

  private buildPool(): void {
    const types: HumanShooterType[] = ['SCOUT', 'SCOUT', 'SCOUT', 'RAPID', 'RAPID', 'RAPID', 'ELITE', 'ELITE', 'ELITE', 'ELITE'];

    for (let i = 0; i < this.poolSize; i++) {
      const type = types[i % types.length];
      const shooter = this.createHumanShooterModel(type, i);
      this.pool.push(shooter);
      this.scene.add(shooter.mesh);
    }
  }

  private createHumanShooterModel(type: HumanShooterType, index: number): HumanShooterInstance {
    const group = new THREE.Group();
    group.name = `human_shooter_${index}_${type}`;
    group.visible = false;
    group.position.set(0, -100, 0);

    const cfg = HUMAN_ENEMY_CONFIG.types[type];

    // Varied colorful palette
    let suitColor = 0x1e293b;
    let vestColor = 0x3b82f6; // Scout Blue
    let visorColor = 0xfde047; // Yellow
    let launcherColor = 0x06b6d4;

    if (type === 'RAPID') {
      suitColor = 0x0f172a;
      vestColor = 0x10b981; // Rapid Green
      visorColor = 0xf59e0b; // Amber
      launcherColor = 0x8b5cf6;
    } else if (type === 'ELITE') {
      suitColor = 0x020617;
      vestColor = 0x7c3aed; // Elite Royal Purple
      visorColor = 0xf43f5e; // Crimson
      launcherColor = 0xec4899;
    }

    const suitMaterial = new THREE.MeshStandardMaterial({
      color: suitColor,
      roughness: 0.4,
      metalness: 0.3,
    });

    const vestMaterial = new THREE.MeshStandardMaterial({
      color: vestColor,
      roughness: 0.25,
      metalness: 0.6,
    });

    const visorMaterial = new THREE.MeshStandardMaterial({
      color: visorColor,
      emissive: visorColor,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.9,
    });

    const launcherMaterial = new THREE.MeshStandardMaterial({
      color: launcherColor,
      emissive: launcherColor,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });

    // 1. Torso & Armored Vest
    const torsoGeo = new THREE.BoxGeometry(0.75, 0.95, 0.45);
    const torso = new THREE.Mesh(torsoGeo, vestMaterial);
    torso.position.y = 1.45;
    torso.castShadow = true;
    group.add(torso);

    // 2. Head & Cyber Visor
    const headGeo = new THREE.BoxGeometry(0.42, 0.45, 0.42);
    const head = new THREE.Mesh(headGeo, suitMaterial);
    head.position.set(0, 0.72, 0);
    head.castShadow = true;
    torso.add(head);

    const visorGeo = new THREE.BoxGeometry(0.44, 0.14, 0.15);
    const visor = new THREE.Mesh(visorGeo, visorMaterial);
    visor.position.set(0, 0.05, 0.22);
    head.add(visor);

    // 3. Left Arm Pivot & Limb
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.52, 0.35, 0);
    const armGeo = new THREE.BoxGeometry(0.22, 0.75, 0.22);
    armGeo.translate(0, -0.35, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, suitMaterial);
    leftArm.add(leftArmMesh);
    torso.add(leftArm);

    // 4. Right Arm Pivot & Futuristic Launcher Weapon
    const rightArm = new THREE.Group();
    rightArm.position.set(0.52, 0.35, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, suitMaterial);
    rightArm.add(rightArmMesh);
    torso.add(rightArm);

    // Launcher attached to right arm
    const launcherMesh = new THREE.Group();
    launcherMesh.position.set(0, -0.7, 0.25);

    const launcherBodyGeo = new THREE.BoxGeometry(0.18, 0.22, 0.75);
    const launcherBody = new THREE.Mesh(launcherBodyGeo, vestMaterial);
    launcherMesh.add(launcherBody);

    const barrelGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, launcherMaterial);
    barrel.position.set(0, 0.02, 0.4);
    launcherMesh.add(barrel);

    // Muzzle Flare Glow
    const muzzleGlowGeo = new THREE.SphereGeometry(0.14, 8, 8);
    const muzzleGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    });
    const muzzleGlow = new THREE.Mesh(muzzleGlowGeo, muzzleGlowMat);
    muzzleGlow.position.set(0, 0.02, 0.65);
    muzzleGlow.visible = false;
    launcherMesh.add(muzzleGlow);

    rightArm.add(launcherMesh);

    // 5. Left Leg & Boot
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.24, -0.48, 0);
    const legGeo = new THREE.BoxGeometry(0.26, 0.95, 0.26);
    legGeo.translate(0, -0.45, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, suitMaterial);
    leftLeg.add(leftLegMesh);
    torso.add(leftLeg);

    // 6. Right Leg & Boot
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.24, -0.48, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, suitMaterial);
    rightLeg.add(rightLegMesh);
    torso.add(rightLeg);

    // 7. Subtle Overhead Mini Health Bar (Clean, non-obtrusive, high readable contrast)
    const healthBarGroup = new THREE.Group();
    healthBarGroup.position.set(0, 2.35, 0);

    const bgBarGeo = new THREE.PlaneGeometry(0.85, 0.1);
    const bgBarMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide });
    const bgBar = new THREE.Mesh(bgBarGeo, bgBarMat);
    healthBarGroup.add(bgBar);

    const fillBarGeo = new THREE.PlaneGeometry(0.81, 0.07);
    const fillBarMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
    const healthBarFill = new THREE.Mesh(fillBarGeo, fillBarMat);
    healthBarFill.position.z = 0.01;
    healthBarGroup.add(healthBarFill);

    healthBarGroup.visible = false;
    group.add(healthBarGroup);

    return {
      id: `human_${index}`,
      mesh: group,
      type,
      laneIndex: 1,
      health: cfg.health,
      maxHealth: cfg.health,
      speed: cfg.speed,
      scoreReward: cfg.scoreReward,
      coinReward: cfg.coinReward,
      isActive: false,
      isDefeated: false,
      defeatTimer: 0,
      hitFlashTimer: 0,
      boundingBox: new THREE.Box3(),
      attackCooldown: cfg.attackCooldown + Math.random() * 0.8,
      isAiming: false,
      aimTimer: 0,
      burstRemaining: 0,
      burstIntervalTimer: 0,
      head,
      torso,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      launcherMesh,
      muzzleGlow,
      healthBarGroup,
      healthBarFill,
      suitMaterial,
      vestMaterial,
      visorMaterial,
      launcherMaterial,
    };
  }

  public setDifficulty(difficulty: 'LOW' | 'MEDIUM' | 'HIGH'): void {
    this.difficulty = difficulty;
  }

  public getActiveCount(): number {
    return this.pool.filter((e) => e.isActive && !e.isDefeated).length;
  }

  public spawnShooter(
    type: HumanShooterType,
    laneIndex: number,
    spawnZ: number,
    customHealth?: number
  ): HumanShooterInstance | null {
    if (this.getActiveCount() >= HUMAN_ENEMY_CONFIG.maximumActiveEnemies) {
      return null;
    }

    const shooter = this.pool.find((e) => !e.isActive);
    if (!shooter) return null;

    const cfg = HUMAN_ENEMY_CONFIG.types[type];
    shooter.type = type;
    shooter.isActive = true;
    shooter.isDefeated = false;
    shooter.defeatTimer = 0;
    shooter.hitFlashTimer = 0;
    shooter.laneIndex = laneIndex;
    shooter.maxHealth = customHealth ?? cfg.health;
    shooter.health = shooter.maxHealth;
    shooter.speed = cfg.speed;
    shooter.scoreReward = cfg.scoreReward;
    shooter.coinReward = cfg.coinReward;
    shooter.attackCooldown = 1.2 + Math.random() * 1.5;
    shooter.isAiming = false;
    shooter.aimTimer = 0;
    shooter.burstRemaining = 0;
    shooter.burstIntervalTimer = 0;

    // Position in designated lane
    const posX = GAME_CONFIG.LANES[laneIndex];
    shooter.mesh.position.set(posX, 0, spawnZ);
    shooter.mesh.rotation.set(0, Math.PI, 0); // Facing player along positive Z
    shooter.mesh.scale.set(1.0, 1.0, 1.0);
    shooter.mesh.visible = true;

    // Reset limbs
    shooter.torso.position.y = 1.45;
    shooter.rightArm.rotation.set(0, 0, 0);
    shooter.leftArm.rotation.set(0, 0, 0);
    shooter.healthBarGroup.visible = false;
    shooter.muzzleGlow.visible = false;

    this.updateBoundingBox(shooter);
    this.onEnemySpawned?.(shooter);

    return shooter;
  }

  public damageShooter(shooter: HumanShooterInstance, amount: number): boolean {
    if (!shooter.isActive || shooter.isDefeated) return false;

    shooter.health = Math.max(0, shooter.health - amount);
    shooter.hitFlashTimer = 0.14;

    // Update mini health bar
    const ratio = Math.max(0, shooter.health / shooter.maxHealth);
    shooter.healthBarFill.scale.x = ratio;
    shooter.healthBarFill.position.x = -(1 - ratio) * 0.4;
    shooter.healthBarGroup.visible = true;

    // Luminous hit flash
    shooter.suitMaterial.emissive.setHex(0xffffff);
    shooter.suitMaterial.emissiveIntensity = 1.2;
    shooter.vestMaterial.emissive.setHex(0xffffff);
    shooter.vestMaterial.emissiveIntensity = 1.2;

    this.onEnemyHit?.(shooter, shooter.health);

    if (shooter.health <= 0) {
      this.defeatShooter(shooter);
      return true;
    }

    return false;
  }

  public defeatShooter(shooter: HumanShooterInstance): void {
    if (!shooter.isActive || shooter.isDefeated) return;

    shooter.isDefeated = true;
    shooter.defeatTimer = 0.6; // 0.6s smooth defeat dissolve
    shooter.healthBarGroup.visible = false;
    shooter.muzzleGlow.visible = false;

    this.onEnemyDefeated?.(shooter);
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    playerLaneIndex: number,
    isPlaying: boolean
  ): void {
    this.animClock += delta;

    // 1. Procedural Spawning Ahead (fair distance, e.g. 32–45m ahead)
    if (isPlaying && HUMAN_ENEMY_CONFIG.enabled) {
      this.spawnCooldown -= delta;
      if (this.spawnCooldown <= 0 && this.getActiveCount() < HUMAN_ENEMY_CONFIG.maximumActiveEnemies) {
        if (playerPos.z < this.nextSpawnZ) {
          // Select fair lane (differing from player lane 60% of the time)
          const targetLane = Math.random() < 0.6
            ? (playerLaneIndex + (Math.random() < 0.5 ? 1 : 2)) % 3
            : playerLaneIndex;

          const spawnDist = HUMAN_ENEMY_CONFIG.spawnDistance + Math.random() * 12;
          const spawnZ = playerPos.z - spawnDist;

          let type: HumanShooterType = 'SCOUT';
          if (this.difficulty === 'HIGH') {
            type = Math.random() < 0.5 ? 'ELITE' : 'RAPID';
          } else if (this.difficulty === 'MEDIUM') {
            type = Math.random() < 0.6 ? 'RAPID' : 'SCOUT';
          }

          this.spawnShooter(type, targetLane, spawnZ);
          this.nextSpawnZ = playerPos.z - (45 + Math.random() * 30);
          this.spawnCooldown = 2.4 + Math.random() * 2.0;
        }
      }
    }

    // 2. Update Active Human Shooters
    for (let i = 0; i < this.pool.length; i++) {
      const shooter = this.pool[i];
      if (!shooter.isActive) continue;

      // Defeat animation and recycling
      if (shooter.isDefeated) {
        shooter.defeatTimer -= delta;
        shooter.mesh.rotation.y += delta * 7.0;
        shooter.mesh.position.y -= delta * 2.5;
        const scale = Math.max(0.01, shooter.defeatTimer / 0.6);
        shooter.mesh.scale.set(scale, scale, scale);

        if (shooter.defeatTimer <= 0) {
          this.deactivateShooter(shooter);
        }
        continue;
      }

      // Hit flash recovery
      if (shooter.hitFlashTimer > 0) {
        shooter.hitFlashTimer -= delta;
        if (shooter.hitFlashTimer <= 0) {
          shooter.suitMaterial.emissive.setHex(0x000000);
          shooter.suitMaterial.emissiveIntensity = 0.0;
          shooter.vestMaterial.emissive.setHex(0x000000);
          shooter.vestMaterial.emissiveIntensity = 0.0;
        }
      }

      if (isPlaying) {
        // Forward patrol motion (runs toward player)
        shooter.mesh.position.z += shooter.speed * delta;

        // Articulated Running Animation
        const runCycle = Math.sin(this.animClock * 9.0 + i);
        shooter.leftLeg.rotation.x = runCycle * 0.5;
        shooter.rightLeg.rotation.x = -runCycle * 0.5;
        shooter.leftArm.rotation.x = -runCycle * 0.4;
        shooter.torso.position.y = 1.45 + Math.abs(runCycle) * 0.06;

        const distAhead = playerPos.z - shooter.mesh.position.z;

        // Combat Shooting Logic (fair range: 10m to 55m ahead)
        if (distAhead > HUMAN_ENEMY_CONFIG.minimumAttackDistance && distAhead < 60) {
          shooter.attackCooldown -= delta;

          // Telegraph Aiming Warning (0.65s before firing)
          if (shooter.attackCooldown <= 0.65 && !shooter.isAiming) {
            shooter.isAiming = true;
            shooter.aimTimer = 0.65;
            shooter.muzzleGlow.visible = true;

            // Raise launcher arm in aim stance
            shooter.rightArm.rotation.x = -Math.PI / 2.2;
            this.onEnemyAiming?.(shooter, shooter.laneIndex);
          }

          // Fire projectile
          if (shooter.attackCooldown <= 0) {
            shooter.isAiming = false;
            shooter.muzzleGlow.visible = false;

            const cfg = HUMAN_ENEMY_CONFIG.types[shooter.type];
            shooter.attackCooldown = cfg.attackCooldown + Math.random() * 0.8;

            // Compute fire origin and fair prediction aim point
            const origin = shooter.mesh.position.clone();
            origin.y += 1.4;
            origin.z += 0.8;

            // Aim target: player position with slight non-perfect offset
            const targetPos = playerPos.clone();
            targetPos.y += 1.0;
            // Slight human aiming inaccuracy (+-0.45 X) so dodging is intuitive
            targetPos.x += (Math.random() - 0.5) * 0.65;

            // Fire projectile via projectile manager
            this.projectileManager.spawn(
              origin,
              targetPos,
              'HUMAN',
              cfg.damage
            );

            this.onEnemyShoot?.(shooter, origin, targetPos, cfg.damage);

            // Muzzle kick recoil animation
            shooter.rightArm.rotation.x = -Math.PI / 1.8;
          }
        }
      }

      this.updateBoundingBox(shooter);

      // Recycle if passed behind player
      if (shooter.mesh.position.z > playerPos.z + 14) {
        this.deactivateShooter(shooter);
      }
    }
  }

  private updateBoundingBox(shooter: HumanShooterInstance): void {
    const p = shooter.mesh.position;
    // Human character bounding box: W: 0.9m, H: 2.1m, D: 0.8m
    shooter.boundingBox.min.set(p.x - 0.45, p.y + 0.1, p.z - 0.4);
    shooter.boundingBox.max.set(p.x + 0.45, p.y + 2.2, p.z + 0.4);
  }

  public deactivateShooter(shooter: HumanShooterInstance): void {
    shooter.isActive = false;
    shooter.isDefeated = false;
    shooter.mesh.visible = false;
    shooter.mesh.position.set(0, -100, 0);
  }

  public reset(): void {
    for (let i = 0; i < this.pool.length; i++) {
      this.deactivateShooter(this.pool[i]);
    }
    this.nextSpawnZ = -65;
    this.spawnCooldown = 2.0;
  }

  public dispose(): void {
    for (let i = 0; i < this.pool.length; i++) {
      this.scene.remove(this.pool[i].mesh);
    }
    this.pool = [];
  }
}
