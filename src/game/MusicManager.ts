/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MASTER_VOLUME, MUSIC_VOLUME, DRAGON_MUSIC_ENABLED } from './combatConfig';

export type MusicTrack = 'NONE' | 'MENU' | 'GAMEPLAY' | 'HUMAN_COMBAT' | 'ELITE_COMBAT' | 'DRAGON' | 'VICTORY' | 'GAMEOVER';

export class MusicManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private currentTrack: MusicTrack = 'NONE';
  private isMuted: boolean = false;
  private isEnabled: boolean = true;
  private masterVolume: number = MASTER_VOLUME;
  private musicVolume: number = MUSIC_VOLUME;

  // Sequencer loop variables
  private sequencerTimer: number | null = null;
  private beatStep: number = 0;
  private isDragonTheme: boolean = false;
  private isHumanCombatTheme: boolean = false;
  private isEliteTheme: boolean = false;
  private dragonIntensityGain: GainNode | null = null;
  private lastTransitionTime: number = 0;

  constructor() {
    // Initialized when audio context is passed or on first user unlock
  }

  public init(audioCtx?: AudioContext, destination?: AudioNode): void {
    if (this.ctx && this.musicGain) return;

    try {
      this.ctx = audioCtx || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      
      if (destination) {
        this.masterGain.connect(destination);
      } else {
        this.masterGain.connect(this.ctx.destination);
      }

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.isEnabled ? this.musicVolume : 0.0001, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.dragonIntensityGain = this.ctx.createGain();
      this.dragonIntensityGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.dragonIntensityGain.connect(this.musicGain);
    } catch (e) {
      console.warn('[MusicManager] AudioContext initialization deferred:', e);
    }
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1.0, volume));
    if (this.masterGain && this.ctx) {
      const target = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1.0, volume));
    if (this.musicGain && this.ctx) {
      const target = this.isEnabled ? this.musicVolume : 0.0001;
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.setMasterVolume(this.masterVolume);
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.setMusicVolume(this.musicVolume);
    if (!enabled) {
      this.stop();
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public getCurrentTrack(): MusicTrack {
    return this.currentTrack;
  }

  /**
   * Start Menu Ambient Synth Theme
   */
  public playMenuMusic(): void {
    if (this.currentTrack === 'MENU') return;
    this.stopSequencer();
    this.currentTrack = 'MENU';
    this.isDragonTheme = false;

    if (!this.ctx || !this.musicGain || !this.isEnabled) return;
    this.startSequencer(110);
  }

  /**
   * Start Energetic Gameplay Cyber Runner Theme
   */
  public playGameplayMusic(): void {
    const now = performance.now();
    if (this.currentTrack === 'GAMEPLAY' && !this.isDragonTheme && !this.isHumanCombatTheme && !this.isEliteTheme) return;
    // Debounce rapid switching
    if (now - this.lastTransitionTime < 1200 && this.currentTrack === 'GAMEPLAY') return;
    this.lastTransitionTime = now;

    this.currentTrack = 'GAMEPLAY';
    this.isDragonTheme = false;
    this.isHumanCombatTheme = false;
    this.isEliteTheme = false;

    if (this.dragonIntensityGain && this.ctx) {
      // Smooth fade out of dragon boss layer over 0.6s
      this.dragonIntensityGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.dragonIntensityGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4);
    }

    if (!this.ctx || !this.musicGain || !this.isEnabled) return;
    if (this.sequencerTimer === null) {
      this.startSequencer(128);
    }
  }

  /**
   * Smoothly transitions to intense Human Shooter Encounter combat music
   */
  public transitionToHumanCombatMusic(): void {
    const now = performance.now();
    if (this.isDragonTheme) return; // Dragon takes priority
    if (this.isHumanCombatTheme && !this.isEliteTheme) return;
    if (now - this.lastTransitionTime < 1500) return;
    this.lastTransitionTime = now;

    this.currentTrack = 'HUMAN_COMBAT';
    this.isHumanCombatTheme = true;
    this.isEliteTheme = false;

    if (!this.ctx || !this.musicGain || !this.isEnabled) return;
    if (this.sequencerTimer === null) {
      this.startSequencer(132);
    }
  }

  /**
   * Transitions to Elite Shooter / Boss encounter theme
   */
  public transitionToEliteCombatMusic(): void {
    const now = performance.now();
    if (this.isDragonTheme) return;
    if (this.isEliteTheme) return;
    this.lastTransitionTime = now;

    this.currentTrack = 'ELITE_COMBAT';
    this.isHumanCombatTheme = true;
    this.isEliteTheme = true;

    if (!this.ctx || !this.musicGain || !this.isEnabled) return;
    if (this.sequencerTimer === null) {
      this.startSequencer(138);
    }
  }

  /**
   * Smoothly transitions to intense Dragon Combat Battle Theme
   */
  public transitionToDragonMusic(): void {
    if (!DRAGON_MUSIC_ENABLED) return;
    this.currentTrack = 'DRAGON';
    this.isDragonTheme = true;
    this.isHumanCombatTheme = false;
    this.isEliteTheme = false;

    if (this.dragonIntensityGain && this.ctx) {
      // Smooth fade in of dramatic dragon boss layer over 0.5s
      this.dragonIntensityGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.dragonIntensityGain.gain.setTargetAtTime(0.85, this.ctx.currentTime, 0.35);
    }

    if (this.sequencerTimer === null) {
      this.startSequencer(136);
    }
  }

  /**
   * Smoothly returns to standard gameplay music
   */
  public transitionToGameplayMusic(): void {
    this.playGameplayMusic();
  }

  /**
   * Play Triumphant Victory Fanfare on Level Completion
   */
  public playVictoryMusic(): void {
    this.stopSequencer();
    this.currentTrack = 'VICTORY';
    this.isDragonTheme = false;

    if (!this.ctx || !this.musicGain || !this.isEnabled || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      // Victory synth brass chords: C major -> F major -> G major -> C high
      const chords = [
        [261.63, 329.63, 392.0], // C4
        [349.23, 440.0, 523.25], // F4
        [392.0, 493.88, 587.33], // G4
        [523.25, 659.25, 783.99, 1046.5], // C5
      ];

      chords.forEach((chord, i) => {
        const chordTime = now + i * 0.32;
        const dur = i === chords.length - 1 ? 1.2 : 0.28;

        chord.forEach((freq) => {
          if (!this.ctx || !this.musicGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, chordTime);

          gain.gain.setValueAtTime(0.08, chordTime);
          gain.gain.exponentialRampToValueAtTime(0.001, chordTime + dur);

          osc.connect(gain);
          gain.connect(this.musicGain);

          osc.start(chordTime);
          osc.stop(chordTime + dur);
        });
      });
    } catch {
      // Audio fallback
    }
  }

  /**
   * Play Somber Descending Theme on Game Over
   */
  public playGameOverMusic(): void {
    this.stopSequencer();
    this.currentTrack = 'GAMEOVER';
    this.isDragonTheme = false;

    if (!this.ctx || !this.musicGain || !this.isEnabled || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [220.0, 196.0, 174.61, 146.83]; // A3, G3, F3, D3

      notes.forEach((freq, i) => {
        if (!this.ctx || !this.musicGain) return;
        const noteTime = now + i * 0.45;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, noteTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, noteTime);
        filter.frequency.exponentialRampToValueAtTime(120, noteTime + 0.6);

        gain.gain.setValueAtTime(0.12, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.65);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(noteTime);
        osc.stop(noteTime + 0.65);
      });
    } catch {
      // Audio fallback
    }
  }

  public stop(): void {
    this.stopSequencer();
    this.currentTrack = 'NONE';
    this.isDragonTheme = false;
  }

  private stopSequencer(): void {
    if (this.sequencerTimer !== null) {
      clearInterval(this.sequencerTimer);
      this.sequencerTimer = null;
    }
    this.beatStep = 0;
  }

  /**
   * Real-time Multi-layered Electronic Music Sequencer
   */
  private startSequencer(bpm: number = 128): void {
    this.stopSequencer();
    // 16th note interval = (60 / bpm) / 4 seconds
    const intervalMs = Math.round((60000 / bpm) / 4);

    const bassNotesNormal = [110.0, 110.0, 130.81, 110.0, 98.0, 98.0, 123.47, 98.0]; // A2, C3, G2, B2
    const bassNotesDragon = [82.41, 82.41, 87.31, 82.41, 73.42, 82.41, 98.0, 82.41]; // E2, F2, D2, G2 (Aggressive minor)
    const bassNotesHuman = [98.0, 110.0, 98.0, 130.81, 110.0, 146.83, 130.81, 164.81]; // Driving action pulse
    const leadNotesNormal = [440.0, 523.25, 659.25, 783.99, 659.25, 523.25, 440.0, 392.0];
    const leadNotesDragon = [329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 659.25, 783.99];
    const leadNotesHuman = [523.25, 587.33, 659.25, 783.99, 659.25, 783.99, 880.0, 659.25];

    this.sequencerTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || !this.isEnabled || this.isMuted) return;

      try {
        const now = this.ctx.currentTime;
        const step = this.beatStep % 16;
        this.beatStep++;

        const isDragon = this.isDragonTheme;
        const isCombat = this.isDragonTheme || this.isHumanCombatTheme;

        // 1. Kick / Bass Drum (Beat 0, 4, 8, 12 - with extra beats in combat mode)
        if (step % 4 === 0 || (isCombat && (step === 10 || step === 14))) {
          const kickOsc = this.ctx.createOscillator();
          const kickGain = this.ctx.createGain();

          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(isDragon ? 160 : (isCombat ? 145 : 130), now);
          kickOsc.frequency.exponentialRampToValueAtTime(32, now + 0.09);

          kickGain.gain.setValueAtTime(isDragon ? 0.32 : (isCombat ? 0.28 : 0.22), now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

          kickOsc.connect(kickGain);
          kickGain.connect(this.musicGain);

          kickOsc.start(now);
          kickOsc.stop(now + 0.1);
        }

        // 2. Snare / Cyber Clap on beats 4 and 12
        if (step === 4 || step === 12 || (this.isEliteTheme && step === 15)) {
          const noiseBuffer = this.createSnareNoise();
          if (noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuffer;

            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.setValueAtTime(isCombat ? 1200 : 1000, now);

            const sGain = this.ctx.createGain();
            sGain.gain.setValueAtTime(isDragon ? 0.18 : (isCombat ? 0.15 : 0.12), now);
            sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            noise.connect(noiseFilter);
            noiseFilter.connect(sGain);
            sGain.connect(this.musicGain);

            noise.start(now);
          }
        }

        // 3. Hi-Hat on odd 16th notes
        if (step % 2 === 1 || (isCombat && step % 4 === 2)) {
          const hatOsc = this.ctx.createOscillator();
          const hatFilter = this.ctx.createBiquadFilter();
          const hGain = this.ctx.createGain();

          hatOsc.type = 'square';
          hatOsc.frequency.setValueAtTime(8000, now);

          hatFilter.type = 'highpass';
          hatFilter.frequency.setValueAtTime(6500, now);

          hGain.gain.setValueAtTime(isCombat ? 0.06 : 0.04, now);
          hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

          hatOsc.connect(hatFilter);
          hatFilter.connect(hGain);
          hGain.connect(this.musicGain);

          hatOsc.start(now);
          hatOsc.stop(now + 0.04);
        }

        // 4. Synth Bass Arp
        if (step % 2 === 0) {
          const notes = isDragon ? bassNotesDragon : (this.isHumanCombatTheme ? bassNotesHuman : bassNotesNormal);
          const noteIdx = Math.floor(step / 2) % notes.length;
          const bassFreq = notes[noteIdx];

          const bassOsc = this.ctx.createOscillator();
          const bassFilter = this.ctx.createBiquadFilter();
          const bGain = this.ctx.createGain();

          bassOsc.type = (isDragon || this.isEliteTheme) ? 'sawtooth' : 'triangle';
          bassOsc.frequency.setValueAtTime(bassFreq, now);

          bassFilter.type = 'lowpass';
          bassFilter.frequency.setValueAtTime(isDragon ? 550 : (isCombat ? 480 : 340), now);

          bGain.gain.setValueAtTime(isDragon ? 0.18 : (isCombat ? 0.16 : 0.14), now);
          bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

          bassOsc.connect(bassFilter);
          bassFilter.connect(bGain);
          bGain.connect(this.musicGain);

          bassOsc.start(now);
          bassOsc.stop(now + 0.14);
        }

        // 5. Melodic Synthesizer Lead
        if (step === 2 || step === 6 || step === 10 || step === 14) {
          const leads = isDragon ? leadNotesDragon : (this.isHumanCombatTheme ? leadNotesHuman : leadNotesNormal);
          const leadFreq = leads[(step + Math.floor(this.beatStep / 16)) % leads.length];

          const leadOsc = this.ctx.createOscillator();
          const lGain = this.ctx.createGain();

          leadOsc.type = isDragon ? 'sawtooth' : 'triangle';
          leadOsc.frequency.setValueAtTime(leadFreq, now);

          lGain.gain.setValueAtTime(isDragon ? 0.1 : (isCombat ? 0.09 : 0.07), now);
          lGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

          leadOsc.connect(lGain);
          lGain.connect(this.musicGain);

          leadOsc.start(now);
          leadOsc.stop(now + 0.18);
        }

        // 6. Dragon Boss Battle Drone & Tension Layer
        if (isDragon && this.dragonIntensityGain && (step === 0 || step === 8)) {
          const droneOsc = this.ctx.createOscillator();
          const dFilter = this.ctx.createBiquadFilter();
          const dGain = this.ctx.createGain();

          droneOsc.type = 'sawtooth';
          droneOsc.frequency.setValueAtTime(55.0, now); // Low A1 / sub drone

          dFilter.type = 'lowpass';
          dFilter.frequency.setValueAtTime(260, now);

          dGain.gain.setValueAtTime(0.2, now);
          dGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

          droneOsc.connect(dFilter);
          dFilter.connect(dGain);
          dGain.connect(this.dragonIntensityGain);

          droneOsc.start(now);
          droneOsc.stop(now + 0.35);
        }
      } catch {
        // Safe synth fallback
      }
    }, intervalMs);
  }

  private cachedNoiseBuffer: AudioBuffer | null = null;
  private createSnareNoise(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (this.cachedNoiseBuffer) return this.cachedNoiseBuffer;

    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.15);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      this.cachedNoiseBuffer = buffer;
      return buffer;
    } catch {
      return null;
    }
  }

  public dispose(): void {
    this.stop();
    this.cachedNoiseBuffer = null;
    this.dragonIntensityGain = null;
    this.musicGain = null;
    this.masterGain = null;
    this.ctx = null;
  }
}
