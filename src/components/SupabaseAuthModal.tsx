/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Lock,
  User,
  Mail,
  Key,
  LogOut,
  RefreshCw,
  Database,
  Users,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { SupabaseService } from '../supabase/supabaseClient';
import { AuthenticationManager } from '../supabase/authManager';
import { CloudSaveManager } from '../supabase/cloudSaveManager';
import { OnlinePresenceManager } from '../supabase/onlinePresenceManager';
import { AuthState, SupabaseConfig } from '../supabase/types';

interface SupabaseAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPresence?: () => void;
}

export const SupabaseAuthModal: React.FC<SupabaseAuthModalProps> = ({
  isOpen,
  onClose,
  onOpenPresence,
}) => {
  const [activeTab, setActiveTab] = useState<'ACCOUNT' | 'CONFIG' | 'MIGRATION'>('ACCOUNT');
  const [authState, setAuthState] = useState<AuthState>(AuthenticationManager.getInstance().getState());
  const [config, setConfig] = useState<SupabaseConfig>(SupabaseService.getInstance().getConfig());

  // Form states
  const [authMode, setAuthMode] = useState<'SIGN_IN' | 'SIGN_UP'>('SIGN_IN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual Config states
  const [inputUrl, setInputUrl] = useState(config.url || '');
  const [inputKey, setInputKey] = useState(config.anonKey || '');
  const [testResult, setTestResult] = useState<{ status: 'IDLE' | 'TESTING' | 'SUCCESS' | 'ERROR'; message?: string }>({
    status: 'IDLE',
  });

  // Copied SQL state
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    const unsubAuth = AuthenticationManager.getInstance().subscribe((s) => {
      setAuthState(s);
    });
    const unsubConfig = SupabaseService.getInstance().subscribe((c) => {
      setConfig(c);
      if (c.url) setInputUrl(c.url);
      if (c.anonKey) setInputKey(c.anonKey);
    });

    return () => {
      unsubAuth();
      unsubConfig();
    };
  }, []);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);

    const res = await AuthenticationManager.getInstance().signIn(email, password);
    setIsSubmitting(false);

    if (!res.success) {
      setFormError(res.error || 'Failed to sign in.');
    } else {
      setFormSuccess('Signed in successfully! Cloud progression synchronized.');
      await CloudSaveManager.getInstance().syncProgression();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);

    const res = await AuthenticationManager.getInstance().signUp(email, password, displayName || 'Runner');
    setIsSubmitting(false);

    if (!res.success) {
      setFormError(res.error || 'Failed to register account.');
    } else {
      setFormSuccess('Account registered and profile created! Cloud sync active.');
      await CloudSaveManager.getInstance().syncProgression();
    }
  };

  const handleGuestPlay = async () => {
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);

    const res = await AuthenticationManager.getInstance().signInAnonymously();
    setIsSubmitting(false);

    if (!res.success) {
      setFormError(res.error || 'Guest mode error.');
    } else {
      setFormSuccess('Connected as Guest runner!');
      await CloudSaveManager.getInstance().syncProgression();
    }
  };

  const handleSignOut = async () => {
    await AuthenticationManager.getInstance().signOut();
    setFormSuccess('Signed out. Local progress retained.');
  };

  const handleSaveConfig = () => {
    setTestResult({ status: 'IDLE' });
    const success = SupabaseService.getInstance().applyConfig(inputUrl, inputKey, 'storage');
    if (success) {
      setTestResult({
        status: 'SUCCESS',
        message: 'Credentials saved! Connecting to Supabase project...',
      });
    } else {
      setTestResult({
        status: 'ERROR',
        message: 'Invalid URL or key. Never use the service-role key on the client.',
      });
    }
  };

  const handleTestConnection = async () => {
    setTestResult({ status: 'TESTING', message: 'Testing Supabase connection...' });
    const client = SupabaseService.getInstance().getClient();

    if (!client) {
      setTestResult({
        status: 'ERROR',
        message: 'No client initialized. Please provide Project URL and Public Publishable/Anon Key.',
      });
      return;
    }

    try {
      // Query profiles table or auth state
      const { error } = await client.from('profiles').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        if (error.message.includes('relation "public.profiles" does not exist')) {
          setTestResult({
            status: 'SUCCESS',
            message: 'Connected to Supabase! Note: Please run the SQL migration (tab "SQL Migration") to create tables.',
          });
          return;
        }
        setTestResult({
          status: 'ERROR',
          message: `Connection error: ${error.message}`,
        });
        return;
      }

      setTestResult({
        status: 'SUCCESS',
        message: 'Connected to Supabase successfully! Database & RLS are reachable.',
      });
    } catch (err: any) {
      setTestResult({
        status: 'ERROR',
        message: `Connection test failed: ${err.message || 'Unknown network error'}`,
      });
    }
  };

  const handleCopySql = () => {
    const sqlScript = `-- Run this in your Supabase SQL Editor:
-- Copy from supabase_schema.sql in the project root`;
    navigator.clipboard?.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleForceSync = async () => {
    setIsSubmitting(true);
    await CloudSaveManager.getInstance().syncProgression();
    setIsSubmitting(false);
    setFormSuccess('Cloud progression manually synchronized.');
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md pointer-events-auto">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-display font-bold text-white">
              Supabase Cloud Integration
            </h3>
            <p className="text-xs text-slate-400">
              Cross-Device Progression · Online Presence · Realtime Infrastructure
            </p>
          </div>
        </div>

        {/* Connection Status Pill */}
        <div className="flex items-center justify-between px-3 py-2 my-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                config.isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold text-slate-300">
              {config.isConfigured ? 'Supabase Connected' : 'Supabase Not Configured'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 px-2 py-0.5 rounded bg-slate-800">
              Source: {config.source}
            </span>
            {config.isConfigured && onOpenPresence && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPresence();
                }}
                className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-lg cursor-pointer"
              >
                <Users className="w-3 h-3" />
                Online Lobby
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 mb-4 gap-2">
          <button
            onClick={() => setActiveTab('ACCOUNT')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'ACCOUNT'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            Player Account
          </button>

          <button
            onClick={() => setActiveTab('CONFIG')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'CONFIG'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            Project Credentials
          </button>

          <button
            onClick={() => setActiveTab('MIGRATION')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'MIGRATION'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            SQL Schema & RLS
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* TAB 1: PLAYER ACCOUNT */}
          {activeTab === 'ACCOUNT' && (
            <div className="space-y-4">
              {authState.isAuthenticated && authState.user ? (
                /* Authenticated Player Profile Card */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-cyan-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-xl">
                          {authState.profile?.display_name?.charAt(0).toUpperCase() || 'R'}
                        </div>
                        <div>
                          <div className="font-bold text-white text-base flex items-center gap-2">
                            {authState.profile?.display_name || 'Runner'}
                            {authState.isAnonymous && (
                              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                                Guest
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">
                            {authState.user.email || 'Anonymous Session'}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-500/30 rounded-xl transition-all cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
                      <div className="bg-slate-900/80 p-2 rounded-xl text-center">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Max Level</div>
                        <div className="text-base font-bold text-cyan-400">
                          Sector {authState.profile?.highest_unlocked_level || 1}
                        </div>
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded-xl text-center">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">High Score</div>
                        <div className="text-base font-bold text-amber-400">
                          {authState.profile?.best_score?.toLocaleString() || 0}
                        </div>
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded-xl text-center">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Distance</div>
                        <div className="text-base font-bold text-indigo-400">
                          {Math.round(authState.profile?.total_distance || 0)}m
                        </div>
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded-xl text-center">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Coins</div>
                        <div className="text-base font-bold text-yellow-300">
                          {authState.profile?.total_coins_collected || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={handleForceSync}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin text-cyan-400' : ''}`} />
                      Sync Cloud Progression Now
                    </button>

                    <div className="text-[11px] text-slate-500">
                      Auto-syncs on level completion & game over
                    </div>
                  </div>
                </div>
              ) : (
                /* Login / Register Form */
                <div className="space-y-4">
                  {!config.isConfigured && (
                    <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Supabase credentials not detected yet.</strong> You can play locally with standard offline saves, or go to the <strong>Project Credentials</strong> tab to connect your Supabase project.
                      </div>
                    </div>
                  )}

                  <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                    <button
                      onClick={() => setAuthMode('SIGN_IN')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        authMode === 'SIGN_IN'
                          ? 'bg-slate-800 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => setAuthMode('SIGN_UP')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        authMode === 'SIGN_UP'
                          ? 'bg-slate-800 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Create Account
                    </button>
                  </div>

                  <form onSubmit={authMode === 'SIGN_IN' ? handleSignIn : handleSignUp} className="space-y-3">
                    {authMode === 'SIGN_UP' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Runner Display Name
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="e.g. CyberNinja"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="runner@example.com"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                      <div className="relative">
                        <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !config.isConfigured}
                      className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/20 active:scale-98 transition-all cursor-pointer"
                    >
                      {isSubmitting
                        ? 'Processing...'
                        : authMode === 'SIGN_IN'
                        ? 'Sign In to Cloud'
                        : 'Register Runner Account'}
                    </button>
                  </form>

                  <div className="relative flex items-center justify-center my-2">
                    <div className="border-t border-slate-800 w-full" />
                    <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase font-semibold">
                      or
                    </span>
                  </div>

                  <button
                    onClick={handleGuestPlay}
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <User className="w-4 h-4 text-cyan-400" />
                    Instant Guest Play (Quick Connect)
                  </button>
                </div>
              )}

              {/* Feedback messages */}
              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs">
                  {formSuccess}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREDENTIAL CONFIGURATION */}
          {activeTab === 'CONFIG' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-slate-300 space-y-2">
                <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Client Security Architecture (Phase 16 - Section 3)
                </div>
                <p>
                  This client uses your <strong>Project URL</strong> and <strong>Public Publishable or Anon Key</strong>.
                  All database tables are guarded with <strong>Row Level Security (RLS)</strong> so players only modify their own profile and runs.
                </p>
                <div className="text-[11px] text-rose-300 font-bold bg-rose-950/40 p-2 rounded-lg border border-rose-500/30 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  NEVER enter your service-role key. The game automatically rejects service-role keys to protect your project.
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://your-project-id.supabase.co"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">
                    Found in Supabase Dashboard → Project Settings → API
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Supabase Publishable / Anon Key (Public Client Key)
                  </label>
                  <textarea
                    rows={2}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">
                    Public client key with safe Row Level Security
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveConfig}
                    className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Save Client Configuration
                  </button>

                  <button
                    onClick={handleTestConnection}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testResult.status === 'TESTING' ? 'animate-spin' : ''}`} />
                    Test Connection
                  </button>
                </div>

                {/* Connection Test Status Result */}
                {testResult.message && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                      testResult.status === 'SUCCESS'
                        ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                        : testResult.status === 'ERROR'
                        ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {testResult.status === 'SUCCESS' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : testResult.status === 'ERROR' ? (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400 shrink-0 mt-0.5" />
                    )}
                    <div>{testResult.message}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SQL SCHEMA & MIGRATION */}
          {activeTab === 'MIGRATION' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="font-bold text-white flex items-center justify-between">
                  <span>SQL Migration File</span>
                  <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/60 px-2 py-0.5 rounded">
                    supabase_schema.sql
                  </span>
                </div>
                <p className="text-slate-400">
                  A full migration file has been saved in the project root: <strong>/supabase_schema.sql</strong> and <strong>/supabase/migrations/</strong>.
                </p>
                <div className="text-[11px] text-slate-400">
                  It includes the complete schema with <strong>Row Level Security (RLS)</strong> policies:
                  <ul className="list-disc pl-5 mt-1 space-y-0.5 text-slate-300">
                    <li><strong className="text-white">profiles</strong>: User display names, max level, scores, and permanent upgrades with update restricted to auth.uid().</li>
                    <li><strong className="text-white">match_preferences</strong>: Phase 2 romantic discovery settings (seeking, age range, religion, scope, priorities) with RLS restricted to auth.uid().</li>
                    <li><strong className="text-white">level_runs</strong>: Idempotent run log with unique run_id to prevent duplicates.</li>
                    <li><strong className="text-white">chat_conversations & messages</strong>: Isolated strictly to conversation members.</li>
                    <li><strong className="text-white">user_blocks & reports</strong>: User safety and moderation foundation.</li>
                    <li><strong className="text-white">handle_new_user trigger</strong>: Automatically generates initial runner profile upon signup.</li>
                  </ul>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-xs font-semibold text-slate-200 mb-2">
                  How to run the migration in Supabase:
                </div>
                <ol className="text-[11px] text-slate-400 space-y-1 list-decimal pl-4">
                  <li>Open your <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-cyan-400 underline inline-flex items-center gap-0.5">Supabase Dashboard <ExternalLink className="w-3 h-3" /></a></li>
                  <li>Click on <strong>SQL Editor</strong> in the left navigation sidebar.</li>
                  <li>Click <strong>New Query</strong>.</li>
                  <li>Paste the contents of <code>supabase_schema.sql</code> and click <strong>Run</strong>.</li>
                </ol>
              </div>

              <button
                onClick={handleCopySql}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    SQL Script Path Copied (/supabase_schema.sql)
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Migration File Reference
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
