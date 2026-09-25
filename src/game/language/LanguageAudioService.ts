import { LanguageCode } from './types';

/**
 * Client-side native Web Speech API audio pronunciation service.
 * Plays authentic native speaker audio directly in the player's browser.
 */
export class LanguageAudioService {
  private isAvailable: boolean = false;
  private voicesLoaded: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.isAvailable = true;
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.voicesLoaded = true;
        };
      }
    }
  }

  public isSupported(): boolean {
    return this.isAvailable;
  }

  /**
   * Speak the target language word or phrase using native browser synthesis.
   * @param text The foreign word/phrase to pronounce
   * @param langCode The BCP 47 language code (zh-CN, es-ES, fr-FR, en-US, en-GB)
   * @param rate Optional speed modifier (default 0.9 for clear beginner diction)
   */
  public speak(text: string, langCode: LanguageCode, rate: number = 0.88): boolean {
    if (!this.isAvailable || typeof window === 'undefined') return false;

    try {
      window.speechSynthesis.cancel(); // cancel any ongoing speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = rate;
      utterance.pitch = 1.0;

      // Match language-specific voice if available
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const matchingVoice = voices.find(
          (v) => v.lang === langCode || v.lang.startsWith(langCode.split('-')[0])
        );
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
      }

      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      console.warn('[LanguageAudioService] Speech synthesis playback error:', err);
      return false;
    }
  }

  public stop(): void {
    if (this.isAvailable && typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    }
  }
}

export const languageAudioService = new LanguageAudioService();
