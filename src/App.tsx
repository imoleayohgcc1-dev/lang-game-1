/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameManager, GameMetrics } from './game/GameManager';
import { GameState } from './game/constants';
import { StartScreen } from './components/StartScreen';
import { HUD } from './components/HUD';
import { PauseModal } from './components/PauseModal';
import { SettingsModal } from './components/SettingsModal';
import { GameOverModal } from './components/GameOverModal';
import { WebGLFallback } from './components/WebGLFallback';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);

  const [gameState, setGameState] = useState<GameState>('LOADING');
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
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [webGLError, setWebGLError] = useState<string | null>(null);

  const initGame = useCallback(() => {
    if (!containerRef.current) return;

    // Clean previous if existing
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

      gameManagerRef.current = gm;
      setGameState(gm.stateManager.getState());
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

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* Three.js Canvas Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

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
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />
    </main>
  );
}
