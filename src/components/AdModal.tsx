/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Play, Award, CheckCircle, ShieldAlert, Sparkles, Tv } from 'lucide-react';
import { AdPlacement } from '../game/adConfig';

interface AdModalProps {
  placement: AdPlacement;
  durationSeconds: number;
  onComplete: () => void;
  onCancel: () => void;
}

export const AdModal: React.FC<AdModalProps> = ({
  placement,
  durationSeconds = 5,
  onComplete,
  onCancel,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(durationSeconds);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showEarlyCloseConfirm, setShowEarlyCloseConfirm] = useState(false);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      setIsCompleted(true);
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getRewardTitle = () => {
    switch (placement) {
      case 'LEVEL_START_REWARD':
        return 'REWARDED LEVEL ACCESS';
      case 'REWARDED_RETRY':
        return 'REWARDED RUN REVIVAL';
      case 'DOUBLE_COINS':
        return 'DOUBLE REWARD BOOST';
      default:
        return 'REWARDED BONUS';
    }
  };

  const getRewardDescription = () => {
    switch (placement) {
      case 'LEVEL_START_REWARD':
        return 'Watch this brief transmission to immediately deploy into your chosen sector with full combat readiness.';
      case 'REWARDED_RETRY':
        return 'Watch this transmission to restore 50% health, clear nearby hazards, and resume your run!';
      default:
        return 'Watch to claim your bonus in-game reward.';
    }
  };

  const handleClaim = () => {
    onComplete();
  };

  const handleAttemptClose = () => {
    if (isCompleted) {
      onComplete();
    } else {
      setShowEarlyCloseConfirm(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-sm" />

        {/* Close / Dismiss Button */}
        <button
          onClick={handleAttemptClose}
          className="absolute top-3.5 right-3.5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/90 transition-colors cursor-pointer"
          aria-label="Close Ad"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[11px] font-extrabold uppercase tracking-wider mb-4">
          <Tv className="w-3.5 h-3.5" />
          <span>SPONSORED TRANSMISSION</span>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white mb-1">
          {getRewardTitle()}
        </h2>
        <p className="text-xs text-slate-400 max-w-xs mb-5">
          {getRewardDescription()}
        </p>

        {/* Simulated Ad Container Graphic */}
        <div className="w-full h-44 sm:h-48 rounded-2xl bg-slate-900 border border-slate-800 relative flex flex-col items-center justify-center p-4 mb-5 overflow-hidden shadow-inner group">
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/40 via-indigo-950/30 to-purple-950/40" />

          {/* Animated cyber grid lines */}
          <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

          {isCompleted ? (
            <div className="relative z-10 flex flex-col items-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 mb-2.5 shadow-lg shadow-emerald-500/20">
                <CheckCircle className="w-8 h-8" />
              </div>
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                TRANSMISSION VERIFIED
              </span>
              <span className="text-xs text-emerald-400 font-mono mt-0.5">
                Reward Authorized!
              </span>
            </div>
          ) : (
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-cyan-500/15 border-2 border-cyan-400 flex items-center justify-center text-cyan-300 mb-2.5 shadow-lg shadow-cyan-500/20">
                <span className="text-2xl font-mono font-extrabold">
                  {secondsRemaining}s
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Verifying Reward Status...
              </span>
              <div className="w-36 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${Math.max(0, Math.min(100, ((durationSeconds - secondsRemaining) / durationSeconds) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        {isCompleted ? (
          <button
            onClick={handleClaim}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>CLAIM REWARD & PROCEED</span>
          </button>
        ) : (
          <div className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
            <span>Reward available in:</span>
            <span className="font-mono font-bold text-cyan-300">{secondsRemaining} seconds</span>
          </div>
        )}

        {/* Early Close Warning Modal */}
        {showEarlyCloseConfirm && (
          <div className="absolute inset-0 bg-slate-950/95 p-5 flex flex-col items-center justify-center z-20 animate-in fade-in">
            <ShieldAlert className="w-10 h-10 text-rose-400 mb-2" />
            <h3 className="text-base font-bold text-white mb-1">
              DISMISS ADVERTISEMENT?
            </h3>
            <p className="text-xs text-slate-400 text-center mb-4">
              Closing early will forfeit this reward. You will not receive level access or run revival.
            </p>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setShowEarlyCloseConfirm(false)}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Keep Watching
              </button>
              <button
                onClick={() => {
                  setShowEarlyCloseConfirm(false);
                  onCancel();
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Forfeit Reward
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
