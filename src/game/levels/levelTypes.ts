import { EnvironmentTheme, DayNightMode } from '../constants';

export type ObstacleDifficulty = 'LOW' | 'MEDIUM' | 'HIGH';
export type EnemyDifficulty = 'LOW' | 'MEDIUM' | 'HIGH';
export type CoinDensity = 'LOW' | 'MEDIUM' | 'HIGH';
export type PowerUpFrequency = 'GENEROUS' | 'STANDARD' | 'SPARSE';

export interface LevelSecondaryObjective {
  id: string;
  description: string;
  type: 'COINS_COLLECTED' | 'ENEMIES_DEFEATED' | 'NO_DAMAGE' | 'BOMBS_USED' | 'DISTANCE';
  targetValue: number;
  bonusXP: number;
  bonusCoins: number;
  isCompleted?: boolean;
}

export interface LevelRequirements {
  targetDistance: number;
  requiredCoins?: number;
  requiredEnemiesDefeated?: number;
  surviveTimeSeconds?: number;
}

export interface LevelRewardConfig {
  completionXP: number;
  completionCoins: number;
  starBonusXP: number;
  starBonusCoins: number;
}

export interface LevelCheckpoint {
  distance: number;
  percentage: number;
  reached: boolean;
}

export type WeatherType =
  | 'SUNNY'
  | 'CLOUDY'
  | 'RAIN'
  | 'FOG'
  | 'WIND'
  | 'STORM'
  | 'SUNSET'
  | 'NIGHT';

export interface LevelDefinition {
  levelId: string;
  levelNumber: number;
  levelName: string;
  description: string;
  environment: EnvironmentTheme;
  dayNight: DayNightMode;
  weather: WeatherType;
  weatherIntensity?: number; // 0.0 - 1.0
  targetDuration: number; // in seconds (e.g. 180s = 3 mins)
  maximumDuration: number; // in seconds (e.g. 240s = 4 mins hard cap)
  targetDistance: number;
  startingSpeed: number;
  maximumSpeed: number;
  speedAcceleration: number;
  obstacleDifficulty: ObstacleDifficulty;
  obstacleGapMultiplier: number;
  enemyDifficulty: EnemyDifficulty;
  enemySpawnRate: number;
  maximumActiveEnemies: number;
  coinDensity: CoinDensity;
  powerUpFrequency: PowerUpFrequency;
  completionRequirements: LevelRequirements;
  secondaryObjectives: LevelSecondaryObjective[];
  rewardConfiguration: LevelRewardConfig;
  checkpoints: number[]; // percentage milestones e.g. [25, 50, 75]
  hasDragonEncounter?: boolean;
  dragonEncounterDistance?: number;
}

export interface LevelProgressState {
  unlockedLevels: number[];
  completedLevels: number[];
  currentLevelNumber: number;
  bestScores: Record<number, number>;
  bestDistances: Record<number, number>;
  stars: Record<number, number>; // 0 to 3 stars
  totalLevelCoins: number;
  totalLevelXP: number;
  adUnlockProgress?: Record<number, number>;
}

export interface LevelRuntimeProgress {
  levelNumber: number;
  levelName: string;
  currentDistance: number;
  targetDistance: number;
  progressPercentage: number; // 0 to 100
  isComplete: boolean;
  score: number;
  coinsEarned: number;
  enemiesDefeated: number;
  bombsUsed: number;
  timeElapsed: number;
}

export interface LevelCompletionStats {
  levelNumber: number;
  levelName: string;
  environment: EnvironmentTheme;
  targetDistance: number;
  distanceReached: number;
  score: number;
  coinsEarned: number;
  extraLivesEarned?: number;
  xpEarned: number;
  enemiesDefeated: number;
  obstaclesDestroyed?: number;
  bombsUsed: number;
  timeElapsedSeconds: number;
  starsEarned: number;
  objectivesCompleted: string[];
  isNewBest: boolean;
  nextLevelUnlocked: boolean;
  nextLevelNumber?: number;
  completionStatus?: 'COMPLETED' | 'SURVIVED' | 'TIME_CAP_COMPLETED';
}

export interface LevelFailedStats {
  levelNumber: number;
  levelName: string;
  distanceReached: number;
  targetDistance: number;
  score: number;
  coinsCollected: number;
  enemiesDefeated: number;
  bombsUsed: number;
  timeElapsedSeconds: number;
  cause?: string;
}
