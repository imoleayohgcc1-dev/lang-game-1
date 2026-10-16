/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Users, Activity, Globe, Shield, RefreshCw } from 'lucide-react';
import { OnlinePresenceManager } from '../supabase/onlinePresenceManager';
import { PresencePlayer } from '../supabase/types';
import { AuthenticationManager } from '../supabase/authManager';

interface OnlinePresenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnlinePresenceModal: React.FC<OnlinePresenceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [players, setPlayers] = useState<PresencePlayer[]>([]);
  const authState = AuthenticationManager.getInstance().getState();

  useEffect(() => {
    if (!isOpen) return;
    const unsub = OnlinePresenceManager.getInstance().subscribe((list) => {
      setPlayers(list);
    });
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md pointer-events-auto">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
              Online Runners Lobby
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-sans font-bold">
                {players.length} Online
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Supabase Realtime Presence Channel
            </p>
          </div>
        </div>

        {/* Privacy notice banner */}
        <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
          <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Real-time presence is privacy-preserving: only runner name and sector are visible.</span>
        </div>

        {/* Players List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2">
          {players.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              {authState.isAuthenticated
                ? 'Connecting to presence channel...'
                : 'Sign in with Supabase to join the live player lobby.'}
            </div>
          ) : (
            players.map((p) => {
              const isSelf = p.user_id === authState.user?.id;
              return (
                <div
                  key={p.user_id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    isSelf
                      ? 'bg-cyan-950/30 border-cyan-500/40'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
                      {p.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        {p.display_name}
                        {isSelf && (
                          <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-500/30">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Sector Level {p.current_level}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        p.status === 'RUNNING'
                          ? 'bg-emerald-400 animate-pulse'
                          : p.status === 'PAUSED'
                          ? 'bg-amber-400'
                          : 'bg-cyan-400'
                      }`}
                    />
                    <span className="text-[10px] font-semibold uppercase text-slate-300">
                      {p.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>


      </div>
    </div>
  );
};
