/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Heart,
  Crown,
  Check,
  X,
  Clock,
  Sparkles,
  ShieldCheck,
  Lock,
  ChevronRight,
  RefreshCw,
  MapPin,
  Calendar,
  AlertCircle,
  Play,
  User,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { InvitationManager } from '../supabase/invitationManager';
import { ChatInvitation, InvitationStatus } from '../supabase/types';
import { AuthenticationManager } from '../supabase/authManager';
import { OnboardingManager } from '../supabase/onboardingManager';

interface InvitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  highestUnlockedLevel?: number;
  completedLevels?: number[];
  onStartLevel?: (level: number) => void;
  onOpenDiscovery?: () => void;
}

export const InvitationsModal: React.FC<InvitationsModalProps> = ({
  isOpen,
  onClose,
  highestUnlockedLevel = 1,
  completedLevels = [],
  onStartLevel,
  onOpenDiscovery,
}) => {
  const [activeTab, setActiveTab] = useState<'RECEIVED' | 'SENT' | 'ACCEPTED' | 'HISTORY'>('RECEIVED');
  const [invitations, setInvitations] = useState<ChatInvitation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Authoritative Level 4 progression check
  // Level 4 must be completed to view full sender profiles and accept/decline
  const hasCompletedLevel4 =
    (completedLevels && completedLevels.includes(4)) ||
    highestUnlockedLevel > 4;

  const currentLevelNumber = Math.max(
    ...(completedLevels || [0]),
    1
  );

  const loadInvitations = useCallback(async () => {
    setIsLoading(true);
    const list = await InvitationManager.getInstance().fetchInvitations();
    setInvitations(list);
    setIsLoading(false);

    // If user has unlocked Level 4, mark received invitations as read
    if (hasCompletedLevel4) {
      await InvitationManager.getInstance().markAllAsRead();
    }
  }, [hasCompletedLevel4]);

  useEffect(() => {
    if (isOpen) {
      loadInvitations();
    }
  }, [isOpen, loadInvitations]);

  useEffect(() => {
    const unsub = InvitationManager.getInstance().subscribe((list) => {
      setInvitations(list);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const authUser = AuthenticationManager.getInstance().getState().user;
  const currentUserId = authUser?.id;

  // Filter lists by tab
  const receivedPending = invitations.filter(
    (i) => i.recipient_id === currentUserId && i.status === 'pending'
  );

  const sentInvitations = invitations.filter(
    (i) => i.sender_id === currentUserId
  );

  const acceptedInvitations = invitations.filter(
    (i) =>
      i.status === 'accepted' &&
      (i.sender_id === currentUserId || i.recipient_id === currentUserId)
  );

  const historyInvitations = invitations.filter(
    (i) =>
      (i.status === 'declined' || i.status === 'expired' || i.status === 'cancelled') &&
      (i.sender_id === currentUserId || i.recipient_id === currentUserId)
  );

  const handleRespond = async (invitationId: string, action: 'accept' | 'decline') => {
    setActionInProgressId(invitationId);
    setFeedbackMessage(null);

    const result = await InvitationManager.getInstance().respondToInvitation(
      invitationId,
      action,
      highestUnlockedLevel
    );

    if (result.success) {
      setFeedbackMessage({ text: result.message, type: 'success' });
      await loadInvitations();
    } else {
      setFeedbackMessage({ text: result.message, type: 'error' });
    }

    setActionInProgressId(null);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
  };

  const handleCancel = async (invitationId: string) => {
    setActionInProgressId(invitationId);
    setFeedbackMessage(null);

    const result = await InvitationManager.getInstance().cancelInvitation(invitationId);
    if (result.success) {
      setFeedbackMessage({ text: 'Invitation cancelled.', type: 'success' });
      await loadInvitations();
    } else {
      setFeedbackMessage({ text: result.message, type: 'error' });
    }

    setActionInProgressId(null);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  };

  const formatDaysRemaining = (expiresAtIso: string) => {
    try {
      const diffMs = new Date(expiresAtIso).getTime() - Date.now();
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (days <= 0) return 'Expires today';
      if (days === 1) return 'Expires tomorrow';
      return `Expires in ${days} days`;
    } catch {
      return '';
    }
  };

  // ==============================================================================
  // GATED VIEW (Recipient has not completed Level 4 yet)
  // Shows persistent notification without exposing private sender profile
  // ==============================================================================
  if (!hasCompletedLevel4) {
    const pendingCount = receivedPending.length;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 rounded-3xl border border-rose-500/30 p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 active:scale-95 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-4 text-rose-400 shadow-lg shadow-rose-500/10 animate-bounce">
            <Mail className="w-8 h-8" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-300 via-amber-300 to-indigo-200 mb-2">
            Invitation Waiting For You
          </h2>

          <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Level 4 Gated Feature
          </div>

          <p className="text-sm text-slate-200 leading-relaxed mb-6 max-w-md font-medium">
            {pendingCount > 0
              ? `You have ${pendingCount} invitation${pendingCount > 1 ? 's' : ''} waiting for you! Complete Level 4 to view and respond to your invitations.`
              : 'You have an invitation waiting for you. Complete Level 4 to view and respond to your invitations.'}
          </p>

          {/* Privacy Protection Notice */}
          <div className="w-full bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 mb-6 text-left space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
              <ShieldCheck className="w-4 h-4" />
              <span>Royal Privacy & Security Protection</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              To protect all players and maintain our kingdom progression, sender profiles remain locked until you demonstrate your runner valor by completing Level 4.
            </p>

            {/* Level progression bar */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5">
                <span>Progress to Level 4 Completion:</span>
                <span className="text-amber-400 font-mono">
                  {completedLevels.includes(4) ? 'Level 4 Completed ✓' : `Level ${currentLevelNumber} of 4`}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (currentLevelNumber / 4) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col gap-2.5">
            {onStartLevel && (
              <button
                onClick={() => {
                  onClose();
                  const nextLvl = currentLevelNumber;
                  onStartLevel(Math.min(nextLvl, 4));
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-500 hover:via-pink-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Play Level {Math.min(currentLevelNumber, 4)} Now</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs active:scale-98 transition-all"
            >
              Keep Running
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================================
  // UNLOCKED INBOX (Recipient has completed Level 4)
  // Full mobile-friendly invitations management
  // ==============================================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl h-[92vh] sm:h-[86vh] bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 rounded-3xl border border-indigo-500/40 shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* HEADER */}
        <div className="relative px-5 py-4 border-b border-indigo-950 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 p-0.5 shadow-md shadow-rose-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Mail className="w-5 h-5 text-rose-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-300 via-amber-300 to-indigo-200">
                  Chat Invitations
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  Level 4 Unlocked 👑
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Manage your royal connection requests and chat invitations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadInvitations}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 active:scale-95 transition-all disabled:opacity-50"
              title="Refresh Invitations"
            >
              <RefreshCw className={`w-4 h-4 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="px-5 py-2.5 bg-slate-900/60 border-b border-indigo-950/60 flex items-center justify-between gap-2 overflow-x-auto shrink-0 text-xs">
          <div className="flex items-center gap-1.5 w-full">
            <button
              onClick={() => setActiveTab('RECEIVED')}
              className={`flex-1 py-1.5 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'RECEIVED'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <span>Received</span>
              {receivedPending.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white text-rose-600 font-mono text-[10px] font-black">
                  {receivedPending.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('SENT')}
              className={`flex-1 py-1.5 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'SENT'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <span>Sent</span>
              {sentInvitations.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-indigo-200 font-mono text-[10px]">
                  {sentInvitations.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ACCEPTED')}
              className={`flex-1 py-1.5 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'ACCEPTED'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <span>Accepted</span>
              {acceptedInvitations.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-900/60 text-emerald-200 font-mono text-[10px]">
                  {acceptedInvitations.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`py-1.5 px-3 rounded-xl font-bold transition-all ${
                activeTab === 'HISTORY'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              History
            </button>
          </div>
        </div>

        {/* CONTENT CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* Feedback banner */}
          {feedbackMessage && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2 ${
                feedbackMessage.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              }`}
            >
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
          )}

          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-8 h-8 text-rose-400 animate-spin" />
              <p className="text-sm font-semibold">Checking kingdom messages...</p>
            </div>
          ) : activeTab === 'RECEIVED' ? (
            /* ================= RECEIVED TAB ================= */
            receivedPending.length === 0 ? (
              <div className="py-12 px-6 bg-slate-900/40 border border-slate-800 rounded-3xl text-center flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                  <Mail className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">No Received Invitations</h3>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  You have no pending invitations at this time. As other players discover your profile in Royal Discovery, their invitations will appear here.
                </p>
                {onOpenDiscovery && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenDiscovery();
                    }}
                    className="mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 active:scale-95 transition-all"
                  >
                    Explore Royal Discovery
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {receivedPending.map((inv) => {
                  const sender = inv.sender_profile;
                  const isBusy = actionInProgressId === inv.id;

                  return (
                    <div
                      key={inv.id}
                      className="bg-slate-900/90 border border-slate-800 hover:border-rose-500/40 rounded-2xl p-4 transition-all shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* Sender details */}
                      <div className="flex items-start gap-3.5">
                        {sender?.avatar_url ? (
                          <img
                            src={sender.avatar_url}
                            alt={sender.display_name}
                            className="w-12 h-12 rounded-2xl object-cover border-2 border-rose-400/40 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg shrink-0">
                            {sender?.display_name?.charAt(0).toUpperCase() || 'R'}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white truncate">
                              {sender?.display_name || 'Royal Runner'}
                            </h4>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                              New Invite
                            </span>
                          </div>

                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            {sender?.age && <span>Age {sender.age}</span>}
                            {sender?.country && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-cyan-400" />
                                <span>{sender.country}</span>
                              </span>
                            )}
                          </div>

                          {sender?.bio && (
                            <p className="text-xs text-slate-300 italic mt-1 line-clamp-1">
                              "{sender.bio}"
                            </p>
                          )}

                          <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-1.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(inv.created_at)}
                            </span>
                            <span>•</span>
                            <span className="text-amber-400/90 font-medium">
                              {formatDaysRemaining(inv.expires_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions: Accept or Decline */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => handleRespond(inv.id, 'decline')}
                          disabled={isBusy}
                          className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 active:scale-95 transition-all flex items-center gap-1 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>

                        <button
                          onClick={() => handleRespond(inv.id, 'accept')}
                          disabled={isBusy}
                          className="py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : activeTab === 'SENT' ? (
            /* ================= SENT TAB ================= */
            sentInvitations.length === 0 ? (
              <div className="py-12 px-6 bg-slate-900/40 border border-slate-800 rounded-3xl text-center flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                  <Mail className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">No Sent Invitations</h3>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  You haven't sent any invitations yet. Browse verified players in Royal Discovery and tap "Invite to Chat".
                </p>
                {onOpenDiscovery && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenDiscovery();
                    }}
                    className="mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-rose-600 text-white font-bold text-xs shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
                  >
                    Browse Royal Discovery
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {sentInvitations.map((inv) => {
                  const recip = inv.recipient_profile;
                  const isBusy = actionInProgressId === inv.id;

                  return (
                    <div
                      key={inv.id}
                      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 transition-all shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3.5">
                        {recip?.avatar_url ? (
                          <img
                            src={recip.avatar_url}
                            alt={recip.display_name}
                            className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-400/40 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-800 flex items-center justify-center text-white font-black text-lg shrink-0">
                            {recip?.display_name?.charAt(0).toUpperCase() || 'P'}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">
                              To: {recip?.display_name || 'Royal Player'}
                            </h4>
                            <span
                              className={`text-[10px] px-2 py-0.2 rounded-full font-bold border ${
                                inv.status === 'pending'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : inv.status === 'accepted'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : inv.status === 'declined'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {inv.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            {recip?.country && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-cyan-400" />
                                <span>{recip.country}</span>
                              </span>
                            )}
                            <span>•</span>
                            <span>Sent {formatDate(inv.created_at)}</span>
                          </div>

                          {inv.status === 'pending' && (
                            <div className="text-[10px] text-amber-400/90 mt-1 font-medium">
                              {formatDaysRemaining(inv.expires_at)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Cancel action if still pending */}
                      {inv.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(inv.id)}
                          disabled={isBusy}
                          className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold active:scale-95 transition-all self-end sm:self-center disabled:opacity-50"
                        >
                          Cancel Invite
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : activeTab === 'ACCEPTED' ? (
            /* ================= ACCEPTED TAB ================= */
            acceptedInvitations.length === 0 ? (
              <div className="py-12 px-6 bg-slate-900/40 border border-slate-800 rounded-3xl text-center flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                  <Heart className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">No Accepted Invitations Yet</h3>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  When you accept an invitation or another player accepts yours, your mutual connection will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Invitations accepted! You can continue to the next step when 1-on-1 chat unlocks in Phase 5.
                  </span>
                </div>

                {acceptedInvitations.map((inv) => {
                  const otherUser =
                    inv.sender_id === currentUserId
                      ? inv.recipient_profile
                      : inv.sender_profile;

                  return (
                    <div
                      key={inv.id}
                      className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-4 transition-all shadow-md flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3.5">
                        {otherUser?.avatar_url ? (
                          <img
                            src={otherUser.avatar_url}
                            alt={otherUser.display_name}
                            className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-400/50"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg">
                            {otherUser?.display_name?.charAt(0).toUpperCase() || 'M'}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">
                              {otherUser?.display_name || 'Royal Match'}
                            </h4>
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                              Accepted ✓
                            </span>
                          </div>

                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            {otherUser?.country && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-cyan-400" />
                                <span>{otherUser.country}</span>
                              </span>
                            )}
                            <span>•</span>
                            <span>Matched {formatDate(inv.responded_at || inv.updated_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                          Chat in Phase 5
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* ================= HISTORY TAB ================= */
            historyInvitations.length === 0 ? (
              <div className="py-12 px-6 bg-slate-900/40 border border-slate-800 rounded-3xl text-center flex flex-col items-center gap-3">
                <Clock className="w-8 h-8 text-slate-500" />
                <h3 className="text-base font-bold text-white">No Historical Invitations</h3>
                <p className="text-xs text-slate-500">Declined and expired invitations will be logged here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {historyInvitations.map((inv) => {
                  const otherUser =
                    inv.sender_id === currentUserId
                      ? inv.recipient_profile
                      : inv.sender_profile;

                  return (
                    <div
                      key={inv.id}
                      className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs text-slate-400"
                    >
                      <div>
                        <span className="font-semibold text-slate-300">
                          {inv.sender_id === currentUserId ? 'Sent to: ' : 'From: '}
                          {otherUser?.display_name || 'Player'}
                        </span>
                        <div className="text-[10px] text-slate-500">
                          {formatDate(inv.created_at)}
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          inv.status === 'declined'
                            ? 'bg-rose-500/10 text-rose-400'
                            : inv.status === 'expired'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Section 15 Boundary Note */}
          <div className="mt-6 p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-center text-xs text-slate-400">
            <span className="font-semibold text-indigo-300">Phase 4 Notice: </span>
            Invitations and notifications establish the connection foundation. Direct 1-on-1 messaging and interactive chat unlock in Phase 5!
          </div>
        </div>

      </div>
    </div>
  );
};
