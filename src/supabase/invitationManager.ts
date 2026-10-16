/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabaseClient';
import { AuthenticationManager } from './authManager';
import { OnboardingManager } from './onboardingManager';
import { ChatInvitation, InvitationNotification } from './types';

export class InvitationManager {
  private static instance: InvitationManager | null = null;
  private invitations: ChatInvitation[] = [];
  private unreadCount: number = 0;
  private channel: RealtimeChannel | null = null;
  private listeners: Set<(invitations: ChatInvitation[], unreadCount: number) => void> = new Set();
  private isInitialized = false;

  public static getInstance(): InvitationManager {
    if (!InvitationManager.instance) {
      InvitationManager.instance = new InvitationManager();
    }
    return InvitationManager.instance;
  }

  private constructor() {
    this.init();
  }

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const checkAndFetch = async () => {
      const authState = AuthenticationManager.getInstance().getState();
      const myProfile = OnboardingManager.getInstance().getProfile();
      const userId = authState.user?.id || myProfile?.userId;

      if (userId) {
        await this.fetchInvitations();
        if (authState.isAuthenticated && authState.user?.id) {
          this.setupRealtimeSubscription(authState.user.id);
        }
      }
    };

    checkAndFetch();

    // Subscribe to auth state changes to load and subscribe to invitations
    AuthenticationManager.getInstance().subscribe(async (authState) => {
      const myProfile = OnboardingManager.getInstance().getProfile();
      const userId = authState.user?.id || myProfile?.userId;
      if (userId) {
        await this.fetchInvitations();
        if (authState.isAuthenticated && authState.user?.id) {
          this.setupRealtimeSubscription(authState.user.id);
        }
      } else {
        this.teardownRealtimeSubscription();
        this.invitations = [];
        this.unreadCount = 0;
        this.notifyListeners();
      }
    });

