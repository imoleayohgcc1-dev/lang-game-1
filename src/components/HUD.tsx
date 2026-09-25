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
  Magnet,
  Shield,
  Sparkles,
} from 'lucide-react';
import { GameMetrics } from '../game/GameManager';
import { PowerUpType } from '../game/constants';
import { TemporaryMessage } from './TemporaryMessage';
import { LanguageChallengeBar } from './LanguageChallengeBar';

interface HUDProps {
  metrics: GameMetrics;
  onPause: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onJump: () => void;
  onSlide: () => void;
  onShoot: () => void;
  onReload: () => void;
  onPlayPronunciation?: () => void;
  onCompleteLanguageChallenge?: () => void;
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
  onPlayPronunciation,
  onCompleteLanguageChallenge,
}) => {
  const getPowerUpIcon = (type: PowerUpType) => {
    switch (type) {
      case 'MAGNET':
        return <Magnet className="w-3.5 h-3.5 text-cyan-400" />;
      case 'SHIELD':
        return <Shield className="w-3.5 h-3.5 text-emerald-400" />;
      case 'COIN_MULTIPLIER':
        return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 sm:p-4 z-10 select-none">
      {/* 
        ========================================================================
        SAFE_HUD_AREA: Top Header Container
        Only location where permanent dashboard metrics and temporary gameplay,
        target lock, or language prompts are displayed.
        Never overlaps or obscures the road, obstacles, enemies, or player.
        ========================================================================
      */}
      <header
        id="SAFE_HUD_AREA"
        data-testid="safe-hud-area"
        className="w-full max-w-4xl mx-auto flex flex-col gap-1.5 sm:gap-2 pointer-events-auto pt-[env(safe-area-inset-top,0.25rem)]"
      >
        {/* Row 1: Permanent Metrics Bar */}
        <div className="flex items-center justify-between w-full gap-2">
          {/* Left Cluster: Score & Coins Dashboard */}
          <div className="flex items-center gap-2 sm:gap-3 bg-slate-950/90 backdrop-blur-md px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl border border-slate-800/90 shadow-lg">
            {/* Score */}
            <div className="flex flex-col">
              <span className="text-[8px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Score
              </span>
              <span className="text-sm sm:text-2xl font-bold font-mono-nums text-white leading-none">
                {metrics.score.toLocaleString()}
              </span>
            </div>

            <div className="w-[1px] h-5 sm:h-7 bg-slate-700/60 mx-0.5 sm:mx-1" />

            {/* Coins */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                <CircleDot className="w-3 h-3 sm:w-4 sm:h-4 fill-amber-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] sm:text-[10px] font-semibold text-amber-300/80 uppercase tracking-wider">
                  Coins
                </span>
                <span className="text-sm sm:text-2xl font-bold font-mono-nums text-amber-300 leading-none">
                  {metrics.coins}
                </span>
              </div>
            </div>
          </div>

          {/* Center Cluster: Health & Ammunition & Target Lock Indicator */}
          <div className="flex items-center gap-1.5 sm:gap-3 bg-slate-950/90 backdrop-blur-md px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl border border-slate-800/90 shadow-lg">
            {/* Health Hearts */}
            <div className="flex items-center gap-0.5 sm:gap-1" aria-label={`Health: ${metrics.health} of ${metrics.maxHealth}`}>
              {Array.from({ length: metrics.maxHealth }).map((_, i) => (
                <Heart
                  key={i}
                  className={`w-3.5 h-3.5 sm:w-5 sm:h-5 transition-all duration-300 ${
                    i < metrics.health
                      ? 'fill-rose-500 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                      : 'text-slate-700 fill-slate-900/60'
                  }`}
                />
              ))}
            </div>

            <div className="w-[1px] h-4 sm:h-5 bg-slate-800" />

            {/* Ammunition Counter */}
            <button
              onClick={onReload}
              title="Click to Reload Magazine"
              className="flex items-center gap-1 px-1 py-0.5 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <Zap
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                  metrics.isReloading ? 'text-amber-400 animate-spin' : 'text-cyan-400 fill-cyan-400'
                }`}
              />
              <span className="text-[11px] sm:text-sm font-mono-nums font-bold text-slate-200">
                {metrics.isReloading ? (
                  <span className="text-amber-400 text-[10px] sm:text-[11px] animate-pulse">RELOAD</span>
                ) : (
                  `${metrics.ammo}/${metrics.maxAmmo}`
                )}
              </span>
            </button>

            {/* Unobtrusive Target Lock Pill (In Header SAFE_HUD_AREA - Never blocks gameplay road) */}
            {metrics.hasTargetLock && (
              <div
                className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-950/90 border border-rose-500/60 text-[9px] sm:text-[10px] font-bold text-rose-300 shadow-sm animate-pulse"
                title={`Target Acquired: ${metrics.targetEnemyName || 'Enemy Drone'}`}
              >
                <Crosshair className="w-3 h-3 text-rose-400 shrink-0" />
                <span className="hidden sm:inline">LOCKED</span>
              </div>
            )}
          </div>

          {/* Right Cluster: Distance/Speed & Pause */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden md:flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-slate-800 text-xs text-slate-300 font-mono-nums">
              <span className="font-semibold text-cyan-300">{metrics.distance}m</span>
              <span className="text-slate-600">·</span>
              <span>{metrics.speed} km/h</span>
            </div>

            <button
              onClick={onPause}
              aria-label="Pause Game"
              className="p-2 sm:p-2.5 bg-slate-950/85 hover:bg-slate-900 border border-slate-700/80 text-white rounded-2xl shadow-lg active:scale-95 transition-all touch-manipulation cursor-pointer flex items-center justify-center"
            >
              <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current text-slate-200" />
            </button>
          </div>
        </div>

        {/* Row 2: Active Power-Ups Row (Subtle, non-intrusive compact chips) */}
        {metrics.activePowerUps && metrics.activePowerUps.length > 0 && (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {metrics.activePowerUps.map((p) => {
              const progressPct = Math.max(0, Math.min(100, (p.remainingDuration / p.maxDuration) * 100));
              return (
                <div
                  key={p.type}
                  className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-700/80 px-2 py-0.5 sm:py-1 rounded-xl backdrop-blur-md shadow-md animate-fade-in"
                >
                  {getPowerUpIcon(p.type)}
                  <span className="text-[10px] sm:text-xs font-semibold text-white">{p.name}</span>
                  <div className="w-8 sm:w-12 h-1 sm:h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-200"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-400">
                    {Math.ceil(p.remainingDuration)}s
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Row 3: Temporary Message Sub-Slot (Phase 5A Safe Messaging) */}
        {metrics.currentMessage && (
          <TemporaryMessage message={metrics.currentMessage} />
        )}

        {/* Row 4: Language Challenge Bar (Phase 5B Learning Prompt) */}
        {metrics.languageChallenge && metrics.languageChallenge.state !== 'IDLE' && (
          <LanguageChallengeBar
            state={metrics.languageChallenge.state}
            item={metrics.languageChallenge.item}
            onPlayPronunciation={onPlayPronunciation || (() => {})}
            onComplete={onCompleteLanguageChallenge || (() => {})}
          />
        )}
      </header>

      {/* 
        ========================================================================
        CENTER GAMEPLAY AREA: 100% CLEAR OF ANY OVERLAYS
        The road, hurdles, gantries, blocking pillars, moving barriers,
        drones, coins, power-ups, and player remain completely unobstructed!
        ========================================================================
      */}
      <div className="flex-1 pointer-events-none" aria-hidden="true" />

      {/* 
        ========================================================================
        BOTTOM CONTROLS BAR: Mobile Thumb Clusters
        Positioned at outer bottom corners to keep the central road visible.
        ========================================================================
      */}
      <footer className="flex items-end justify-between w-full max-w-4xl mx-auto pb-[env(safe-area-inset-bottom,0.25rem)] pointer-events-none">
        {/* Left Thumb Cluster: Lateral Lane Movement */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
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
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
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

          {/* SHOOT BUTTON (Visually signals target lock right at the player's thumb) */}
          <button
            onClick={onShoot}
            aria-label="Shoot Blaster"
            disabled={metrics.isReloading}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shadow-2xl backdrop-blur-md active:scale-90 transition-all touch-manipulation flex flex-col items-center justify-center cursor-pointer border ${
              metrics.isReloading
                ? 'bg-slate-900/80 border-slate-700 text-slate-500'
                : metrics.hasTargetLock
                ? 'bg-gradient-to-b from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 border-rose-400 text-white shadow-rose-600/40 animate-pulse'
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
                  {metrics.hasTargetLock ? 'LOCK' : 'FIRE'}
                </span>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
};
