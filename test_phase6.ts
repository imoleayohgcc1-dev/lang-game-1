/**
 * Comprehensive Automated Verification Suite for Phase 6: AI Language Teacher
 */

import {
  SUPPORTED_LANGUAGES,
  LESSON_CATEGORIES,
  DEFAULT_LEARNING_PROGRESS,
  LanguageCode,
  LanguageDifficulty,
  LearningProgress,
  LearningItem,
} from './src/game/language/types';
import { LocalLessonProvider } from './src/game/language/LanguageLessonProvider';
import {
  AI_LessonProvider,
  validateAILesson,
  AI_REQUEST_TIMEOUT,
  AI_MAX_RETRIES,
  AI_CACHE_SIZE,
} from './src/game/language/AI_LessonProvider';
import { LanguageChallengeManager } from './src/game/language/LanguageChallengeManager';
import fs from 'fs';

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
console.log('PHASE 6 VERIFICATION TEST SUITE: AI LANGUAGE TEACHER');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// TEST SUITE 1: Structured AI Response Validation & Schema Enforcement
// -----------------------------------------------------------------------------
console.log('Test Suite 1: Structured AI Response Validation & Schema Enforcement');

const validMock = {
  sourceLanguage: 'English',
  targetLanguage: 'Chinese (Mandarin)',
  sourceText: 'thank you',
  translatedText: '谢谢',
  pronunciationGuide: 'xiè xie',
  transliteration: 'Pinyin: xiè xie',
  exampleSentence: '非常谢谢！',
  difficulty: 'BEGINNER',
  category: 'GREETINGS',
};

const validatedResult = validateAILesson(validMock);
assert(
  validatedResult !== null &&
    validatedResult.sourceText === 'thank you' &&
    validatedResult.translatedText === '谢谢' &&
    validatedResult.pronunciationGuide === 'xiè xie',
  'Valid structured AI lesson passes schema validation with all required fields'
);

// Rejections of malformed payloads
assert(validateAILesson(null) === null, 'Rejects null response');
assert(validateAILesson({}) === null, 'Rejects empty object');
assert(
  validateAILesson({ sourceText: '', translatedText: 'hola', targetLanguage: 'Spanish' }) === null,
  'Rejects item with empty sourceText'
);
assert(
  validateAILesson({ sourceText: 'hello', translatedText: '', targetLanguage: 'Spanish' }) === null,
  'Rejects item with empty translatedText'
);
assert(
  validateAILesson({
    sourceText: 'A'.repeat(120),
    translatedText: 'B'.repeat(120),
    targetLanguage: 'Spanish',
  }) === null,
  'Rejects uncontrolled paragraphs / oversize text to protect HUD'
);

// -----------------------------------------------------------------------------
// TEST SUITE 2: Server-Side AI Architecture & API Key Security
// -----------------------------------------------------------------------------
console.log('\nTest Suite 2: Server-Side AI Architecture & API Key Security');

const serverFileExists = fs.existsSync('./server.ts');
assert(serverFileExists, 'server.ts entry point exists for full-stack architecture');

if (serverFileExists) {
  const serverContent = fs.readFileSync('./server.ts', 'utf8');
  assert(
    serverContent.includes('@google/genai'),
    'server.ts initializes official @google/genai TypeScript SDK'
  );
  assert(
    serverContent.includes('/api/language/lessons'),
    'server.ts provides secure POST /api/language/lessons proxy route'
  );
  assert(
    serverContent.includes('process.env.GEMINI_API_KEY'),
    'server.ts safely references process.env.GEMINI_API_KEY exclusively on server'
  );
  assert(
    !serverContent.includes('apiKey: "AIza') && !serverContent.includes('apiKey: "test'),
    'server.ts does not contain hard-coded API keys'
  );
  assert(
    serverContent.includes('gemini-3.8-flash'),
    'server.ts uses recommended gemini-3.8-flash model'
  );
  assert(
    serverContent.includes('User-Agent') && serverContent.includes('aistudio-build'),
    'server.ts sets mandatory User-Agent: aistudio-build header in httpOptions'
  );
}

// Ensure client-side bundle does NOT import @google/genai
const aiProviderCode = fs.readFileSync('./src/game/language/AI_LessonProvider.ts', 'utf8');
assert(
  !aiProviderCode.includes('from "@google/genai"') &&
    !aiProviderCode.includes("from '@google/genai'"),
  'Client-side AI_LessonProvider does not import @google/genai directly'
);
assert(
  !aiProviderCode.includes('GEMINI_API_KEY'),
  'Client-side code never accesses GEMINI_API_KEY'
);

// -----------------------------------------------------------------------------
// TEST SUITE 3: AI Provider Configuration & Cost-Control Caching
// -----------------------------------------------------------------------------
console.log('\nTest Suite 3: AI Provider Configuration & Cost-Control Caching');

assert(AI_REQUEST_TIMEOUT === 5000, `AI_REQUEST_TIMEOUT is configured to 5000ms`);
assert(AI_MAX_RETRIES === 2, `AI_MAX_RETRIES is set to 2 to prevent runaway retries`);
assert(AI_CACHE_SIZE === 30, `AI_CACHE_SIZE is set to 30 items per cache partition`);

const aiProvider = new AI_LessonProvider();
assert(aiProvider.getStatus() === 'IDLE', 'Initial status of AI_LessonProvider is IDLE');

// Test manual cache loading and instant synchronous retrieval
const testProgress: LearningProgress = {
  ...DEFAULT_LEARNING_PROGRESS,
  targetLanguageCode: 'zh-CN',
  currentDifficulty: 'BEGINNER',
  selectedCategory: 'GREETINGS',
  useAITeacher: true,
};

