import { LanguageCode } from './types';
import {
  VoiceState,
  VoiceErrorCode,
  VoiceRecognitionResult,
  LANGUAGE_SPEECH_LOCALES,
  VOICE_CONFIG,
} from './voiceTypes';

// Web Speech API interface declarations for cross-browser safety
export interface ISpeechRecognitionEvent extends Event {
  results: {
    length: number;
    [index: number]: {
      length: number;
      isFinal: boolean;
      [itemIndex: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

export interface ISpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export interface ISpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: ISpeechRecognitionInstance, ev: Event) => any) | null;
  onend: ((this: ISpeechRecognitionInstance, ev: Event) => any) | null;
  onerror: ((this: ISpeechRecognitionInstance, ev: ISpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: ISpeechRecognitionInstance, ev: ISpeechRecognitionEvent) => any) | null;
}

// Extend window definition for Web Speech API
declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => ISpeechRecognitionInstance;
  }
}

export class VoiceRecognitionManager {
  private recognition: ISpeechRecognitionInstance | null = null;
  private state: VoiceState = 'IDLE';
  private currentLanguage: LanguageCode = 'zh-CN';
  private isSupported: boolean = false;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  // Event callbacks
  public onPermissionGranted?: () => void;
  public onPermissionDenied?: () => void;
  public onListeningStarted?: () => void;
  public onListeningStopped?: () => void;
  public onSpeechRecognized?: (result: VoiceRecognitionResult) => void;
  public onError?: (error: VoiceErrorCode, message: string) => void;
  public onStateChanged?: (state: VoiceState) => void;

  constructor() {
    this.checkSupport();
  }

  private checkSupport(): boolean {
    if (typeof window === 'undefined') {
      this.isSupported = false;
      return false;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.isSupported = !!SpeechRec;
    if (!this.isSupported) {
      this.state = 'UNAVAILABLE';
    }
    return this.isSupported;
  }

  public getIsSupported(): boolean {
    return this.isSupported;
  }

  public getState(): VoiceState {
    return this.state;
  }

  private setState(newState: VoiceState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.onStateChanged?.(newState);
    }
  }

  /**
   * Initializes or updates the native SpeechRecognition instance.
   */
  private createRecognitionInstance(langCode: LanguageCode): ISpeechRecognitionInstance | null {
    if (!this.checkSupport()) return null;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return null;

    try {
      const rec = new SpeechRec();
      rec.continuous = false; // Stop listening after speaking current word/phrase
      rec.interimResults = false; // Only finalize full word result
      rec.maxAlternatives = 3;

      // Select primary locale
      const locales = LANGUAGE_SPEECH_LOCALES[langCode] || ['en-US'];
      rec.lang = locales[0];

      rec.onstart = () => {
        this.setState('LISTENING');
        this.onListeningStarted?.();
        this.startTimeout();
      };

      rec.onresult = (event: ISpeechRecognitionEvent) => {
        this.clearTimeout();
        this.setState('PROCESSING');

        let bestTranscript = '';
        let highestConfidence = 0.0;

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal && res[0]) {
            bestTranscript = res[0].transcript;
            highestConfidence = res[0].confidence || 0.85;
            break;
          }
        }

        if (!bestTranscript && event.results[0] && event.results[0][0]) {
          bestTranscript = event.results[0][0].transcript;
          highestConfidence = event.results[0][0].confidence || 0.75;
        }

        if (bestTranscript) {
          this.setState('EVALUATED');
          this.onSpeechRecognized?.({
            transcript: bestTranscript,
            confidence: highestConfidence,
            isFinal: true,
          });
        } else {
          this.handleError('NO_SPEECH', 'No speech was detected. Please try again.');
        }
      };

      rec.onerror = (event: ISpeechRecognitionErrorEvent) => {
        this.clearTimeout();
        const errType = event.error;

        if (errType === 'not-allowed') {
          this.onPermissionDenied?.();
          this.handleError('PERMISSION_DENIED', 'Microphone access was denied. Please allow microphone in settings.');
        } else if (errType === 'no-speech') {
          this.handleError('NO_SPEECH', 'No speech detected. Try speaking closer to your mic.');
        } else if (errType === 'network') {
          this.handleError('NETWORK', 'Network error during speech recognition.');
        } else if (errType === 'audio-capture') {
          this.handleError('AUDIO_CAPTURE', 'No microphone detected or audio capture failed.');
        } else if (errType === 'aborted') {
          this.handleError('ABORTED', 'Speech recognition was cancelled.');
        } else {
          this.handleError('UNKNOWN', `Recognition error: ${errType}`);
        }
      };

      rec.onend = () => {
        this.clearTimeout();
        if (this.state === 'LISTENING') {
          this.setState('IDLE');
        }
        this.onListeningStopped?.();
      };

      return rec;
    } catch (e) {
      console.warn('[VoiceRecognitionManager] Failed to construct SpeechRecognition:', e);
      return null;
    }
  }

  private startTimeout(): void {
    this.clearTimeout();
    this.timeoutId = setTimeout(() => {
      if (this.state === 'LISTENING') {
        this.stopListening();
        this.handleError('TIMEOUT', 'Listening timed out. Click speak to try again.');
      }
    }, VOICE_CONFIG.VOICE_TIMEOUT);
  }

  private clearTimeout(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private handleError(code: VoiceErrorCode, message: string): void {
    this.setState('ERROR');
    this.onError?.(code, message);
  }

  /**
   * Request microphone permission explicitly only upon user prompt or challenge start.
   * Never calls getUserMedia automatically on game load.
   */
  public async requestPermission(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }

    try {
      this.setState('REQUESTING_PERMISSION');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop tracks immediately after verifying permission so mic isn't held open unnecessarily
      stream.getTracks().forEach((track) => track.stop());
      this.onPermissionGranted?.();
      this.setState('IDLE');
      return true;
    } catch (err: any) {
      this.setState('ERROR');
      this.onPermissionDenied?.();
      this.handleError('PERMISSION_DENIED', 'Microphone permission denied.');
      return false;
    }
  }

  /**
   * Start listening for player pronunciation in the current target language
   */
  public startListening(languageCode: LanguageCode): boolean {
    if (!this.checkSupport()) {
      this.handleError('NOT_SUPPORTED', 'Voice recognition is not supported in this browser.');
      return false;
    }

    // Stop existing session if active
    this.stopListening();

    this.currentLanguage = languageCode;
    this.recognition = this.createRecognitionInstance(languageCode);

    if (!this.recognition) {
      this.handleError('NOT_SUPPORTED', 'Failed to initialize voice recognition engine.');
      return false;
    }

    try {
      this.recognition.start();
      return true;
    } catch (err: any) {
      console.warn('[VoiceRecognitionManager] Start listening error:', err);
      this.handleError('UNKNOWN', err?.message || 'Could not start microphone listening.');
      return false;
    }
  }

  public stopListening(): void {
    this.clearTimeout();
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // Safe ignore
      }
      this.recognition = null;
    }
    if (this.state === 'LISTENING' || this.state === 'PROCESSING') {
      this.setState('IDLE');
      this.onListeningStopped?.();
    }
  }

  public dispose(): void {
    this.stopListening();
    this.onPermissionGranted = undefined;
    this.onPermissionDenied = undefined;
    this.onListeningStarted = undefined;
    this.onListeningStopped = undefined;
    this.onSpeechRecognized = undefined;
    this.onError = undefined;
    this.onStateChanged = undefined;
  }
}

export const voiceRecognitionManager = new VoiceRecognitionManager();
