/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SupabaseService } from './supabaseClient';
import { AuthenticationManager } from './authManager';
import { OnboardingManager } from './onboardingManager';
import { MatchPreferencesManager } from './matchPreferencesManager';
import { OnlinePresenceManager } from './onlinePresenceManager';
import { LEVEL_PROGRESS_STORAGE_KEY } from '../game/levels/levelConfig';
import {
  DiscoveredPlayer,
  DiscoveryFilterOverrides,
  DiscoveryAccessCheck,
  FetchRealPlayersResult,
  MatchPreferences,
  PlayerProfile,
} from './types';

export class DiscoveryManager {
  private static instance: DiscoveryManager | null = null;
  private cachedPlayers: DiscoveredPlayer[] = [];
  private lastFetchTime: number = 0;
  private isFetching: boolean = false;

  public static getInstance(): DiscoveryManager {
    if (!DiscoveryManager.instance) {
      DiscoveryManager.instance = new DiscoveryManager();
    }
    return DiscoveryManager.instance;
  }

  /**
   * Evaluates whether the current player is permitted to access the Discovery interface.
   * Enforces authenticated session, adult-only (18+) romantic discovery, and Level 4 progression gate.
   */
  public checkAccess(highestUnlockedLevel?: number, completedLevels?: number[]): DiscoveryAccessCheck {
    const auth = AuthenticationManager.getInstance().getState();
    const profile = OnboardingManager.getInstance().getProfile();
    const hasCompletedProfile = OnboardingManager.getInstance().isProfileCompleted();
    const hasCompletedPreferences = MatchPreferencesManager.getInstance().hasCompletedPreferences();

    // 1. Session Verification
    const isAuthenticated = Boolean(
      (auth.isAuthenticated && auth.user?.id) ||
      (profile && profile.displayName && profile.displayName.trim().length >= 2)
    );
    if (!isAuthenticated) {
      return {
        canAccess: false,
        isAdult: false,
        hasReachedLevel4: false,
        hasCompletedPreferences,
        hasCompletedProfile,
        isAuthenticated: false,
        lockType: 'AUTH_REQUIRED',
        reason: 'Please complete your player onboarding to discover real princes and princesses and send chat invitations.',
      };
    }

    // 2. Age Verification (Strictly 18+)
    const age = profile?.age;
    const isAdult = typeof age === 'number' && age >= 18;

    if (age !== null && age !== undefined && age < 18) {
      return {
        canAccess: false,
        isAdult: false,
        hasReachedLevel4: false,
        hasCompletedPreferences,
        hasCompletedProfile,
        isAuthenticated: true,
        lockType: 'UNDERAGE',
        reason: 'Romantic discovery is strictly reserved for adult players aged 18 and older.',
      };
    }

    if (!profile?.displayName || age === null || age === undefined) {
      return {
        canAccess: false,
        isAdult: false,
        hasReachedLevel4: false,
        hasCompletedPreferences,
        hasCompletedProfile,
        isAuthenticated: true,
        lockType: 'PROFILE_INCOMPLETE',
        reason: 'Please complete the player onboarding questions first.',
      };
    }

    // 3. Profile Completion Gate (Phase 1 after Level 1)
    if (!hasCompletedProfile) {
      return {
        canAccess: false,
        isAdult,
        hasReachedLevel4: false,
        hasCompletedPreferences,
        hasCompletedProfile: false,
        isAuthenticated: true,
        lockType: 'PROFILE_INCOMPLETE',
        reason: 'Please complete your royal profile (photo, bio, religion) after completing Level 1.',
      };
    }

    // 4. Match Preferences Gate (Phase 2)
    if (!hasCompletedPreferences) {
      return {
        canAccess: false,
        isAdult,
        hasReachedLevel4: false,
        hasCompletedPreferences: false,
        hasCompletedProfile: true,
        isAuthenticated: true,
        lockType: 'PREFERENCES_INCOMPLETE',
        reason: 'Please set your romantic discovery preferences before viewing player profiles.',
      };
    }

    // 5. Level Progression Gate (Level 4 required)
    // Inspect passed arguments, localStorage, and cloud save data
    let maxLevel = highestUnlockedLevel || 1;
    if (completedLevels && (completedLevels.includes(3) || completedLevels.some((l) => l >= 3))) {
      maxLevel = Math.max(maxLevel, 4);
    }

    try {
      if (typeof localStorage !== 'undefined') {
        // Primary action runner storage key
        const stored = localStorage.getItem(LEVEL_PROGRESS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const unlocked: number[] = Array.isArray(parsed.unlockedLevels) ? parsed.unlockedLevels : [1];
          const completed: number[] = Array.isArray(parsed.completedLevels) ? parsed.completedLevels : [];
          const highestFromStorage = Math.max(...unlocked, completed.includes(3) ? 4 : 1, 1);
          maxLevel = Math.max(maxLevel, highestFromStorage);
        }

        // Fallback storage key
        const storedFallback = localStorage.getItem('prince_princess_level_progress_v1');
        if (storedFallback) {
          const parsed = JSON.parse(storedFallback);
          const unlocked: number[] = Array.isArray(parsed.unlockedLevels) ? parsed.unlockedLevels : [1];
          const completed: number[] = Array.isArray(parsed.completedLevels) ? parsed.completedLevels : [];
          const highestFromStorage = Math.max(...unlocked, completed.includes(3) ? 4 : 1, 1);
          maxLevel = Math.max(maxLevel, highestFromStorage);
        }
      }
    } catch {
      // Ignore localStorage read errors
    }

    // Also inspect authenticated cloud profile stats
    const cloudLevel = Math.max(
      auth.profile?.highest_unlocked_level || 1,
      auth.profile?.current_level || 1
    );
    maxLevel = Math.max(maxLevel, cloudLevel);

    const hasReachedLevel4 = maxLevel >= 4;

    if (!hasReachedLevel4) {
      return {
        canAccess: false,
        isAdult,
        hasReachedLevel4: false,
        hasCompletedPreferences: true,
        hasCompletedProfile: true,
        isAuthenticated: true,
        lockType: 'LEVEL_LOCKED',
        reason: 'Royal Discovery unlocks once you reach Level 4! Complete Levels 1, 2, and 3 to discover real players.',
      };
    }

    return {
      canAccess: true,
      isAdult: true,
      hasReachedLevel4: true,
      hasCompletedPreferences: true,
      hasCompletedProfile: true,
      isAuthenticated: true,
    };
  }

