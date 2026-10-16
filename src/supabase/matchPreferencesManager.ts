/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SupabaseService } from './supabaseClient';
import { AuthenticationManager } from './authManager';
import { MatchPreferences } from './types';
import { SupabaseErrorHandler } from './supabaseErrorHandler';

const STORAGE_KEY_PREFERENCES = 'prince_princess_match_preferences';

export class MatchPreferencesManager {
  private static instance: MatchPreferencesManager | null = null;
  private currentPreferences: MatchPreferences | null = null;
  private listeners: Set<(prefs: MatchPreferences | null) => void> = new Set();
  private isLoadedFromDb = false;

  private constructor() {
    this.loadFromStorage();

    // Listen for auth state changes to load preferences from Supabase
    AuthenticationManager.getInstance().subscribe(async (authState) => {
      if (authState.isAuthenticated && authState.user?.id) {
        await this.fetchPreferences(authState.user.id);
      } else if (!authState.isAuthenticated) {
        this.isLoadedFromDb = false;
      }
    });
  }

  public static getInstance(): MatchPreferencesManager {
    if (!MatchPreferencesManager.instance) {
      MatchPreferencesManager.instance = new MatchPreferencesManager();
    }
    return MatchPreferencesManager.instance;
  }

  private loadFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY_PREFERENCES);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.seeking_preferences) {
            this.currentPreferences = parsed as MatchPreferences;
            return;
          }
        }
      }
    } catch (e) {
      console.warn('[MatchPreferencesManager] LocalStorage read error:', e);
    }
    this.currentPreferences = null;
  }

  private saveToStorage(data: MatchPreferences): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_PREFERENCES, JSON.stringify(data));
      }
    } catch (e) {
      console.warn('[MatchPreferencesManager] LocalStorage write error:', e);
    }
    this.currentPreferences = data;
    this.notify();
  }

  public getPreferences(): MatchPreferences | null {
    if (!this.currentPreferences) {
      this.loadFromStorage();
    }
    return this.currentPreferences;
  }

  public hasCompletedPreferences(): boolean {
    const prefs = this.getPreferences();
    return Boolean(prefs && prefs.seeking_preferences && prefs.discovery_scope);
  }

  /**
   * Validate preferences before database persistence.
   * Returns null if valid, or a descriptive error message.
   */
  public validatePreferences(
    prefs: Partial<MatchPreferences>
  ): string | null {
    if (!prefs.seeking_preferences || !['PRINCESS', 'PRINCE', 'ALL'].includes(prefs.seeking_preferences)) {
      return 'Please choose who you would like to meet (Princess, Prince, or Anyone).';
    }

    if (!prefs.any_eligible_adult_age) {
      if (prefs.min_age === undefined || prefs.min_age === null || prefs.min_age < 18) {
        return 'Minimum age must be at least 18 (romantic discovery is strictly adult-only).';
      }
      if (prefs.max_age === undefined || prefs.max_age === null || prefs.max_age > 120) {
        return 'Maximum age must be a valid adult age (up to 120).';
      }
      if (prefs.min_age > prefs.max_age) {
        return 'Minimum age cannot exceed maximum age.';
      }
    }

    if (!prefs.religion_preference_type || !['ANY', 'SAME', 'SPECIFIC', 'NO_PREFERENCE'].includes(prefs.religion_preference_type)) {
      return 'Please select a religion preference option.';
    }

    if (prefs.religion_preference_type === 'SPECIFIC') {
      if (!prefs.preferred_religions || prefs.preferred_religions.length === 0) {
        return 'Please choose at least one specific religion, or select "Any religion".';
      }
    }

    if (!prefs.discovery_scope || !['GLOBAL', 'SAME_COUNTRY', 'SELECTED_COUNTRY', 'NEARBY'].includes(prefs.discovery_scope)) {
      return 'Please select where you would like to find someone.';
    }

    if (prefs.discovery_scope === 'SELECTED_COUNTRY') {
      if (!prefs.selected_country_code || prefs.selected_country_code.trim().length === 0) {
        return 'Please select a specific country code for your country preference.';
      }
    }

    return null;
  }

  /**
   * Fetch preferences from Supabase database for the given user ID.
   */
  public async fetchPreferences(userId: string): Promise<MatchPreferences | null> {
    const client = SupabaseService.getInstance().getClient();
    if (!client || !userId) {
      return this.getPreferences();
    }

    try {
      const { data, error } = await client
        .from('match_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[MatchPreferencesManager] DB fetch error:', error.message);
        return this.getPreferences();
      }

      if (data) {
        const parsed: MatchPreferences = {
          id: data.id,
          user_id: data.user_id,
          seeking_preferences: data.seeking_preferences,
          min_age: data.min_age,
          max_age: data.max_age,
          any_eligible_adult_age: Boolean(data.any_eligible_adult_age),
          religion_preference_type: data.religion_preference_type,
          preferred_religions: Array.isArray(data.preferred_religions) ? data.preferred_religions : [],
          discovery_scope: data.discovery_scope,
          selected_country_code: data.selected_country_code,
          additional_preferences: Array.isArray(data.additional_preferences) ? data.additional_preferences : [],
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        this.isLoadedFromDb = true;
        this.saveToStorage(parsed);
        return parsed;
      }
    } catch (err) {
      console.warn('[MatchPreferencesManager] Network exception fetching preferences:', err);
    }

    return this.getPreferences();
  }

  /**
   * Save or update match preferences in Supabase and local cache.
   * Enforces validation, real authenticated user ID, and reports real errors without fake success.
   */
  public async savePreferences(
    prefsInput: Omit<MatchPreferences, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ success: boolean; data?: MatchPreferences; error?: string }> {
    // 1. Validate payload
    const validationError = this.validatePreferences(prefsInput);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // 2. Ensure real authenticated Supabase user
    const authMgr = AuthenticationManager.getInstance();
    let authState = authMgr.getState();

    if (!authState.isAuthenticated || !authState.user?.id) {
      // Sign in anonymously to get real auth.users ID if guest
      const signInRes = await authMgr.signInAnonymously();
      authState = authMgr.getState();
      if (!authState.isAuthenticated || !authState.user?.id) {
        // Fallback: save locally but inform user
        const localOnly: MatchPreferences = {
          ...prefsInput,
          user_id: prefsInput.user_id || 'guest_local',
          updated_at: new Date().toISOString(),
        };
        this.saveToStorage(localOnly);
        return {
          success: false,
          error: signInRes.error || 'Unable to establish authenticated cloud session with Supabase.',
        };
      }
    }

    const realUserId = authState.user.id;

    // 3. Prepare payload with real user ID
    const payload = {
      user_id: realUserId,
      seeking_preferences: prefsInput.seeking_preferences,
      min_age: prefsInput.any_eligible_adult_age ? null : prefsInput.min_age,
      max_age: prefsInput.any_eligible_adult_age ? null : prefsInput.max_age,
      any_eligible_adult_age: prefsInput.any_eligible_adult_age,
      religion_preference_type: prefsInput.religion_preference_type,
      preferred_religions: prefsInput.preferred_religions || [],
      discovery_scope: prefsInput.discovery_scope,
      selected_country_code: prefsInput.discovery_scope === 'SELECTED_COUNTRY' ? prefsInput.selected_country_code : null,
      additional_preferences: prefsInput.additional_preferences || [],
      updated_at: new Date().toISOString(),
    };

    const client = SupabaseService.getInstance().getClient();
    if (!client) {
      // Supabase client not initialized
      const localOnly: MatchPreferences = {
        ...payload,
        updated_at: new Date().toISOString(),
      };
      this.saveToStorage(localOnly);
      return {
        success: false,
        error: 'Supabase client is not configured. Saved to local device only.',
      };
    }

    try {
      const { data, error } = await client
        .from('match_preferences')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        console.error('[MatchPreferencesManager] Supabase upsert error:', error);
        // Save locally to preserve user input for retry
        this.saveToStorage({
          ...payload,
          updated_at: new Date().toISOString(),
        });
        const formattedErr = SupabaseErrorHandler.formatError(error, 'Match Preferences Save');
        return { success: false, error: formattedErr };
      }

      const savedRecord: MatchPreferences = {
        id: data.id,
        user_id: data.user_id,
        seeking_preferences: data.seeking_preferences,
        min_age: data.min_age,
        max_age: data.max_age,
        any_eligible_adult_age: Boolean(data.any_eligible_adult_age),
        religion_preference_type: data.religion_preference_type,
        preferred_religions: data.preferred_religions || [],
        discovery_scope: data.discovery_scope,
        selected_country_code: data.selected_country_code,
        additional_preferences: data.additional_preferences || [],
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      this.isLoadedFromDb = true;
      this.saveToStorage(savedRecord);
      return { success: true, data: savedRecord };
    } catch (err: unknown) {
      console.error('[MatchPreferencesManager] Network exception:', err);
      // Save locally to preserve user input
      this.saveToStorage({
        ...payload,
        updated_at: new Date().toISOString(),
      });
      const formattedErr = SupabaseErrorHandler.formatError(err, 'Match Preferences Network');
      return { success: false, error: formattedErr };
    }
  }

  public subscribe(listener: (prefs: MatchPreferences | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentPreferences);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentPreferences);
      } catch (err) {
        console.error('[MatchPreferencesManager] Listener error:', err);
      }
    }
  }
}
