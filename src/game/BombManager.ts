import * as THREE from 'three';
import { BOMB_CONFIG } from './combatConfig';
import { EnemyInstance } from './EnemyManager';
import { ObstacleInstance } from './ObstacleManager';

export interface BombEntity {
  mesh: THREE.Group;
  isActive: boolean;
  startX: number;
  startY: number;
  startZ: number;
  targetZ: number;
  elapsedTime: number;
  flightDuration: number;
}

export interface BombExplosionVFX {
  group: THREE.Group;
  isActive: boolean;
  timer: number;
  maxDuration: number;
  ringMesh: THREE.Mesh;
  coreSphere: THREE.Mesh;
}

export class BombManager {
  private scene: THREE.Scene;
  private bombPool: BombEntity[] = [];
  private bombPoolSize = 6;

  private vfxPool: BombExplosionVFX[] = [];
  private vfxPoolSize = 6;

  public currentBombs: number = BOMB_CONFIG.startingBombs;
  public maxBombs: number = BOMB_CONFIG.maximumBombs;
  public cooldownTimer: number = 0;

  // Callbacks
  public onBombDetonated?: (center: THREE.Vector3, enemiesDamaged: number) => void;
  public onBombCountChanged?: (count: number) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildBombPool();
    this.buildVfxPool();
  }

  private buildBombPool(): void {
    const sphereGeo = new THREE.SphereGeometry(0.35, 12, 10);
    const ringGeo = new THREE.TorusGeometry(0.42, 0.06, 6, 16);
    const capGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.18, 8);

    const bombMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b, // Deep indigo
      roughness: 0.3,
      metalness: 0.8,
    });

    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7, // Neon purple
      wireframe: false,
    });

    const fuseMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b, // Amber spark
    });

    for (let i = 0; i < this.bombPoolSize; i++) {
      const group = new THREE.Group();
      group.name = `bomb_${i}`;

      const body = new THREE.Mesh(sphereGeo, bombMat);
      group.add(body);

      const ring = new THREE.Mesh(ringGeo, glowMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      const cap = new THREE.Mesh(capGeo, fuseMat);
      cap.position.y = 0.38;
      group.add(cap);

      group.visible = false;
      group.position.set(0, -100, 0);
      this.scene.add(group);

      this.bombPool.push({
        mesh: group,
        isActive: false,
        startX: 0,
        startY: 0,
        startZ: 0,
        targetZ: 0,
        elapsedTime: 0,
        flightDuration: 0.6,
      });
    }
  }

  private buildVfxPool(): void {
    const ringGeo = new THREE.RingGeometry(0.5, 1.2, 24);
    ringGeo.rotateX(-Math.PI / 2);

    const sphereGeo = new THREE.SphereGeometry(1.0, 12, 10);

    for (let i = 0; i < this.vfxPoolSize; i++) {
      const group = new THREE.Group();
      group.name = `bomb_vfx_${i}`;

      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      group.add(ringMesh);

      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.95,
      });
      const coreSphere = new THREE.Mesh(sphereGeo, coreMat);
      group.add(coreSphere);

      group.visible = false;
      group.position.set(0, -100, 0);
      this.scene.add(group);

      this.vfxPool.push({
        group,
        isActive: false,
        timer: 0,
        maxDuration: 0.45,
        ringMesh,
        coreSphere,
      });
    }
  }

  /**
   * Throw a bomb forward from the player
   */
  public throwBomb(playerPos: THREE.Vector3): boolean {
    if (this.currentBombs <= 0) return false;
    if (this.cooldownTimer > 0) return false;

    const bomb = this.bombPool.find((b) => !b.isActive);
    if (!bomb) return false;

    this.currentBombs--;
    this.cooldownTimer = BOMB_CONFIG.cooldown;
    this.onBombCountChanged?.(this.currentBombs);

    bomb.isActive = true;
    bomb.startX = playerPos.x;
    bomb.startY = playerPos.y + 0.8;
    bomb.startZ = playerPos.z;
    bomb.targetZ = playerPos.z - BOMB_CONFIG.throwDistance;
    bomb.elapsedTime = 0;
    // Calculate flight duration based on distance and speed
    const dist = BOMB_CONFIG.throwDistance;
    bomb.flightDuration = Math.max(0.4, dist / BOMB_CONFIG.projectileSpeed);

    bomb.mesh.position.set(bomb.startX, bomb.startY, bomb.startZ);
    bomb.mesh.visible = true;

    return true;
  }

  public addBombs(count: number = 1): number {
    const prev = this.currentBombs;
    this.currentBombs = Math.min(this.maxBombs, this.currentBombs + count);
    if (this.currentBombs !== prev) {
      this.onBombCountChanged?.(this.currentBombs);
    }
    return this.currentBombs;
  }

  public update(delta: number, enemies: EnemyInstance[], obstacles?: ObstacleInstance[]): void {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer = Math.max(0, this.cooldownTimer - delta);
    }

    // Update active flying bombs
    for (let i = 0; i < this.bombPool.length; i++) {
      const bomb = this.bombPool[i];
      if (!bomb.isActive) continue;

      bomb.elapsedTime += delta;
      const progress = Math.min(1.0, bomb.elapsedTime / bomb.flightDuration);

      // Interpolate horizontal & forward position
      const curZ = THREE.MathUtils.lerp(bomb.startZ, bomb.targetZ, progress);
      // Parabolic arc for vertical position
      const arcHeight = Math.sin(progress * Math.PI) * 2.8;
      const curY = THREE.MathUtils.lerp(bomb.startY, 0.4, progress) + arcHeight;

      bomb.mesh.position.set(bomb.startX, curY, curZ);
      bomb.mesh.rotation.x += delta * 12.0;
      bomb.mesh.rotation.y += delta * 8.0;

      // Detonate upon completion of flight
      if (progress >= 1.0) {
        this.detonate(bomb, enemies, obstacles);
      }
    }

    // Update explosion VFX
    for (let i = 0; i < this.vfxPool.length; i++) {
      const vfx = this.vfxPool[i];
      if (!vfx.isActive) continue;

      vfx.timer += delta;
      const progress = Math.min(1.0, vfx.timer / vfx.maxDuration);

      // Expand ring and core
      const ringScale = THREE.MathUtils.lerp(1.0, BOMB_CONFIG.outerRadius, progress);
      vfx.ringMesh.scale.set(ringScale, ringScale, ringScale);

      const coreScale = THREE.MathUtils.lerp(1.0, 3.5, Math.sin(progress * Math.PI));
      vfx.coreSphere.scale.set(coreScale, coreScale, coreScale);

      // Fade out
      const ringMat = vfx.ringMesh.material as THREE.MeshBasicMaterial;
      const coreMat = vfx.coreSphere.material as THREE.MeshBasicMaterial;
      ringMat.opacity = Math.max(0, 1.0 - progress);
      coreMat.opacity = Math.max(0, 1.0 - progress);

      if (progress >= 1.0) {
        vfx.isActive = false;
        vfx.group.visible = false;
        vfx.group.position.set(0, -100, 0);
      }
    }
  }

  private detonate(bomb: BombEntity, enemies: EnemyInstance[], obstacles?: ObstacleInstance[]): void {
    const blastCenter = bomb.mesh.position.clone();
    blastCenter.y = 0.5;

    // Reset bomb entity
    bomb.isActive = false;
    bomb.mesh.visible = false;
    bomb.mesh.position.set(0, -100, 0);

    // Trigger visual explosion
    this.spawnExplosionVFX(blastCenter);

    // Apply area damage to all enemies in blast radius
    let hitCount = 0;
    const innerRad = BOMB_CONFIG.innerRadius;
    const outerRad = BOMB_CONFIG.outerRadius;

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy.isActive || enemy.isDefeated) continue;

      const ePos = enemy.mesh.position;
      const dist = Math.hypot(ePos.x - blastCenter.x, ePos.z - blastCenter.z);

      if (dist <= outerRad) {
        hitCount++;
        // Radial damage calculation:
        // Full damage inside inner radius
        // Reduced damage near outer radius
        let damageToApply = BOMB_CONFIG.damage;
        if (dist > innerRad) {
          damageToApply = BOMB_CONFIG.reducedDamage;
        }

        // Apply damage directly to enemy
        enemy.health -= damageToApply;
        enemy.hitFlashTimer = 0.15;
        enemy.coreMaterial.emissive.setHex(0xffffff);
        enemy.coreMaterial.emissiveIntensity = 2.0;

        if (enemy.health <= 0) {
          enemy.isDefeated = true;
          enemy.defeatTimer = 0.3;
        }
      }
    }

    // Also blast away obstacles in radius!
    if (obstacles) {
      for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        if (!obs.isActive) continue;
        const dist = Math.hypot(obs.mesh.position.x - blastCenter.x, obs.zPos - blastCenter.z);
        if (dist <= outerRad) {
          obs.isActive = false;
          obs.mesh.visible = false;
          obs.mesh.position.set(0, -100, 0);
        }
      }
    }

    this.onBombDetonated?.(blastCenter, hitCount);
  }

  private spawnExplosionVFX(pos: THREE.Vector3): void {
    const vfx = this.vfxPool.find((v) => !v.isActive);
    if (!vfx) return;

    vfx.isActive = true;
    vfx.timer = 0;
    vfx.group.position.copy(pos);
    vfx.group.visible = true;

    vfx.ringMesh.scale.set(1, 1, 1);
    vfx.coreSphere.scale.set(1, 1, 1);

    const ringMat = vfx.ringMesh.material as THREE.MeshBasicMaterial;
    const coreMat = vfx.coreSphere.material as THREE.MeshBasicMaterial;
    ringMat.opacity = 0.95;
    coreMat.opacity = 0.95;
  }

  public reset(bombs: number = BOMB_CONFIG.startingBombs): void {
    this.currentBombs = bombs;
    this.cooldownTimer = 0;

    for (let i = 0; i < this.bombPool.length; i++) {
      const b = this.bombPool[i];
      b.isActive = false;
      b.mesh.visible = false;
      b.mesh.position.set(0, -100, 0);
    }

    for (let i = 0; i < this.vfxPool.length; i++) {
      const v = this.vfxPool[i];
      v.isActive = false;
      v.group.visible = false;
      v.group.position.set(0, -100, 0);
    }

    this.onBombCountChanged?.(this.currentBombs);
  }

  public dispose(): void {
    for (let i = 0; i < this.bombPool.length; i++) {
      this.scene.remove(this.bombPool[i].mesh);
    }
    for (let i = 0; i < this.vfxPool.length; i++) {
      this.scene.remove(this.vfxPool[i].group);
    }
    this.bombPool = [];
    this.vfxPool = [];
  }
}
