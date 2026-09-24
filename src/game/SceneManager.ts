import * as THREE from 'three';
import { GAME_CONFIG } from './constants';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer | null = null;
  public dirLight: THREE.DirectionalLight | null = null;
  public ambientLight: THREE.AmbientLight | null = null;
  public hemiLight: THREE.HemisphereLight | null = null;
  
  private container: HTMLElement;
  private resizeObserver: ResizeObserver | null = null;
  private onWindowResize: (() => void) | null = null;
  private isContextLost: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    
    // Perspective camera initial setup
    const width = container.clientWidth || window.innerWidth || 800;
    const height = container.clientHeight || window.innerHeight || 600;
    const aspect = width / height;
    const initialFov = width < 768 
      ? GAME_CONFIG.CAMERA.FOV_MOBILE 
      : GAME_CONFIG.CAMERA.FOV_DESKTOP;
      
    this.camera = new THREE.PerspectiveCamera(initialFov, aspect, 0.1, 500);
    this.camera.position.set(0, GAME_CONFIG.CAMERA.OFFSET_Y, GAME_CONFIG.CAMERA.OFFSET_Z);
  }

  public init(): boolean {
    try {
      // Check WebGL availability
      if (!this.isWebGLAvailable()) {
        console.error('[SceneManager] WebGL is not available on this device/browser.');
        return false;
      }

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
        depth: true,
      });

      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;

      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;

      // Ensure canvas fills container
      const canvas = this.renderer.domElement;
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      this.container.appendChild(canvas);

      // Context lost/restored handling
      canvas.addEventListener('webglcontextlost', this.onContextLost, false);
      canvas.addEventListener('webglcontextrestored', this.onContextRestored, false);

      this.setupAtmosphere();
      this.setupLighting();
      this.setupResizeHandler();

      return true;
    } catch (err) {
      console.error('[SceneManager] Failed to initialize Three.js:', err);
      return false;
    }
  }

  private isWebGLAvailable(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch {
      return false;
    }
  }

  private setupAtmosphere(): void {
    // Fog that matches deep night/cyber runner horizon
    this.scene.background = new THREE.Color(GAME_CONFIG.COLORS.FOG);
    this.scene.fog = new THREE.FogExp2(GAME_CONFIG.COLORS.FOG, 0.009);

    // Create subtle starfield / distance ambient particles
    this.createBackdropDome();
  }

  private createBackdropDome(): void {
    const starCount = 350;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 250 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * (Math.PI / 2.2); // Upper dome only

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) + 20; // Above horizon
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      // Gentle cyan/white/violet star tints
      const tint = Math.random();
      if (tint > 0.7) {
        colors[i * 3] = 0.4;
        colors[i * 3 + 1] = 0.8;
        colors[i * 3 + 2] = 1.0;
      } else if (tint > 0.4) {
        colors[i * 3] = 0.8;
        colors[i * 3 + 1] = 0.6;
        colors[i * 3 + 2] = 1.0;
      } else {
        colors[i * 3] = 0.95;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 1.0;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });

    const starField = new THREE.Points(geometry, material);
    starField.name = 'starField';
    this.scene.add(starField);
  }

  private setupLighting(): void {
    // 1. Ambient Light - soft cool base
    this.ambientLight = new THREE.AmbientLight(GAME_CONFIG.COLORS.LIGHT_FILL, 0.65);
    this.scene.add(this.ambientLight);

    // 2. Hemisphere Light - sky to ground bounce
    this.hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.5);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // 3. Directional Key Light (Moon/Sun) with soft shadows
    this.dirLight = new THREE.DirectionalLight(GAME_CONFIG.COLORS.LIGHT_KEY, 1.4);
    this.dirLight.position.set(15, 30, 20);
    this.dirLight.castShadow = true;

    // Optimized shadow camera bounds for runner performance
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 120;
    this.dirLight.shadow.bias = -0.001;

    const d = 25;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;

    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);
  }

  /**
   * Keep directional light following player forward progress
   */
  public updateLightPosition(playerZ: number): void {
    if (this.dirLight) {
      this.dirLight.position.z = playerZ + 20;
      this.dirLight.target.position.z = playerZ;
      this.dirLight.target.updateMatrixWorld();
    }
  }

  private setupResizeHandler(): void {
    this.onWindowResize = () => {
      if (!this.container || !this.renderer) return;

      const width = this.container.clientWidth;
      const height = this.container.clientHeight;

      if (width === 0 || height === 0) return;

      this.camera.aspect = width / height;
      this.camera.fov = width < 768 
        ? GAME_CONFIG.CAMERA.FOV_MOBILE 
        : GAME_CONFIG.CAMERA.FOV_DESKTOP;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    };

    this.resizeObserver = new ResizeObserver(() => {
      if (this.onWindowResize) this.onWindowResize();
    });
    this.resizeObserver.observe(this.container);

    window.addEventListener('resize', this.onWindowResize);
  }

  private onContextLost = (event: Event) => {
    event.preventDefault();
    console.warn('[SceneManager] WebGL context lost.');
    this.isContextLost = true;
  };

  private onContextRestored = () => {
    console.log('[SceneManager] WebGL context restored.');
    this.isContextLost = false;
  };

  public render(): void {
    if (this.renderer && !this.isContextLost) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public dispose(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.onWindowResize) {
      window.removeEventListener('resize', this.onWindowResize);
      this.onWindowResize = null;
    }

    if (this.renderer) {
      const canvas = this.renderer.domElement;
      canvas.removeEventListener('webglcontextlost', this.onContextLost);
      canvas.removeEventListener('webglcontextrestored', this.onContextRestored);

      if (canvas.parentElement) {
        canvas.parentElement.removeChild(canvas);
      }
      this.renderer.dispose();
      this.renderer = null;
    }

    // Traverse and clean geometries & materials
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });

    this.scene.clear();
  }
}
