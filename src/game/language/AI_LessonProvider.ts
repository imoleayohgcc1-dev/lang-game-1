import {
  LanguageCode,
  LanguageDifficulty,
  LearningItem,
  LearningProgress,
  RawAILessonItem,
  AITeacherStatus,
  SUPPORTED_LANGUAGES,
} from './types';
import { LanguageLessonProvider, LocalLessonProvider } from './LanguageLessonProvider';

export const AI_REQUEST_TIMEOUT = 5000; // 5.0s timeout per requirement
export const AI_MAX_RETRIES = 2;
export const AI_CACHE_SIZE = 30;
export const BATCH_FETCH_SIZE = 4;

/**
 * Validates raw AI output against required schema.
 * Rejects any malformed or oversized entries to protect HUD and gameplay.
 */
export function validateAILesson(item: unknown): RawAILessonItem | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const candidate = item as Record<string, unknown>;

  // Check required non-empty string fields
  if (
    typeof candidate.sourceText !== 'string' ||
    !candidate.sourceText.trim() ||
    typeof candidate.translatedText !== 'string' ||
    !candidate.translatedText.trim() ||
    typeof candidate.targetLanguage !== 'string' ||
    !candidate.targetLanguage.trim()
  ) {
    return null;
  }

  // Sanity limits to prevent HUD overflow in SAFE_HUD_AREA
  if (candidate.sourceText.length > 80 || candidate.translatedText.length > 80) {
    return null;
  }

  return {
    sourceLanguage: typeof candidate.sourceLanguage === 'string' ? candidate.sourceLanguage : 'English',
    targetLanguage: candidate.targetLanguage,
    sourceText: candidate.sourceText.trim(),
    translatedText: candidate.translatedText.trim(),
    pronunciationGuide: typeof candidate.pronunciationGuide === 'string' ? candidate.pronunciationGuide.trim() : '',
    transliteration: typeof candidate.transliteration === 'string' ? candidate.transliteration.trim() : '',
    exampleSentence: typeof candidate.exampleSentence === 'string' ? candidate.exampleSentence.trim() : undefined,
    difficulty: typeof candidate.difficulty === 'string' ? candidate.difficulty : 'BEGINNER',
    category: typeof candidate.category === 'string' ? candidate.category : 'GENERAL',
  };
}

/**
 * AI Language Teacher Lesson Provider.
 * Connects to secure server-side Gemini API proxy, maintains an in-memory cache/queue,
 * pre-fetches lessons seamlessly in the background, and deterministically falls back
 * to LocalLessonProvider on network delay, offline status, or malformed data.
 *
 * Guaranteed: Runner never blocks, freezes, or waits for network!
 */
export class AI_LessonProvider implements LanguageLessonProvider {
  private fallbackProvider: LanguageLessonProvider;
  private cache: Map<string, LearningItem[]> = new Map();
  private isFetching: boolean = false;
  private retryCount: number = 0;
  private status: AITeacherStatus = 'IDLE';

  // Listeners
  public onStatusChange?: (status: AITeacherStatus, message?: string) => void;

  constructor(fallbackProvider?: LanguageLessonProvider) {
    this.fallbackProvider = fallbackProvider || new LocalLessonProvider();
  }

  public getStatus(): AITeacherStatus {
    return this.status;
  }

  private setStatus(status: AITeacherStatus, message?: string): void {
    if (this.status !== status) {
      this.status = status;
      this.onStatusChange?.(status, message);
    }
  }

  public getFallbackProvider(): LanguageLessonProvider {
    return this.fallbackProvider;
  }

  public setFallbackProvider(provider: LanguageLessonProvider): void {
    this.fallbackProvider = provider;
  }

  /**
   * Generates cache partition key based on language, difficulty, and category
   */
  private getCacheKey(
    languageCode: LanguageCode,
    difficulty: LanguageDifficulty,
    category: string
  ): string {
    return `${languageCode}_${difficulty}_${category}`;
  }

  /**
   * Synchronously provides the next challenge item for runner gameplay.
   * If cache is populated, delivers next AI item instantly.
   * If cache is empty or AI is unavailable, immediately falls back to LocalLessonProvider
   * while queuing background prefetch.
   */
  public getNextChallengeItem(progress: LearningProgress): LearningItem {
    // If AI Teacher is explicitly disabled in progress, use local provider directly
    if (!progress.useAITeacher) {
      this.setStatus('DISABLED');
      return this.fallbackProvider.getNextChallengeItem(progress);
    }

    const key = this.getCacheKey(
      progress.targetLanguageCode,
      progress.currentDifficulty,
      progress.selectedCategory || 'ALL'
    );

    const queue = this.cache.get(key) || [];

    // Look for uncompleted item in current queue
    const nextItemIndex = queue.findIndex(
      (item) => !progress.wordsCompleted.includes(item.id)
    );

    if (nextItemIndex !== -1) {
      const selectedItem = queue[nextItemIndex];
      // Keep cache under size limit
      if (queue.length > AI_CACHE_SIZE) {
        queue.shift();
      }

      // If queue is running low, trigger background prefetch
      if (queue.length < 3 && !this.isFetching) {
        setTimeout(() => {
          this.prefetchLessons(progress).catch((err) => {
            console.warn('[AI_LessonProvider] Background prefetch warning:', err);
          });
        }, 0);
      }

      this.setStatus('READY');
      return selectedItem;
    }

    // Queue is empty or all items completed -> trigger background fetch & use fallback
    if (!this.isFetching) {
      setTimeout(() => {
        this.prefetchLessons(progress).catch((err) => {
          console.warn('[AI_LessonProvider] Background prefetch warning:', err);
        });
      }, 0);
    }

    // Instant deterministic fallback to maintain smooth 60fps runner
    const fallbackItem = this.fallbackProvider.getNextChallengeItem(progress);
    return fallbackItem;
  }

