import React from 'react';
import {
  Trophy,
  Star,
  ArrowRight,
  RotateCcw,
  List,
  Sparkles,
  CircleDot,
  CheckCircle2,
  Play,
  Flame,
  Crosshair,
  Tv,
} from 'lucide-react';
import { LevelCompletionStats } from '../game/levels/levelTypes';

interface LevelCompleteModalProps {
  stats: LevelCompletionStats;
  onNextLevel: () => void;
  onReplayLevel: () => void;
  onOpenLevelSelect?: () => void;
  onContinueRunning?: () => void;
}

export const LevelCompleteModal: React.FC<LevelCompleteModalProps> = ({
  stats,
  onNextLevel,
  onReplayLevel,
  onOpenLevelSelect,
  onContinueRunning,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-complete-title"
    >
      <div className="w-full max-w-md bg-slate-900 border border-indigo-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col items-center text-center my-auto">
        {/* Decorative Top Pill */}
        <div className="w-12 h-1.5 bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 rounded-full mb-3" />

        {/* Level Cleared Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs font-extrabold uppercase tracking-widest mb-1.5 shadow-sm">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>LEVEL {stats.levelNumber} COMPLETED!</span>
        </div>

        {/* Level Name */}
        <h2
          id="level-complete-title"
          className="text-2xl sm:text-3xl font-display font-extrabold text-white mb-2"
        >
          {stats.levelName}
        </h2>

        {/* 3-Star Rating Display */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {[1, 2, 3].map((starNum) => {
            const isEarned = starNum <= stats.starsEarned;
            return (
              <div
                key={starNum}
                className={`p-2 rounded-2xl border transition-all duration-300 ${
                  isEarned
                    ? 'bg-amber-500/20 border-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.4)] scale-110'
                    : 'bg-slate-800/40 border-slate-700/50 opacity-40 scale-95'
                }`}
              >
                <Star
                  className={`w-7 h-7 sm:w-8 sm:h-8 ${
                    isEarned
                      ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                      : 'text-slate-600'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Next Level Status Banner */}
        {stats.nextLevelUnlocked ? (
          <div className="w-full flex items-center justify-center gap-2 py-2 px-3 mb-3 rounded-xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-indigo-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-sm animate-pulse">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>LEVEL {stats.nextLevelNumber || stats.levelNumber + 1} UNLOCKED!</span>
          </div>
        ) : (
          <div className="w-full flex items-center justify-center gap-2 py-2 px-3 mb-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-sm">
            <Tv className="w-4 h-4 text-amber-400" />
            <span>LEVEL {stats.nextLevelNumber || stats.levelNumber + 1}: 2 REWARD ADS TO UNLOCK</span>
          </div>
        )}

        {/* Primary Rewards Banner */}
        <div className="w-full grid grid-cols-2 gap-2 mb-3">
          <div className="flex items-center justify-center gap-2 p-2.5 bg-indigo-950/40 rounded-xl border border-indigo-800/50">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-slate-400 font-medium">Earned XP</span>
              <span className="text-base font-bold text-cyan-300 font-mono">+{stats.xpEarned}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 p-2.5 bg-amber-950/30 rounded-xl border border-amber-800/50">
            <CircleDot className="w-4 h-4 fill-amber-400 text-amber-400" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-amber-400/80 font-medium">Earned Coins</span>
              <span className="text-base font-bold text-amber-300 font-mono">+{stats.coinsEarned}</span>
            </div>
          </div>
        </div>

        {/* Objectives Completed Checklist */}
        <div className="w-full p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 mb-3 text-left">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Objectives Achieved ({stats.objectivesCompleted.length})</span>
          </div>
          <div className="flex flex-col gap-1">
            {stats.objectivesCompleted.map((desc, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-200">
                <span className="text-emerald-400 font-bold">✓</span>
                <span className="truncate">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-3 gap-2 mb-4 p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-left">
          {/* Distance */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-medium">Distance</span>
            <span className="text-sm font-bold text-cyan-300 font-mono">
              {stats.distanceReached}m
            </span>
          </div>

          {/* Combat Enemies */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <Crosshair className="w-3 h-3 text-rose-400" /> Enemies
            </span>
            <span className="text-sm font-bold text-rose-300 font-mono">
              {stats.enemiesDefeated || 0}
            </span>
          </div>

          {/* Final Score */}
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-slate-400 font-medium flex items-center justify-end gap-1">
              <Flame className="w-3 h-3 text-amber-400" /> Score
            </span>
            <span className="text-sm font-bold text-white font-mono">
              {stats.score.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-2">
          {/* Primary Action: NEXT LEVEL */}
          <button
            onClick={onNextLevel}
            className="w-full py-3.5 px-4 rounded-2xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation font-bold text-base text-white bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500 hover:from-indigo-400 hover:via-cyan-400 hover:to-emerald-400 shadow-cyan-500/25"
          >
            <span>NEXT LEVEL</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/35 font-mono text-cyan-200 border border-cyan-400/30">
              1 REWARD AD
            </span>
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Secondary Actions Row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onReplayLevel}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl border border-slate-700/80 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>REPLAY</span>
            </button>

            {onOpenLevelSelect && (
              <button
                onClick={onOpenLevelSelect}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl border border-slate-700/80 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
              >
                <List className="w-3.5 h-3.5" />
                <span>LEVELS</span>
              </button>
            )}
          </div>

          {onContinueRunning && (
            <button
              onClick={onContinueRunning}
              className="text-[11px] text-slate-400 hover:text-slate-300 py-1 transition-colors flex items-center justify-center gap-1"
            >
              <Play className="w-3 h-3" />
              <span>Continue running in endless mode</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