    // Subscribe to profile changes
    OnboardingManager.getInstance().subscribe(async (profile) => {
      if (profile?.userId) {
        await this.fetchInvitations();
      }
    });
  }

  private setupRealtimeSubscription(userId: string) {
    this.teardownRealtimeSubscription();
    const client = SupabaseService.getInstance().getClient();
    if (!client) return;

    try {
      this.channel = client
        .channel(`invitations_user_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_invitations',
            filter: `recipient_id=eq.${userId}`,
          },
          () => {
            this.fetchInvitations();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_invitations',
            filter: `sender_id=eq.${userId}`,
          },
          () => {
            this.fetchInvitations();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[InvitationManager] Realtime setup warning:', err);
    }
  }

  public teardownRealtimeSubscription() {
    if (this.channel) {
      const client = SupabaseService.getInstance().getClient();
      if (client) {
        client.removeChannel(this.channel);
      }
      this.channel = null;
    }
  }

  /**
   * Fetches all invitations involving the current authenticated player.
   */
  public async fetchInvitations(): Promise<ChatInvitation[]> {
    const auth = AuthenticationManager.getInstance().getState();
    const myProfile = OnboardingManager.getInstance().getProfile();
    const userId = auth.user?.id || myProfile?.userId;
    if (!userId) return [];

    try {
      // 1. Authoritative server invitations endpoint
      const client = SupabaseService.getInstance().getClient();
      const session = client ? (await client.auth.getSession()).data.session : null;
      const token = session?.access_token;

      const res = await fetch(`/api/invitations?userId=${encodeURIComponent(userId)}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : { 'x-user-id': userId }),
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.invitations)) {
          this.invitations = data.invitations;
          this.unreadCount = this.invitations.filter(
            (i) => i.recipient_id === userId && i.status === 'pending' && !i.is_read
          ).length;
          this.notifyListeners();
          return this.invitations;
        }
      }
    } catch (err) {
      console.warn('[InvitationManager] Error querying server invitations API:', err);
    }

    // 2. Direct Supabase client fallback
    const client = SupabaseService.getInstance().getClient();
    if (!client) return this.invitations;

    try {
      const { data, error } = await client
        .from('chat_invitations')
        .select('*')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        return this.invitations;
      }

      const rawList = (data as ChatInvitation[]) || [];
      const now = new Date();

      const profileIds = new Set<string>();
      for (const inv of rawList) {
        profileIds.add(inv.sender_id);
        profileIds.add(inv.recipient_id);
      }

      const profilesMap = new Map<string, any>();
      if (profileIds.size > 0) {
        const { data: profs } = await client
          .from('profiles')
          .select('id, display_name, avatar_url, age, country, bio, religion, highest_unlocked_level')
          .in('id', Array.from(profileIds));

        if (profs) {
          for (const p of profs) {
            profilesMap.set(p.id, p);
          }
        }
      }

      const enriched: ChatInvitation[] = rawList.map((inv) => {
        let status = inv.status;
        if (status === 'pending' && new Date(inv.expires_at) <= now) {
          status = 'expired';
        }

        return {
          ...inv,
          status,
          sender_profile: profilesMap.get(inv.sender_id) || undefined,
          recipient_profile: profilesMap.get(inv.recipient_id) || undefined,
        };
      });

      this.invitations = enriched;
      this.unreadCount = enriched.filter(
        (i) => i.recipient_id === userId && i.status === 'pending' && !i.is_read
      ).length;

      this.notifyListeners();
      return enriched;
    } catch {
      return this.invitations;
    }
  }

  public getInvitations(): ChatInvitation[] {
    return this.invitations;
  }

  public getUnreadCount(): number {
    return this.unreadCount;
  }

  /**
   * Checks whether the current user has already sent a pending invitation to the recipient.
   */
  public hasPendingInvitationTo(recipientId: string): boolean {
    const authState = AuthenticationManager.getInstance().getState();
    const myProfile = OnboardingManager.getInstance().getProfile();
    const userId = authState.user?.id || myProfile?.userId || 'current-player';
    return this.invitations.some(
      (i) => i.sender_id === userId && i.recipient_id === recipientId && i.status === 'pending'
    );
  }

  /**
   * Checks whether the recipient has sent an invitation to the current user.
   */
  public getPendingInvitationFrom(senderId: string): ChatInvitation | undefined {
    const authState = AuthenticationManager.getInstance().getState();
    const myProfile = OnboardingManager.getInstance().getProfile();
    const userId = authState.user?.id || myProfile?.userId || 'current-player';
    return this.invitations.find(
      (i) => i.sender_id === senderId && i.recipient_id === userId && i.status === 'pending'
    );
  }

  /**
   * Sends a chat invitation to a real player.
   */
  public async sendInvitation(
    recipientId: string,
    highestUnlockedLevel: number = 1
  ): Promise<{ success: boolean; message: string; invitation?: ChatInvitation }> {
    const auth = AuthenticationManager.getInstance().getState();
    const myProfile = OnboardingManager.getInstance().getProfile();
    const userId = auth.user?.id || myProfile?.userId || 'current-player';

    if (userId === recipientId) {
      return { success: false, message: 'You cannot invite yourself.' };
    }

    // Level requirement check
    const userLevel = Math.max(
      highestUnlockedLevel,
      auth.profile?.highest_unlocked_level || 1,
      auth.profile?.current_level || 1
    );

    if (userLevel < 4) {
      return {
        success: false,
        message: 'You must reach Level 4 to unlock chat invitations.',
      };
    }

    // Adult eligibility check
    const age = myProfile?.age;
    if (age !== null && age !== undefined && age < 18) {
      return {
        success: false,
        message: 'Romantic discovery and chat invitations are restricted to adults (18+).',
      };
    }

    try {
      const client = SupabaseService.getInstance().getClient();
      const session = client ? (await client.auth.getSession()).data.session : null;
      const token = session?.access_token;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['x-user-id'] = userId;
      }

      const res = await fetch('/api/invitations/send', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          recipientId,
          highestUnlockedLevel: userLevel,
          currentLevel: userLevel,
          senderAge: age,
          userId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await this.fetchInvitations();
        return {
          success: true,
          message: 'Your invitation has been sent.',
          invitation: data.invitation,
        };
      } else {
        return {
          success: false,
          message: data.error || 'Failed to send invitation.',
        };
      }
    } catch {
      return { success: false, message: 'Failed to send invitation. Please try again.' };
    }
  }

  /**
   * Responds to a received invitation (Accept or Decline).
   */
  public async respondToInvitation(
    invitationId: string,
    action: 'accept' | 'decline',
    recipientHighestLevel: number = 1
  ): Promise<{ success: boolean; message: string }> {
    const auth = AuthenticationManager.getInstance().getState();
    const myProfile = OnboardingManager.getInstance().getProfile();
    const userId = auth.user?.id || myProfile?.userId || 'current-player';

    // If accepting, enforce Level 4 gate: Recipient must have completed Level 4!
    const userLevel = Math.max(
      recipientHighestLevel,
      auth.profile?.highest_unlocked_level || 1,
      auth.profile?.current_level || 1
    );

    if (action === 'accept' && userLevel < 4) {
      return {
        success: false,
        message: 'You must complete Level 4 before you can accept invitations.',
      };
    }

    try {
      const client = SupabaseService.getInstance().getClient();
      const session = client ? (await client.auth.getSession()).data.session : null;
      const token = session?.access_token;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['x-user-id'] = userId;
      }

      const res = await fetch('/api/invitations/respond', {
        method: 'POST',
        headers,
        body: JSON.stringify({ invitationId, action, recipientHighestLevel: userLevel, userId }),
      });

      const data = await res.json();
      if (data.success) {
        await this.fetchInvitations();
        return {
          success: true,
          message: data.message || (action === 'accept' ? 'Invitation accepted.' : 'Invitation declined.'),
        };
      } else {
        return { success: false, message: data.error || 'Failed to respond to invitation.' };
      }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error updating invitation.' };
    }
  }

  /**
   * Sender cancels their pending invitation.
   */
  public async cancelInvitation(invitationId: string): Promise<{ success: boolean; message: string }> {
    const auth = AuthenticationManager.getInstance().getState();
    const myProfile = OnboardingManager.getInstance().getProfile();
    const userId = auth.user?.id || myProfile?.userId || 'current-player';

    try {
      const client = SupabaseService.getInstance().getClient();
      const session = client ? (await client.auth.getSession()).data.session : null;
      const token = session?.access_token;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['x-user-id'] = userId;
      }

      const res = await fetch('/api/invitations/cancel', {
        method: 'POST',
        headers,
        body: JSON.stringify({ invitationId, userId }),
      });

      const data = await res.json();
      if (data.success) {
        await this.fetchInvitations();
        return { success: true, message: 'Invitation cancelled.' };
      } else {
        return { success: false, message: data.error || 'Failed to cancel invitation.' };
      }
    } catch {
      return { success: false, message: 'Failed to cancel invitation.' };
    }
  }

  /**
   * Marks received invitations as read.
   */
  public async markAllAsRead(invitationId?: string): Promise<void> {
    const auth = AuthenticationManager.getInstance().getState();
    const myProfile = OnboardingManager.getInstance().getProfile();
    const userId = auth.user?.id || myProfile?.userId || 'current-player';

    try {
      const client = SupabaseService.getInstance().getClient();
      const session = client ? (await client.auth.getSession()).data.session : null;
      const token = session?.access_token;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['x-user-id'] = userId;
      }

      await fetch('/api/invitations/mark-read', {
        method: 'POST',
        headers,
        body: JSON.stringify({ invitationId, userId }),
      });

      this.unreadCount = 0;
      await this.fetchInvitations();
    } catch {
      // Ignore
    }
  }

  public subscribe(listener: (invitations: ChatInvitation[], unreadCount: number) => void): () => void {
    this.listeners.add(listener);
    listener(this.invitations, this.unreadCount);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.invitations, this.unreadCount);
      } catch (err) {
        console.error('[InvitationManager] Listener exception:', err);
      }
    }
  }
}
