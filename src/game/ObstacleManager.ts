import * as THREE from 'three';
import { GAME_CONFIG, ObstacleType } from './constants';

export interface ObstacleInstance {
  mesh: THREE.Group;
  type: ObstacleType;
  laneIndex: number;
  zPos: number;
  isActive: boolean;
  boundingBox: THREE.Box3;
  baseX: number;
}

export class ObstacleManager {
  private scene: THREE.Scene;
  private pool: ObstacleInstance[] = [];
  private poolSize = GAME_CONFIG.OBSTACLE_POOL_SIZE; // 28 instances
  private nextSpawnZ: number = GAME_CONFIG.FIRST_OBSTACLE_Z;
  private animTime: number = 0;

  // Shared geometries and materials for zero runtime allocations
  private sharedGeos: Record<string, THREE.BufferGeometry> = {};
  private sharedMats: Record<string, THREE.Material> = {};

  // Collision callback
  public onCollision?: (obstacle: ObstacleInstance) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initSharedAssets();
    this.buildPool();
  }

  private initSharedAssets(): void {
    // 1. Low Obstacle: Road laser hurdle
    this.sharedGeos['lowBase'] = new THREE.BoxGeometry(0.3, 0.85, 0.45);
    this.sharedGeos['lowBar'] = new THREE.CylinderGeometry(0.09, 0.09, 2.3, 12);
    this.sharedGeos['lowBar'].rotateZ(Math.PI / 2);
    this.sharedGeos['lowFence'] = new THREE.PlaneGeometry(2.3, 0.6);

    // 2. High Obstacle: Overhead gantry
    this.sharedGeos['highLeg'] = new THREE.BoxGeometry(0.25, 2.8, 0.4);
    this.sharedGeos['highTopBar'] = new THREE.BoxGeometry(2.6, 0.5, 0.4);
    this.sharedGeos['highLaserBeam'] = new THREE.CylinderGeometry(0.12, 0.12, 2.4, 12);
    this.sharedGeos['highLaserBeam'].rotateZ(Math.PI / 2);
    this.sharedGeos['highSign'] = new THREE.BoxGeometry(1.6, 0.4, 0.1);

    // 3. Blocking Obstacle: Heavy barrier column / hazard pylon
    this.sharedGeos['blockMain'] = new THREE.BoxGeometry(2.2, 3.4, 0.6);
    this.sharedGeos['blockPillar'] = new THREE.BoxGeometry(0.35, 3.6, 0.7);
    this.sharedGeos['hazardStripe'] = new THREE.PlaneGeometry(2.0, 0.35);

    // 4. Moving Barrier Obstacle: Patrol Sweeper Drone
    this.sharedGeos['movingDrone'] = new THREE.BoxGeometry(2.0, 0.6, 0.5);
    this.sharedGeos['movingLaser'] = new THREE.CylinderGeometry(0.1, 0.1, 2.0, 8);
    this.sharedGeos['movingLaser'].rotateZ(Math.PI / 2);
    this.sharedGeos['movingBeacon'] = new THREE.SphereGeometry(0.18, 8, 8);

    // Materials
    this.sharedMats['frame'] = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.7,
    });

    this.sharedMats['lowLaser'] = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.COLORS.NEON_ORANGE,
      emissive: GAME_CONFIG.COLORS.NEON_ORANGE,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });

    this.sharedMats['lowField'] = new THREE.MeshBasicMaterial({
      color: GAME_CONFIG.COLORS.NEON_ORANGE,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });

    this.sharedMats['highLaser'] = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.COLORS.NEON_CYAN,
      emissive: GAME_CONFIG.COLORS.NEON_CYAN,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });

    this.sharedMats['blockingPillar'] = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5,
      metalness: 0.6,
    });

    this.sharedMats['blockingBarrier'] = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.COLORS.NEON_RED,
      emissive: GAME_CONFIG.COLORS.NEON_RED,
      emissiveIntensity: 0.85,
      roughness: 0.3,
    });

    this.sharedMats['movingHazard'] = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });

    this.sharedMats['hazardYellow'] = new THREE.MeshBasicMaterial({
      color: GAME_CONFIG.COLORS.NEON_YELLOW,
    });
  }

  private buildPool(): void {
    const types: ObstacleType[] = ['LOW', 'HIGH', 'BLOCKING', 'MOVING_BARRIER'];
    const countPerType = Math.floor(this.poolSize / types.length);

    types.forEach((type) => {
      for (let i = 0; i < countPerType; i++) {
        const mesh = this.createObstacleMesh(type);
        mesh.visible = false;
        mesh.position.set(0, -100, 0);
        this.scene.add(mesh);

        this.pool.push({
          mesh,
          type,
          laneIndex: 1,
          zPos: 0,
          isActive: false,
          boundingBox: new THREE.Box3(),
          baseX: 0,
        });
      }
    });
  }

  private createObstacleMesh(type: ObstacleType): THREE.Group {
    const group = new THREE.Group();

    if (type === 'LOW') {
      // --- LOW OBSTACLE (Requires JUMP) ---
      const leftPost = new THREE.Mesh(this.sharedGeos['lowBase'], this.sharedMats['frame']);
      leftPost.position.set(-1.15, 0.425, 0);
      leftPost.castShadow = true;
      group.add(leftPost);

      const rightPost = new THREE.Mesh(this.sharedGeos['lowBase'], this.sharedMats['frame']);
      rightPost.position.set(1.15, 0.425, 0);
      rightPost.castShadow = true;
      group.add(rightPost);

      const laserBar = new THREE.Mesh(this.sharedGeos['lowBar'], this.sharedMats['lowLaser']);
      laserBar.position.set(0, 0.72, 0);
      group.add(laserBar);

      const field = new THREE.Mesh(this.sharedGeos['lowFence'], this.sharedMats['lowField']);
      field.position.set(0, 0.35, 0);
      group.add(field);
    } else if (type === 'HIGH') {
      // --- HIGH OBSTACLE (Requires SLIDE) ---
      const leftLeg = new THREE.Mesh(this.sharedGeos['highLeg'], this.sharedMats['frame']);
      leftLeg.position.set(-1.25, 1.4, 0);
      leftLeg.castShadow = true;
      group.add(leftLeg);

      const rightLeg = new THREE.Mesh(this.sharedGeos['highLeg'], this.sharedMats['frame']);
      rightLeg.position.set(1.25, 1.4, 0);
      rightLeg.castShadow = true;
      group.add(rightLeg);

      const topBar = new THREE.Mesh(this.sharedGeos['highTopBar'], this.sharedMats['frame']);
      topBar.position.set(0, 2.5, 0);
      topBar.castShadow = true;
      group.add(topBar);

      const highLaser = new THREE.Mesh(this.sharedGeos['highLaserBeam'], this.sharedMats['highLaser']);
      highLaser.position.set(0, 1.35, 0);
      group.add(highLaser);

      const sign = new THREE.Mesh(this.sharedGeos['highSign'], this.sharedMats['hazardYellow']);
      sign.position.set(0, 2.5, 0.22);
      group.add(sign);
    } else if (type === 'BLOCKING') {
      // --- BLOCKING OBSTACLE (Requires MOVE LEFT/RIGHT) ---
      const leftPillar = new THREE.Mesh(this.sharedGeos['blockPillar'], this.sharedMats['blockingPillar']);
      leftPillar.position.set(-1.05, 1.8, 0);
      leftPillar.castShadow = true;
      group.add(leftPillar);

      const rightPillar = new THREE.Mesh(this.sharedGeos['blockPillar'], this.sharedMats['blockingPillar']);
      rightPillar.position.set(1.05, 1.8, 0);
      rightPillar.castShadow = true;
      group.add(rightPillar);

      const barrier = new THREE.Mesh(this.sharedGeos['blockMain'], this.sharedMats['blockingBarrier']);
      barrier.position.set(0, 1.7, 0);
      barrier.castShadow = true;
      group.add(barrier);

      const stripe = new THREE.Mesh(this.sharedGeos['hazardStripe'], this.sharedMats['hazardYellow']);
      stripe.position.set(0, 1.7, 0.32);
      group.add(stripe);
    } else {
      // --- MOVING_BARRIER (Dynamic Lane Sweeper) ---
      const drone = new THREE.Mesh(this.sharedGeos['movingDrone'], this.sharedMats['frame']);
      drone.position.y = 1.6;
      drone.castShadow = true;
      group.add(drone);

      const laser = new THREE.Mesh(this.sharedGeos['movingLaser'], this.sharedMats['movingHazard']);
      laser.position.y = 1.0;
      group.add(laser);

      const beaconLeft = new THREE.Mesh(this.sharedGeos['movingBeacon'], this.sharedMats['movingHazard']);
      beaconLeft.position.set(-0.9, 1.95, 0);
      group.add(beaconLeft);

      const beaconRight = new THREE.Mesh(this.sharedGeos['movingBeacon'], this.sharedMats['movingHazard']);
      beaconRight.position.set(0.9, 1.95, 0);
      group.add(beaconRight);
    }

    return group;
  }

  /**
   * Spawns an obstacle of given type at designated lane and Z
   */
  public spawn(type: ObstacleType, laneIndex: number, zPos: number): ObstacleInstance | null {
    const obstacle = this.pool.find((o) => !o.isActive && o.type === type);
    if (!obstacle) return null;

    const laneX = GAME_CONFIG.LANES[laneIndex];
    obstacle.isActive = true;
    obstacle.laneIndex = laneIndex;
    obstacle.zPos = zPos;
    obstacle.baseX = laneX;
    obstacle.mesh.position.set(laneX, 0, zPos);
    obstacle.mesh.visible = true;

    this.updateObstacleBoundingBox(obstacle);

    return obstacle;
  }

  private updateObstacleBoundingBox(obstacle: ObstacleInstance): void {
    const x = obstacle.mesh.position.x;
    const z = obstacle.zPos;

    if (obstacle.type === 'LOW') {
      obstacle.boundingBox.min.set(x - 1.15, 0.0, z - 0.28);
      obstacle.boundingBox.max.set(x + 1.15, 0.82, z + 0.28);
    } else if (obstacle.type === 'HIGH') {
      obstacle.boundingBox.min.set(x - 1.25, 0.82, z - 0.28);
      obstacle.boundingBox.max.set(x + 1.25, 2.6, z + 0.28);
    } else if (obstacle.type === 'BLOCKING') {
      obstacle.boundingBox.min.set(x - 1.15, 0.0, z - 0.35);
      obstacle.boundingBox.max.set(x + 1.15, 3.6, z + 0.35);
    } else {
      // MOVING_BARRIER: Blocking box spanning Y = 0 to 2.4
      obstacle.boundingBox.min.set(x - 1.05, 0.0, z - 0.35);
      obstacle.boundingBox.max.set(x + 1.05, 2.4, z + 0.35);
    }
  }

  /**
   * Procedural obstacle wave generation guaranteeing fair solvability
   */
  public generateWave(zPos: number): void {
    const waveType = Math.floor(Math.random() * 8);
    const laneIndices = [0, 1, 2];
    const shuffledLanes = [...laneIndices].sort(() => Math.random() - 0.5);

    switch (waveType) {
      case 0:
        this.spawn('LOW', shuffledLanes[0], zPos);
        break;
      case 1:
        this.spawn('HIGH', shuffledLanes[0], zPos);
        break;
      case 2:
        this.spawn('BLOCKING', shuffledLanes[0], zPos);
        break;
      case 3:
        // Moving barrier on center lane that sways
        this.spawn('MOVING_BARRIER', 1, zPos);
        break;
      case 4:
        this.spawn('BLOCKING', shuffledLanes[0], zPos);
        this.spawn('LOW', shuffledLanes[1], zPos);
        break;
      case 5:
        this.spawn('BLOCKING', shuffledLanes[0], zPos);
        this.spawn('HIGH', shuffledLanes[1], zPos);
        break;
      case 6:
        this.spawn('LOW', shuffledLanes[0], zPos);
        this.spawn('LOW', shuffledLanes[1], zPos);
        break;
      case 7:
        this.spawn('BLOCKING', shuffledLanes[0], zPos);
        this.spawn('BLOCKING', shuffledLanes[1], zPos);
        break;
    }
  }

  /**
   * Update active obstacles, check collisions, and recycle passed obstacles
   */
  public update(playerZ: number, playerBox: THREE.Box3, isPlaying: boolean, delta: number = 0.016): void {
    this.animTime += delta;

    // 1. Spawn waves ahead
    const lookAheadDistance = 200;
    while (this.nextSpawnZ > playerZ - lookAheadDistance) {
      this.generateWave(this.nextSpawnZ);
      const gap = GAME_CONFIG.MIN_OBSTACLE_GAP + 
        Math.random() * (GAME_CONFIG.MAX_OBSTACLE_GAP - GAME_CONFIG.MIN_OBSTACLE_GAP);
      this.nextSpawnZ -= gap;
    }

    // 2. Process active obstacles
    for (let i = 0; i < this.pool.length; i++) {
      const obstacle = this.pool[i];
      if (!obstacle.isActive) continue;

      // Dynamic side-to-side oscillation for MOVING_BARRIER
      if (obstacle.type === 'MOVING_BARRIER' && isPlaying) {
        const sweep = Math.sin(this.animTime * GAME_CONFIG.MOVING_OBSTACLE_SPEED + obstacle.zPos * 0.1) * 2.8;
        obstacle.mesh.position.x = sweep;
        this.updateObstacleBoundingBox(obstacle);
      }

      // Collision check
      if (isPlaying && Math.abs(obstacle.zPos - playerZ) < 2.0) {
        if (playerBox.intersectsBox(obstacle.boundingBox)) {
          if (this.onCollision) {
            this.onCollision(obstacle);
            return;
          }
        }
      }

      // Recycle obstacle when far behind player
      if (obstacle.zPos > playerZ + 15) {
        this.deactivate(obstacle);
      }
    }
  }

  public deactivate(obstacle: ObstacleInstance): void {
    obstacle.isActive = false;
    obstacle.mesh.visible = false;
    obstacle.mesh.position.set(0, -100, 0);
  }

  public reset(): void {
    this.pool.forEach((o) => this.deactivate(o));
    this.nextSpawnZ = GAME_CONFIG.FIRST_OBSTACLE_Z;
    this.animTime = 0;
  }

  public dispose(): void {
    this.pool.forEach((o) => {
      this.scene.remove(o.mesh);
    });
    this.pool = [];

    Object.values(this.sharedGeos).forEach((g) => g.dispose());
    this.sharedGeos = {};

    Object.values(this.sharedMats).forEach((m) => m.dispose());
    this.sharedMats = {};
  }
}
