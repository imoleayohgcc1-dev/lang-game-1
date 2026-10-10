import {
  LevelDefinition,
  LevelProgressState,
  LevelRuntimeProgress,
  LevelCompletionStats,
  LevelFailedStats,
  LevelCheckpoint,
} from './levelTypes';
import {
  INITIAL_LEVELS,
  DEFAULT_LEVEL_PROGRESS,
  LEVEL_PROGRESS_STORAGE_KEY,
  generateProceduralLevel,
  ADS_REQUIRED_TO_UNLOCK_LEVEL,
  MAX_LEVEL_DURATION_SECONDS,
} from './levelConfig';

export class LevelManager {
  public currentLevel: LevelDefinition;
  public progress: LevelProgressState;
  public runtimeProgress: LevelRuntimeProgress;

  // Level Checkpoint Milestones
  private checkpoints: LevelCheckpoint[] = [];
  private levelElapsedTime: number = 0;
  private isLevelActive: boolean = false;
  public isCompleted: boolean = false;

  // Events / Callbacks
  public onLevelStarted?: (level: LevelDefinition) => void;
  public onLevelProgress?: (progress: LevelRuntimeProgress) => void;
  public onLevelCompleted?: (stats: LevelCompletionStats) => void;
  public onLevelFailed?: (stats: LevelFailedStats) => void;
  public onNextLevelUnlocked?: (nextLevel: LevelDefinition) => void;
  public onCheckpointReached?: (checkpoint: LevelCheckpoint) => void;

  constructor() {
    this.progress = this.loadProgress();
    const startLevelNum = this.progress.currentLevelNumber || 1;
    this.currentLevel = this.getLevel(startLevelNum);

    this.runtimeProgress = {
      levelNumber: this.currentLevel.levelNumber,
      levelName: this.currentLevel.levelName,
      currentDistance: 0,
      targetDistance: this.currentLevel.targetDistance,
      progressPercentage: 0,
      isComplete: false,
      score: 0,
      coinsEarned: 0,
      enemiesDefeated: 0,
      bombsUsed: 0,
      timeElapsed: 0,
    };
  }

