import { XPProgress } from './lessonTypes';

/**
 * Foundation XP Progression System
 * 
 * Clean, predictable RPG-lite level curve:
 * Level 1: 0 - 99 XP (needs 100 XP)
 * Level 2: 100 - 249 XP (needs 150 XP)
 * Level 3: 250 - 449 XP (needs 200 XP)
 * Level 4: 450 - 699 XP (needs 250 XP)
 * Level 5: 700 - 999 XP (needs 300 XP)
 * Level N formula: threshold for level N is base + cumulative
 */
export class XPManager {
  /**
   * Returns minimum cumulative XP required to reach a specific level.
   * Level 1: 0 XP
   * Level 2: 100 XP
   * Level 3: 250 XP
   * Level 4: 450 XP
   * Level 5: 700 XP
   */
  public static getThresholdForLevel(level: number): number {
    if (level <= 1) return 0;
    // Level N threshold: 25 * (level - 1) * (level + 2)
    // For level 2: 25 * 1 * 4 = 100
    // For level 3: 25 * 2 * 5 = 250
    // For level 4: 25 * 3 * 6 = 450
    // For level 5: 25 * 4 * 7 = 700
    return 25 * (level - 1) * (level + 2);
  }

  /**
   * Calculates player level from total XP earned.
   */
  public static calculateLevel(totalXP: number): number {
    if (totalXP <= 0) return 1;
    let level = 1;
    while (XPManager.getThresholdForLevel(level + 1) <= totalXP) {
      level++;
    }
    return level;
  }

  /**
   * Computes full XPProgress structure.
   */
  public static calculateXPProgress(totalXP: number): XPProgress {
    const safeXP = Math.max(0, totalXP);
    const playerLevel = XPManager.calculateLevel(safeXP);
    const currentLevelBaseXP = XPManager.getThresholdForLevel(playerLevel);
    const nextLevelXP = XPManager.getThresholdForLevel(playerLevel + 1);

    const xpInLevel = safeXP - currentLevelBaseXP;
    const xpSpan = Math.max(1, nextLevelXP - currentLevelBaseXP);
    const progressToNextLevel = Math.min(100, Math.max(0, Math.round((xpInLevel / xpSpan) * 100)));

    return {
      currentXP: safeXP,
      totalXPEarned: safeXP,
      playerLevel,
      currentLevelBaseXP,
      nextLevelXP,
      progressToNextLevel,
    };
  }

  /**
   * Returns a friendly rank title for the level.
   */
  public static getLevelTitle(level: number): string {
    if (level <= 1) return 'Novice Runner';
    if (level === 2) return 'Language Scout';
    if (level === 3) return 'Pathfinder';
    if (level === 4) return 'Polyglot Sprinter';
    if (level === 5) return 'Fluent Dasher';
    if (level === 6) return 'Speech Master';
    return `Grand Linguist (Lv ${level})`;
  }
}