  /**
   * Fetches real registered player profiles.
   * Strictly queries real registered players. Never fabricates fake players or placeholder bots.
   * Prioritizes feed in mandatory order:
   * 1. Online now
   * 2. Active within 5 minutes
   * 3. Active within 10 minutes
   * 4. Active within 30 minutes
   * 5. Other eligible people active longer ago
   */
  public async fetchRealPlayers(
    filterOverrides?: DiscoveryFilterOverrides,
    highestUnlockedLevel?: number,
    completedLevels?: number[]
  ): Promise<FetchRealPlayersResult> {
    if (this.isFetching) {
      return {
        players: this.cachedPlayers,
        error: null,
        totalRealUsersInDb: this.cachedPlayers.length,
      };
    }

    // 1. Check gate access (18+, Level 4, Onboarding & Preferences)
    const access = this.checkAccess(highestUnlockedLevel, completedLevels);
    if (!access.canAccess) {
      return {
        players: [],
        error: access.reason || 'Discovery interface is currently locked.',
        errorCode: access.lockType,
        totalRealUsersInDb: 0,
      };
    }

    this.isFetching = true;
    const authState = AuthenticationManager.getInstance().getState();
    const myProfile = OnboardingManager.getInstance().getProfile();
    const savedPrefs = MatchPreferencesManager.getInstance().getPreferences();
    const currentUserId = authState.user?.id || myProfile?.userId || 'current-player';

    // 2. Ensure current player's latest profile is registered in directory
    if (myProfile) {
      fetch('/api/discovery/sync-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            id: currentUserId,
            display_name: myProfile.displayName,
            age: myProfile.age,
            country: myProfile.country,
            avatar_url: myProfile.avatarUrl || null,
            bio: myProfile.bio || null,
            religion: myProfile.religion || null,
            current_level: highestUnlockedLevel || 1,
            highest_unlocked_level: highestUnlockedLevel || 1,
            onboarding_completed: true,
            profile_completed: true,
          },
        }),
      }).catch(() => {});
    }

    try {
      // 3. Determine active filter parameters
      const seeking = filterOverrides?.seeking ?? savedPrefs?.seeking_preferences ?? 'ALL';
      const anyAdultAge = filterOverrides?.anyAdultAge ?? savedPrefs?.any_eligible_adult_age ?? false;
      const minAge = filterOverrides?.minAge ?? (anyAdultAge ? 18 : (savedPrefs?.min_age ?? 18));
      const maxAge = filterOverrides?.maxAge ?? (anyAdultAge ? 120 : (savedPrefs?.max_age ?? 120));
      const scope = filterOverrides?.scope ?? savedPrefs?.discovery_scope ?? 'GLOBAL';
      const religionPref = filterOverrides?.religion ?? (savedPrefs?.religion_preference_type || 'ANY');
      const onlyOnline = filterOverrides?.onlyOnline ?? false;
      const searchQuery = filterOverrides?.searchQuery?.toLowerCase().trim() || '';

      const queryParams = new URLSearchParams({
        userId: currentUserId,
        seeking,
        minAge: String(minAge),
        maxAge: String(maxAge),
        scope,
        myCountry: myProfile?.country || '',
        religion: religionPref,
        myReligion: myProfile?.religion || '',
        searchQuery,
        onlyOnline: String(onlyOnline),
      });

      // 4. Query server real player directory
      const res = await fetch(`/api/discovery/players?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error('Player directory service returned an error');
      }

      const data = await res.json();
      if (!data.success || !Array.isArray(data.players)) {
        throw new Error(data.error || 'Failed to parse player profiles');
      }

      // 5. Merge realtime presence state
      const onlinePlayers = OnlinePresenceManager.getInstance().getOnlinePlayers();
      const onlineSet = new Set(onlinePlayers.map((p) => p.user_id));

      const now = Date.now();
      const enriched: DiscoveredPlayer[] = data.players.map((p: any) => {
        const isOnlinePresence = onlineSet.has(p.id) || p.isOnline;
        const updatedMs = p.updated_at ? new Date(p.updated_at).getTime() : 0;
        const diffSec = Math.max(0, Math.floor((now - updatedMs) / 1000));

        let activityBucket = p.activityBucket ?? 4;
        let activeLabel = p.activeLabel || 'Active earlier';

        if (isOnlinePresence || diffSec <= 90) {
          activityBucket = 0;
          activeLabel = 'Online Now';
        } else if (diffSec <= 300) {
          activityBucket = 1;
          const mins = Math.max(1, Math.floor(diffSec / 60));
          activeLabel = `Active ${mins}m ago`;
        } else if (diffSec <= 600) {
          activityBucket = 2;
          const mins = Math.floor(diffSec / 60);
          activeLabel = `Active ${mins}m ago`;
        } else if (diffSec <= 1800) {
          activityBucket = 3;
          const mins = Math.floor(diffSec / 60);
          activeLabel = `Active ${mins}m ago`;
        } else {
          activityBucket = 4;
          const hours = Math.floor(diffSec / 3600);
          activeLabel = hours > 0 ? `Active ${hours}h ago` : 'Active earlier';
        }

        return {
          id: p.id,
          display_name: p.display_name,
          avatar_url: p.avatar_url || null,
          age: p.age,
          country: p.country || null,
          bio: p.bio || null,
          religion: p.religion || null,
          current_level: p.current_level || 1,
          highest_unlocked_level: p.highest_unlocked_level || 1,
          best_score: p.best_score || 0,
          total_distance: p.total_distance || 0,
          total_enemies_defeated: p.total_enemies_defeated || 0,
          isOnline: isOnlinePresence,
          onlineStatus: isOnlinePresence ? 'LOBBY' : 'OFFLINE',
          onlineLevel: p.current_level || 1,
          lastSeen: p.updated_at || undefined,
          compatibilityScore: p.compatibilityScore || 80,
          compatibilityTags: p.compatibilityTags || [],
          activityBucket,
          activeLabel,
        };
      });

      // 6. MANDATORY PRIORITIZATION SORTING:
      // 1. Online now (Bucket 0)
      // 2. Active within 5 minutes (Bucket 1)
      // 3. Active within 10 minutes (Bucket 2)
      // 4. Active within 30 minutes (Bucket 3)
      // 5. Older (Bucket 4)
      enriched.sort((a, b) => {
        const bucketA = a.activityBucket ?? (a.isOnline ? 0 : 4);
        const bucketB = b.activityBucket ?? (b.isOnline ? 0 : 4);
        if (bucketA !== bucketB) {
          return bucketA - bucketB;
        }
        const timeA = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
        const timeB = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
        if (timeB !== timeA) {
          return timeB - timeA;
        }
        return (b.compatibilityScore || 0) - (a.compatibilityScore || 0);
      });

      this.cachedPlayers = enriched;
      this.lastFetchTime = Date.now();

      return {
        players: enriched,
        error: null,
        totalRealUsersInDb: data.totalRealUsersInDb || enriched.length,
      };
    } catch (err: unknown) {
      console.warn('[DiscoveryManager] Error querying real players:', err);
      // Clean player-facing error without technical details or SQL messages
      return {
        players: [],
        error: 'Unable to connect to the player directory. Please tap Try Again.',
        totalRealUsersInDb: 0,
      };
    } finally {
      this.isFetching = false;
    }
  }

  public getCachedPlayers(): DiscoveredPlayer[] {
    return this.cachedPlayers;
  }
}
