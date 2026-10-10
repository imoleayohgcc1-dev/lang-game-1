/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import {
  ENEMY_PROJECTILE_DAMAGE,
  DRAGON_PROJECTILE_DAMAGE,
  SMALL_RANGED_DAMAGE,
  MEDIUM_RANGED_DAMAGE,
} from './combatConfig';

export type EnemyProjectileSource = 'DRONE' | 'CREATURE' | 'DRAGON' | 'BEAST' | 'HUMAN';

export interface EnemyProjectileInstance {
  mesh: THREE.Group;
  velocity: THREE.Vector3;
  isActive: boolean;
  distanceTraveled: number;
  maxDistance: number;
  damage: number;
  source: EnemyProjectileSource;
  boundingBox: THREE.Box3;
  coreMesh: THREE.Mesh;
  haloMesh: THREE.Mesh;
  trailMesh: THREE.Mesh;
  glowMaterial: THREE.MeshBasicMaterial;
  coreMaterial: THREE.MeshBasicMaterial;
}

export class EnemyProjectileManager {
  private scene: THREE.Scene;
  public pool: EnemyProjectileInstance[] = [];
  private poolSize = 30;

  // Shared geometries
  private coreGeo: THREE.SphereGeometry;
  private haloGeo: THREE.SphereGeometry;
  private trailGeo: THREE.CylinderGeometry;

  // Callbacks
  public onPlayerHit?: (damage: number, source: EnemyProjectileSource) => void;
  public onProjectileDestroyed?: (pos: THREE.Vector3) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Build shared geometries
    this.coreGeo = new THREE.SphereGeometry(0.24, 12, 10);
    this.haloGeo = new THREE.SphereGeometry(0.42, 12, 10);
    this.trailGeo = new THREE.CylinderGeometry(0.12, 0.28, 1.2, 8);
    this.trailGeo.rotateX(Math.PI / 2);

