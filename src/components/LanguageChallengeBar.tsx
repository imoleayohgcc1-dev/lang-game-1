import React from 'react';
import { Volume2, Check, Sparkles, Bot } from 'lucide-react';
import {
  LanguageChallengeState,
  LearningItem,
  SUPPORTED_LANGUAGES,
} from '../game/language/types';

interface LanguageChallengeBarProps {
  state: LanguageChallengeState;
  item: LearningItem | null;
  onPlayPronunciation: () => void;
  onComplete: () => void;
}

export const LanguageChallengeBar: React.FC<LanguageChallengeBarProps> = ({
  state,
  item,
  onPlayPronunciation,
  onComplete,
}) => {
  if (state === 'IDLE' || !item) return null;

  const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === item.languageCode) || {
    flag: '🌐',
    name: item.targetLanguage,
  };

  const isCompleted = state === 'COMPLETED';

  return (
    <div
      role="region"
      aria-label="Language Learning Challenge"
      className="flex items-center justify-center w-full pointer-events-auto animate-fade-in transition-all duration-300"
    >
      <div
        className={`flex items-center justify-between gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl border backdrop-blur-md shadow-xl max-w-lg w-full transition-all ${
          isCompleted
            ? 'bg-emerald-950/90 border-emerald-500/60 shadow-emerald-900/30'
            : 'bg-slate-950/95 border-cyan-500/50 shadow-cyan-950/50'
        }`}
      >
        {/* Left: Language Tag & Prompt */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base sm:text-lg shrink-0" title={langInfo.name}>
            {langInfo.flag}
          </span>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest truncate">
                {langInfo.name}
              </span>

              {item.aiGenerated && (
                <span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold px-1.5 py-0.2 bg-gradient-to-r from-purple-900/80 to-indigo-900/80 text-purple-300 rounded border border-purple-500/40">
                  <Bot className="w-2.5 h-2.5 text-purple-300" />
                  AI Teacher
                </span>
              )}

              {item.difficulty && (
                <span className="hidden sm:inline-block text-[8px] font-semibold px-1 py-0.2 bg-slate-800 text-slate-300 rounded border border-slate-700">
                  {item.difficulty}
                </span>
              )}

              {item.category && item.category !== 'ALL' && (
                <span className="hidden md:inline-block text-[8px] font-semibold px-1 py-0.2 bg-slate-800/80 text-slate-400 rounded">
                  {item.category}
                </span>
              )}
            </div>

            {/* Word / Translation Presentation */}
            <div className="flex items-baseline gap-2 truncate">
              {state === 'SHOW_WORD' ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Word:</span>
                  <span className="text-sm sm:text-base font-extrabold text-white uppercase tracking-wider">
                    {item.sourceText}
                  </span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1.5 truncate">
                  <span className="text-sm sm:text-base font-extrabold text-white truncate">
                    {item.translatedText}
                  </span>
                  {item.pronunciationText && (
                    <span className="text-xs sm:text-sm font-semibold text-cyan-300 font-mono">
                      ({item.pronunciationText})
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 hidden xs:inline">
                    = {item.sourceText}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions (Listen & Got it / Acknowledge) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Audio Pronunciation Button */}
          {state !== 'SHOW_WORD' && (
            <button
              onClick={onPlayPronunciation}
              title="Listen to native pronunciation"
              aria-label="Listen to pronunciation"
              className="p-1.5 sm:p-2 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-xl transition-transform active:scale-95 cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden sm:inline text-[10px] font-bold">Listen</span>
            </button>
          )}

          {/* Complete / Got It Button */}
          {state === 'WAITING_FOR_RESPONSE' && (
            <button
              onClick={onComplete}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-[10px] sm:text-xs rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Learned (+5🪙)</span>
            </button>
          )}

          {/* Completed State Badge */}
          {isCompleted && (
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-300 text-[10px] font-bold animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>+5 🪙 &middot; +10 XP</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