  private loadProgress(): LevelProgressState {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(LEVEL_PROGRESS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            ...DEFAULT_LEVEL_PROGRESS,
            ...parsed,
            unlockedLevels: parsed.unlockedLevels && parsed.unlockedLevels.length > 0
              ? parsed.unlockedLevels
              : [1],
            completedLevels: parsed.completedLevels || [],
            bestScores: parsed.bestScores || {},
            bestDistances: parsed.bestDistances || {},
            stars: parsed.stars || {},
            adUnlockProgress: parsed.adUnlockProgress || {},
          };
        }
      }
    } catch (e) {
      console.warn('[LevelManager] Failed to load level progress:', e);
    }
    return { ...DEFAULT_LEVEL_PROGRESS };
  }

  public getAdUnlockProgress(levelNumber: number): number {
    return this.progress.adUnlockProgress?.[levelNumber] || 0;
  }

  public recordAdWatchedForLevel(levelNumber: number): {
    current: number;
    required: number;
    unlocked: boolean;
  } {
    if (!this.progress.adUnlockProgress) {
      this.progress.adUnlockProgress = {};
    }
    const current = (this.progress.adUnlockProgress[levelNumber] || 0) + 1;
    this.progress.adUnlockProgress[levelNumber] = current;

    let unlocked = false;
    if (current >= ADS_REQUIRED_TO_UNLOCK_LEVEL) {
      if (!this.progress.unlockedLevels.includes(levelNumber)) {
        this.progress.unlockedLevels.push(levelNumber);
        this.progress.unlockedLevels.sort((a, b) => a - b);
        unlocked = true;
      }
    }
    this.saveProgress();
    return {
      current,
      required: ADS_REQUIRED_TO_UNLOCK_LEVEL,
      unlocked,
    };
  }

  public saveProgress(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LEVEL_PROGRESS_STORAGE_KEY, JSON.stringify(this.progress));
      }
    } catch (e) {
      console.warn('[LevelManager] Failed to save level progress:', e);
    }
  }

  public getLevel(levelNumber: number): LevelDefinition {
    const found = INITIAL_LEVELS.find((l) => l.levelNumber === levelNumber);
    if (found) {
      return found;
    }
    return generateProceduralLevel(levelNumber);
  }

  public getAllLevels(limit: number = 8): LevelDefinition[] {
    const levels: LevelDefinition[] = [...INITIAL_LEVELS];
    const highestUnlocked = Math.max(1, ...this.progress.unlockedLevels);
    const targetCount = Math.max(limit, highestUnlocked + 1);

    for (let i = levels.length + 1; i <= targetCount; i++) {
      levels.push(this.getLevel(i));
    }
    return levels;
  }

  public isLevelUnlocked(levelNumber: number): boolean {
    if (levelNumber <= 1) return true;
    return this.progress.unlockedLevels.includes(levelNumber);
  }

  public isLevelCompleted(levelNumber: number): boolean {
    return this.progress.completedLevels.includes(levelNumber);
  }

  public getLevelStars(levelNumber: number): number {
    return this.progress.stars[levelNumber] || 0;
  }

  /**
   * Starts or restarts a specific level.
   */
  public startLevel(levelNumberOrId: number | string): LevelDefinition {
    const num = typeof levelNumberOrId === 'number'
      ? levelNumberOrId
      : parseInt(levelNumberOrId.replace(/\D/g, ''), 10) || 1;

    // Safety: ensure unlocked
    if (!this.isLevelUnlocked(num)) {
      console.warn(`[LevelManager] Attempted to start locked level ${num}, falling back to highest unlocked.`);
      const highest = Math.max(1, ...this.progress.unlockedLevels);
      return this.startLevel(highest);
    }

    this.currentLevel = this.getLevel(num);
    this.progress.currentLevelNumber = num;
    this.saveProgress();

    // Reset runtime stats
    this.isLevelActive = true;
    this.isCompleted = false;
    this.levelElapsedTime = 0;

    // Setup checkpoints
    const targetDist = this.currentLevel.targetDistance;
    this.checkpoints = (this.currentLevel.checkpoints || [25, 50, 75]).map((pct) => ({
      distance: (pct / 100) * targetDist,
      percentage: pct,
      reached: false,
    }));

    this.runtimeProgress = {
      levelNumber: this.currentLevel.levelNumber,
      levelName: this.currentLevel.levelName,
      currentDistance: 0,
      targetDistance: targetDist,
      progressPercentage: 0,
      isComplete: false,
      score: 0,
      coinsEarned: 0,
      enemiesDefeated: 0,
      bombsUsed: 0,
      timeElapsed: 0,
    };

    this.onLevelStarted?.(this.currentLevel);
    return this.currentLevel;
  }

  /**
   * Frame-by-frame distance and level progress update
   */
  public update(
    distance: number,
    delta: number,
    stats: {
      score: number;
      coins: number;
      enemiesDefeated: number;
      bombsUsed?: number;
    }
  ): LevelRuntimeProgress {
    if (!this.isLevelActive) {
      return this.runtimeProgress;
    }

    this.levelElapsedTime += delta;

    const targetDist = this.currentLevel.targetDistance;
    const currentDist = Math.max(0, distance);
    const progressPct = Math.min(100, Math.max(0, Math.round((currentDist / targetDist) * 100)));

    // Checkpoint detection
    for (let i = 0; i < this.checkpoints.length; i++) {
      const cp = this.checkpoints[i];
      if (!cp.reached && currentDist >= cp.distance) {
        cp.reached = true;
        this.onCheckpointReached?.(cp);
      }
    }

    // Max duration cap: each level never exceeds 3-5 minutes max (capped at 300s)
    const isTimeLimitReached = this.levelElapsedTime >= MAX_LEVEL_DURATION_SECONDS;
    const isDistReached = currentDist >= targetDist || isTimeLimitReached;
    const req = this.currentLevel.completionRequirements;
    const isCoinsMet = isTimeLimitReached || (req.requiredCoins || 0) <= stats.coins;
    const isEnemiesMet = isTimeLimitReached || (req.requiredEnemiesDefeated || 0) <= stats.enemiesDefeated;

    const isComplete = isDistReached && isCoinsMet && isEnemiesMet;

    this.runtimeProgress = {
      levelNumber: this.currentLevel.levelNumber,
      levelName: this.currentLevel.levelName,
      currentDistance: currentDist,
      targetDistance: targetDist,
      progressPercentage: isTimeLimitReached ? 100 : progressPct,
      isComplete,
      score: stats.score,
      coinsEarned: stats.coins,
      enemiesDefeated: stats.enemiesDefeated,
      bombsUsed: stats.bombsUsed || 0,
      timeElapsed: Math.round(this.levelElapsedTime),
    };

    this.onLevelProgress?.(this.runtimeProgress);

    return this.runtimeProgress;
  }

  /**
   * Completes the current level and awards progression rewards
   */
  public completeLevel(finalStats: {
    distance: number;
    score: number;
    coins: number;
    xp: number;
    enemiesDefeated: number;
    bombsUsed?: number;
    tookDamage?: boolean;
  }): LevelCompletionStats {
    this.isCompleted = true;
    this.isLevelActive = false;

    const levelNum = this.currentLevel.levelNumber;
    const rewardCfg = this.currentLevel.rewardConfiguration;

    // Evaluate 3 Stars & Secondary Objectives
    let starsEarned = 1; // 1 Star guaranteed for primary completion
    const completedObjDescriptions: string[] = ['Completed Primary Distance'];

    for (const obj of this.currentLevel.secondaryObjectives) {
      let satisfied = false;
      switch (obj.type) {
        case 'COINS_COLLECTED':
          satisfied = finalStats.coins >= obj.targetValue;
          break;
        case 'ENEMIES_DEFEATED':
          satisfied = finalStats.enemiesDefeated >= obj.targetValue;
          break;
        case 'NO_DAMAGE':
          satisfied = !finalStats.tookDamage;
          break;
        case 'BOMBS_USED':
          satisfied = (finalStats.bombsUsed || 0) >= obj.targetValue;
          break;
        case 'DISTANCE':
          satisfied = finalStats.distance >= obj.targetValue;
          break;
      }

      if (satisfied) {
        starsEarned++;
        completedObjDescriptions.push(obj.description);
      }
    }
    starsEarned = Math.min(3, starsEarned);

    // Calculate rewards
    let totalXP = rewardCfg.completionXP + (starsEarned - 1) * rewardCfg.starBonusXP;
    let totalCoins = rewardCfg.completionCoins + (starsEarned - 1) * rewardCfg.starBonusCoins;

    // Update Progress State
    if (!this.progress.completedLevels.includes(levelNum)) {
      this.progress.completedLevels.push(levelNum);
    }

    const prevBestScore = this.progress.bestScores[levelNum] || 0;
    const isNewBest = finalStats.score > prevBestScore;
    if (isNewBest) {
      this.progress.bestScores[levelNum] = finalStats.score;
    }

    const prevBestDist = this.progress.bestDistances[levelNum] || 0;
    if (finalStats.distance > prevBestDist) {
      this.progress.bestDistances[levelNum] = Math.round(finalStats.distance);
    }

    const prevStars = this.progress.stars[levelNum] || 0;
    if (starsEarned > prevStars) {
      this.progress.stars[levelNum] = starsEarned;
    }

    this.progress.totalLevelCoins += totalCoins;
    this.progress.totalLevelXP += totalXP;

    // Unlock Next Level
    const nextLevelNum = levelNum + 1;
    let nextLevelUnlocked = false;
    if (!this.progress.unlockedLevels.includes(nextLevelNum)) {
      this.progress.unlockedLevels.push(nextLevelNum);
      nextLevelUnlocked = true;
    }

    this.saveProgress();

    const completionStats: LevelCompletionStats = {
      levelNumber: levelNum,
      levelName: this.currentLevel.levelName,
      environment: this.currentLevel.environment,
      targetDistance: this.currentLevel.targetDistance,
      distanceReached: Math.round(finalStats.distance),
      score: finalStats.score,
      coinsEarned: totalCoins,
      xpEarned: totalXP,
      enemiesDefeated: finalStats.enemiesDefeated,
      bombsUsed: finalStats.bombsUsed || 0,
      timeElapsedSeconds: Math.round(this.levelElapsedTime),
      starsEarned,
      objectivesCompleted: completedObjDescriptions,
      isNewBest,
      nextLevelUnlocked,
      nextLevelNumber: nextLevelNum,
    };

    if (nextLevelUnlocked) {
      const nextLevelDef = this.getLevel(nextLevelNum);
      this.onNextLevelUnlocked?.(nextLevelDef);
    }

    this.onLevelCompleted?.(completionStats);
    return completionStats;
  }

  /**
   * Handles player death / failure within a level
   */
  public failLevel(finalStats: {
    distance: number;
    score: number;
    coins: number;
    enemiesDefeated?: number;
    bombsUsed?: number;
    cause?: string;
  }): LevelFailedStats {
    this.isLevelActive = false;
    this.isCompleted = false;

    const levelNum = this.currentLevel.levelNumber;

    const prevBestDist = this.progress.bestDistances[levelNum] || 0;
    if (finalStats.distance > prevBestDist) {
      this.progress.bestDistances[levelNum] = Math.round(finalStats.distance);
    }
    this.saveProgress();

    const failedStats: LevelFailedStats = {
      levelNumber: levelNum,
      levelName: this.currentLevel.levelName,
      distanceReached: Math.round(finalStats.distance),
      targetDistance: this.currentLevel.targetDistance,
      score: finalStats.score,
      coinsCollected: finalStats.coins,
      enemiesDefeated: finalStats.enemiesDefeated || 0,
      bombsUsed: finalStats.bombsUsed || 0,
      timeElapsedSeconds: Math.round(this.levelElapsedTime),
      cause: finalStats.cause || 'Obstacle Collision',
    };

    this.onLevelFailed?.(failedStats);
    return failedStats;
  }

  public restartLevel(): LevelDefinition {
    return this.startLevel(this.currentLevel.levelNumber);
  }

  public nextLevel(): LevelDefinition {
    const nextNum = this.currentLevel.levelNumber + 1;
    return this.startLevel(nextNum);
  }

  public resetProgress(): void {
    this.progress = { ...DEFAULT_LEVEL_PROGRESS };
    this.saveProgress();
    this.startLevel(1);
  }
}
