import * as THREE from 'three';
import { WeatherType } from './levels/levelTypes';
import { EnvironmentTheme, DayNightMode, GAME_CONFIG } from './constants';
import { SceneManager } from './SceneManager';
import { AudioManager } from './AudioManager';

export class WeatherManager {
  private scene: THREE.Scene;
  private sceneManager: SceneManager;
  private audioManager: AudioManager;

  public currentWeather: WeatherType = 'SUNNY';
  public currentIntensity: number = 0.5;

  // Rain Particles
  private rainParticleCount = 180;
  private rainGeo: THREE.BufferGeometry | null = null;
  private rainMat: THREE.PointsMaterial | null = null;
  private rainPoints: THREE.Points | null = null;
  private rainPositions: Float32Array | null = null;
  private isRainActive: boolean = false;

  // Wind Particles (airborne leaves / cyber dust)
  private windParticleCount = 45;
  private windGeo: THREE.BufferGeometry | null = null;
  private windMat: THREE.PointsMaterial | null = null;
  private windPoints: THREE.Points | null = null;
  private windPositions: Float32Array | null = null;
  private windVelocities: Float32Array | null = null;
  private isWindActive: boolean = false;

  // Storm Lightning
  private lightningTimer: number = 0;
  private isFlashing: boolean = false;
  private flashDuration: number = 0;
  private baseDirLightIntensity: number = 1.4;

  constructor(scene: THREE.Scene, sceneManager: SceneManager, audioManager: AudioManager) {
    this.scene = scene;
    this.sceneManager = sceneManager;
    this.audioManager = audioManager;

    this.initRainSystem();
    this.initWindSystem();
  }

