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

export class CoinManager {
  private scene: THREE.Scene;
  private coinPool: CoinInstance[] = [];
  private poolSize = 30;
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
    this.coinGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 18);
    this.coinGeo.rotateZ(Math.PI / 2); // Stand upright facing player

    // Inner embossed coin core
    this.coinInnerGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.16, 16);
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
   * Spawn a run of coins along a specific lane at a target Z position
   */
  public spawnCoin(laneIndex: number, zPos: number): CoinInstance | null {
    // Find an inactive coin in pool
    const coin = this.coinPool.find((c) => !c.isActive);
    if (!coin) return null;

    const xPos = GAME_CONFIG.LANES[laneIndex];
    coin.isActive = true;
    coin.laneIndex = laneIndex;
    coin.zPos = zPos;
    coin.baseY = 1.1;
    coin.mesh.position.set(xPos, coin.baseY, zPos);
    coin.mesh.scale.set(1, 1, 1);
    coin.mesh.visible = true;

    return coin;
  }

  /**
   * Spawn patterns of coins ahead on track segment
   */
  public populateTrackSection(startZ: number, count: number = 3): void {
    // Choose a lane for this coin cluster
    const laneIndex = Math.floor(Math.random() * GAME_CONFIG.LANES.length);
    const spacing = 4.0;

    for (let i = 0; i < count; i++) {
      const z = startZ - i * spacing;
      this.spawnCoin(laneIndex, z);
    }
  }

  public update(delta: number, playerPos: THREE.Vector3): void {
    this.animTime += delta;

    for (let i = 0; i < this.coinPool.length; i++) {
      const coin = this.coinPool[i];
      if (!coin.isActive) continue;

      // 1. Visual animation: Spin and float bob
      coin.mesh.rotation.y += delta * GAME_CONFIG.COIN_SPIN_SPEED;
      const bob = Math.sin(this.animTime * GAME_CONFIG.COIN_BOB_SPEED + coin.bobOffset) * GAME_CONFIG.COIN_BOB_HEIGHT;
      coin.mesh.position.y = coin.baseY + bob;

      // 2. Collection Collision Check with player
      const dx = Math.abs(coin.mesh.position.x - playerPos.x);
      const dz = Math.abs(coin.mesh.position.z - playerPos.z);
      const dy = Math.abs(coin.mesh.position.y - (playerPos.y + 1.0));

      if (dx < 1.1 && dz < 1.3 && dy < 1.8) {
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
