import {
  LanguageCode,
  LanguageDifficulty,
  LanguageChallengeState,
  LearningItem,
  LearningProgress,
  AITeacherStatus,
  DEFAULT_LEARNING_PROGRESS,
} from './types';
import { LanguageLessonProvider, LocalLessonProvider } from './LanguageLessonProvider';
import { AI_LessonProvider } from './AI_LessonProvider';
import { LanguageAudioService, languageAudioService } from './LanguageAudioService';

const LEARNING_PROGRESS_STORAGE_KEY = 'language_runner_learning_progress';

export class LanguageChallengeManager {
  private lessonProvider: LanguageLessonProvider;
  private audioService: LanguageAudioService;

  public state: LanguageChallengeState = 'IDLE';
  public currentItem: LearningItem | null = null;
  public progress: LearningProgress;

  // Spawning & pacing along runner track
  private lastChallengeDistance: number = 0;
  private nextChallengeDistance: number = 65.0; // first challenge after 65m
  private challengeInterval: number = 85.0; // challenge every ~85m thereafter
  private stateTimer: number = 0;

  // Callbacks
  public onLanguageChallengeStarted?: (item: LearningItem) => void;
  public onLanguageWordDisplayed?: (word: string) => void;
  public onLanguageTranslationDisplayed?: (translation: string, pronunciation?: string) => void;
  public onLanguageChallengeCompleted?: (item: LearningItem, rewardCoins: number, rewardXP: number) => void;
  public onLanguageChallengeFailed?: (item: LearningItem) => void;
  public onChallengeStateChanged?: (state: LanguageChallengeState, item: LearningItem | null) => void;
  public onProgressUpdated?: (progress: LearningProgress) => void;
  public onAITeacherStatusChanged?: (status: AITeacherStatus, message?: string) => void;

  constructor(lessonProvider?: LanguageLessonProvider, audioService?: LanguageAudioService) {
    this.lessonProvider = lessonProvider || new AI_LessonProvider(new LocalLessonProvider());
    this.audioService = audioService || languageAudioService;
    this.progress = this.loadProgress();

    this.bindLessonProviderEvents();
  }

  private bindLessonProviderEvents(): void {
    if (this.lessonProvider instanceof AI_LessonProvider) {
      this.lessonProvider.onStatusChange = (status, msg) => {
        this.onAITeacherStatusChanged?.(status, msg);
      };
      // Pre-warm AI curriculum cache
      if (this.progress.useAITeacher) {
        this.lessonProvider.prefetchLessons(this.progress).catch(() => {});
      }
    }
  }

