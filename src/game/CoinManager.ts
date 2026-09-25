import * as THREE from 'three';
import { GAME_CONFIG } from './constants';

export interface CoinInstance {
  mesh: THREE.Group;
  isActive: boolean;
  baseY: number;
  laneIndex: number;
  zPos: number;
  bobOffset: number;
}

export type CoinPattern = 'STRAIGHT' | 'CURVE' | 'ZIGZAG' | 'JUMP_PATH';

export class CoinManager {
  private scene: THREE.Scene;
  private coinPool: CoinInstance[] = [];
  private poolSize = 48; // increased pool size for multi-lane formations
  private animTime = 0;

  // Shared assets for performance
  private coinGeo: THREE.CylinderGeometry;
  private coinInnerGeo: THREE.CylinderGeometry;
  private coinMat: THREE.MeshStandardMaterial;
  private innerMat: THREE.MeshStandardMaterial;

  public onCoinCollected?: (coin: CoinInstance) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Outer coin disk
    this.coinGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 16);
    this.coinGeo.rotateZ(Math.PI / 2); // Stand upright facing player

    // Inner embossed coin core
    this.coinInnerGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.16, 14);
    this.coinInnerGeo.rotateZ(Math.PI / 2);

    this.coinMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.COLORS.COIN_GOLD,
      roughness: 0.25,
      metalness: 0.9,
      emissive: 0x78350f,
      emissiveIntensity: 0.35,
    });

    this.innerMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.2,
      metalness: 0.95,
      emissive: 0xd97706,
      emissiveIntensity: 0.5,
    });

    this.buildPool();
  }

  private buildPool(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const group = new THREE.Group();
      group.name = `coin_${i}`;

      const outerMesh = new THREE.Mesh(this.coinGeo, this.coinMat);
      outerMesh.castShadow = true;
      group.add(outerMesh);

      const innerMesh = new THREE.Mesh(this.coinInnerGeo, this.innerMat);
      group.add(innerMesh);

      // Hide offscreen initially
      group.position.set(0, -100, 0);
      group.visible = false;
      this.scene.add(group);

      this.coinPool.push({
        mesh: group,
        isActive: false,
        baseY: 1.1,
        laneIndex: 1,
        zPos: 0,
        bobOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  /**
   * Spawn a single coin
   */
  public spawnCoin(laneIndex: number, zPos: number, altitude: number = 1.1): CoinInstance | null {
    const coin = this.coinPool.find((c) => !c.isActive);
    if (!coin) return null;

    const clampedLane = Math.max(0, Math.min(2, laneIndex));
    const xPos = GAME_CONFIG.LANES[clampedLane];
    coin.isActive = true;
    coin.laneIndex = clampedLane;
    coin.zPos = zPos;
    coin.baseY = altitude;
    coin.mesh.position.set(xPos, coin.baseY, zPos);
    coin.mesh.scale.set(1, 1, 1);
    coin.mesh.visible = true;

    return coin;
  }

  /**
   * Spawn patterns of coins ahead on track segment
   */
  public populateTrackSection(startZ: number, pattern?: CoinPattern): void {
    const patterns: CoinPattern[] = ['STRAIGHT', 'CURVE', 'ZIGZAG', 'JUMP_PATH'];
    const chosenPattern = pattern || patterns[Math.floor(Math.random() * patterns.length)];

    const baseLane = Math.floor(Math.random() * 3);
    const spacing = 3.6;

    switch (chosenPattern) {
      case 'STRAIGHT': {
        // 4 coins straight down baseLane
        for (let i = 0; i < 4; i++) {
          this.spawnCoin(baseLane, startZ - i * spacing, 1.1);
        }
        break;
      }
      case 'CURVE': {
        // Arc from lane to adjacent lane
        const dir = baseLane === 0 ? 1 : baseLane === 2 ? -1 : (Math.random() > 0.5 ? 1 : -1);
        for (let i = 0; i < 4; i++) {
          const l = Math.max(0, Math.min(2, baseLane + Math.round((i / 3) * dir)));
          this.spawnCoin(l, startZ - i * spacing, 1.1);
        }
        break;
      }
      case 'ZIGZAG': {
        // Alternating between two lanes
        const otherLane = baseLane === 1 ? 0 : 1;
        for (let i = 0; i < 4; i++) {
          const l = i % 2 === 0 ? baseLane : otherLane;
          this.spawnCoin(l, startZ - i * spacing, 1.1);
        }
        break;
      }
      case 'JUMP_PATH': {
        // Parabolic jump arc in lane (1.1 -> 1.7 -> 2.3 -> 1.7 -> 1.1)
        const heights = [1.1, 1.7, 2.35, 1.7, 1.1];
        for (let i = 0; i < heights.length; i++) {
          this.spawnCoin(baseLane, startZ - i * 3.2, heights[i]);
        }
        break;
      }
    }
  }

  /**
   * Pull active coins towards player when Magnet power-up is active
   */
  public attractCoins(playerPos: THREE.Vector3, delta: number, radius: number = 14.0): void {
    const pullSpeed = 24.0; // units/sec

    for (let i = 0; i < this.coinPool.length; i++) {
      const coin = this.coinPool[i];
      if (!coin.isActive) continue;

      const pPos = new THREE.Vector3(playerPos.x, playerPos.y + 1.1, playerPos.z);
      const cPos = coin.mesh.position;
      const dist = pPos.distanceTo(cPos);

      if (dist < radius) {
        // Smooth suction towards player
        const dir = pPos.sub(cPos).normalize();
        const step = dir.multiplyScalar(pullSpeed * delta);
        coin.mesh.position.add(step);
      }
    }
  }

  public update(delta: number, playerPos: THREE.Vector3, isMagnetActive: boolean = false): void {
    this.animTime += delta;

    if (isMagnetActive) {
      this.attractCoins(playerPos, delta, GAME_CONFIG.POWERUPS.TYPES.MAGNET.RADIUS);
    }

    for (let i = 0; i < this.coinPool.length; i++) {
      const coin = this.coinPool[i];
      if (!coin.isActive) continue;

      // 1. Visual animation: Spin and float bob
      coin.mesh.rotation.y += delta * GAME_CONFIG.COIN_SPIN_SPEED;
      if (!isMagnetActive) {
        const bob = Math.sin(this.animTime * GAME_CONFIG.COIN_BOB_SPEED + coin.bobOffset) * GAME_CONFIG.COIN_BOB_HEIGHT;
        coin.mesh.position.y = coin.baseY + bob;
      }

      // 2. Collection Collision Check with player
      const dx = Math.abs(coin.mesh.position.x - playerPos.x);
      const dz = Math.abs(coin.mesh.position.z - playerPos.z);
      const dy = Math.abs(coin.mesh.position.y - (playerPos.y + 1.0));

      if (dx < 1.15 && dz < 1.4 && dy < 1.9) {
        this.collectCoin(coin);
        continue;
      }

      // 3. Recycle if coin is far behind the player
      if (coin.mesh.position.z > playerPos.z + 15) {
        this.deactivateCoin(coin);
      }
    }
  }

  private collectCoin(coin: CoinInstance): void {
    this.deactivateCoin(coin);
    if (this.onCoinCollected) {
      this.onCoinCollected(coin);
    }
  }

  public deactivateCoin(coin: CoinInstance): void {
    coin.isActive = false;
    coin.mesh.visible = false;
    coin.mesh.position.set(0, -100, 0);
  }

  public reset(): void {
    this.coinPool.forEach((c) => this.deactivateCoin(c));
    this.animTime = 0;
  }

  public dispose(): void {
    this.coinPool.forEach((coin) => {
      this.scene.remove(coin.mesh);
    });
    this.coinPool = [];

    this.coinGeo.dispose();
    this.coinInnerGeo.dispose();
    this.coinMat.dispose();
    this.innerMat.dispose();
  }
}
