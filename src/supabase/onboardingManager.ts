/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthenticationManager } from './authManager';
import { PlayerProfileManager } from './playerProfileManager';
import { PlayerProfile } from './types';

export interface OnboardingData {
  displayName: string;
  age: number;
  country: string;
  avatarUrl?: string | null;
  bio?: string | null;
  religion?: string | null;
  onboardingCompleted: boolean;
  profileCompleted: boolean;
  userId?: string;
  updatedAt?: string;
}

const STORAGE_KEY_ONBOARDING = 'prince_princess_player_profile';

export class OnboardingManager {
  private static instance: OnboardingManager | null = null;
  private currentProfile: OnboardingData | null = null;
  private listeners: Set<(profile: OnboardingData | null) => void> = new Set();

  private constructor() {
    this.loadFromStorage();
    // Listen for auth changes to sync Supabase profile if available
    AuthenticationManager.getInstance().subscribe((authState) => {
      if (authState.profile) {
        this.mergeFromSupabaseProfile(authState.profile);
      }
    });
  }

  public static getInstance(): OnboardingManager {
    if (!OnboardingManager.instance) {
      OnboardingManager.instance = new OnboardingManager();
    }
    return OnboardingManager.instance;
  }

  private loadFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY_ONBOARDING);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.displayName === 'string' && parsed.displayName.trim().length > 0) {
            this.currentProfile = {
              displayName: parsed.displayName.trim(),
              age: typeof parsed.age === 'number' ? parsed.age : 21,
              country: parsed.country || 'Global',
              avatarUrl: parsed.avatarUrl || null,
              bio: parsed.bio || null,
              religion: parsed.religion || null,
              onboardingCompleted: Boolean(parsed.onboardingCompleted),
              profileCompleted: Boolean(parsed.profileCompleted),
              userId: parsed.userId,
              updatedAt: parsed.updatedAt || new Date().toISOString(),
            };
            return;
          }
        }
      }
    } catch (e) {
      console.warn('[OnboardingManager] Error reading local profile:', e);
    }
    this.currentProfile = null;
  }

  private saveToStorage(data: OnboardingData): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_ONBOARDING, JSON.stringify(data));
      }
    } catch (e) {
      console.warn('[OnboardingManager] Error writing local profile:', e);
    }
    this.currentProfile = data;
    this.notify();
  }

  public getProfile(): OnboardingData | null {
    if (!this.currentProfile) {
      this.loadFromStorage();
    }
    return this.currentProfile;
  }

  public isOnboardingCompleted(): boolean {
    const p = this.getProfile();
    return Boolean(p && p.onboardingCompleted && p.displayName && p.displayName.trim().length >= 2);
  }

  public isProfileCompleted(): boolean {
    const p = this.getProfile();
    return Boolean(p && p.profileCompleted);
  }

  public async saveOnboarding(
    displayName: string,
    age: number,
    country: string
  ): Promise<OnboardingData> {
    const trimmedName = displayName.trim();
    const existing = this.getProfile();

    const updatedData: OnboardingData = {
      displayName: trimmedName,
      age: Math.max(10, Math.min(120, age)),
      country: country.trim() || 'Global',
      avatarUrl: existing?.avatarUrl || null,
      bio: existing?.bio || null,
      religion: existing?.religion || null,
      onboardingCompleted: true,
      profileCompleted: existing?.profileCompleted || false,
      userId: existing?.userId,
      updatedAt: new Date().toISOString(),
    };

    // Save locally immediately
    this.saveToStorage(updatedData);

    // Sync to server discovery store
    this.syncToServer(updatedData).catch(() => {});

    // Sync to Supabase in non-blocking background
    this.syncToSupabase(updatedData).catch((err) => {
      console.warn('[OnboardingManager] Background Supabase sync failed (offline fallback active):', err);
    });

    return updatedData;
  }

  public async saveSocialProfile(
    avatarUrl: string,
    bio: string,
    religion: string
  ): Promise<OnboardingData> {
    const existing = this.getProfile();
    const updatedData: OnboardingData = {
      displayName: existing?.displayName || 'Adventurer',
      age: existing?.age || 21,
      country: existing?.country || 'Global',
      avatarUrl: avatarUrl.trim() || null,
      bio: bio.trim() || null,
      religion: religion.trim() || 'Prefer not to say',
      onboardingCompleted: true,
      profileCompleted: true,
      userId: existing?.userId,
      updatedAt: new Date().toISOString(),
    };

    // Save locally immediately
    this.saveToStorage(updatedData);

    // Sync to server discovery store
    this.syncToServer(updatedData).catch(() => {});

    // Sync to Supabase in non-blocking background
    this.syncToSupabase(updatedData).catch((err) => {
      console.warn('[OnboardingManager] Background Supabase sync failed (offline fallback active):', err);
    });

    return updatedData;
  }

  public async syncToServer(data: OnboardingData): Promise<void> {
    try {
      await fetch('/api/discovery/sync-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            id: data.userId || 'current-player',
            display_name: data.displayName,
            age: data.age,
            country: data.country,
            avatar_url: data.avatarUrl || null,
            bio: data.bio || null,
            religion: data.religion || null,
            onboarding_completed: data.onboardingCompleted,
            profile_completed: data.profileCompleted,
          },
        }),
      });
    } catch {
      // Non-blocking
    }
  }

  private async syncToSupabase(data: OnboardingData): Promise<void> {
    const authMgr = AuthenticationManager.getInstance();
    let authState = authMgr.getState();

    // If not authenticated yet, sign in anonymously to obtain a legitimate Supabase user ID
    if (!authState.isAuthenticated || !authState.user) {
      await authMgr.signInAnonymously();
      authState = authMgr.getState();
    }

    if (authState.user?.id) {
      data.userId = authState.user.id;
      this.saveToStorage({ ...data, userId: authState.user.id });
      this.syncToServer({ ...data, userId: authState.user.id }).catch(() => {});

      const profilePayload: Partial<PlayerProfile> & { id: string } = {
        id: authState.user.id,
        display_name: data.displayName,
        age: data.age,
        country: data.country,
        avatar_url: data.avatarUrl || null,
        bio: data.bio || null,
        religion: data.religion || null,
        onboarding_completed: data.onboardingCompleted,
        profile_completed: data.profileCompleted,
      };

      await PlayerProfileManager.getInstance().createOrUpdateProfile(profilePayload);
    }
  }

  private mergeFromSupabaseProfile(profile: PlayerProfile): void {
    if (!profile) return;
    const existing = this.getProfile();
    const merged: OnboardingData = {
      displayName: profile.display_name || existing?.displayName || 'Runner',
      age: profile.age ?? existing?.age ?? 21,
      country: profile.country || existing?.country || 'Global',
      avatarUrl: profile.avatar_url || existing?.avatarUrl || null,
      bio: profile.bio || existing?.bio || null,
      religion: profile.religion || existing?.religion || null,
      onboardingCompleted: profile.onboarding_completed ?? existing?.onboardingCompleted ?? true,
      profileCompleted: profile.profile_completed ?? existing?.profileCompleted ?? false,
      userId: profile.id,
      updatedAt: profile.updated_at || new Date().toISOString(),
    };
    this.saveToStorage(merged);
  }

  public subscribe(listener: (profile: OnboardingData | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentProfile);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentProfile);
      } catch (err) {
        console.error('[OnboardingManager] Listener error:', err);
      }
    }
  }
}
