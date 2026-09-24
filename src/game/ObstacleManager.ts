import * as THREE from 'three';
import { GAME_CONFIG, ObstacleType } from './constants';

export interface ObstacleInstance {
  mesh: THREE.Group;
  type: ObstacleType;
  laneIndex: number;
  zPos: number;
  isActive: boolean;
  boundingBox: THREE.Box3;
}

export class ObstacleManager {
  private scene: THREE.Scene;
  private pool: ObstacleInstance[] = [];
  private poolSize = GAME_CONFIG.OBSTACLE_POOL_SIZE; // 24 instances
  private nextSpawnZ: number = GAME_CONFIG.FIRST_OBSTACLE_Z;

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

    this.sharedMats['hazardYellow'] = new THREE.MeshBasicMaterial({
      color: GAME_CONFIG.COLORS.NEON_YELLOW,
    });
  }

  private buildPool(): void {
    // 8 Low, 8 High, 8 Blocking = 24 instances
    const types: ObstacleType[] = ['LOW', 'HIGH', 'BLOCKING'];

    types.forEach((type) => {
      const countPerType = Math.floor(this.poolSize / types.length);
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
        });
      }
    });
  }

  private createObstacleMesh(type: ObstacleType): THREE.Group {
    const group = new THREE.Group();

    if (type === 'LOW') {
      // --- LOW OBSTACLE (Requires JUMP) ---
      // Left and right support posts
      const leftPost = new THREE.Mesh(this.sharedGeos['lowBase'], this.sharedMats['frame']);
      leftPost.position.set(-1.15, 0.425, 0);
      leftPost.castShadow = true;
      group.add(leftPost);

      const rightPost = new THREE.Mesh(this.sharedGeos['lowBase'], this.sharedMats['frame']);
      rightPost.position.set(1.15, 0.425, 0);
      rightPost.castShadow = true;
      group.add(rightPost);

      // Glowing laser hurdle beam at Y = 0.75
      const laserBar = new THREE.Mesh(this.sharedGeos['lowBar'], this.sharedMats['lowLaser']);
      laserBar.position.set(0, 0.72, 0);
      group.add(laserBar);

      // Energy field plane between posts
      const field = new THREE.Mesh(this.sharedGeos['lowFence'], this.sharedMats['lowField']);
      field.position.set(0, 0.35, 0);
      group.add(field);
    } else if (type === 'HIGH') {
      // --- HIGH OBSTACLE (Requires SLIDE) ---
      // Tall gantry legs leaving bottom clear
      const leftLeg = new THREE.Mesh(this.sharedGeos['highLeg'], this.sharedMats['frame']);
      leftLeg.position.set(-1.25, 1.4, 0);
      leftLeg.castShadow = true;
      group.add(leftLeg);

      const rightLeg = new THREE.Mesh(this.sharedGeos['highLeg'], this.sharedMats['frame']);
      rightLeg.position.set(1.25, 1.4, 0);
      rightLeg.castShadow = true;
      group.add(rightLeg);

      // Top crossbar structure (Y = 2.4)
      const topBar = new THREE.Mesh(this.sharedGeos['highTopBar'], this.sharedMats['frame']);
      topBar.position.set(0, 2.5, 0);
      topBar.castShadow = true;
      group.add(topBar);

      // Glowing high laser beam spanning across at Y = 1.35
      const highLaser = new THREE.Mesh(this.sharedGeos['highLaserBeam'], this.sharedMats['highLaser']);
      highLaser.position.set(0, 1.35, 0);
      group.add(highLaser);

      // Overhead caution sign
      const sign = new THREE.Mesh(this.sharedGeos['highSign'], this.sharedMats['hazardYellow']);
      sign.position.set(0, 2.5, 0.22);
      group.add(sign);
    } else {
      // --- BLOCKING OBSTACLE (Requires MOVE LEFT/RIGHT) ---
      // Impassable cyber barrier
      const leftPillar = new THREE.Mesh(this.sharedGeos['blockPillar'], this.sharedMats['blockingPillar']);
      leftPillar.position.set(-1.05, 1.8, 0);
      leftPillar.castShadow = true;
      group.add(leftPillar);

      const rightPillar = new THREE.Mesh(this.sharedGeos['blockPillar'], this.sharedMats['blockingPillar']);
      rightPillar.position.set(1.05, 1.8, 0);
      rightPillar.castShadow = true;
      group.add(rightPillar);

      // Central red barrier block
      const barrier = new THREE.Mesh(this.sharedGeos['blockMain'], this.sharedMats['blockingBarrier']);
      barrier.position.set(0, 1.7, 0);
      barrier.castShadow = true;
      group.add(barrier);

      // Warning chevron stripe
      const stripe = new THREE.Mesh(this.sharedGeos['hazardStripe'], this.sharedMats['hazardYellow']);
      stripe.position.set(0, 1.7, 0.32);
      group.add(stripe);
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
    obstacle.mesh.position.set(laneX, 0, zPos);
    obstacle.mesh.visible = true;

    this.updateObstacleBoundingBox(obstacle);

    return obstacle;
  }

  private updateObstacleBoundingBox(obstacle: ObstacleInstance): void {
    const x = obstacle.mesh.position.x;
    const z = obstacle.zPos;

    if (obstacle.type === 'LOW') {
      // LOW OBSTACLE:
      // Height 0 to 0.82.
      // Grounded player hits it.
      // Jumping player with Y > 0.85 safely clears it!
      obstacle.boundingBox.min.set(x - 1.15, 0.0, z - 0.28);
      obstacle.boundingBox.max.set(x + 1.15, 0.82, z + 0.28);
    } else if (obstacle.type === 'HIGH') {
      // HIGH OBSTACLE:
      // Clearance: bottom is open up to Y = 0.82!
      // Barrier occupies Y = 0.82 to 2.6.
      // Sliding player (max height ~0.75) safely slides underneath!
      // Upright runner (height 2.0) or jumping player collides!
      obstacle.boundingBox.min.set(x - 1.25, 0.82, z - 0.28);
      obstacle.boundingBox.max.set(x + 1.25, 2.6, z + 0.28);
    } else {
      // BLOCKING OBSTACLE:
      // Full vertical barrier occupying Y = 0 to 3.6.
      // Cannot jump over, cannot slide under. Must switch lane!
      obstacle.boundingBox.min.set(x - 1.15, 0.0, z - 0.35);
      obstacle.boundingBox.max.set(x + 1.15, 3.6, z + 0.35);
    }
  }

  /**
   * Spawns a procedurally generated wave of obstacles ahead
   * GUARANTEE: Never blocks all 3 lanes with impassable obstacles!
   */
  public generateWave(zPos: number): void {
    // Choose wave design
    // 0: Single Low obstacle (jump or dodge)
    // 1: Single High obstacle (slide or dodge)
    // 2: Single Blocking obstacle (dodge)
    // 3: Double obstacle: 1 Blocking + 1 Low (1 free lane, or jump the low lane)
    // 4: Double obstacle: 1 Blocking + 1 High (1 free lane, or slide the high lane)
    // 5: Double obstacle: 2 Low obstacles (1 free lane, or jump either low lane)
    // 6: Double obstacle: 2 Blocking obstacles (1 guaranteed clear escape lane)
    const waveType = Math.floor(Math.random() * 7);

    const laneIndices = [0, 1, 2];
    // Shuffle lane indices for variety
    const shuffledLanes = [...laneIndices].sort(() => Math.random() - 0.5);

    switch (waveType) {
      case 0: {
        // Single LOW
        const lane = shuffledLanes[0];
        this.spawn('LOW', lane, zPos);
        break;
      }
      case 1: {
        // Single HIGH
        const lane = shuffledLanes[0];
        this.spawn('HIGH', lane, zPos);
        break;
      }
      case 2: {
        // Single BLOCKING
        const lane = shuffledLanes[0];
        this.spawn('BLOCKING', lane, zPos);
        break;
      }
      case 3: {
        // 1 BLOCKING + 1 LOW (Leaves 1 lane wide open, 1 lane jumpable)
        const laneBlock = shuffledLanes[0];
        const laneLow = shuffledLanes[1];
        this.spawn('BLOCKING', laneBlock, zPos);
        this.spawn('LOW', laneLow, zPos);
        break;
      }
      case 4: {
        // 1 BLOCKING + 1 HIGH (Leaves 1 lane wide open, 1 lane slideable)
        const laneBlock = shuffledLanes[0];
        const laneHigh = shuffledLanes[1];
        this.spawn('BLOCKING', laneBlock, zPos);
        this.spawn('HIGH', laneHigh, zPos);
        break;
      }
      case 5: {
        // 2 LOW (Leaves 1 lane wide open, 2 jumpable)
        this.spawn('LOW', shuffledLanes[0], zPos);
        this.spawn('LOW', shuffledLanes[1], zPos);
        break;
      }
      case 6: {
        // 2 BLOCKING (Guaranteed 1 clear lane to run through)
        this.spawn('BLOCKING', shuffledLanes[0], zPos);
        this.spawn('BLOCKING', shuffledLanes[1], zPos);
        break;
      }
    }
  }

  /**
   * Update active obstacles, check collisions, and recycle passed obstacles
   */
  public update(playerZ: number, playerBox: THREE.Box3, isPlaying: boolean): void {
    // 1. Check if we need to spawn next wave ahead
    const lookAheadDistance = 200; // spawn up to 200 units ahead of player
    while (this.nextSpawnZ > playerZ - lookAheadDistance) {
      this.generateWave(this.nextSpawnZ);

      // Compute gap with slight randomness for natural rhythm
      const gap = GAME_CONFIG.MIN_OBSTACLE_GAP + 
        Math.random() * (GAME_CONFIG.MAX_OBSTACLE_GAP - GAME_CONFIG.MIN_OBSTACLE_GAP);
      this.nextSpawnZ -= gap;
    }

    // 2. Process active obstacles
    for (let i = 0; i < this.pool.length; i++) {
      const obstacle = this.pool[i];
      if (!obstacle.isActive) continue;

      // Collision check only when playing and obstacle is within collision proximity
      if (isPlaying && Math.abs(obstacle.zPos - playerZ) < 2.0) {
        if (playerBox.intersectsBox(obstacle.boundingBox)) {
          if (this.onCollision) {
            this.onCollision(obstacle);
            return;
          }
        }
      }

      // 3. Recycle obstacle when far behind player
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
