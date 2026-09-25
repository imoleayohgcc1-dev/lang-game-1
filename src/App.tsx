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
import { LanguageSelectModal } from './components/LanguageSelectModal';
import { WebGLFallback } from './components/WebGLFallback';
import { LanguageCode, LanguageDifficulty, DEFAULT_LEARNING_PROGRESS } from './game/language/types';
import { Award } from 'lucide-react';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);

  const [gameState, setGameState] = useState<GameState>('LOADING');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedToast, setUnlockedToast] = useState<Achievement | null>(null);

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
    activePowerUps: [],
    languageChallenge: {
      state: 'IDLE',
      item: null,
      progress: DEFAULT_LEARNING_PROGRESS,
    },
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLanguageSelectOpen, setIsLanguageSelectOpen] = useState<boolean>(false);
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

  const handleShoot = () => {
    gameManagerRef.current?.shoot();
  };

  const handleReload = () => {
    gameManagerRef.current?.triggerReload();
  };

  const handleSelectLanguage = (code: LanguageCode) => {
    gameManagerRef.current?.setLanguage(code);
  };

  const handleSelectDifficulty = (difficulty: LanguageDifficulty) => {
    gameManagerRef.current?.setLanguageDifficulty(difficulty);
  };

  const handleSelectCategory = (category: string) => {
    gameManagerRef.current?.setLanguageCategory(category);
  };

  const handleToggleAITeacher = (enabled: boolean) => {
    gameManagerRef.current?.setUseAITeacher(enabled);
  };

  const handlePlayPronunciation = () => {
    gameManagerRef.current?.playLanguagePronunciation();
  };

  const handleCompleteLanguageChallenge = () => {
    gameManagerRef.current?.completeLanguageChallenge();
  };

  const currentLanguageCode: LanguageCode =
    metrics.languageChallenge?.progress.targetLanguageCode || 'zh-CN';
  const currentLearningProgress =
    metrics.languageChallenge?.progress || DEFAULT_LEARNING_PROGRESS;
  const currentAIStatus =
    metrics.languageChallenge?.aiTeacherStatus || 'READY';

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
          currentLanguage={currentLanguageCode}
          onOpenLanguageSelect={() => setIsLanguageSelectOpen(true)}
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
          onReload={handleReload}
          onPlayPronunciation={handlePlayPronunciation}
          onCompleteLanguageChallenge={handleCompleteLanguageChallenge}
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
          currentLanguage={currentLanguageCode}
          onOpenLanguageSelect={() => setIsLanguageSelectOpen(true)}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'GAME_OVER' && (
        <GameOverModal
          metrics={metrics}
          onRetry={handleRestart}
          onHome={handleHome}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        achievements={achievements}
        currentLanguage={currentLanguageCode}
        learningProgress={currentLearningProgress}
        aiTeacherStatus={currentAIStatus}
        onSelectLanguage={handleSelectLanguage}
        onSelectDifficulty={handleSelectDifficulty}
        onSelectCategory={handleSelectCategory}
        onToggleAITeacher={handleToggleAITeacher}
      />

      {/* Target Language Selection Modal */}
      <LanguageSelectModal
        isOpen={isLanguageSelectOpen}
        onClose={() => setIsLanguageSelectOpen(false)}
        currentLanguage={currentLanguageCode}
        progress={currentLearningProgress}
        aiTeacherStatus={currentAIStatus}
        onSelectLanguage={handleSelectLanguage}
        onSelectDifficulty={handleSelectDifficulty}
        onSelectCategory={handleSelectCategory}
        onToggleAITeacher={handleToggleAITeacher}
      />
    </main>
  );
}
