import React from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Settings, Globe } from 'lucide-react';
import { GameMetrics } from '../game/GameManager';
import { LanguageCode, SUPPORTED_LANGUAGES } from '../game/language/types';

interface PauseModalProps {
  metrics: GameMetrics;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  currentLanguage?: LanguageCode;
  onOpenLanguageSelect?: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  metrics,
  onResume,
  onRestart,
  onOpenSettings,
  isMuted,
  onToggleMute,
  currentLanguage,
  onOpenLanguageSelect,
}) => {
  const currentLangInfo = SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage);
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md pointer-events-auto">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Header */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mb-6" />

        <h2 className="text-3xl font-display font-extrabold text-white mb-2">
          GAME PAUSED
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          Take a breath. The runway is holding.
        </p>

        {/* Current Run Summary */}
        <div className="w-full grid grid-cols-2 gap-3 mb-6 p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80">
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-400 uppercase font-medium">Score</span>
            <span className="text-xl font-bold font-mono-nums text-white">
              {metrics.score.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-amber-400/80 uppercase font-medium">Coins</span>
            <span className="text-xl font-bold font-mono-nums text-amber-300">
              {metrics.coins}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={onResume}
            className="w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-cyan-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>RESUME</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-base rounded-2xl border border-slate-700 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART RUN</span>
          </button>

          {onOpenLanguageSelect && currentLangInfo && (
            <button
              onClick={onOpenLanguageSelect}
              className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-medium text-sm rounded-xl border border-cyan-500/30 flex items-center justify-between active:scale-98 transition-all touch-manipulation cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-slate-400">Target Language:</span>
                <span className="text-xs font-bold text-white">{currentLangInfo.name}</span>
              </div>
              <span className="text-base">{currentLangInfo.flag}</span>
            </button>
          )}

          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={onToggleMute}
              className="flex-1 py-3 px-4 bg-slate-800/60 hover:bg-slate-800 text-slate-300 font-medium text-sm rounded-xl border border-slate-700/60 flex items-center justify-center gap-2 active:scale-95 transition-all touch-manipulation"
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-rose-400" />
                  <span>Unmute</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <span>Mute</span>
                </>
              )}
            </button>

            <button
              onClick={onOpenSettings}
              className="flex-1 py-3 px-4 bg-slate-800/60 hover:bg-slate-800 text-slate-300 font-medium text-sm rounded-xl border border-slate-700/60 flex items-center justify-center gap-2 active:scale-95 transition-all touch-manipulation"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
