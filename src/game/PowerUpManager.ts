import * as THREE from 'three';
import { GAME_CONFIG, PowerUpType } from './constants';

export interface PowerUpInstance {
  mesh: THREE.Group;
  type: PowerUpType;
  isActive: boolean;
  laneIndex: number;
  zPos: number;
  baseY: number;
  bobOffset: number;
  boundingBox: THREE.Box3;
}

export interface ActivePowerUpState {
  type: PowerUpType;
  name: string;
  color: number;
  remainingDuration: number;
  maxDuration: number;
}

export class PowerUpManager {
  private scene: THREE.Scene;
  private pool: PowerUpInstance[] = [];
  private poolSize = GAME_CONFIG.POWERUPS.POOL_SIZE;
  private animTime: number = 0;
  private nextSpawnZ: number = -60;

  // Active status map
  private activePowerUps: Map<PowerUpType, ActivePowerUpState> = new Map();

  // Callbacks
  public onPowerUpCollected?: (type: PowerUpType, duration: number) => void;
  public onPowerUpExpired?: (type: PowerUpType) => void;

  // Geometries and materials
  private sharedGeos: Record<string, THREE.BufferGeometry> = {};
  private sharedMats: Record<string, THREE.Material> = {};

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initSharedAssets();
    this.buildPool();
  }

  private initSharedAssets(): void {
    // Outer floating aura crystal
    this.sharedGeos['crystal'] = new THREE.OctahedronGeometry(0.7, 0);
    this.sharedGeos['haloRing'] = new THREE.TorusGeometry(0.85, 0.06, 8, 24);
    this.sharedGeos['beaconPillar'] = new THREE.CylinderGeometry(0.04, 0.04, 3.5, 8);

    // Materials
    this.sharedMats['magnet'] = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.POWERUPS.TYPES.MAGNET.COLOR,
      emissive: GAME_CONFIG.POWERUPS.TYPES.MAGNET.COLOR,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
    });

    this.sharedMats['shield'] = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.POWERUPS.TYPES.SHIELD.COLOR,
      emissive: GAME_CONFIG.POWERUPS.TYPES.SHIELD.COLOR,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.8,
    });

    this.sharedMats['multiplier'] = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.POWERUPS.TYPES.COIN_MULTIPLIER.COLOR,
      emissive: GAME_CONFIG.POWERUPS.TYPES.COIN_MULTIPLIER.COLOR,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.8,
    });

    this.sharedMats['halo'] = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.65,
    });
  }

  private buildPool(): void {
    const types: PowerUpType[] = ['MAGNET', 'SHIELD', 'COIN_MULTIPLIER'];

    for (let i = 0; i < this.poolSize; i++) {
      const type = types[i % types.length];
      const mesh = this.createPowerUpMesh(type);
      mesh.visible = false;
      mesh.position.set(0, -100, 0);
      this.scene.add(mesh);

      this.pool.push({
        mesh,
        type,
        isActive: false,
        laneIndex: 1,
        zPos: 0,
        baseY: 1.25,
        bobOffset: Math.random() * Math.PI * 2,
        boundingBox: new THREE.Box3(),
      });
    }
  }

  private createPowerUpMesh(type: PowerUpType): THREE.Group {
    const group = new THREE.Group();
    group.name = `powerup_${type}`;

    let mat = this.sharedMats['magnet'];
    if (type === 'SHIELD') mat = this.sharedMats['shield'];
    if (type === 'COIN_MULTIPLIER') mat = this.sharedMats['multiplier'];

    // Core crystal
    const crystal = new THREE.Mesh(this.sharedGeos['crystal'], mat);
    crystal.castShadow = true;
    group.add(crystal);

    // Orbiting halo ring
    const ring = new THREE.Mesh(this.sharedGeos['haloRing'], this.sharedMats['halo']);
    ring.rotation.x = Math.PI / 4;
    group.add(ring);

    // Light beacon shaft
    const beacon = new THREE.Mesh(this.sharedGeos['beaconPillar'], mat);
    beacon.position.y = 1.8;
    group.add(beacon);

    return group;
  }

  /**
   * Spawn a powerup at designated lane and Z
   */
  public spawn(type: PowerUpType, laneIndex: number, zPos: number): PowerUpInstance | null {
    const p = this.pool.find((item) => !item.isActive && item.type === type);
    if (!p) return null;

    const xPos = GAME_CONFIG.LANES[laneIndex];
    p.isActive = true;
    p.laneIndex = laneIndex;
    p.zPos = zPos;
    p.mesh.position.set(xPos, p.baseY, zPos);
    p.mesh.visible = true;

    this.updateBoundingBox(p);
    return p;
  }

  private updateBoundingBox(p: PowerUpInstance): void {
    const pos = p.mesh.position;
    p.boundingBox.min.set(pos.x - 0.75, pos.y - 0.75, pos.z - 0.75);
    p.boundingBox.max.set(pos.x + 0.75, pos.y + 0.75, pos.z + 0.75);
  }

  /**
   * Procedural power-up wave generator
   */
  public generateWave(playerZ: number): void {
    const lookAhead = 180;
    while (this.nextSpawnZ > playerZ - lookAhead) {
      const types: PowerUpType[] = ['MAGNET', 'SHIELD', 'COIN_MULTIPLIER'];
      const chosenType = types[Math.floor(Math.random() * types.length)];
      const chosenLane = Math.floor(Math.random() * 3);

      this.spawn(chosenType, chosenLane, this.nextSpawnZ);

      const gap = GAME_CONFIG.POWERUPS.SPAWN_INTERVAL_MIN + 
        Math.random() * (GAME_CONFIG.POWERUPS.SPAWN_INTERVAL_MAX - GAME_CONFIG.POWERUPS.SPAWN_INTERVAL_MIN);
      this.nextSpawnZ -= gap;
    }
  }

  /**
   * Activate collected power-up
   */
  public activatePowerUp(type: PowerUpType): void {
    const cfg = GAME_CONFIG.POWERUPS.TYPES[type];
    this.activePowerUps.set(type, {
      type,
      name: cfg.NAME,
      color: cfg.COLOR,
      remainingDuration: cfg.DURATION,
      maxDuration: cfg.DURATION,
    });

    if (this.onPowerUpCollected) {
      this.onPowerUpCollected(type, cfg.DURATION);
    }
  }

  /**
   * Absorb hit if shield is active. Returns true if hit was absorbed!
   */
  public consumeShield(): boolean {
    if (this.activePowerUps.has('SHIELD')) {
      this.activePowerUps.delete('SHIELD');
      if (this.onPowerUpExpired) {
        this.onPowerUpExpired('SHIELD');
      }
      return true;
    }
    return false;
  }

  public isMagnetActive(): boolean {
    return this.activePowerUps.has('MAGNET');
  }

  public isShieldActive(): boolean {
    return this.activePowerUps.has('SHIELD');
  }

  public isMultiplierActive(): boolean {
    return this.activePowerUps.has('COIN_MULTIPLIER');
  }

  public getCoinMultiplier(): number {
    return this.isMultiplierActive() ? GAME_CONFIG.POWERUPS.TYPES.COIN_MULTIPLIER.MULTIPLIER : 1;
  }

  public getActivePowerUps(): ActivePowerUpState[] {
    return Array.from(this.activePowerUps.values());
  }

  public update(delta: number, playerPos: THREE.Vector3, isPlaying: boolean): void {
    this.animTime += delta;

    if (isPlaying) {
      this.generateWave(playerPos.z);

      // Decrement active power-up durations
      this.activePowerUps.forEach((state, type) => {
        state.remainingDuration -= delta;
        if (state.remainingDuration <= 0) {
          this.activePowerUps.delete(type);
          if (this.onPowerUpExpired) {
            this.onPowerUpExpired(type);
          }
        }
      });
    }

    // Update pickups in 3D scene
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.isActive) continue;

      // Spin & bob
      p.mesh.rotation.y += delta * 2.5;
      const bob = Math.sin(this.animTime * 3.5 + p.bobOffset) * 0.22;
      p.mesh.position.y = p.baseY + bob;
      this.updateBoundingBox(p);

      // Player overlap pickup check
      if (isPlaying) {
        const dx = Math.abs(p.mesh.position.x - playerPos.x);
        const dz = Math.abs(p.mesh.position.z - playerPos.z);
        const dy = Math.abs(p.mesh.position.y - (playerPos.y + 1.0));

        if (dx < 1.2 && dz < 1.4 && dy < 2.0) {
          this.activatePowerUp(p.type);
          this.deactivate(p);
          continue;
        }
      }

      // Recycle if far behind player
      if (p.mesh.position.z > playerPos.z + 15) {
        this.deactivate(p);
      }
    }
  }

  public deactivate(p: PowerUpInstance): void {
    p.isActive = false;
    p.mesh.visible = false;
    p.mesh.position.set(0, -100, 0);
  }

  public reset(): void {
    this.pool.forEach((p) => this.deactivate(p));
    this.activePowerUps.clear();
    this.nextSpawnZ = -60;
    this.animTime = 0;
  }

  public dispose(): void {
    this.pool.forEach((p) => {
      this.scene.remove(p.mesh);
    });
    this.pool = [];
    this.activePowerUps.clear();

    Object.values(this.sharedGeos).forEach((g) => g.dispose());
    this.sharedGeos = {};

    Object.values(this.sharedMats).forEach((m) => m.dispose());
    this.sharedMats = {};
  }
}
