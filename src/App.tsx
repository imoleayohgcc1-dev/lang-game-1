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
import { SupabaseAuthModal } from './components/SupabaseAuthModal';
import { OnlinePresenceModal } from './components/OnlinePresenceModal';
import { LevelCompletionStats } from './game/levels/levelTypes';
import { AdManager } from './game/AdManager';
import { AdPlacement } from './game/adConfig';
import { CloudSaveManager } from './supabase/cloudSaveManager';
import { OnlinePresenceManager } from './supabase/onlinePresenceManager';
import { OnboardingManager } from './supabase/onboardingManager';
import { MatchPreferencesManager } from './supabase/matchPreferencesManager';
import { OnboardingModal } from './components/OnboardingModal';
import { ProfileCompletionModal } from './components/ProfileCompletionModal';
import { MatchPreferencesModal } from './components/MatchPreferencesModal';
import { DiscoveryModal } from './components/DiscoveryModal';
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
    extraLives: 0,
    timeElapsed: 0,
    timeRemaining: 180,
    weather: 'SUNNY',
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLevelSelectOpen, setIsLevelSelectOpen] = useState<boolean>(false);
  const [isSupabaseAuthOpen, setIsSupabaseAuthOpen] = useState<boolean>(false);
  const [isOnlinePresenceOpen, setIsOnlinePresenceOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isProfileCompletionOpen, setIsProfileCompletionOpen] = useState<boolean>(false);
  const [isMatchPreferencesOpen, setIsMatchPreferencesOpen] = useState<boolean>(false);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState<boolean>(false);
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

        // Update Realtime Player Presence based on state
        const currentLvl = gm.levelManager.getCurrentLevel().levelNumber;
        if (newState === 'PLAYING') {
          OnlinePresenceManager.getInstance().updatePlayerActivity('RUNNING', currentLvl);
        } else if (newState === 'PAUSED') {
          OnlinePresenceManager.getInstance().updatePlayerActivity('PAUSED', currentLvl);
        } else if (newState === 'READY') {
          OnlinePresenceManager.getInstance().updatePlayerActivity('LOBBY');
        } else if (newState === 'GAME_OVER') {
          OnlinePresenceManager.getInstance().updatePlayerActivity('GAME_OVER', currentLvl);

          // Non-blocking asynchronous failed run recording to Supabase
          const runProg = gm.levelManager.runtimeProgress;
          CloudSaveManager.getInstance().recordLevelRun({
            run_id: `run_over_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            level_id: currentLvl,
            score: gm.score,
            distance: gm.distance,
            duration_seconds: runProg.timeElapsed || 0,
            coins_collected: gm.coins,
            enemies_defeated: runProg.enemiesDefeated || 0,
            completed: false,
          });
        }
      });

      gm.onLevelCompleted = (stats) => {
        setCompletedLevelStats(stats);

        // Non-blocking asynchronous completed run recording to Supabase
        CloudSaveManager.getInstance().recordLevelRun({
          run_id: `run_lvl${stats.levelNumber}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          level_id: stats.levelNumber,
          score: stats.score,
          distance: stats.distanceReached,
          duration_seconds: stats.timeElapsedSeconds,
          coins_collected: stats.coinsEarned,
          enemies_defeated: stats.enemiesDefeated,
          completed: true,
        });
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

    // Initialize Supabase Online Presence and sync progression if already authenticated
    OnlinePresenceManager.getInstance().init();
    CloudSaveManager.getInstance().syncProgression();

    return () => {
      if (gameManagerRef.current) {
        gameManagerRef.current.dispose();
        gameManagerRef.current = null;
      }
    };
  }, [initGame]);

  // Handlers
  const handlePlay = () => {
    // If onboarding is not completed, start the 3-question flow
    if (!OnboardingManager.getInstance().isOnboardingCompleted()) {
      setIsOnboardingOpen(true);
      return;
    }

    if (gameManagerRef.current) {
      gameManagerRef.current.startGame();
    }
  };

  const handleOnboardingComplete = () => {
    setIsOnboardingOpen(false);
    if (gameManagerRef.current) {
      // Start Level 1 directly after answering onboarding questions
      gameManagerRef.current.startLevel(1);
    }
  };

  const handleProceedToLevel2 = useCallback(async () => {
    setIsProfileCompletionOpen(false);

    // Phase 2: Check if match preferences are set before advancing to Level 2
    if (!MatchPreferencesManager.getInstance().hasCompletedPreferences()) {
      setIsMatchPreferencesOpen(true);
      return;
    }

    setCompletedLevelStats(null);
    if (!gameManagerRef.current) return;

    // Direct the player toward Level 2 after required information has been saved
    const nextLevelNum = 2;
    const result = await AdManager.getInstance().showRewardedAd('LEVEL_UNLOCK_REWARD');
    if (result.success && result.earnedReward) {
      gameManagerRef.current.levelManager.recordAdWatchedForLevel(nextLevelNum);
    }
    gameManagerRef.current.startLevel(nextLevelNum);
  }, []);

  const handlePreferencesSaved = useCallback(async () => {
    setIsMatchPreferencesOpen(false);
    setCompletedLevelStats(null);
    if (!gameManagerRef.current) return;

    // Start Level 2 after match preferences are confirmed and saved
    const nextLevelNum = 2;
    const result = await AdManager.getInstance().showRewardedAd('LEVEL_UNLOCK_REWARD');
    if (result.success && result.earnedReward) {
      gameManagerRef.current.levelManager.recordAdWatchedForLevel(nextLevelNum);
    }
    gameManagerRef.current.startLevel(nextLevelNum);
  }, []);

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

  const handleRestart = useCallback(async () => {
    if (!gameManagerRef.current) return;
    // 1 reward ad plays automatically when retrying/restarting
    const result = await AdManager.getInstance().showRewardedAd('REWARDED_RETRY');
    if (result.success && result.earnedReward) {
      gameManagerRef.current.restart();
    }
  }, []);

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

  const handleNextLevel = useCallback(async () => {
    const stats = completedLevelStats;

    // After completing Level 1, prompt to complete social profile if not yet completed
    if (stats?.levelNumber === 1 && !OnboardingManager.getInstance().isProfileCompleted()) {
      setIsProfileCompletionOpen(true);
      return;
    }

    // After completing Level 1, prompt to set match preferences if not yet completed
    if (stats?.levelNumber === 1 && !MatchPreferencesManager.getInstance().hasCompletedPreferences()) {
      setIsMatchPreferencesOpen(true);
      return;
    }

    setCompletedLevelStats(null);
    if (!gameManagerRef.current) return;
    const nextLevelNum = (stats?.levelNumber || 1) + 1;

    // 1 reward ad automatically plays when changing level
    const result = await AdManager.getInstance().showRewardedAd('LEVEL_UNLOCK_REWARD');
    if (result.success && result.earnedReward) {
      gameManagerRef.current.levelManager.recordAdWatchedForLevel(nextLevelNum);
    }
    gameManagerRef.current.startLevel(nextLevelNum);
  }, [completedLevelStats]);

  const handleReplayLevel = useCallback(async () => {
    setCompletedLevelStats(null);
    if (!gameManagerRef.current) return;
    // 1 reward ad plays automatically when replaying
    const result = await AdManager.getInstance().showRewardedAd('LEVEL_START_REWARD');
    if (result.success && result.earnedReward) {
      gameManagerRef.current.restartCurrentLevel();
    }
  }, []);

  const handleSelectLevel = useCallback(async (levelNumber: number) => {
    setCompletedLevelStats(null);
    setIsLevelSelectOpen(false);
    if (!gameManagerRef.current) return;

    const currentLevelNum = gameManagerRef.current.levelManager.getCurrentLevel().levelNumber;
    const isLevelChange = levelNumber !== currentLevelNum || levelNumber > 1;

    // 1 reward ad automatically plays when changing/selecting level
    if (isLevelChange) {
      const result = await AdManager.getInstance().showRewardedAd('LEVEL_START_REWARD');
      if (result.success && result.earnedReward) {
        gameManagerRef.current.levelManager.recordAdWatchedForLevel(levelNumber);
      }
    }

    gameManagerRef.current.startLevel(levelNumber);
  }, []);

  const handleContinueRunningLevel = () => {
    setCompletedLevelStats(null);
  };

  useEffect(() => {
    const unsub = AdManager.getInstance().subscribeState((active) => {
      setActiveAd(active);
    });

    // Hidden developer diagnostic trigger (Ctrl+Shift+D or URL param ?dev=true)
    // Kept strictly away from ordinary player buttons and menus
    const handleDevKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsSupabaseAuthOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleDevKeyDown);
    if (typeof window !== 'undefined' && window.location.search.includes('dev=true')) {
      setIsSupabaseAuthOpen(true);
    }

    return () => {
      unsub();
      window.removeEventListener('keydown', handleDevKeyDown);
    };
  }, []);

  const handleWatchAdToRetry = useCallback(async () => {
    const result = await AdManager.getInstance().showRewardedAd('REWARDED_RETRY');
    if (result.success && result.earnedReward) {
      if (gameManagerRef.current?.canUseRewardedRetry()) {
        gameManagerRef.current?.revivePlayerWithReward();
      } else {
        gameManagerRef.current?.restart();
      }
    }
  }, []);

  const handleRequestAdStartLevel = useCallback(async (levelNumber: number) => {
    setIsLevelSelectOpen(false);
    const result = await AdManager.getInstance().showRewardedAd('LEVEL_START_REWARD');
    if (result.success && result.earnedReward && gameManagerRef.current) {
      gameManagerRef.current.levelManager.recordAdWatchedForLevel(levelNumber);
      gameManagerRef.current.startLevel(levelNumber);
      gameManagerRef.current.playerHealthManager.activateShield(7.0);
    }
  }, []);

  const handleRequestAdUnlockLevel = useCallback(async (levelNumber: number) => {
    setIsLevelSelectOpen(false);
    const result = await AdManager.getInstance().showRewardedAd('LEVEL_UNLOCK_REWARD');
    if (result.success && result.earnedReward && gameManagerRef.current) {
      gameManagerRef.current.levelManager.recordAdWatchedForLevel(levelNumber);
      gameManagerRef.current.startLevel(levelNumber);
    }
  }, []);

  // Resolve accurate level progression even prior to 3D canvas initialization
  const getLevelProgress = useCallback(() => {
    if (gameManagerRef.current) {
      return gameManagerRef.current.levelManager.progress;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('action_runner_level_progress');
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            unlockedLevels: Array.isArray(parsed.unlockedLevels) ? parsed.unlockedLevels : [1],
            completedLevels: Array.isArray(parsed.completedLevels) ? parsed.completedLevels : [],
            currentLevelNumber: parsed.currentLevelNumber || 1,
          };
        }
      }
    } catch {
      // Ignore
    }
    return {
      unlockedLevels: [1],
      completedLevels: [],
      currentLevelNumber: 1,
    };
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* Three.js Canvas Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Achievement Unlocked Toast (only outside active gameplay to prevent blocking player screen) */}
      {unlockedToast && gameState !== 'PLAYING' && (
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
          onOpenPresence={() => setIsOnlinePresenceOpen(true)}
          onOpenOnboarding={() => setIsOnboardingOpen(true)}
          onOpenPreferences={() => setIsMatchPreferencesOpen(true)}
          onOpenDiscovery={() => setIsDiscoveryOpen(true)}
          highestUnlockedLevel={
            Math.max(
              ...(getLevelProgress().unlockedLevels || [1]),
              metrics.levelProgress?.levelNumber || 1
            )
          }
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
          onAdRetry={handleWatchAdToRetry}
          onHome={handleHome}
          onOpenLevelSelect={() => setIsLevelSelectOpen(true)}
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
        onOpenPreferences={() => setIsMatchPreferencesOpen(true)}
        onOpenDiscovery={() => setIsDiscoveryOpen(true)}
      />

      {/* Level Complete Results Modal */}
      {completedLevelStats && (
        <LevelCompleteModal
          stats={completedLevelStats}
          onNextLevel={handleNextLevel}
          onReplayLevel={handleReplayLevel}
          onOpenLevelSelect={() => setIsLevelSelectOpen(true)}
          onContinueRunning={handleContinueRunningLevel}
          onHome={handleHome}
          requiresProfileCompletion={
            completedLevelStats.levelNumber === 1 &&
            !OnboardingManager.getInstance().isProfileCompleted()
          }
          onOpenProfileCompletion={() => setIsProfileCompletionOpen(true)}
          requiresPreferences={
            completedLevelStats.levelNumber === 1 &&
            OnboardingManager.getInstance().isProfileCompleted() &&
            !MatchPreferencesManager.getInstance().hasCompletedPreferences()
          }
          onOpenPreferences={() => setIsMatchPreferencesOpen(true)}
          onOpenDiscovery={() => setIsDiscoveryOpen(true)}
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

      {/* Supabase Authentication & Cloud Progression Modal (Phase 16) */}
      <SupabaseAuthModal
        isOpen={isSupabaseAuthOpen}
        onClose={() => setIsSupabaseAuthOpen(false)}
        onOpenPresence={() => setIsOnlinePresenceOpen(true)}
      />

      {/* Online Presence Lobby Modal (Phase 16) */}
      <OnlinePresenceModal
        isOpen={isOnlinePresenceOpen}
        onClose={() => setIsOnlinePresenceOpen(false)}
      />

      {/* Onboarding Questionnaire Modal (Phase 1) */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onComplete={handleOnboardingComplete}
      />

      {/* Social Profile Completion Modal (Phase 1, after Level 1) */}
      <ProfileCompletionModal
        isOpen={isProfileCompletionOpen}
        onProceedToLevel2={handleProceedToLevel2}
      />

      {/* Match Preferences & Romantic Discovery Settings Modal (Phase 2) */}
      <MatchPreferencesModal
        isOpen={isMatchPreferencesOpen}
        onClose={() => setIsMatchPreferencesOpen(false)}
        onProceedAfterSave={handlePreferencesSaved}
        isInitialSetup={
          completedLevelStats?.levelNumber === 1 ||
          !MatchPreferencesManager.getInstance().hasCompletedPreferences()
        }
      />

      {/* Royal Discovery & Real Player Profiles Modal (Phase 3) */}
      <DiscoveryModal
        isOpen={isDiscoveryOpen}
        onClose={() => setIsDiscoveryOpen(false)}
        onOpenPreferences={() => {
          setIsDiscoveryOpen(false);
          setIsMatchPreferencesOpen(true);
        }}
        onOpenProfileCompletion={() => {
          setIsDiscoveryOpen(false);
          setIsProfileCompletionOpen(true);
        }}
        onStartLevel={(lvl) => {
          setIsDiscoveryOpen(false);
          handleSelectLevel(lvl);
        }}
        highestUnlockedLevel={
          Math.max(
            ...(getLevelProgress().unlockedLevels || [1]),
            metrics.levelProgress?.levelNumber || 1
          )
        }
        completedLevels={getLevelProgress().completedLevels || []}
      />
    </main>
  );
}
