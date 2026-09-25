import * as THREE from 'three';
import { GraphicsQuality } from './constants';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
  size: number;
}

export class VFXManager {
  private scene: THREE.Scene;
  private quality: GraphicsQuality = 'MEDIUM';

  // Pooled particle system
  private maxParticles = 120;
  private particles: Particle[] = [];
  private activeCount: number = 0;

  private geometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private material: THREE.PointsMaterial;
  private pointsMesh: THREE.Points;

  // Speed lines mesh
  private speedLinesMesh: THREE.LineSegments | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.pointsMesh = new THREE.Points(this.geometry, this.material);
    this.pointsMesh.name = 'vfx_particles';
    this.pointsMesh.frustumCulled = false;
    this.scene.add(this.pointsMesh);

    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        position: new THREE.Vector3(0, -100, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        life: 0,
        maxLife: 1.0,
        color: new THREE.Color(1, 1, 1),
        size: 1.0,
      });
    }

    this.setupSpeedLines();
  }

  private setupSpeedLines(): void {
    const lineCount = 20;
    const lineGeo = new THREE.BufferGeometry();
    const linePositions = new Float32Array(lineCount * 6);

    for (let i = 0; i < lineCount; i++) {
      const x = (Math.random() - 0.5) * 14;
      const y = Math.random() * 4 + 0.5;
      const z = -Math.random() * 40;

      linePositions[i * 6] = x;
      linePositions[i * 6 + 1] = y;
      linePositions[i * 6 + 2] = z;

      linePositions[i * 6 + 3] = x;
      linePositions[i * 6 + 4] = y;
      linePositions[i * 6 + 5] = z + 3.0; // streak length
    }

    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0,
    });

    this.speedLinesMesh = new THREE.LineSegments(lineGeo, lineMat);
    this.scene.add(this.speedLinesMesh);
  }

  public setQuality(quality: GraphicsQuality): void {
    this.quality = quality;
    if (this.pointsMesh) {
      this.pointsMesh.visible = quality !== 'LOW';
    }
    if (this.speedLinesMesh) {
      this.speedLinesMesh.visible = quality === 'HIGH';
    }
  }

  /**
   * Spawn a burst of particles at location with color
   */
  public spawnBurst(origin: THREE.Vector3, colorHex: number, count: number = 8, speed: number = 4.0): void {
    if (this.quality === 'LOW') return;

    const actualCount = this.quality === 'MEDIUM' ? Math.min(count, 6) : count;
    const col = new THREE.Color(colorHex);

    for (let i = 0; i < actualCount; i++) {
      if (this.activeCount >= this.maxParticles) break;

      const p = this.particles[this.activeCount];
      p.position.copy(origin);
      p.velocity.set(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.8 + 0.5,
        (Math.random() - 0.5) * speed
      );
      p.life = 0;
      p.maxLife = 0.35 + Math.random() * 0.25;
      p.color.copy(col);
      p.size = 1.2 + Math.random() * 1.5;

      this.activeCount++;
    }
  }

  public triggerCoinCollect(pos: THREE.Vector3): void {
    this.spawnBurst(pos, 0xfbbf24, 7, 3.5);
  }

  public triggerPowerUpCollect(pos: THREE.Vector3, color: number): void {
    this.spawnBurst(pos, color, 14, 5.5);
  }

  public triggerEnemyDefeat(pos: THREE.Vector3): void {
    this.spawnBurst(pos, 0xef4444, 16, 6.0);
  }

  public triggerLandingPuff(pos: THREE.Vector3): void {
    this.spawnBurst(new THREE.Vector3(pos.x, 0.1, pos.z), 0x94a3b8, 6, 2.0);
  }

  public update(delta: number, currentSpeed: number, playerZ: number): void {
    // 1. Update particles
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.geometry.attributes.color as THREE.BufferAttribute;

    let writeIdx = 0;
    for (let i = 0; i < this.activeCount; i++) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life < p.maxLife) {
        p.position.addScaledVector(p.velocity, delta);
        p.velocity.y -= 9.8 * delta; // gravity

        const alpha = 1.0 - p.life / p.maxLife;

        this.positions[writeIdx * 3] = p.position.x;
        this.positions[writeIdx * 3 + 1] = p.position.y;
        this.positions[writeIdx * 3 + 2] = p.position.z;

        this.colors[writeIdx * 3] = p.color.r * alpha;
        this.colors[writeIdx * 3 + 1] = p.color.g * alpha;
        this.colors[writeIdx * 3 + 2] = p.color.b * alpha;

        this.sizes[writeIdx] = p.size * alpha;
        writeIdx++;
      }
    }

    // Hide remaining positions
    for (let i = writeIdx; i < this.maxParticles; i++) {
      this.positions[i * 3 + 1] = -100;
    }

    this.activeCount = writeIdx;
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    // 2. Speed lines effect
    if (this.speedLinesMesh && this.quality === 'HIGH') {
      const mat = this.speedLinesMesh.material as THREE.LineBasicMaterial;
      if (currentSpeed > 24) {
        mat.opacity = Math.min(0.45, (currentSpeed - 24) * 0.05);
        this.speedLinesMesh.position.z = playerZ - 10;
      } else {
        mat.opacity = 0;
      }
    }
  }

  public reset(): void {
    this.activeCount = 0;
    for (let i = 0; i < this.maxParticles; i++) {
      this.positions[i * 3 + 1] = -100;
    }
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose(): void {
    this.scene.remove(this.pointsMesh);
    if (this.speedLinesMesh) {
      this.scene.remove(this.speedLinesMesh);
      this.speedLinesMesh.geometry.dispose();
      (this.speedLinesMesh.material as THREE.Material).dispose();
    }
    this.geometry.dispose();
    this.material.dispose();
  }
}
