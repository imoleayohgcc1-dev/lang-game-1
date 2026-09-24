import React from 'react';
import { X, Volume2, VolumeX, Keyboard, Smartphone, Sparkles } from 'lucide-react';
import { GAME_CONFIG } from '../game/constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isMuted,
  onToggleMute,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md pointer-events-auto">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close Settings"
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-2xl font-display font-bold text-white mb-1">
          Settings & Controls
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          {GAME_CONFIG.TITLE} • Engine Settings
        </p>

        {/* Audio Setting */}
        <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-800 rounded-xl text-cyan-400">
              {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Audio & Synth Sound</div>
              <div className="text-xs text-slate-400">Coins, synthesizer beats, and SFX</div>
            </div>
          </div>

          <button
            onClick={onToggleMute}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              !isMuted
                ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {!isMuted ? 'ENABLED' : 'MUTED'}
          </button>
        </div>

        {/* How to Play / Controls Info */}
        <div className="space-y-3 mb-6">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            How to Control
          </h4>

          <div className="p-3.5 bg-slate-950/40 rounded-2xl border border-slate-800/60 flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-white block mb-0.5">Mobile Gestures & Buttons</span>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li><strong className="text-white">FIRE Button:</strong> Shoot laser blaster at opponents</li>
                <li><strong className="text-white">Swipe Up / JUMP:</strong> Clear low laser hurdles</li>
                <li><strong className="text-white">Swipe Down / SLIDE:</strong> Crouch under overhead gantries</li>
                <li><strong className="text-white">Swipe Left / Right:</strong> Switch lanes to avoid blocking pillars</li>
              </ul>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/40 rounded-2xl border border-slate-800/60 flex items-start gap-3">
            <Keyboard className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-white block mb-0.5">Desktop Keyboard</span>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li><strong className="text-white">F:</strong> Shoot Blaster with Auto-Aim Assist</li>
                <li><strong className="text-white">Space / W / Up:</strong> Jump</li>
                <li><strong className="text-white">S / Down Arrow:</strong> Slide</li>
                <li><strong className="text-white">A / D / Left / Right:</strong> Switch lanes</li>
                <li><strong className="text-white">ESC / P:</strong> Pause</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm rounded-xl transition-colors cursor-pointer"
        >
          Back to Game
        </button>
      </div>
    </div>
  );
};
