import React, { useState } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Music,
  Monitor,
  Palette,
  Sun,
  Moon,
  Keyboard,
  Smartphone,
  Sliders,
  Award,
  Crosshair,
  Bomb,
} from 'lucide-react';
import {
  GameSettings,
  EnvironmentTheme,
  DayNightMode,
  GraphicsQuality,
  GAME_CONFIG,
} from '../game/constants';
import { Achievement } from '../game/AchievementManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  achievements?: Achievement[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  achievements = [],
}) => {
  const [activeTab, setActiveTab] = useState<'SETTINGS' | 'CONTROLS' | 'ACHIEVEMENTS'>('SETTINGS');

  if (!isOpen) return null;

  const handleToggleMusic = () => {
    onUpdateSettings({ ...settings, musicEnabled: !settings.musicEnabled });
  };

  const handleToggleSound = () => {
    onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled });
  };

  const handleSetGraphics = (quality: GraphicsQuality) => {
    onUpdateSettings({ ...settings, graphicsQuality: quality });
  };

  const handleSetTheme = (theme: EnvironmentTheme) => {
    onUpdateSettings({ ...settings, theme });
  };

  const handleToggleDayNight = () => {
    const nextMode: DayNightMode = settings.dayNight === 'DAY' ? 'NIGHT' : 'DAY';
    onUpdateSettings({ ...settings, dayNight: nextMode });
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md pointer-events-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close Settings"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl sm:text-2xl font-display font-bold text-white mb-1">
          {GAME_CONFIG.TITLE}
        </h3>
        <p className="text-xs text-slate-400 mb-4">Combat & Visual Preferences</p>

        {/* Tab Navigation */}
        <div className="flex gap-1.5 sm:gap-2 p-1 bg-slate-950/60 rounded-xl border border-slate-800 mb-4">
          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'SETTINGS' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('CONTROLS')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'CONTROLS' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Controls
          </button>
          <button
            onClick={() => setActiveTab('ACHIEVEMENTS')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'ACHIEVEMENTS' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Trophies
          </button>
        </div>

        {/* Tab Contents */}
        <div className="overflow-y-auto pr-1 space-y-4 flex-1">
          {activeTab === 'SETTINGS' && (
            <>
              {/* Audio Controls */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleToggleMusic}
                  className="flex items-center justify-between p-3 bg-slate-950/50 rounded-2xl border border-slate-800 hover:border-slate-700 cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-cyan-400" />
                    <div>
                      <div className="text-xs font-semibold text-white">Music</div>
                      <div className="text-[10px] text-slate-400">Synthesizer OST</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${settings.musicEnabled ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
                    {settings.musicEnabled ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  onClick={handleToggleSound}
                  className="flex items-center justify-between p-3 bg-slate-950/50 rounded-2xl border border-slate-800 hover:border-slate-700 cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
                    <div>
                      <div className="text-xs font-semibold text-white">Sound FX</div>
                      <div className="text-[10px] text-slate-400">Lasers, bombs, impacts</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${settings.soundEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                    {settings.soundEnabled ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>

              {/* Graphics Quality */}
              <div className="p-3.5 bg-slate-950/50 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-white">
                  <Monitor className="w-4 h-4 text-indigo-400" />
                  <span>Graphics Quality</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH'] as GraphicsQuality[]).map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSetGraphics(q)}
                      className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        settings.graphicsQuality === q
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                          : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  {settings.graphicsQuality === 'LOW' && 'Optimized for performance: simplified materials and lighting.'}
                  {settings.graphicsQuality === 'MEDIUM' && 'Balanced: soft shadows, full effects, high performance.'}
                  {settings.graphicsQuality === 'HIGH' && 'Maximum fidelity: 2K shadows, speed lines, full particle density.'}
                </p>
              </div>

              {/* Environment Themes */}
              <div className="p-3.5 bg-slate-950/50 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-2 text-xs font-semibold text-white">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-amber-400" />
                    <span>Track Environment</span>
                  </div>

                  {/* Day / Night Mode Toggle */}
                  <button
                    onClick={handleToggleDayNight}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-200 transition-colors cursor-pointer"
                  >
                    {settings.dayNight === 'DAY' ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>DAY</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-cyan-400" />
                        <span>NIGHT</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(['CYBERPUNK', 'CITY', 'TROPICAL'] as EnvironmentTheme[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => handleSetTheme(t)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        settings.theme === t
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'CONTROLS' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-800 flex items-start gap-3">
                <Keyboard className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 w-full">
                  <span className="font-semibold text-white block mb-1">Desktop Keyboard</span>
                  <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px]">
                    <div><strong className="text-cyan-300">F:</strong> Shoot Weapon</div>
                    <div><strong className="text-purple-300">B / G:</strong> Throw EMP Bomb</div>
                    <div><strong className="text-white">A / D or Left / Right:</strong> Switch Lanes</div>
                    <div><strong className="text-white">W / Up / Space:</strong> Jump</div>
                    <div><strong className="text-white">S / Down:</strong> Slide</div>
                    <div><strong className="text-amber-300">R:</strong> Reload Magazine</div>
                    <div><strong className="text-slate-200">P / Esc:</strong> Pause Game</div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-800 flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 w-full">
                  <span className="font-semibold text-white block mb-1">Mobile Touch Controls</span>
                  <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px]">
                    <div><strong className="text-amber-400">FIRE / LOCK:</strong> Shoot Blaster</div>
                    <div><strong className="text-purple-400">BOMB:</strong> Throw EMP Bomb</div>
                    <div><strong className="text-white">LEFT / RIGHT:</strong> Move Lateral Lane</div>
                    <div><strong className="text-white">JUMP:</strong> Leap Over Hurdles</div>
                    <div><strong className="text-indigo-400">SLIDE:</strong> Duck Under Gantries</div>
                    <div><strong className="text-slate-300">AMMO TAP:</strong> Fast Reload</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ACHIEVEMENTS' && (
            <div className="space-y-2">
              {achievements.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Play a run to unlock trophies!</p>
              ) : (
                achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                      ach.unlocked
                        ? 'bg-slate-950/80 border-amber-500/50 shadow-md'
                        : 'bg-slate-950/30 border-slate-800/60 opacity-60'
                    }`}
                  >
                    <span className="text-2xl">{ach.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{ach.title}</span>
                        {ach.unlocked && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded">
                            UNLOCKED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{ach.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 bg-cyan-500 hover:bg-cyan-400 active:scale-98 text-slate-950 font-bold text-sm rounded-xl transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
        >
          Apply & Return to Game
        </button>
      </div>
    </div>
  );
};
