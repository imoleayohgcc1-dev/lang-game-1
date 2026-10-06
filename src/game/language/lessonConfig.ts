import { ChallengeSchedulerConfig, LessonRewardConfig } from './lessonTypes';

export const CHALLENGE_SCHEDULER_CONFIG: ChallengeSchedulerConfig = {
  MIN_CHALLENGE_DISTANCE: 65.0, // minimum distance (meters) between language challenges
  MAX_CHALLENGE_DISTANCE: 125.0, // maximum distance (meters) before next challenge
  MIN_CHALLENGE_TIME: 6.0, // minimum time (seconds) between challenges
  CHALLENGE_COOLDOWN: 7.5, // cooldown (seconds) after a challenge finishes
  MAX_CHALLENGES_PER_LEVEL: 15, // max challenges per game run session
  SAFETY_OBSTACLE_LOOKAHEAD_DISTANCE: 22.0, // safe runway in front of player
  COMBAT_SAFETY_DISTANCE: 20.0, // clearance from active hostile enemies
  MIN_HEALTH_THRESHOLD: 1, // caution threshold for critical health
};

export const DEFAULT_LESSON_REWARDS: LessonRewardConfig = {
  completionCoins: 50,
  completionXP: 60,
  perChallengeCoins: 10,
  perChallengeXP: 10,
  streakBonusXP: 2,
  voiceBonusCoins: 5,
  voiceBonusXP: 5,
};
