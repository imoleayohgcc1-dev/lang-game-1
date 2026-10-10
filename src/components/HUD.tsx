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
  Bomb,
  Flame,
} from 'lucide-react';
import { GameMetrics } from '../game/GameManager';
import { PowerUpType } from '../game/constants';
import { TemporaryMessage } from './TemporaryMessage';

interface HUDProps {
  metrics: GameMetrics;
  onPause: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onJump: () => void;
  onSlide: () => void;
  onShoot: (side?: 'LEFT' | 'RIGHT' | 'AUTO') => void;
  onBomb: () => void;
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
  onBomb,
  onReload,
}) => {
  const getPowerUpIcon = (type: PowerUpType | string) => {
    switch (type) {
      case 'MAGNET':
        return <Magnet className="w-3.5 h-3.5 text-cyan-400" />;
      case 'SHIELD':
        return <Shield className="w-3.5 h-3.5 text-emerald-400" />;
      case 'COIN_MULTIPLIER':
        return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
      case 'BIG_BULLET':
        return <Flame className="w-3.5 h-3.5 text-amber-500" />;
      case 'MACHINE_GUN':
        return <Zap className="w-3.5 h-3.5 text-rose-400" />;
      case 'BOMB':
        return <Bomb className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  const activeWeapon = metrics.weapon;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 sm:p-4 z-10 select-none">
      {/* 
        ========================================================================
        SAFE_HUD_AREA: Top Header Container
        Only location where dashboard metrics, combat indicators, weapon status,
        bombs, and level progression are displayed.
        Never overlaps or obscures the road, hurdles, enemies, or player.
        ========================================================================
      */}
      <header
        id="SAFE_HUD_AREA"
        data-testid="safe-hud-area"
        className="w-full max-w-4xl mx-auto flex flex-col gap-1.5 sm:gap-2 pointer-events-auto pt-[env(safe-area-inset-top,0.25rem)]"
      >
        {/* Row 1: Dashboard Metrics Bar */}
        <div className="flex items-center justify-between w-full gap-2">
          {/* Left Cluster: Score & Coins */}
          <div className="flex items-center gap-2 sm:gap-3 bg-slate-950/90 backdrop-blur-md px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl border border-slate-800/90 shadow-lg shrink-0">
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

          {/* Center Cluster: Combat Status (Health, Ammo, Weapon, Bombs, Target Lock) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 bg-slate-950/90 backdrop-blur-md px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl border border-slate-800/90 shadow-lg flex-wrap justify-center">
            {/* Unified Player Health Lifespan (❤️ CURRENT_HEALTH / MAX_HEALTH) */}
            <div
              className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 rounded-xl bg-slate-900/80 border border-slate-750 shadow-inner"
              aria-label={`Health: ${metrics.health} of ${metrics.maxHealth}`}
              title={`Lifespan: ${metrics.health}/${metrics.maxHealth} HP`}
            >
              <Heart
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all duration-300 ${
                  metrics.health > 0
                    ? 'fill-rose-500 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.7)] animate-pulse'
                    : 'text-slate-600 fill-slate-800'
                }`}
              />
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-[11px] sm:text-xs font-bold font-mono-nums ${
                      metrics.health <= 25
                        ? 'text-rose-400 animate-pulse'
                        : metrics.health <= 50
                        ? 'text-amber-300'
                        : 'text-emerald-300'
                    }`}
                  >
                    {metrics.health}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono-nums">
                    / {metrics.maxHealth}
                  </span>
                </div>
                <div className="w-12 sm:w-16 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      metrics.health <= 25
                        ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]'
                        : metrics.health <= 50
                        ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                        : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                    }`}
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, (metrics.health / Math.max(1, metrics.maxHealth)) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Protective Shield Forcefield Status */}
            {metrics.shieldStatus?.isActive && (
              <div
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border backdrop-blur-md transition-all ${
                  metrics.shieldStatus.isExpiringSoon
                    ? 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse'
                    : 'bg-emerald-950/90 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                }`}
                title="Protective Shield: Complete Immunity from Damage!"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/30 animate-pulse" />
                <div className="flex items-center gap-0.5">
                  <span className="text-[8px] font-extrabold uppercase text-emerald-300 tracking-wider">
                    SHIELD
                  </span>
                  <span className="text-[9px] font-mono-nums font-bold">
                    {metrics.shieldStatus.remainingDuration.toFixed(1)}s
                  </span>
                </div>
              </div>
            )}

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

            <div className="w-[1px] h-4 sm:h-5 bg-slate-800" />

            {/* Weapon Badge */}
            {activeWeapon && (
              <div
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-[9px] sm:text-[11px] font-bold ${
                  activeWeapon.type === 'SPECIAL_BOMB'
                    ? 'bg-fuchsia-950/80 border-fuchsia-400 text-fuchsia-200 shadow-[0_0_12px_rgba(217,70,239,0.4)] animate-pulse'
                    : activeWeapon.type === 'BIG_BULLET'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse'
                    : activeWeapon.type === 'MACHINE_GUN'
                    ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse'
                    : 'bg-slate-900/80 border-slate-700 text-slate-300'
                }`}
                title={`Active Weapon: ${activeWeapon.name}`}
              >
                <span>{activeWeapon.hudLabel || activeWeapon.name}</span>
                {activeWeapon.remainingDuration > 0 && (
                  <span className="font-mono text-[9px] text-amber-400 ml-0.5">
                    {Math.ceil(activeWeapon.remainingDuration)}s
                  </span>
                )}
              </div>
            )}

            <div className="w-[1px] h-4 sm:h-5 bg-slate-800" />

            {/* Bombs Counter */}
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-purple-950/70 border border-purple-500/40 text-purple-300"
              title={`EMP Bombs: ${metrics.bombs} of ${metrics.maxBombs}`}
            >
              <Bomb className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] sm:text-xs font-mono font-bold">
                {metrics.bombs}/{metrics.maxBombs}
              </span>
            </div>

            {/* Target Lock Pill */}
            {metrics.hasTargetLock && (
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-950/90 border border-rose-500/70 text-[9px] sm:text-[10px] font-bold text-rose-300 shadow-sm animate-pulse"
                title={`Target Acquired: ${metrics.targetEnemyName || 'Enemy Drone'}`}
              >
                <Crosshair className="w-3 h-3 text-rose-400 shrink-0" />
                <span className="hidden sm:inline">LOCKED</span>
              </div>
            )}
          </div>

          {/* Right Cluster: Distance/Speed & Pause */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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

        {/* Row 2: Level Progress Indicator */}
        {metrics.levelProgress && (
          <div
            id="LEVEL_PROGRESS_HUD"
            data-testid="level-progress-hud"
            className="flex items-center justify-between gap-2 px-3 py-1 bg-slate-950/85 backdrop-blur-md rounded-xl border border-indigo-900/60 text-[10px] sm:text-xs shadow-sm"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-1.5 py-0.5 rounded bg-indigo-500/25 text-indigo-300 font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider border border-indigo-500/40 shrink-0">
                LEVEL {metrics.levelProgress.levelNumber}
              </span>
              <span className="text-white font-bold truncate">
                {metrics.levelProgress.levelName}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 font-mono text-slate-300">
                <span className="font-bold text-[10px] sm:text-xs text-indigo-200">
                  {metrics.levelProgress.currentDistance} / {metrics.levelProgress.targetDistance} m
                </span>
                <div className="w-16 sm:w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, metrics.levelProgress.progressPercentage)}%` }}
                  />
                </div>
                <span className="font-bold text-[9px] sm:text-[10px] text-slate-400 min-w-[28px] text-right">
                  {metrics.levelProgress.progressPercentage}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Row 2.5: Dragon Boss Encounter Indicator (SAFE_HUD_AREA) */}
        {metrics.dragonStatus && metrics.dragonStatus.isActive && (
          <div
            id="DRAGON_BOSS_HUD"
            data-testid="dragon-boss-hud"
            className="flex items-center justify-between gap-2 px-3 py-1 bg-purple-950/90 backdrop-blur-md rounded-xl border border-purple-500/60 text-[10px] sm:text-xs shadow-md animate-fade-in"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200 font-extrabold text-[9px] sm:text-[10px] tracking-wider border border-purple-500/50 shrink-0">
                DRAGON BOSS
              </span>
              <span className="text-white font-bold truncate">CYBER WYRM</span>
              {metrics.dragonStatus.isCharging && (
                <span className="text-rose-400 font-black animate-pulse text-[9px] sm:text-[10px] ml-1">
                  ⚠ CHARGING ATTACK!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="w-20 sm:w-28 h-2 bg-slate-900 rounded-full overflow-hidden border border-purple-900/80">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-rose-500 to-amber-400 transition-all duration-200"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, (metrics.dragonStatus.health / metrics.dragonStatus.maxHealth) * 100)
                    )}%`,
                  }}
                />
              </div>
              <span className="font-mono font-bold text-purple-300 text-[10px] min-w-[35px] text-right">
                {metrics.dragonStatus.health}/{metrics.dragonStatus.maxHealth} HP
              </span>
            </div>
          </div>
        )}

        {/* Row 3: Active Power-Ups Row (Subtle, non-intrusive compact chips) */}
        {metrics.activePowerUps && metrics.activePowerUps.length > 0 && (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {metrics.activePowerUps.map((p) => {
              const progressPct = Math.max(0, Math.min(100, (p.remainingDuration / p.maxDuration) * 100));
              const isShield = p.type === 'SHIELD';
              const countdownSec = Math.ceil(p.remainingDuration);
              return (
                <div
                  key={p.type}
                  className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-xl backdrop-blur-md shadow-md transition-all ${
                    isShield
                      ? 'bg-emerald-950/90 border-emerald-400/80 shadow-emerald-500/20 animate-pulse'
                      : 'bg-slate-950/90 border-slate-700/80'
                  }`}
                >
                  {getPowerUpIcon(p.type)}
                  <span className={`text-[10px] sm:text-xs font-extrabold uppercase tracking-wide ${isShield ? 'text-emerald-300' : 'text-white'}`}>
                    {isShield ? `SHIELD ${countdownSec}` : p.name}
                  </span>
                  <div className="w-8 sm:w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        isShield ? 'bg-gradient-to-r from-emerald-400 to-cyan-400' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-extrabold text-cyan-300">
                    {countdownSec}s
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Row 4: Temporary Message Sub-Slot (Safe Header Area, Never Blocks Runway) */}
        {metrics.currentMessage && (
          <TemporaryMessage message={metrics.currentMessage} />
        )}
      </header>

      {/* 
        ========================================================================
        CENTER GAMEPLAY AREA: 100% CLEAR OF ANY OVERLAYS
        Runway, hurdles, gantries, enemies, projectiles, and pickups remain
        completely unobstructed for responsive action gameplay!
        ========================================================================
      */}
      <div className="flex-1 pointer-events-none" aria-hidden="true" />

      {/* 
        ========================================================================
        BOTTOM CONTROLS BAR: Mobile Thumb Clusters
        Positioned at outer bottom corners to keep central road clearly visible.
        ========================================================================
      */}
      <footer className="flex items-end justify-between w-full max-w-4xl mx-auto pb-[env(safe-area-inset-bottom,0.25rem)] pointer-events-none">
        {/* Left Thumb Cluster: Lateral Movement & Left-Side Shoot */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          {/* LEFT-SIDE SHOOT BUTTON (Phase 13A Left-Side Shooting) */}
          <button
            onClick={() => onShoot('LEFT')}
            aria-label="Left-Side Fire"
            disabled={metrics.isReloading}
            className={`w-13 h-13 sm:w-16 sm:h-16 rounded-2xl shadow-2xl backdrop-blur-md active:scale-90 transition-all touch-manipulation flex flex-col items-center justify-center cursor-pointer border ${
              metrics.isReloading
                ? 'bg-slate-900/80 border-slate-700 text-slate-500'
                : 'bg-gradient-to-b from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 border-amber-300/80 text-white shadow-orange-500/30'
            }`}
            title="Left-Side Fire (Keys Q / E)"
          >
            <Crosshair className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            <span className="text-[8px] sm:text-[9px] font-extrabold text-amber-100 uppercase tracking-wider -mt-0.5">
              L-FIRE
            </span>
          </button>

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

        {/* Center Mobile Hint: Double-Tap Screen to Shoot */}
        <div className="pointer-events-none pb-2 flex flex-col items-center">
          <span className="text-[9px] font-bold text-slate-300 bg-slate-950/80 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-slate-700/60 shadow-sm flex items-center gap-1 sm:hidden">
            <Crosshair className="w-2.5 h-2.5 text-amber-400" />
            Double-tap screen to shoot
          </span>
        </div>

        {/* Right Thumb Cluster: BOMB, SLIDE, JUMP, SHOOT */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          {/* BOMB BUTTON */}
          <button
            onClick={onBomb}
            aria-label="Throw EMP Bomb"
            disabled={metrics.bombs <= 0}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shadow-xl backdrop-blur-md active:scale-90 transition-all touch-manipulation flex flex-col items-center justify-center cursor-pointer border ${
              metrics.bombs <= 0
                ? 'bg-slate-900/60 border-slate-800 text-slate-600 opacity-60'
                : 'bg-gradient-to-b from-purple-600 to-indigo-800 hover:from-purple-500 hover:to-indigo-700 border-purple-400/80 text-white shadow-purple-600/30'
            }`}
            title="Throw EMP Bomb (Keys B / G)"
          >
            <Bomb className="w-4 h-4 sm:w-5 sm:h-5 text-purple-200" />
            <span className="text-[8px] sm:text-[9px] font-extrabold text-purple-200 -mt-0.5">
              {metrics.bombs > 0 ? `BOMB (${metrics.bombs})` : 'EMPTY'}
            </span>
          </button>

          {/* SLIDE */}
          <button
            onClick={onSlide}
            aria-label="Slide Under Obstacle"
            className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-950/85 hover:bg-slate-900 active:bg-indigo-950/80 border border-slate-700/70 active:border-indigo-400/80 text-white rounded-2xl shadow-xl backdrop-blur-md active:scale-90 transition-all touch-manipulation flex flex-col items-center justify-center cursor-pointer"
          >
            <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
            <span className="text-[8px] sm:text-[9px] font-bold text-indigo-300 -mt-0.5">SLIDE</span>
          </button>

          {/* JUMP */}
          <button
            onClick={onJump}
            aria-label="Jump Over Obstacle"
            className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-b from-cyan-600/90 to-blue-700/90 hover:from-cyan-500 hover:to-blue-600 active:from-cyan-400 active:to-blue-500 border border-cyan-400/60 text-white rounded-2xl shadow-xl shadow-cyan-500/20 backdrop-blur-md active:scale-90 transition-all touch-manipulation flex flex-col items-center justify-center cursor-pointer"
          >
            <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            <span className="text-[8px] sm:text-[9px] font-extrabold text-cyan-100 -mt-0.5">JUMP</span>
          </button>

          {/* RIGHT SHOOT BUTTON */}
          <button
            onClick={() => onShoot('RIGHT')}
            aria-label="Shoot Blaster"
            disabled={metrics.isReloading}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shadow-2xl backdrop-blur-md active:scale-90 transition-all touch-manipulation flex flex-col items-center justify-center cursor-pointer border ${
              metrics.isReloading
                ? 'bg-slate-900/80 border-slate-700 text-slate-500'
                : metrics.hasTargetLock
                ? 'bg-gradient-to-b from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 border-rose-400 text-white shadow-rose-600/40 animate-pulse'
                : 'bg-gradient-to-b from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 border-amber-300/70 text-white shadow-orange-500/30'
            }`}
            title="Shoot Weapon (Key F)"
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
