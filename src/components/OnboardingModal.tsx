/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  User,
  Calendar,
  Globe,
  Check,
  Search,
  Crown,
  Heart,
  ShieldAlert,
} from 'lucide-react';
import { OnboardingManager, OnboardingData } from '../supabase/onboardingManager';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (data: OnboardingData) => void;
  initialName?: string;
}

// Popular and comprehensive country list with flags
const POPULAR_COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
];

const ALL_COUNTRIES = [
  ...POPULAR_COUNTRIES,
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
].filter((item, idx, self) => self.findIndex((t) => t.code === item.code) === idx);

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  initialName = '',
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [age, setAge] = useState<number>(20);
  const [country, setCountry] = useState('United States');
  const [countrySearch, setCountrySearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Initialize from existing profile or props
  useEffect(() => {
    if (isOpen) {
      const existing = OnboardingManager.getInstance().getProfile();
      if (existing) {
        setName(existing.displayName || initialName);
        setAge(existing.age || 20);
        setCountry(existing.country || 'United States');
      } else if (initialName) {
        setName(initialName);
      }
      setStep(1);
      setError(null);
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  // Validation handlers
  const handleNextStep1 = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your adventurer name.');
      return;
    }
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters long.');
      return;
    }
    if (trimmed.length > 25) {
      setError('Name cannot exceed 25 characters.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (isNaN(age) || age < 10 || age > 120) {
      setError('Please enter a valid age between 10 and 120.');
      return;
    }
    setError(null);
    setStep(3);
  };

  const handleFinish = async () => {
    if (!country.trim()) {
      setError('Please select your country.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const profile = await OnboardingManager.getInstance().saveOnboarding(
        name.trim(),
        age,
        country.trim()
      );
      setIsSubmitting(false);
      onComplete(profile);
    } catch (e) {
      console.error('[OnboardingModal] Error completing onboarding:', e);
      setIsSubmitting(false);
      // Fallback: still notify parent
      onComplete({
        displayName: name.trim(),
        age,
        country: country.trim(),
        onboardingCompleted: true,
        profileCompleted: false,
      });
    }
  };

  const filteredCountries = ALL_COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/50 flex flex-col items-center text-center overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Banner Header */}
        <div className="flex items-center gap-2 px-3 py-1 mb-2 rounded-full bg-gradient-to-r from-amber-500/10 via-cyan-500/10 to-indigo-500/10 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>PRINCE AND PRINCESS RESCUE</span>
        </div>

        {/* Progress Bar & Step Numbers */}
        <div className="w-full max-w-xs mx-auto mb-6">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            <span className={step >= 1 ? 'text-cyan-400' : 'text-slate-600'}>1. Name</span>
            <span className={step >= 2 ? 'text-cyan-400' : 'text-slate-600'}>2. Age</span>
            <span className={step >= 3 ? 'text-cyan-400' : 'text-slate-600'}>3. Country</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: WHAT'S YOUR NAME? */}
        {step === 1 && (
          <div className="w-full flex flex-col items-center animate-in slide-in-from-right-4 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center mb-4 text-cyan-400 shadow-lg shadow-cyan-500/10">
              <User className="w-8 h-8" />
            </div>

            <h2
              id="onboarding-modal-title"
              className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2"
            >
              What's your name?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-6 max-w-sm">
              Choose your royal adventurer handle. Fellow runners will see this in the kingdom and online lobby.
            </p>

            <div className="w-full max-w-md mb-2">
              <div className="relative">
                <input
                  ref={nameInputRef}
                  type="text"
                  maxLength={25}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNextStep1();
                  }}
                  placeholder="e.g. Prince Arthur, Princess Valerie"
                  className="w-full py-3.5 px-4 bg-slate-950/80 border border-slate-700 focus:border-cyan-400 rounded-2xl text-white placeholder-slate-500 text-center text-lg font-bold outline-none shadow-inner transition-colors"
                />
              </div>
              <div className="text-right text-[10px] text-slate-500 mt-1 font-mono">
                {name.trim().length}/25 characters
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold mb-4 animate-shake">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleNextStep1}
              className="w-full max-w-md mt-4 py-4 px-6 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-cyan-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              <span>NEXT</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 2: HOW OLD ARE YOU? */}
        {step === 2 && (
          <div className="w-full flex flex-col items-center animate-in slide-in-from-right-4 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-400/30 flex items-center justify-center mb-4 text-indigo-400 shadow-lg shadow-indigo-500/10">
              <Calendar className="w-8 h-8" />
            </div>

            <h2
              id="onboarding-modal-title"
              className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2"
            >
              How old are you?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-6 max-w-sm">
              We match you with adventures and players tailored for your bracket.
            </p>

            {/* Stepper + Number Input */}
            <div className="w-full max-w-xs mb-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setAge((prev) => Math.max(10, prev - 1))}
                className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xl flex items-center justify-center active:scale-95 transition-all border border-slate-700 cursor-pointer"
              >
                -
              </button>

              <div className="relative flex-1">
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={age}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setAge(isNaN(val) ? 0 : val);
                    if (error) setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNextStep2();
                  }}
                  className="w-full py-3 px-4 bg-slate-950/80 border border-slate-700 focus:border-indigo-400 rounded-2xl text-white text-center text-2xl font-black outline-none font-mono shadow-inner"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                  yrs
                </span>
              </div>

              <button
                type="button"
                onClick={() => setAge((prev) => Math.min(120, prev + 1))}
                className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xl flex items-center justify-center active:scale-95 transition-all border border-slate-700 cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Quick age pill suggestions */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              {[16, 18, 21, 25, 30, 35].map((presetAge) => (
                <button
                  key={presetAge}
                  type="button"
                  onClick={() => {
                    setAge(presetAge);
                    if (error) setError(null);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    age === presetAge
                      ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                  }`}
                >
                  {presetAge}
                </button>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold mb-4 animate-shake">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="w-full max-w-md flex items-center gap-3 mt-4">
              <button
                onClick={() => {
                  setError(null);
                  setStep(1);
                }}
                className="py-4 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm rounded-2xl border border-slate-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>BACK</span>
              </button>

              <button
                onClick={handleNextStep2}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-indigo-500 via-blue-600 to-cyan-500 hover:from-indigo-400 hover:via-blue-500 hover:to-cyan-400 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-indigo-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              >
                <span>NEXT</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: WHICH COUNTRY ARE YOU FROM? */}
        {step === 3 && (
          <div className="w-full flex flex-col items-center animate-in slide-in-from-right-4 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center mb-4 text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Globe className="w-8 h-8" />
            </div>

            <h2
              id="onboarding-modal-title"
              className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1"
            >
              Which country are you from?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-4 max-w-sm">
              Represent your flag in the kingdom and meet fellow adventurers nearby.
            </p>

            {/* Selected Country Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-3 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Selected: {country}</span>
            </div>

            {/* Search filter input */}
            <div className="relative w-full max-w-md mb-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder="Search country..."
                className="w-full py-2.5 pl-10 pr-4 bg-slate-950/80 border border-slate-700 focus:border-emerald-400 rounded-xl text-white placeholder-slate-500 text-sm outline-none"
              />
            </div>

            {/* Popular country quick pills */}
            {!countrySearch && (
              <div className="w-full max-w-md flex flex-wrap gap-1.5 mb-2.5 justify-center max-h-24 overflow-y-auto p-1">
                {POPULAR_COUNTRIES.slice(0, 8).map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setCountry(c.name);
                      if (error) setError(null);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      country === c.name
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                    }`}
                  >
                    <span>{c.flag}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Country list dropdown/picker */}
            <div className="w-full max-w-md h-36 overflow-y-auto bg-slate-950/80 border border-slate-800 rounded-2xl p-1.5 mb-2 text-left space-y-1">
              {filteredCountries.map((c) => {
                const isSelected = country === c.name;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setCountry(c.name);
                      if (error) setError(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                        : 'text-slate-300 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{c.flag}</span>
                      <span>{c.name}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold mb-3 animate-shake">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Back & Finish Buttons */}
            <div className="w-full max-w-md flex items-center gap-3 mt-2">
              <button
                onClick={() => {
                  setError(null);
                  setStep(2);
                }}
                disabled={isSubmitting}
                className="py-4 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm rounded-2xl border border-slate-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>BACK</span>
              </button>

              <button
                onClick={handleFinish}
                disabled={isSubmitting}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-600 hover:from-emerald-400 hover:via-cyan-400 hover:to-indigo-500 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>ENTERING KINGDOM...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>START PLAYING</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
