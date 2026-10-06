import {
  ChallengeSchedulerConfig,
  ChallengeSchedulerContext,
} from './lessonTypes';
import { CHALLENGE_SCHEDULER_CONFIG } from './lessonConfig';

export interface ScheduleDecision {
  canTrigger: boolean;
  reason?: string;
}

export class LanguageChallengeScheduler {
  public config: ChallengeSchedulerConfig;
  private lastChallengeDistance: number = 0;
  private lastChallengeTime: number = 0;
  private challengesTriggeredInRun: number = 0;

  constructor(config: ChallengeSchedulerConfig = CHALLENGE_SCHEDULER_CONFIG) {
    this.config = { ...config };
  }

  /**
   * Resets scheduler run tracking on game start or restart.
   */
  public reset(): void {
    this.lastChallengeDistance = 0;
    this.lastChallengeTime = 0;
    this.challengesTriggeredInRun = 0;
  }

  /**
   * Notifies scheduler that a challenge has started.
   */
  public onChallengeStarted(currentDistance: number, currentTime: number): void {
    this.lastChallengeDistance = currentDistance;
    this.lastChallengeTime = currentTime;
    this.challengesTriggeredInRun++;
  }

  /**
   * Evaluates if a language challenge can safely occur at this moment.
   * Ensures the player is never overwhelmed or blinded to obstacles.
   */
  public canTriggerChallenge(context: ChallengeSchedulerContext): ScheduleDecision {
    // 1. Must be actively playing
    if (!context.isPlaying) {
      return { canTrigger: false, reason: 'Game not in active PLAYING state' };
    }

    // 2. Cannot trigger if a challenge is already active
    if (context.isChallengeActive) {
      return { canTrigger: false, reason: 'Challenge already in progress' };
    }

    // 3. Cannot trigger if lesson objective is already complete
    if (context.isLessonComplete) {
      return { canTrigger: false, reason: 'Lesson objective already completed' };
    }

    // 4. Player state safety: cannot trigger during jumps, slides, or death
    if (context.isPlayerDead) {
      return { canTrigger: false, reason: 'Player is dead' };
    }
    if (context.isPlayerJumping) {
      return { canTrigger: false, reason: 'Player is currently airborne in a jump' };
    }
    if (context.isPlayerSliding) {
      return { canTrigger: false, reason: 'Player is currently sliding under an obstacle' };
    }
    if (context.isPlayerHurt) {
      return { canTrigger: false, reason: 'Player is recovering from recent damage' };
    }

    // 5. Track obstacle safety lookahead: at least 22m of clear runway
    if (context.hasUpcomingObstacle) {
      return { canTrigger: false, reason: 'Obstacle immediately ahead of player' };
    }

    // 6. Combat safety: delay challenge if active enemy is near or combat is engaged
    if (context.hasActiveEnemyNear) {
      return { canTrigger: false, reason: 'Active hostile enemy within combat safety range' };
    }
    if (context.isPlayerFiring || context.isPlayerReloading || context.hasTargetLock) {
      return { canTrigger: false, reason: 'Player actively engaged in combat' };
    }

    // 7. Distance pacing: must have traversed minimum distance since last challenge
    if (context.distanceSinceLastChallenge < this.config.MIN_CHALLENGE_DISTANCE) {
      return {
        canTrigger: false,
        reason: `Pacing distance not met (${context.distanceSinceLastChallenge.toFixed(1)}m / ${this.config.MIN_CHALLENGE_DISTANCE}m)`,
      };
    }

    // 8. Time cooldown: must have waited minimum cooldown seconds
    if (context.timeSinceLastChallenge < this.config.CHALLENGE_COOLDOWN) {
      return {
        canTrigger: false,
        reason: `Cooldown not elapsed (${context.timeSinceLastChallenge.toFixed(1)}s / ${this.config.CHALLENGE_COOLDOWN}s)`,
      };
    }

    // 9. Session challenge cap
    if (context.challengesInCurrentRun >= this.config.MAX_CHALLENGES_PER_LEVEL) {
      return {
        canTrigger: false,
        reason: `Max level challenges reached (${context.challengesInCurrentRun}/${this.config.MAX_CHALLENGES_PER_LEVEL})`,
      };
    }

    return { canTrigger: true };
  }

  public getChallengesTriggered(): number {
    return this.challengesTriggeredInRun;
  }
}
