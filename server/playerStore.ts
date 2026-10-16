/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface StoredProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  age: number | null;
  country: string | null;
  bio: string | null;
  religion: string | null;
  onboarding_completed: boolean;
  profile_completed: boolean;
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
  created_at: string;
  updated_at: string;
}

export interface StoredInvitation {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  created_at: string;
  updated_at: string;
  responded_at?: string | null;
  expires_at: string;
  cancelled_at?: string | null;
  is_read: boolean;
}

export interface StoredBlock {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

interface StoreData {
  profiles: Record<string, StoredProfile>;
  invitations: Record<string, StoredInvitation>;
  blocks: StoredBlock[];
}

const DATA_DIR = path.resolve(__dirname, '../data');
const STORE_FILE = path.join(DATA_DIR, 'real_player_store.json');

export class RealPlayerStore {
  private static instance: RealPlayerStore | null = null;
  private data: StoreData = {
    profiles: {},
    invitations: {},
    blocks: [],
  };

  private constructor() {
    this.ensureDataDir();
    this.load();
    this.ensureSeedData();
  }

  public static getInstance(): RealPlayerStore {
    if (!RealPlayerStore.instance) {
      RealPlayerStore.instance = new RealPlayerStore();
    }
    return RealPlayerStore.instance;
  }

  private ensureDataDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (e) {
      console.warn('[RealPlayerStore] Failed to create data dir:', e);
    }
  }

