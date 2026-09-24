import * as THREE from 'three';
import { GAME_CONFIG } from './constants';
import { EnemyInstance } from './EnemyManager';

export interface ProjectileInstance {
  mesh: THREE.Group;
  velocity: THREE.Vector3;
  isActive: boolean;
  distanceTraveled: number;
  damage: number;
  boundingBox: THREE.Box3;
  targetEnemy: EnemyInstance | null;
}

export class ProjectileManager {
  private scene: THREE.Scene;
  private pool: ProjectileInstance[] = [];
  private poolSize = GAME_CONFIG.COMBAT.PROJECTILE_POOL_SIZE;

  // Shared geometries and materials
  private boltGeo: THREE.CylinderGeometry;
  private glowGeo: THREE.CylinderGeometry;
  private boltMat: THREE.MeshBasicMaterial;
  private glowMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Outer and core laser bolt geometries
    this.boltGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8);
    this.boltGeo.rotateX(Math.PI / 2);

    this.glowGeo = new THREE.CylinderGeometry(0.16, 0.16, 1.6, 8);
    this.glowGeo.rotateX(Math.PI / 2);

    this.boltMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    this.glowMat = new THREE.MeshBasicMaterial({
      color: GAME_CONFIG.COLORS.PROJECTILE_CYAN,
      transparent: true,
      opacity: 0.75,
    });

    this.buildPool();
  }

  private buildPool(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const group = new THREE.Group();
      group.name = `projectile_${i}`;

      const coreMesh = new THREE.Mesh(this.boltGeo, this.boltMat);
      group.add(coreMesh);

      const glowMesh = new THREE.Mesh(this.glowGeo, this.glowMat);
      group.add(glowMesh);

      group.visible = false;
      group.position.set(0, -100, 0);
      this.scene.add(group);

      this.pool.push({
        mesh: group,
        velocity: new THREE.Vector3(0, 0, -GAME_CONFIG.COMBAT.PROJECTILE_SPEED),
        isActive: false,
        distanceTraveled: 0,
        damage: GAME_CONFIG.COMBAT.PROJECTILE_DAMAGE,
        boundingBox: new THREE.Box3(),
        targetEnemy: null,
      });
    }
  }

  /**
   * Spawn a projectile from muzzle towards target vector with target assist
   */
  public spawn(
    muzzlePos: THREE.Vector3,
    targetDir: THREE.Vector3,
    targetEnemy: EnemyInstance | null = null
  ): ProjectileInstance | null {
    const proj = this.pool.find((p) => !p.isActive);
    if (!proj) return null;

    proj.isActive = true;
    proj.distanceTraveled = 0;
    proj.targetEnemy = targetEnemy;
    proj.mesh.position.copy(muzzlePos);

    // Compute velocity direction
    if (targetEnemy && targetEnemy.isActive) {
      // Calculate lead vector towards enemy center
      const enemyCenter = targetEnemy.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0));
      const aimDir = enemyCenter.sub(muzzlePos).normalize();
      proj.velocity.copy(aimDir).multiplyScalar(GAME_CONFIG.COMBAT.PROJECTILE_SPEED);
      proj.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), aimDir);
    } else {
      // Direct forward shot
      proj.velocity.copy(targetDir).normalize().multiplyScalar(GAME_CONFIG.COMBAT.PROJECTILE_SPEED);
      proj.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), targetDir.normalize());
    }

    proj.mesh.visible = true;
    this.updateBoundingBox(proj);

    return proj;
  }

  private updateBoundingBox(proj: ProjectileInstance): void {
    const p = proj.mesh.position;
    proj.boundingBox.min.set(p.x - 0.35, p.y - 0.35, p.z - 0.8);
    proj.boundingBox.max.set(p.x + 0.35, p.y + 0.35, p.z + 0.8);
  }

  public update(
    delta: number,
    enemies: EnemyInstance[],
    onHit?: (enemy: EnemyInstance, proj: ProjectileInstance) => void
  ): void {
    const maxDist = GAME_CONFIG.COMBAT.PROJECTILE_MAX_DISTANCE;

    for (let i = 0; i < this.pool.length; i++) {
      const proj = this.pool[i];
      if (!proj.isActive) continue;

      // 1. Move projectile
      const step = proj.velocity.clone().multiplyScalar(delta);
      proj.mesh.position.add(step);
      proj.distanceTraveled += step.length();

      this.updateBoundingBox(proj);

      // 2. Check collision against all active enemies
      let hitEnemy: EnemyInstance | null = null;
      for (let e = 0; e < enemies.length; e++) {
        const enemy = enemies[e];
        if (!enemy.isActive || enemy.isDefeated) continue;

        if (proj.boundingBox.intersectsBox(enemy.boundingBox)) {
          hitEnemy = enemy;
          break;
        }
      }

      if (hitEnemy) {
        this.deactivate(proj);
        if (onHit) {
          onHit(hitEnemy, proj);
        }
        continue;
      }

      // 3. Recycle if traveled beyond maximum range
      if (proj.distanceTraveled >= maxDist) {
        this.deactivate(proj);
      }
    }
  }

  public deactivate(proj: ProjectileInstance): void {
    proj.isActive = false;
    proj.targetEnemy = null;
    proj.mesh.visible = false;
    proj.mesh.position.set(0, -100, 0);
  }

  public reset(): void {
    this.pool.forEach((p) => this.deactivate(p));
  }

  public dispose(): void {
    this.pool.forEach((p) => {
      this.scene.remove(p.mesh);
    });
    this.pool = [];

    this.boltGeo.dispose();
    this.glowGeo.dispose();
    this.boltMat.dispose();
    this.glowMat.dispose();
  }
}
