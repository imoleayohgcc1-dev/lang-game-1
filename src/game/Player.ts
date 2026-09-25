import * as THREE from 'three';
import { GAME_CONFIG, PlayerState } from './constants';

export class Player {
  public mesh: THREE.Group;
  
  // Visual / Model pivots
  private torso!: THREE.Mesh;
  private head!: THREE.Group;
  private leftArmPivot!: THREE.Group;
  private rightArmPivot!: THREE.Group;
  private leftLegPivot!: THREE.Group;
  private rightLegPivot!: THREE.Group;
  private contactShadow!: THREE.Mesh;
  private visorMesh!: THREE.Mesh;
  private reactorMesh!: THREE.Mesh;
  private blasterMesh!: THREE.Group;
  private muzzleTip!: THREE.Object3D;
  private shieldMesh!: THREE.Mesh;
  private shieldMat!: THREE.MeshBasicMaterial;
  private magnetMesh!: THREE.Mesh;
  private magnetMat!: THREE.MeshBasicMaterial;

  // Materials for visual state changes (normal, sliding, death, damage)
  private suitMat!: THREE.MeshStandardMaterial;
  private visorMat!: THREE.MeshStandardMaterial;
  private reactorMat!: THREE.MeshStandardMaterial;

  // Kinematics & state
  public state: PlayerState = 'RUNNING';
  public currentLaneIndex: number = 1; // 0: Left, 1: Center, 2: Right
  public targetX: number = GAME_CONFIG.LANES[1];
  public get position(): THREE.Vector3 {
    return this.mesh.position;
  }
  
  // Jump & vertical kinematics
  public verticalVelocity: number = 0;
  public isGrounded: boolean = true;

  // Slide state
  public slideTimer: number = 0;

  // Combat & Invulnerability
  public isInvulnerable: boolean = false;
  public invulnerabilityTimer: number = 0;
  private blinkTime: number = 0;

  // Run cycle animation time
  private runAnimTime: number = 0;

  // Reusable bounding box for collision detection (zero runtime allocation)
  private boundingBox: THREE.Box3 = new THREE.Box3();

  constructor() {
    this.mesh = new THREE.Group();
    this.mesh.name = 'player';
    this.buildCharacterModel();
  }

