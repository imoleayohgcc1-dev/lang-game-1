/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabaseClient';
import { AuthenticationManager } from './authManager';
import { PresencePlayer } from './types';

export class OnlinePresenceManager {
  private static instance: OnlinePresenceManager | null = null;
  private channel: RealtimeChannel | null = null;
  private onlinePlayers: Map<string, PresencePlayer> = new Map();
  private listeners: Set<(players: PresencePlayer[]) => void> = new Set();
  private currentStatus: 'LOBBY' | 'RUNNING' | 'PAUSED' | 'GAME_OVER' = 'LOBBY';
  private currentLevelNumber = 1;

  public static getInstance(): OnlinePresenceManager {
    if (!OnlinePresenceManager.instance) {
      OnlinePresenceManager.instance = new OnlinePresenceManager();
    }
    return OnlinePresenceManager.instance;
  }

  public init() {
    AuthenticationManager.getInstance().subscribe((authState) => {
      if (authState.isAuthenticated && authState.user) {
        this.joinPresenceChannel(authState.user.id, authState.profile?.display_name || 'Runner');
      } else {
        this.leavePresenceChannel();
      }
    });
  }

  public updatePlayerActivity(status: 'LOBBY' | 'RUNNING' | 'PAUSED' | 'GAME_OVER', levelNumber?: number) {
    this.currentStatus = status;
    if (levelNumber !== undefined) {
      this.currentLevelNumber = levelNumber;
    }

    if (this.channel) {
      const authState = AuthenticationManager.getInstance().getState();
      if (authState.isAuthenticated && authState.user) {
        this.channel.track({
          user_id: authState.user.id,
          display_name: authState.profile?.display_name || 'Runner',
          current_level: this.currentLevelNumber,
          status: this.currentStatus,
          updated_at: Date.now(),
        });
      }
    }
  }

  private joinPresenceChannel(userId: string, displayName: string) {
    const client = SupabaseService.getInstance().getClient();
    if (!client) return;

    this.leavePresenceChannel();

    try {
      const channel = client.channel('online-runners', {
        config: {
          presence: {
            key: userId,
          },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          this.onlinePlayers.clear();

          for (const key of Object.keys(state)) {
            const presences = state[key] as any[];
            if (presences && presences.length > 0) {
              const latest = presences[presences.length - 1];
              this.onlinePlayers.set(key, {
                user_id: latest.user_id || key,
                display_name: latest.display_name || 'Runner',
                current_level: latest.current_level || 1,
                status: latest.status || 'LOBBY',
                updated_at: latest.updated_at || Date.now(),
              });
            }
          }

          this.notifyListeners();
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (newPresences && newPresences.length > 0) {
            const p = newPresences[0] as any;
            this.onlinePlayers.set(key, {
              user_id: p.user_id || key,
              display_name: p.display_name || 'Runner',
              current_level: p.current_level || 1,
              status: p.status || 'LOBBY',
              updated_at: p.updated_at || Date.now(),
            });
            this.notifyListeners();
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          this.onlinePlayers.delete(key);
          this.notifyListeners();
        });

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            display_name: displayName,
            current_level: this.currentLevelNumber,
            status: this.currentStatus,
            updated_at: Date.now(),
          });
        }
      });

      this.channel = channel;
    } catch (err) {
      console.warn('[OnlinePresenceManager] Failed to join presence channel:', err);
    }
  }

  public leavePresenceChannel() {
    if (this.channel) {
      try {
        const client = SupabaseService.getInstance().getClient();
        if (client) {
          client.removeChannel(this.channel);
        }
      } catch (err) {
        console.warn('[OnlinePresenceManager] Error leaving channel:', err);
      }
      this.channel = null;
      this.onlinePlayers.clear();
      this.notifyListeners();
    }
  }

  public getOnlinePlayers(): PresencePlayer[] {
    return Array.from(this.onlinePlayers.values());
  }

  public getOnlineCount(): number {
    return this.onlinePlayers.size;
  }

  public subscribe(listener: (players: PresencePlayer[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getOnlinePlayers());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const list = this.getOnlinePlayers();
    for (const listener of this.listeners) {
      try {
        listener(list);
      } catch (err) {
        console.error('[OnlinePresenceManager] Listener exception:', err);
      }
    }
  }
}
