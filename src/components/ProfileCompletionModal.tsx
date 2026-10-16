/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Crown,
  Sparkles,
  Camera,
  Upload,
  ArrowRight,
  Shield,
  Heart,
  CheckCircle2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { OnboardingManager, OnboardingData } from '../supabase/onboardingManager';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onProceedToLevel2: () => void;
  playerName?: string;
}

// 6 curated Royal Avatars available for 1-tap selection or fallback
const PRESET_ROYAL_AVATARS = [
  {
    id: 'prince_crown',
    label: 'Royal Prince',
    emoji: '🤴',
    bg: 'from-amber-500 to-orange-600',
  },
  {
    id: 'princess_crown',
    label: 'Noble Princess',
    emoji: '👸',
    bg: 'from-pink-500 to-rose-600',
  },
  {
    id: 'brave_knight',
    label: 'Valiant Knight',
    emoji: '🛡️',
    bg: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'mystic_queen',
    label: 'Mystic Princess',
    emoji: '✨',
    bg: 'from-purple-500 to-indigo-600',
  },
  {
    id: 'solar_champion',
    label: 'Solar Champion',
    emoji: '⚔️',
    bg: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'dragon_rider',
    label: 'Dragon Rider',
    emoji: '🐉',
    bg: 'from-red-500 to-rose-700',
  },
];

const RELIGION_OPTIONS = [
  { id: 'christianity', label: 'Christianity', icon: '✝️' },
  { id: 'islam', label: 'Islam', icon: '☪️' },
  { id: 'judaism', label: 'Judaism', icon: '✡️' },
  { id: 'hinduism', label: 'Hinduism', icon: '🕉️' },
  { id: 'buddhism', label: 'Buddhism', icon: '☸️' },
  { id: 'other', label: 'Other', icon: '🌐' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say', icon: '🔒' },
];

export const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
  isOpen,
  onProceedToLevel2,
  playerName = 'Adventurer',
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('prince_crown');
  const [bio, setBio] = useState<string>('');
  const [religion, setReligion] = useState<string>('Prefer not to say');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const existing = OnboardingManager.getInstance().getProfile();
      if (existing) {
        if (existing.avatarUrl) {
          setAvatarUrl(existing.avatarUrl);
        }
        if (existing.bio) {
          setBio(existing.bio);
        }
        if (existing.religion) {
          setReligion(existing.religion);
        }
      }
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError('Image must be under 4MB.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
        setSelectedPreset('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAndProceed = async () => {
    // Resolve final avatar: either uploaded picture or selected royal preset
    let finalAvatar = avatarUrl;
    if (!finalAvatar && selectedPreset) {
      const found = PRESET_ROYAL_AVATARS.find((a) => a.id === selectedPreset);
      finalAvatar = found ? `avatar:${found.id}:${found.emoji}` : 'avatar:prince_crown:🤴';
    }

    if (!finalAvatar) {
      setError('Please upload a profile photo or select a royal avatar.');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await OnboardingManager.getInstance().saveSocialProfile(
        finalAvatar,
        bio.trim(),
        religion
      );
      setIsSaving(false);
      onProceedToLevel2();
    } catch (e) {
      console.error('[ProfileCompletionModal] Save error:', e);
      setIsSaving(false);
      // Fallback: proceed to level 2
      onProceedToLevel2();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-completion-title"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-950/40 flex flex-col items-center my-auto overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Milestone Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-2 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>LEVEL 1 CONQUERED · STAGE UNLOCKED</span>
        </div>

        {/* Header Title */}
        <h2
          id="profile-completion-title"
          className="text-2xl sm:text-3xl font-black text-white tracking-tight text-center mb-1"
        >
          Complete Your Royal Profile
        </h2>
        <p className="text-xs sm:text-sm text-cyan-200 text-center mb-6 max-w-sm">
          Run. Rescue. Find Your Prince or Princess. Complete your profile to unlock and enter Level 2!
        </p>

        <div className="w-full space-y-5 text-left">
          {/* SECTION 1: PROFILE PICTURE / AVATAR */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-amber-400" />
                1. Profile Picture / Avatar
              </span>
              <span className="text-[10px] text-slate-500 font-normal">Upload or select</span>
            </label>

            <div className="flex items-center gap-4 p-3 bg-slate-950/80 border border-slate-800 rounded-2xl">
              {/* Preview Avatar */}
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-amber-400/60 bg-slate-900 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
                {avatarUrl && avatarUrl.startsWith('data:image') ? (
                  <img
                    src={avatarUrl}
                    alt="Player Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-3xl sm:text-4xl">
                    {PRESET_ROYAL_AVATARS.find((a) => a.id === selectedPreset)?.emoji || '🤴'}
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <div className="flex flex-col gap-1.5 flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl border border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                >
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Upload Custom Photo</span>
                </button>
                <span className="text-[10px] text-slate-500 text-center">
                  PNG, JPG up to 4MB or choose a preset below
                </span>
              </div>
            </div>

            {/* Curated Royal Avatar presets */}
            <div className="grid grid-cols-6 gap-2 mt-2.5">
              {PRESET_ROYAL_AVATARS.map((preset) => {
                const isSelected = selectedPreset === preset.id && !avatarUrl.startsWith('data:image');
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(preset.id);
                      setAvatarUrl('');
                      if (error) setError(null);
                    }}
                    title={preset.label}
                    className={`relative p-2 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/25 border-2 border-amber-400 shadow-lg shadow-amber-500/20 scale-105'
                        : 'bg-slate-950/70 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xl sm:text-2xl">{preset.emoji}</span>
                    <span className="text-[9px] text-slate-400 truncate max-w-[48px] mt-0.5">
                      {preset.label.split(' ')[0]}
                    </span>
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: SHORT BIO */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-400" />
                2. Short Bio
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {bio.length}/160
              </span>
            </div>

            <textarea
              rows={3}
              maxLength={160}
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Tell fellow adventurers about yourself (e.g. Brave runner on a quest to conquer the dragon kingdom!)"
              className="w-full p-3 bg-slate-950/80 border border-slate-700 focus:border-amber-400 rounded-2xl text-white placeholder-slate-500 text-xs sm:text-sm outline-none resize-none shadow-inner"
            />

            {/* Quick bio suggestion chips */}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {[
                'Running to find my Prince or Princess! 👑',
                'Ready to conquer every dragon in the realm! 🐉',
                'Speedrunner on a rescue mission! ⚡',
              ].map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => setBio(template)}
                  className="px-2 py-0.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-[10px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  + {template.split(' ')[0]} {template.split(' ')[1]}...
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 3: RELIGION SELECTION */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-indigo-400" />
              3. Religion
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {RELIGION_OPTIONS.map((item) => {
                const isSelected = religion === item.label;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setReligion(item.label);
                      if (error) setError(null);
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/60 shadow-md font-bold'
                        : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold mt-4 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Primary CTA Button: SAVE PROFILE & GO TO LEVEL 2 */}
        <button
          onClick={handleSaveAndProceed}
          disabled={isSaving}
          className="w-full mt-6 py-4 px-6 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:via-orange-400 hover:to-indigo-500 text-white font-black text-base rounded-2xl shadow-xl shadow-amber-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>SAVING PROFILE IN SUPABASE...</span>
            </>
          ) : (
            <>
              <Crown className="w-5 h-5 text-amber-200" />
              <span>SAVE PROFILE & GO TO LEVEL 2</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