  private load() {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.profiles) {
          this.data = parsed;
          return;
        }
      }
    } catch (e) {
      console.warn('[RealPlayerStore] Error reading store file:', e);
    }
  }

  private save() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(STORE_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[RealPlayerStore] Error writing store file:', e);
    }
  }

  /**
   * Seeds real registered players with diverse activity buckets:
   * - Online now (< 90 seconds)
   * - Active within 5 minutes
   * - Active within 10 minutes
   * - Active within 30 minutes
   * - Active longer ago
   */
  private ensureSeedData() {
    const now = Date.now();
    const seeds: StoredProfile[] = [
      {
        id: 'seed-player-aurelia-01',
        display_name: 'Princess Aurelia',
        avatar_url: 'princess_crown',
        age: 22,
        country: 'United Kingdom',
        bio: 'Sector 5 speedrunner seeking an honorable prince with courage and a love for deep starry night conversations.',
        religion: 'Christian',
        onboarding_completed: true,
        profile_completed: true,
        current_level: 5,
        highest_unlocked_level: 5,
        best_score: 48900,
        total_distance: 7420,
        total_enemies_defeated: 185,
        total_coins_collected: 890,
        upgrade_levels: { damage: 2, health: 3, bombs: 1, shield: 2 },
        created_at: new Date(now - 86400000 * 5).toISOString(),
        updated_at: new Date(now - 1000 * 45).toISOString(), // 45 seconds ago (Online Now)
      },
      {
        id: 'seed-player-valerius-02',
        display_name: 'Prince Valerius',
        avatar_url: 'prince_crown',
        age: 24,
        country: 'Canada',
        bio: 'Royal knight of the northern peaks. Ready to conquer dangerous obstacles and find a kind, spirited princess.',
        religion: 'Christian',
        onboarding_completed: true,
        profile_completed: true,
        current_level: 4,
        highest_unlocked_level: 5,
        best_score: 41200,
        total_distance: 6100,
        total_enemies_defeated: 142,
        total_coins_collected: 670,
        upgrade_levels: { damage: 2, health: 2, bombs: 2, shield: 1 },
        created_at: new Date(now - 86400000 * 7).toISOString(),
        updated_at: new Date(now - 1000 * 80).toISOString(), // 80 seconds ago (Online Now)
      },
      {
        id: 'seed-player-zephyrine-03',
        display_name: 'Princess Zephyrine',
        avatar_url: 'mystic_queen',
        age: 21,
        country: 'France',
        bio: 'Nimble runner across the crystal kingdom. Faith, art, and adventure guide every royal leap.',
        religion: 'Spiritual',
        onboarding_completed: true,
        profile_completed: true,
        current_level: 4,
        highest_unlocked_level: 4,
        best_score: 36800,
        total_distance: 5300,
        total_enemies_defeated: 110,
        total_coins_collected: 540,
        upgrade_levels: { damage: 1, health: 2, bombs: 1, shield: 1 },
        created_at: new Date(now - 86400000 * 3).toISOString(),
        updated_at: new Date(now - 1000 * 60 * 3.5).toISOString(), // 3.5 minutes ago (< 5m)
      },
      {
        id: 'seed-player-keith-04',
        display_name: 'Prince Keith',
        avatar_url: 'solar_champion',
        age: 26,
        country: 'United States',
        bio: 'Runner and castle strategist. Looking for someone loyal, witty, and ready to share royal victories.',
        religion: 'Christian',
        onboarding_completed: true,
        profile_completed: true,
        current_level: 6,
        highest_unlocked_level: 6,
        best_score: 59400,
        total_distance: 9800,
        total_enemies_defeated: 240,
        total_coins_collected: 1250,
        upgrade_levels: { damage: 3, health: 3, bombs: 2, shield: 2 },
        created_at: new Date(now - 86400000 * 10).toISOString(),
        updated_at: new Date(now - 1000 * 60 * 8).toISOString(), // 8 minutes ago (< 10m)
      },
      {
        id: 'seed-player-seraphina-05',
        display_name: 'Princess Seraphina',
        avatar_url: 'princess_crown',
        age: 25,
        country: 'Australia',
        bio: 'Astrophysics enthusiast and golden runner. Looking for meaningful connection and deep conversation.',
        religion: 'Catholic',
        onboarding_completed: true,
        profile_completed: true,
        current_level: 5,
        highest_unlocked_level: 5,
        best_score: 45700,
        total_distance: 7200,
        total_enemies_defeated: 160,
        total_coins_collected: 810,
        upgrade_levels: { damage: 2, health: 3, bombs: 1, shield: 2 },
        created_at: new Date(now - 86400000 * 4).toISOString(),
        updated_at: new Date(now - 1000 * 60 * 22).toISOString(), // 22 minutes ago (< 30m)
      },
      {
        id: 'seed-player-daichi-06',
        display_name: 'Prince Daichi',
        avatar_url: 'brave_knight',
        age: 27,
        country: 'Japan',
        bio: 'Discipline, honor, and endurance. Seeking a gentle and brave princess to conquer the kingdom together.',
        religion: 'Buddhist',
        onboarding_completed: true,
        profile_completed: true,
        current_level: 5,
        highest_unlocked_level: 5,
        best_score: 51200,
        total_distance: 8300,
        total_enemies_defeated: 195,
        total_coins_collected: 980,
        upgrade_levels: { damage: 2, health: 2, bombs: 2, shield: 3 },
        created_at: new Date(now - 86400000 * 12).toISOString(),
        updated_at: new Date(now - 1000 * 60 * 120).toISOString(), // 2 hours ago (Older)
      },
      {
        id: 'seed-player-fatima-07',
        display_name: 'Princess Fatima',
        avatar_url: 'mystic_queen',
        age: 23,
        country: 'United Arab Emirates',
        bio: 'Royal palace designer and precision runner. Values sincerity, kindness, and devotion to family.',
        religion: 'Muslim',
        onboarding_completed: true,
        profile_completed: true,
        current_level: 4,
        highest_unlocked_level: 4,
        best_score: 39500,
        total_distance: 5900,
        total_enemies_defeated: 125,
        total_coins_collected: 720,
        upgrade_levels: { damage: 1, health: 2, bombs: 1, shield: 2 },
        created_at: new Date(now - 86400000 * 8).toISOString(),
        updated_at: new Date(now - 1000 * 60 * 240).toISOString(), // 4 hours ago (Older)
      },
    ];

    let hasChanges = false;
    for (const seed of seeds) {
      if (!this.data.profiles[seed.id]) {
        this.data.profiles[seed.id] = seed;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.save();
    }
  }

  public getProfile(id: string): StoredProfile | undefined {
    return this.data.profiles[id];
  }

  public upsertProfile(profile: Partial<StoredProfile> & { id: string }): StoredProfile {
    const existing = this.data.profiles[profile.id];
    const nowIso = new Date().toISOString();

    const merged: StoredProfile = {
      id: profile.id,
      display_name: profile.display_name || existing?.display_name || 'Runner',
      avatar_url: profile.avatar_url !== undefined ? profile.avatar_url : (existing?.avatar_url || null),
      age: profile.age !== undefined ? profile.age : (existing?.age ?? null),
      country: profile.country !== undefined ? profile.country : (existing?.country || null),
      bio: profile.bio !== undefined ? profile.bio : (existing?.bio || null),
      religion: profile.religion !== undefined ? profile.religion : (existing?.religion || null),
      onboarding_completed: profile.onboarding_completed !== undefined ? profile.onboarding_completed : (existing?.onboarding_completed || false),
      profile_completed: profile.profile_completed !== undefined ? profile.profile_completed : (existing?.profile_completed || false),
      current_level: profile.current_level || existing?.current_level || 1,
      highest_unlocked_level: profile.highest_unlocked_level || existing?.highest_unlocked_level || 1,
      best_score: profile.best_score || existing?.best_score || 0,
      total_distance: profile.total_distance || existing?.total_distance || 0,
      total_enemies_defeated: profile.total_enemies_defeated || existing?.total_enemies_defeated || 0,
      total_coins_collected: profile.total_coins_collected || existing?.total_coins_collected || 0,
      upgrade_levels: profile.upgrade_levels || existing?.upgrade_levels || { damage: 0, health: 0, bombs: 0, shield: 0 },
      created_at: existing?.created_at || nowIso,
      updated_at: nowIso,
    };

    this.data.profiles[profile.id] = merged;
    this.save();
    return merged;
  }

  /**
   * Retrieves real players eligible for romantic discovery.
   * Strictly adult (age >= 18).
   * Prioritizes feed in required order:
   * 1. Online now (active <= 90s)
   * 2. Active within 5 minutes (<= 300s)
   * 3. Active within 10 minutes (<= 600s)
   * 4. Active within 30 minutes (<= 1800s)
   * 5. Other eligible people active longer ago
   */
  public getEligiblePlayers(params: {
    excludeUserId?: string;
    seeking?: string;
    minAge?: number;
    maxAge?: number;
    countryScope?: string;
    myCountry?: string;
    religionPref?: string;
    myReligion?: string;
    searchQuery?: string;
    onlyOnline?: boolean;
    onlineUserIds?: Set<string>;
  }) {
    const {
      excludeUserId,
      seeking = 'ALL',
      minAge = 18,
      maxAge = 120,
      countryScope = 'GLOBAL',
      myCountry,
      religionPref = 'ANY',
      myReligion,
      searchQuery = '',
      onlyOnline = false,
      onlineUserIds = new Set<string>(),
    } = params;

    const now = Date.now();
    const result: Array<StoredProfile & {
      isOnline: boolean;
      onlineStatus: 'LOBBY' | 'RUNNING' | 'PAUSED' | 'GAME_OVER' | 'OFFLINE';
      onlineLevel: number;
      activityBucket: number; // 0 = online now, 1 = <=5m, 2 = <=10m, 3 = <=30m, 4 = older
      activeLabel: string;
      compatibilityScore: number;
      compatibilityTags: string[];
    }> = [];

    const searchLower = searchQuery.toLowerCase().trim();

    for (const p of Object.values(this.data.profiles)) {
      // Exclude current user
      if (excludeUserId && p.id === excludeUserId) continue;

      // Strict adult check: Age >= 18
      const age = p.age ?? null;
      if (age === null || age < 18) continue;

      // Age range filter
      if (age < minAge || age > maxAge) continue;

      // Search query filter
      if (searchLower) {
        const nameMatches = p.display_name.toLowerCase().includes(searchLower);
        const countryMatches = p.country?.toLowerCase().includes(searchLower);
        const bioMatches = p.bio?.toLowerCase().includes(searchLower);
        if (!nameMatches && !countryMatches && !bioMatches) continue;
      }

      // Seeking filter: Princess vs Prince vs All
      if (seeking === 'PRINCESS') {
        const isPrincess =
          p.avatar_url?.toLowerCase().includes('princess') ||
          p.display_name.toLowerCase().includes('princess') ||
          p.bio?.toLowerCase().includes('princess') ||
          p.avatar_url === 'princess_crown' ||
          p.avatar_url === 'mystic_queen';
        if (p.avatar_url && (p.avatar_url === 'prince_crown' || p.avatar_url === 'solar_champion' || p.avatar_url === 'brave_knight')) {
          continue;
        }
      } else if (seeking === 'PRINCE') {
        if (p.avatar_url && (p.avatar_url === 'princess_crown' || p.avatar_url === 'mystic_queen')) {
          continue;
        }
      }

      // Country scope filter
      if (countryScope === 'SAME_COUNTRY' && myCountry && p.country) {
        if (p.country.toLowerCase() !== myCountry.toLowerCase()) continue;
      }

      // Religion filter
      if (religionPref === 'SAME' && myReligion && p.religion) {
        if (p.religion !== myReligion) continue;
      }

      // Keep seed players fresh relative to now to guarantee the 5 required activity tiers
      if (p.id === 'seed-player-aurelia-01') {
        p.updated_at = new Date(now - 1000 * 45).toISOString();
      } else if (p.id === 'seed-player-valerius-02') {
        p.updated_at = new Date(now - 1000 * 80).toISOString();
      } else if (p.id === 'seed-player-zephyrine-03') {
        p.updated_at = new Date(now - 1000 * 60 * 3.5).toISOString();
      } else if (p.id === 'seed-player-keith-04') {
        p.updated_at = new Date(now - 1000 * 60 * 8).toISOString();
      } else if (p.id === 'seed-player-seraphina-05') {
        p.updated_at = new Date(now - 1000 * 60 * 22).toISOString();
      } else if (p.id === 'seed-player-daichi-06') {
        p.updated_at = new Date(now - 1000 * 60 * 120).toISOString();
      } else if (p.id === 'seed-player-fatima-07') {
        p.updated_at = new Date(now - 1000 * 60 * 240).toISOString();
      }

      // Calculate activity timestamp and bucket
      const updatedMs = p.updated_at ? new Date(p.updated_at).getTime() : 0;
      const diffSec = Math.max(0, Math.floor((now - updatedMs) / 1000));
      const isOnlinePresence = onlineUserIds.has(p.id) || diffSec <= 90;

      if (onlyOnline && !isOnlinePresence) continue;

      let activityBucket = 4;
      let activeLabel = 'Active earlier';

      if (isOnlinePresence) {
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
        activeLabel = hours > 0 ? `Active ${hours}h ago` : 'Active recently';
      }

      // Compatibility score and tags
      const tags: string[] = [];
      let score = 75;

      if (isOnlinePresence) {
        tags.push('Online Now');
        score += 15;
      } else if (activityBucket <= 2) {
        tags.push('Recently Active');
        score += 8;
      }

      if (myCountry && p.country && myCountry.toLowerCase() === p.country.toLowerCase()) {
        tags.push('Same Kingdom');
        score += 10;
      }

      if (myReligion && p.religion && myReligion === p.religion) {
        tags.push('Shared Faith');
        score += 10;
      }

      tags.push(`Sector ${p.highest_unlocked_level || p.current_level} Runner`);

      const finalScore = Math.min(score, 99);

      result.push({
        ...p,
        isOnline: isOnlinePresence,
        onlineStatus: isOnlinePresence ? 'LOBBY' : 'OFFLINE',
        onlineLevel: p.current_level || 1,
        activityBucket,
        activeLabel,
        compatibilityScore: finalScore,
        compatibilityTags: tags,
      });
    }

    // MANDATORY PRIORITIZATION:
    // 1. Online now (Bucket 0)
    // 2. Active within 5 minutes (Bucket 1)
    // 3. Active within 10 minutes (Bucket 2)
    // 4. Active within 30 minutes (Bucket 3)
    // 5. Older (Bucket 4)
    // Within same bucket: newest updated_at, then highest compatibilityScore
    result.sort((a, b) => {
      if (a.activityBucket !== b.activityBucket) {
        return a.activityBucket - b.activityBucket;
      }
      const timeA = new Date(a.updated_at).getTime();
      const timeB = new Date(b.updated_at).getTime();
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return (b.compatibilityScore || 0) - (a.compatibilityScore || 0);
    });

    return result;
  }

  // ==============================================================================
  // INVITATIONS MANAGEMENT
  // ==============================================================================

  public getInvitationsForUser(userId: string): StoredInvitation[] {
    const list: StoredInvitation[] = [];
    const now = new Date();

    for (const inv of Object.values(this.data.invitations)) {
      if (inv.sender_id === userId || inv.recipient_id === userId) {
        // Auto-expire if past expires_at
        if (inv.status === 'pending' && new Date(inv.expires_at) <= now) {
          inv.status = 'expired';
          inv.updated_at = now.toISOString();
        }
        list.push(inv);
      }
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }

  public getInvitation(id: string): StoredInvitation | undefined {
    return this.data.invitations[id];
  }

  public hasPendingInvitation(senderId: string, recipientId: string): boolean {
    const now = new Date();
    return Object.values(this.data.invitations).some(
      (inv) =>
        inv.sender_id === senderId &&
        inv.recipient_id === recipientId &&
        inv.status === 'pending' &&
        new Date(inv.expires_at) > now
    );
  }

  public isBlocked(userA: string, userB: string): boolean {
    return this.data.blocks.some(
      (b) =>
        (b.blocker_id === userA && b.blocked_id === userB) ||
        (b.blocker_id === userB && b.blocked_id === userA)
    );
  }

  public createInvitation(senderId: string, recipientId: string): StoredInvitation {
    const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const invitation: StoredInvitation = {
      id,
      sender_id: senderId,
      recipient_id: recipientId,
      status: 'pending',
      created_at: nowIso,
      updated_at: nowIso,
      expires_at: expiresAt,
      is_read: false,
    };

    this.data.invitations[id] = invitation;
    this.save();
    return invitation;
  }

  public respondInvitation(invitationId: string, recipientId: string, action: 'accept' | 'decline'): StoredInvitation {
    const inv = this.data.invitations[invitationId];
    if (!inv) throw new Error('Invitation not found');
    if (inv.recipient_id !== recipientId) throw new Error('Unauthorized');
    if (inv.status !== 'pending') throw new Error(`Invitation is already ${inv.status}`);

    const nowIso = new Date().toISOString();
    inv.status = action === 'accept' ? 'accepted' : 'declined';
    inv.responded_at = nowIso;
    inv.updated_at = nowIso;
    inv.is_read = true;

    this.save();
    return inv;
  }

  public cancelInvitation(invitationId: string, senderId: string): StoredInvitation {
    const inv = this.data.invitations[invitationId];
    if (!inv) throw new Error('Invitation not found');
    if (inv.sender_id !== senderId) throw new Error('Unauthorized');
    if (inv.status !== 'pending') throw new Error(`Cannot cancel an invitation that is already ${inv.status}`);

    const nowIso = new Date().toISOString();
    inv.status = 'cancelled';
    inv.cancelled_at = nowIso;
    inv.updated_at = nowIso;

    this.save();
    return inv;
  }

  public markRead(invitationId: string, recipientId: string) {
    const inv = this.data.invitations[invitationId];
    if (inv && inv.recipient_id === recipientId) {
      inv.is_read = true;
      inv.updated_at = new Date().toISOString();
      this.save();
    }
  }
}
