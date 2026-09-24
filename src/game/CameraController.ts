import * as THREE from 'three';
import { GAME_CONFIG } from './constants';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private currentPos: THREE.Vector3 = new THREE.Vector3();
  private lookTarget: THREE.Vector3 = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.currentPos.copy(this.camera.position);
  }

  public update(delta: number, playerPos: THREE.Vector3): void {
    const { OFFSET_Y, OFFSET_Z, LOOK_AT_OFFSET_Y, LOOK_AT_OFFSET_Z, SMOOTH_FACTOR } = GAME_CONFIG.CAMERA;

    // Desired camera position behind the runner
    const targetCameraX = playerPos.x * 0.45; // Subtle horizontal follow to preserve lane perspective
    // Dampened vertical follow: 30% of jump elevation to prevent disorientation while maintaining view of upcoming track
    const targetCameraY = Math.max(0, playerPos.y) * 0.3 + OFFSET_Y;
    const targetCameraZ = playerPos.z + OFFSET_Z;

    // Smooth damping
    const lerpFactor = Math.min(1.0, 14.0 * delta);
    this.currentPos.x += (targetCameraX - this.currentPos.x) * (lerpFactor * 0.7);
    this.currentPos.y += (targetCameraY - this.currentPos.y) * (lerpFactor * 0.5);
    this.currentPos.z += (targetCameraZ - this.currentPos.z) * lerpFactor;

    this.camera.position.copy(this.currentPos);

    // Target point to look at (forward down the track)
    const targetLookX = playerPos.x * 0.2;
    const targetLookY = Math.max(0, playerPos.y) * 0.25 + LOOK_AT_OFFSET_Y;
    const targetLookZ = playerPos.z + LOOK_AT_OFFSET_Z;

    this.lookTarget.x += (targetLookX - this.lookTarget.x) * lerpFactor;
    this.lookTarget.y += (targetLookY - this.lookTarget.y) * lerpFactor;
    this.lookTarget.z += (targetLookZ - this.lookTarget.z) * lerpFactor;

    this.camera.lookAt(this.lookTarget);
  }

  public reset(playerPos: THREE.Vector3): void {
    const { OFFSET_Y, OFFSET_Z, LOOK_AT_OFFSET_Y, LOOK_AT_OFFSET_Z } = GAME_CONFIG.CAMERA;
    this.currentPos.set(0, playerPos.y + OFFSET_Y, playerPos.z + OFFSET_Z);
    this.camera.position.copy(this.currentPos);

    this.lookTarget.set(0, playerPos.y + LOOK_AT_OFFSET_Y, playerPos.z + LOOK_AT_OFFSET_Z);
    this.camera.lookAt(this.lookTarget);
  }
}
