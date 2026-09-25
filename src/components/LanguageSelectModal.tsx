import React from 'react';
import { X, Check, BookOpen, Sparkles, Award, Bot, Flame, Compass } from 'lucide-react';
import {
  LanguageCode,
  LanguageDifficulty,
  SUPPORTED_LANGUAGES,
  LESSON_CATEGORIES,
  LearningProgress,
  AITeacherStatus,
} from '../game/language/types';

interface LanguageSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: LanguageCode;
  progress: LearningProgress;
  aiTeacherStatus?: AITeacherStatus;
  onSelectLanguage: (code: LanguageCode) => void;
  onSelectDifficulty?: (difficulty: LanguageDifficulty) => void;
  onSelectCategory?: (category: string) => void;
  onToggleAITeacher?: (enabled: boolean) => void;
}

export const LanguageSelectModal: React.FC<LanguageSelectModalProps> = ({
  isOpen,
  onClose,
  currentLanguage,
  progress,
  aiTeacherStatus = 'READY',
  onSelectLanguage,
  onSelectDifficulty,
  onSelectCategory,
  onToggleAITeacher,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md pointer-events-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close Language Select"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <h3 className="text-xl sm:text-2xl font-display font-bold text-white">
            Curriculum & AI Teacher
          </h3>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Configure language, AI curriculum, and lesson difficulty.
        </p>

        {/* AI Teacher Toggle & Status Pill */}
        <div className="p-3 bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/40 rounded-2xl mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-purple-500/20 rounded-xl text-purple-300">
              <Bot className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">AI Language Teacher</span>
                <span
                  className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
                    progress.useAITeacher
                      ? aiTeacherStatus === 'OFFLINE_FALLBACK'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                        : aiTeacherStatus === 'GENERATING'
                        ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 animate-pulse'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {!progress.useAITeacher
                    ? 'LOCAL ONLY'
                    : aiTeacherStatus === 'OFFLINE_FALLBACK'
                    ? 'FALLBACK (LOCAL)'
                    : aiTeacherStatus === 'GENERATING'
                    ? 'GENERATING...'
                    : 'ONLINE'}
                </span>
              </div>
              <p className="text-[10px] text-purple-300/80 truncate">
                Dynamically creates vocabulary & grammar lessons per run
              </p>
            </div>
          </div>

          <button
            onClick={() => onToggleAITeacher?.(!progress.useAITeacher)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
              progress.useAITeacher
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {progress.useAITeacher ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>

        {/* Scrollable Curriculum Options */}
        <div className="overflow-y-auto space-y-3 flex-1 pr-1">
          {/* Target Language Selection Grid */}
          <div>
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>1. Target Language</span>
            </div>
            <div className="space-y-1.5">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = currentLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => onSelectLanguage(lang.code)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-950/70 to-blue-950/70 border-cyan-400/80 shadow-md shadow-cyan-950/40'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl sm:text-2xl shrink-0">{lang.flag}</span>
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

          {/* Difficulty Selection */}
          <div>
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>2. Difficulty Level</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as LanguageDifficulty[]).map((diff) => {
                const isSelected = progress.currentDifficulty === diff;
                return (
                  <button
                    key={diff}
                    onClick={() => onSelectDifficulty?.(diff)}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
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
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>3. Lesson Category Focus</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {LESSON_CATEGORIES.map((cat) => {
                const isSelected = (progress.selectedCategory || 'ALL') === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => onSelectCategory?.(cat.id)}
                    className={`py-1.5 px-2 text-[11px] font-semibold rounded-xl border transition-all cursor-pointer text-left truncate flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                        : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:bg-slate-800/80 hover:text-slate-200'
                    }`}
                    title={cat.description}
                  >
                    <span>{cat.icon}</span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Learning Stats Footer */}
        <div className="flex items-center justify-between p-2.5 bg-slate-950/70 rounded-2xl border border-slate-800 mt-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[9px] font-semibold text-slate-400 uppercase">Words Learned</div>
              <div className="text-xs font-bold text-white font-mono-nums">
                {progress.wordsCompleted.length} words
              </div>
            </div>
          </div>

          <div className="w-[1px] h-6 bg-slate-800" />

          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[9px] font-semibold text-slate-400 uppercase">Learning XP</div>
              <div className="text-xs font-bold text-cyan-300 font-mono-nums">
                {progress.totalXPEarned} XP
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-cyan-500/20"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
