import React from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Settings, Compass, Target, Bomb } from 'lucide-react';
import { GameMetrics } from '../game/GameManager';

interface PauseModalProps {
  metrics: GameMetrics;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenLevelSelect?: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  metrics,
  onResume,
  onRestart,
  onOpenSettings,
  isMuted,
  onToggleMute,
  onOpenLevelSelect,
}) => {
  const levelProgress = metrics.levelProgress;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md pointer-events-auto">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Header */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mb-6" />

        <h2 className="text-3xl font-display font-extrabold text-white mb-2">
          GAME PAUSED
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          Combat paused. Runway is clear.
        </p>

        {/* Level Progression Banner */}
        {levelProgress && (
          <div className="w-full p-3 mb-4 bg-slate-950/80 rounded-2xl border border-indigo-950/80 text-left">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-indigo-300">
                LEVEL {levelProgress.levelNumber}: {levelProgress.levelName}
              </span>
              <span className="font-mono text-cyan-300 font-bold">
                {levelProgress.progressPercentage}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${Math.min(100, levelProgress.progressPercentage)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3 text-cyan-400" />
                {levelProgress.currentDistance}m / {levelProgress.targetDistance}m
              </span>
              <span>{Math.max(0, levelProgress.targetDistance - levelProgress.currentDistance)}m left</span>
            </div>
          </div>
        )}

        {/* Current Run Summary */}
        <div className="w-full grid grid-cols-3 gap-2 mb-5 p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-left">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-medium">Score</span>
            <span className="text-base font-bold font-mono-nums text-white truncate">
              {metrics.score.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-amber-400/80 uppercase font-medium">Coins</span>
            <span className="text-base font-bold font-mono-nums text-amber-300">
              {metrics.coins}
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-purple-400 uppercase font-medium flex items-center justify-end gap-0.5">
              <Bomb className="w-3 h-3 text-purple-400" /> Bombs
            </span>
            <span className="text-base font-bold font-mono-nums text-purple-300">
              {metrics.bombs}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base rounded-2xl shadow-lg shadow-cyan-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>RESUME</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onRestart}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESTART</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-black/40 text-amber-300 font-mono font-bold rounded">
                1 AD
              </span>
            </button>

            {onOpenLevelSelect && (
              <button
                onClick={onOpenLevelSelect}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
              >
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                <span>SECTORS</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={onToggleMute}
              className="flex-1 py-2.5 px-3 bg-slate-800/60 hover:bg-slate-800 text-slate-300 font-medium text-xs rounded-xl border border-slate-700/60 flex items-center justify-center gap-1.5 active:scale-95 transition-all touch-manipulation"
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  <span>Unmute</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Mute</span>
                </>
              )}
            </button>

            <button
              onClick={onOpenSettings}
              className="flex-1 py-2.5 px-3 bg-slate-800/60 hover:bg-slate-800 text-slate-300 font-medium text-xs rounded-xl border border-slate-700/60 flex items-center justify-center gap-1.5 active:scale-95 transition-all touch-manipulation"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
