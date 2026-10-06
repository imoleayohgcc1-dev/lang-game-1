import {
  LanguageCode,
  LanguageDifficulty,
  LanguageChallengeState,
  LearningItem,
  LearningProgress,
  AITeacherStatus,
  DEFAULT_LEARNING_PROGRESS,
  LessonDefinition,
  LessonSessionStats,
  WordLearningStats,
} from './types';
import {
  VoiceState,
  VoiceErrorCode,
  VoiceRecognitionResult,
  PronunciationEvaluationResult,
  VoiceSettings,
  DEFAULT_VOICE_SETTINGS,
  VOICE_CONFIG,
} from './voiceTypes';
import { LanguageLessonProvider, LocalLessonProvider } from './LanguageLessonProvider';
import { AI_LessonProvider } from './AI_LessonProvider';
import { LanguageAudioService, languageAudioService } from './LanguageAudioService';
import { VoiceRecognitionManager, voiceRecognitionManager } from './VoiceRecognitionManager';
import { PronunciationEvaluator, pronunciationEvaluator } from './PronunciationEvaluator';
import { LessonCatalog } from './LessonCatalog';
import { AdaptiveReviewManager } from './AdaptiveReviewManager';
import { XPManager } from './XPManager';
import { CHALLENGE_SCHEDULER_CONFIG, DEFAULT_LESSON_REWARDS } from './lessonConfig';

const LEARNING_PROGRESS_STORAGE_KEY = 'language_runner_learning_progress';
const VOICE_SETTINGS_STORAGE_KEY = 'language_runner_voice_settings';

export class LanguageChallengeManager {
  private lessonProvider: LanguageLessonProvider;
  private audioService: LanguageAudioService;
  private voiceManager: VoiceRecognitionManager;
  private evaluator: PronunciationEvaluator;
  public adaptiveReview: AdaptiveReviewManager;

  public state: LanguageChallengeState = 'IDLE';
  public currentItem: LearningItem | null = null;
  public currentLesson: LessonDefinition;
  public progress: LearningProgress;
  public voiceSettings: VoiceSettings;

  // Session Lesson Metrics (Phase 8 Gameplay Learning Loop)
  public challengesCompletedInLesson: number = 0;
  public correctAnswersInLesson: number = 0;
  public attemptsInLesson: number = 0;
  public xpEarnedInLesson: number = 0;
  public coinsEarnedInLesson: number = 0;
  public wordsLearnedInLesson: Set<string> = new Set();
  public isLessonFinished: boolean = false;

  // Voice challenge runtime state
  public pronunciationAttempts: number = 0;
  public lastEvaluationResult: PronunciationEvaluationResult | null = null;
  public voiceStatusMessage: string = '';
  public isMicrophoneSupported: boolean = false;
  public useExternalScheduler: boolean = false;

  // Spawning & pacing along runner track
  private lastChallengeDistance: number = 0;
  private nextChallengeDistance: number = CHALLENGE_SCHEDULER_CONFIG.MIN_CHALLENGE_DISTANCE;
  private challengeInterval: number = 80.0;
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
  public onLessonCompleted?: (stats: LessonSessionStats) => void;
  public onStreakChanged?: (currentStreak: number, highestStreak: number) => void;

  // Phase 7 Voice Events
  public onVoicePermissionGranted?: () => void;
  public onVoicePermissionDenied?: () => void;
  public onVoiceListeningStarted?: () => void;
  public onVoiceListeningStopped?: () => void;
  public onSpeechRecognized?: (result: VoiceRecognitionResult) => void;
  public onPronunciationEvaluated?: (result: PronunciationEvaluationResult) => void;
  public onVoiceError?: (error: VoiceErrorCode, message: string) => void;

