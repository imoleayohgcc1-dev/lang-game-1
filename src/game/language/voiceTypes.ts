import { LanguageCode } from './types';

export type VoiceState =
  | 'IDLE'
  | 'REQUESTING_PERMISSION'
  | 'LISTENING'
  | 'PROCESSING'
  | 'EVALUATED'
  | 'ERROR'
  | 'UNAVAILABLE';

export type VoiceErrorCode =
  | 'PERMISSION_DENIED'
  | 'NOT_SUPPORTED'
  | 'NO_SPEECH'
  | 'AUDIO_CAPTURE'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'UNKNOWN';

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface PronunciationEvaluationResult {
  correct: boolean;
  confidence: number;
  recognizedText: string;
  expectedText: string;
  feedback: string;
  attemptsUsed: number;
  maxAttempts: number;
}

export interface VoiceSettings {
  voiceRecognitionEnabled: boolean;
  autoListen: boolean;
  pronunciationAudioEnabled: boolean;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voiceRecognitionEnabled: true,
  autoListen: false,
  pronunciationAudioEnabled: true,
};

export const VOICE_CONFIG = {
  MAX_PRONUNCIATION_ATTEMPTS: 3,
  VOICE_TIMEOUT: 6500, // 6.5s timeout for speech recognition
  VOICE_RETRY_DELAY: 1500, // 1.5s delay before allowing next attempt or auto-closing
  MINIMUM_ACCEPTANCE_THRESHOLD: 0.65, // Acceptance similarity score (fuzzy/pinyin/normalization)
  CHALLENGE_COOLDOWN: 5.0, // seconds between challenges
  AUTO_LISTEN: false,
  PRONUNCIATION_AUDIO_ENABLED: true,
  KEYBOARD_SHORTCUT: 'KeyV',
  SAFETY_OBSTACLE_LOOKAHEAD_DISTANCE: 22.0, // Minimum clear runway ahead of player to start challenge
  CHALLENGE_SPEED_DAMPENING: 0.72, // Gentle runner speed reduction factor during active speaking challenge
};

/**
 * Maps game language codes to standard Web Speech API locale identifiers.
 */
export const LANGUAGE_SPEECH_LOCALES: Record<LanguageCode, string[]> = {
  'zh-CN': ['zh-CN', 'cmn-Hans-CN', 'zh'],
  'es-ES': ['es-ES', 'es-MX', 'es'],
  'fr-FR': ['fr-FR', 'fr-CA', 'fr'],
  'en-US': ['en-US', 'en'],
  'en-GB': ['en-GB', 'en'],
};
