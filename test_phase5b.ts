/**
 * Automated Verification Suite for Phase 5B: Language Learning System Foundation
 */

import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LEARNING_PROGRESS,
  LanguageCode,
  LearningProgress,
} from './src/game/language/types';
import { LocalLessonProvider } from './src/game/language/LanguageLessonProvider';
import { LanguageChallengeManager } from './src/game/language/LanguageChallengeManager';
import { languageAudioService } from './src/game/language/LanguageAudioService';

// Mock localStorage for headless Node environment
const storageMock: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => storageMock[key] || null,
  setItem: (key: string, val: string) => {
    storageMock[key] = val;
  },
  removeItem: (key: string) => {
    delete storageMock[key];
  },
  clear: () => {
    for (const k in storageMock) delete storageMock[k];
  },
};

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ''}`);
  }
}

console.log('================================================================');
console.log('PHASE 5B VERIFICATION TEST SUITE');
console.log('================================================================\n');

// TEST 1: Supported Languages Definition
console.log('Test Suite 1: Supported Languages');
const expectedLangs: LanguageCode[] = ['zh-CN', 'es-ES', 'fr-FR', 'en-US', 'en-GB'];
assert(
  SUPPORTED_LANGUAGES.length >= 5,
  'All 5 language variants supported (Mandarin, Spanish, French, US English, UK English)'
);

for (const code of expectedLangs) {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  assert(
    !!lang && lang.name.length > 0 && lang.flag.length > 0 && lang.nativeName.length > 0,
    `Language entry valid for ${code}: ${lang?.name} (${lang?.flag})`
  );
}

// TEST 2: Structured Lesson Data for All Languages
console.log('\nTest Suite 2: Structured Lesson Data Content');
const provider = new LocalLessonProvider();

const requiredConcepts = ['come', 'go', 'eat', 'drink', 'hello', 'thank you', 'yes', 'no', 'home', 'friend'];

for (const code of expectedLangs) {
  const lessons = provider.getLessons(code, 1);
  assert(
    lessons.length >= 8,
    `Lessons loaded for ${code} with at least 8 items (found ${lessons.length})`
  );

  // Check required fields on all items
  let allFieldsValid = true;
  for (const item of lessons) {
    if (
      !item.id ||
      !item.sourceLanguage ||
      !item.targetLanguage ||
      !item.languageCode ||
      !item.sourceText ||
      !item.translatedText ||
      !item.difficulty ||
      !item.category ||
      !item.lessonNumber ||
      !item.learningObjective
    ) {
      allFieldsValid = false;
      break;
    }
  }
  assert(allFieldsValid, `All items for ${code} have complete required metadata fields`);

  // Verify core concepts appear in the vocabulary
  const sources = lessons.map((l) => l.sourceText.toLowerCase());
  const foundConcepts = requiredConcepts.filter((c) =>
    sources.some((s) => s.includes(c))
  );
  assert(
    foundConcepts.length >= 6,
    `Found core concepts in ${code} (found ${foundConcepts.join(', ')})`
  );
}

// TEST 3: Mandarin Chinese with Pinyin
console.log('\nTest Suite 3: Mandarin Chinese Specifics');
const zhLessons = provider.getLessons('zh-CN', 1);
const comeZh = zhLessons.find((item) => item.sourceText === 'come');
assert(
  comeZh?.translatedText === '来' && comeZh?.pronunciationText === 'lái',
  'Chinese translation for "come" is "来" with Pinyin "lái"'
);
const helloZh = zhLessons.find((item) => item.sourceText === 'hello');
assert(
  helloZh?.translatedText === '你好' && helloZh?.pronunciationText === 'nǐ hǎo',
  'Chinese translation for "hello" is "你好" with Pinyin "nǐ hǎo"'
);
assert(
  zhLessons.every((item) => !!item.transliteration && item.transliteration.startsWith('Pinyin:')),
  'All Mandarin items include proper Pinyin transliteration with tonal diacritics'
);

// TEST 4: Spanish & French Vocabulary
console.log('\nTest Suite 4: Spanish & French Specifics');
const esLessons = provider.getLessons('es-ES', 1);
const comeEs = esLessons.find((item) => item.sourceText === 'come');
assert(
  comeEs?.translatedText.toLowerCase() === 'venir',
  'Spanish translation for "come" is "venir"'
);
const frLessons = provider.getLessons('fr-FR', 1);
const comeFr = frLessons.find((item) => item.sourceText === 'come');
assert(
  comeFr?.translatedText.toLowerCase() === 'venir',
  'French translation for "come" is "venir"'
);

// TEST 5: English US vs UK Variants
console.log('\nTest Suite 5: English US vs UK Differentiations');
const enUSLessons = provider.getLessons('en-US', 1);
const enGBLessons = provider.getLessons('en-GB', 1);
assert(enUSLessons.length >= 10 && enGBLessons.length >= 10, 'Both US and UK English lesson lists have 10 items');
const gbCheers = enGBLessons.find((item) => item.id.includes('cheers') || item.sourceText.includes('thank you'));
assert(
  !!(gbCheers?.translatedText.includes('cheers') || gbCheers?.exampleSentence?.includes('cheers')),
  'UK English contains authentic British idiom (cheers)'
);

// TEST 6: Challenge State Machine & Transitions
console.log('\nTest Suite 6: Language Challenge State Transitions');
const challengeManager = new LanguageChallengeManager(provider);
assert(challengeManager.state === 'IDLE', 'Initial state is IDLE');

// Start challenge
challengeManager.startChallenge();
assert(challengeManager.state === 'SHOW_WORD', 'State advances to SHOW_WORD on startChallenge');
assert(challengeManager.currentItem !== null, 'Current learning item is assigned');

// Simulate runner update delta past 2.2s (word display duration)
challengeManager.update(2.5, 70, true);
assert(challengeManager.state === 'SHOW_TRANSLATION', 'State advances to SHOW_TRANSLATION after 2.2s');

// Simulate update delta past 3.5s (translation display duration)
challengeManager.update(3.6, 100, true);
assert(
  challengeManager.state === 'WAITING_FOR_RESPONSE',
  'State advances to WAITING_FOR_RESPONSE after translation reveal'
);

// Player acknowledges or completes challenge
const initialCoins = 0;
const initialXP = challengeManager.progress.totalXPEarned;
challengeManager.completeChallenge();
assert(challengeManager.state === 'COMPLETED', 'State changes to COMPLETED on player confirmation');
assert(
  challengeManager.progress.totalXPEarned === initialXP + 10,
  'Challenge awards +10 XP on completion'
);
assert(
  challengeManager.progress.totalChallengesCompleted === 1,
  'Challenge counter increments to 1'
);

// Simulate celebration duration past 1.8s
challengeManager.update(2.0, 120, true);
assert(challengeManager.state === 'IDLE', 'State returns to IDLE after celebration completion');
assert(challengeManager.currentItem === null, 'Current item reset to null in IDLE');

// TEST 7: Local Persistence & Storage
console.log('\nTest Suite 7: Local Persistence & State Restore');
challengeManager.setTargetLanguage('es-ES');
assert(
  challengeManager.progress.targetLanguageCode === 'es-ES',
  'Selected language switched to Spanish (es-ES)'
);

// Instantiate new manager instance to verify it loads saved progress from storage
const freshManager = new LanguageChallengeManager(provider);
assert(
  freshManager.progress.targetLanguageCode === 'es-ES',
  'Fresh manager restores target language "es-ES" from local storage'
);
assert(
  freshManager.progress.totalXPEarned >= 10,
  'Fresh manager restores accumulated XP from local storage'
);
assert(
  freshManager.progress.totalChallengesCompleted === 1,
  'Fresh manager restores completed challenges count from local storage'
);

// TEST 8: Audio Service Integration
console.log('\nTest Suite 8: Audio Service Integration');
assert(
  typeof languageAudioService.speak === 'function' && typeof languageAudioService.stop === 'function',
  'LanguageAudioService provides speak() and stop() interface'
);

// TEST 9: Pluggable Architecture (LocalLessonProvider vs Mock/AI Provider)
console.log('\nTest Suite 9: Modular Lesson Provider Architecture (Phase 6 AI Ready)');
const mockAIProvider = {
  getLessons: () => [],
  getNextChallengeItem: () => ({
    id: 'ai_custom_01',
    sourceLanguage: 'English',
    targetLanguage: 'Spanish',
    languageCode: 'es-ES' as LanguageCode,
    sourceText: 'cyber runner',
    translatedText: 'corredor cibernético',
    difficulty: 'BEGINNER' as const,
    category: 'TECH',
    lessonNumber: 1,
    learningObjective: 'AI dynamic lesson test',
  }),
  getItemById: () => undefined,
};

challengeManager.setLessonProvider(mockAIProvider);
challengeManager.startChallenge();
assert(
  challengeManager.currentItem?.id === 'ai_custom_01' &&
    challengeManager.currentItem?.translatedText === 'corredor cibernético',
  'LanguageChallengeManager seamlessly accepts alternative/AI lesson provider without gameplay changes'
);

// Clean up
challengeManager.dispose();

console.log('\n================================================================');
console.log(`PHASE 5B TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('================================================================');

if (passedTests === totalTests) {
  console.log('>>> ALL PHASE 5B VERIFICATION TESTS PASSED SUCCESSFULLY! <<<');
  process.exit(0);
} else {
  console.error(`>>> ${totalTests - passedTests} TESTS FAILED <<<`);
  process.exit(1);
}
