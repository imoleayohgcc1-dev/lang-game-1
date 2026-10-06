import * as THREE from 'three';
import { GAME_CONFIG } from './constants';
import { PickupType } from './combatTypes';
import {
  PICKUP_DEFINITIONS,
  selectRandomEnemyDrop,
  PICKUP_DROP_RATE,
} from './combatConfig';

export interface PickupInstance {
  mesh: THREE.Group;
  type: PickupType;
  isActive: boolean;
  laneIndex: number;
  zPos: number;
  baseY: number;
  bobOffset: number;
  boundingBox: THREE.Box3;
  isCollected: boolean; // guards duplicate collection
}

export interface ActiveEffectState {
  type: PickupType;
  name: string;
  color: number;
  remainingDuration: number;
  maxDuration: number;
}

export class PickupManager {
  private scene: THREE.Scene;
  public pool: PickupInstance[] = [];
  private poolSize = 24;
  private animTime: number = 0;
  private nextSpawnZ: number = -50;
  private spawnIntervalMultiplier: number = 1.0;

  // Active duration-based status map (e.g. SHIELD, MAGNET, MULTIPLIER, etc.)
  private activeEffects: Map<PickupType, ActiveEffectState> = new Map();

  // Shared geometries & materials
  private sharedGeos: Record<string, THREE.BufferGeometry> = {};
  private sharedMats: Record<string, THREE.Material> = {};

