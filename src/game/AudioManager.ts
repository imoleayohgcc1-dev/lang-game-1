export class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isMusicEnabled: boolean = true;
  private isSoundEnabled: boolean = true;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isInitialized: boolean = false;
  private isMusicPlaying: boolean = false;
  private musicIntervalId: number | null = null;
  private beatStep: number = 0;

  constructor() {
    // Initialized on first user interaction
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
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.isMusicEnabled ? 0.35 : 0.0001, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.isSoundEnabled ? 0.6 : 0.0001, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

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

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const targetGain = muted ? 0 : 0.7;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMusicEnabled(enabled: boolean): void {
    this.isMusicEnabled = enabled;
    if (this.musicGain && this.ctx) {
      const targetGain = enabled ? 0.35 : 0.0001;
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
  }

  public setSoundEnabled(enabled: boolean): void {
    this.isSoundEnabled = enabled;
    if (this.sfxGain && this.ctx) {
      const targetGain = enabled ? 0.6 : 0.0001;
      this.sfxGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.sfxGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
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
   * Play blaster projectile firing sound
   */
  public playShootSound(): void {
    if (this.isMuted || !this.isSoundEnabled || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.13);
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
   * Energetic cyber runner procedural soundtrack engine
   * Rhythmic bassline and synth arpeggios synced to gameplay
   */
  public startAmbientMusic(): void {
    if (!this.init()) return;
    if (this.isMusicPlaying) return;

    this.isMusicPlaying = true;
    this.beatStep = 0;

    // 125 BPM = 120ms per 16th note step
    const stepDurationMs = 120;

    const bassNotes = [110, 110, 130.81, 110, 98, 98, 123.47, 98]; // A2, C3, G2, B2
    const leadNotes = [440, 523.25, 659.25, 783.99, 659.25, 523.25, 440, 392];

    this.musicIntervalId = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || !this.isMusicEnabled || this.isMuted) return;

      try {
        const now = this.ctx.currentTime;
        const step = this.beatStep % 16;
        this.beatStep++;

        // 1. Kick/Sub pulse on beats 0, 4, 8, 12
        if (step % 4 === 0) {
          const kickOsc = this.ctx.createOscillator();
          const kickGain = this.ctx.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(140, now);
          kickOsc.frequency.exponentialRampToValueAtTime(38, now + 0.08);

          kickGain.gain.setValueAtTime(0.25, now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

          kickOsc.connect(kickGain);
          kickGain.connect(this.musicGain);

          kickOsc.start(now);
          kickOsc.stop(now + 0.1);
        }

        // 2. Synth Bass Arp on every 2nd step
        if (step % 2 === 0) {
          const noteIdx = Math.floor(step / 2) % bassNotes.length;
          const bassFreq = bassNotes[noteIdx];

          const bassOsc = this.ctx.createOscillator();
          const bassFilter = this.ctx.createBiquadFilter();
          const bGain = this.ctx.createGain();

          bassOsc.type = 'sawtooth';
          bassOsc.frequency.setValueAtTime(bassFreq, now);

          bassFilter.type = 'lowpass';
          bassFilter.frequency.setValueAtTime(320, now);

          bGain.gain.setValueAtTime(0.12, now);
          bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

          bassOsc.connect(bassFilter);
          bassFilter.connect(bGain);
          bGain.connect(this.musicGain);

          bassOsc.start(now);
          bassOsc.stop(now + 0.14);
        }

        // 3. Shimmering lead note on select steps
        if (step === 2 || step === 7 || step === 10 || step === 14) {
          const leadFreq = leadNotes[(step + Math.floor(this.beatStep / 16)) % leadNotes.length];
          const leadOsc = this.ctx.createOscillator();
          const lGain = this.ctx.createGain();

          leadOsc.type = 'triangle';
          leadOsc.frequency.setValueAtTime(leadFreq, now);

          lGain.gain.setValueAtTime(0.08, now);
          lGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

          leadOsc.connect(lGain);
          lGain.connect(this.musicGain);

          leadOsc.start(now);
          leadOsc.stop(now + 0.18);
        }
      } catch {
        // Safe synth fallback
      }
    }, stepDurationMs);
  }

  public stopAmbientMusic(): void {
    this.isMusicPlaying = false;
    if (this.musicIntervalId !== null) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }

  public dispose(): void {
    this.stopAmbientMusic();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.isInitialized = false;
  }
}
