/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Heart,
  Crown,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Shield,
  Globe,
  MapPin,
  Flag,
  Calendar,
  AlertCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  Lock,
  Compass,
} from 'lucide-react';
import { MatchPreferencesManager } from '../supabase/matchPreferencesManager';
import { OnboardingManager } from '../supabase/onboardingManager';
import {
  MatchPreferences,
  SeekingPreference,
  ReligionPreferenceType,
  DiscoveryScope,
  AdditionalPreferenceItem,
} from '../supabase/types';

interface MatchPreferencesModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onProceedAfterSave: () => void;
  isInitialSetup?: boolean; // True if completing right before Level 2
}

const COUNTRY_OPTIONS = [
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
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
];

const RELIGIONS_LIST = [
  { id: 'Christianity', label: 'Christianity', icon: '✝️' },
  { id: 'Islam', label: 'Islam', icon: '☪️' },
  { id: 'Judaism', label: 'Judaism', icon: '✡️' },
  { id: 'Hinduism', label: 'Hinduism', icon: '🕉️' },
  { id: 'Buddhism', label: 'Buddhism', icon: '☸️' },
  { id: 'Other', label: 'Other', icon: '🌐' },
];

export const MatchPreferencesModal: React.FC<MatchPreferencesModalProps> = ({
  isOpen,
  onClose,
  onProceedAfterSave,
  isInitialSetup = true,
}) => {
  // Navigation step: 1: Seeking, 2: Age, 3: Religion, 4: Scope, 5: Additional, 6: Review, 7: Saved Confirmation
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);

  // Form states
  const [seeking, setSeeking] = useState<SeekingPreference>('PRINCESS');
  const [anyAdultAge, setAnyAdultAge] = useState<boolean>(false);
  const [minAge, setMinAge] = useState<number>(20);
  const [maxAge, setMaxAge] = useState<number>(35);
  const [religionType, setReligionType] = useState<ReligionPreferenceType>('ANY');
  const [selectedReligions, setSelectedReligions] = useState<string[]>([]);
  const [scope, setScope] = useState<DiscoveryScope>('GLOBAL');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('US');
  const [additional, setAdditional] = useState<AdditionalPreferenceItem[]>([
    'SIMILAR_INTERESTS',
    'RECENTLY_ACTIVE',
  ]);

  // UI & network feedback
  const [countrySearch, setCountrySearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [userProfileReligion, setUserProfileReligion] = useState<string | null>(null);
  const [userProfileCountry, setUserProfileCountry] = useState<string>('Global');

  // Load existing profile & preferences on open
  useEffect(() => {
    if (isOpen) {
      const profile = OnboardingManager.getInstance().getProfile();
      if (profile) {
        setUserProfileReligion(profile.religion || null);
        setUserProfileCountry(profile.country || 'Global');
      }

      const existingPrefs = MatchPreferencesManager.getInstance().getPreferences();
      if (existingPrefs) {
        setSeeking(existingPrefs.seeking_preferences || 'PRINCESS');
        setAnyAdultAge(Boolean(existingPrefs.any_eligible_adult_age));
        setMinAge(existingPrefs.min_age ?? 20);
        setMaxAge(existingPrefs.max_age ?? 35);
        setReligionType(existingPrefs.religion_preference_type || 'ANY');
        setSelectedReligions(existingPrefs.preferred_religions || []);
        setScope(existingPrefs.discovery_scope || 'GLOBAL');
        setSelectedCountryCode(existingPrefs.selected_country_code || 'US');
        setAdditional(existingPrefs.additional_preferences || ['SIMILAR_INTERESTS']);
      }

      setStep(1);
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Validation per step
  const handleNextStep1 = () => {
    setError(null);
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!anyAdultAge) {
      if (minAge < 18) {
        setError('Minimum age must be 18 or older (strictly adult-only).');
        return;
      }
      if (maxAge > 120) {
        setError('Maximum age cannot exceed 120.');
        return;
      }
      if (minAge > maxAge) {
        setError('Minimum age cannot exceed maximum age.');
        return;
      }
    }
    setError(null);
    setStep(3);
  };

  const handleNextStep3 = () => {
    if (religionType === 'SPECIFIC' && selectedReligions.length === 0) {
      setError('Please select at least one religion, or choose "Any religion".');
      return;
    }
    setError(null);
    setStep(4);
  };

  const handleNextStep4 = () => {
    if (scope === 'SELECTED_COUNTRY' && !selectedCountryCode) {
      setError('Please choose a valid country for selected country scope.');
      return;
    }
    setError(null);
    setStep(5);
  };

  const handleNextStep5 = () => {
    setError(null);
    setStep(6); // Go to Review
  };

  const handleToggleReligion = (rel: string) => {
    setError(null);
    if (selectedReligions.includes(rel)) {
      setSelectedReligions(selectedReligions.filter((r) => r !== rel));
    } else {
      setSelectedReligions([...selectedReligions, rel]);
    }
  };

  const handleToggleAdditional = (item: AdditionalPreferenceItem) => {
    if (additional.includes(item)) {
      setAdditional(additional.filter((a) => a !== item));
    } else {
      setAdditional([...additional, item]);
    }
  };

  const handleConfirmAndSave = async () => {
    setError(null);
    setIsSaving(true);

    const prefsPayload: Omit<MatchPreferences, 'id' | 'created_at' | 'updated_at'> = {
      user_id: '', // Will be resolved to real authenticated user ID by manager
      seeking_preferences: seeking,
      min_age: anyAdultAge ? null : minAge,
      max_age: anyAdultAge ? null : maxAge,
      any_eligible_adult_age: anyAdultAge,
      religion_preference_type: religionType,
      preferred_religions: religionType === 'SPECIFIC' ? selectedReligions : [],
      discovery_scope: scope,
      selected_country_code: scope === 'SELECTED_COUNTRY' ? selectedCountryCode : null,
      additional_preferences: additional,
    };

    const res = await MatchPreferencesManager.getInstance().savePreferences(prefsPayload);

    setIsSaving(false);
    if (res.success) {
      setStep(7); // Show confirmed save screen
    } else {
      setError(res.error || 'Failed to save preferences to database. Please retry.');
    }
  };

  // Label helpers for review
  const getSeekingLabel = (s: SeekingPreference) => {
    switch (s) {
      case 'PRINCESS':
        return 'A Princess (👸)';
      case 'PRINCE':
        return 'A Prince (🤴)';
      case 'ALL':
        return 'Eligible adults of any gender (✨)';
    }
  };

  const getReligionLabel = () => {
    switch (religionType) {
      case 'ANY':
        return 'Any religion';
      case 'SAME':
        return userProfileReligion && userProfileReligion !== 'Prefer not to say'
          ? `Same as mine (${userProfileReligion})`
          : 'Same as mine (Not set in profile)';
      case 'SPECIFIC':
        return selectedReligions.length > 0
          ? `Specific: ${selectedReligions.join(', ')}`
          : 'Specific religions';
      case 'NO_PREFERENCE':
        return 'Prefer not to specify';
    }
  };

  const getScopeLabel = () => {
    switch (scope) {
      case 'GLOBAL':
        return 'Global (Worldwide discovery)';
      case 'SAME_COUNTRY':
        return `My country (${userProfileCountry})`;
      case 'SELECTED_COUNTRY': {
        const found = COUNTRY_OPTIONS.find((c) => c.code === selectedCountryCode);
        return `Selected country: ${found ? `${found.flag} ${found.name}` : selectedCountryCode}`;
      }
      case 'NEARBY':
        return 'Nearby (Planned feature for upcoming updates)';
    }
  };

  const getAdditionalLabel = () => {
    if (additional.length === 0) return 'None selected';
    const names: Record<AdditionalPreferenceItem, string> = {
      SIMILAR_INTERESTS: 'Similar interests & values',
      SIMILAR_INTENTIONS: 'Similar intentions',
      RECENTLY_ACTIVE: 'Recently active runners',
    };
    return additional.map((a) => names[a]).join(' · ');
  };

  const filteredCountries = COUNTRY_OPTIONS.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preferences-modal-title"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-950/40 flex flex-col items-center my-auto overflow-hidden">
        {/* Decorative lighting */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Phase Header Badge */}
        <div className="flex items-center gap-2 px-3 py-1 mb-2 rounded-full bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-indigo-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
          <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
          <span>PHASE 2 · DISCOVERY & MATCH PREFERENCES</span>
        </div>

        {/* Stepper Progress Bar (only during steps 1-5) */}
        {step <= 5 && (
          <div className="w-full max-w-xs mx-auto mb-5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              <span className={step >= 1 ? 'text-amber-400' : 'text-slate-600'}>1. Seeking</span>
              <span className={step >= 2 ? 'text-amber-400' : 'text-slate-600'}>2. Age</span>
              <span className={step >= 3 ? 'text-amber-400' : 'text-slate-600'}>3. Religion</span>
              <span className={step >= 4 ? 'text-amber-400' : 'text-slate-600'}>4. Scope</span>
              <span className={step >= 5 ? 'text-amber-400' : 'text-slate-600'}>5. Focus</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500 transition-all duration-300 rounded-full"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* QUESTION 1: WHO WOULD YOU LIKE TO MEET? */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="w-full flex flex-col items-center animate-in slide-in-from-right-4 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center mb-3 text-amber-400 shadow-lg shadow-amber-500/10">
              <Crown className="w-8 h-8" />
            </div>

            <h2
              id="preferences-modal-title"
              className="text-2xl sm:text-3xl font-black text-white tracking-tight text-center mb-1"
            >
              Who would you like to meet?
            </h2>
            <p className="text-xs sm:text-sm text-cyan-200 text-center mb-6 max-w-sm">
              Tailor your discovery settings. We will look for royal adventurers who match your selection.
            </p>

            <div className="w-full space-y-3">
              {[
                {
                  id: 'PRINCESS',
                  title: 'I want to meet a princess.',
                  desc: 'Discover noble, valiant, and mystic princesses across realms.',
                  icon: '👸',
                },
                {
                  id: 'PRINCE',
                  title: 'I want to meet a prince.',
                  desc: 'Discover royal, knightly, and heroic princes across realms.',
                  icon: '🤴',
                },
                {
                  id: 'ALL',
                  title: 'I want to meet eligible adults of any gender.',
                  desc: 'Open discovery to all eligible princes, princesses, and champions.',
                  icon: '✨',
                },
              ].map((option) => {
                const isSelected = seeking === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setSeeking(option.id as SeekingPreference);
                      setError(null);
                    }}
                    className={`w-full p-4 rounded-2xl flex items-center gap-3.5 transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 border-2 border-amber-400 shadow-lg shadow-amber-500/20'
                        : 'bg-slate-950/70 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-3xl shrink-0">{option.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-white mb-0.5">{option.title}</div>
                      <div className="text-xs text-slate-400">{option.desc}</div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black shrink-0">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold mt-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleNextStep1}
              className="w-full mt-6 py-4 px-6 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:via-orange-400 hover:to-indigo-500 text-white font-black text-base rounded-2xl shadow-xl shadow-amber-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              <span>NEXT: PREFERRED AGE</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* QUESTION 2: PREFERRED AGE RANGE */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="w-full flex flex-col items-center animate-in slide-in-from-right-4 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-400/30 flex items-center justify-center mb-3 text-rose-400 shadow-lg shadow-rose-500/10">
              <Calendar className="w-8 h-8" />
            </div>

            <h2
              id="preferences-modal-title"
              className="text-2xl sm:text-3xl font-black text-white tracking-tight text-center mb-1"
            >
              What age range would you like to meet?
            </h2>
            <p className="text-xs sm:text-sm text-cyan-200 text-center mb-4 max-w-sm">
              Romantic discovery is strictly for adults aged 18 and older.
            </p>

            {/* Any Eligible Adult Age Toggle */}
            <button
              type="button"
              onClick={() => {
                setAnyAdultAge(!anyAdultAge);
                setError(null);
              }}
              className={`w-full p-3.5 mb-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                anyAdultAge
                  ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                  : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5 text-left">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white">Any eligible adult age (18+)</div>
                  <div className="text-[10px] text-slate-400">Open to all eligible adult adventurers</div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                  anyAdultAge
                    ? 'bg-amber-400 border-amber-400 text-slate-950'
                    : 'border-slate-600 bg-slate-900'
                }`}
              >
                {anyAdultAge && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </button>

            {/* Custom Age Range Controls (Shown if Any Adult Age not toggled) */}
            {!anyAdultAge && (
              <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-3 space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Selected Range:</span>
                  <span className="font-mono text-amber-400 font-extrabold text-sm">
                    {minAge} – {maxAge} years old
                  </span>
                </div>

                {/* Min Age Stepper */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-300 w-24">Minimum Age:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMinAge((prev) => Math.max(18, prev - 1))}
                      className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-mono font-bold text-white text-base">
                      {minAge}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMinAge((prev) => Math.min(maxAge, prev + 1))}
                      className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Max Age Stepper */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-300 w-24">Maximum Age:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMaxAge((prev) => Math.max(minAge, prev - 1))}
                      className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-mono font-bold text-white text-base">
                      {maxAge}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMaxAge((prev) => Math.min(99, prev + 1))}
                      className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-900 justify-center">
                  {[
                    { label: '18 - 25', min: 18, max: 25 },
                    { label: '21 - 30', min: 21, max: 30 },
                    { label: '25 - 40', min: 25, max: 40 },
                    { label: '30 - 55', min: 30, max: 55 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setMinAge(preset.min);
                        setMaxAge(preset.max);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-[10px] font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Safety & Self-Declared Notice */}
            <div className="w-full flex items-start gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 mb-2">
              <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                <strong>Safety Notice:</strong> Player ages are self-declared for preference matching.
                Identity & age verification are handled as separate future security capabilities.
              </span>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold mb-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="w-full flex items-center gap-3 mt-4">
              <button
                type="button"
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
                type="button"
                onClick={handleNextStep2}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:via-orange-400 hover:to-indigo-500 text-white font-black text-base rounded-2xl shadow-xl shadow-amber-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              >
                <span>NEXT: RELIGION PREFERENCE</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* QUESTION 3: RELIGION PREFERENCE */}
        {/* ========================================================================= */}
        {step === 3 && (
          <div className="w-full flex flex-col items-center animate-in slide-in-from-right-4 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-400/30 flex items-center justify-center mb-3 text-indigo-400 shadow-lg shadow-indigo-500/10">
              <Shield className="w-8 h-8" />
            </div>

            <h2
              id="preferences-modal-title"
              className="text-2xl sm:text-3xl font-black text-white tracking-tight text-center mb-1"
            >
              Does religion matter in your search?
            </h2>
            <p className="text-xs sm:text-sm text-cyan-200 text-center mb-5 max-w-sm">
              Religion preferences are completely optional, private, and used exclusively for discovery matching.
            </p>

            <div className="w-full space-y-2.5 mb-3">
              {[
                {
                  id: 'ANY',
                  title: 'Any religion.',
                  desc: 'Open to adventurers of all faiths and beliefs.',
                },
                {
                  id: 'SAME',
                  title: 'Prefer the same religion as mine.',
                  desc: userProfileReligion && userProfileReligion !== 'Prefer not to say'
                    ? `Matching with adventurers of ${userProfileReligion}.`
                    : 'Note: You chose "Prefer not to say" or have no religion set in your profile. You can still pick this, or choose another option.',
                },
                {
                  id: 'SPECIFIC',
                  title: 'Let me select one or more religions.',
                  desc: 'Pick the specific traditions you wish to prioritize.',
                },
                {
                  id: 'NO_PREFERENCE',
                  title: 'Prefer not to specify a religion preference.',
                  desc: 'Do not filter discovery results based on religion.',
                },
              ].map((opt) => {
                const isSelected = religionType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setReligionType(opt.id as ReligionPreferenceType);
                      setError(null);
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-500/20 border-indigo-400 shadow-md shadow-indigo-500/20'
                        : 'bg-slate-950/70 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-white">{opt.title}</span>
                      {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="text-[11px] text-slate-400">{opt.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Multi-select religions grid if SPECIFIC is chosen */}
            {religionType === 'SPECIFIC' && (
              <div className="w-full bg-slate-950/90 border border-slate-800 rounded-2xl p-3 mb-3 animate-in fade-in">
                <div className="text-[11px] font-bold text-slate-300 mb-2">
                  Select one or more religions:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {RELIGIONS_LIST.map((rel) => {
                    const isSelected = selectedReligions.includes(rel.id);
                    return (
                      <button
                        key={rel.id}
                        type="button"
                        onClick={() => handleToggleReligion(rel.id)}
                        className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/25 text-amber-300 border border-amber-400/60 font-bold'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        <span>{rel.icon}</span>
                        <span className="truncate">{rel.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold mb-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="w-full flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep(2);
                }}
                className="py-4 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm rounded-2xl border border-slate-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>BACK</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep3}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:via-orange-400 hover:to-indigo-500 text-white font-black text-base rounded-2xl shadow-xl shadow-amber-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              >
                <span>NEXT: DISCOVERY SCOPE</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* QUESTION 4: WHERE DO YOU WANT TO MEET SOMEONE? */}
        {/* ========================================================================= */}
        {step === 4 && (
          <div className="w-full flex flex-col items-center animate-in slide-in-from-right-4 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center mb-3 text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Compass className="w-8 h-8" />
            </div>

            <h2
              id="preferences-modal-title"
              className="text-2xl sm:text-3xl font-black text-white tracking-tight text-center mb-1"
            >
              Where would you like to find your prince or princess?
            </h2>
            <p className="text-xs sm:text-sm text-cyan-200 text-center mb-4 max-w-sm">
              Define the geographical reach for your future discovery matches.
            </p>

            <div className="w-full space-y-2.5 mb-3">
              {/* GLOBAL */}
              <button
                type="button"
                onClick={() => {
                  setScope('GLOBAL');
                  setError(null);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  scope === 'GLOBAL'
                    ? 'bg-cyan-500/20 border-cyan-400 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-950/70 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Globe className="w-6 h-6 text-cyan-400 shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-bold text-white">A. Global</div>
                  <div className="text-[11px] text-slate-400">
                    Discover compatible eligible adults from supported countries around the world.
                  </div>
                </div>
                {scope === 'GLOBAL' && <Check className="w-4 h-4 text-cyan-400" />}
              </button>

              {/* MY COUNTRY */}
              <button
                type="button"
                onClick={() => {
                  setScope('SAME_COUNTRY');
                  setError(null);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  scope === 'SAME_COUNTRY'
                    ? 'bg-cyan-500/20 border-cyan-400 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-950/70 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Flag className="w-6 h-6 text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-bold text-white">B. My country ({userProfileCountry})</div>
                  <div className="text-[11px] text-slate-400">
                    Discover compatible eligible adults located within the same realm/country.
                  </div>
                </div>
                {scope === 'SAME_COUNTRY' && <Check className="w-4 h-4 text-cyan-400" />}
              </button>

              {/* A SELECTED COUNTRY */}
              <button
                type="button"
                onClick={() => {
                  setScope('SELECTED_COUNTRY');
                  setError(null);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  scope === 'SELECTED_COUNTRY'
                    ? 'bg-cyan-500/20 border-cyan-400 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-950/70 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Search className="w-6 h-6 text-amber-400 shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-bold text-white">C. A selected country</div>
                  <div className="text-[11px] text-slate-400">
                    Choose a specific country from our maintained registry.
                  </div>
                </div>
                {scope === 'SELECTED_COUNTRY' && <Check className="w-4 h-4 text-cyan-400" />}
              </button>

              {/* Selected country picker dropdown if C is chosen */}
              {scope === 'SELECTED_COUNTRY' && (
                <div className="w-full bg-slate-950/90 border border-slate-800 rounded-2xl p-3 animate-in fade-in space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      placeholder="Filter country registry..."
                      className="w-full py-1.5 pl-8 pr-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none"
                    />
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                    {filteredCountries.map((c) => {
                      const isChosen = selectedCountryCode === c.code;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setSelectedCountryCode(c.code);
                            setError(null);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                            isChosen
                              ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-400/40'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{c.flag}</span>
                            <span>{c.name}</span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-500">{c.code}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* NEARBY (Planned feature) */}
              <button
                type="button"
                onClick={() => {
                  setScope('NEARBY');
                  setError(null);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  scope === 'NEARBY'
                    ? 'bg-indigo-500/20 border-indigo-400 shadow-md shadow-indigo-500/20'
                    : 'bg-slate-950/70 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <MapPin className="w-6 h-6 text-purple-400 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">D. Nearby</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-900/80 text-indigo-300 border border-indigo-500/40 font-mono font-bold">
                      PLANNED
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Pre-enable proximity matching for when nearby features launch. (No GPS collected in this phase).
                  </div>
                </div>
                {scope === 'NEARBY' && <Check className="w-4 h-4 text-indigo-400" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold mb-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="w-full flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep(3);
                }}
                className="py-4 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm rounded-2xl border border-slate-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>BACK</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep4}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:via-orange-400 hover:to-indigo-500 text-white font-black text-base rounded-2xl shadow-xl shadow-amber-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              >
                <span>NEXT: ADDITIONAL FOCUS</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* QUESTION 5: ADDITIONAL MATCHING PREFERENCES */}
        {/* ========================================================================= */}
        {step === 5 && (
          <div className="w-full flex flex-col items-center animate-in slide-in-from-right-4 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center mb-3 text-amber-400 shadow-lg shadow-amber-500/10">
              <Sparkles className="w-8 h-8" />
            </div>

            <h2
              id="preferences-modal-title"
              className="text-2xl sm:text-3xl font-black text-white tracking-tight text-center mb-1"
            >
              Additional Matching Preferences
            </h2>
            <p className="text-xs sm:text-sm text-cyan-200 text-center mb-5 max-w-sm">
              Optionally select what matters most to prioritize in your future discovery suggestions.
            </p>

            <div className="w-full space-y-2.5 mb-4">
              {[
                {
                  id: 'SIMILAR_INTERESTS',
                  title: 'Similar interests and values',
                  desc: 'Prioritize fellow runners with compatible adventurer passions.',
                  icon: '✨',
                },
                {
                  id: 'SIMILAR_INTENTIONS',
                  title: 'Similar relationship intentions',
                  desc: 'Match with players seeking the same connection goals in the realm.',
                  icon: '👑',
                },
                {
                  id: 'RECENTLY_ACTIVE',
                  title: 'People who are recently active',
                  desc: 'Emphasize players who have embarked on runs recently.',
                  icon: '⚡',
                },
              ].map((item) => {
                const isChecked = additional.includes(item.id as AdditionalPreferenceItem);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleToggleAdditional(item.id as AdditionalPreferenceItem)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 ${
                      isChecked
                        ? 'bg-amber-500/20 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950/70 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-2xl shrink-0">{item.icon}</span>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white mb-0.5">{item.title}</div>
                      <div className="text-[11px] text-slate-400">{item.desc}</div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? 'bg-amber-400 border-amber-400 text-slate-950'
                          : 'border-slate-600 bg-slate-900'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div className="w-full flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep(4);
                }}
                className="py-4 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm rounded-2xl border border-slate-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>BACK</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep5}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:via-orange-400 hover:to-indigo-500 text-white font-black text-base rounded-2xl shadow-xl shadow-amber-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              >
                <span>REVIEW PREFERENCES</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 6: REVIEW AND CONFIRMATION SCREEN */}
        {/* ========================================================================= */}
        {step === 6 && (
          <div className="w-full flex flex-col items-center animate-in slide-in-from-right-4 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center mb-3 text-amber-400 shadow-lg shadow-amber-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2
              id="preferences-modal-title"
              className="text-2xl sm:text-3xl font-black text-white tracking-tight text-center mb-1"
            >
              Review Your Discovery Preferences
            </h2>
            <p className="text-xs sm:text-sm text-cyan-200 text-center mb-5 max-w-sm">
              Confirm your romantic discovery settings before saving to your profile.
            </p>

            {/* Summary card */}
            <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-4 space-y-3 text-left">
              <div className="flex items-start justify-between border-b border-slate-900 pb-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Seeking
                  </span>
                  <div className="text-xs font-bold text-white mt-0.5">{getSeekingLabel(seeking)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline"
                >
                  Edit
                </button>
              </div>

              <div className="flex items-start justify-between border-b border-slate-900 pb-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Age Range
                  </span>
                  <div className="text-xs font-bold text-white mt-0.5">
                    {anyAdultAge ? 'Any eligible adult age (18+)' : `${minAge} – ${maxAge} years old`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline"
                >
                  Edit
                </button>
              </div>

              <div className="flex items-start justify-between border-b border-slate-900 pb-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Religion Preference
                  </span>
                  <div className="text-xs font-bold text-white mt-0.5">{getReligionLabel()}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline"
                >
                  Edit
                </button>
              </div>

              <div className="flex items-start justify-between border-b border-slate-900 pb-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Discovery Scope
                  </span>
                  <div className="text-xs font-bold text-white mt-0.5">{getScopeLabel()}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline"
                >
                  Edit
                </button>
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Priorities
                  </span>
                  <div className="text-xs font-bold text-white mt-0.5">{getAdditionalLabel()}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline"
                >
                  Edit
                </button>
              </div>
            </div>

            {error && (
              <div className="w-full flex items-center gap-2 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs mb-3">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="flex-1">{error}</span>
                <button
                  type="button"
                  onClick={handleConfirmAndSave}
                  className="px-2 py-1 bg-rose-800 text-white font-bold text-[10px] rounded hover:bg-rose-700"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Actions: Edit vs Confirm and Save */}
            <div className="w-full flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isSaving}
                className="py-4 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm rounded-2xl border border-slate-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation disabled:opacity-50"
              >
                <span>EDIT</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmAndSave}
                disabled={isSaving}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:via-orange-400 hover:to-indigo-500 text-white font-black text-base rounded-2xl shadow-xl shadow-amber-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>SAVING PREFERENCES...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-amber-200" />
                    <span>CONFIRM & SAVE PREFERENCES</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 7: CONFIRMED SAVE SCREEN */}
        {/* ========================================================================= */}
        {step === 7 && (
          <div className="w-full flex flex-col items-center animate-in zoom-in-95 duration-200 py-4">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border-2 border-emerald-400/50 flex items-center justify-center mb-4 text-emerald-400 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight text-center mb-2">
              Preferences Saved!
            </h2>

            <p className="text-xs sm:text-sm text-emerald-200 text-center mb-6 max-w-sm font-medium">
              Your discovery preferences have been saved. You can change them later in your profile settings.
            </p>

            <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-6 text-left space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Ready for the Next Sector</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Your romantic discovery filters are securely locked into the realm database. You are now cleared to advance into Level 2!
              </p>
            </div>

            <button
              type="button"
              onClick={onProceedAfterSave}
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-600 hover:from-emerald-400 hover:via-cyan-400 hover:to-indigo-500 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              <span>{isInitialSetup ? 'CONTINUE TO LEVEL 2' : 'BACK TO GAME'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
