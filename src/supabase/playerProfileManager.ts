/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SupabaseService } from './supabaseClient';
import { PlayerProfile } from './types';
import { SupabaseErrorHandler } from './supabaseErrorHandler';

export class PlayerProfileManager {
  private static instance: PlayerProfileManager | null = null;

  public static getInstance(): PlayerProfileManager {
    if (!PlayerProfileManager.instance) {
      PlayerProfileManager.instance = new PlayerProfileManager();
    }
    return PlayerProfileManager.instance;
  }

  public async fetchProfile(userId: string): Promise<PlayerProfile | null> {
    const client = SupabaseService.getInstance().getClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[PlayerProfileManager] Error fetching profile:', error.message);
        return null;
      }

      return data as PlayerProfile | null;
    } catch (err) {
      console.warn('[PlayerProfileManager] Network error fetching profile:', err);
      return null;
    }
  }

  public async createOrUpdateProfile(
    profileData: Partial<PlayerProfile> & { id: string }
  ): Promise<PlayerProfile | null> {
    const client = SupabaseService.getInstance().getClient();
    if (!client) return null;

    try {
      const payload: Record<string, any> = {
        id: profileData.id,
        display_name: profileData.display_name || 'Runner',
        avatar_url: profileData.avatar_url !== undefined ? profileData.avatar_url : null,
        current_level: profileData.current_level || 1,
        highest_unlocked_level: profileData.highest_unlocked_level || 1,
        best_score: profileData.best_score || 0,
        total_distance: profileData.total_distance || 0,
        total_enemies_defeated: profileData.total_enemies_defeated || 0,
        total_coins_collected: profileData.total_coins_collected || 0,
        upgrade_levels: profileData.upgrade_levels || {
          damage: 0,
          health: 0,
          bombs: 0,
          shield: 0,
        },
        updated_at: new Date().toISOString(),
      };

      if (profileData.age !== undefined) payload.age = profileData.age;
      if (profileData.country !== undefined) payload.country = profileData.country;
      if (profileData.bio !== undefined) payload.bio = profileData.bio;
      if (profileData.religion !== undefined) payload.religion = profileData.religion;
      if (profileData.onboarding_completed !== undefined) payload.onboarding_completed = profileData.onboarding_completed;
      if (profileData.profile_completed !== undefined) payload.profile_completed = profileData.profile_completed;

      const { data, error } = await client
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        throw new Error(SupabaseErrorHandler.formatError(error, 'Profile update'));
      }

      return data as PlayerProfile;
    } catch (err) {
      console.warn('[PlayerProfileManager] Profile upsert error:', err);
      return null;
    }
  }

  public async updateProfileStats(
    userId: string,
    updates: Partial<PlayerProfile>
  ): Promise<PlayerProfile | null> {
    const client = SupabaseService.getInstance().getClient();
    if (!client) return null;

    try {
      const payload = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await client
        .from('profiles')
        .update(payload)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.warn('[PlayerProfileManager] Failed to update stats:', error.message);
        return null;
      }

      return data as PlayerProfile;
    } catch (err) {
      console.warn('[PlayerProfileManager] Exception updating stats:', err);
      return null;
    }
  }
}
