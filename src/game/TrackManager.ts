import * as THREE from 'three';
import { GAME_CONFIG } from './constants';

interface TrackSegment {
  group: THREE.Group;
  index: number;
  zPos: number;
}

export class TrackManager {
  private scene: THREE.Scene;
  private segments: TrackSegment[] = [];
  private segmentLength = GAME_CONFIG.TRACK_SEGMENT_LENGTH;
  private segmentCount = GAME_CONFIG.TOTAL_ACTIVE_SEGMENTS;
  private nextSegmentZ: number = 0;

  // Shared geometry cache to guarantee zero runtime allocations & memory leaks
  private sharedGeos: Record<string, THREE.BufferGeometry> = {};
  private sharedMats: Record<string, THREE.Material> = {};

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initSharedResources();
    this.buildInitialTrack();
  }

  private initSharedResources(): void {
    const { ROAD_WIDTH } = GAME_CONFIG;

    // Road plane geometry
    this.sharedGeos['road'] = new THREE.PlaneGeometry(ROAD_WIDTH, this.segmentLength);
    this.sharedGeos['road'].rotateX(-Math.PI / 2);

    // Side verge / terrain geometry
    this.sharedGeos['verge'] = new THREE.PlaneGeometry(35, this.segmentLength);
    this.sharedGeos['verge'].rotateX(-Math.PI / 2);

    // Neon curb rail geometry
    this.sharedGeos['curb'] = new THREE.BoxGeometry(0.35, 0.45, this.segmentLength);

    // Lane dashes
    this.sharedGeos['laneDash'] = new THREE.PlaneGeometry(0.18, 5.0);
    this.sharedGeos['laneDash'].rotateX(-Math.PI / 2);

    // Roadside light post / pillar
    this.sharedGeos['pillar'] = new THREE.CylinderGeometry(0.2, 0.3, 5.5, 8);
    this.sharedGeos['pillarLight'] = new THREE.BoxGeometry(0.8, 0.35, 0.4);
    this.sharedGeos['arch'] = new THREE.BoxGeometry(ROAD_WIDTH + 3, 0.5, 0.8);

    // Materials
    this.sharedMats['road'] = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.COLORS.ROAD_SURFACE,
      roughness: 0.7,
      metalness: 0.1,
    });

    this.sharedMats['verge'] = new THREE.MeshStandardMaterial({
      color: 0x090e1c,
      roughness: 0.9,
      metalness: 0.05,
    });

    this.sharedMats['curbLeft'] = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.COLORS.NEON_CYAN,
      emissive: GAME_CONFIG.COLORS.NEON_CYAN,
      emissiveIntensity: 0.7,
      roughness: 0.3,
    });

    this.sharedMats['curbRight'] = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.COLORS.NEON_PURPLE,
      emissive: GAME_CONFIG.COLORS.NEON_PURPLE,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });

    this.sharedMats['laneMarker'] = new THREE.MeshBasicMaterial({
      color: GAME_CONFIG.COLORS.LANE_MARKER,
      transparent: true,
      opacity: 0.85,
    });

    this.sharedMats['pillar'] = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.6,
    });

    this.sharedMats['beaconCyan'] = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.COLORS.NEON_CYAN,
      emissive: GAME_CONFIG.COLORS.NEON_CYAN,
      emissiveIntensity: 0.9,
    });

    this.sharedMats['beaconPurple'] = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.COLORS.NEON_PURPLE,
      emissive: GAME_CONFIG.COLORS.NEON_PURPLE,
      emissiveIntensity: 0.9,
    });
  }

  private buildInitialTrack(): void {
    // Start segments from behind player to far forward
    const startZ = this.segmentLength; // One segment behind (Z = +40)
    this.nextSegmentZ = startZ;

    for (let i = 0; i < this.segmentCount; i++) {
      const segGroup = this.createSegmentGroup(i);
      segGroup.position.z = this.nextSegmentZ;
      this.scene.add(segGroup);

      this.segments.push({
        group: segGroup,
        index: i,
        zPos: this.nextSegmentZ,
      });

      this.nextSegmentZ -= this.segmentLength;
    }
  }

  private createSegmentGroup(index: number): THREE.Group {
    const group = new THREE.Group();
    group.name = `track_segment_${index}`;

    // 1. Road mesh
    const road = new THREE.Mesh(this.sharedGeos['road'], this.sharedMats['road']);
    road.receiveShadow = true;
    group.add(road);

    // 2. Left and right terrain verges
    const leftVerge = new THREE.Mesh(this.sharedGeos['verge'], this.sharedMats['verge']);
    leftVerge.position.set(-GAME_CONFIG.ROAD_WIDTH / 2 - 17.5, -0.05, 0);
    leftVerge.receiveShadow = true;
    group.add(leftVerge);

    const rightVerge = new THREE.Mesh(this.sharedGeos['verge'], this.sharedMats['verge']);
    rightVerge.position.set(GAME_CONFIG.ROAD_WIDTH / 2 + 17.5, -0.05, 0);
    rightVerge.receiveShadow = true;
    group.add(rightVerge);

    // 3. Neon side curbs
    const leftCurb = new THREE.Mesh(this.sharedGeos['curb'], this.sharedMats['curbLeft']);
    leftCurb.position.set(-GAME_CONFIG.ROAD_WIDTH / 2 - 0.175, 0.225, 0);
    group.add(leftCurb);

    const rightCurb = new THREE.Mesh(this.sharedGeos['curb'], this.sharedMats['curbRight']);
    rightCurb.position.set(GAME_CONFIG.ROAD_WIDTH / 2 + 0.175, 0.225, 0);
    group.add(rightCurb);

    // 4. Lane divider dashes (between Lane 0 & 1, Lane 1 & 2)
    // Lane 0: -3.2, Lane 1: 0, Lane 2: 3.2
    // Dividers at -1.6 and +1.6
    const dividerX = [-1.6, 1.6];
    const dashesPerSegment = 4;
    const dashSpacing = this.segmentLength / dashesPerSegment;

    dividerX.forEach((x) => {
      for (let d = 0; d < dashesPerSegment; d++) {
        const dash = new THREE.Mesh(this.sharedGeos['laneDash'], this.sharedMats['laneMarker']);
        const z = -this.segmentLength / 2 + d * dashSpacing + dashSpacing / 2;
        dash.position.set(x, 0.01, z);
        group.add(dash);
      }
    });

    // 5. Environmental props: Futuristic light pillars and highway arches
    this.addEnvironmentProps(group, index);

    return group;
  }

  private addEnvironmentProps(group: THREE.Group, index: number): void {
    const isEven = index % 2 === 0;
    const mat = isEven ? this.sharedMats['beaconCyan'] : this.sharedMats['beaconPurple'];

    // Left light pillar
    const leftPillar = new THREE.Mesh(this.sharedGeos['pillar'], this.sharedMats['pillar']);
    leftPillar.position.set(-GAME_CONFIG.ROAD_WIDTH / 2 - 2.0, 2.75, 0);
    group.add(leftPillar);

    const leftBeacon = new THREE.Mesh(this.sharedGeos['pillarLight'], mat);
    leftBeacon.position.set(-GAME_CONFIG.ROAD_WIDTH / 2 - 1.7, 5.2, 0);
    group.add(leftBeacon);

    // Right light pillar
    const rightPillar = new THREE.Mesh(this.sharedGeos['pillar'], this.sharedMats['pillar']);
    rightPillar.position.set(GAME_CONFIG.ROAD_WIDTH / 2 + 2.0, 2.75, 0);
    group.add(rightPillar);

    const rightBeacon = new THREE.Mesh(this.sharedGeos['pillarLight'], mat);
    rightBeacon.position.set(GAME_CONFIG.ROAD_WIDTH / 2 + 1.7, 5.2, 0);
    group.add(rightBeacon);

    // Overhead tech archway every 3rd segment
    if (index % 3 === 0) {
      const arch = new THREE.Mesh(this.sharedGeos['arch'], this.sharedMats['pillar']);
      arch.position.set(0, 5.8, 0);
      group.add(arch);

      const archSign = new THREE.Mesh(this.sharedGeos['pillarLight'], mat);
      archSign.position.set(0, 5.5, 0);
      archSign.scale.set(3.5, 0.6, 1.2);
      group.add(archSign);
    }
  }

  /**
   * Recycles segments that the player has passed ahead to the front
   * Ensures zero memory growth and an infinite seamless runway!
   */
  public update(playerZ: number, onSegmentRecycled?: (newZPos: number) => void): void {
    const recycleThreshold = playerZ + this.segmentLength;

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];

      // If segment is now behind the camera and player
      if (seg.zPos > recycleThreshold) {
        // Move this segment to the furthest position ahead
        this.nextSegmentZ -= this.segmentLength;
        seg.zPos = this.nextSegmentZ;
        seg.group.position.z = this.nextSegmentZ;

        if (onSegmentRecycled) {
          onSegmentRecycled(seg.zPos);
        }
      }
    }
  }

  public reset(): void {
    const startZ = this.segmentLength;
    this.nextSegmentZ = startZ;

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      seg.zPos = this.nextSegmentZ;
      seg.group.position.z = this.nextSegmentZ;
      this.nextSegmentZ -= this.segmentLength;
    }
  }

  public dispose(): void {
    // Clear segments from scene
    this.segments.forEach((seg) => {
      this.scene.remove(seg.group);
    });
    this.segments = [];

    // Dispose shared geometries
    Object.values(this.sharedGeos).forEach((geo) => geo.dispose());
    this.sharedGeos = {};

    // Dispose shared materials
    Object.values(this.sharedMats).forEach((mat) => mat.dispose());
    this.sharedMats = {};
  }
}
