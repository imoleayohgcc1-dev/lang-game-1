import React from 'react';
import {
  Crosshair,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Info,
} from 'lucide-react';
import { TemporaryMessageState } from '../game/TemporaryMessageManager';

interface TemporaryMessageProps {
  message: TemporaryMessageState | null;
}

export const TemporaryMessage: React.FC<TemporaryMessageProps> = ({ message }) => {
  if (!message) return null;

  const getStyleAndIcon = () => {
    switch (message.type) {
      case 'target':
        return {
          icon: <Crosshair className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />,
          wrapperClass:
            'bg-rose-950/85 border-rose-500/40 text-rose-200 shadow-rose-950/50',
          badgeText: 'TARGET LOCK',
          badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        };
      case 'language':
        return {
          icon: <BookOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />,
          wrapperClass:
            'bg-slate-900/90 border-cyan-500/40 text-slate-100 shadow-cyan-950/40',
          badgeText: 'LEARN',
          badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
          wrapperClass:
            'bg-amber-950/85 border-amber-500/40 text-amber-200 shadow-amber-950/50',
          badgeText: 'ALERT',
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
          wrapperClass:
            'bg-emerald-950/85 border-emerald-500/40 text-emerald-200 shadow-emerald-950/50',
          badgeText: 'ACHIEVED',
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        };
      case 'objective':
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />,
          wrapperClass:
            'bg-indigo-950/85 border-indigo-500/40 text-indigo-200 shadow-indigo-950/50',
          badgeText: 'OBJECTIVE',
          badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        };
      case 'gameplay':
      default:
        return {
          icon: <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />,
          wrapperClass:
            'bg-slate-950/85 border-slate-700/80 text-slate-200 shadow-slate-950/50',
          badgeText: 'STATUS',
          badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  const config = getStyleAndIcon();

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center w-full pointer-events-none transition-all duration-300 animate-fade-in"
    >
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-md text-xs max-w-sm sm:max-w-md ${config.wrapperClass}`}
      >
        {config.icon}

        <span
          className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border uppercase ${config.badgeClass}`}
        >
          {config.badgeText}
        </span>

        <span className="font-medium text-xs truncate">{message.text}</span>

        {message.subtext && (
          <span className="text-[11px] text-slate-400 font-mono pl-1 border-l border-slate-700/60 truncate">
            {message.subtext}
          </span>
        )}
      </div>
    </div>
  );
};
