/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SupabaseService } from './supabaseClient';
import { PlayerProfileManager } from './playerProfileManager';
import { AuthState, PlayerProfile } from './types';
import { SupabaseErrorHandler } from './supabaseErrorHandler';

export class AuthenticationManager {
  private static instance: AuthenticationManager | null = null;
  private state: AuthState = {
    isAuthenticated: false,
    isAnonymous: false,
    user: null,
    profile: null,
    loading: true,
    error: null,
  };

  private listeners: Set<(state: AuthState) => void> = new Set();
  private authUnsubscribe: (() => void) | null = null;

  private constructor() {
    this.init();
  }

  public static getInstance(): AuthenticationManager {
    if (!AuthenticationManager.instance) {
      AuthenticationManager.instance = new AuthenticationManager();
    }
    return AuthenticationManager.instance;
  }

  private init() {
    SupabaseService.getInstance().subscribe((_config, client) => {
      if (this.authUnsubscribe) {
        this.authUnsubscribe();
        this.authUnsubscribe = null;
      }

      if (!client) {
        this.setState({
          isAuthenticated: false,
          isAnonymous: false,
          user: null,
          profile: null,
          loading: false,
          error: null,
        });
        return;
      }

      // Check current session
      this.checkSession(client);

      // Listen for auth state changes
      const { data: authListener } = client.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const profile = await PlayerProfileManager.getInstance().fetchProfile(session.user.id);
          this.setState({
            isAuthenticated: true,
            isAnonymous: session.user.is_anonymous || false,
            user: { id: session.user.id, email: session.user.email },
            profile,
            loading: false,
            error: null,
          });
        } else {
          this.setState({
            isAuthenticated: false,
            isAnonymous: false,
            user: null,
            profile: null,
            loading: false,
            error: null,
          });
        }
      });

      this.authUnsubscribe = () => {
        authListener.subscription.unsubscribe();
      };
    });
  }

  private async checkSession(client: any) {
    try {
      this.setState({ ...this.state, loading: true });
      const { data, error } = await client.auth.getSession();
      if (error) {
        this.setState({
          isAuthenticated: false,
          isAnonymous: false,
          user: null,
          profile: null,
          loading: false,
          error: SupabaseErrorHandler.formatError(error),
        });
        return;
      }

      if (data.session?.user) {
        let profile = await PlayerProfileManager.getInstance().fetchProfile(data.session.user.id);
        if (!profile) {
          // Initialize default profile if trigger hasn't or table was newly queried
          profile = await PlayerProfileManager.getInstance().createOrUpdateProfile({
            id: data.session.user.id,
            display_name: data.session.user.user_metadata?.display_name || 'Runner',
          });
        }

        this.setState({
          isAuthenticated: true,
          isAnonymous: data.session.user.is_anonymous || false,
          user: { id: data.session.user.id, email: data.session.user.email },
          profile,
          loading: false,
          error: null,
        });
      } else {
        this.setState({
          isAuthenticated: false,
          isAnonymous: false,
          user: null,
          profile: null,
          loading: false,
          error: null,
        });
      }
    } catch (err) {
      this.setState({
        isAuthenticated: false,
        isAnonymous: false,
        user: null,
        profile: null,
        loading: false,
        error: SupabaseErrorHandler.formatError(err),
      });
    }
  }

  public async signUp(email: string, password: string, displayName: string): Promise<{ success: boolean; error?: string }> {
    const client = SupabaseService.getInstance().getClient();
    if (!client) {
      return { success: false, error: 'Supabase is not configured yet. Please configure credentials first.' };
    }

    try {
      this.setState({ ...this.state, loading: true, error: null });
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName.trim() || 'Runner',
          },
        },
      });

      if (error) {
        const msg = SupabaseErrorHandler.formatError(error, 'Sign up');
        this.setState({ ...this.state, loading: false, error: msg });
        return { success: false, error: msg };
      }

      if (data.user) {
        const profile = await PlayerProfileManager.getInstance().createOrUpdateProfile({
          id: data.user.id,
          display_name: displayName.trim() || 'Runner',
        });

        this.setState({
          isAuthenticated: true,
          isAnonymous: false,
          user: { id: data.user.id, email: data.user.email },
          profile,
          loading: false,
          error: null,
        });
      }

      return { success: true };
    } catch (err) {
      const msg = SupabaseErrorHandler.formatError(err, 'Sign up');
      this.setState({ ...this.state, loading: false, error: msg });
      return { success: false, error: msg };
    }
  }

  public async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const client = SupabaseService.getInstance().getClient();
    if (!client) {
      return { success: false, error: 'Supabase is not configured yet. Please configure credentials first.' };
    }

    try {
      this.setState({ ...this.state, loading: true, error: null });
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const msg = SupabaseErrorHandler.formatError(error, 'Sign in');
        this.setState({ ...this.state, loading: false, error: msg });
        return { success: false, error: msg };
      }

      if (data.user) {
        let profile = await PlayerProfileManager.getInstance().fetchProfile(data.user.id);
        if (!profile) {
          profile = await PlayerProfileManager.getInstance().createOrUpdateProfile({
            id: data.user.id,
            display_name: data.user.user_metadata?.display_name || 'Runner',
          });
        }

        this.setState({
          isAuthenticated: true,
          isAnonymous: false,
          user: { id: data.user.id, email: data.user.email },
          profile,
          loading: false,
          error: null,
        });
      }

      return { success: true };
    } catch (err) {
      const msg = SupabaseErrorHandler.formatError(err, 'Sign in');
      this.setState({ ...this.state, loading: false, error: msg });
      return { success: false, error: msg };
    }
  }

  public async signInAnonymously(): Promise<{ success: boolean; error?: string }> {
    const client = SupabaseService.getInstance().getClient();
    if (!client) {
      return { success: false, error: 'Supabase is not configured. Playing in offline guest mode.' };
    }

    try {
      this.setState({ ...this.state, loading: true, error: null });
      // Supabase supports anonymous sign in if enabled
      const { data, error } = await client.auth.signInAnonymously();

      if (error) {
        // If anonymous sign-in is disabled in Supabase project dashboard, inform player cleanly
        const msg = SupabaseErrorHandler.formatError(error, 'Anonymous play');
        this.setState({ ...this.state, loading: false, error: msg });
        return { success: false, error: msg };
      }

      if (data.user) {
        const guestName = `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
        const profile = await PlayerProfileManager.getInstance().createOrUpdateProfile({
          id: data.user.id,
          display_name: guestName,
        });

        this.setState({
          isAuthenticated: true,
          isAnonymous: true,
          user: { id: data.user.id },
          profile,
          loading: false,
          error: null,
        });
      }

      return { success: true };
    } catch (err) {
      const msg = SupabaseErrorHandler.formatError(err, 'Guest login');
      this.setState({ ...this.state, loading: false, error: msg });
      return { success: false, error: msg };
    }
  }

  public async signOut(): Promise<void> {
    const client = SupabaseService.getInstance().getClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn('[AuthenticationManager] Sign out error:', err);
      }
    }

    this.setState({
      isAuthenticated: false,
      isAnonymous: false,
      user: null,
      profile: null,
      loading: false,
      error: null,
    });
  }

  public updateProfileLocally(profile: PlayerProfile) {
    this.setState({
      ...this.state,
      profile,
    });
  }

  public getState(): AuthState {
    return { ...this.state };
  }

  public subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(newState: AuthState) {
    this.state = newState;
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('[AuthenticationManager] Listener error:', err);
      }
    }
  }
}
