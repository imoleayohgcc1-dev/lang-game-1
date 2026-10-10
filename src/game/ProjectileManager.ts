import * as THREE from 'three';
import { GAME_CONFIG } from './constants';
import { WeaponType } from './combatTypes';
import { WEAPON_CONFIGS } from './combatConfig';
import { EnemyInstance } from './EnemyManager';
import { ObstacleInstance } from './ObstacleManager';
import { DragonInstance, ThrownDragonObstacle } from './DragonManager';
import { EnemyProjectileInstance } from './EnemyProjectileManager';

export interface ProjectileInstance {
  mesh: THREE.Group;
  velocity: THREE.Vector3;
  isActive: boolean;
  distanceTraveled: number;
  damage: number;
  weaponType: WeaponType;
  boundingBox: THREE.Box3;
  targetEnemy: EnemyInstance | null;
  coreMesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
}

export class ProjectileManager {
  private scene: THREE.Scene;
  public pool: ProjectileInstance[] = [];
  private poolSize = 40;

  // Shared geometries
  private boltGeo: THREE.CylinderGeometry;
  private glowGeo: THREE.CylinderGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Laser bolt geometries
    this.boltGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8);
    this.boltGeo.rotateX(Math.PI / 2);

    this.glowGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.6, 8);
    this.glowGeo.rotateX(Math.PI / 2);

    this.buildPool();
  }

  private buildPool(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const group = new THREE.Group();
      group.name = `projectile_${i}`;

      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const coreMesh = new THREE.Mesh(this.boltGeo, coreMat);
      group.add(coreMesh);

      const glowMat = new THREE.MeshBasicMaterial({
        color: GAME_CONFIG.COLORS.PROJECTILE_CYAN,
        transparent: true,
        opacity: 0.8,
      });
      const glowMesh = new THREE.Mesh(this.glowGeo, glowMat);
      group.add(glowMesh);

      group.visible = false;
      group.position.set(0, -100, 0);
      this.scene.add(group);

      this.pool.push({
        mesh: group,
        velocity: new THREE.Vector3(0, 0, -GAME_CONFIG.COMBAT.PROJECTILE_SPEED),
        isActive: false,
        distanceTraveled: 0,
        damage: 1,
        weaponType: 'NORMAL',
        boundingBox: new THREE.Box3(),
        targetEnemy: null,
        coreMesh,
        glowMesh,
      });
    }
  }

  /**
   * Spawn a projectile from muzzle towards target with weapon configuration
   */
  public spawn(
    muzzlePos: THREE.Vector3,
    targetDir: THREE.Vector3,
    targetEnemy: EnemyInstance | null = null,
    weaponType: WeaponType = 'NORMAL'
  ): ProjectileInstance | null {
    const proj = this.pool.find((p) => !p.isActive);
    if (!proj) return null;

    const spec = WEAPON_CONFIGS[weaponType] || WEAPON_CONFIGS.NORMAL;

    proj.isActive = true;
    proj.distanceTraveled = 0;
    proj.targetEnemy = targetEnemy;
    proj.damage = spec.damage;
    proj.weaponType = weaponType;
    proj.mesh.position.copy(muzzlePos);

    // Apply scale and color based on weapon
    proj.mesh.scale.set(spec.projectileScale, spec.projectileScale, spec.projectileScale);
    (proj.glowMesh.material as THREE.MeshBasicMaterial).color.setHex(spec.projectileColor);

    // Compute velocity direction
    const speed = spec.projectileSpeed;
    if (targetEnemy && targetEnemy.isActive) {
      const enemyCenter = targetEnemy.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0));
      const aimDir = enemyCenter.sub(muzzlePos).normalize();
      proj.velocity.copy(aimDir).multiplyScalar(speed);
      proj.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), aimDir);
    } else {
      const dir = targetDir.clone().normalize();
      proj.velocity.copy(dir).multiplyScalar(speed);
      proj.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
    }

    proj.mesh.visible = true;
    this.updateBoundingBox(proj);

    return proj;
  }

  private updateBoundingBox(proj: ProjectileInstance): void {
    const p = proj.mesh.position;
    const halfWidth = proj.weaponType === 'BIG_BULLET' ? 0.8 : 0.4;
    proj.boundingBox.min.set(p.x - halfWidth, p.y - halfWidth, p.z - 1.0);
    proj.boundingBox.max.set(p.x + halfWidth, p.y + halfWidth, p.z + 1.0);
  }

  public update(
    delta: number,
    enemies: EnemyInstance[],
    onHit?: (enemy: EnemyInstance, proj: ProjectileInstance) => void,
    obstacles?: ObstacleInstance[],
    onHitObstacle?: (obs: ObstacleInstance, proj: ProjectileInstance) => void,
    dragon?: DragonInstance | null,
    onHitDragon?: (dragon: DragonInstance, proj: ProjectileInstance) => void,
    thrownObstacles?: ThrownDragonObstacle[],
    onHitThrown?: (item: ThrownDragonObstacle, proj: ProjectileInstance) => void,
    enemyProjectiles?: EnemyProjectileInstance[],
    onHitEnemyProjectile?: (ep: EnemyProjectileInstance, proj: ProjectileInstance) => void
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

      // 2. Check collision against active Dragon boss
      if (dragon && dragon.isActive && dragon.state !== 'DEFEATED') {
        if (proj.boundingBox.intersectsBox(dragon.boundingBox)) {
          if (onHitDragon) {
            onHitDragon(dragon, proj);
          }
          this.deactivate(proj);
          continue;
        }
      }

      // 3. Check collision against active enemies
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
        if (onHit) {
          onHit(hitEnemy, proj);
        }
        this.deactivate(proj);
        continue;
      }

      // 4. Check collision against destructible obstacles
      if (obstacles && onHitObstacle) {
        let hitObs: ObstacleInstance | null = null;
        for (let o = 0; o < obstacles.length; o++) {
          const obs = obstacles[o];
          if (!obs.isActive || !obs.isDestructible) continue;

          if (proj.boundingBox.intersectsBox(obs.boundingBox)) {
            hitObs = obs;
            break;
          }
        }
        if (hitObs) {
          onHitObstacle(hitObs, proj);
          this.deactivate(proj);
          continue;
        }
      }

      // 5. Check collision against thrown dragon hazards
      if (thrownObstacles && onHitThrown) {
        let hitThrown: ThrownDragonObstacle | null = null;
        for (let t = 0; t < thrownObstacles.length; t++) {
          const item = thrownObstacles[t];
          if (!item.isActive || !item.isDestructible) continue;

          if (proj.boundingBox.intersectsBox(item.boundingBox)) {
            hitThrown = item;
            break;
          }
        }
        if (hitThrown) {
          onHitThrown(hitThrown, proj);
          this.deactivate(proj);
          continue;
        }
      }

      // 6. Check collision against incoming enemy projectiles (Interception!)
      if (enemyProjectiles && onHitEnemyProjectile) {
        let hitEp: EnemyProjectileInstance | null = null;
        for (let ep = 0; ep < enemyProjectiles.length; ep++) {
          const enemyProj = enemyProjectiles[ep];
          if (!enemyProj.isActive) continue;

          if (proj.boundingBox.intersectsBox(enemyProj.boundingBox)) {
            hitEp = enemyProj;
            break;
          }
        }
        if (hitEp) {
          onHitEnemyProjectile(hitEp, proj);
          this.deactivate(proj);
          continue;
        }
      }

      // 6. Recycle if traveled beyond maximum range
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

  public destroyProjectile(proj: ProjectileInstance): void {
    this.deactivate(proj);
  }

  public reset(): void {
    for (let i = 0; i < this.pool.length; i++) {
      this.deactivate(this.pool[i]);
    }
  }

  public dispose(): void {
    for (let i = 0; i < this.pool.length; i++) {
      this.scene.remove(this.pool[i].mesh);
    }
    this.pool = [];
  }
}
