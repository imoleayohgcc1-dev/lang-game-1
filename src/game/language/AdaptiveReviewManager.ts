import {
  LearningItem,
  LanguageCode,
  WordLearningStats,
  LessonDefinition,
  LearningProgress,
} from './types';

export class AdaptiveReviewManager {
  private recentWordIds: string[] = [];
  private maxRecentHistory = 3;

  /**
   * Records the outcome of a word practice challenge.
   */
  public recordWordAttempt(
    statsRecord: Record<string, WordLearningStats>,
    item: LearningItem,
    isCorrect: boolean,
    attempts: number,
    lessonId: string,
    language: LanguageCode
  ): WordLearningStats {
    let stat = statsRecord[item.id];
    const now = Date.now();

    if (!stat) {
      stat = {
        wordId: item.id,
        wordText: item.sourceText,
        lessonId,
        language,
        totalAttempts: 0,
        correctAttempts: 0,
        status: 'NEW',
        lastReviewed: now,
        consecutiveSuccesses: 0,
      };
      statsRecord[item.id] = stat;
    }

    stat.totalAttempts += attempts;
    stat.lastReviewed = now;

    if (isCorrect) {
      stat.correctAttempts++;
      stat.consecutiveSuccesses++;

      // If correct 2+ times consecutively, or 1st attempt correct with prior practice, mark LEARNED
      if (stat.consecutiveSuccesses >= 2 || (attempts === 1 && stat.correctAttempts >= 2)) {
        stat.status = 'LEARNED';
      }
    } else {
      stat.consecutiveSuccesses = 0;
      // Mark as needing review on failure or repeated struggles
      stat.status = 'NEEDS_REVIEW';
    }

    // Add to recent history to prevent immediate repeat
    this.addRecentWord(item.id);

    return stat;
  }

  public addRecentWord(wordId: string): void {
    this.recentWordIds.push(wordId);
    if (this.recentWordIds.length > this.maxRecentHistory) {
      this.recentWordIds.shift();
    }
  }

  public clearRecentWords(): void {
    this.recentWordIds = [];
  }

  /**
   * Selects next item to practice within a lesson using adaptive spaced review.
   * Priority:
   * 1. Words needing review (NEEDS_REVIEW) not in recent history.
   * 2. Uncompleted / new words (NEW).
   * 3. Learned words (LEARNED) for reinforcement.
   * Guarantees never repeating the immediately preceding word if lesson has >= 2 words.
   */
  public selectNextLessonItem(
    lesson: LessonDefinition,
    progress: LearningProgress
  ): LearningItem {
    const items = lesson.vocabularyItems;
    if (items.length === 0) {
      throw new Error(`Lesson ${lesson.lessonId} has no vocabulary items`);
    }
    if (items.length === 1) {
      return items[0];
    }

    const wordStats = progress.wordStats || {};

    // Filter items not in recent history
    const nonRecentItems = items.filter((item) => !this.recentWordIds.includes(item.id));
    const candidatePool = nonRecentItems.length > 0 ? nonRecentItems : items;

    // 1. Check for words that need review
    const needsReview = candidatePool.filter(
      (item) => wordStats[item.id]?.status === 'NEEDS_REVIEW'
    );
    if (needsReview.length > 0) {
      return needsReview[0];
    }

    // 2. Check for new unencountered or uncompleted words in current lesson
    const uncompleted = candidatePool.filter(
      (item) => !progress.wordsCompleted.includes(item.id)
    );
    if (uncompleted.length > 0) {
      return uncompleted[0];
    }

    // 3. Spaced reinforcement from learned words
    // Pick the one with oldest lastReviewed timestamp
    const sortedByOldest = [...candidatePool].sort((a, b) => {
      const timeA = wordStats[a.id]?.lastReviewed || 0;
      const timeB = wordStats[b.id]?.lastReviewed || 0;
      return timeA - timeB;
    });

    return sortedByOldest[0];
  }
}
