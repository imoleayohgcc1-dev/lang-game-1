import React from 'react';
import { Play, Settings, Volume2, VolumeX, Sparkles, Navigation, Globe } from 'lucide-react';
import { GAME_CONFIG } from '../game/constants';
import { LanguageCode, SUPPORTED_LANGUAGES } from '../game/language/types';

interface StartScreenProps {
  onPlay: () => void;
  onOpenSettings: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  currentLanguage?: LanguageCode;
  onOpenLanguageSelect?: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onPlay,
  onOpenSettings,
  isMuted,
  onToggleMute,
  currentLanguage = 'zh-CN',
  onOpenLanguageSelect,
}) => {
  const currentLangInfo = SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 sm:p-10 pointer-events-auto bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-slate-950/90 backdrop-blur-[2px] transition-all">
      {/* Top Bar / Branding Status */}
      <div className="flex items-center justify-between w-full max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider text-cyan-400 uppercase">
            3D Three.js Engine
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Target Language Selector */}
          <button
            onClick={onOpenLanguageSelect}
            title="Change Target Language"
            aria-label="Change Target Language"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-200 bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 rounded-xl transition-all active:scale-95 touch-manipulation cursor-pointer shadow-md shadow-cyan-950/30"
          >
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="text-base">{currentLangInfo.flag}</span>
            <span className="hidden sm:inline font-semibold">{currentLangInfo.name}</span>
          </button>

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
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Gen Endless Learning</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold font-display tracking-tight text-white mb-3 drop-shadow-md">
          {GAME_CONFIG.TITLE}
        </h1>

        <p className="text-lg sm:text-xl font-medium text-cyan-200/90 tracking-wide mb-8">
          {GAME_CONFIG.SUBTITLE}
        </p>

        {/* Primary CTA Play Button */}
        <button
          onClick={onPlay}
          className="group relative flex items-center justify-center gap-3 w-full sm:w-72 px-8 py-4 sm:py-5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-bold text-xl rounded-2xl shadow-lg shadow-cyan-500/25 active:scale-98 transition-all duration-200 touch-manipulation cursor-pointer border-t border-cyan-300/40"
        >
          <Play className="w-6 h-6 fill-current text-white group-hover:scale-110 transition-transform" />
          <span className="tracking-wide">PLAY NOW</span>
        </button>

        {/* Control hint */}
        <div className="flex items-center gap-4 mt-8 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            Swipe or Arrow Keys to Switch Lanes
          </span>
        </div>
      </div>

      {/* Footer info */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-800/80">
        <span>Phase 1 — 3D Engine Foundation</span>
        <span>Three.js WebGL Runner</span>
      </div>
    </div>
  );
};