  /**
   * Pre-fetches a batch of validated AI lessons in the background.
   * Aborts on timeout and handles retries gracefully.
   */
  public async prefetchLessons(progress: LearningProgress): Promise<void> {
    if (this.isFetching) return;
    this.isFetching = true;
    this.setStatus('GENERATING', 'AI Teacher is drafting custom curriculum...');

    const langInfo = SUPPORTED_LANGUAGES.find(
      (l) => l.code === progress.targetLanguageCode
    );
    const targetLanguageName = langInfo?.name || 'Spanish';
    const sourceLanguageName =
      progress.targetLanguageCode === 'en-US' || progress.targetLanguageCode === 'en-GB'
        ? 'Spanish / French / Mandarin'
        : 'English';

    const requestPayload = {
      sourceLanguage: sourceLanguageName,
      targetLanguage: targetLanguageName,
      languageCode: progress.targetLanguageCode,
      englishVariant: progress.englishVariant || 'US',
      difficulty: progress.currentDifficulty || 'BEGINNER',
      category: progress.selectedCategory || 'ALL',
      count: BATCH_FETCH_SIZE,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT);

    try {
      const response = await fetch('/api/language/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !Array.isArray(data.lessons)) {
        if (data.fallback) {
          this.setStatus('OFFLINE_FALLBACK', 'AI unavailable; local curriculum active.');
          this.retryCount = 0;
          return;
        }
        throw new Error(data.error || 'Invalid API payload');
      }

      // Validate every returned AI lesson
      const validatedItems: LearningItem[] = [];
      const cacheKey = this.getCacheKey(
        progress.targetLanguageCode,
        progress.currentDifficulty,
        progress.selectedCategory || 'ALL'
      );

      const existingQueue = this.cache.get(cacheKey) || [];

      for (let i = 0; i < data.lessons.length; i++) {
        const validated = validateAILesson(data.lessons[i]);
        if (!validated) {
          console.warn('[AI_LessonProvider] Rejected malformed AI response item:', data.lessons[i]);
          continue;
        }

        // Avoid adding duplicate words already in queue
        const isDuplicate = existingQueue.some(
          (existing) =>
            existing.translatedText.toLowerCase() === validated.translatedText.toLowerCase() ||
            existing.sourceText.toLowerCase() === validated.sourceText.toLowerCase()
        );
        if (isDuplicate) continue;

        const uniqueId = `ai_${progress.targetLanguageCode}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const learningItem: LearningItem = {
          id: uniqueId,
          sourceLanguage: validated.sourceLanguage,
          targetLanguage: validated.targetLanguage,
          languageCode: progress.targetLanguageCode,
          sourceText: validated.sourceText,
          translatedText: validated.translatedText,
          pronunciationText: validated.pronunciationGuide || undefined,
          transliteration: validated.transliteration || undefined,
          difficulty: validated.difficulty as LanguageDifficulty,
          category: validated.category,
          exampleSentence: validated.exampleSentence,
          audioReference: `tts:${progress.targetLanguageCode}:${validated.translatedText}`,
          lessonNumber: progress.currentLesson || 1,
          learningObjective: `AI Lesson: Master ${validated.sourceText}`,
          aiGenerated: true,
        };

        validatedItems.push(learningItem);
      }

      if (validatedItems.length > 0) {
        this.cache.set(cacheKey, [...existingQueue, ...validatedItems]);
        this.setStatus('READY', 'AI Curriculum Ready');
        this.retryCount = 0;
      } else {
        console.warn('[AI_LessonProvider] No valid items extracted from AI response');
        this.setStatus('OFFLINE_FALLBACK', 'Local fallback active');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn('[AI_LessonProvider] Fetch failed, falling back to local provider:', err?.message || err);

      if (this.retryCount < AI_MAX_RETRIES) {
        this.retryCount++;
      } else {
        this.setStatus('OFFLINE_FALLBACK', 'Network/AI timeout; local curriculum active.');
      }
    } finally {
      this.isFetching = false;
    }
  }

  public getLessons(languageCode: LanguageCode, lessonNumber: number = 1): LearningItem[] {
    return this.fallbackProvider.getLessons(languageCode, lessonNumber);
  }

  public getItemById(id: string): LearningItem | undefined {
    // Search in AI cache first
    for (const queue of this.cache.values()) {
      const found = queue.find((item) => item.id === id);
      if (found) return found;
    }
    // Search in fallback
    return this.fallbackProvider.getItemById(id);
  }

  public getCacheCount(languageCode?: LanguageCode): number {
    if (!languageCode) {
      let count = 0;
      for (const queue of this.cache.values()) count += queue.length;
      return count;
    }
    let count = 0;
    for (const [key, queue] of this.cache.entries()) {
      if (key.startsWith(languageCode)) {
        count += queue.length;
      }
    }
    return count;
  }

  public clearCache(): void {
    this.cache.clear();
  }
}