  private buildCharacterModel(): void {
    this.suitMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.COLORS.PLAYER_PRIMARY,
      roughness: 0.35,
      metalness: 0.3,
    });

    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.2,
      metalness: 0.7,
    });

    this.visorMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.COLORS.PLAYER_VISOR,
      emissive: GAME_CONFIG.COLORS.PLAYER_VISOR,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9,
    });

    this.reactorMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.COLORS.PLAYER_SECONDARY,
      emissive: GAME_CONFIG.COLORS.PLAYER_SECONDARY,
      emissiveIntensity: 1.0,
    });

    const bootsMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.5,
    });

    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
    });

    // --- TORSO ---
    const torsoGeo = new THREE.BoxGeometry(0.8, 1.0, 0.55);
    this.torso = new THREE.Mesh(torsoGeo, this.suitMat);
    this.torso.position.y = 1.6;
    this.torso.castShadow = true;
    this.torso.receiveShadow = true;
    this.mesh.add(this.torso);

    // Chest reactor / neon insignia
    const reactorGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.1, 16);
    reactorGeo.rotateX(Math.PI / 2);
    this.reactorMesh = new THREE.Mesh(reactorGeo, this.reactorMat);
    this.reactorMesh.position.set(0, 0.1, 0.28);
    this.torso.add(this.reactorMesh);

    // Torso armor plate
    const chestPlateGeo = new THREE.BoxGeometry(0.7, 0.5, 0.1);
    const chestPlate = new THREE.Mesh(chestPlateGeo, armorMat);
    chestPlate.position.set(0, 0.15, 0.26);
    this.torso.add(chestPlate);

    // --- HEAD ---
    this.head = new THREE.Group();
    this.head.position.set(0, 0.8, 0);

    const helmetGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
    const helmet = new THREE.Mesh(helmetGeo, armorMat);
    helmet.castShadow = true;
    this.head.add(helmet);

    // Visor strip
    const visorGeo = new THREE.BoxGeometry(0.48, 0.18, 0.15);
    this.visorMesh = new THREE.Mesh(visorGeo, this.visorMat);
    this.visorMesh.position.set(0, 0.05, 0.25);
    this.head.add(this.visorMesh);

    this.torso.add(this.head);

    // --- SHOULDERS & ARMS ---
    // Left Arm Pivot
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.55, 0.35, 0);
    this.torso.add(this.leftArmPivot);

    const leftArmGeo = new THREE.BoxGeometry(0.24, 0.85, 0.24);
    leftArmGeo.translate(0, -0.35, 0);
    const leftArm = new THREE.Mesh(leftArmGeo, this.suitMat);
    leftArm.castShadow = true;
    this.leftArmPivot.add(leftArm);

    // Right Arm Pivot
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.55, 0.35, 0);
    this.torso.add(this.rightArmPivot);

    const rightArmGeo = new THREE.BoxGeometry(0.24, 0.85, 0.24);
    rightArmGeo.translate(0, -0.35, 0);
    const rightArm = new THREE.Mesh(rightArmGeo, this.suitMat);
    rightArm.castShadow = true;
    this.rightArmPivot.add(rightArm);

    // --- BLASTER WEAPON (Mounted on Right Hand) ---
    this.blasterMesh = new THREE.Group();
    this.blasterMesh.position.set(0.02, -0.65, 0.18);

    const blasterBodyGeo = new THREE.BoxGeometry(0.14, 0.22, 0.42);
    const blasterBody = new THREE.Mesh(blasterBodyGeo, armorMat);
    this.blasterMesh.add(blasterBody);

    const barrelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.32, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, this.reactorMat);
    barrel.position.set(0, 0.04, -0.25);
    this.blasterMesh.add(barrel);

    // Muzzle tip locator
    this.muzzleTip = new THREE.Object3D();
    this.muzzleTip.position.set(0, 0.04, -0.45);
    this.blasterMesh.add(this.muzzleTip);

    this.rightArmPivot.add(this.blasterMesh);

    // --- HIPS & LEGS ---
    // Left Leg Pivot
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.25, 1.1, 0);
    this.mesh.add(this.leftLegPivot);

    const legGeo = new THREE.BoxGeometry(0.28, 1.1, 0.28);
    legGeo.translate(0, -0.55, 0);

    const leftLeg = new THREE.Mesh(legGeo, this.suitMat);
    leftLeg.castShadow = true;
    this.leftLegPivot.add(leftLeg);

    const bootGeo = new THREE.BoxGeometry(0.3, 0.3, 0.45);
    bootGeo.translate(0, -0.95, 0.08);
    const leftBoot = new THREE.Mesh(bootGeo, bootsMat);
    leftBoot.castShadow = true;
    this.leftLegPivot.add(leftBoot);

    // Right Leg Pivot
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.25, 1.1, 0);
    this.mesh.add(this.rightLegPivot);

    const rightLeg = new THREE.Mesh(legGeo, this.suitMat);
    rightLeg.castShadow = true;
    this.rightLegPivot.add(rightLeg);

    const rightBoot = new THREE.Mesh(bootGeo, bootsMat);
    rightBoot.castShadow = true;
    this.rightLegPivot.add(rightBoot);

    // --- CONTACT SHADOW DISK ---
    const shadowGeo = new THREE.CircleGeometry(0.85, 20);
    shadowGeo.rotateX(-Math.PI / 2);
    this.contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadow.position.y = 0.02;
    this.mesh.add(this.contactShadow);

    // --- POWER-UP VISUAL AURAS ---
    // Shield Energy Bubble
    const shieldGeo = new THREE.SphereGeometry(1.4, 16, 12);
    this.shieldMat = new THREE.MeshBasicMaterial({
      color: GAME_CONFIG.POWERUPS.TYPES.SHIELD.COLOR,
      transparent: true,
      opacity: 0.35,
      wireframe: true,
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, this.shieldMat);
    this.shieldMesh.position.y = 1.3;
    this.shieldMesh.visible = false;
    this.mesh.add(this.shieldMesh);

    // Magnet Suction Ring
    const magnetGeo = new THREE.TorusGeometry(1.3, 0.06, 8, 24);
    magnetGeo.rotateX(-Math.PI / 2);
    this.magnetMat = new THREE.MeshBasicMaterial({
      color: GAME_CONFIG.POWERUPS.TYPES.MAGNET.COLOR,
      transparent: true,
      opacity: 0.5,
    });
    this.magnetMesh = new THREE.Mesh(magnetGeo, this.magnetMat);
    this.magnetMesh.position.y = 0.3;
    this.magnetMesh.visible = false;
    this.mesh.add(this.magnetMesh);

    // Initial positioning
    this.mesh.position.set(0, 0, 0);
  }

  public setShieldActive(active: boolean): void {
    if (this.shieldMesh) this.shieldMesh.visible = active;
  }

  public setMagnetActive(active: boolean): void {
    if (this.magnetMesh) this.magnetMesh.visible = active;
  }

  public setLane(laneIndex: number): void {
    if (this.state === 'DEAD') return;
    if (laneIndex >= 0 && laneIndex < GAME_CONFIG.LANES.length) {
      this.currentLaneIndex = laneIndex;
      this.targetX = GAME_CONFIG.LANES[laneIndex];
      if (this.state !== 'JUMPING' && this.state !== 'FALLING' && this.state !== 'SLIDING') {
        this.state = 'LANE_CHANGING';
      }
    }
  }

  public moveLane(direction: -1 | 1): boolean {
    if (this.state === 'DEAD') return false;
    const newLane = this.currentLaneIndex + direction;
    if (newLane >= 0 && newLane < GAME_CONFIG.LANES.length) {
      this.setLane(newLane);
      return true;
    }
    return false;
  }

  /**
   * Trigger a jump action
   */
  public jump(): boolean {
    if (this.state === 'DEAD') return false;
    
    // Allow jumping from grounded running, lane changing, or interrupting a slide
    if (this.isGrounded) {
      this.isGrounded = false;
      this.verticalVelocity = GAME_CONFIG.JUMP_VELOCITY;
      this.state = 'JUMPING';
      this.slideTimer = 0; // Cancel slide into jump
      return true;
    }
    return false;
  }

  /**
   * Trigger a slide action
   */
  public slide(): boolean {
    if (this.state === 'DEAD') return false;

    // Only initiate slide when grounded and not already sliding
    if (this.isGrounded && this.state !== 'SLIDING') {
      this.state = 'SLIDING';
      this.slideTimer = GAME_CONFIG.SLIDE_DURATION;
      return true;
    }
    return false;
  }

  /**
   * Get world position where laser projectile spawns from blaster barrel
   */
  public getMuzzleWorldPosition(outVec: THREE.Vector3): THREE.Vector3 {
    if (this.muzzleTip) {
      return this.muzzleTip.getWorldPosition(outVec);
    }
    return outVec.copy(this.mesh.position).add(new THREE.Vector3(0.55, 1.2, -0.6));
  }

  /**
   * Trigger brief invulnerability after damage
   */
  public triggerDamage(duration: number = GAME_CONFIG.COMBAT.INVULNERABILITY_DURATION): void {
    if (this.state === 'DEAD') return;
    this.isInvulnerable = true;
    this.invulnerabilityTimer = duration;
    this.blinkTime = 0;

    // Flash visor and reactor red briefly
    this.visorMat.emissive.setHex(GAME_CONFIG.COLORS.NEON_RED);
    this.reactorMat.emissive.setHex(GAME_CONFIG.COLORS.NEON_RED);
  }

  /**
   * Trigger character death
   */
  public die(): void {
    this.state = 'DEAD';
    this.isInvulnerable = false;
    this.mesh.visible = true;
    this.verticalVelocity = 3.0; // slight knockback hop
    this.isGrounded = false;

    // Visor turns red / alarm
    this.visorMat.color.setHex(GAME_CONFIG.COLORS.NEON_RED);
    this.visorMat.emissive.setHex(GAME_CONFIG.COLORS.NEON_RED);
    this.reactorMat.color.setHex(GAME_CONFIG.COLORS.NEON_RED);
    this.reactorMat.emissive.setHex(GAME_CONFIG.COLORS.NEON_RED);
  }

  public update(delta: number, isRunning: boolean, currentSpeed: number): void {
    // 0. Invulnerability blink timer
    if (this.isInvulnerable) {
      this.invulnerabilityTimer -= delta;
      this.blinkTime += delta;
      // Strobe visibility every ~0.08s
      this.mesh.visible = Math.floor(this.blinkTime * 14) % 2 === 0;

      if (this.invulnerabilityTimer <= 0) {
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        this.mesh.visible = true;
        // Restore visor and reactor glow
        this.visorMat.emissive.setHex(GAME_CONFIG.COLORS.PLAYER_VISOR);
        this.reactorMat.emissive.setHex(GAME_CONFIG.COLORS.PLAYER_SECONDARY);
      }
    } else if (this.mesh.visible === false && this.state !== 'DEAD') {
      this.mesh.visible = true;
    }

    // 1. Horizontal lane transition lerping
    const dx = this.targetX - this.mesh.position.x;
    const laneLerp = Math.min(1.0, GAME_CONFIG.LANE_SWITCH_SPEED * delta);
    this.mesh.position.x += dx * laneLerp;

    // Finish lane change state when close enough
    if (this.state === 'LANE_CHANGING' && Math.abs(dx) < 0.05) {
      this.state = 'RUNNING';
    }

    // Subtle bank / lean during lane switch
    const rollAngle = -dx * 0.12;
    this.torso.rotation.z = rollAngle;

    // 2. Vertical Kinematics (Jump / Gravity)
    if (!this.isGrounded) {
      this.verticalVelocity += GAME_CONFIG.GRAVITY * delta;
      this.mesh.position.y += this.verticalVelocity * delta;

      if (this.state !== 'DEAD') {
        if (this.verticalVelocity > 0) {
          this.state = 'JUMPING';
        } else {
          this.state = 'FALLING';
        }
      }

      // Landing detection
      if (this.mesh.position.y <= 0) {
        this.mesh.position.y = 0;
        this.verticalVelocity = 0;
        this.isGrounded = true;

        if (this.state !== 'DEAD') {
          this.state = Math.abs(dx) > 0.1 ? 'LANE_CHANGING' : 'RUNNING';
        }
      }
    }

    // 3. Slide Timer Countdown
    if (this.state === 'SLIDING') {
      this.slideTimer -= delta;
      if (this.slideTimer <= 0) {
        this.slideTimer = 0;
        this.state = Math.abs(dx) > 0.1 ? 'LANE_CHANGING' : 'RUNNING';
      }
    }

    // 4. Character Animation Poses by State
    this.updateAnimationPose(delta, isRunning, currentSpeed);

    // 5. Update contact shadow position & scale
    this.updateContactShadow();

    // 6. Update bounding box
    this.updateBoundingBox();
  }

  private updateAnimationPose(delta: number, isRunning: boolean, currentSpeed: number): void {
    if (this.state === 'DEAD') {
      // Death flop / stumble
      this.torso.position.y = 0.5;
      this.torso.rotation.x = -0.8;
      this.torso.rotation.z = 0.6;
      this.leftArmPivot.rotation.x = 1.2;
      this.rightArmPivot.rotation.x = -0.9;
      this.leftLegPivot.rotation.x = 0.7;
      this.rightLegPivot.rotation.x = -0.6;
      return;
    }

    if (this.state === 'SLIDING') {
      // Low skid crouch: torso leans backward, hips dropped, legs slide forward
      this.torso.position.y = 0.75;
      this.torso.position.z = -0.15;
      this.torso.rotation.x = -0.55;
      this.head.rotation.x = 0.45; // head looks up and forward

      // Arms back for balance
      this.leftArmPivot.rotation.x = 1.1;
      this.leftArmPivot.rotation.z = -0.3;
      this.rightArmPivot.rotation.x = 1.1;
      this.rightArmPivot.rotation.z = 0.3;

      // Legs angled forward
      this.leftLegPivot.position.y = 0.55;
      this.rightLegPivot.position.y = 0.55;
      this.leftLegPivot.rotation.x = -1.2;
      this.rightLegPivot.rotation.x = -0.9;
      return;
    }

    // Restore torso & leg anchors if coming out of slide
    this.torso.position.z = 0;
    this.leftLegPivot.position.y = 1.1;
    this.rightLegPivot.position.y = 1.1;
    this.leftArmPivot.rotation.z = 0;
    this.rightArmPivot.rotation.z = 0;

    if (this.state === 'JUMPING') {
      // Upward jump apex tuck
      this.torso.position.y = 1.6;
      this.torso.rotation.x = 0.1;
      this.head.rotation.x = -0.1;

      this.leftArmPivot.rotation.x = -1.3; // arms raised up
      this.rightArmPivot.rotation.x = -1.3;
      this.leftLegPivot.rotation.x = 0.6;  // knees bent up
      this.rightLegPivot.rotation.x = 0.7;
      return;
    }

    if (this.state === 'FALLING') {
      // Downward descent prep for landing
      this.torso.position.y = 1.6;
      this.torso.rotation.x = 0.15;
      this.leftArmPivot.rotation.x = -0.4;
      this.rightArmPivot.rotation.x = -0.4;
      this.leftLegPivot.rotation.x = 0.2;
      this.rightLegPivot.rotation.x = 0.2;
      return;
    }

    // Normal RUNNING / LANE_CHANGING / IDLE
    if (isRunning) {
      const animSpeed = (currentSpeed / GAME_CONFIG.BASE_SPEED) * 12.0;
      this.runAnimTime += delta * animSpeed;

      const swing = Math.sin(this.runAnimTime);
      const bob = Math.abs(Math.sin(this.runAnimTime)) * 0.14;

      // Leg swings
      this.leftLegPivot.rotation.x = swing * 0.75;
      this.rightLegPivot.rotation.x = -swing * 0.75;

      // Opposite arm swings
      this.leftArmPivot.rotation.x = -swing * 0.7;
      this.rightArmPivot.rotation.x = swing * 0.7;

      // Forward lean and vertical stride bob
      this.torso.position.y = 1.6 + bob;
      this.torso.rotation.x = 0.15; // athletic forward sprint lean
      this.head.rotation.x = -0.08;
    } else {
      // Idle breathing stance
      this.runAnimTime += delta * 2.0;
      const breathe = Math.sin(this.runAnimTime) * 0.04;

      this.torso.position.y = 1.6 + breathe;
      this.torso.rotation.x = 0.02;
      this.head.rotation.x = 0;

      this.leftLegPivot.rotation.x = 0;
      this.rightLegPivot.rotation.x = 0;
      this.leftArmPivot.rotation.x = 0.05;
      this.rightArmPivot.rotation.x = -0.05;
    }
  }

  private updateContactShadow(): void {
    const shadowMat = this.contactShadow.material as THREE.MeshBasicMaterial;
    if (this.state === 'DEAD') {
      shadowMat.opacity = 0.2;
      return;
    }

    const altitude = this.mesh.position.y;
    // Shadow stays glued to ground (y = 0.02)
    this.contactShadow.position.y = -altitude + 0.02;

    const scale = Math.max(0.3, 1.0 - altitude * 0.25);
    this.contactShadow.scale.set(scale, scale, scale);
    shadowMat.opacity = Math.max(0.1, 0.45 - altitude * 0.15);
  }

  private updateBoundingBox(): void {
    const px = this.mesh.position.x;
    const py = this.mesh.position.y;
    const pz = this.mesh.position.z;

    if (this.state === 'SLIDING') {
      // Significantly reduced vertical height during slide
      this.boundingBox.min.set(px - 0.42, py + 0.02, pz - 0.65);
      this.boundingBox.max.set(px + 0.42, py + GAME_CONFIG.PLAYER_SLIDE_HEIGHT, pz + 0.65);
    } else {
      // Normal upright runner collision box
      this.boundingBox.min.set(px - 0.42, py + 0.02, pz - 0.45);
      this.boundingBox.max.set(px + 0.42, py + GAME_CONFIG.PLAYER_NORMAL_HEIGHT, pz + 0.45);
    }
  }

  public getBoundingBox(): THREE.Box3 {
    return this.boundingBox;
  }

  public reset(): void {
    this.state = 'RUNNING';
    this.currentLaneIndex = 1;
    this.targetX = GAME_CONFIG.LANES[1];
    this.mesh.position.set(0, 0, 0);
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.slideTimer = 0;
    this.runAnimTime = 0;
    this.isInvulnerable = false;
    this.invulnerabilityTimer = 0;
    this.mesh.visible = true;
    this.setShieldActive(false);
    this.setMagnetActive(false);

    // Reset materials
    this.visorMat.color.setHex(GAME_CONFIG.COLORS.PLAYER_VISOR);
    this.visorMat.emissive.setHex(GAME_CONFIG.COLORS.PLAYER_VISOR);
    this.reactorMat.color.setHex(GAME_CONFIG.COLORS.PLAYER_SECONDARY);
    this.reactorMat.emissive.setHex(GAME_CONFIG.COLORS.PLAYER_SECONDARY);

    // Reset pivots
    this.torso.position.set(0, 1.6, 0);
    this.torso.rotation.set(0, 0, 0);
    this.head.rotation.set(0, 0, 0);
    this.leftArmPivot.rotation.set(0, 0, 0);
    this.rightArmPivot.rotation.set(0, 0, 0);
    this.leftLegPivot.position.set(-0.25, 1.1, 0);
    this.rightLegPivot.position.set(0.25, 1.1, 0);
    this.leftLegPivot.rotation.set(0, 0, 0);
    this.rightLegPivot.rotation.set(0, 0, 0);

    this.updateBoundingBox();
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position;
  }
}
