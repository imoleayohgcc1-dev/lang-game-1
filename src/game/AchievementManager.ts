export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

const ACHIEVEMENTS_STORAGE_KEY = 'language_runner_achievements';

export class AchievementManager {
  private achievements: Record<string, Achievement> = {
    FIRST_RUN: {
      id: 'FIRST_RUN',
      title: 'First Steps',
      description: 'Completed your first run through the metro.',
      icon: '🏃',
      unlocked: false,
    },
    COIN_COLLECTOR: {
      id: 'COIN_COLLECTOR',
      title: 'Coin Hoarder',
      description: 'Collected 50 total coins.',
      icon: '🪙',
      unlocked: false,
    },
    CYBER_DEFENDER: {
      id: 'CYBER_DEFENDER',
      title: 'Cyber Hunter',
      description: 'Defeated 10 enemy drones and sentinels.',
      icon: '🎯',
      unlocked: false,
    },
    POWER_SURGE: {
      id: 'POWER_SURGE',
      title: 'Power Surge',
      description: 'Collected your first power-up item.',
      icon: '⚡',
      unlocked: false,
    },
    SPEED_DEMON: {
      id: 'SPEED_DEMON',
      title: 'Velocity Break',
      description: 'Accelerated past 26 km/h.',
      icon: '🚀',
      unlocked: false,
    },
    DISTANCE_RUNNER: {
      id: 'DISTANCE_RUNNER',
      title: 'Marathon Runner',
      description: 'Ran 350 meters in a single run.',
      icon: '🏆',
      unlocked: false,
    },
  };

  public onAchievementUnlocked?: (achievement: Achievement) => void;

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    try {
      const stored = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
      if (stored) {
        const unlockedIds: string[] = JSON.parse(stored);
        unlockedIds.forEach((id) => {
          if (this.achievements[id]) {
            this.achievements[id].unlocked = true;
          }
        });
      }
    } catch {
      // Local storage fallback
    }
  }

  private saveState(): void {
    try {
      const unlockedIds = Object.values(this.achievements)
        .filter((a) => a.unlocked)
        .map((a) => a.id);
      localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(unlockedIds));
    } catch {
      // Fallback
    }
  }

  public unlock(id: string): void {
    const ach = this.achievements[id];
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      this.saveState();
      if (this.onAchievementUnlocked) {
        this.onAchievementUnlocked(ach);
      }
    }
  }

  public getAchievements(): Achievement[] {
    return Object.values(this.achievements);
  }
}
