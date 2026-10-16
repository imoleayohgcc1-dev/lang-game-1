/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Crown,
  Heart,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Lock,
  ShieldCheck,
  Globe,
  MapPin,
  Flame,
  Trophy,
  X,
  SlidersHorizontal,
  ChevronRight,
  User,
  Radio,
  CheckCircle2,
  Check,
  AlertCircle,
  Play,
  Share2,
  Mail,
  Send,
} from 'lucide-react';
import {
  DiscoveredPlayer,
  DiscoveryFilterOverrides,
  DiscoveryAccessCheck,
  SeekingPreference,
  MatchPreferences,
} from '../supabase/types';
import { AuthenticationManager } from '../supabase/authManager';
import { InvitationManager } from '../supabase/invitationManager';
import { DiscoveryManager } from '../supabase/discoveryManager';
import { OnboardingManager } from '../supabase/onboardingManager';
import { MatchPreferencesManager } from '../supabase/matchPreferencesManager';

interface DiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPreferences: () => void;
  onOpenProfileCompletion?: () => void;
  onStartLevel?: (level: number) => void;
  onOpenInvitations?: () => void;
  highestUnlockedLevel?: number;
  completedLevels?: number[];
}

export const DiscoveryModal: React.FC<DiscoveryModalProps> = ({
  isOpen,
  onClose,
  onOpenPreferences,
  onOpenProfileCompletion,
  onStartLevel,
  onOpenInvitations,
  highestUnlockedLevel = 1,
  completedLevels = [],
}) => {
  const [access, setAccess] = useState<DiscoveryAccessCheck>({
    canAccess: false,
    isAdult: false,
    hasReachedLevel4: false,
    hasCompletedPreferences: false,
    hasCompletedProfile: false,
  });

  const [players, setPlayers] = useState<DiscoveredPlayer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [totalRealUsersInDb, setTotalRealUsersInDb] = useState<number>(0);

  // Active filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [seekingOverride, setSeekingOverride] = useState<SeekingPreference | 'SAVED'>('SAVED');
  const [onlyOnline, setOnlyOnline] = useState<boolean>(false);
  const [selectedPlayer, setSelectedPlayer] = useState<DiscoveredPlayer | null>(null);
  const [wavedPlayerIds, setWavedPlayerIds] = useState<Set<string>>(new Set());
  const [waveFeedback, setWaveFeedback] = useState<string | null>(null);

  // Phase 4: Invitation sending state & unread tracking
  const [unreadInvitationsCount, setUnreadInvitationsCount] = useState<number>(0);
  const [isSendingInviteId, setIsSendingInviteId] = useState<string | null>(null);
  const [invitationFeedback, setInvitationFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [sentInvitePlayerIds, setSentInvitePlayerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = InvitationManager.getInstance().subscribe((invs, unread) => {
      setUnreadInvitationsCount(unread);
      const authState = AuthenticationManager.getInstance().getState();
      const myProfile = OnboardingManager.getInstance().getProfile();
      const currentUserId = authState.user?.id || myProfile?.userId || 'current-player';
      const sentIds = new Set(
        invs
          .filter((i) => i.sender_id === currentUserId && i.status === 'pending')
          .map((i) => i.recipient_id)
      );
      setSentInvitePlayerIds(sentIds);
    });
    return unsub;
  }, []);

  const handleInviteToChat = async (playerId: string, displayName: string) => {
    if (isSendingInviteId) return; // Prevent double taps
    setIsSendingInviteId(playerId);
    setInvitationFeedback(null);

    const result = await InvitationManager.getInstance().sendInvitation(
      playerId,
      highestUnlockedLevel
    );

    if (result.success) {
      setInvitationFeedback({
        text: 'Your invitation has been sent.',
        type: 'success',
      });
      setSentInvitePlayerIds((prev) => new Set(prev).add(playerId));
    } else {
      setInvitationFeedback({
        text: result.message || 'Unable to send invitation.',
        type: 'error',
      });
    }

    setIsSendingInviteId(null);
    setTimeout(() => {
      setInvitationFeedback(null);
    }, 4500);
  };

  // Re-check access when modal opens or progression changes
  const checkCurrentAccess = useCallback(() => {
    const accessCheck = DiscoveryManager.getInstance().checkAccess(
      highestUnlockedLevel,
      completedLevels
    );
    setAccess(accessCheck);
    return accessCheck;
  }, [highestUnlockedLevel, completedLevels]);

  const loadPlayers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const accessCheck = checkCurrentAccess();
    if (!accessCheck.canAccess) {
      setIsLoading(false);
      return;
    }

    const overrides: DiscoveryFilterOverrides = {
      searchQuery: searchQuery || undefined,
      onlyOnline,
    };

    if (seekingOverride !== 'SAVED') {
      overrides.seeking = seekingOverride;
    }

    const result = await DiscoveryManager.getInstance().fetchRealPlayers(
      overrides,
      highestUnlockedLevel,
      completedLevels
    );

    setPlayers(result.players);
    setErrorMessage(result.error);
    setTotalRealUsersInDb(result.totalRealUsersInDb);
    setIsLoading(false);
  }, [checkCurrentAccess, searchQuery, seekingOverride, onlyOnline, highestUnlockedLevel, completedLevels]);

  useEffect(() => {
    if (isOpen) {
      loadPlayers();
    }
  }, [isOpen, loadPlayers]);

  if (!isOpen) return null;

  const currentPrefs: MatchPreferences | null = MatchPreferencesManager.getInstance().getPreferences();
  const currentProfile = OnboardingManager.getInstance().getProfile();

  const handleWave = (playerId: string, displayName: string) => {
    setWavedPlayerIds((prev) => new Set(prev).add(playerId));
    setWaveFeedback(`Sent a Royal Greeting to ${displayName}! ✨`);
    setTimeout(() => {
      setWaveFeedback(null);
    }, 3500);
  };

  // ==============================================================================
  // RENDER LOCKED / GATED SCREEN
  // ==============================================================================
  if (!access.canAccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 rounded-3xl border border-amber-500/30 p-6 md:p-8 shadow-2xl flex flex-col items-center text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-700 active:scale-95 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon based on lock type */}
          {access.lockType === 'UNDERAGE' ? (
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-4 text-rose-400 shadow-lg shadow-rose-500/10">
              <ShieldCheck className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-4 text-amber-400 shadow-lg shadow-amber-500/10 animate-pulse">
              <Lock className="w-8 h-8" />
            </div>
          )}

          <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-indigo-300 mb-2">
            Find Your Prince or Princess
          </h2>

          <div className="text-sm font-semibold text-rose-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            {access.lockType === 'UNDERAGE'
              ? 'Age Restricted Feature'
              : access.lockType === 'AUTH_REQUIRED'
              ? 'Player Account Required'
              : access.lockType === 'LEVEL_LOCKED'
              ? 'Level 4 Progression Required'
              : access.lockType === 'PREFERENCES_INCOMPLETE'
              ? 'Preferences Setup Required'
              : 'Setup Required'}
          </div>

          <p className="text-sm text-slate-300 leading-relaxed mb-6 max-w-md">
            {access.reason}
          </p>

          {/* Level 4 Progression Tracker if Level Locked */}
          {access.lockType === 'LEVEL_LOCKED' && (
            <div className="w-full bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60 mb-6 text-left">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
                <span>Progression to Royal Discovery:</span>
                <span className="text-amber-400 font-mono">
                  Level {Math.max(...(completedLevels || [0]), 1)} of 4
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (Math.max(...(completedLevels || [0]), 1) / 4) * 100)}%`,
                  }}
                />
              </div>
              <div className="grid grid-cols-4 gap-1 mt-3 text-[10px] text-center font-bold">
                <div className={`py-1 rounded ${completedLevels.includes(1) ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-900 text-slate-400'}`}>
                  Lvl 1 ✓
                </div>
                <div className={`py-1 rounded ${completedLevels.includes(2) ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-900 text-slate-400'}`}>
                  Lvl 2 {completedLevels.includes(2) ? '✓' : ''}
                </div>
                <div className={`py-1 rounded ${completedLevels.includes(3) ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-900 text-slate-400'}`}>
                  Lvl 3 {completedLevels.includes(3) ? '✓' : ''}
                </div>
                <div className="py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Lvl 4 👑
                </div>
              </div>
            </div>
          )}

          {/* Action Button based on lock type */}
          <div className="w-full flex flex-col gap-2.5">
            {access.lockType === 'AUTH_REQUIRED' && onOpenProfileCompletion && (
              <button
                onClick={() => {
                  onClose();
                  onOpenProfileCompletion();
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-600 hover:from-indigo-400 hover:via-purple-400 hover:to-rose-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Complete Player Profile</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {access.lockType === 'LEVEL_LOCKED' && onStartLevel && (
              <button
                onClick={() => {
                  onClose();
                  const nextLvl = Math.max(...(completedLevels || [0])) + 1;
                  onStartLevel(Math.min(nextLvl, 4));
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:via-orange-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Play Next Level to Unlock Discovery</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {access.lockType === 'PROFILE_INCOMPLETE' && onOpenProfileCompletion && (
              <button
                onClick={() => {
                  onClose();
                  onOpenProfileCompletion();
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-rose-500 to-amber-500 hover:from-indigo-400 hover:via-rose-400 hover:to-amber-400 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Complete Royal Profile</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {access.lockType === 'PREFERENCES_INCOMPLETE' && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPreferences();
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-600 hover:from-rose-400 hover:via-pink-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
              >
                <Heart className="w-4 h-4 fill-white" />
                <span>Set Match Preferences</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs active:scale-98 transition-all cursor-pointer"
            >
              Return to Kingdom
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================================
  // RENDER UNLOCKED DISCOVERY FEED
  // ==============================================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[94vh] sm:h-[88vh] bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 rounded-3xl border border-indigo-500/40 shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* HEADER */}
        <div className="relative px-5 py-4 border-b border-indigo-950 bg-slate-900/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500 p-0.5 shadow-md shadow-rose-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-indigo-200">
                  Find Your Prince or Princess
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" /> Real Players
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                <span>Phase 3 Discovery</span>
                <span>•</span>
                <span className="text-rose-300">
                  Seeking: {currentPrefs?.seeking_preferences === 'PRINCE' ? 'Prince 🤴' : currentPrefs?.seeking_preferences === 'PRINCESS' ? 'Princess 👸' : 'Anyone 👑'}
                </span>
                <span>•</span>
                <span>
                  {currentPrefs?.any_eligible_adult_age
                    ? 'All Adults (18+)'
                    : `Ages ${currentPrefs?.min_age || 18}–${currentPrefs?.max_age || 99}`}
                </span>
                <span>•</span>
                <span>{currentPrefs?.discovery_scope === 'SAME_COUNTRY' ? 'Same Country' : 'Global Scope'}</span>
              </p>
            </div>
          </div>

          {/* Action controls */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {onOpenInvitations && (
              <button
                onClick={onOpenInvitations}
                className="relative py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-rose-500/40 flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
                title="View Chat Invitations"
              >
                <Mail className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Invitations</span>
                {unreadInvitationsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-mono text-[10px] font-black animate-pulse">
                    {unreadInvitationsCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={onOpenPreferences}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 active:scale-95 transition-all"
              title="Edit Discovery Preferences"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Preferences</span>
            </button>

            <button
              onClick={loadPlayers}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 active:scale-95 transition-all disabled:opacity-50"
              title="Refresh Real-time Feed"
            >
              <RefreshCw className={`w-4 h-4 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* FEED FILTER BAR */}
        <div className="px-5 py-2.5 bg-slate-900/60 border-b border-indigo-950/60 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search real players by name, country, or bio..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Filter: All vs Princess vs Prince */}
            <div className="bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/70 flex items-center">
              <button
                onClick={() => setSeekingOverride('SAVED')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  seekingOverride === 'SAVED'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Saved Prefs
              </button>
              <button
                onClick={() => setSeekingOverride('PRINCESS')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  seekingOverride === 'PRINCESS'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Princesses 👸
              </button>
              <button
                onClick={() => setSeekingOverride('PRINCE')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  seekingOverride === 'PRINCE'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Princes 🤴
              </button>
            </div>

            {/* Online only toggle */}
            <button
              onClick={() => setOnlyOnline(!onlyOnline)}
              className={`py-1 px-2.5 rounded-xl text-[11px] font-semibold border flex items-center gap-1.5 transition-all ${
                onlyOnline
                  ? 'bg-emerald-600/30 border-emerald-500/60 text-emerald-200'
                  : 'bg-slate-800/80 border-slate-700/70 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${onlyOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>Online Only</span>
            </button>
          </div>
        </div>

        {/* FEED CONTENT CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* Realtime Wave Toast feedback */}
          {waveFeedback && (
            <div className="p-3 bg-indigo-900/90 border border-indigo-400 rounded-2xl text-xs font-semibold text-indigo-100 flex items-center justify-between shadow-xl animate-in slide-in-from-top-2">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                {waveFeedback}
              </span>
              <span className="text-[10px] text-indigo-300">Phase 3 Wave</span>
            </div>
          )}

          {/* Phase 4 Invitation Feedback Toast */}
          {invitationFeedback && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xl animate-in slide-in-from-top-2 ${
                invitationFeedback.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {invitationFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{invitationFeedback.text}</span>
              </div>
              {invitationFeedback.type === 'success' && onOpenInvitations && (
                <button
                  onClick={onOpenInvitations}
                  className="underline text-emerald-300 hover:text-white text-[11px] font-bold"
                >
                  View Sent
                </button>
              )}
            </div>
          )}

          {/* Feed Prioritization Legend Bar */}
          {!isLoading && !errorMessage && players.length > 0 && (
            <div className="py-2 px-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Active Feed Prioritization</span>
              </span>
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online Now
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-cyan-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> &lt; 5m
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-blue-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> &lt; 10m
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-purple-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> &lt; 30m
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" /> Earlier
                </span>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-sm font-semibold">Connecting to kingdom player directory...</p>
              <p className="text-xs text-slate-500">Checking real-time presence & saved preferences</p>
            </div>
          ) : errorMessage ? (
            /* Error State: Unable to load discovery */
            <div className="p-6 bg-rose-950/40 border border-rose-500/30 rounded-3xl text-center flex flex-col items-center gap-3">
              <AlertCircle className="w-8 h-8 text-rose-400" />
              <div className="text-sm font-bold text-rose-300">Unable to load discovery</div>
              <p className="text-xs text-slate-300 max-w-md">{errorMessage}</p>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={loadPlayers}
                  disabled={isLoading}
                  className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-rose-500/20 cursor-pointer active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-white ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          ) : players.length === 0 ? (
            /* AUTHENTIC EMPTY STATE: Strictly No Fake Users */
            <div className="py-12 px-6 bg-slate-900/40 border border-slate-800 rounded-3xl text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                <Crown className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  No matching profiles yet. Check back later.
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Prince and Princess Rescue strictly displays <span className="text-amber-300 font-semibold">100% verified real players</span> who have joined the game and saved their profile. We never show fake bots or generated people.
                </p>
              </div>

              {/* Informative breakdown */}
              <div className="bg-slate-800/60 rounded-2xl p-4 max-w-md w-full text-left border border-slate-700/60 text-xs text-slate-300 space-y-2">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Why am I seeing no profiles?
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>Your active search filters may be too narrow (e.g. strict country or age limit).</li>
                  <li>Other registered players may currently be offline.</li>
                  <li>Romantic discovery is strictly limited to adult players (18+) who have reached Level 4.</li>
                </ul>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setOnlyOnline(false);
                    setSeekingOverride('SAVED');
                  }}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all cursor-pointer"
                >
                  Clear Active Search Filters
                </button>
                <button
                  onClick={onOpenPreferences}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all cursor-pointer"
                >
                  Adjust Match Preferences (Age / Scope)
                </button>
              </div>
            </div>
          ) : (
            /* REAL PLAYERS GRID */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {players.map((player) => {
                const hasWaved = wavedPlayerIds.has(player.id);
                const isOnlineNow = player.activityBucket === 0 || player.isOnline;

                return (
                  <div
                    key={player.id}
                    className="relative bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between shadow-lg hover:shadow-indigo-500/10"
                  >
                    {/* Top Row: Avatar, Name, Online Status */}
                    <div className="flex items-start gap-3.5 mb-3">
                      {/* Avatar with Status indicator */}
                      <div className="relative shrink-0">
                        {player.avatar_url ? (
                          <img
                            src={player.avatar_url}
                            alt={player.display_name}
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-400/40 shadow"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-700 to-purple-900 flex items-center justify-center text-white font-black text-xl border-2 border-indigo-400/30">
                            {player.display_name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        {/* Realtime Status Indicator Ring */}
                        <div
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 flex items-center justify-center ${
                            isOnlineNow ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'
                          }`}
                          title={isOnlineNow ? `Online Now (${player.onlineStatus})` : player.activeLabel || 'Offline'}
                        />
                      </div>

                      {/* Name, Demographics, and Presence */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-base font-bold text-white truncate flex items-center gap-1.5">
                            <span>{player.display_name}</span>
                            {player.compatibilityScore && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                {player.compatibilityScore}% Match
                              </span>
                            )}
                          </h4>
                        </div>

                        {/* Age and Country */}
                        <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
                          {player.age && (
                            <span className="font-semibold text-rose-300">
                              Age {player.age}
                            </span>
                          )}
                          {player.country && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <MapPin className="w-3 h-3 text-cyan-400" />
                              <span className="truncate">{player.country}</span>
                            </span>
                          )}
                        </div>

                        {/* Prioritized Realtime Presence Badge */}
                        <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                          {isOnlineNow ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              {player.onlineStatus === 'RUNNING'
                                ? `Running Lvl ${player.onlineLevel || 1} 🏃`
                                : player.onlineStatus === 'PAUSED'
                                ? 'Game Paused ⏸️'
                                : 'Online Now 👑'}
                            </span>
                          ) : player.activityBucket === 1 ? (
                            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              {player.activeLabel} (&lt;5m)
                            </span>
                          ) : player.activityBucket === 2 ? (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                              {player.activeLabel} (&lt;10m)
                            </span>
                          ) : player.activityBucket === 3 ? (
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                              {player.activeLabel} (&lt;30m)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-medium flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                              {player.activeLabel || 'Active earlier'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bio Snippet */}
                    {player.bio ? (
                      <p className="text-xs text-slate-300 italic bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80 mb-3 line-clamp-2">
                        "{player.bio}"
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 italic mb-3">
                        No bio written yet.
                      </p>
                    )}

                    {/* Tags: Religion, Level, Compatibility highlights */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[10px]">
                      {player.religion && player.religion !== 'Prefer not to say' && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {player.religion}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Trophy className="w-2.5 h-2.5" /> Lvl {player.highest_unlocked_level || player.current_level}
                      </span>
                      {player.compatibilityTags?.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/25"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Card Actions: Invite to Chat, Royal Wave and Profile Details */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedPlayer(player)}
                        className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold active:scale-95 transition-all flex items-center gap-1"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Details</span>
                      </button>

                      <button
                        onClick={() => handleWave(player.id, player.display_name)}
                        disabled={hasWaved}
                        className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
                          hasWaved
                            ? 'bg-slate-800/80 text-slate-400 cursor-default'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white active:scale-95'
                        }`}
                        title="Send Royal Wave"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>{hasWaved ? 'Waved' : 'Wave'}</span>
                      </button>

                      {/* Official Phase 4 CTA: Invite to Chat */}
                      {sentInvitePlayerIds.has(player.id) ? (
                        <div className="py-1.5 px-3 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Invitation Sent</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleInviteToChat(player.id, player.display_name)}
                          disabled={isSendingInviteId === player.id}
                          className="py-1.5 px-3.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-600 hover:from-rose-400 hover:via-pink-500 hover:to-indigo-500 text-white shadow-md shadow-rose-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5 text-rose-200" />
                          <span>
                            {isSendingInviteId === player.id ? 'Sending...' : 'Invite to Chat'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PHASE 4 BOUNDARY NOTICE */}
          <div className="mt-6 p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-center text-xs text-slate-300">
            <span className="font-semibold text-rose-300">Phase 4 Chat Invitations: </span>
            Eligible adult players at Level 4+ can send and receive invitations. Once mutual invitations are accepted, 1-on-1 direct messaging will unlock in Phase 5!
          </div>
        </div>

        {/* MODAL: PLAYER DETAIL CARD PREVIEW */}
        {selectedPlayer && (
          <div className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-indigo-950 rounded-3xl border border-amber-500/40 p-6 shadow-2xl flex flex-col text-left">
              <button
                onClick={() => setSelectedPlayer(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-4 mb-4">
                {selectedPlayer.avatar_url ? (
                  <img
                    src={selectedPlayer.avatar_url}
                    alt={selectedPlayer.display_name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400/60 shadow"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-indigo-700 flex items-center justify-center text-white font-black text-2xl border-2 border-amber-400/40">
                    {selectedPlayer.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    {selectedPlayer.display_name}
                  </h3>
                  <div className="text-xs text-rose-300 font-semibold">
                    Age {selectedPlayer.age || '—'} • {selectedPlayer.country || 'Global Citizen'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {selectedPlayer.isOnline ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Online Now ({selectedPlayer.onlineStatus})
                      </span>
                    ) : (
                      'Currently Offline'
                    )}
                  </div>
                </div>
              </div>

              {selectedPlayer.bio && (
                <div className="mb-4">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Royal Bio
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-200 italic leading-relaxed">
                    "{selectedPlayer.bio}"
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">Religion</span>
                  <span className="font-bold text-indigo-300">
                    {selectedPlayer.religion || 'Not specified'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">Highest Level</span>
                  <span className="font-bold text-amber-300">
                    Level {selectedPlayer.highest_unlocked_level || 1}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">Best Score</span>
                  <span className="font-bold text-white font-mono">
                    {selectedPlayer.best_score?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">Enemies Defeated</span>
                  <span className="font-bold text-rose-300 font-mono">
                    {selectedPlayer.total_enemies_defeated || 0}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                {sentInvitePlayerIds.has(selectedPlayer.id) ? (
                  <div className="flex-1 py-3 px-4 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4 text-indigo-400" />
                    <span>Invitation Sent</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleInviteToChat(selectedPlayer.id, selectedPlayer.display_name)}
                    disabled={isSendingInviteId === selectedPlayer.id}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-600 hover:from-rose-400 hover:via-pink-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 active:scale-98 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-rose-200" />
                    <span>{isSendingInviteId === selectedPlayer.id ? 'Sending...' : 'Invite to Chat'}</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs active:scale-98 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
