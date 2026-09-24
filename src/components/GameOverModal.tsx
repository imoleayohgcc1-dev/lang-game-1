import React from 'react';
import { RotateCcw, Home, Trophy, CircleDot, Flame } from 'lucide-react';
import { GameMetrics } from '../game/GameManager';

interface GameOverModalProps {
  metrics: GameMetrics;
  onRetry: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  metrics,
  onRetry,
  onHome,
}) => {
  const isNewRecord = metrics.score >= metrics.highScore && metrics.score > 0;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md pointer-events-auto animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Visual Pill */}
        <div className="w-12 h-1.5 bg-rose-500/80 rounded-full mb-5" />

        {/* Title */}
        <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-red-300 to-amber-300 mb-1">
          GAME OVER
        </h2>
        <p className="text-xs font-medium text-slate-400 mb-6">
          Track obstacle collision detected!
        </p>

        {/* New Record Banner if applicable */}
        {isNewRecord && (
          <div className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 mb-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>NEW PERSONAL BEST!</span>
          </div>
        )}

        {/* Results Grid */}
        <div className="w-full grid grid-cols-2 gap-3 mb-6 p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80">
          {/* Final Score */}
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Score
            </span>
            <span className="text-2xl font-bold font-mono-nums text-white">
              {metrics.score.toLocaleString()}
            </span>
          </div>

          {/* High Score */}
          <div className="flex flex-col text-right">
            <span className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-wider flex items-center justify-end gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> Best
            </span>
            <span className="text-2xl font-bold font-mono-nums text-amber-300">
              {metrics.highScore.toLocaleString()}
            </span>
          </div>

          <div className="col-span-2 h-[1px] bg-slate-800 my-1" />

          {/* Coins */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <CircleDot className="w-4 h-4 fill-amber-400" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-amber-300/80 font-medium">Coins</span>
              <span className="text-base font-bold font-mono-nums text-amber-300">
                {metrics.coins}
              </span>
            </div>
          </div>

          {/* Distance */}
          <div className="flex flex-col text-right justify-center">
            <span className="text-[10px] text-slate-400 font-medium">Distance</span>
            <span className="text-base font-bold font-mono-nums text-cyan-300">
              {metrics.distance}m
            </span>
          </div>
        </div>

        {/* Primary Action: RETRY */}
        <button
          onClick={onRetry}
          className="w-full py-4 px-6 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-cyan-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation mb-3"
        >
          <RotateCcw className="w-5 h-5" />
          <span>RETRY</span>
        </button>

        {/* Secondary Action: HOME */}
        <button
          onClick={onHome}
          className="w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-sm rounded-xl border border-slate-700/80 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
        >
          <Home className="w-4 h-4" />
          <span>HOME</span>
        </button>
      </div>
    </div>
  );
};