  constructor(
    lessonProvider?: LanguageLessonProvider,
    audioService?: LanguageAudioService,
    voiceManager?: VoiceRecognitionManager,
    evaluator?: PronunciationEvaluator
  ) {
    this.lessonProvider = lessonProvider || new AI_LessonProvider(new LocalLessonProvider());
    this.audioService = audioService || languageAudioService;
    this.voiceManager = voiceManager || voiceRecognitionManager;
    this.evaluator = evaluator || pronunciationEvaluator;
    this.adaptiveReview = new AdaptiveReviewManager();

    this.progress = this.loadProgress();
    this.voiceSettings = this.loadVoiceSettings();
    this.isMicrophoneSupported = this.voiceManager.getIsSupported();

    // Initialize structured lesson from catalog
    this.currentLesson = LessonCatalog.getLesson(
      this.progress.targetLanguageCode,
      this.progress.currentLesson || 1
    );

    this.bindLessonProviderEvents();
    this.bindVoiceEvents();
  }

  private bindLessonProviderEvents(): void {
    if (this.lessonProvider instanceof AI_LessonProvider) {
      this.lessonProvider.onStatusChange = (status, msg) => {
        this.onAITeacherStatusChanged?.(status, msg);
      };
      if (this.progress.useAITeacher) {
        this.lessonProvider.prefetchLessons(this.progress).catch(() => {});
      }
    }
  }

  private bindVoiceEvents(): void {
    this.voiceManager.onPermissionGranted = () => {
      this.voiceStatusMessage = 'Microphone ready';
      this.onVoicePermissionGranted?.();
      this.notifyStateChange();
    };

    this.voiceManager.onPermissionDenied = () => {
      this.voiceStatusMessage = 'Microphone permission denied. Continuing with tap.';
      this.onVoicePermissionDenied?.();
      this.notifyStateChange();
    };

    this.voiceManager.onListeningStarted = () => {
      this.state = 'LISTENING';
      this.stateTimer = 0;
      this.voiceStatusMessage = 'Listening... Speak now';
      this.onVoiceListeningStarted?.();
      this.notifyStateChange();
    };

    this.voiceManager.onListeningStopped = () => {
      this.onVoiceListeningStopped?.();
    };

    this.voiceManager.onSpeechRecognized = (result: VoiceRecognitionResult) => {
      this.onSpeechRecognized?.(result);
      this.handleSpeechResult(result.transcript);
    };

    this.voiceManager.onError = (code: VoiceErrorCode, message: string) => {
      this.voiceStatusMessage = message;
      this.onVoiceError?.(code, message);

      if (this.state === 'LISTENING') {
        this.state = 'WAITING_FOR_RESPONSE';
        this.stateTimer = 0;
        this.notifyStateChange();
      }
    };
  }

  private loadProgress(): LearningProgress {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(LEARNING_PROGRESS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const merged: LearningProgress = {
            ...DEFAULT_LEARNING_PROGRESS,
            ...parsed,
            wordStats: parsed.wordStats || {},
            completedLessons: parsed.completedLessons || [],
            unlockedLessons: parsed.unlockedLessons || ['zh-CN_lesson_1'],
            currentStreak: parsed.currentStreak || 0,
            highestStreak: parsed.highestStreak || 0,
            playerLevel: XPManager.calculateLevel(parsed.totalXPEarned || 0),
          };
          return merged;
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

  private loadVoiceSettings(): VoiceSettings {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(VOICE_SETTINGS_STORAGE_KEY);
        if (stored) {
          return {
            ...DEFAULT_VOICE_SETTINGS,
            ...JSON.parse(stored),
          };
        }
      }
    } catch (e) {
      console.warn('[LanguageChallengeManager] Failed to read voice settings:', e);
    }
    return { ...DEFAULT_VOICE_SETTINGS };
  }

