import React from 'react';
import {
  Pause,
  CircleDot,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Crosshair,
  Heart,
  Zap,
  RotateCw,
} from 'lucide-react';
import { GameMetrics } from '../game/GameManager';

interface HUDProps {
  metrics: GameMetrics;
  onPause: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onJump: () => void;
  onSlide: () => void;
  onShoot: () => void;
  onReload: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  metrics,
  onPause,
  onMoveLeft,
  onMoveRight,
  onJump,
  onSlide,
  onShoot,
  onReload,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 z-10 select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between w-full max-w-4xl mx-auto pointer-events-auto">
        {/* Score & Coins Dashboard */}
        <div className="flex items-center gap-2 sm:gap-3 bg-slate-950/85 backdrop-blur-md px-3 sm:px-4 py-2 rounded-2xl border border-slate-800/80 shadow-lg">
          {/* Score */}
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Score
            </span>
            <span className="text-base sm:text-2xl font-bold font-mono-nums text-white leading-none">
              {metrics.score.toLocaleString()}
            </span>
          </div>

          <div className="w-[1px] h-6 sm:h-7 bg-slate-700/60 mx-1" />

          {/* Coins */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <CircleDot className="w-3 h-3 sm:w-4 sm:h-4 fill-amber-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] sm:text-[10px] font-semibold text-amber-300/80 uppercase tracking-wider">
                Coins
              </span>
              <span className="text-base sm:text-2xl font-bold font-mono-nums text-amber-300 leading-none">
                {metrics.coins}
              </span>
            </div>
          </div>
        </div>

        {/* Health & Ammo Center Hub */}
        <div className="flex items-center gap-2 sm:gap-3 bg-slate-950/85 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl border border-slate-800/80 shadow-lg">
          {/* Health Hearts */}
          <div className="flex items-center gap-1">
            {Array.from({ length: metrics.maxHealth }).map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 ${
                  i < metrics.health
                    ? 'fill-rose-500 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                    : 'text-slate-700 fill-slate-900/60'
                }`}
              />
            ))}
          </div>

          <div className="w-[1px] h-5 bg-slate-800" />

          {/* Ammunition Counter & Quick Reload */}
          <button
            onClick={onReload}
            title="Click to Reload Magazine"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer"
          >
            <Zap className={`w-3.5 h-3.5 ${metrics.isReloading ? 'text-amber-400 animate-spin' : 'text-cyan-400 fill-cyan-400'}`} />
            <span className="text-xs sm:text-sm font-mono-nums font-bold text-slate-200">
              {metrics.isReloading ? (
                <span className="text-amber-400 text-[11px] animate-pulse">RELOAD</span>
              ) : (
                `${metrics.ammo}/${metrics.maxAmmo}`
              )}
            </span>
          </button>
        </div>

        {/* Pause Button */}
        <button
          onClick={onPause}
          aria-label="Pause Game"
          className="p-2.5 sm:p-3 bg-slate-950/80 hover:bg-slate-900 border border-slate-700/80 text-white rounded-2xl shadow-lg active:scale-95 transition-all touch-manipulation cursor-pointer flex items-center justify-center"
        >
          <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current text-slate-200" />
        </button>
      </div>

      {/* Target Lock Assist Banner (Subtle, non-obstructive) */}
      <div className="flex justify-center pointer-events-none">
        {metrics.hasTargetLock && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-950/70 border border-red-500/60 rounded-full text-[11px] font-bold text-red-300 tracking-wider animate-pulse backdrop-blur-md shadow-lg shadow-red-900/40">
            <Crosshair className="w-3.5 h-3.5 text-red-400" />
            <span>TARGET ACQUIRED</span>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar (Mobile-first Thumb Touch Targets) */}
      <div className="flex items-end justify-between w-full max-w-4xl mx-auto pb-1 sm:pb-2 pointer-events-none">
        {/* Left Thumb Cluster: Lateral Lane Movement */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onMoveLeft}
            aria-label="Move Lane Left"
            className="w-13 h-13 sm:w-16 sm:h-16 bg-slate-950/85 hover:bg-slate-900 active:bg-cyan-950/80 border border-slate-700/70 active:border-cyan-400/80 text-white rounded-2xl shadow-xl backdrop-blur-md active:scale-90 transition-all touch-manipulation flex flex-col items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-400" />
            <span className="text-[9px] font-bold text-slate-400 -mt-1">LEFT</span>
          </button>

          <button
            onClick={onMoveRight}
            aria-label="Move Lane Right"
            className="w-13 h-13 sm:w-16 sm:h-16 bg-slate-950/85 hover:bg-slate-900 active:bg-cyan-950/80 border border-slate-700/70 active:border-cyan-400/80 text-white rounded-2xl shadow-xl backdrop-blur-md active:scale-90 transition-all touch-manipulation flex flex-col items-center justify-center cursor-pointer"
          >
            <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-400" />
            <span className="text-[9px] font-bold text-slate-400 -mt-1">RIGHT</span>
          </button>
        </div>

        {/* Right Thumb Cluster: SHOOT, JUMP & SLIDE */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* SLIDE */}
          <button
            onClick={onSlide}
            aria-label="Slide Under Obstacle"
            className="w-13 h-13 sm:w-15 sm:h-15 bg-slate-950/85 hover:bg-slate-900 active:bg-indigo-950/80 border border-slate-700/70 active:border-indigo-400/80 text-white rounded-2xl shadow-xl backdrop-blur-md active:scale-90 transition-all touch-manipulation flex flex-col items-center justify-center cursor-pointer"
          >
            <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
            <span className="text-[9px] font-bold text-indigo-300 -mt-0.5">SLIDE</span>
          </button>

          {/* JUMP */}
          <button
            onClick={onJump}
            aria-label="Jump Over Obstacle"
            className="w-13 h-13 sm:w-15 sm:h-15 bg-gradient-to-b from-cyan-600/90 to-blue-700/90 hover:from-cyan-500 hover:to-blue-600 active:from-cyan-400 active:to-blue-500 border border-cyan-400/60 text-white rounded-2xl shadow-xl shadow-cyan-500/20 backdrop-blur-md active:scale-90 transition-all touch-manipulation flex flex-col items-center justify-center cursor-pointer"
          >
            <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            <span className="text-[9px] font-extrabold text-cyan-100 -mt-0.5">JUMP</span>
          </button>

          {/* SHOOT BUTTON (Prominent, large thumb trigger) */}
          <button
            onClick={onShoot}
            aria-label="Shoot Blaster"
            disabled={metrics.isReloading}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shadow-2xl backdrop-blur-md active:scale-90 transition-all touch-manipulation flex flex-col items-center justify-center cursor-pointer border ${
              metrics.isReloading
                ? 'bg-slate-900/80 border-slate-700 text-slate-500'
                : metrics.hasTargetLock
                ? 'bg-gradient-to-b from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 border-red-400 text-white shadow-red-500/40 animate-pulse'
                : 'bg-gradient-to-b from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 border-amber-300/70 text-white shadow-orange-500/30'
            }`}
          >
            {metrics.isReloading ? (
              <>
                <RotateCw className="w-5 h-5 text-amber-400 animate-spin" />
                <span className="text-[8px] font-bold text-amber-300 mt-0.5">WAIT</span>
              </>
            ) : (
              <>
                <Crosshair className="w-6 h-6 text-white drop-shadow-md" />
                <span className="text-[9px] font-extrabold text-white uppercase tracking-wider -mt-0.5">
                  FIRE
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
