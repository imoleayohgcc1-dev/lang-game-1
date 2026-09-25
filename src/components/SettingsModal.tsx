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
  Award,
  Keyboard,
  Smartphone,
  Globe,
  Check,
  BookOpen,
  Bot,
  Flame,
  Compass,
} from 'lucide-react';
import {
  GameSettings,
  EnvironmentTheme,
  DayNightMode,
  GraphicsQuality,
  GAME_CONFIG,
} from '../game/constants';
import { Achievement } from '../game/AchievementManager';
import {
  LanguageCode,
  LanguageDifficulty,
  SUPPORTED_LANGUAGES,
  LESSON_CATEGORIES,
  LearningProgress,
  AITeacherStatus,
} from '../game/language/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  achievements?: Achievement[];
  currentLanguage?: LanguageCode;
  learningProgress?: LearningProgress;
  aiTeacherStatus?: AITeacherStatus;
  onSelectLanguage?: (code: LanguageCode) => void;
  onSelectDifficulty?: (difficulty: LanguageDifficulty) => void;
  onSelectCategory?: (category: string) => void;
  onToggleAITeacher?: (enabled: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  achievements = [],
  currentLanguage = 'zh-CN',
  learningProgress,
  aiTeacherStatus = 'READY',
  onSelectLanguage,
  onSelectDifficulty,
  onSelectCategory,
  onToggleAITeacher,
}) => {
  const [activeTab, setActiveTab] = useState<'SETTINGS' | 'LANGUAGE' | 'CONTROLS' | 'ACHIEVEMENTS'>('SETTINGS');

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
        <p className="text-xs text-slate-400 mb-4">Game Preferences & Customization</p>

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
            onClick={() => setActiveTab('LANGUAGE')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'LANGUAGE' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Language & AI
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
                      <div className="text-[10px] text-slate-400">Lasers & impacts</div>
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
                  {settings.graphicsQuality === 'LOW' && 'Optimized for older phones: shadows and particles disabled.'}
                  {settings.graphicsQuality === 'MEDIUM' && 'Balanced: soft shadows, full effects, high performance.'}
                  {settings.graphicsQuality === 'HIGH' && 'Maximum fidelity: 2K shadows, speed lines, full resolution.'}
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
                  {(['CYBERPUNK', 'CITY', 'TROPICAL'] as EnvironmentTheme[]).map((thm) => (
                    <button
                      key={thm}
                      onClick={() => handleSetTheme(thm)}
                      className={`py-2 px-1 text-[11px] font-bold rounded-xl transition-all cursor-pointer truncate ${
                        settings.theme === thm
                          ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                          : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {GAME_CONFIG.THEMES[thm].NAME}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'LANGUAGE' && (
            <div className="space-y-3">
              {/* AI Teacher Toggle Banner */}
              <div className="p-3 bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/40 rounded-2xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Bot className="w-5 h-5 text-purple-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">AI Language Teacher</span>
                      <span
                        className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded border ${
                          learningProgress?.useAITeacher
                            ? aiTeacherStatus === 'OFFLINE_FALLBACK'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {!learningProgress?.useAITeacher
                          ? 'LOCAL ONLY'
                          : aiTeacherStatus === 'OFFLINE_FALLBACK'
                          ? 'LOCAL FALLBACK'
                          : 'ACTIVE'}
                      </span>
                    </div>
                    <p className="text-[10px] text-purple-300/80 truncate">
                      AI drafts targeted vocabulary & phrases
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onToggleAITeacher?.(!learningProgress?.useAITeacher)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
                    learningProgress?.useAITeacher
                      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {learningProgress?.useAITeacher ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              {/* Difficulty Selection */}
              <div>
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Curriculum Difficulty</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as LanguageDifficulty[]).map((diff) => {
                    const isSelected = learningProgress?.currentDifficulty === diff;
                    return (
                      <button
                        key={diff}
                        onClick={() => onSelectDifficulty?.(diff)}
                        className={`py-1.5 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                            : 'bg-slate-950/50 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {diff}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Lesson Topic Focus</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {LESSON_CATEGORIES.slice(0, 6).map((cat) => {
                    const isSelected = (learningProgress?.selectedCategory || 'ALL') === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => onSelectCategory?.(cat.id)}
                        className={`py-1.5 px-2 text-[10px] font-semibold rounded-xl border transition-all cursor-pointer text-left truncate flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-400'
                            : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:bg-slate-800/80 hover:text-slate-200'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span className="truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Supported Languages List */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Select Target Language</span>
                </div>
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = currentLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => onSelectLanguage?.(lang.code)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-950/70 to-blue-950/70 border-cyan-400/80 shadow-md shadow-cyan-950/30'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0">{lang.flag}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white truncate">{lang.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({lang.nativeName})</span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">{lang.description}</p>
                        </div>
                      </div>

                      <div className="shrink-0 ml-2">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center font-bold">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-700" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'CONTROLS' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-800 flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-white block mb-0.5">Mobile Touch Controls</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    <li><strong className="text-white">LEFT / RIGHT:</strong> Switch runner lanes</li>
                    <li><strong className="text-white">JUMP:</strong> Leap over low hurdles</li>
                    <li><strong className="text-white">SLIDE:</strong> Duck under overhead gantries</li>
                    <li><strong className="text-white">FIRE:</strong> Blaster shot with auto-aim</li>
                    <li><strong className="text-white">AMMO TAP:</strong> Fast manual reload</li>
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-800 flex items-start gap-3">
                <Keyboard className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-white block mb-0.5">Desktop Keyboard</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    <li><strong className="text-white">A / D or Left / Right:</strong> Switch lanes</li>
                    <li><strong className="text-white">Space / W / Up:</strong> Jump</li>
                    <li><strong className="text-white">S / Down:</strong> Slide</li>
                    <li><strong className="text-white">F:</strong> Fire laser blaster</li>
                    <li><strong className="text-white">P / Esc:</strong> Pause game</li>
                  </ul>
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