  public saveVoiceSettings(newSettings: Partial<VoiceSettings>): void {
    this.voiceSettings = {
      ...this.voiceSettings,
      ...newSettings,
    };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(VOICE_SETTINGS_STORAGE_KEY, JSON.stringify(this.voiceSettings));
      }
    } catch (e) {
      console.warn('[LanguageChallengeManager] Failed to save voice settings:', e);
    }
    this.notifyStateChange();
  }

  /**
   * Sets target language. Strictly enforces no language mixing during a lesson.
   */
  public setTargetLanguage(code: LanguageCode): void {
    if (this.progress.targetLanguageCode !== code) {
      this.progress.targetLanguageCode = code;
      if (code === 'en-GB') {
        this.progress.englishVariant = 'UK';
      } else if (code === 'en-US') {
        this.progress.englishVariant = 'US';
      }

      // Reload lesson catalog for target language
      this.currentLesson = LessonCatalog.getLesson(code, this.progress.currentLesson || 1);
      this.progress.currentLessonId = this.currentLesson.lessonId;
      this.resetLessonSessionStats();
      this.saveProgress();

      if (this.lessonProvider instanceof AI_LessonProvider && this.progress.useAITeacher) {
        this.lessonProvider.prefetchLessons(this.progress).catch(() => {});
      }

      if (this.state !== 'IDLE') {
        this.startChallenge();
      }
    }
  }

  public setEnglishVariant(variant: 'US' | 'UK'): void {
    this.progress.englishVariant = variant;
    this.setTargetLanguage(variant === 'UK' ? 'en-GB' : 'en-US');
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

  public getVoiceState(): VoiceState {
    return this.voiceManager.getState();
  }

  /**
   * Resets session stats for the current lesson.
   */
  public resetLessonSessionStats(): void {
    this.challengesCompletedInLesson = 0;
    this.correctAnswersInLesson = 0;
    this.attemptsInLesson = 0;
    this.xpEarnedInLesson = 0;
    this.coinsEarnedInLesson = 0;
    this.wordsLearnedInLesson.clear();
    this.isLessonFinished = false;
    this.adaptiveReview.clearRecentWords();
  }

  /**
   * Loads a specific lesson by number or ID and resets session metrics.
   */
  public loadLesson(lessonNumberOrId: number | string): LessonDefinition {
    let lesson: LessonDefinition | undefined;
    if (typeof lessonNumberOrId === 'string') {
      lesson = LessonCatalog.getLessonById(lessonNumberOrId);
    }
    if (!lesson) {
      const num = typeof lessonNumberOrId === 'number' ? lessonNumberOrId : 1;
      lesson = LessonCatalog.getLesson(this.progress.targetLanguageCode, num);
    }

    this.currentLesson = lesson;
    this.progress.currentLesson = lesson.lessonNumber;
    this.progress.currentLessonId = lesson.lessonId;
    this.resetLessonSessionStats();

    if (!this.progress.unlockedLessons) {
      this.progress.unlockedLessons = [];
    }
    if (!this.progress.unlockedLessons.includes(lesson.lessonId)) {
      this.progress.unlockedLessons.push(lesson.lessonId);
    }

    this.saveProgress();
    return this.currentLesson;
  }

  /**
   * Advances progression to the next lesson in sequence.
   */
  public startNextLesson(): LessonDefinition {
    const nextNumber = this.currentLesson.lessonNumber + 1;
    return this.loadLesson(nextNumber);
  }

  /**
   * Replays the current lesson with fresh session targets.
   */
  public replayCurrentLesson(): LessonDefinition {
    return this.loadLesson(this.currentLesson.lessonNumber);
  }

  /**
   * Starts a new learning challenge using adaptive spaced review.
   */
  public startChallenge(item?: LearningItem): void {
    let challengeItem: LearningItem;

    if (item) {
      challengeItem = item;
    } else if (
      this.lessonProvider &&
      !(this.lessonProvider instanceof LocalLessonProvider) &&
      !(this.lessonProvider instanceof AI_LessonProvider)
    ) {
      challengeItem = this.lessonProvider.getNextChallengeItem(this.progress);
    } else {
      // Pick next item adaptively from current lesson
      challengeItem = this.adaptiveReview.selectNextLessonItem(
        this.currentLesson,
        this.progress
      );
    }

    this.currentItem = challengeItem;
    this.state = 'SHOW_WORD';
    this.stateTimer = 0;
    this.pronunciationAttempts = 0;
    this.lastEvaluationResult = null;
    this.voiceStatusMessage = '';

    if (!this.progress.wordsEncountered.includes(challengeItem.id)) {
      this.progress.wordsEncountered.push(challengeItem.id);
      this.saveProgress();
    }

    this.onLanguageChallengeStarted?.(challengeItem);
    this.onLanguageWordDisplayed?.(challengeItem.sourceText);
    this.notifyStateChange();
  }

  /**
   * Play target pronunciation audio (TTS)
   */
  public triggerAudioPronunciation(): void {
    if (this.currentItem && this.voiceSettings.pronunciationAudioEnabled) {
      this.audioService.speak(this.currentItem.translatedText, this.currentItem.languageCode);
    }
  }

  /**
   * Starts listening to the player's voice.
   */
  public startVoiceRecognition(): boolean {
    if (!this.currentItem) return false;
    if (!this.voiceSettings.voiceRecognitionEnabled) {
      this.voiceStatusMessage = 'Voice recognition is disabled in Settings.';
      this.notifyStateChange();
      return false;
    }
    if (!this.isMicrophoneSupported) {
      this.voiceStatusMessage = 'Voice recognition is not supported in this browser.';
      this.notifyStateChange();
      return false;
    }

    return this.voiceManager.startListening(this.currentItem.languageCode);
  }

  public stopVoiceRecognition(): void {
    this.voiceManager.stopListening();
  }

  /**
   * Evaluates recognized speech against current lesson item.
   */
  public handleSpeechResult(transcript: string): void {
    if (!this.currentItem) return;

    this.pronunciationAttempts++;
    this.progress.voiceAttempts++;

    const evaluation = this.evaluator.evaluate(
      transcript,
      this.currentItem,
      this.pronunciationAttempts
    );

    this.lastEvaluationResult = evaluation;
    this.onPronunciationEvaluated?.(evaluation);

    // Record attempt in Adaptive Review mistake tracker
    if (!this.progress.wordStats) {
      this.progress.wordStats = {};
    }
    this.adaptiveReview.recordWordAttempt(
      this.progress.wordStats,
      this.currentItem,
      evaluation.correct,
      1,
      this.currentLesson.lessonId,
      this.currentLesson.language
    );

    if (evaluation.correct) {
      this.progress.voiceSuccesses++;
      this.progress.currentStreak++;
      if (this.progress.currentStreak > this.progress.highestStreak) {
        this.progress.highestStreak = this.progress.currentStreak;
      }
      this.onStreakChanged?.(this.progress.currentStreak, this.progress.highestStreak);

      this.correctAnswersInLesson++;
      this.wordsLearnedInLesson.add(this.currentItem.id);
      this.voiceStatusMessage = '✓ Correct pronunciation!';
      this.saveProgress();
      this.completeChallenge(true);
    } else {
      this.progress.voiceFailedAttempts++;
      this.saveProgress();

      if (this.pronunciationAttempts >= VOICE_CONFIG.MAX_PRONUNCIATION_ATTEMPTS) {
        // Exceeded allowed attempts: break streak, complete gracefully so runner is never blocked
        this.progress.currentStreak = 0;
        this.onStreakChanged?.(0, this.progress.highestStreak);
        this.voiceStatusMessage = `Good effort! Expected: "${evaluation.expectedText}"`;
        this.saveProgress();
        this.completeChallenge(false);
      } else {
        // Show gentle 'Try Again' in SAFE_HUD_AREA and return to waiting
        this.state = 'TRY_AGAIN';
        this.stateTimer = 0;
        this.voiceStatusMessage = `Try again (${this.pronunciationAttempts}/${VOICE_CONFIG.MAX_PRONUNCIATION_ATTEMPTS})`;
        this.notifyStateChange();
      }
    }
  }

  /**
   * Completes the challenge, calculates rewards, updates XP foundation and checks lesson goal.
   */
  public completeChallenge(isSuccess: boolean = true): void {
    if (!this.currentItem || this.state === 'IDLE') return;

    const rewardConfig = this.currentLesson.rewardConfiguration;

    let rewardCoins = rewardConfig.perChallengeCoins;
    let rewardXP = rewardConfig.perChallengeXP;

    // Phase 8: Streak Bonus XP
    if (this.progress.currentStreak > 1) {
      rewardXP += this.progress.currentStreak * rewardConfig.streakBonusXP;
    }

    // Phase 7/8: Voice evaluation bonus
    if (this.lastEvaluationResult?.correct) {
      rewardCoins += rewardConfig.voiceBonusCoins;
      rewardXP += rewardConfig.voiceBonusXP;
    }

    if (!this.progress.wordsCompleted.includes(this.currentItem.id)) {
      this.progress.wordsCompleted.push(this.currentItem.id);
    }

    this.progress.totalChallengesCompleted += 1;
    this.progress.totalXPEarned += rewardXP;
    this.progress.playerLevel = XPManager.calculateLevel(this.progress.totalXPEarned);

    // Track session stats
    this.challengesCompletedInLesson += 1;
    this.attemptsInLesson += Math.max(1, this.pronunciationAttempts);
    if (isSuccess) {
      if (!this.lastEvaluationResult || !this.lastEvaluationResult.correct) {
        this.correctAnswersInLesson += 1;
      }
      this.wordsLearnedInLesson.add(this.currentItem.id);
    }
    this.xpEarnedInLesson += rewardXP;
    this.coinsEarnedInLesson += rewardCoins;

    this.state = 'COMPLETED';
    this.stateTimer = 0;
    this.voiceManager.stopListening();

    this.onLanguageChallengeCompleted?.(this.currentItem, rewardCoins, rewardXP);
    this.saveProgress();
    this.notifyStateChange();

    // Check if lesson completion requirement is satisfied
    const req = this.currentLesson.completionRequirements;
    if (this.challengesCompletedInLesson >= req.targetCount) {
      this.finishLessonSession();
    }
  }

  /**
   * Compiles lesson session stats, unlocks progression, awards completion rewards and invokes callback.
   */
  private finishLessonSession(): void {
    this.isLessonFinished = true;
    const rewardConfig = this.currentLesson.rewardConfiguration;

    // Award lesson completion bonus
    this.progress.totalXPEarned += rewardConfig.completionXP;
    this.progress.playerLevel = XPManager.calculateLevel(this.progress.totalXPEarned);
    this.xpEarnedInLesson += rewardConfig.completionXP;
    this.coinsEarnedInLesson += rewardConfig.completionCoins;

    // Record completed lesson
    if (!this.progress.completedLessons) {
      this.progress.completedLessons = [];
    }
    if (!this.progress.completedLessons.includes(this.currentLesson.lessonId)) {
      this.progress.completedLessons.push(this.currentLesson.lessonId);
    }

    // Unlock next lesson
    const nextLessonId = `${this.currentLesson.language}_lesson_${this.currentLesson.lessonNumber + 1}`;
    if (!this.progress.unlockedLessons) {
      this.progress.unlockedLessons = [];
    }
    if (!this.progress.unlockedLessons.includes(nextLessonId)) {
      this.progress.unlockedLessons.push(nextLessonId);
    }

    const accuracy =
      this.attemptsInLesson > 0
        ? Math.min(100, Math.round((this.correctAnswersInLesson / this.attemptsInLesson) * 100))
        : 100;

    const stats: LessonSessionStats = {
      lessonId: this.currentLesson.lessonId,
      lessonNumber: this.currentLesson.lessonNumber,
      lessonTitle: this.currentLesson.lessonTitle,
      category: this.currentLesson.category,
      languageCode: this.currentLesson.language,
      challengesCompleted: this.challengesCompletedInLesson,
      correctAnswers: this.correctAnswersInLesson,
      attempts: this.attemptsInLesson,
      xpEarned: this.xpEarnedInLesson,
      coinsEarned: this.coinsEarnedInLesson,
      wordsLearned: this.wordsLearnedInLesson.size,
      accuracy,
      highestStreak: this.progress.highestStreak,
      isComplete: true,
    };

    this.progress.activeLessonStats = stats;
    this.saveProgress();

    // Trigger completion callback
    this.onLessonCompleted?.(stats);
  }

  public skipChallenge(): void {
    if (!this.currentItem || this.state === 'IDLE') return;

    this.progress.currentStreak = 0;
    this.attemptsInLesson++;
    this.state = 'SKIPPED';
    this.stateTimer = 0;
    this.voiceManager.stopListening();
    this.notifyStateChange();
  }

  private notifyStateChange(): void {
    this.onChallengeStateChanged?.(this.state, this.currentItem);
  }

  /**
   * Paced update loop connected to runner gameplay.
   * Advances safely through states within the SAFE_HUD_AREA.
   */
  public update(delta: number, currentDistance: number, isPlaying: boolean, obstacleAhead: boolean = false): void {
    if (!isPlaying) return;

    // Spawning check: Trigger challenge periodically along track if not using external scheduler
    if (this.state === 'IDLE') {
      if (!this.useExternalScheduler && currentDistance >= this.nextChallengeDistance) {
        if (obstacleAhead) {
          this.nextChallengeDistance = currentDistance + 12.0;
          return;
        }
        this.startChallenge();
        this.lastChallengeDistance = currentDistance;
        this.nextChallengeDistance = currentDistance + this.challengeInterval;
      }
      return;
    }

    this.stateTimer += delta;

    // State Machine Transitions
    switch (this.state) {
      case 'SHOW_WORD':
        if (this.stateTimer >= 2.2) {
          this.state = 'SHOW_TRANSLATION';
          this.stateTimer = 0;
          if (this.currentItem) {
            this.onLanguageTranslationDisplayed?.(
              this.currentItem.translatedText,
              this.currentItem.pronunciationText
            );
            this.triggerAudioPronunciation();
          }
          this.notifyStateChange();
        }
        break;

      case 'SHOW_TRANSLATION':
        if (this.stateTimer >= 3.5) {
          this.state = 'WAITING_FOR_RESPONSE';
          this.stateTimer = 0;

          if (
            this.voiceSettings.autoListen &&
            this.voiceSettings.voiceRecognitionEnabled &&
            this.isMicrophoneSupported
          ) {
            this.startVoiceRecognition();
          }

          this.notifyStateChange();
        }
        break;

      case 'WAITING_FOR_RESPONSE':
        // Give player 6.0 seconds to speak or tap; auto-complete so runner remains fluid
        if (this.stateTimer >= 6.0) {
          this.completeChallenge(true);
        }
        break;

      case 'LISTENING':
        if (this.stateTimer >= 7.5) {
          this.stopVoiceRecognition();
          this.state = 'WAITING_FOR_RESPONSE';
          this.stateTimer = 0;
          this.voiceStatusMessage = 'Microphone timed out. Click speak to retry.';
          this.notifyStateChange();
        }
        break;

      case 'TRY_AGAIN':
        if (this.stateTimer >= 1.8) {
          this.state = 'WAITING_FOR_RESPONSE';
          this.stateTimer = 0;
          this.notifyStateChange();
        }
        break;

      case 'COMPLETED':
      case 'SKIPPED':
      case 'FAILED':
        if (this.stateTimer >= 1.8) {
          this.state = 'IDLE';
          this.currentItem = null;
          this.lastEvaluationResult = null;
          this.voiceStatusMessage = '';
          this.stateTimer = 0;
          this.notifyStateChange();
        }
        break;
    }
  }

  public reset(): void {
    this.stopVoiceRecognition();
    this.state = 'IDLE';
    this.currentItem = null;
    this.lastEvaluationResult = null;
    this.voiceStatusMessage = '';
    this.stateTimer = 0;
    this.lastChallengeDistance = 0;
    this.nextChallengeDistance = CHALLENGE_SCHEDULER_CONFIG.MIN_CHALLENGE_DISTANCE;
    this.notifyStateChange();
  }

  public dispose(): void {
    this.reset();
    this.audioService.stop();
    this.voiceManager.dispose();
    this.onLanguageChallengeStarted = undefined;
    this.onLanguageWordDisplayed = undefined;
    this.onLanguageTranslationDisplayed = undefined;
    this.onLanguageChallengeCompleted = undefined;
    this.onLanguageChallengeFailed = undefined;
    this.onChallengeStateChanged = undefined;
    this.onProgressUpdated = undefined;
    this.onAITeacherStatusChanged = undefined;
    this.onLessonCompleted = undefined;
    this.onStreakChanged = undefined;
    this.onVoicePermissionGranted = undefined;
    this.onVoicePermissionDenied = undefined;
    this.onVoiceListeningStarted = undefined;
    this.onVoiceListeningStopped = undefined;
    this.onSpeechRecognized = undefined;
    this.onPronunciationEvaluated = undefined;
    this.onVoiceError = undefined;
  }
}
