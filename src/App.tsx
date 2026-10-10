/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameManager, GameMetrics } from './game/GameManager';
import { GameState, GameSettings, DEFAULT_SETTINGS } from './game/constants';
import { Achievement } from './game/AchievementManager';
import { StartScreen } from './components/StartScreen';
import { HUD } from './components/HUD';
import { PauseModal } from './components/PauseModal';
import { SettingsModal } from './components/SettingsModal';
import { GameOverModal } from './components/GameOverModal';
import { LevelCompleteModal } from './components/LevelCompleteModal';
import { LevelSelectModal } from './components/LevelSelectModal';
import { AdModal } from './components/AdModal';
import { WebGLFallback } from './components/WebGLFallback';
import { LevelCompletionStats } from './game/levels/levelTypes';
import { AdManager } from './game/AdManager';
import { AdPlacement } from './game/adConfig';
import { Award } from 'lucide-react';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);

  const [gameState, setGameState] = useState<GameState>('LOADING');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedToast, setUnlockedToast] = useState<Achievement | null>(null);
  const [activeAd, setActiveAd] = useState<{
    placement: AdPlacement;
    attemptId: string;
    durationSeconds: number;
  } | null>(null);

  const [metrics, setMetrics] = useState<GameMetrics>({
    score: 0,
    coins: 0,
    distance: 0,
    speed: 0,
    currentLane: 1,
    highScore: 0,
    playerState: 'RUNNING',
    health: 3,
    maxHealth: 3,
    ammo: 10,
    maxAmmo: 10,
    isReloading: false,
    hasTargetLock: false,
    weapon: {
      type: 'NORMAL',
      name: 'Normal Blaster',
      damage: 1,
      ammo: 10,
      maxAmmo: 10,
      isReloading: false,
      remainingDuration: 0,
      maxDuration: 0,
      hudLabel: 'NORMAL',
    },
    bombs: 3,
    maxBombs: 5,
    activePowerUps: [],
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLevelSelectOpen, setIsLevelSelectOpen] = useState<boolean>(false);
  const [completedLevelStats, setCompletedLevelStats] = useState<LevelCompletionStats | null>(null);
  const [webGLError, setWebGLError] = useState<string | null>(null);

  const initGame = useCallback(() => {
    if (!containerRef.current) return;

    if (gameManagerRef.current) {
      gameManagerRef.current.dispose();
      gameManagerRef.current = null;
    }

    setWebGLError(null);

    try {
      const gm = new GameManager(containerRef.current, (newMetrics) => {
        setMetrics(newMetrics);
      });

      gm.stateManager.subscribe((newState) => {
        setGameState(newState);
      });

      gm.onLevelCompleted = (stats) => {
        setCompletedLevelStats(stats);
      };

      gm.achievementManager.onAchievementUnlocked = (ach) => {
        setAchievements([...gm.achievementManager.getAchievements()]);
        setUnlockedToast(ach);
        setTimeout(() => {
          setUnlockedToast(null);
        }, 4000);
      };

      gameManagerRef.current = gm;
      setGameState(gm.stateManager.getState());
      setSettings(gm.settings);
      setAchievements(gm.achievementManager.getAchievements());
      setIsMuted(gm.audioManager.getIsMuted());
    } catch (err: unknown) {
      console.error('[App] Game initialization error:', err);
      const message = err instanceof Error ? err.message : 'Unknown WebGL failure';
      setWebGLError(message);
    }
  }, []);

  useEffect(() => {
    initGame();

    return () => {
      if (gameManagerRef.current) {
        gameManagerRef.current.dispose();
        gameManagerRef.current = null;
      }
    };
  }, [initGame]);

  // Handlers
  const handlePlay = () => {
    if (gameManagerRef.current) {
      gameManagerRef.current.startGame();
    }
  };

  const handlePause = () => {
    if (gameManagerRef.current) {
      gameManagerRef.current.pause();
    }
  };

  const handleResume = () => {
    if (gameManagerRef.current) {
      gameManagerRef.current.resume();
    }
  };

  const handleRestart = () => {
    if (gameManagerRef.current) {
      gameManagerRef.current.restart();
    }
  };

  const handleHome = () => {
    if (gameManagerRef.current) {
      gameManagerRef.current.goHome();
    }
  };

  const handleToggleMute = () => {
    if (gameManagerRef.current) {
      const muted = gameManagerRef.current.audioManager.toggleMute();
      setIsMuted(muted);
    } else {
      setIsMuted(!isMuted);
    }
  };

  const handleUpdateSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    if (gameManagerRef.current) {
      gameManagerRef.current.saveSettings(newSettings);
      setIsMuted(gameManagerRef.current.audioManager.getIsMuted());
    }
  };

  const handleMoveLeft = () => {
    gameManagerRef.current?.moveLeft();
  };

  const handleMoveRight = () => {
    gameManagerRef.current?.moveRight();
  };

  const handleJump = () => {
    gameManagerRef.current?.jump();
  };

  const handleSlide = () => {
    gameManagerRef.current?.slide();
  };

  const handleShoot = (side?: 'LEFT' | 'RIGHT' | 'AUTO') => {
    gameManagerRef.current?.shoot(side);
  };

  const handleBomb = () => {
    gameManagerRef.current?.throwBomb();
  };

  const handleReload = () => {
    gameManagerRef.current?.triggerReload();
  };

  const handleNextLevel = () => {
    setCompletedLevelStats(null);
    gameManagerRef.current?.startNextLevel();
  };

  const handleReplayLevel = () => {
    setCompletedLevelStats(null);
    gameManagerRef.current?.restartCurrentLevel();
  };

  const handleSelectLevel = (levelNumber: number) => {
    setCompletedLevelStats(null);
    gameManagerRef.current?.startLevel(levelNumber);
  };

  const handleContinueRunningLevel = () => {
    setCompletedLevelStats(null);
  };

  useEffect(() => {
    const unsub = AdManager.getInstance().subscribeState((active) => {
      setActiveAd(active);
    });
    return unsub;
  }, []);

  const handleRewardedRetry = useCallback(async () => {
    if (!gameManagerRef.current?.canUseRewardedRetry()) return;
    const result = await AdManager.getInstance().showRewardedAd('REWARDED_RETRY');
    if (result.success && result.earnedReward) {
      gameManagerRef.current?.revivePlayerWithReward();
    }
  }, []);

  const handleRequestAdStartLevel = useCallback(async (levelNumber: number) => {
    setIsLevelSelectOpen(false);
    const result = await AdManager.getInstance().showRewardedAd('LEVEL_START_REWARD');
    if (result.success && result.earnedReward) {
      handleSelectLevel(levelNumber);
      gameManagerRef.current?.playerHealthManager.activateShield(7.0);
      gameManagerRef.current?.showMessage('🛡️ REWARDED DEPLOY: ENERGY GLOBE ACTIVE (7s)', 2500, 'powerup');
    }
  }, []);

  const handleRequestAdUnlockLevel = useCallback(async (levelNumber: number) => {
    const result = await AdManager.getInstance().showRewardedAd('LEVEL_UNLOCK_REWARD');
    if (result.success && result.earnedReward && gameManagerRef.current) {
      const outcome = gameManagerRef.current.levelManager.recordAdWatchedForLevel(levelNumber);
      if (outcome.unlocked) {
        gameManagerRef.current.showMessage(
          `🎉 LEVEL ${levelNumber} UNLOCKED VIA 2 REWARD ADS!`,
          3500,
          'success'
        );
      } else {
        gameManagerRef.current.showMessage(
          `✨ AD ${outcome.current}/${outcome.required} WATCHED! WATCH 1 MORE TO UNLOCK LEVEL ${levelNumber}!`,
          3500,
          'powerup'
        );
      }
      gameManagerRef.current.broadcastMetrics();
    }
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* Three.js Canvas Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Achievement Unlocked Toast */}
      {unlockedToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/95 border border-amber-400/80 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md animate-bounce">
          <span className="text-2xl">{unlockedToast.icon}</span>
          <div>
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-400" />
              Trophy Unlocked
            </div>
            <div className="text-xs font-bold text-white">{unlockedToast.title}</div>
            <div className="text-[10px] text-slate-300">{unlockedToast.description}</div>
          </div>
        </div>
      )}

      {/* WebGL Error Fallback */}
      {webGLError && (
        <WebGLFallback
          errorMessage={webGLError}
          onRetry={initGame}
        />
      )}

      {/* Start Screen Overlay */}
      {(gameState === 'READY' || gameState === 'LOADING') && (
        <StartScreen
          onPlay={handlePlay}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          currentLevel={
            metrics.levelProgress
              ? {
                  levelNumber: metrics.levelProgress.levelNumber,
                  levelName: metrics.levelProgress.levelName,
                  stars: gameManagerRef.current?.levelManager.getLevelStars(metrics.levelProgress.levelNumber),
                }
              : undefined
          }
          onOpenLevelSelect={() => setIsLevelSelectOpen(true)}
        />
      )}

      {/* In-Game HUD */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
        <HUD
          metrics={metrics}
          onPause={handlePause}
          onMoveLeft={handleMoveLeft}
          onMoveRight={handleMoveRight}
          onJump={handleJump}
          onSlide={handleSlide}
          onShoot={handleShoot}
          onBomb={handleBomb}
          onReload={handleReload}
        />
      )}

      {/* Pause Menu Modal */}
      {gameState === 'PAUSED' && (
        <PauseModal
          metrics={metrics}
          onResume={handleResume}
          onRestart={handleRestart}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenLevelSelect={() => setIsLevelSelectOpen(true)}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'GAME_OVER' && (
        <GameOverModal
          metrics={metrics}
          onRetry={handleRestart}
          onHome={handleHome}
          onOpenLevelSelect={() => setIsLevelSelectOpen(true)}
          onRewardedRetry={handleRewardedRetry}
          canRewardedRetry={metrics.canRewardedRetry ?? true}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        achievements={achievements}
      />

      {/* Level Complete Results Modal */}
      {completedLevelStats && (
        <LevelCompleteModal
          stats={completedLevelStats}
          onNextLevel={handleNextLevel}
          onReplayLevel={handleReplayLevel}
          onOpenLevelSelect={() => setIsLevelSelectOpen(true)}
          onContinueRunning={handleContinueRunningLevel}
        />
      )}

      {/* Level Select Modal (Sector Selector) */}
      <LevelSelectModal
        isOpen={isLevelSelectOpen}
        onClose={() => setIsLevelSelectOpen(false)}
        levels={gameManagerRef.current?.levelManager.getAllLevels() || []}
        progress={
          gameManagerRef.current?.levelManager.progress || {
            unlockedLevels: [1],
            completedLevels: [],
            currentLevelNumber: 1,
            bestScores: {},
            bestDistances: {},
            stars: {},
            totalLevelCoins: 0,
            totalLevelXP: 0,
          }
        }
        currentLevelNumber={metrics.levelProgress?.levelNumber || 1}
        onSelectLevel={handleSelectLevel}
        onRequestAdStartLevel={handleRequestAdStartLevel}
        onRequestAdUnlockLevel={handleRequestAdUnlockLevel}
      />

      {/* Rewarded Ad Transmission Modal (Phase 14) */}
      {activeAd && (
        <AdModal
          placement={activeAd.placement}
          durationSeconds={activeAd.durationSeconds}
          onComplete={() => {
            AdManager.getInstance().confirmAdCompletion(activeAd.attemptId);
          }}
          onCancel={() => {
            AdManager.getInstance().cancelOrCloseAd(activeAd.attemptId);
          }}
        />
      )}
    </main>
  );
}