  private loadProgress(): LearningProgress {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(LEARNING_PROGRESS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            ...DEFAULT_LEARNING_PROGRESS,
            ...parsed,
          };
        }
      }
    } catch (e) {
      console.warn('[LanguageChallengeManager] Failed to read progress from storage:', e);
    }
    return { ...DEFAULT_LEARNING_PROGRESS };
  }

  public saveProgress(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LEARNING_PROGRESS_STORAGE_KEY, JSON.stringify(this.progress));
      }
    } catch (e) {
      console.warn('[LanguageChallengeManager] Failed to save progress to storage:', e);
    }
    this.onProgressUpdated?.(this.progress);
  }

  public setTargetLanguage(code: LanguageCode): void {
    if (this.progress.targetLanguageCode !== code) {
      this.progress.targetLanguageCode = code;
      if (code === 'en-GB') {
        this.progress.englishVariant = 'UK';
      } else if (code === 'en-US') {
        this.progress.englishVariant = 'US';
      }
      this.saveProgress();

      if (this.lessonProvider instanceof AI_LessonProvider && this.progress.useAITeacher) {
        this.lessonProvider.prefetchLessons(this.progress).catch(() => {});
      }

      // If active challenge is running, restart it with new language
      if (this.state !== 'IDLE') {
        this.startChallenge();
      }
    }
  }

  public setEnglishVariant(variant: 'US' | 'UK'): void {
    this.progress.englishVariant = variant;
    this.progress.targetLanguageCode = variant === 'UK' ? 'en-GB' : 'en-US';
    this.saveProgress();
    if (this.lessonProvider instanceof AI_LessonProvider && this.progress.useAITeacher) {
      this.lessonProvider.prefetchLessons(this.progress).catch(() => {});
    }
  }

  public setDifficulty(difficulty: LanguageDifficulty): void {
    if (this.progress.currentDifficulty !== difficulty) {
      this.progress.currentDifficulty = difficulty;
      this.saveProgress();
      if (this.lessonProvider instanceof AI_LessonProvider && this.progress.useAITeacher) {
        this.lessonProvider.prefetchLessons(this.progress).catch(() => {});
      }
    }
  }

  public setCategory(category: string): void {
    if (this.progress.selectedCategory !== category) {
      this.progress.selectedCategory = category;
      this.saveProgress();
      if (this.lessonProvider instanceof AI_LessonProvider && this.progress.useAITeacher) {
        this.lessonProvider.prefetchLessons(this.progress).catch(() => {});
      }
    }
  }

  public setUseAITeacher(enabled: boolean): void {
    if (this.progress.useAITeacher !== enabled) {
      this.progress.useAITeacher = enabled;
      this.saveProgress();
      if (enabled && this.lessonProvider instanceof AI_LessonProvider) {
        this.lessonProvider.prefetchLessons(this.progress).catch(() => {});
      }
    }
  }

  public getAITeacherStatus(): AITeacherStatus {
    if (!this.progress.useAITeacher) return 'DISABLED';
    if (this.lessonProvider instanceof AI_LessonProvider) {
      return this.lessonProvider.getStatus();
    }
    return 'DISABLED';
  }

  public getLessonProvider(): LanguageLessonProvider {
    return this.lessonProvider;
  }

  public setLessonProvider(provider: LanguageLessonProvider): void {
    this.lessonProvider = provider;
    this.bindLessonProviderEvents();
  }

  /**
   * Start a new learning challenge
   */
  public startChallenge(item?: LearningItem): void {
    const challengeItem = item || this.lessonProvider.getNextChallengeItem(this.progress);
    this.currentItem = challengeItem;
    this.state = 'SHOW_WORD';
    this.stateTimer = 0;

    // Track encounter
    if (!this.progress.wordsEncountered.includes(challengeItem.id)) {
      this.progress.wordsEncountered.push(challengeItem.id);
      this.saveProgress();
    }

    this.onLanguageChallengeStarted?.(challengeItem);
    this.onLanguageWordDisplayed?.(challengeItem.sourceText);
    this.notifyStateChange();
  }

  /**
   * Play target pronunciation audio
   */
  public triggerAudioPronunciation(): void {
    if (this.currentItem) {
      this.audioService.speak(this.currentItem.translatedText, this.currentItem.languageCode);
    }
  }

  /**
   * Complete the challenge, award rewards (+5 coins, +10 XP)
   */
  public completeChallenge(): void {
    if (!this.currentItem || this.state === 'IDLE' || this.state === 'COMPLETED') return;

    const rewardCoins = 5;
    const rewardXP = 10;

    if (!this.progress.wordsCompleted.includes(this.currentItem.id)) {
      this.progress.wordsCompleted.push(this.currentItem.id);
    }
    this.progress.totalChallengesCompleted += 1;
    this.progress.totalXPEarned += rewardXP;
    this.saveProgress();

    this.state = 'COMPLETED';
    this.stateTimer = 0;

    this.onLanguageChallengeCompleted?.(this.currentItem, rewardCoins, rewardXP);
    this.notifyStateChange();
  }

  public skipChallenge(): void {
    if (!this.currentItem || this.state === 'IDLE') return;

    this.state = 'SKIPPED';
    this.stateTimer = 0;
    this.notifyStateChange();
  }

  private notifyStateChange(): void {
    this.onChallengeStateChanged?.(this.state, this.currentItem);
  }

  /**
   * Paced update loop connected to runner gameplay.
   * Seamlessly advances through states in SAFE_HUD_AREA without pausing runner.
   */
  public update(delta: number, currentDistance: number, isPlaying: boolean): void {
    if (!isPlaying) return;

    // 1. Spawning check: Trigger challenge periodically along track
    if (this.state === 'IDLE') {
      if (currentDistance >= this.nextChallengeDistance) {
        this.startChallenge();
        this.lastChallengeDistance = currentDistance;
        this.nextChallengeDistance = currentDistance + this.challengeInterval;
      }
      return;
    }

    this.stateTimer += delta;

    // 2. State Machine Transitions
    switch (this.state) {
      case 'SHOW_WORD':
        // Display source word for 2.2 seconds, then reveal translation
        if (this.stateTimer >= 2.2) {
          this.state = 'SHOW_TRANSLATION';
          this.stateTimer = 0;
          if (this.currentItem) {
            this.onLanguageTranslationDisplayed?.(
              this.currentItem.translatedText,
              this.currentItem.pronunciationText
            );
            // Auto play audio pronunciation
            this.triggerAudioPronunciation();
          }
          this.notifyStateChange();
        }
        break;

      case 'SHOW_TRANSLATION':
        // Display translation & pronunciation for 3.5 seconds, then enter WAITING_FOR_RESPONSE
        if (this.stateTimer >= 3.5) {
          this.state = 'WAITING_FOR_RESPONSE';
          this.stateTimer = 0;
          this.notifyStateChange();
        }
        break;

      case 'WAITING_FOR_RESPONSE':
        // Give player 4.5 seconds to tap or review, then auto-complete gracefully so runner remains fluid
        if (this.stateTimer >= 4.5) {
          this.completeChallenge();
        }
        break;

      case 'COMPLETED':
      case 'SKIPPED':
      case 'FAILED':
        // Show success / celebration feedback for 1.8 seconds, then return to IDLE
        if (this.stateTimer >= 1.8) {
          this.state = 'IDLE';
          this.currentItem = null;
          this.stateTimer = 0;
          this.notifyStateChange();
        }
        break;
    }
  }

  public reset(): void {
    this.state = 'IDLE';
    this.currentItem = null;
    this.stateTimer = 0;
    this.lastChallengeDistance = 0;
    this.nextChallengeDistance = 65.0;
    this.notifyStateChange();
  }

  public dispose(): void {
    this.reset();
    this.audioService.stop();
    this.onLanguageChallengeStarted = undefined;
    this.onLanguageWordDisplayed = undefined;
    this.onLanguageTranslationDisplayed = undefined;
    this.onLanguageChallengeCompleted = undefined;
    this.onLanguageChallengeFailed = undefined;
    this.onChallengeStateChanged = undefined;
    this.onProgressUpdated = undefined;
    this.onAITeacherStatusChanged = undefined;
  }
}
