import { MusicManager } from './MusicManager';
import { MASTER_VOLUME, MUSIC_VOLUME, SFX_VOLUME } from './combatConfig';
import { WeaponType } from './combatTypes';

export class AudioManager {
  public ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isMusicEnabled: boolean = true;
  private isSoundEnabled: boolean = true;
  private masterVolume: number = MASTER_VOLUME;
  private musicVolume: number = MUSIC_VOLUME;
  private sfxVolume: number = SFX_VOLUME;

  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private priorityGain: GainNode | null = null; // High-priority channel for warnings, explosions & player damage
  private isInitialized: boolean = false;

  // Sound category toggles (Phase 14)
  public shieldSoundEnabled: boolean = true;
  public enemyCombatSoundEnabled: boolean = true;
  private lastShieldImpactTime: number = 0;

  public musicManager: MusicManager;

  constructor() {
    this.musicManager = new MusicManager();
  }

  public init(): boolean {
    if (this.isInitialized && this.ctx) return true;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        console.warn('[AudioManager] Web Audio API is not supported in this browser.');
        return false;
      }

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.isMusicEnabled ? this.musicVolume : 0.0001, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.isSoundEnabled ? this.sfxVolume : 0.0001, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Dedicated priority channel for dragon warnings, player damage, bomb explosions
      this.priorityGain = this.ctx.createGain();
      this.priorityGain.gain.setValueAtTime(this.isSoundEnabled ? Math.min(1.0, this.sfxVolume * 1.35) : 0.0001, this.ctx.currentTime);
      this.priorityGain.connect(this.masterGain);

      // Initialize integrated MusicManager
      this.musicManager.init(this.ctx, this.masterGain);
      this.musicManager.setMasterVolume(this.masterVolume);
      this.musicManager.setMusicVolume(this.musicVolume);
      this.musicManager.setEnabled(this.isMusicEnabled);
      this.musicManager.setMuted(this.isMuted);