    this.buildPool();
  }

  private buildPool(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const group = new THREE.Group();
      group.name = `enemy_projectile_${i}`;

      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const coreMesh = new THREE.Mesh(this.coreGeo, coreMat);
      group.add(coreMesh);

      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xef4444, // High-contrast neon crimson
        transparent: true,
        opacity: 0.75,
      });
      const haloMesh = new THREE.Mesh(this.haloGeo, glowMat);
      group.add(haloMesh);

      // Trailing tail for high visibility
      const trailMesh = new THREE.Mesh(this.trailGeo, glowMat);
      trailMesh.position.set(0, 0, 0.6);
      group.add(trailMesh);

      group.visible = false;
      group.position.set(0, -100, 0);
      this.scene.add(group);

      this.pool.push({
        mesh: group,
        velocity: new THREE.Vector3(0, 0, 26),
        isActive: false,
        distanceTraveled: 0,
        maxDistance: 120,
        damage: ENEMY_PROJECTILE_DAMAGE,
        source: 'CREATURE',
        boundingBox: new THREE.Box3(),
        coreMesh,
        haloMesh,
        trailMesh,
        glowMaterial: glowMat,
        coreMaterial: coreMat,
      });
    }
  }

  /**
   * Spawns an enemy projectile heading towards player
   */
  public spawn(
    origin: THREE.Vector3,
    targetPos: THREE.Vector3,
    source: EnemyProjectileSource = 'CREATURE',
    customDamage?: number
  ): EnemyProjectileInstance | null {
    const proj = this.pool.find((p) => !p.isActive);
    if (!proj) return null;

    proj.isActive = true;
    proj.distanceTraveled = 0;
    proj.source = source;

    // Configurable damage by enemy source
    if (customDamage !== undefined) {
      proj.damage = customDamage;
    } else if (source === 'DRAGON') {
      proj.damage = DRAGON_PROJECTILE_DAMAGE;
    } else if (source === 'BEAST') {
      proj.damage = MEDIUM_RANGED_DAMAGE;
    } else if (source === 'DRONE') {
      proj.damage = SMALL_RANGED_DAMAGE;
    } else {
      proj.damage = ENEMY_PROJECTILE_DAMAGE;
    }

    // Appearance by source for easy identification
    if (source === 'DRAGON') {
      proj.mesh.scale.set(1.5, 1.5, 1.5);
      proj.glowMaterial.color.setHex(0xf97316); // Molten amber-orange
      proj.coreMaterial.color.setHex(0xfff7ed);
    } else if (source === 'BEAST') {
      proj.mesh.scale.set(1.2, 1.2, 1.2);
      proj.glowMaterial.color.setHex(0xa855f7); // Neon violet/purple
      proj.coreMaterial.color.setHex(0xffffff);
    } else if (source === 'HUMAN') {
      proj.mesh.scale.set(1.15, 1.15, 1.15);
      proj.glowMaterial.color.setHex(0x06b6d4); // Vivid cyber cyan light projectile
      proj.coreMaterial.color.setHex(0xfef08a); // Luminous plasma core
    } else {
      proj.mesh.scale.set(1.0, 1.0, 1.0);
      proj.glowMaterial.color.setHex(0xef4444); // Neon crimson
      proj.coreMaterial.color.setHex(0xffffff);
    }

    proj.mesh.position.copy(origin);

    // Aim toward player with slight imperfection to allow dodging
    // Add tiny random spread (+-0.5 X) so dodging is intuitive and fair
    const aimTarget = targetPos.clone();
    aimTarget.x += (Math.random() - 0.5) * 0.8;
    aimTarget.y = Math.max(0.6, aimTarget.y); // Ground height

    const dir = aimTarget.sub(origin).normalize();
    const speed = source === 'DRAGON' ? 24.0 : 26.0;
    proj.velocity.copy(dir).multiplyScalar(speed);

    // Orient towards flight direction
    proj.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);

    proj.mesh.visible = true;
    this.updateBoundingBox(proj);

    return proj;
  }

  private updateBoundingBox(proj: EnemyProjectileInstance): void {
    const p = proj.mesh.position;
    const r = proj.source === 'DRAGON' ? 0.6 : 0.4;
    proj.boundingBox.min.set(p.x - r, p.y - r, p.z - r);
    proj.boundingBox.max.set(p.x + r, p.y + r, p.z + r);
  }

  /**
   * Update active projectiles, check collisions with player and player projectiles
   */
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    playerBox: THREE.Box3,
    isPlaying: boolean
  ): void {
    for (let i = 0; i < this.pool.length; i++) {
      const proj = this.pool[i];
      if (!proj.isActive) continue;

      // Move along velocity
      const step = proj.velocity.clone().multiplyScalar(delta);
      proj.mesh.position.add(step);
      proj.distanceTraveled += step.length();

      // Gentle spin for organic pulse
      proj.mesh.rotation.z += delta * 6.0;

      this.updateBoundingBox(proj);

      // Check collision with player
      if (isPlaying && Math.abs(proj.mesh.position.z - playerPos.z) < 2.5) {
        if (playerBox.intersectsBox(proj.boundingBox)) {
          this.onPlayerHit?.(proj.damage, proj.source);
          this.destroyProjectile(proj);
          continue;
        }
      }

      // Recycle if passed behind player or traveled too far
      if (proj.mesh.position.z > playerPos.z + 12 || proj.distanceTraveled > proj.maxDistance) {
        this.deactivate(proj);
      }
    }
  }

  /**
   * Destroys projectile (e.g. shot down by player blaster or bomb)
   */
  public destroyProjectile(proj: EnemyProjectileInstance): void {
    if (!proj.isActive) return;
    this.onProjectileDestroyed?.(proj.mesh.position.clone());
    this.deactivate(proj);
  }

  public deactivate(proj: EnemyProjectileInstance): void {
    proj.isActive = false;
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
    this.coreGeo.dispose();
    this.haloGeo.dispose();
    this.trailGeo.dispose();
  }
}