  // Callbacks
  public onPickupCollected?: (type: PickupType, value: number, duration: number) => void;
  public onEffectExpired?: (type: PickupType) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initSharedAssets();
    this.buildPool();
  }

  private initSharedAssets(): void {
    // Geometries
    this.sharedGeos['cube'] = new THREE.BoxGeometry(0.75, 0.75, 0.75);
    this.sharedGeos['octa'] = new THREE.OctahedronGeometry(0.65, 0);
    this.sharedGeos['cross_v'] = new THREE.BoxGeometry(0.24, 0.72, 0.24);
    this.sharedGeos['cross_h'] = new THREE.BoxGeometry(0.72, 0.24, 0.24);
    this.sharedGeos['torus'] = new THREE.TorusGeometry(0.75, 0.08, 8, 20);
    this.sharedGeos['cylinder'] = new THREE.CylinderGeometry(0.25, 0.25, 0.7, 12);
    this.sharedGeos['sphere'] = new THREE.SphereGeometry(0.5, 12, 10);

    // Materials per pickup type
    const types: PickupType[] = [
      'COIN',
      'HEALTH',
      'MAX_HEALTH',
      'BOMB',
      'BIG_BULLET',
      'MACHINE_GUN',
      'SHIELD',
      'MAGNET',
      'COIN_MULTIPLIER',
    ];

    types.forEach((t) => {
      const def = PICKUP_DEFINITIONS[t];
      this.sharedMats[t] = new THREE.MeshStandardMaterial({
        color: def.color,
        emissive: def.color,
        emissiveIntensity: 0.85,
        roughness: 0.25,
        metalness: 0.8,
      });
    });

    this.sharedMats['aura'] = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
    });
  }

  private createPickupMesh(type: PickupType): THREE.Group {
    const group = new THREE.Group();
    group.name = `pickup_${type}`;

    const mat = this.sharedMats[type];

    switch (type) {
      case 'HEALTH': {
        const v = new THREE.Mesh(this.sharedGeos['cross_v'], mat);
        const h = new THREE.Mesh(this.sharedGeos['cross_h'], mat);
        group.add(v);
        group.add(h);
        break;
      }
      case 'MAX_HEALTH': {
        const v = new THREE.Mesh(this.sharedGeos['cross_v'], mat);
        const h = new THREE.Mesh(this.sharedGeos['cross_h'], mat);
        const ring = new THREE.Mesh(this.sharedGeos['torus'], this.sharedMats['aura']);
        group.add(v);
        group.add(h);
        group.add(ring);
        break;
      }
      case 'BOMB': {
        const sphere = new THREE.Mesh(this.sharedGeos['sphere'], mat);
        const ring = new THREE.Mesh(this.sharedGeos['torus'], this.sharedMats['aura']);
        ring.rotation.x = Math.PI / 2;
        group.add(sphere);
        group.add(ring);
        break;
      }
      case 'BIG_BULLET': {
        const core = new THREE.Mesh(this.sharedGeos['octa'], mat);
        core.scale.set(1.2, 1.2, 1.2);
        group.add(core);
        break;
      }
      case 'MACHINE_GUN': {
        const cyl1 = new THREE.Mesh(this.sharedGeos['cylinder'], mat);
        cyl1.rotation.z = Math.PI / 4;
        const cyl2 = new THREE.Mesh(this.sharedGeos['cylinder'], mat);
        cyl2.rotation.z = -Math.PI / 4;
        group.add(cyl1);
        group.add(cyl2);
        break;
      }
      case 'SHIELD':
      case 'MAGNET':
      case 'COIN_MULTIPLIER':
      case 'COIN':
      default: {
        const octa = new THREE.Mesh(this.sharedGeos['octa'], mat);
        const halo = new THREE.Mesh(this.sharedGeos['torus'], this.sharedMats['aura']);
        halo.rotation.x = Math.PI / 2;
        group.add(octa);
        group.add(halo);
        break;
      }
    }

    return group;
  }

  private buildPool(): void {
    const types: PickupType[] = [
      'COIN',
      'HEALTH',
      'BOMB',
      'BIG_BULLET',
      'MACHINE_GUN',
      'SHIELD',
      'MAGNET',
      'COIN_MULTIPLIER',
      'MAX_HEALTH',
    ];

    for (let i = 0; i < this.poolSize; i++) {
      const type = types[i % types.length];
      const mesh = this.createPickupMesh(type);
      mesh.visible = false;
      mesh.position.set(0, -100, 0);
      this.scene.add(mesh);

      this.pool.push({
        mesh,
        type,
        isActive: false,
        laneIndex: 1,
        zPos: 0,
        baseY: 1.1,
        bobOffset: Math.random() * Math.PI * 2,
        boundingBox: new THREE.Box3(),
        isCollected: false,
      });
    }
  }

  /**
   * Spawn a specific pickup type at lane & Z position
   */
  public spawn(type: PickupType, laneIndex: number, zPos: number): PickupInstance | null {
    // Find an inactive pickup of this type, or any inactive pickup and re-mesh
    let p = this.pool.find((item) => !item.isActive && item.type === type);
    if (!p) {
      p = this.pool.find((item) => !item.isActive);
      if (p) {
        // Re-type this slot
        this.scene.remove(p.mesh);
        p.type = type;
        p.mesh = this.createPickupMesh(type);
        this.scene.add(p.mesh);
      }
    }
    if (!p) return null;

    const xPos = GAME_CONFIG.LANES[laneIndex];
    p.isActive = true;
    p.isCollected = false;
    p.laneIndex = laneIndex;
    p.zPos = zPos;
    p.mesh.position.set(xPos, p.baseY, zPos);
    p.mesh.visible = true;

    this.updateBoundingBox(p);
    return p;
  }

  /**
   * Spawn dropped pickup when an enemy is defeated
   */
  public spawnEnemyDrop(pos: THREE.Vector3, laneIndex: number): PickupInstance | null {
    if (Math.random() > PICKUP_DROP_RATE) return null;

    const chosenType = selectRandomEnemyDrop();
    return this.spawn(chosenType, laneIndex, pos.z);
  }

  private updateBoundingBox(p: PickupInstance): void {
    const pos = p.mesh.position;
    p.boundingBox.min.set(pos.x - 0.85, pos.y - 0.85, pos.z - 0.85);
    p.boundingBox.max.set(pos.x + 0.85, pos.y + 0.85, pos.z + 0.85);
  }

  /**
   * Collect pickup once, applying effects and triggering callbacks
   */
  public collect(p: PickupInstance): void {
    if (!p.isActive || p.isCollected) return;

    p.isCollected = true; // Guard against duplicate calls
    const def = PICKUP_DEFINITIONS[p.type];

    if (def.duration > 0) {
      this.activeEffects.set(p.type, {
        type: p.type,
        name: def.name,
        color: def.color,
        remainingDuration: def.duration,
        maxDuration: def.duration,
      });
    }

    this.onPickupCollected?.(p.type, def.value, def.duration);
    this.deactivate(p);
  }

  public deactivate(p: PickupInstance): void {
    p.isActive = false;
    p.isCollected = false;
    p.mesh.visible = false;
    p.mesh.position.set(0, -100, 0);
  }

  public isShieldActive(): boolean {
    return this.activeEffects.has('SHIELD');
  }

  public consumeShield(): boolean {
    if (this.activeEffects.has('SHIELD')) {
      this.activeEffects.delete('SHIELD');
      this.onEffectExpired?.('SHIELD');
      return true;
    }
    return false;
  }

  public isMagnetActive(): boolean {
    return this.activeEffects.has('MAGNET');
  }

  public isMultiplierActive(): boolean {
    return this.activeEffects.has('COIN_MULTIPLIER');
  }

  public getCoinMultiplier(): number {
    return this.isMultiplierActive() ? 2 : 1;
  }

  public getActiveEffects(): ActiveEffectState[] {
    return Array.from(this.activeEffects.values());
  }

  public setFrequency(frequency: 'GENEROUS' | 'STANDARD' | 'SPARSE'): void {
    switch (frequency) {
      case 'GENEROUS':
        this.spawnIntervalMultiplier = 0.75;
        break;
      case 'SPARSE':
        this.spawnIntervalMultiplier = 1.35;
        break;
      case 'STANDARD':
      default:
        this.spawnIntervalMultiplier = 1.0;
        break;
    }
  }

  public generateTrackPickups(playerZ: number): void {
    const lookAhead = 180;
    while (this.nextSpawnZ > playerZ - lookAhead) {
      const candidates: PickupType[] = [
        'COIN',
        'HEALTH',
        'BOMB',
        'BIG_BULLET',
        'MACHINE_GUN',
        'SHIELD',
        'MAGNET',
        'COIN_MULTIPLIER',
      ];
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      const chosenLane = Math.floor(Math.random() * 3);

      this.spawn(chosen, chosenLane, this.nextSpawnZ);

      const baseGap = 45.0 + Math.random() * 35.0;
      this.nextSpawnZ -= baseGap * this.spawnIntervalMultiplier;
    }
  }

  public update(delta: number, playerPos: THREE.Vector3, isPlaying: boolean, isMagnet: boolean = false): void {
    this.animTime += delta;

    if (isPlaying) {
      this.generateTrackPickups(playerPos.z);

      // Decrement duration of active effects
      this.activeEffects.forEach((state, type) => {
        state.remainingDuration -= delta;
        if (state.remainingDuration <= 0) {
          this.activeEffects.delete(type);
          this.onEffectExpired?.(type);
        }
      });
    }

    // Update 3D meshes & check player collision
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.isActive || p.isCollected) continue;

      // Magnet attraction
      if (isPlaying && isMagnet) {
        const distToPlayer = p.mesh.position.distanceTo(playerPos);
        if (distToPlayer < 14.0) {
          const pullSpeed = 16.0 * delta;
          p.mesh.position.lerp(playerPos, Math.min(1.0, pullSpeed));
        }
      }

      // Spin & bob
      p.mesh.rotation.y += delta * 2.6;
      const bob = Math.sin(this.animTime * 3.6 + p.bobOffset) * 0.22;
      p.mesh.position.y = p.baseY + bob;
      this.updateBoundingBox(p);

      // Check player overlap collision
      if (isPlaying) {
        const dx = Math.abs(p.mesh.position.x - playerPos.x);
        const dz = Math.abs(p.mesh.position.z - playerPos.z);
        const dy = Math.abs(p.mesh.position.y - (playerPos.y + 1.0));

        if (dx < 1.3 && dz < 1.5 && dy < 2.0) {
          this.collect(p);
          continue;
        }
      }

      // Recycle if far behind player
      if (p.mesh.position.z > playerPos.z + 16) {
        this.deactivate(p);
      }
    }
  }

  public reset(): void {
    this.activeEffects.clear();
    this.nextSpawnZ = -50;
    for (let i = 0; i < this.pool.length; i++) {
      this.deactivate(this.pool[i]);
    }
  }

  public dispose(): void {
    for (let i = 0; i < this.pool.length; i++) {
      this.scene.remove(this.pool[i].mesh);
    }
    this.pool = [];
    this.activeEffects.clear();
  }
}