      this.isInitialized = true;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch((e) => console.warn('Audio resume deferred:', e));
      }

      return true;
    } catch (err) {
      console.warn('[AudioManager] Failed to initialize Web Audio:', err);
      return false;
    }
  }

  public unlock(): void {
    if (!this.ctx) {
      this.init();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1.0, vol));
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
    this.musicManager.setMasterVolume(this.masterVolume);
  }

  public setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(1.0, vol));
    if (this.musicGain && this.ctx) {
      const targetGain = this.isMusicEnabled ? this.musicVolume : 0.0001;
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
    this.musicManager.setMusicVolume(this.musicVolume);
  }

  public setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1.0, vol));
    if (this.sfxGain && this.ctx) {
      const targetGain = this.isSoundEnabled ? this.sfxVolume : 0.0001;
      this.sfxGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.sfxGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
    if (this.priorityGain && this.ctx) {
      const prioGain = this.isSoundEnabled ? Math.min(1.0, this.sfxVolume * 1.35) : 0.0001;
      this.priorityGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.priorityGain.gain.setTargetAtTime(prioGain, this.ctx.currentTime, 0.05);
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.setMasterVolume(this.masterVolume);
    this.musicManager.setMuted(muted);
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public setShieldSoundEnabled(enabled: boolean): void {
    this.shieldSoundEnabled = enabled;
  }

  public setEnemyCombatSoundEnabled(enabled: boolean): void {
    this.enemyCombatSoundEnabled = enabled;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMusicEnabled(enabled: boolean): void {
    this.isMusicEnabled = enabled;
    this.setMusicVolume(this.musicVolume);
    this.musicManager.setEnabled(enabled);
  }

  public setSoundEnabled(enabled: boolean): void {
    this.isSoundEnabled = enabled;
    this.setSfxVolume(this.sfxVolume);
  }

  public getIsMusicEnabled(): boolean {
    return this.isMusicEnabled;
  }

  public getIsSoundEnabled(): boolean {
    return this.isSoundEnabled;
  }

  /**
   * Play crystal clear coin pickup chime
   */
  public playCoinSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play Power-Up collection fanfare
   */
  public playPowerUpSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + idx * 0.06;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.35, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(start);
        osc.stop(start + 0.18);
      });
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play Energy Shield absorbing damage
   */
  public playShieldAbsorbSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.22);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play Protective Shield activation futuristic energy pulse (Phase 14)
   */
  public playShieldActivateSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.shieldSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      // Rising energy sweep
      const sweepOsc = this.ctx.createOscillator();
      const sweepGain = this.ctx.createGain();
      sweepOsc.type = 'sawtooth';
      sweepOsc.frequency.setValueAtTime(220, now);
      sweepOsc.frequency.exponentialRampToValueAtTime(1240, now + 0.35);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.35);

      sweepGain.gain.setValueAtTime(0.28, now);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

      sweepOsc.connect(filter);
      filter.connect(sweepGain);
      sweepGain.connect(this.sfxGain);

      sweepOsc.start(now);
      sweepOsc.stop(now + 0.42);

      // Shimmering chord
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + idx * 0.04;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.38);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(start);
        osc.stop(start + 0.38);
      });
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play Protective Shield impact deflection sound with throttling
   */
  public playShieldDeflectSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.shieldSoundEnabled || !this.ctx || !this.sfxGain) return;
    const now = performance.now();
    // Throttling: prevent deafening audio if multiple hits occur within 140ms
    if (now - this.lastShieldImpactTime < 140) return;
    this.lastShieldImpactTime = now;

    try {
      const audioNow = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, audioNow);
      osc.frequency.exponentialRampToValueAtTime(380, audioNow + 0.16);

      gain.gain.setValueAtTime(0.38, audioNow);
      gain.gain.exponentialRampToValueAtTime(0.001, audioNow + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(audioNow);
      osc.stop(audioNow + 0.18);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play Protective Shield expiration sound (soft energy shutdown)
   */
  public playShieldExpireSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.shieldSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(740, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.32);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Audio fallback
    }
  }

  // ============================================================================
  // HUMAN SHOOTER ENEMY SFX (Phase 14)
  // ============================================================================

  public playHumanEnemyAlertSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.enemyCombatSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.setValueAtTime(820, now + 0.08);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Audio fallback
    }
  }

  public playHumanEnemyAimSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.enemyCombatSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(960, now + 0.28);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // Audio fallback
    }
  }

  public playHumanEnemyShootSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.enemyCombatSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Pitch variation ±12%
      const pitch = 760 + (Math.random() - 0.5) * 180;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(pitch, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Audio fallback
    }
  }

  public playHumanEnemyHurtSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.enemyCombatSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Audio fallback
    }
  }

  public playHumanEnemyDefeatSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.enemyCombatSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      [440, 330, 220].forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + idx * 0.06;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.22, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(start);
        osc.stop(start + 0.18);
      });
    } catch {
      // Audio fallback
    }
  }

  public playEliteEncounterSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.priorityGain || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.45);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.priorityGain);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play small red stone collision scrape/chip
   */
  public playStoneHitSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play Enemy projectile discharge whoosh
   */
  public playEnemyShootSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play brief non-intrusive projectile attack warning chime
   */
  public playWarningSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.setValueAtTime(1150, now + 0.06);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play Coin Multiplier activation chime
   */
  public playMultiplierSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.linearRampToValueAtTime(1760, now + 0.15);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play landing impact sound
   */
  public playLandingSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play lane shift / dash swoosh
   */
  public playLaneSwitchSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.09);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play dynamic jump swoosh sound
   */
  public playJumpSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.18);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400, now);
      filter.Q.value = 3;

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play slide skid sound
   */
  public playSlideSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play heavy impact / collision sound
   */
  public playCrashSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.38);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play blaster projectile firing sound with weapon variations
   */
  public playShootSound(weaponType: WeaponType = 'NORMAL'): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (weaponType === 'BIG_BULLET') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);
        gain.gain.setValueAtTime(0.42, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.19);
      } else if (weaponType === 'MACHINE_GUN') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(1100, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.05);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (weaponType === 'SPECIAL_BOMB') {
        // Celestial Star Emitter sound
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1320, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);
        gain.gain.setValueAtTime(0.38, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.23);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.13);
      }
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play bomb throw whoosh sound
   */
  public playBombThrowSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.16);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play heavy bomb detonation explosion rumble
   */
  public playBombExplosionSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      // Sub-bass thump
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();

      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(150, now);
      subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.45);

      subGain.gain.setValueAtTime(0.65, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      subOsc.connect(subGain);
      subGain.connect(this.sfxGain);

      subOsc.start(now);
      subOsc.stop(now + 0.5);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play pickup collection sound
   */
  public playPickupSound(pickupType: string = 'COIN'): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (pickupType === 'HEALTH' || pickupType === 'MAX_HEALTH') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      } else if (pickupType === 'BOMB') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.15);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
      } else if (pickupType === 'BIG_BULLET' || pickupType === 'MACHINE_GUN') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(1040, now + 0.25);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now);
        osc.frequency.setValueAtTime(1318.51, now + 0.06);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      }

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play projectile hit impact on enemy
   */
  public playHitSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play enemy destruction / explosion sound
   */
  public playDefeatSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(700, now + 0.06);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.28);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play player taking damage alarm
   */
  public playPlayerDamageSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(110, now + 0.08);
      osc.frequency.setValueAtTime(220, now + 0.16);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play weapon magazine reload recharge sound
   */
  public playReloadSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.18);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play game over defeat jingle
   */
  public playGameOverSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [349.23, 311.13, 261.63, 196.0]; // F4 -> Eb4 -> C4 -> G3
      notes.forEach((freq, i) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + i * 0.12;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(start);
        osc.stop(start + 0.22);
      });
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play UI button click feedback
   */
  public playClickSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play Game Start fanfare
   */
  public playStartSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const notes = [440, 554.37, 659.25, 880];
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = now + idx * 0.07;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(startTime);
        osc.stop(startTime + 0.2);
      });
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play obstacle destruction sound (crisp cyber explosion with crumbling resonance)
   */
  public playObstacleDestructionSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + 0.22);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Audio fallback
    }
  }

  /**
   * High-Priority: Dragon attack warning alarm (dual-tone cyber klaxon)
   */
  public playDragonWarningSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const targetGain = this.priorityGain || this.sfxGain;
      if (!targetGain) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(587.33, now + 0.1);
      osc.frequency.setValueAtTime(880, now + 0.2);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(gain);
      gain.connect(targetGain);

      osc.start(now);
      osc.stop(now + 0.32);
    } catch {
      // Audio fallback
    }
  }

  /**
   * High-Priority: Dragon launch/throw projectile roar
   */
  public playDragonAttackSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const targetGain = this.priorityGain || this.sfxGain;
      if (!targetGain) return;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.linearRampToValueAtTime(420, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.45);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400, now);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(targetGain);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Dragon hit damage impact
   */
  public playDragonHitSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch {
      // Audio fallback
    }
  }

  /**
   * High-Priority: Dragon defeated grand destruction boom
   */
  public playDragonDefeatSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const targetGain = this.priorityGain || this.sfxGain;
      if (!targetGain) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.8);

      gain.gain.setValueAtTime(0.65, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      osc.connect(gain);
      gain.connect(targetGain);

      osc.start(now);
      osc.stop(now + 0.85);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Convenience aliases for standard sounds
   */
  public playBulletImpactSound(): void {
    this.playHitSound();
  }

  public playDamageSound(): void {
    this.playPlayerDamageSound();
  }

  public playBombPickupSound(): void {
    this.playPickupSound('BOMB');
  }

  public playBigBulletPickupSound(): void {
    this.playPickupSound('BIG_BULLET');
  }

  public playMachineGunPickupSound(): void {
    this.playPickupSound('MACHINE_GUN');
  }

  public playHealthPickupSound(): void {
    this.playPickupSound('HEALTH');
  }

  public playLevelCompleteSound(): void {
    this.musicManager.playVictoryMusic();
  }

  public playButtonClickSound(): void {
    this.playClickSound();
  }

  public playPowerUpExpiredSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.18);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Energetic cyber runner procedural soundtrack engine via MusicManager
   */
  public startAmbientMusic(): void {
    if (!this.init()) return;
    this.musicManager.playGameplayMusic();
  }

  public stopAmbientMusic(): void {
    this.musicManager.stop();
  }

  public playMenuMusic(): void {
    if (!this.init()) return;
    this.musicManager.playMenuMusic();
  }

  public playDragonMusic(): void {
    if (!this.init()) return;
    this.musicManager.transitionToDragonMusic();
  }

  public playVictoryMusic(): void {
    if (!this.init()) return;
    this.musicManager.playVictoryMusic();
  }

  public dispose(): void {
    this.musicManager.dispose();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.isInitialized = false;
  }
}