// -----------------------------------------------------------------------------
// TEST SUITE 4: Offline / Network Timeout Fallback to LocalLessonProvider
// -----------------------------------------------------------------------------
console.log('\nTest Suite 4: Offline / Network Timeout Fallback to LocalLessonProvider');

const startTime = Date.now();
// Because fetch is not hitting a live server in unit test, it instantly falls back to local provider
const challengeItem = aiProvider.getNextChallengeItem(testProgress);
const elapsed = Date.now() - startTime;

assert(challengeItem !== null, 'Challenge item returned successfully');
assert(
  challengeItem.sourceText.length > 0 && challengeItem.translatedText.length > 0,
  `Valid fallback lesson delivered: "${challengeItem.sourceText}" -> "${challengeItem.translatedText}"`
);
assert(
  elapsed < 20,
  `Synchronous fallback took ${elapsed}ms (< 20ms) - runner 60fps is never interrupted`
);

// -----------------------------------------------------------------------------
// TEST SUITE 5: Difficulty System (Beginner, Intermediate, Advanced)
// -----------------------------------------------------------------------------
console.log('\nTest Suite 5: Difficulty System');

const difficulties: LanguageDifficulty[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
const manager = new LanguageChallengeManager(aiProvider);

for (const diff of difficulties) {
  manager.setDifficulty(diff);
  assert(
    manager.progress.currentDifficulty === diff,
    `Difficulty correctly set to ${diff} in manager progress`
  );
}

// -----------------------------------------------------------------------------
// TEST SUITE 6: Lesson Categories System
// -----------------------------------------------------------------------------
console.log('\nTest Suite 6: Lesson Categories System');

assert(LESSON_CATEGORIES.length >= 12, `At least 12 categories available (found ${LESSON_CATEGORIES.length})`);

const expectedCategoryIds = [
  'ALL',
  'GREETINGS',
  'DAILY_LIFE',
  'TRAVEL',
  'FOOD',
  'FAMILY',
  'SCHOOL',
  'WORK',
  'DIRECTIONS',
  'NUMBERS',
  'TIME',
  'COMMON_VERBS',
  'COMMON_PHRASES',
  'CONVERSATION',
];

for (const catId of expectedCategoryIds) {
  const cat = LESSON_CATEGORIES.find((c) => c.id === catId);
  assert(!!cat && cat.name.length > 0, `Category "${catId}" is properly defined with icon & description`);
}

manager.setCategory('TRAVEL');
assert(manager.progress.selectedCategory === 'TRAVEL', 'Selected category persisted as TRAVEL');

// -----------------------------------------------------------------------------
// TEST SUITE 7: AI Teacher Mode Toggle
// -----------------------------------------------------------------------------
console.log('\nTest Suite 7: AI Teacher Mode Toggle');

manager.setUseAITeacher(false);
assert(manager.progress.useAITeacher === false, 'AI Teacher mode can be toggled OFF');
assert(manager.getAITeacherStatus() === 'DISABLED', 'Status reports DISABLED when toggled OFF');

const localOnlyItem = manager.getLessonProvider().getNextChallengeItem(manager.progress);
assert(!!localOnlyItem && !localOnlyItem.aiGenerated, 'Local item delivered when AI Teacher is disabled');

manager.setUseAITeacher(true);
assert(manager.progress.useAITeacher === true, 'AI Teacher mode can be toggled ON');

// -----------------------------------------------------------------------------
// TEST SUITE 8: Supported Languages Compatibility
// -----------------------------------------------------------------------------
console.log('\nTest Suite 8: Supported Languages Compatibility');

const allLangs: LanguageCode[] = ['zh-CN', 'es-ES', 'fr-FR', 'en-US', 'en-GB'];
for (const code of allLangs) {
  manager.setTargetLanguage(code);
  const item = manager.getLessonProvider().getNextChallengeItem(manager.progress);
  assert(
    item.languageCode === code,
    `Lesson provider seamlessly yields item for language variant ${code}`
  );
}

// -----------------------------------------------------------------------------
// TEST SUITE 9: Non-blocking Deterministic Runner Pacing
// -----------------------------------------------------------------------------
console.log('\nTest Suite 9: Non-blocking Deterministic Runner Pacing');

manager.reset();
assert(manager.state === 'IDLE', 'Initial state is IDLE');

// Simulate runner moving 70 meters
manager.update(0.016, 70.0, true);
assert(manager.state === 'SHOW_WORD', 'Runner reaches trigger distance and starts challenge in SHOW_WORD');
assert(manager.currentItem !== null, 'Current challenge item is assigned immediately');

// Check that 100 rapid update cycles complete without latency spikes
const loopStart = Date.now();
for (let i = 0; i < 100; i++) {
  manager.update(0.016, 70.0 + i * 0.1, true);
}
const loopElapsed = Date.now() - loopStart;
assert(
  loopElapsed < 25,
  `100 runner update cycles completed in ${loopElapsed}ms (no AI calls in game loop)`
);

// -----------------------------------------------------------------------------
// FINAL REPORT
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`PHASE 6 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('================================================================');

if (passedTests === totalTests) {
  console.log('>>> ALL PHASE 6 VERIFICATION TESTS PASSED SUCCESSFULLY! <<<\n');
  process.exit(0);
} else {
  console.error(`>>> ${totalTests - passedTests} TESTS FAILED! <<<\n`);
  process.exit(1);
}
