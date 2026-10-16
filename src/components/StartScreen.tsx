import React, { useState, useEffect } from 'react';
import { Play, Settings, Volume2, VolumeX, Sparkles, Navigation, Compass, Cloud, Users, Crown, UserCheck, Heart, Mail } from 'lucide-react';
import { GAME_CONFIG } from '../game/constants';
import { AuthenticationManager } from '../supabase/authManager';
import { OnlinePresenceManager } from '../supabase/onlinePresenceManager';
import { OnboardingManager, OnboardingData } from '../supabase/onboardingManager';
import { InvitationManager } from '../supabase/invitationManager';

interface StartScreenProps {
  onPlay: () => void;
  onOpenSettings: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  currentLevel?: { levelNumber: number; levelName: string; stars?: number };
  onOpenLevelSelect?: () => void;
  onOpenSupabaseAuth?: () => void;
  onOpenPresence?: () => void;
  onOpenOnboarding?: () => void;
  onOpenPreferences?: () => void;
  onOpenDiscovery?: () => void;
  onOpenInvitations?: () => void;
  highestUnlockedLevel?: number;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onPlay,
  onOpenSettings,
  isMuted,
  onToggleMute,
  currentLevel,
  onOpenLevelSelect,
  onOpenSupabaseAuth,
  onOpenPresence,
  onOpenOnboarding,
  onOpenPreferences,
  onOpenDiscovery,
  onOpenInvitations,
  highestUnlockedLevel = 1,
}) => {
  const [onlineCount, setOnlineCount] = React.useState(0);
  const [authProfileName, setAuthProfileName] = React.useState<string | null>(null);
  const [savedProfile, setSavedProfile] = React.useState<OnboardingData | null>(null);
  const [unreadInvitations, setUnreadInvitations] = React.useState<number>(0);

  React.useEffect(() => {
    const unsubPresence = OnlinePresenceManager.getInstance().subscribe((players) => {
      setOnlineCount(players.length);
    });
    const unsubAuth = AuthenticationManager.getInstance().subscribe((auth) => {
      setAuthProfileName(auth.isAuthenticated ? auth.profile?.display_name || null : null);
    });
    const unsubOnboarding = OnboardingManager.getInstance().subscribe((profile) => {
      setSavedProfile(profile);
    });
    const unsubInvitations = InvitationManager.getInstance().subscribe((_invs, unread) => {
      setUnreadInvitations(unread);
    });
    return () => {
      unsubPresence();
      unsubAuth();
      unsubOnboarding();
      unsubInvitations();
    };
  }, []);

  const activeDisplayName = savedProfile?.displayName || authProfileName;

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 sm:p-10 pointer-events-auto bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-slate-950/90 backdrop-blur-[2px] transition-all">
      {/* Top Bar / Branding Status */}
      <div className="flex items-center justify-between w-full max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
              3D Action Engine
            </span>
          </div>

          {/* Online Presence & Cloud Pill */}
          {onOpenPresence && (
            <button
              onClick={onOpenPresence}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold hover:bg-indigo-900/70 transition-colors cursor-pointer"
              title="View live players online"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>{onlineCount > 0 ? `${onlineCount} Online` : 'Lobby'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">


          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
            className="p-2.5 sm:p-3 text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition-colors active:scale-95 touch-manipulation cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
          </button>
          
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="p-2.5 sm:p-3 text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition-colors active:scale-95 touch-manipulation cursor-pointer"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Hero / Game Identity */}
      <div className="flex flex-col items-center text-center my-auto px-4 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 mb-4 rounded-full bg-gradient-to-r from-amber-500/15 via-cyan-500/15 to-indigo-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider shadow-sm">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>3D Endless Runner</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black font-display tracking-tight text-white mb-2 drop-shadow-md">
          PRINCE AND PRINCESS RESCUE
        </h1>

        <p className="text-base sm:text-lg font-semibold text-cyan-200/90 tracking-wide mb-6">
          Run. Rescue. Find Your Prince or Princess.
        </p>

        {/* Recipient Invitation Notification Pill (Phase 4 Section 5) */}
        {unreadInvitations > 0 && onOpenInvitations && (
          <button
            onClick={onOpenInvitations}
            className="inline-flex items-center gap-2.5 px-4 py-2 mb-4 rounded-2xl bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 border border-rose-500/70 shadow-xl text-xs active:scale-95 transition-all cursor-pointer animate-pulse"
          >
            <Mail className="w-4 h-4 text-rose-400" />
            <span className="text-white font-extrabold">
              {unreadInvitations === 1
                ? 'You have a new invitation to chat!'
                : `You have ${unreadInvitations} invitations waiting for you!`}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-black">
              VIEW
            </span>
          </button>
        )}

        {/* Returning Player Welcome Pill */}
        {savedProfile && savedProfile.onboardingCompleted && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-2xl bg-slate-900/90 border border-amber-400/40 shadow-lg text-xs">
            <span className="text-amber-400 font-bold">Welcome back,</span>
            <span className="text-white font-extrabold">{savedProfile.displayName}</span>
            {savedProfile.country && (
              <span className="text-slate-400 text-[11px]">({savedProfile.country})</span>
            )}
            {onOpenOnboarding && (
              <button
                onClick={onOpenOnboarding}
                className="text-cyan-400 hover:text-cyan-300 font-semibold text-[10px] ml-1 underline cursor-pointer"
                title="Edit player profile"
              >
                Edit
              </button>
            )}
            {onOpenPreferences && (
              <button
                onClick={onOpenPreferences}
                className="text-rose-400 hover:text-rose-300 font-semibold text-[10px] ml-1.5 underline cursor-pointer flex items-center gap-0.5"
                title="Romantic discovery & match preferences"
              >
                <Heart className="w-2.5 h-2.5 fill-current" />
                <span>Preferences</span>
              </button>
            )}
          </div>
        )}

        {/* Sector / Level Selection Pill */}
        {currentLevel && (
          <button
            onClick={onOpenLevelSelect}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-xs font-semibold hover:bg-indigo-900/80 transition-all cursor-pointer shadow-lg active:scale-95"
            title="Click to select level sector"
          >
            <Compass className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-cyan-300">Level {currentLevel.levelNumber}:</span>
            <span className="text-white truncate max-w-[150px] sm:max-w-none">{currentLevel.levelName}</span>
            {currentLevel.stars !== undefined && currentLevel.stars > 0 && (
              <span className="flex items-center text-amber-400 text-[11px] ml-1">
                {'★'.repeat(currentLevel.stars)}
              </span>
            )}
          </button>
        )}

        {/* Primary CTA Play Button: PLAY GAME */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onPlay}
            className="group relative flex items-center justify-center gap-3 w-full sm:w-64 px-8 py-4 sm:py-5 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:via-orange-400 hover:to-indigo-500 text-white font-black text-xl rounded-2xl shadow-xl shadow-amber-500/25 active:scale-98 transition-all duration-200 touch-manipulation cursor-pointer border-t border-amber-300/40"
          >
            <Play className="w-6 h-6 fill-current text-white group-hover:scale-110 transition-transform" />
            <span className="tracking-wide">PLAY GAME</span>
          </button>

          {onOpenLevelSelect && (
            <button
              onClick={onOpenLevelSelect}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-4 sm:py-5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-sm rounded-2xl border border-slate-700/80 active:scale-98 transition-all cursor-pointer"
            >
              <Compass className="w-4 h-4 text-indigo-400" />
              <span>SECTORS</span>
            </button>
          )}

          {onOpenDiscovery && (
            <button
              onClick={onOpenDiscovery}
              className={`flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-4 sm:py-5 rounded-2xl active:scale-98 transition-all cursor-pointer font-bold text-sm border-t ${
                (currentLevel?.levelNumber || 1) >= 4 || (highestUnlockedLevel || 1) >= 4
                  ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-500 hover:via-pink-500 hover:to-indigo-500 text-white shadow-xl shadow-rose-500/25 border-rose-300/40'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/80'
              }`}
              title="Discover real Prince and Princess profiles (Unlocks at Level 4)"
            >
              <Heart
                className={`w-4 h-4 ${
                  (currentLevel?.levelNumber || 1) >= 4 || (highestUnlockedLevel || 1) >= 4
                    ? 'fill-white animate-pulse text-white'
                    : 'text-rose-400'
                }`}
              />
              <span className="tracking-wide">FIND PRINCE / PRINCESS</span>
              {(currentLevel?.levelNumber || 1) < 4 && (highestUnlockedLevel || 1) < 4 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700 font-mono">
                  Lvl 4 🔒
                </span>
              )}
            </button>
          )}

          {onOpenInvitations && (
            <button
              onClick={onOpenInvitations}
              className="relative flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-4 sm:py-5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-sm rounded-2xl border border-slate-700/80 active:scale-98 transition-all cursor-pointer"
              title="Chat Invitations & Notifications"
            >
              <Mail className="w-4 h-4 text-rose-400" />
              <span>INVITATIONS</span>
              {unreadInvitations > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-mono text-[10px] font-black animate-pulse">
                  {unreadInvitations}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Control hint */}
        <div className="flex items-center gap-4 mt-8 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            A/D or Arrows to Move · F to Shoot · B to Bomb · Space to Jump · S to Slide
          </span>
        </div>
      </div>

      {/* Footer info */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-800/80">
        <span>3D Action Runner</span>
        <span>Three.js WebGL Engine</span>
      </div>
    </div>
  );
};
