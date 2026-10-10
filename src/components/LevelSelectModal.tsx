import React from 'react';
import {
  X,
  Lock,
  Play,
  Star,
  Trophy,
  Compass,
  Zap,
  Target,
  Sun,
  Moon,
  Sparkles,
  Tv,
} from 'lucide-react';
import { LevelDefinition, LevelProgressState } from '../game/levels/levelTypes';

interface LevelSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  levels: LevelDefinition[];
  progress: LevelProgressState;
  currentLevelNumber: number;
  onSelectLevel: (levelNumber: number) => void;
  onRequestAdStartLevel?: (levelNumber: number) => void;
  onRequestAdUnlockLevel?: (levelNumber: number) => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  isOpen,
  onClose,
  levels,
  progress,
  currentLevelNumber,
  onSelectLevel,
  onRequestAdStartLevel,
  onRequestAdUnlockLevel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-select-title"
    >
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="level-select-title"
                className="text-lg sm:text-xl font-display font-extrabold text-white"
              >
                SELECT SECTOR
              </h2>
              <p className="text-xs text-slate-400">
                Choose an unlocked track sector to run
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close Level Select"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level List */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
          {levels.map((lvl) => {
            const isUnlocked = progress.unlockedLevels.includes(lvl.levelNumber);
            const isCompleted = progress.completedLevels.includes(lvl.levelNumber);
            const isCurrent = currentLevelNumber === lvl.levelNumber;
            const stars = progress.stars[lvl.levelNumber] || 0;
            const bestDist = progress.bestDistances[lvl.levelNumber] || 0;
            const bestScore = progress.bestScores[lvl.levelNumber] || 0;

            return (
              <div
                key={lvl.levelId}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                    : isUnlocked
                    ? 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700'
                    : 'bg-slate-950/30 border-slate-900 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-mono font-extrabold ${
                        isCurrent
                          ? 'bg-indigo-500 text-white'
                          : isUnlocked
                          ? 'bg-slate-800 text-indigo-300'
                          : 'bg-slate-900 text-slate-500'
                      }`}
                    >
                      LEVEL {lvl.levelNumber}
                    </span>

                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                      {lvl.levelName}
                      {isCompleted && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded font-mono">
                          CLEARED
                        </span>
                      )}
                    </h3>
                  </div>

                  {/* Stars or Lock */}
                  <div className="flex items-center gap-1">
                    {isUnlocked ? (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3].map((starNum) => (
                          <Star
                            key={starNum}
                            className={`w-3.5 h-3.5 ${
                              starNum <= stars
                                ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]'
                                : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
                        <Lock className="w-3.5 h-3.5" />
                        <span>LOCKED</span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-400 mb-3 text-left">
                  {lvl.description}
                </p>

                {/* Badges Row */}
                <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-cyan-400" />
                      {lvl.targetDistance}m
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      {lvl.startingSpeed}-{lvl.maximumSpeed} km/h
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      {lvl.dayNight === 'DAY' ? (
                        <Sun className="w-3 h-3 text-amber-300" />
                      ) : (
                        <Moon className="w-3 h-3 text-indigo-300" />
                      )}
                      {lvl.environment}
                    </span>
                  </div>

                  {/* Action Button: 1-click start with automatic 1 reward ad for changing level */}
                  <div>
                    <button
                      onClick={() => {
                        onSelectLevel(lvl.levelNumber);
                        onClose();
                      }}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md ${
                        isCurrent
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                          : 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:via-orange-400 hover:to-rose-400 text-white border border-amber-300/40 shadow-orange-500/20'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isCurrent ? 'RESTART' : 'PLAY LEVEL'}</span>
                      {!isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 font-mono font-bold text-amber-200">
                          1 AD
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Best stats if recorded */}
                {isUnlocked && (bestScore > 0 || bestDist > 0) && (
                  <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center gap-4 text-[10px] text-slate-400">
                    {bestDist > 0 && (
                      <span>
                        Best Run: <strong className="text-cyan-300">{bestDist}m</strong>
                      </span>
                    )}
                    {bestScore > 0 && (
                      <span>
                        High Score: <strong className="text-amber-300">{bestScore.toLocaleString()}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Total Stars: {Object.values(progress.stars).reduce((a, b) => a + b, 0)}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