  private initRainSystem(): void {
    this.rainPositions = new Float32Array(this.rainParticleCount * 3);
    for (let i = 0; i < this.rainParticleCount; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * 22;
      this.rainPositions[i * 3 + 1] = Math.random() * 14 + 0.5;
      this.rainPositions[i * 3 + 2] = -Math.random() * 45;
    }

    this.rainGeo = new THREE.BufferGeometry();
    this.rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));

    this.rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.18,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.rainPoints = new THREE.Points(this.rainGeo, this.rainMat);
    this.rainPoints.name = 'weather_rain';
    this.rainPoints.visible = false;
    this.scene.add(this.rainPoints);
  }

  private initWindSystem(): void {
    this.windPositions = new Float32Array(this.windParticleCount * 3);
    this.windVelocities = new Float32Array(this.windParticleCount * 3);

    for (let i = 0; i < this.windParticleCount; i++) {
      this.windPositions[i * 3] = (Math.random() - 0.5) * 20;
      this.windPositions[i * 3 + 1] = Math.random() * 5 + 0.5;
      this.windPositions[i * 3 + 2] = -Math.random() * 40;

      this.windVelocities[i * 3] = (Math.random() * 2 + 3); // Drift sideways
      this.windVelocities[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
      this.windVelocities[i * 3 + 2] = (Math.random() - 0.5) * 2.0;
    }

    this.windGeo = new THREE.BufferGeometry();
    this.windGeo.setAttribute('position', new THREE.BufferAttribute(this.windPositions, 3));

    this.windMat = new THREE.PointsMaterial({
      color: 0x6ee7b7,
      size: 0.25,
      transparent: true,
      opacity: 0.6,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    this.windPoints = new THREE.Points(this.windGeo, this.windMat);
    this.windPoints.name = 'weather_wind';
    this.windPoints.visible = false;
    this.scene.add(this.windPoints);
  }

  /**
   * Apply Level Atmosphere & Weather configuration across 15 levels
   */
  public applyLevelWeather(
    weather: WeatherType,
    env: EnvironmentTheme,
    dayNight: DayNightMode,
    intensity: number = 0.5
  ): void {
    this.currentWeather = weather;
    this.currentIntensity = intensity;

    // Reset weather audio
    this.audioManager.stopRainAmbience();

    // 1. Particle Systems Visibility
    this.isRainActive = weather === 'RAIN' || weather === 'STORM';
    if (this.rainPoints) {
      this.rainPoints.visible = this.isRainActive;
      if (this.rainMat) {
        this.rainMat.opacity = weather === 'STORM' ? 0.85 : 0.6;
        this.rainMat.color.setHex(weather === 'STORM' ? 0x60a5fa : 0x93c5fd);
      }
    }

    this.isWindActive = weather === 'WIND';
    if (this.windPoints) {
      this.windPoints.visible = this.isWindActive;
    }

    if (this.isRainActive) {
      this.audioManager.startRainAmbience();
    }

    // 2. Adjust Lighting, Fog, and Sky appearance based on Weather
    const isDay = dayNight === 'DAY';
    const themeCfg = GAME_CONFIG.THEMES[env];

    let skyColorHex: number;
    let fogDensity: number;
    let dirIntensity: number;
    let dirColorHex: number;
    let ambientIntensity: number;

    switch (weather) {
      case 'SUNNY':
        skyColorHex = isDay ? themeCfg.FOG_DAY : themeCfg.FOG_NIGHT;
        fogDensity = isDay ? 0.006 : 0.008; // High visibility
        dirIntensity = isDay ? 1.6 : 1.0;
        dirColorHex = isDay ? 0xfffbeb : 0xdbeafe;
        ambientIntensity = isDay ? 0.85 : 0.65;
        break;

      case 'CLOUDY':
        skyColorHex = isDay ? 0x475569 : 0x1e293b;
        fogDensity = 0.009; // Soft diffused sky
        dirIntensity = isDay ? 1.1 : 0.75;
        dirColorHex = 0xe2e8f0;
        ambientIntensity = 0.75;
        break;

      case 'RAIN':
        skyColorHex = isDay ? 0x334155 : 0x0f172a;
        fogDensity = 0.011; // Rainy atmosphere without blocking obstacles
        dirIntensity = isDay ? 1.0 : 0.7;
        dirColorHex = 0x93c5fd;
        ambientIntensity = 0.7;
        break;

      case 'FOG':
        skyColorHex = isDay ? 0x94a3b8 : 0x1e293b;
        fogDensity = 0.015; // Realistic visible fog, preserves obstacle readability at 35m
        dirIntensity = isDay ? 0.95 : 0.65;
        dirColorHex = 0xf1f5f9;
        ambientIntensity = 0.8;
        break;

      case 'WIND':
        skyColorHex = isDay ? themeCfg.FOG_DAY : themeCfg.FOG_NIGHT;
        fogDensity = 0.008;
        dirIntensity = isDay ? 1.4 : 0.9;
        dirColorHex = 0xfef08a;
        ambientIntensity = 0.8;
        break;

      case 'STORM':
        skyColorHex = 0x090d16; // Deep dramatic storm darkness
        fogDensity = 0.013;
        dirIntensity = 0.75;
        dirColorHex = 0x64748b;
        ambientIntensity = 0.55;
        this.lightningTimer = 4.0; // Ready initial thunder flash
        break;

      case 'SUNSET':
        skyColorHex = 0x451a03; // Warm golden hour
        fogDensity = 0.008;
        dirIntensity = 1.35;
        dirColorHex = 0xfb923c; // Amber sun
        ambientIntensity = 0.75;
        break;

      case 'NIGHT':
      default:
        skyColorHex = themeCfg.FOG_NIGHT;
        fogDensity = 0.009;
        dirIntensity = themeCfg.SUN_INTENSITY_NIGHT;
        dirColorHex = 0xc7d2fe;
        ambientIntensity = 0.65;
        break;
    }

    this.baseDirLightIntensity = dirIntensity;

    // Apply to Scene
    this.scene.background = new THREE.Color(skyColorHex);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(skyColorHex);
      this.scene.fog.density = fogDensity;
    }

    if (this.sceneManager.dirLight) {
      this.sceneManager.dirLight.intensity = dirIntensity;
      this.sceneManager.dirLight.color.setHex(dirColorHex);
    }

    if (this.sceneManager.ambientLight) {
      this.sceneManager.ambientLight.intensity = ambientIntensity;
    }
  }

  /**
   * Update active weather particles & storm lightning events
   */
  public update(delta: number, playerZ: number, playerSpeed: number): void {
    // 1. Rain / Storm particle animation
    if (this.isRainActive && this.rainPositions && this.rainGeo && this.rainPoints) {
      const fallSpeed = 32.0;
      const runnerSpeedComp = playerSpeed * 0.45;

      for (let i = 0; i < this.rainParticleCount; i++) {
        // Fall down
        this.rainPositions[i * 3 + 1] -= fallSpeed * delta;
        // Slant slightly forward matching runner relative motion
        this.rainPositions[i * 3 + 2] -= runnerSpeedComp * delta;

        // Wrap around relative to playerZ
        if (this.rainPositions[i * 3 + 1] <= 0.1 || this.rainPositions[i * 3 + 2] > playerZ + 8) {
          this.rainPositions[i * 3 + 1] = Math.random() * 4 + 10;
          this.rainPositions[i * 3] = (Math.random() - 0.5) * 22;
          this.rainPositions[i * 3 + 2] = playerZ - Math.random() * 42;
        }
      }
      this.rainGeo.attributes.position.needsUpdate = true;
    }

    // 2. Wind particle animation
    if (this.isWindActive && this.windPositions && this.windVelocities && this.windGeo) {
      for (let i = 0; i < this.windParticleCount; i++) {
        this.windPositions[i * 3] += this.windVelocities[i * 3] * delta;
        this.windPositions[i * 3 + 1] += this.windVelocities[i * 3 + 1] * delta;
        this.windPositions[i * 3 + 2] += this.windVelocities[i * 3 + 2] * delta;

        // Wrap horizontally / vertically
        if (this.windPositions[i * 3] > 14 || this.windPositions[i * 3 + 2] > playerZ + 10) {
          this.windPositions[i * 3] = -14;
          this.windPositions[i * 3 + 1] = Math.random() * 5 + 0.5;
          this.windPositions[i * 3 + 2] = playerZ - Math.random() * 38;
        }
      }
      this.windGeo.attributes.position.needsUpdate = true;
    }

    // 3. Storm lightning flash
    if (this.currentWeather === 'STORM' && this.sceneManager.dirLight) {
      if (this.isFlashing) {
        this.flashDuration -= delta;
        if (this.flashDuration <= 0) {
          this.isFlashing = false;
          this.sceneManager.dirLight.intensity = this.baseDirLightIntensity;
        }
      } else {
        this.lightningTimer -= delta;
        if (this.lightningTimer <= 0) {
          // Trigger lightning flash
          this.isFlashing = true;
          this.flashDuration = 0.08; // 80ms crisp flash
          this.sceneManager.dirLight.intensity = this.baseDirLightIntensity * 3.5;
          this.audioManager.playThunderSound();
          // Reset timer to 8-15 seconds
          this.lightningTimer = 8.0 + Math.random() * 7.0;
        }
      }
    }
  }

  public dispose(): void {
    if (this.rainPoints) {
      this.scene.remove(this.rainPoints);
    }
    if (this.rainGeo) {
      this.rainGeo.dispose();
    }
    if (this.rainMat) {
      this.rainMat.dispose();
    }

    if (this.windPoints) {
      this.scene.remove(this.windPoints);
    }
    if (this.windGeo) {
      this.windGeo.dispose();
    }
    if (this.windMat) {
      this.windMat.dispose();
    }

    this.audioManager.stopRainAmbience();
  }
}
