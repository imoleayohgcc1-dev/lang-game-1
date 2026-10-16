/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthenticationManager } from './authManager';
import { PlayerProfileManager } from './playerProfileManager';
import { PlayerProfile, LevelRunRecord } from './types';
import { LEVEL_PROGRESS_STORAGE_KEY } from '../game/levels/levelConfig';
import { HIGH_SCORE_KEY } from '../game/constants';
import { LevelProgressState } from '../game/levels/levelTypes';

export class CloudSaveManager {
  private static instance: CloudSaveManager | null = null;
  private isSyncing = false;
  private lastSyncTimestamp = 0;

  public static getInstance(): CloudSaveManager {
    if (!CloudSaveManager.instance) {
      CloudSaveManager.instance = new CloudSaveManager();
    }
    return CloudSaveManager.instance;
  }

  /**
   * Bidirectional sync with deterministic conflict resolution:
   * Merges local and cloud progression taking the highest achievements,
   * without overwriting newer cloud records with older local data.
   */
  public async syncProgression(): Promise<PlayerProfile | null> {
    const authState = AuthenticationManager.getInstance().getState();
    if (!authState.isAuthenticated || !authState.user) {
      return null;
    }

    if (this.isSyncing) return authState.profile;
    this.isSyncing = true;

    try {
      const userId = authState.user.id;
      const cloudProfile = await PlayerProfileManager.getInstance().fetchProfile(userId);

      // Read local storage progress
      let localProgress: LevelProgressState | null = null;
      let localHighScore = 0;

      try {
        const stored = localStorage.getItem(LEVEL_PROGRESS_STORAGE_KEY);
        if (stored) {
          localProgress = JSON.parse(stored);
        }
        const storedScore = localStorage.getItem(HIGH_SCORE_KEY);
        if (storedScore) {
          localHighScore = parseInt(storedScore, 10) || 0;
        }
      } catch {
        // Ignore local parse issues
      }

      const localMaxUnlocked = localProgress?.unlockedLevels
        ? Math.max(...localProgress.unlockedLevels, 1)
        : 1;

      const cloudMaxUnlocked = cloudProfile?.highest_unlocked_level || 1;
      const cloudHighScore = cloudProfile?.best_score || 0;
      const cloudDistance = Number(cloudProfile?.total_distance || 0);
      const cloudEnemies = cloudProfile?.total_enemies_defeated || 0;
      const cloudCoins = cloudProfile?.total_coins_collected || 0;

      // Deterministic Merge: Max values ensure progress is never lost
      const mergedUnlockedLevel = Math.max(localMaxUnlocked, cloudMaxUnlocked);
      const mergedHighScore = Math.max(localHighScore, cloudHighScore);
      const mergedDistance = Math.max(0, cloudDistance);
      const mergedEnemies = Math.max(0, cloudEnemies);
      const mergedCoins = Math.max(localProgress?.totalLevelCoins || 0, cloudCoins);

      // Merge unlocked levels array for local storage
      const mergedUnlockedLevelsArray = Array.from(
        new Set([...(localProgress?.unlockedLevels || [1]), ...Array.from({ length: mergedUnlockedLevel }, (_, i) => i + 1)])
      ).sort((a, b) => a - b);

      // Update local storage with merged truth
      if (localProgress) {
        localProgress.unlockedLevels = mergedUnlockedLevelsArray;
        localProgress.currentLevelNumber = Math.max(localProgress.currentLevelNumber || 1, mergedUnlockedLevel);
        localStorage.setItem(LEVEL_PROGRESS_STORAGE_KEY, JSON.stringify(localProgress));
      }
      localStorage.setItem(HIGH_SCORE_KEY, mergedHighScore.toString());

      // Update cloud profile with merged truth
      const updatedProfile = await PlayerProfileManager.getInstance().createOrUpdateProfile({
        id: userId,
        display_name: cloudProfile?.display_name || authState.profile?.display_name || 'Runner',
        highest_unlocked_level: mergedUnlockedLevel,
        current_level: mergedUnlockedLevel,
        best_score: mergedHighScore,
        total_distance: mergedDistance,
        total_enemies_defeated: mergedEnemies,
        total_coins_collected: mergedCoins,
        upgrade_levels: cloudProfile?.upgrade_levels || { damage: 0, health: 0, bombs: 0, shield: 0 },
      });

      if (updatedProfile) {
        AuthenticationManager.getInstance().updateProfileLocally(updatedProfile);
      }

      this.lastSyncTimestamp = Date.now();
      return updatedProfile;
    } catch (err) {
      console.warn('[CloudSaveManager] Sync progression error:', err);
      return null;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Save level run completion or milestone to cloud in a non-blocking background task.
   */
  public async recordLevelRun(record: LevelRunRecord): Promise<boolean> {
    const authState = AuthenticationManager.getInstance().getState();
    if (!authState.isAuthenticated || !authState.user) {
      return false;
    }

    try {
      const { SupabaseService } = await import('./supabaseClient');
      const client = SupabaseService.getInstance().getClient();
      if (!client) return false;

      const payload = {
        user_id: authState.user.id,
        run_id: record.run_id,
        level_id: record.level_id,
        score: Math.max(0, record.score),
        distance: Math.max(0, Math.round(record.distance * 10) / 10),
        duration_seconds: Math.min(300, Math.max(0, Math.round(record.duration_seconds))),
        coins_collected: Math.max(0, record.coins_collected),
        enemies_defeated: Math.max(0, record.enemies_defeated),
        completed: Boolean(record.completed),
      };

      const { error } = await client.from('level_runs').insert(payload);
      if (error) {
        // If unique constraint run_id was already inserted, it's idempotent
        if (error.code === '23505') {
          return true;
        }
        console.warn('[CloudSaveManager] Failed to record level run:', error.message);
        return false;
      }

      // Update aggregate profile stats in background
      await this.syncProgression();
      return true;
    } catch (err) {
      console.warn('[CloudSaveManager] Exception recording level run:', err);
      return false;
    }
  }

  public getLastSyncTimestamp(): number {
    return this.lastSyncTimestamp;
  }
}
