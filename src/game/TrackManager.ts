import * as THREE from 'three';
import { GAME_CONFIG, EnvironmentTheme, DayNightMode } from './constants';

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

  // Active theme
  private currentTheme: EnvironmentTheme = 'CYBERPUNK';
  private currentDayNight: DayNightMode = 'NIGHT';

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
    this.sharedGeos['verge'] = new THREE.PlaneGeometry(45, this.segmentLength);
    this.sharedGeos['verge'].rotateX(-Math.PI / 2);

    // Neon curb rail geometry
    this.sharedGeos['curb'] = new THREE.BoxGeometry(0.35, 0.45, this.segmentLength);

    // Lane dashes
    this.sharedGeos['laneDash'] = new THREE.PlaneGeometry(0.18, 5.0);
    this.sharedGeos['laneDash'].rotateX(-Math.PI / 2);

    // --- CITY PROPS ---
    this.sharedGeos['skyscraper1'] = new THREE.BoxGeometry(7, 26, 9);
    this.sharedGeos['skyscraper2'] = new THREE.BoxGeometry(9, 36, 11);
    this.sharedGeos['windowCluster'] = new THREE.PlaneGeometry(6, 22);
    this.sharedGeos['streetLampPole'] = new THREE.CylinderGeometry(0.12, 0.16, 6.0, 8);
    this.sharedGeos['streetLampHead'] = new THREE.BoxGeometry(0.9, 0.25, 0.4);

    // --- TROPICAL PROPS ---
    this.sharedGeos['palmTrunk'] = new THREE.CylinderGeometry(0.25, 0.45, 7.0, 6);
    this.sharedGeos['palmFronds'] = new THREE.ConeGeometry(3.2, 1.2, 5);
    this.sharedGeos['rock'] = new THREE.DodecahedronGeometry(1.4, 0);

    // --- CYBERPUNK PROPS ---
    this.sharedGeos['pillar'] = new THREE.CylinderGeometry(0.2, 0.3, 5.5, 8);
    this.sharedGeos['pillarLight'] = new THREE.BoxGeometry(0.8, 0.35, 0.4);
    this.sharedGeos['arch'] = new THREE.BoxGeometry(ROAD_WIDTH + 3, 0.5, 0.8);
    this.sharedGeos['cyberSpire'] = new THREE.ConeGeometry(2.5, 24, 4);

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

    this.sharedMats['building'] = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.7,
    });

    this.sharedMats['windowGlow'] = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.7,
    });

    this.sharedMats['palmWood'] = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.8,
    });

    this.sharedMats['palmLeaf'] = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.6,
    });

    this.sharedMats['rock'] = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.9,
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
    const startZ = this.segmentLength;
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
    leftVerge.position.set(-GAME_CONFIG.ROAD_WIDTH / 2 - 22.5, -0.05, 0);
    leftVerge.receiveShadow = true;
    group.add(leftVerge);

    const rightVerge = new THREE.Mesh(this.sharedGeos['verge'], this.sharedMats['verge']);
    rightVerge.position.set(GAME_CONFIG.ROAD_WIDTH / 2 + 22.5, -0.05, 0);
    rightVerge.receiveShadow = true;
    group.add(rightVerge);

    // 3. Side curbs
    const leftCurb = new THREE.Mesh(this.sharedGeos['curb'], this.sharedMats['curbLeft']);
    leftCurb.position.set(-GAME_CONFIG.ROAD_WIDTH / 2 - 0.175, 0.225, 0);
    group.add(leftCurb);

    const rightCurb = new THREE.Mesh(this.sharedGeos['curb'], this.sharedMats['curbRight']);
    rightCurb.position.set(GAME_CONFIG.ROAD_WIDTH / 2 + 0.175, 0.225, 0);
    group.add(rightCurb);

    // 4. Lane divider dashes
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

    // 5. Environmental props (Buildings / Trees / Cyber Pillars)
    this.addThemeProps(group, index);

    return group;
  }

  private addThemeProps(group: THREE.Group, index: number): void {
    const isEven = index % 2 === 0;

    // Left roadside structure
    const leftBuilding = new THREE.Mesh(
      isEven ? this.sharedGeos['skyscraper1'] : this.sharedGeos['skyscraper2'],
      this.sharedMats['building']
    );
    leftBuilding.position.set(-GAME_CONFIG.ROAD_WIDTH / 2 - 8.5, isEven ? 13 : 18, 0);
    leftBuilding.castShadow = true;
    leftBuilding.receiveShadow = true;
    group.add(leftBuilding);

    // Right roadside structure
    const rightBuilding = new THREE.Mesh(
      isEven ? this.sharedGeos['skyscraper2'] : this.sharedGeos['skyscraper1'],
      this.sharedMats['building']
    );
    rightBuilding.position.set(GAME_CONFIG.ROAD_WIDTH / 2 + 8.5, isEven ? 18 : 13, 0);
    rightBuilding.castShadow = true;
    rightBuilding.receiveShadow = true;
    group.add(rightBuilding);

    // Roadside light pillars
    const mat = isEven ? this.sharedMats['beaconCyan'] : this.sharedMats['beaconPurple'];

    const leftPillar = new THREE.Mesh(this.sharedGeos['pillar'], this.sharedMats['building']);
    leftPillar.position.set(-GAME_CONFIG.ROAD_WIDTH / 2 - 1.8, 2.75, 0);
    group.add(leftPillar);

    const leftBeacon = new THREE.Mesh(this.sharedGeos['pillarLight'], mat);
    leftBeacon.position.set(-GAME_CONFIG.ROAD_WIDTH / 2 - 1.5, 5.2, 0);
    group.add(leftBeacon);

    const rightPillar = new THREE.Mesh(this.sharedGeos['pillar'], this.sharedMats['building']);
    rightPillar.position.set(GAME_CONFIG.ROAD_WIDTH / 2 + 1.8, 2.75, 0);
    group.add(rightPillar);

    const rightBeacon = new THREE.Mesh(this.sharedGeos['pillarLight'], mat);
    rightBeacon.position.set(GAME_CONFIG.ROAD_WIDTH / 2 + 1.5, 5.2, 0);
    group.add(rightBeacon);

    // Overhead tech archway every 3rd segment
    if (index % 3 === 0) {
      const arch = new THREE.Mesh(this.sharedGeos['arch'], this.sharedMats['building']);
      arch.position.set(0, 5.8, 0);
      group.add(arch);

      const archSign = new THREE.Mesh(this.sharedGeos['pillarLight'], mat);
      archSign.position.set(0, 5.5, 0);
      archSign.scale.set(3.5, 0.6, 1.2);
      group.add(archSign);
    }
  }

  /**
   * Apply Theme and Day/Night settings to existing track materials in real-time
   */
  public applyTheme(theme: EnvironmentTheme, dayNight: DayNightMode): void {
    this.currentTheme = theme;
    this.currentDayNight = dayNight;
    const themeCfg = GAME_CONFIG.THEMES[theme];

    const roadMat = this.sharedMats['road'] as THREE.MeshStandardMaterial;
    const vergeMat = this.sharedMats['verge'] as THREE.MeshStandardMaterial;
    const curbLeft = this.sharedMats['curbLeft'] as THREE.MeshStandardMaterial;
    const curbRight = this.sharedMats['curbRight'] as THREE.MeshStandardMaterial;
    const buildingMat = this.sharedMats['building'] as THREE.MeshStandardMaterial;

    if (roadMat) roadMat.color.setHex(themeCfg.ROAD_COLOR);
    if (vergeMat) vergeMat.color.setHex(themeCfg.VERGE_COLOR);

    if (curbLeft) {
      curbLeft.color.setHex(themeCfg.CURB_COLOR);
      curbLeft.emissive.setHex(themeCfg.CURB_COLOR);
      curbLeft.emissiveIntensity = dayNight === 'NIGHT' ? 0.8 : 0.2;
    }

    if (curbRight) {
      curbRight.color.setHex(themeCfg.ACCENT_COLOR);
      curbRight.emissive.setHex(themeCfg.ACCENT_COLOR);
      curbRight.emissiveIntensity = dayNight === 'NIGHT' ? 0.7 : 0.2;
    }

    if (buildingMat) {
      if (theme === 'TROPICAL') {
        buildingMat.color.setHex(0x15803d); // Tropical greenery
      } else if (theme === 'CITY') {
        buildingMat.color.setHex(dayNight === 'DAY' ? 0x64748b : 0x1e293b);
      } else {
        buildingMat.color.setHex(0x0f172a);
      }
    }
  }

  public update(playerZ: number, onSegmentRecycled?: (newZPos: number) => void): void {
    const recycleThreshold = playerZ + this.segmentLength;

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];

      if (seg.zPos > recycleThreshold) {
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
    this.segments.forEach((seg) => {
      this.scene.remove(seg.group);
    });
    this.segments = [];

    Object.values(this.sharedGeos).forEach((geo) => geo.dispose());
    this.sharedGeos = {};

    Object.values(this.sharedMats).forEach((mat) => mat.dispose());
    this.sharedMats = {};
  }
}
