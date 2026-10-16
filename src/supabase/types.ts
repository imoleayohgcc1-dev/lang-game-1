/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PlayerProfile {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  age?: number | null;
  country?: string | null;
  bio?: string | null;
  religion?: string | null;
  onboarding_completed?: boolean;
  profile_completed?: boolean;
  current_level: number;
  highest_unlocked_level: number;
  best_score: number;
  total_distance: number;
  total_enemies_defeated: number;
  total_coins_collected: number;
  upgrade_levels: {
    damage: number;
    health: number;
    bombs: number;
    shield: number;
    [key: string]: number;
  };
  created_at?: string;
  updated_at?: string;
}

export interface LevelRunRecord {
  id?: string;
  user_id?: string;
  run_id: string;
  level_id: number;
  score: number;
  distance: number;
  duration_seconds: number;
  coins_collected: number;
  enemies_defeated: number;
  completed: boolean;
  created_at?: string;
}

export interface PresencePlayer {
  user_id: string;
  display_name: string;
  current_level: number;
  status: 'LOBBY' | 'RUNNING' | 'PAUSED' | 'GAME_OVER';
  updated_at: number;
}

export interface ChatConversation {
  id: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface UserReport {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details?: string;
  created_at: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  source: 'env' | 'server' | 'storage' | 'none';
}

export interface AuthState {
  isAuthenticated: boolean;
  isAnonymous: boolean;
  user: {
    id: string;
    email?: string;
  } | null;
  profile: PlayerProfile | null;
  loading: boolean;
  error: string | null;
}

// ==============================================================================
// PHASE 2: MATCH PREFERENCES AND DISCOVERY SETTINGS
// ==============================================================================
export type SeekingPreference = 'PRINCESS' | 'PRINCE' | 'ALL';
export type ReligionPreferenceType = 'ANY' | 'SAME' | 'SPECIFIC' | 'NO_PREFERENCE';
export type DiscoveryScope = 'GLOBAL' | 'SAME_COUNTRY' | 'SELECTED_COUNTRY' | 'NEARBY';
export type AdditionalPreferenceItem = 'SIMILAR_INTERESTS' | 'SIMILAR_INTENTIONS' | 'RECENTLY_ACTIVE';

export interface MatchPreferences {
  id?: string;
  user_id: string;
  seeking_preferences: SeekingPreference;
  min_age: number | null;
  max_age: number | null;
  any_eligible_adult_age: boolean;
  religion_preference_type: ReligionPreferenceType;
  preferred_religions: string[];
  discovery_scope: DiscoveryScope;
  selected_country_code: string | null;
  additional_preferences: AdditionalPreferenceItem[];
  created_at?: string;
  updated_at?: string;
}

// ==============================================================================
// PHASE 3: REAL PLAYER PROFILES & DISCOVERY FEED
// ==============================================================================
export interface DiscoveredPlayer {
  id: string;
  display_name: string;
  avatar_url: string | null;
  age: number | null;
  country: string | null;
  bio: string | null;
  religion: string | null;
  current_level: number;
  highest_unlocked_level: number;
  best_score: number;
  total_distance: number;
  total_enemies_defeated: number;
  isOnline: boolean;
  onlineStatus?: 'LOBBY' | 'RUNNING' | 'PAUSED' | 'GAME_OVER' | 'OFFLINE';
  onlineLevel?: number;
  lastSeen?: string;
  compatibilityScore?: number;
  compatibilityTags?: string[];
  activeLabel?: string;
  activityBucket?: number;
}

export interface DiscoveryFilterOverrides {
  seeking?: SeekingPreference;
  minAge?: number;
  maxAge?: number;
  anyAdultAge?: boolean;
  scope?: DiscoveryScope;
  countryCode?: string;
  religion?: string;
  onlyOnline?: boolean;
  searchQuery?: string;
}

export interface DiscoveryAccessCheck {
  canAccess: boolean;
  isAdult: boolean;
  hasReachedLevel4: boolean;
  hasCompletedPreferences: boolean;
  hasCompletedProfile: boolean;
  isAuthenticated?: boolean;
  reason?: string;
  lockType?: 'UNDERAGE' | 'LEVEL_LOCKED' | 'PROFILE_INCOMPLETE' | 'PREFERENCES_INCOMPLETE' | 'AUTH_REQUIRED';
}

export interface FetchRealPlayersResult {
  players: DiscoveredPlayer[];
  error: string | null;
  errorCode?: string | null;
  isMigrationRequired?: boolean;
  totalRealUsersInDb: number;
}

// ==============================================================================
// PHASE 4: CHAT INVITATIONS, NOTIFICATIONS & LEVEL-GATED ACCESS
// ==============================================================================
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

export interface ChatInvitation {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: InvitationStatus;
  created_at: string;
  updated_at: string;
  responded_at?: string | null;
  expires_at: string;
  cancelled_at?: string | null;
  is_read: boolean;
  sender_profile?: {
    display_name: string;
    avatar_url?: string | null;
    age?: number | null;
    country?: string | null;
    bio?: string | null;
    religion?: string | null;
    highest_unlocked_level?: number;
  };
  recipient_profile?: {
    display_name: string;
    avatar_url?: string | null;
    age?: number | null;
    country?: string | null;
    bio?: string | null;
    religion?: string | null;
    highest_unlocked_level?: number;
  };
}

export interface InvitationNotification {
  invitationId: string;
  senderId: string;
  senderName?: string;
  isLevelGated: boolean;
  message: string;
  createdAt: string;
  isRead: boolean;
}

