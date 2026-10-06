import { LanguageCode, LanguageDifficulty, LearningItem } from './types';

export type LessonRequirementType =
  | 'VOCABULARY_COUNT'
  | 'PRONUNCIATION_COUNT'
  | 'ACCURACY_RATE';

export interface LessonRequirements {
  targetCount: number;
  type: LessonRequirementType;
  minAccuracy?: number;
}

export interface LessonRewardConfig {
  completionCoins: number;
  completionXP: number;
  perChallengeCoins: number;
  perChallengeXP: number;
  streakBonusXP: number;
  voiceBonusCoins: number;
  voiceBonusXP: number;
}

export interface LessonDefinition {
  lessonId: string;
  lessonNumber: number;
  language: LanguageCode;
  englishVariant?: 'US' | 'UK';
  difficulty: LanguageDifficulty;
  category: string;
  lessonTitle: string;
  learningObjective: string;
  vocabularyItems: LearningItem[];
  phrases: string[];
  pronunciationData?: Record<string, string>;
  exampleSentences?: string[];
  completionRequirements: LessonRequirements;
  rewardConfiguration: LessonRewardConfig;
}

export type WordLearningStatus = 'NEW' | 'NEEDS_REVIEW' | 'LEARNED';

export interface WordLearningStats {
  wordId: string;
  wordText: string;
  lessonId: string;
  language: LanguageCode;
  totalAttempts: number;
  correctAttempts: number;
  status: WordLearningStatus;
  lastReviewed: number;
  consecutiveSuccesses: number;
}

export interface LessonSessionStats {
  lessonId: string;
  lessonNumber: number;
  lessonTitle: string;
  category: string;
  languageCode: LanguageCode;
  challengesCompleted: number;
  correctAnswers: number;
  attempts: number;
  xpEarned: number;
  coinsEarned: number;
  wordsLearned: number;
  accuracy: number; // 0 to 100 percentage
  highestStreak: number;
  isComplete: boolean;
}

export interface XPProgress {
  currentXP: number;
  totalXPEarned: number;
  playerLevel: number;
  currentLevelBaseXP: number;
  nextLevelXP: number;
  progressToNextLevel: number; // 0 to 100 percentage
}

export interface ChallengeSchedulerConfig {
  MIN_CHALLENGE_DISTANCE: number;
  MAX_CHALLENGE_DISTANCE: number;
  MIN_CHALLENGE_TIME: number;
  CHALLENGE_COOLDOWN: number;
  MAX_CHALLENGES_PER_LEVEL: number;
  SAFETY_OBSTACLE_LOOKAHEAD_DISTANCE: number;
  COMBAT_SAFETY_DISTANCE: number;
  MIN_HEALTH_THRESHOLD: number;
}

export interface ChallengeSchedulerContext {
  playerPositionZ: number;
  distanceSinceLastChallenge: number;
  timeSinceLastChallenge: number;
  challengesInCurrentRun: number;
  hasUpcomingObstacle: boolean;
  hasActiveEnemyNear: boolean;
  isPlayerJumping: boolean;
  isPlayerSliding: boolean;
  isPlayerDead: boolean;
  isPlayerHurt: boolean;
  isPlayerReloading: boolean;
  isPlayerFiring: boolean;
  hasTargetLock: boolean;
  isChallengeActive: boolean;
  isLessonComplete: boolean;
  isPlaying: boolean;
}
