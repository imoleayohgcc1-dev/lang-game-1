/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from './types';

const STORAGE_KEY_CONFIG = 'action_runner_supabase_config';

export class SupabaseService {
  private static instance: SupabaseService | null = null;
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig = {
    url: '',
    anonKey: '',
    isConfigured: false,
    source: 'none',
  };

  private listeners: Set<(config: SupabaseConfig, client: SupabaseClient | null) => void> = new Set();
  private isInitialized = false;
  private initPromise: Promise<SupabaseClient | null> | null = null;

  private constructor() {
    this.initPromise = this.init();
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  public async waitForClient(): Promise<SupabaseClient | null> {
    if (this.isInitialized) {
      return this.client;
    }
    if (this.initPromise) {
      return await this.initPromise;
    }
    return this.client;
  }

  private async init(): Promise<SupabaseClient | null> {
    // 1. Check local storage manual configuration
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.url && parsed.anonKey) {
          this.applyConfig(parsed.url, parsed.anonKey, 'storage');
          this.isInitialized = true;
          return this.client;
        }
      }
    } catch {
      // Ignore localStorage read failures
    }

    // 2. Check Vite client environment variables
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const envKey =
      (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
      (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
      '';

    if (envUrl && envKey && !envUrl.includes('<YOUR_SUPABASE') && !envKey.includes('<YOUR_SUPABASE')) {
      this.applyConfig(envUrl, envKey, 'env');
      this.isInitialized = true;
      return this.client;
    }

    // 3. Check server-provided config endpoint (safe public endpoint)
    try {
      const res = await fetch('/api/supabase/config');
      if (res.ok) {
        const data = await res.json();
        if (data.configured && data.supabaseUrl && data.supabaseAnonKey) {
          this.applyConfig(data.supabaseUrl, data.supabaseAnonKey, 'server');
          this.isInitialized = true;
          return this.client;
        }
      }
    } catch {
      // Server check failed or running in pure static mode
    }

    this.config = {
      url: '',
      anonKey: '',
      isConfigured: false,
      source: 'none',
    };
    this.isInitialized = true;
    this.notifyListeners();
    return this.client;
  }

  public applyConfig(url: string, anonKey: string, source: 'env' | 'server' | 'storage' = 'storage'): boolean {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      this.client = null;
      this.config = { url: '', anonKey: '', isConfigured: false, source: 'none' };
      this.notifyListeners();
      return false;
    }

    // SECURITY CHECK: Reject service-role keys if mistakenly provided
    if (cleanKey.toLowerCase().includes('service_role')) {
      console.error(
        '[SupabaseService] SECURITY ERROR: Service-role key was supplied. Only public anon/publishable keys are permitted on the client!'
      );
      return false;
    }

    try {
      this.client = createClient(cleanUrl, cleanKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });

      this.config = {
        url: cleanUrl,
        anonKey: cleanKey,
        isConfigured: true,
        source,
      };

      if (source === 'storage') {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ url: cleanUrl, anonKey: cleanKey }));
      }

      this.notifyListeners();
      return true;
    } catch (err) {
      console.error('[SupabaseService] Client creation failed:', err);
      this.client = null;
      this.config = { url: cleanUrl, anonKey: cleanKey, isConfigured: false, source };
      this.notifyListeners();
      return false;
    }
  }

  public clearConfig() {
    try {
      localStorage.removeItem(STORAGE_KEY_CONFIG);
    } catch {
      // ignore
    }
    this.client = null;
    this.config = { url: '', anonKey: '', isConfigured: false, source: 'none' };
    this.notifyListeners();
  }

  public getClient(): SupabaseClient | null {
    return this.client;
  }

  public getConfig(): SupabaseConfig {
    return { ...this.config };
  }

  public subscribe(listener: (config: SupabaseConfig, client: SupabaseClient | null) => void): () => void {
    this.listeners.add(listener);
    if (this.isInitialized) {
      listener(this.config, this.client);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.config, this.client);
      } catch (err) {
        console.error('[SupabaseService] Listener error:', err);
      }
    }
  }
}
